import React, { createContext, useContext, ReactNode } from 'react';
import { useRecommendations } from '../hooks/useRecommendations';
import type { MLRecommendationScore } from '../utils/mlRecommendationEngine';

interface RecommendationsContextType {
  recommendations: MLRecommendationScore[];
  loading: boolean;
}

const RecommendationsContext = createContext<RecommendationsContextType | undefined>(undefined);

/**
 * Single source of recommendations. Consumed by ShowCard, ForYouScreen, etc.
 * Must be used within FavoritesProvider (useRecommendations depends on useFavorites).
 */
export function RecommendationsProvider({ children }: { children: ReactNode }) {
  const { recommendations, loading } = useRecommendations(50);

  return (
    <RecommendationsContext.Provider value={{ recommendations, loading }}>
      {children}
    </RecommendationsContext.Provider>
  );
}

export function useRecommendationsContext(): RecommendationsContextType {
  const context = useContext(RecommendationsContext);
  if (context === undefined) {
    throw new Error('useRecommendationsContext must be used within a RecommendationsProvider');
  }
  return context;
}
