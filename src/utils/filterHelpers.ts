import { Show } from '../types';
import { FilterState, DEFAULT_FILTERS } from '../types/filters';

/**
 * Parse time string to hour (0-23)
 * Handles formats like "10:00 pm", "7:00 PM", "3:00pm", etc.
 */
function parseTimeToHour(timeString: string | null): number | null {
  if (!timeString) return null;

  const cleaned = timeString.trim().toLowerCase();
  
  // Extract hour and am/pm
  const match = cleaned.match(/(\d+):?\d*\s*(am|pm)?/);
  if (!match) return null;

  let hour = parseInt(match[1], 10);
  const period = match[2] || '';

  // Convert to 24-hour format
  if (period === 'pm' && hour !== 12) {
    hour += 12;
  } else if (period === 'am' && hour === 12) {
    hour = 0;
  }

  return hour;
}

/**
 * Check if show matches time of day filter
 */
function matchesTimeOfDay(show: Show, filter: FilterState['timeOfDay']): boolean {
  if (filter === 'all') return true;
  if (filter === 'with-time-only') return show.time !== null;

  const hour = parseTimeToHour(show.time);
  if (hour === null) return false; // No time = doesn't match specific time filters

  switch (filter) {
    case 'morning':
      return hour < 12;
    case 'afternoon':
      return hour >= 12 && hour < 17; // 12pm - 5pm
    case 'evening':
      return hour >= 17 && hour < 22; // 5pm - 10pm
    case 'late-night':
      return hour >= 22 || hour < 6; // 10pm - 6am
    default:
      return true;
  }
}

/**
 * Check if show is canceled/closed
 */
function isCanceledOrClosed(show: Show): boolean {
  const artistLower = show.artist.toLowerCase();
  return (
    artistLower.includes('canceled') ||
    artistLower.includes('cancelled') ||
    artistLower.includes('closed') ||
    artistLower.includes('postponed')
  );
}

/**
 * Apply all filters to a list of shows
 */
export function applyFilters(shows: Show[], filters: FilterState): Show[] {
  return shows.filter((show) => {
    // Time of day filter
    if (!matchesTimeOfDay(show, filters.timeOfDay)) {
      return false;
    }

    // Exclude canceled/closed
    if (filters.excludeCanceled && isCanceledOrClosed(show)) {
      return false;
    }

    // Shows with time only
    if (filters.showsWithTimeOnly && !show.time) {
      return false;
    }

    // Venue filter
    if (filters.selectedVenues.length > 0) {
      if (!filters.selectedVenues.includes(show.venue)) {
        return false;
      }
    }

    // Event link filter
    if (filters.hasEventLink === true && !show.eventLink) {
      return false;
    }
    if (filters.hasEventLink === false && show.eventLink) {
      return false;
    }

    // Map link filter
    if (filters.hasMapLink === true && !show.mapLink) {
      return false;
    }
    if (filters.hasMapLink === false && show.mapLink) {
      return false;
    }

    return true;
  });
}

/**
 * Get unique venues from shows
 */
export function getUniqueVenues(shows: Show[]): string[] {
  const venues = new Set<string>();
  shows.forEach((show) => {
    if (show.venue) {
      venues.add(show.venue);
    }
  });
  return Array.from(venues).sort();
}

/**
 * Check if any filters are active
 */
export function hasActiveFilters(filters: FilterState): boolean {
  return (
    filters.timeOfDay !== 'all' ||
    filters.excludeCanceled !== DEFAULT_FILTERS.excludeCanceled ||
    filters.showsWithTimeOnly !== DEFAULT_FILTERS.showsWithTimeOnly ||
    filters.selectedVenues.length > 0 ||
    filters.hasEventLink !== null ||
    filters.hasMapLink !== null
  );
}
