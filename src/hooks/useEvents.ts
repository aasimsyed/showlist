import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService } from '../services/api';
import { EventDay, EventsResponse } from '../types';
import { CACHE_KEYS, CACHE_DURATION_MS, AUTO_REFRESH_INTERVAL_MS } from '../utils/constants';

interface UseEventsReturn {
  events: EventDay[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refresh: () => Promise<void>;
  isRefreshing: boolean;
}

export function useEvents(): UseEventsReturn {
  const [events, setEvents] = useState<EventDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  /**
   * Load cached events from AsyncStorage
   */
  const loadCachedEvents = useCallback(async (): Promise<boolean> => {
    try {
      const cachedData = await AsyncStorage.getItem(CACHE_KEYS.EVENTS);
      const cachedTimestamp = await AsyncStorage.getItem(CACHE_KEYS.LAST_UPDATED);
      
      if (cachedData && cachedTimestamp) {
        const timestamp = new Date(cachedTimestamp);
        const now = new Date();
        const age = now.getTime() - timestamp.getTime();
        
        // Use cache if less than cache duration old
        if (age < CACHE_DURATION_MS) {
          const parsedEvents: EventDay[] = JSON.parse(cachedData);
          setEvents(parsedEvents);
          setLastUpdated(timestamp);
          return true;
        }
      }
    } catch (err) {
      console.error('Error loading cached events:', err);
    }
    
    return false;
  }, []);

  /**
   * Save events to cache
   */
  const saveToCache = useCallback(async (data: EventsResponse) => {
    try {
      await AsyncStorage.setItem(CACHE_KEYS.EVENTS, JSON.stringify(data.events));
      await AsyncStorage.setItem(CACHE_KEYS.LAST_UPDATED, new Date().toISOString());
    } catch (err) {
      console.error('Error saving to cache:', err);
    }
  }, []);

  // Ref to track if we're currently fetching to avoid duplicate calls
  const isFetchingRef = useRef(false);
  const backgroundRefreshRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Fetch events from API (internal function that does the actual fetch)
   */
  const doFetch = useCallback(async (forceRefresh: boolean) => {
    if (!forceRefresh) {
      setLoading(true);
    } else {
      setIsRefreshing(true);
    }
    
    setError(null);

    try {
      const response = await apiService.fetchEvents();
      
      setEvents(response.events);
      setLastUpdated(new Date(response.lastUpdated));
      await saveToCache(response);
      
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to fetch events';
      
      // If fetch failed, try to load from cache
      const hasCache = await loadCachedEvents();
      if (!hasCache) {
        // Only set error if we have no cache to fall back to
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
      isFetchingRef.current = false;
    }
  }, [loadCachedEvents, saveToCache]);

  /**
   * Fetch events from API
   */
  const fetchEvents = useCallback(async (forceRefresh = false) => {
    // Prevent duplicate simultaneous fetches
    if (isFetchingRef.current && !forceRefresh) {
      return;
    }

    isFetchingRef.current = true;

    try {
      // Try to load from cache first if not forcing refresh
      if (!forceRefresh) {
        const hasCache = await loadCachedEvents();
        if (hasCache) {
          isFetchingRef.current = false;
          // Still fetch in background to update cache (after a short delay)
          if (backgroundRefreshRef.current) {
            clearTimeout(backgroundRefreshRef.current);
          }
          backgroundRefreshRef.current = setTimeout(() => {
            doFetch(true).catch(() => {
              // Silent fail for background refresh
            });
          }, 500);
          return;
        }
      }

      await doFetch(forceRefresh);
      
    } catch (err) {
      isFetchingRef.current = false;
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [loadCachedEvents, doFetch]);

  /**
   * Refresh events (pull to refresh)
   */
  const refresh = useCallback(async () => {
    await fetchEvents(true);
  }, [fetchEvents]);

  // Check if data needs refresh based on lastUpdated
  const shouldRefresh = useCallback((): boolean => {
    if (!lastUpdated) return true;
    const now = new Date();
    const age = now.getTime() - lastUpdated.getTime();
    return age >= AUTO_REFRESH_INTERVAL_MS;
  }, [lastUpdated]);

  // Auto-refresh interval - refresh every 30 minutes
  useEffect(() => {
    // Set up interval to refresh every 30 minutes
    const intervalId = setInterval(() => {
      console.log('Auto-refreshing events (30 minute interval)');
      fetchEvents(true).catch((err) => {
        console.error('Auto-refresh failed:', err);
      });
    }, AUTO_REFRESH_INTERVAL_MS);

    return () => {
      clearInterval(intervalId);
    };
  }, [fetchEvents]);

  // Refresh when app comes to foreground if data is stale
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        // App came to foreground, check if we need to refresh
        if (shouldRefresh()) {
          console.log('App came to foreground, refreshing stale data');
          fetchEvents(true).catch((err) => {
            console.error('Foreground refresh failed:', err);
          });
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [shouldRefresh, fetchEvents]);

  // Initial load
  useEffect(() => {
    fetchEvents(false);
    
    // Cleanup background refresh timeout on unmount
    return () => {
      if (backgroundRefreshRef.current) {
        clearTimeout(backgroundRefreshRef.current);
      }
    };
  }, []);

  return {
    events,
    loading,
    error,
    lastUpdated,
    refresh,
    isRefreshing,
  };
}
