import { format, parse, isValid } from 'date-fns';
import type { EventDay, Show } from '../types';

/**
 * Format date string to display format
 * Example: "Saturday, January 24th 2026"
 */
export function formatDisplayDate(dateString: string): string {
  try {
    // Try to parse common date formats
    const date = parse(dateString, 'EEEE, MMMM do yyyy', new Date());
    if (isValid(date)) {
      return format(date, 'EEEE, MMMM do yyyy');
    }
    return dateString; // Return original if parsing fails
  } catch {
    return dateString;
  }
}

/**
 * Extract time from bracket notation
 * Example: "[10:00pm]" -> "10:00pm"
 */
export function extractTime(timeString: string | null): string | null {
  if (!timeString) return null;
  const match = timeString.match(/\[(.*?)\]/);
  return match ? match[1] : timeString;
}

/**
 * Debounce function for search input
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Filter shows by search query
 */
export function filterShows(shows: any[], query: string): any[] {
  if (!query.trim()) return shows;
  
  const lowerQuery = query.toLowerCase();
  return shows.filter(show => 
    show.artist.toLowerCase().includes(lowerQuery) ||
    show.venue.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Get day counter text
 * Example: "Day 1 of 7"
 */
export function getDayCounter(currentIndex: number, totalDays: number): string {
  return `Day ${currentIndex + 1} of ${totalDays}`;
}

const SHORT_DATE_FORMATS = ['EEEE, MMMM do yyyy', 'EEEE, MMMM d, yyyy', 'yyyy-MM-dd'];

/**
 * Short date for date strip pill, e.g. "Sat 2/1"
 */
export function formatShortDate(dateString: string): string {
  if (!dateString) return '';
  for (const fmt of SHORT_DATE_FORMATS) {
    try {
      const date = parse(dateString, fmt, new Date());
      if (isValid(date)) return format(date, 'EEE M/d');
    } catch {
      /* try next */
    }
  }
  try {
    const d = new Date(dateString);
    return isValid(d) ? format(d, 'EEE M/d') : dateString;
  } catch {
    return dateString;
  }
}

/**
 * Parse event date string to timestamp for sorting (earliest first). Returns 0 if invalid.
 */
export function parseEventDateToTimestamp(dateString: string): number {
  if (!dateString || !dateString.trim()) return 0;
  for (const fmt of SHORT_DATE_FORMATS) {
    try {
      const date = parse(dateString, fmt, new Date());
      if (isValid(date)) return date.getTime();
    } catch {
      /* try next */
    }
  }
  try {
    const d = new Date(dateString);
    return isValid(d) ? d.getTime() : 0;
  } catch {
    return 0;
  }
}

/**
 * Find the event date string for a show by matching artist + venue in the events list.
 * Used for My Events so we can display and pass date for favorites.
 */
export function findEventDateForShow(events: EventDay[], show: Show): string | null {
  const a = (show.artist ?? '').trim().toLowerCase();
  const v = (show.venue ?? '').trim().toLowerCase();
  for (const day of events) {
    const found = day.shows.some(
      (s) =>
        (s.artist ?? '').trim().toLowerCase() === a &&
        (s.venue ?? '').trim().toLowerCase() === v
    );
    if (found) return day.date;
  }
  return null;
}
