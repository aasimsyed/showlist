import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Show } from '../types';

const FAVORITES_KEY = 'favorite_events';

// Create a unique key for a show
function getShowKey(show: Show): string {
  return `${show.artist}|${show.venue}|${show.time || ''}`;
}

interface FavoritesContextType {
  favorites: Show[];
  loading: boolean;
  isFavorite: (show: Show) => boolean;
  toggleFavorite: (show: Show) => Promise<void>;
  removeFavorite: (show: Show) => Promise<void>;
  clearFavorites: () => Promise<void>;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<Show[]>([]);
  const [loading, setLoading] = useState(true);

  // Load favorites from storage
  useEffect(() => {
    const loadFavorites = async () => {
      try {
        const stored = await AsyncStorage.getItem(FAVORITES_KEY);
        if (stored) {
          setFavorites(JSON.parse(stored));
        }
      } catch (error) {
        console.error('Error loading favorites:', error);
      } finally {
        setLoading(false);
      }
    };

    loadFavorites();
  }, []);

  // Save favorites to storage
  const saveFavorites = useCallback(async (newFavorites: Show[]) => {
    try {
      await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(newFavorites));
      setFavorites(newFavorites);
    } catch (error) {
      console.error('Error saving favorites:', error);
    }
  }, []);

  // Check if a show is favorited
  const isFavorite = useCallback(
    (show: Show): boolean => {
      const showKey = getShowKey(show);
      return favorites.some((fav) => getShowKey(fav) === showKey);
    },
    [favorites]
  );

  // Toggle favorite status
  const toggleFavorite = useCallback(
    async (show: Show) => {
      const showKey = getShowKey(show);
      const isCurrentlyFavorite = favorites.some(
        (fav) => getShowKey(fav) === showKey
      );

      let newFavorites: Show[];
      if (isCurrentlyFavorite) {
        // Remove from favorites
        newFavorites = favorites.filter((fav) => getShowKey(fav) !== showKey);
      } else {
        // Add to favorites
        newFavorites = [...favorites, show];
      }

      await saveFavorites(newFavorites);
    },
    [favorites, saveFavorites]
  );

  // Remove a favorite
  const removeFavorite = useCallback(
    async (show: Show) => {
      const showKey = getShowKey(show);
      const newFavorites = favorites.filter((fav) => getShowKey(fav) !== showKey);
      await saveFavorites(newFavorites);
    },
    [favorites, saveFavorites]
  );

  // Clear all favorites
  const clearFavorites = useCallback(async () => {
    await saveFavorites([]);
  }, [saveFavorites]);

  return (
    <FavoritesContext.Provider
      value={{
        favorites,
        loading,
        isFavorite,
        toggleFavorite,
        removeFavorite,
        clearFavorites,
      }}
    >
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (context === undefined) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
}
