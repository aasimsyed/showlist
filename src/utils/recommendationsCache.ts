import AsyncStorage from '@react-native-async-storage/async-storage';
import { parse, isValid, startOfDay, isBefore } from 'date-fns';
import { MLRecommendationScore } from './mlRecommendationEngine';

const RECOMMENDATIONS_CACHE_KEY = 'recommendations_cache';

const DATE_FORMATS = [
  'EEEE, MMMM d, yyyy',   // Saturday, January 24, 2026 (toLocaleDateString)
  'EEEE, MMMM do yyyy',   // Saturday, January 24th 2026
  'yyyy-MM-dd',           // 2026-01-24
];

/**
 * Parse event date string to Date. Returns null if unparseable.
 */
function parseEventDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  for (const fmt of DATE_FORMATS) {
    try {
      const d = parse(dateStr, fmt, new Date());
      if (isValid(d)) return d;
    } catch {
      /* try next */
    }
  }
  try {
    const d = new Date(dateStr);
    return isValid(d) ? d : null;
  } catch {
    return null;
  }
}

/**
 * True if the event date is strictly before today (event has passed).
 * Events today or in the future are kept.
 */
export function isEventDatePast(dateStr: string): boolean {
  const d = parseEventDate(dateStr);
  if (!d) return false;
  const eventDay = startOfDay(d);
  const today = startOfDay(new Date());
  return isBefore(eventDay, today);
}

/**
 * Filter out recommendations whose event date has already passed.
 */
export function filterOutPastRecommendations(
  recs: MLRecommendationScore[]
): MLRecommendationScore[] {
  return recs.filter((r) => !r.eventDate || !isEventDatePast(r.eventDate));
}

/**
 * Persist recommendations to AsyncStorage for use across sessions.
 */
export async function saveRecommendations(
  recs: MLRecommendationScore[]
): Promise<void> {
  try {
    await AsyncStorage.setItem(RECOMMENDATIONS_CACHE_KEY, JSON.stringify(recs));
  } catch (error) {
    console.error('Error saving recommendations cache:', error);
  }
}

/**
 * Load persisted recommendations. Returns null if none or on error.
 * Caller should run filterOutPastRecommendations before displaying.
 */
export async function getCachedRecommendations(): Promise<MLRecommendationScore[] | null> {
  try {
    const stored = await AsyncStorage.getItem(RECOMMENDATIONS_CACHE_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored) as MLRecommendationScore[];
    return Array.isArray(parsed) ? parsed : null;
  } catch (error) {
    console.error('Error loading recommendations cache:', error);
    return null;
  }
}

/**
 * Clear the recommendations cache (e.g. on logout or reset).
 */
export async function clearRecommendationsCache(): Promise<void> {
  try {
    await AsyncStorage.removeItem(RECOMMENDATIONS_CACHE_KEY);
  } catch (error) {
    console.error('Error clearing recommendations cache:', error);
  }
}
