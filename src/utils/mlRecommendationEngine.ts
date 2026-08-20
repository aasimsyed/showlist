import { Show, EventDay } from '../types';
import { getUserProfile, updateUserProfile, UserProfile } from './userBehaviorTracker';
import { getArtistGenre, getCachedArtistGenreMap } from '../services/artistGenreService';
import { apiService, ArtistGenreInfo } from '../services/api';
import { showKey, meanVector } from './twoTowerScoring';
import { getEmbeddingMap as getCachedEmbeddingMap, setEmbeddingMap as setCachedEmbeddingMap } from './embeddingCache';
import type { RecommendationExplanation } from './explanationGenerator';
import {
  scoreRecommendationsFromProfile,
  countsFromGenreMap,
  pickChronologicalArtists,
  pickEmbeddingTargets,
} from './scoreRecommendationsFromProfile';

export { genreMatchScore } from './scoreRecommendationsFromProfile';

const EMBEDDING_BATCH_SIZE = 30;
const MAX_ARTISTS_FOR_GENRE_PROFILE = 20;
const MAX_CANDIDATE_ARTISTS_FOR_GENRE = 24;
const REFINE_TIMEOUT_MS = 5000;
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

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(fallback), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      () => {
        clearTimeout(timer);
        resolve(fallback);
      }
    );
  });
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
 * Cache first, then at most one network batch. `timeoutMs` caps the Worker/Gemini wait.
 */
async function fetchEmbeddingMap(
  city: string,
  items: { artist: string; venue: string }[],
  timeoutMs: number = REFINE_TIMEOUT_MS
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
  if (!city.trim()) return map;
  const missing = unique.filter((it) => !map.has(showKey(it.artist, it.venue)));
  if (!missing.length) return map;

  const chunk = missing.slice(0, EMBEDDING_BATCH_SIZE);
  const toCache: { artist: string; venue: string; embedding: number[] }[] = [];
  await withTimeout(
    apiService.fetchEventDescriptionEmbeddings(city, chunk, timeoutMs).then((res) => {
      for (const e of res.embeddings || []) {
        if (e.embedding && e.embedding.length > 0) {
          map.set(showKey(e.artist, e.venue), e.embedding);
          toCache.push({ artist: e.artist, venue: e.venue, embedding: e.embedding });
        }
      }
      return true;
    }),
    timeoutMs,
    false
  );
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

/**
 * Second pass: MusicBrainz/Gemini genres plus description embeddings for a small
 * candidate set. Must never block For You; caller shows local recs first and applies this if it returns.
 */
export async function refineRecommendations(
  events: EventDay[],
  favorites: Show[],
  limit: number = 10,
  city: string = ''
): Promise<MLRecommendationScore[]> {
  if (favorites.length < 3) return [];
  const profile = await getUserProfile();
  if (!profile) return [];

  const favoriteArtists = [...new Set(favorites.map((s) => s.artist))].slice(
    0,
    MAX_ARTISTS_FOR_GENRE_PROFILE
  );
  const candidateArtists = pickChronologicalArtists(
    events,
    new Set(favoriteArtists),
    MAX_CANDIDATE_ARTISTS_FOR_GENRE
  );
  const artistsToResolve = [...favoriteArtists, ...candidateArtists];

  const genreMap = await getCachedArtistGenreMap(artistsToResolve);
  const missingArtists = artistsToResolve.filter((a) => !genreMap.has(a));
  const embeddingItems = pickEmbeddingTargets(favorites, events, EMBEDDING_BATCH_SIZE);

  const genreFetch = missingArtists.length
    ? withTimeout(
        mapWithConcurrency(missingArtists, GENRE_FETCH_CONCURRENCY, async (artist) => {
          try {
            genreMap.set(artist, await getArtistGenre(artist));
          } catch (_) {
            genreMap.set(artist, { artist, genres: [], source: 'musicbrainz' });
          }
        }).then(() => true),
        REFINE_TIMEOUT_MS,
        false
      )
    : Promise.resolve(true);

  const embeddingFetch = city.trim()
    ? fetchEmbeddingMap(city, embeddingItems, REFINE_TIMEOUT_MS)
    : Promise.resolve(new Map<string, number[]>());

  const [, embeddingMap] = await Promise.all([genreFetch, embeddingFetch]);

  const userGenreProfile = countsFromGenreMap(favoriteArtists, genreMap);
  const genresByArtist = new Map<string, string[]>();
  for (const [artist, info] of genreMap) {
    genresByArtist.set(artist, info.genres || []);
  }

  let userEmbedding: number[] = [];
  if (embeddingMap.size > 0) {
    const favVecs = favorites
      .map((s) => embeddingMap.get(showKey(s.artist, s.venue)))
      .filter((v): v is number[] => Array.isArray(v) && v.length > 0);
    userEmbedding = meanVector(favVecs);
  }

  const hasGenre = Object.keys(userGenreProfile).length > 0;
  if (!hasGenre && userEmbedding.length === 0) return [];

  return scoreRecommendationsFromProfile(events, favorites, profile, limit, {
    userGenreProfile,
    genresByArtist,
    userEmbedding,
    embeddingMap,
  });
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
