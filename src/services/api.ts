import axios, { AxiosInstance } from 'axios';
import { EventsResponse, ShowlistCityId } from '../types';
import { API_BASE_URL, API_ENDPOINTS } from '../utils/constants';
import {
  fetchShowSpotEventsFromDevice,
  mergeEventDays,
} from '../utils/showSpot';

export interface CityOption {
  id: ShowlistCityId;
  label: string;
}

export interface CitiesResponse {
  cities: CityOption[];
  lastUpdated: string;
}

export interface ArtistGenreInfo {
  artist: string;
  genres: string[];
  source: 'musicbrainz' | 'gemini';
  mood?: string;
  energy?: number;
  similarTo?: string[];
}

export interface EventDescriptionResponse {
  /** Full event description (artist + venue together). */
  description?: string;
  artistDescription: string;
  venueDescription: string;
  /** Set when backend has no Gemini API key or Gemini returned no content. */
  _hint?: 'missing_api_key' | 'gemini_unavailable';
}

export interface PlacementsResponse {
  support: { copy?: string; patreonUrl?: string };
  advertiseUrl?: string | null;
  sponsors: { label: string; url: string }[];
}

export interface EventDescriptionEmbeddingItem {
  artist: string;
  venue: string;
  embedding: number[];
}

export interface EventDescriptionEmbeddingsResponse {
  embeddings: EventDescriptionEmbeddingItem[];
  error?: string;
  _hint?: string;
}

type EventsApiResponse = EventsResponse & {
  sources?: {
    showlistShows?: number;
    showSpot?: { ok?: boolean; shows?: number } | null;
  };
};

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Fetch events from the API for the given city.
   * Austin: merge Austin Show Spot on-device when the Worker cannot (SiteGround blocks CF IPs).
   */
  async fetchEvents(city: ShowlistCityId): Promise<EventsResponse> {
    try {
      const url = `${API_ENDPOINTS.EVENTS}?city=${encodeURIComponent(city)}`;
      const response = await this.client.get<EventsApiResponse>(url, {
        timeout: city === 'austin' ? 30000 : 10000,
      });

      if (!response.data || !response.data.events) {
        throw new Error('Invalid response format');
      }

      let events = response.data.events;
      if (city === 'austin') {
        const spotOk = response.data.sources?.showSpot?.ok === true;
        const spotShows = response.data.sources?.showSpot?.shows ?? 0;
        if (!spotOk || spotShows === 0) {
          try {
            const spotEvents = await fetchShowSpotEventsFromDevice();
            events = mergeEventDays(events, spotEvents);
          } catch (spotErr) {
            console.warn('Austin Show Spot on-device merge failed:', spotErr);
          }
        }
      }

      return {
        events,
        lastUpdated: response.data.lastUpdated || new Date().toISOString(),
      };
    } catch (error: any) {
      if (error.response) {
        // Server responded with error
        throw new Error(
          `API Error: ${error.response.status} - ${error.response.data?.error || error.message}`
        );
      } else if (error.request) {
        // Request made but no response
        throw new Error('Network error: No response from server');
      } else {
        // Error setting up request
        throw new Error(`Request error: ${error.message}`);
      }
    }
  }

  /**
   * Fetch list of cities from network page (scraped from www.showlists.net)
   */
  async fetchCities(): Promise<CitiesResponse> {
    try {
      const response = await this.client.get<CitiesResponse>(API_ENDPOINTS.CITIES);
      if (!response.data?.cities?.length) {
        throw new Error('Invalid cities response');
      }
      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw new Error(`API Error: ${error.response.status}`);
      }
      throw error;
    }
  }

  /**
   * Fetch artist genre/mood/energy from backend (MusicBrainz + Gemini fallback). Caching is done by the caller.
   */
  async fetchArtistGenre(artistName: string): Promise<ArtistGenreInfo> {
    try {
      const url = `${API_ENDPOINTS.ARTIST_GENRE}?artist=${encodeURIComponent(artistName)}`;
      const response = await this.client.get<ArtistGenreInfo>(url);
      if (!response.data || !Array.isArray(response.data.genres)) {
        return { artist: artistName, genres: [], source: 'musicbrainz' };
      }
      return response.data;
    } catch (error: any) {
      if (error.response) {
        console.warn('Artist genre API error:', error.response.status);
      }
      return { artist: artistName, genres: [], source: 'musicbrainz' };
    }
  }

  /**
   * Fetch Gemini-generated event description (artist + venue + city). Cached on backend.
   */
  async fetchEventDescription(artist: string, venue: string, city?: string): Promise<EventDescriptionResponse> {
    try {
      let url = `${API_ENDPOINTS.EVENT_DESCRIPTION}?artist=${encodeURIComponent(artist)}&venue=${encodeURIComponent(venue)}`;
      if (city?.trim()) url += `&city=${encodeURIComponent(city.trim())}`;
      url += '&_v=3'; // cache-buster so app gets fresh response (avoids cached truncated JSON)
      const response = await this.client.get<EventDescriptionResponse>(url);
      return {
        description: response.data?.description ?? '',
        artistDescription: response.data?.artistDescription ?? '',
        venueDescription: response.data?.venueDescription ?? '',
        _hint: response.data?._hint,
      };
    } catch (error: any) {
      if (error.response) console.warn('Event description API error:', error.response.status);
      return { description: '', artistDescription: '', venueDescription: '' };
    }
  }

  /**
   * Batch-fetch description embeddings for two-tower recommendations.
   * Payload is base64url-encoded JSON: { city, items: [{ artist, venue }] }. Max 30 items per request.
   */
  async fetchEventDescriptionEmbeddings(
    city: string,
    items: { artist: string; venue: string }[]
  ): Promise<EventDescriptionEmbeddingsResponse> {
    if (!items.length) return { embeddings: [] };
    const payload = JSON.stringify({ city: city || '', items: items.slice(0, 30) });
    const base64 = typeof btoa !== 'undefined'
      ? btoa(unescape(encodeURIComponent(payload)))
      : Buffer.from(payload, 'utf8').toString('base64');
    const payloadParam = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    try {
      const url = `${API_ENDPOINTS.EVENT_DESCRIPTION_EMBEDDINGS}?payload=${encodeURIComponent(payloadParam)}`;
      const response = await this.client.get<EventDescriptionEmbeddingsResponse>(url, { timeout: 60000 });
      const list = Array.isArray(response.data?.embeddings) ? response.data.embeddings : [];
      return { embeddings: list, _hint: response.data?._hint };
    } catch (error: any) {
      if (error.response) console.warn('Event description embeddings API error:', error.response.status);
      return { embeddings: [] };
    }
  }

  /**
   * Fetch support, advertise, and sponsor placements from the showlist page (parsed from HTML).
   */
  async fetchPlacements(city: ShowlistCityId): Promise<PlacementsResponse> {
    try {
      const url = `${API_ENDPOINTS.PLACEMENTS}?city=${encodeURIComponent(city)}`;
      const response = await this.client.get<PlacementsResponse>(url);
      return {
        support: response.data?.support ?? {},
        advertiseUrl: response.data?.advertiseUrl ?? null,
        sponsors: Array.isArray(response.data?.sponsors) ? response.data.sponsors : [],
      };
    } catch (error: any) {
      if (error.response) console.warn('Placements API error:', error.response.status);
      return { support: {}, advertiseUrl: null, sponsors: [] };
    }
  }

  /**
   * Check if API is available
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.fetchEvents();
      return true;
    } catch {
      return false;
    }
  }
}

export const apiService = new ApiService();
