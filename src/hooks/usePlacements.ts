import { useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/api';
import type { PlacementsResponse } from '../services/api';
import type { ShowlistCityId } from '../types';

const PLACEMENTS_CACHE_MAX_AGE_MS = 60 * 60 * 1000; // 1 hour

export function usePlacements(city: ShowlistCityId): PlacementsResponse & { loading: boolean; refresh: () => Promise<void> } {
  const [data, setData] = useState<PlacementsResponse>({ support: {}, advertiseUrl: null, sponsors: [] });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiService.fetchPlacements(city);
      setData(res);
    } catch {
      setData({ support: {}, advertiseUrl: null, sponsors: [] });
    } finally {
      setLoading(false);
    }
  }, [city]);

  useEffect(() => {
    load();
  }, [load]);

  return { ...data, loading, refresh: load };
}
