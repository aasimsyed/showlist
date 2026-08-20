import { useEffect, useState, useCallback, useRef } from 'react';
import { useEvents } from './useEvents';
import { useFavorites } from '../context/FavoritesContext';
import { useCity } from '../context/CityContext';
import {
  getMLRecommendations,
  refineRecommendations,
  MLRecommendationScore,
} from '../utils/mlRecommendationEngine';
import { updateUserProfile } from '../utils/userBehaviorTracker';
import {
  getCachedRecommendations,
  saveRecommendations,
  filterOutPastRecommendations,
} from '../utils/recommendationsCache';

export function useRecommendations(limit: number = 10) {
  const { events } = useEvents();
  const { favorites } = useFavorites();
  const { city } = useCity();
  const [recommendations, setRecommendations] = useState<MLRecommendationScore[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastFavoritesCount, setLastFavoritesCount] = useState(0);
  const requestId = useRef(0);

  useEffect(() => {
    if (favorites.length !== lastFavoritesCount) {
      setLastFavoritesCount(favorites.length);
      if (favorites.length > 0) {
        updateUserProfile(favorites).catch(console.error);
      }
    }
  }, [favorites.length, lastFavoritesCount]);

  useEffect(() => {
    const loadCached = async () => {
      const cached = await getCachedRecommendations();
      if (cached && cached.length > 0) {
        const filtered = filterOutPastRecommendations(cached);
        setRecommendations(filtered);
      }
    };
    loadCached();
  }, []);

  const calculateRecommendations = useCallback(async () => {
    const id = ++requestId.current;
    if (events.length === 0 || favorites.length < 3) {
      if (id !== requestId.current) return;
      setLoading(false);
      if (favorites.length < 3) setRecommendations([]);
      return;
    }

    setLoading(true);
    try {
      const recs = await getMLRecommendations(events, favorites, limit, city);
      if (id !== requestId.current) return;
      setRecommendations(recs);
      setLoading(false);
      saveRecommendations(recs).catch(() => {});

      const refined = await refineRecommendations(events, favorites, limit, city);
      if (id !== requestId.current) return;
      if (refined.length > 0) {
        setRecommendations(refined);
        saveRecommendations(refined).catch(() => {});
      }
    } catch (error) {
      console.error('Error calculating recommendations:', error);
      if (id !== requestId.current) return;
      setRecommendations([]);
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [events, favorites, limit, city]);

  useEffect(() => {
    calculateRecommendations();
  }, [calculateRecommendations]);

  return { recommendations, loading, refresh: calculateRecommendations };
}
