import { format, parse, isValid } from 'date-fns';

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
