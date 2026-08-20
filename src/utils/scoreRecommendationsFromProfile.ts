import { Show, EventDay } from '../types';
import type { UserProfile } from './userBehaviorTracker';
import { generateExplanation, RecommendationExplanation } from './explanationGenerator';
import { parseEventDateToTimestamp } from './helpers';
import { showKey, cosineSimilarity } from './twoTowerScoring';

export interface ScoredRecommendation {
  show: Show;
  score: number;
  mlScore: number;
  explanation: RecommendationExplanation;
  eventDate?: string;
}

/** Optional Gemini/MusicBrainz signals. Absent values keep local artist/venue ranking. */
export interface RecommendationSignals {
  userGenreProfile?: Record<string, number>;
  genresByArtist?: Map<string, string[]>;
  userEmbedding?: number[];
  embeddingMap?: Map<string, number[]>;
}

export function showIdentity(show: Show): string {
  return `${show.artist}|${show.venue}|${show.time || ''}`;
}

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

export function countsFromGenreMap(
  favoriteArtists: string[],
  genreMap: Map<string, { genres?: string[] }>
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const artist of favoriteArtists) {
    const info = genreMap.get(artist);
    for (const g of info?.genres || []) {
      const genre = g.trim().toLowerCase();
      if (genre) counts[genre] = (counts[genre] || 0) + 1;
    }
  }
  return counts;
}

/** First unseen artists in listing order (events are already chronological). */
export function pickChronologicalArtists(
  events: EventDay[],
  exclude: Set<string>,
  limit: number
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const day of events) {
    for (const show of day.shows) {
      const artist = show.artist;
      if (!artist || exclude.has(artist) || seen.has(artist)) continue;
      seen.add(artist);
      out.push(artist);
      if (out.length >= limit) return out;
    }
  }
  return out;
}

/** Favorites first (user tower), then chronological listings, unique artist+venue. */
export function pickEmbeddingTargets(
  favorites: Show[],
  events: EventDay[],
  max: number
): { artist: string; venue: string }[] {
  const unique: { artist: string; venue: string }[] = [];
  const seen = new Set<string>();
  const add = (artist: string, venue: string) => {
    const k = showKey(artist, venue);
    if (seen.has(k)) return false;
    seen.add(k);
    unique.push({ artist, venue });
    return unique.length >= max;
  };
  for (const s of favorites) {
    if (add(s.artist, s.venue)) return unique;
  }
  for (const day of events) {
    for (const show of day.shows) {
      if (add(show.artist, show.venue)) return unique;
    }
  }
  return unique;
}

/**
 * Rank upcoming shows. Local artist/venue always apply; genre and description
 * similarity apply when `signals` is provided (For You refine pass).
 */
export function scoreRecommendationsFromProfile(
  events: EventDay[],
  favorites: Show[],
  profile: UserProfile,
  limit: number = 10,
  signals?: RecommendationSignals
): ScoredRecommendation[] {
  const favoriteKeys = new Set(favorites.map(showIdentity));
  const userGenreProfile = signals?.userGenreProfile || {};
  const genresByArtist = signals?.genresByArtist;
  const userEmbedding = signals?.userEmbedding || [];
  const embeddingMap = signals?.embeddingMap;
  const hasSignals = Object.keys(userGenreProfile).length > 0 || userEmbedding.length > 0;
  const scores: ScoredRecommendation[] = [];

  for (const day of events) {
    for (const show of day.shows) {
      if (favoriteKeys.has(showIdentity(show))) continue;

      const showGenres = genresByArtist?.get(show.artist) || [];
      const genreMatch = genreMatchScore(userGenreProfile, showGenres);
      const explanation = generateExplanation(
        show,
        profile,
        0,
        day.date,
        genreMatch > 0 ? showGenres : undefined,
        Object.keys(userGenreProfile).length > 0 ? userGenreProfile : undefined
      );

      const artistCount = profile.favoriteArtists[show.artist] || 0;
      const venueCount = profile.favoriteVenues[show.venue] || 0;
      const ruleBasedScore = Math.min(artistCount * 20, 40) + Math.min(venueCount * 15, 30);

      let twoTowerScore = 0;
      if (userEmbedding.length > 0 && embeddingMap) {
        const itemEmb = embeddingMap.get(showKey(show.artist, show.venue));
        if (itemEmb && itemEmb.length > 0) {
          twoTowerScore = Math.max(0, cosineSimilarity(userEmbedding, itemEmb));
        }
      }

      const score = hasSignals
        ? twoTowerScore * 35 + ruleBasedScore * 0.5 + genreMatch * 20
        : ruleBasedScore;

      if (score > 20 || explanation.reasons.length > 0) {
        scores.push({
          show,
          score,
          mlScore: twoTowerScore,
          explanation,
          eventDate: day.date,
        });
      }
    }
  }

  return scores
    .sort((a, b) => {
      const tA = parseEventDateToTimestamp(a.eventDate || '');
      const tB = parseEventDateToTimestamp(b.eventDate || '');
      if (tA !== tB) return tA - tB;
      return b.score - a.score;
    })
    .slice(0, limit);
}
