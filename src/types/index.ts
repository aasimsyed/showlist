/** City id = subdomain (e.g. 'austin'). List is fetched from www.showlists.net. */
export type ShowlistCityId = string;

export interface Show {
  artist: string;
  venue: string;
  address: string;
  eventLink: string;
  venueLink: string;
  mapLink: string | null;
  time: string | null;
}

export interface EventDay {
  date: string;
  shows: Show[];
}

export interface EventsResponse {
  events: EventDay[];
  lastUpdated: string;
}

export interface AppState {
  events: EventDay[];
  currentDayIndex: number;
  searchQuery: string;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

export interface ParsedEvent {
  artist: string;
  venue: string;
  address: string;
  eventLink: string | null;
  venueLink: string | null;
  mapLink: string | null;
  time: string | null;
}
