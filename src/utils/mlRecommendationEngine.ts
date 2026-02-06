import { Show, EventDay } from '../types';
import { getUserProfile, UserProfile } from './userBehaviorTracker';
import { mlService } from '../services/mlService';
import { getArtistGenre } from '../services/artistGenreService';
import { generateExplanation, RecommendationExplanation } from './explanationGenerator';
import { apiService } from '../services/api';
import { showKey, meanVector, cosineSimilarity, cosineToZeroOne } from './twoTowerScoring';
import { getEmbeddingMap as getCachedEmbeddingMap, setEmbeddingMap as setCachedEmbeddingMap } from './embeddingCache';
import { parseEventDateToTimestamp } from './helpers';

const EMBEDDING_BATCH_SIZE = 30;

const MAX_ARTISTS_FOR_GENRE_PROFILE = 20;

/** Build user genre counts from favorited artists (cached lookups). */
export async function buildUserGenreProfile(favorites: Show[]): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  const uniqueArtists = [...new Set(favorites.map((s) => s.artist))].slice(0, MAX_ARTISTS_FOR_GENRE_PROFILE);
  for (const artist of uniqueArtists) {
    try {
      const info = await getArtistGenre(artist);
      for (const g of info.genres || []) {
        const genre = g.trim().toLowerCase();
        if (genre) counts[genre] = (counts[genre] || 0) + 1;
      }
    } catch (_) {
      // skip failed lookups
    }
  }
  return counts;
}

/** Jaccard-like overlap: share of show genres that user likes (0–1). */
export function genreMatchScore(userGenreCounts: Record<string, number>, showGenres: string[]): number {
  if (showGenres.length === 0 || Object.keys(userGenreCounts).length === 0) return 0;
  const userSet = new Set(Object.keys(userGenreCounts));
  let matches = 0;
  for (const g of showGenres) {
    const genre = g.trim().toLowerCase();
    if (userSet.has(genre)) matches++;
  }
  return matches / Math.max(showGenres.length, 1);
}

export interface MLRecommendationScore {
  show: Show;
  score: number;
  mlScore: number;
  explanation: RecommendationExplanation;
  eventDate?: string;
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

export function convertProfileToFeatures(profile: UserProfile) {
  // Get top artists and venues
  const topArtists = Object.entries(profile.favoriteArtists)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([_, count]) => count);
  
  const topVenues = Object.entries(profile.favoriteVenues)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([_, count]) => count);

  return {
    favoriteArtists: topArtists.length > 0 ? topArtists : [0],
    favoriteVenues: topVenues.length > 0 ? topVenues : [0],
    timePreferences: [
      profile.timePreferences.morning,
      profile.timePreferences.afternoon,
      profile.timePreferences.evening,
      profile.timePreferences.lateNight,
    ],
    dayPreferences: Object.values(profile.dayPreferences).length > 0 
      ? Object.values(profile.dayPreferences) 
      : [0],
  };
}

export function convertShowToFeatures(show: Show): {
  artistId: number;
  venueId: number;
  timeOfDay: number;
  dayOfWeek: number;
  hasEventLink: number;
  hasMapLink: number;
} {
  const hour = show.time ? parseInt(show.time.split(':')[0]) : 12;
  let timeOfDay = 2; // Default to evening
  if (hour >= 6 && hour < 12) timeOfDay = 0; // morning
  else if (hour >= 12 && hour < 17) timeOfDay = 1; // afternoon
  else if (hour >= 17 && hour < 22) timeOfDay = 2; // evening
  else timeOfDay = 3; // late night

  return {
    artistId: hashString(show.artist) % 1000,
    venueId: hashString(show.venue) % 1000,
    timeOfDay,
    dayOfWeek: new Date().getDay(),
    hasEventLink: show.eventLink ? 1 : 0,
    hasMapLink: show.mapLink ? 1 : 0,
  };
}

/**
 * Fetch description embeddings for unique (artist, venue) pairs; use cache, then batch-fetch only missing.
 */
async function fetchEmbeddingMap(
  city: string,
  items: { artist: string; venue: string }[]
): Promise<Map<string, number[]>> {
  const seen = new Set<string>();
  const unique: { artist: string; venue: string }[] = [];
  for (const it of items) {
    const k = showKey(it.artist, it.venue);
    if (seen.has(k)) continue;
    seen.add(k);
    unique.push({ artist: it.artist, venue: it.venue });
  }
  const map = new Map<string, number[]>(getCachedEmbeddingMap(unique));
  const missing = unique.filter((it) => !map.has(showKey(it.artist, it.venue)));
  const toCache: { artist: string; venue: string; embedding: number[] }[] = [];
  for (let i = 0; i < missing.length; i += EMBEDDING_BATCH_SIZE) {
    const chunk = missing.slice(i, i + EMBEDDING_BATCH_SIZE);
    try {
      const res = await apiService.fetchEventDescriptionEmbeddings(city, chunk);
      for (const e of res.embeddings || []) {
        if (e.embedding && e.embedding.length > 0) {
          map.set(showKey(e.artist, e.venue), e.embedding);
          toCache.push({ artist: e.artist, venue: e.venue, embedding: e.embedding });
        }
      }
    } catch (err) {
      console.warn('Embedding batch failed', err);
    }
  }
  if (toCache.length > 0) setCachedEmbeddingMap(toCache);
  return map;
}

export async function getMLRecommendations(
  events: EventDay[],
  favorites: Show[],
  limit: number = 10,
  city: string = ''
): Promise<MLRecommendationScore[]> {
  const profile = await getUserProfile();

  if (!profile || profile.totalInteractions < 3) {
    return [];
  }

  const scores: MLRecommendationScore[] = [];
  const favoriteKeys = new Set(favorites.map(s => `${s.artist}|${s.venue}|${s.time || ''}`));
  const userFeatures = convertProfileToFeatures(profile);
  const userGenreProfile = await buildUserGenreProfile(favorites);

  // Two-tower: collect all candidate + favorite (artist, venue), fetch embeddings, build user vec
  const embeddingItems: { artist: string; venue: string }[] = [];
  for (const day of events) {
    for (const show of day.shows) {
      embeddingItems.push({ artist: show.artist, venue: show.venue });
    }
  }
  for (const s of favorites) {
    embeddingItems.push({ artist: s.artist, venue: s.venue });
  }
  let embeddingMap = new Map<string, number[]>();
  let userEmbedding: number[] = [];
  if (city && city.trim()) {
    try {
      embeddingMap = await fetchEmbeddingMap(city, embeddingItems);
      const favVecs = favorites
        .map((s) => embeddingMap.get(showKey(s.artist, s.venue)))
        .filter((v): v is number[] => Array.isArray(v) && v.length > 0);
      userEmbedding = meanVector(favVecs);
    } catch (err) {
      console.warn('Two-tower embeddings failed', err);
    }
  }

  for (const day of events) {
    for (const show of day.shows) {
      const candidateKey = `${show.artist}|${show.venue}|${show.time || ''}`;
      if (favoriteKeys.has(candidateKey)) continue;

      const eventFeatures = convertShowToFeatures(show);
      let mlScore = 0;
      try {
        mlScore = await mlService.predictScore(userFeatures, eventFeatures);
      } catch (error) {
        console.error('Error getting ML score:', error);
      }

      let artistGenreInfo = { artist: show.artist, genres: [] as string[], source: 'musicbrainz' as const };
      try {
        artistGenreInfo = await getArtistGenre(show.artist);
      } catch (_) {
        // use empty genres
      }
      const genreMatch = genreMatchScore(userGenreProfile, artistGenreInfo.genres);

      const explanation = generateExplanation(
        show,
        profile,
        mlScore,
        day.date,
        genreMatch > 0 ? artistGenreInfo.genres : undefined,
        Object.keys(userGenreProfile).length > 0 ? userGenreProfile : undefined
      );

      const artistCount = profile.favoriteArtists[show.artist] || 0;
      const venueCount = profile.favoriteVenues[show.venue] || 0;
      let ruleBasedScore = 0;
      ruleBasedScore += Math.min(artistCount * 20, 40);
      ruleBasedScore += Math.min(venueCount * 15, 30);

      let twoTowerScore = 0;
      if (userEmbedding.length > 0) {
        const itemEmb = embeddingMap.get(showKey(show.artist, show.venue));
        if (itemEmb && itemEmb.length > 0) {
          twoTowerScore = cosineToZeroOne(cosineSimilarity(userEmbedding, itemEmb));
        }
      }

      // Combine: two-tower (description) 35%, rule-based 35%, genre 20%, legacy ML 10%
      // ruleBasedScore is 0–70; *0.5 gives 0–35 to match prior scale
      const finalScore =
        twoTowerScore * 100 * 0.35 +
        ruleBasedScore * 0.5 +
        genreMatch * 100 * 0.2 +
        mlScore * 100 * 0.1;

      if (finalScore > 20 || explanation.reasons.length > 0) {
        scores.push({
          show,
          score: finalScore,
          mlScore,
          explanation,
          eventDate: day.date,
        });
      }
    }
  }

  // Sort by date earliest first, then by score descending within same day
  return scores
    .sort((a, b) => {
      const tA = parseEventDateToTimestamp(a.eventDate || '');
      const tB = parseEventDateToTimestamp(b.eventDate || '');
      if (tA !== tB) return tA - tB;
      return b.score - a.score;
    })
    .slice(0, limit);
}

export function isRecommended(
  show: Show,
  recommendations: MLRecommendationScore[]
): boolean {
  return recommendations.some(rec => 
    rec.show.artist === show.artist && 
    rec.show.venue === show.venue &&
    rec.show.time === show.time
  );
}

export function getRecommendationData(
  show: Show,
  recommendations: MLRecommendationScore[]
): MLRecommendationScore | null {
  return recommendations.find(r => 
    r.show.artist === show.artist && 
    r.show.venue === show.venue &&
    r.show.time === show.time
  ) || null;
}
