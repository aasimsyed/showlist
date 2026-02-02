import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService } from '../services/api';
import type { CityOption } from '../services/api';
import {
  FALLBACK_CITIES,
  CITIES_CACHE_KEY,
  CITIES_CACHE_TIMESTAMP_KEY,
  CITIES_CACHE_MAX_AGE_MS,
} from '../utils/constants';

interface UseCitiesReturn {
  cities: CityOption[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useCities(): UseCitiesReturn {
  const [cities, setCities] = useState<CityOption[]>(FALLBACK_CITIES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCities = useCallback(async (forceRefresh = false) => {
    if (!forceRefresh) setLoading(true);
    setError(null);

    try {
      if (!forceRefresh) {
        const cached = await AsyncStorage.getItem(CITIES_CACHE_KEY);
        const ts = await AsyncStorage.getItem(CITIES_CACHE_TIMESTAMP_KEY);
        if (cached && ts) {
          const age = Date.now() - parseInt(ts, 10);
          if (age < CITIES_CACHE_MAX_AGE_MS) {
            const parsed = JSON.parse(cached) as CityOption[];
            if (parsed?.length) {
              setCities(parsed);
              setLoading(false);
              return;
            }
          }
        }
      }

      const res = await apiService.fetchCities();
      setCities(res.cities);
      await AsyncStorage.setItem(CITIES_CACHE_KEY, JSON.stringify(res.cities));
      await AsyncStorage.setItem(CITIES_CACHE_TIMESTAMP_KEY, String(Date.now()));
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load cities');
      setCities(FALLBACK_CITIES);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCities(false);
  }, [loadCities]);

  const refresh = useCallback(() => loadCities(true), [loadCities]);

  return { cities, loading, error, refresh };
}
