import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ShowlistCityId } from '../types';
import { DEFAULT_CITY, CITY_STORAGE_KEY } from '../utils/constants';

interface CityContextType {
  city: ShowlistCityId;
  setCity: (city: ShowlistCityId) => void;
}

const CityContext = createContext<CityContextType | undefined>(undefined);

export function CityProvider({ children }: { children: ReactNode }) {
  const [city, setCityState] = useState<ShowlistCityId>(DEFAULT_CITY);

  useEffect(() => {
    AsyncStorage.getItem(CITY_STORAGE_KEY).then((stored) => {
      if (typeof stored === 'string' && stored.length > 0) {
        setCityState(stored);
      }
    });
  }, []);

  const setCity = useCallback((next: ShowlistCityId) => {
    setCityState(next);
    AsyncStorage.setItem(CITY_STORAGE_KEY, next).catch(() => {});
  }, []);

  const value: CityContextType = { city, setCity };

  return (
    <CityContext.Provider value={value}>
      {children}
    </CityContext.Provider>
  );
}

export function useCity(): CityContextType {
  const context = useContext(CityContext);
  if (context === undefined) {
    throw new Error('useCity must be used within a CityProvider');
  }
  return context;
}
