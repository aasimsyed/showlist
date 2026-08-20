import { Show, EventDay } from '../types';
import { updateUserProfile, UserProfile } from './userBehaviorTracker';
import { mlService } from '../services/mlService';
import { getArtistGenre } from '../services/artistGenreService';
import { generateExplanation, RecommendationExplanation } from './explanationGenerator';
import { apiService, ArtistGenreInfo } from '../services/api';
import { showKey, meanVector, cosineSimilarity, cosineToZeroOne } from './twoTowerScoring';
import { getEmbeddingMap as getCachedEmbeddingMap, setEmbeddingMap as setCachedEmbeddingMap } from './embeddingCache';
import { parseEventDateToTimestamp } from './helpers';
import { scoreRecommendationsFromProfile } from './scoreRecommendationsFromProfile';

const EMBEDDING_BATCH_SIZE = 30;

const MAX_ARTISTS_FOR_GENRE_PROFILE = 20;

/** Cap on simultaneous in-flight genre lookups so we don't serialize one artist at a time. */
const GENRE_FETCH_CONCURRENCY = 8;

/**
 * Run `fn` over `items` with at most `limit` calls in flight at once. Used instead of a plain
 * for-await loop for per-artist network lookups, which otherwise round-trip one at a time and
 * can turn a few dozen uncached artists into a multi-minute wait.
 */
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;
  async function worker() {
    while (nextIndex < items.length) {
      const i = nextIndex++;
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

/** Fetch genre info for each unique artist in parallel (bounded), falling back to empty genres on failure. */
async function fetchArtistGenreMap(artists: string[]): Promise<Map<string, ArtistGenreInfo>> {
  const uniqueArtists = [...new Set(artists)];
  const map = new Map<string, ArtistGenreInfo>();
  await mapWithConcurrency(uniqueArtists, GENRE_FETCH_CONCURRENCY, async (artist) => {
    try {
      map.set(artist, await getArtistGenre(artist));
    } catch (_) {
      map.set(artist, { artist, genres: [], source: 'musicbrainz' });
    }
  });
  return map;
}

/** Build user genre counts from favorited artists (cached lookups, fetched in parallel). */
export async function buildUserGenreProfile(favorites: Show[]): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  const uniqueArtists = [...new Set(favorites.map((s) => s.artist))].slice(0, MAX_ARTISTS_FOR_GENRE_PROFILE);
  const genreMap = await fetchArtistGenreMap(uniqueArtists);
  for (const info of genreMap.values()) {
    for (const g of info.genres || []) {
      const genre = g.trim().toLowerCase();
      if (genre) counts[genre] = (counts[genre] || 0) + 1;
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
  _city: string = ''
): Promise<MLRecommendationScore[]> {
  if (favorites.length < 3) {
    return [];
  }

  const profile = await updateUserProfile(favorites);
  return scoreRecommendationsFromProfile(events, favorites, profile, limit);
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
