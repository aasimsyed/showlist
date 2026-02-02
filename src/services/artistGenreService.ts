import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService, ArtistGenreInfo } from './api';
import {
  API_BASE_URL,
  ARTIST_GENRE_CACHE_KEY_PREFIX,
  ARTIST_GENRE_CACHE_MAX_AGE_MS,
} from '../utils/constants';

function normalizeArtistName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, '_');
}

interface CachedArtistGenre {
  artist: string;
  genres: string[];
  source: 'musicbrainz' | 'gemini';
  mood?: string;
  energy?: number;
  similarTo?: string[];
  cachedAt: number;
}

/**
 * Get artist genre/mood/energy from backend with AsyncStorage cache (7-day TTL).
 * Uses MusicBrainz first, Gemini fallback on the backend.
 */
export async function getArtistGenre(artistName: string): Promise<ArtistGenreInfo> {
  const key = ARTIST_GENRE_CACHE_KEY_PREFIX + normalizeArtistName(artistName);
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw) {
      const cached: CachedArtistGenre = JSON.parse(raw);
      const age = Date.now() - (cached.cachedAt || 0);
      if (age < ARTIST_GENRE_CACHE_MAX_AGE_MS) {
        return {
          artist: cached.artist,
          genres: cached.genres || [],
          source: cached.source || 'musicbrainz',
          mood: cached.mood,
          energy: cached.energy,
          similarTo: cached.similarTo,
        };
      }
    }
  } catch (_) {
    // ignore parse/storage errors
  }
  const info = await apiService.fetchArtistGenre(artistName);
  try {
    await AsyncStorage.setItem(
      key,
      JSON.stringify({
        ...info,
        cachedAt: Date.now(),
      } as CachedArtistGenre)
    );
  } catch (_) {
    // ignore storage errors
  }
  return info;
}
