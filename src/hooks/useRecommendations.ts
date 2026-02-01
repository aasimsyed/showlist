import { useEffect, useState, useCallback, useRef } from 'react';
import { InteractionManager } from 'react-native';
import { useEvents } from './useEvents';
import { useFavorites } from '../context/FavoritesContext';
import { getMLRecommendations, MLRecommendationScore, convertProfileToFeatures, convertShowToFeatures } from '../utils/mlRecommendationEngine';
import { updateUserProfile, getUserProfile } from '../utils/userBehaviorTracker';
import { mlService } from '../services/mlService';
import {
  getCachedRecommendations,
  saveRecommendations,
  filterOutPastRecommendations,
} from '../utils/recommendationsCache';

export function useRecommendations(limit: number = 10) {
  const { events } = useEvents();
  const { favorites } = useFavorites();
  const [recommendations, setRecommendations] = useState<MLRecommendationScore[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastFavoritesCount, setLastFavoritesCount] = useState(0);
  const lastTrainingCount = useRef(0);
  const trainingInProgress = useRef(false);

  // Update user profile when favorites change
  useEffect(() => {
    if (favorites.length !== lastFavoritesCount) {
      setLastFavoritesCount(favorites.length);
      if (favorites.length > 0) {
        updateUserProfile(favorites).catch(console.error);
      }
    }
  }, [favorites.length, lastFavoritesCount]);

  // Train model when favorites change (if we have enough data). Defer to avoid blocking UI.
  useEffect(() => {
    let task: { cancel: () => void } | null = null;
    const timeoutId = setTimeout(() => {
      task = InteractionManager.runAfterInteractions(async () => {
        if (
          favorites.length >= 10 &&
          Math.abs(favorites.length - lastTrainingCount.current) >= 3 &&
          !trainingInProgress.current
        ) {
          trainingInProgress.current = true;
          lastTrainingCount.current = favorites.length;
          try {
            const profile = await getUserProfile();
            if (!profile) return;
            const userFeatures = convertProfileToFeatures(profile);
            const trainingData = favorites.map(fav => ({
              userFeatures,
              eventFeatures: convertShowToFeatures(fav),
              label: 1,
            }));
            await mlService.trainModel(trainingData);
          } catch (error) {
            console.error('Error training model:', error);
          } finally {
            trainingInProgress.current = false;
          }
        }
      });
    }, 2000);

    return () => {
      clearTimeout(timeoutId);
      if (task) task.cancel();
    };
  }, [favorites.length]);

  // Load persisted recommendations on mount (filter out past-dated events)
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

  // Calculate recommendations when events/favorites change; persist for next session.
  // Defer until after transitions (e.g. tab switch) so UI stays responsive.
  const calculateRecommendations = useCallback(async () => {
    if (events.length === 0 || favorites.length < 3) {
      return;
    }

    setLoading(true);
    try {
      const recs = await getMLRecommendations(events, favorites, limit);
      setRecommendations(recs);
      saveRecommendations(recs).catch(() => {});
    } catch (error) {
      console.error('Error calculating recommendations:', error);
      setRecommendations([]);
    } finally {
      setLoading(false);
    }
  }, [events, favorites, limit]);

  useEffect(() => {
    let task: { cancel: () => void } | null = null;
    const t = setTimeout(() => {
      task = InteractionManager.runAfterInteractions(() => {
        calculateRecommendations();
      });
    }, 500);
    return () => {
      clearTimeout(t);
      if (task) task.cancel();
    };
  }, [calculateRecommendations]);

  return { recommendations, loading };
}
