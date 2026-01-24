export interface FilterState {
  timeOfDay: TimeOfDayFilter;
  excludeCanceled: boolean;
  showsWithTimeOnly: boolean;
  selectedVenues: string[];
  hasEventLink: boolean | null; // null = all, true = only with links, false = only without
  hasMapLink: boolean | null;
}

export type TimeOfDayFilter = 
  | 'all'
  | 'morning' // before 12pm
  | 'afternoon' // 12pm - 5pm
  | 'evening' // 5pm - 10pm
  | 'late-night' // after 10pm
  | 'with-time-only'; // only shows that have a time

export const DEFAULT_FILTERS: FilterState = {
  timeOfDay: 'all',
  excludeCanceled: true,
  showsWithTimeOnly: false,
  selectedVenues: [],
  hasEventLink: null,
  hasMapLink: null,
};
