// API Configuration
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://showlist-proxy.aasim-ss.workers.dev';
export const API_ENDPOINTS = {
  EVENTS: '/api/events',
};

// Cache Configuration
export const CACHE_DURATION_MS = 30 * 60 * 1000; // 30 minutes
export const AUTO_REFRESH_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
export const CACHE_KEYS = {
  EVENTS: 'cached_events',
  LAST_UPDATED: 'last_updated',
  CURRENT_DAY_INDEX: 'current_day_index',
};

// UI Constants (Legacy - use ThemeContext for new code)
export const COLORS = {
  PINK: '#FF1493', // Vibrant pink for date headers and colon (DeepPink)
  BLACK: '#000000',
  GRAY_LIGHT: '#E5E5E5',
  GRAY_BORDER: '#D3D3D3',
  WHITE: '#FFFFFF',
};

// Gesture Constants
export const SWIPE_THRESHOLD = 36; // Minimum swipe distance in pixels (reduced for reliability)
export const SWIPE_VELOCITY_THRESHOLD = 0.25;

// Search Configuration
export const SEARCH_DEBOUNCE_MS = 300;

// Minimum touch target size (accessibility)
export const MIN_TOUCH_TARGET = 44;
