import { useMemo, useEffect, useState, useCallback, useRef } from 'react';
import { useEvents } from './useEvents';
import { useFavorites } from '../context/FavoritesContext';
import { getMLRecommendations, MLRecommendationScore, convertProfileToFeatures, convertShowToFeatures } from '../utils/mlRecommendationEngine';
import { updateUserProfile, getUserProfile } from '../utils/userBehaviorTracker';
import { mlService } from '../services/mlService';

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

  // Train model when favorites change (if we have enough data)
  useEffect(() => {
    const trainModelIfNeeded = async () => {
      // Only train if:
      // 1. We have at least 10 favorites (enough training data)
      // 2. Favorites count changed by at least 3 (significant change)
      // 3. Not already training
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

          // Build training data from favorites
          const userFeatures = convertProfileToFeatures(profile);
          const trainingData = favorites.map(fav => ({
            userFeatures,
            eventFeatures: convertShowToFeatures(fav),
            label: 1, // Favorited = positive example
          }));

          // Train the model
          console.log(`🧠 Training model with ${trainingData.length} favorites...`);
          await mlService.trainModel(trainingData);
          console.log('✅ Model training complete');
        } catch (error) {
          console.error('Error training model:', error);
        } finally {
          trainingInProgress.current = false;
        }
      }
    };

    // Debounce training to avoid too frequent retraining
    const timeoutId = setTimeout(() => {
      trainModelIfNeeded();
    }, 2000); // Wait 2 seconds after favorites change

    return () => clearTimeout(timeoutId);
  }, [favorites.length]);

  // Calculate recommendations
  const calculateRecommendations = useCallback(async () => {
    if (events.length === 0 || favorites.length < 3) {
      setRecommendations([]);
      return;
    }

    setLoading(true);
    try {
      const recs = await getMLRecommendations(events, favorites, limit);
      setRecommendations(recs);
    } catch (error) {
      console.error('Error calculating recommendations:', error);
      setRecommendations([]);
    } finally {
      setLoading(false);
    }
  }, [events, favorites, limit]);

  useEffect(() => {
    // Debounce recommendations calculation
    const timeoutId = setTimeout(() => {
      calculateRecommendations();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [calculateRecommendations]);

  return { recommendations, loading };
}
