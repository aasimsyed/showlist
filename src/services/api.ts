import axios, { AxiosInstance } from 'axios';
import { EventsResponse, EventDay } from '../types';
import { API_BASE_URL, API_ENDPOINTS } from '../utils/constants';

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000, // 10 second timeout
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Fetch events from the API
   */
  async fetchEvents(): Promise<EventsResponse> {
    try {
      const response = await this.client.get<EventsResponse>(
        API_ENDPOINTS.EVENTS
      );
      
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
