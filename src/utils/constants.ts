import type { ShowlistCityId } from '../types';

// API Configuration
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://showlist-proxy.aasim-ss.workers.dev';
export const API_ENDPOINTS = {
  EVENTS: '/api/events',
  CITIES: '/api/cities',
  ARTIST_GENRE: '/api/artist-genre',
  EVENT_DESCRIPTION: '/api/event-description',
  PLACEMENTS: '/api/placements',
};

/** Fallback when /api/cities fails (e.g. offline). */
export const FALLBACK_CITIES: { id: ShowlistCityId; label: string }[] = [
  { id: 'austin', label: 'Austin, TX' },
  { id: 'portland', label: 'Portland, OR' },
  { id: 'seattle', label: 'Seattle, WA' },
];

export const DEFAULT_CITY: ShowlistCityId = 'austin';

export const CITIES_CACHE_KEY = 'cached_cities';
export const CITIES_CACHE_TIMESTAMP_KEY = 'cached_cities_ts';
export const CITIES_CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

export const ARTIST_GENRE_CACHE_KEY_PREFIX = 'artist_genre_';
export const ARTIST_GENRE_CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export const CITY_STORAGE_KEY = 'selected_city';

// Cache Configuration (keys are city-scoped via getCacheKeys(city))
export const CACHE_DURATION_MS = 30 * 60 * 1000; // 30 minutes
export const AUTO_REFRESH_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
export const CACHE_KEYS = {
  EVENTS: 'cached_events',
  LAST_UPDATED: 'last_updated',
  CURRENT_DAY_INDEX: 'current_day_index',
};

export function getCacheKeys(city: ShowlistCityId): { EVENTS: string; LAST_UPDATED: string; CURRENT_DAY_INDEX: string } {
  const prefix = `city_${city}_`;
  return {
    EVENTS: prefix + CACHE_KEYS.EVENTS,
    LAST_UPDATED: prefix + CACHE_KEYS.LAST_UPDATED,
    CURRENT_DAY_INDEX: prefix + CACHE_KEYS.CURRENT_DAY_INDEX,
  };
}

// UI Constants (Legacy - use ThemeContext for new code; aligned with showlistaustin.com)
export const COLORS = {
  PINK: '#b91c1c', // Warm red accent (Showlist Austin style)
  BLACK: '#1a1a1a',
  GRAY_LIGHT: '#e8e6e3',
  GRAY_BORDER: '#e0ddd8',
  WHITE: '#ffffff',
};

// Gesture Constants
export const SWIPE_THRESHOLD = 36; // Minimum swipe distance in pixels (reduced for reliability)
export const SWIPE_VELOCITY_THRESHOLD = 0.25;

// Search Configuration
export const SEARCH_DEBOUNCE_MS = 300;

// Minimum touch target size (accessibility)
export const MIN_TOUCH_TARGET = 44;
