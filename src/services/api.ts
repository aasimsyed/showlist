import axios, { AxiosInstance } from 'axios';
import { EventsResponse, ShowlistCityId } from '../types';
import { API_BASE_URL, API_ENDPOINTS } from '../utils/constants';

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
}

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
   * Fetch events from the API for the given city
   */
  async fetchEvents(city: ShowlistCityId): Promise<EventsResponse> {
    try {
      const url = `${API_ENDPOINTS.EVENTS}?city=${encodeURIComponent(city)}`;
      const response = await this.client.get<EventsResponse>(url);
      
      if (!response.data || !response.data.events) {
        throw new Error('Invalid response format');
      }
      
      return response.data;
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
      const response = await this.client.get<EventDescriptionResponse>(url);
      return {
        description: response.data?.description ?? '',
        artistDescription: response.data?.artistDescription ?? '',
        venueDescription: response.data?.venueDescription ?? '',
      };
    } catch (error: any) {
      if (error.response) console.warn('Event description API error:', error.response.status);
      return { description: '', artistDescription: '', venueDescription: '' };
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
