import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '../components/Header';
import { DateNavigation } from '../components/DateNavigation';
import { EventList } from '../components/EventList';
import { Footer } from '../components/Footer';
import { LoadingState } from '../components/LoadingState';
import { FilterModal } from '../components/FilterModal';
import { CityPickerModal } from '../components/CityPickerModal';
import { useEvents } from '../hooks/useEvents';
import { SwipeableContainer } from '../hooks/useSwipeGesture';
import { useTheme } from '../context/ThemeContext';
import { useCity } from '../context/CityContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCacheKeys, SEARCH_DEBOUNCE_MS } from '../utils/constants';
import { FilterState, DEFAULT_FILTERS } from '../types/filters';
import { hasActiveFilters } from '../utils/filterHelpers';

export const HomeScreen: React.FC = () => {
  const { colors } = useTheme();
  const { city } = useCity();
  const cacheKeys = getCacheKeys(city);
  const styles = createStyles(colors);
  const { events, loading, error, lastUpdated, refresh, isRefreshing } = useEvents();
  const [currentDayIndex, setCurrentDayIndex] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [cityModalVisible, setCityModalVisible] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const hasLoadedInitialDayIndexRef = useRef(false);

  // Reset day index and load flag when city changes
  React.useEffect(() => {
    setCurrentDayIndex(0);
    hasLoadedInitialDayIndexRef.current = false;
  }, [city]);

  // Load saved day index from cache only once when events first become available (avoids overwriting user selection)
  React.useEffect(() => {
    if (events.length === 0 || hasLoadedInitialDayIndexRef.current) return;

    const loadSavedIndex = async () => {
      try {
        const savedIndex = await AsyncStorage.getItem(cacheKeys.CURRENT_DAY_INDEX);
        if (savedIndex != null) {
          const index = parseInt(savedIndex, 10);
          if (index >= 0 && index < events.length) {
            setCurrentDayIndex(index);
          }
        }
      } catch (err) {
        console.error('Error loading saved day index:', err);
      } finally {
        hasLoadedInitialDayIndexRef.current = true;
      }
    };

    loadSavedIndex();
  }, [events.length, cacheKeys.CURRENT_DAY_INDEX]);

  // Save day index to cache (city-scoped)
  const saveDayIndex = useCallback(async (index: number) => {
    try {
      await AsyncStorage.setItem(cacheKeys.CURRENT_DAY_INDEX, index.toString());
    } catch (err) {
      console.error('Error saving day index:', err);
    }
  }, [cacheKeys.CURRENT_DAY_INDEX]);

  // Search handler with immediate input update and debounced filter
  const handleSearchChange = useCallback((query: string) => {
    // Update input immediately for responsive UI
    setSearchInput(query);
    
    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // Debounce the actual filter query
    searchTimeoutRef.current = setTimeout(() => {
      setSearchQuery(query);
    }, SEARCH_DEBOUNCE_MS);
  }, []);

  // Clear search handler
  const handleClearSearch = useCallback(() => {
    setSearchInput('');
    setSearchQuery('');
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Navigation handlers
  const handlePrevious = useCallback(() => {
    if (currentDayIndex > 0) {
      const newIndex = currentDayIndex - 1;
      setCurrentDayIndex(newIndex);
      saveDayIndex(newIndex);
    }
  }, [currentDayIndex, saveDayIndex]);

  const handleNext = useCallback(() => {
    if (currentDayIndex < events.length - 1) {
      const newIndex = currentDayIndex + 1;
      setCurrentDayIndex(newIndex);
      saveDayIndex(newIndex);
    }
  }, [currentDayIndex, events.length, saveDayIndex]);

  const handleDaySelect = useCallback((index: number) => {
    setCurrentDayIndex(index);
    saveDayIndex(index);
  }, [saveDayIndex]);

  // Jump to today
  const handleJumpToToday = useCallback(() => {
    const today = new Date();
    const todayString = today.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    
    const todayIndex = events.findIndex(
      (day) => day.date === todayString || day.date.includes(today.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }))
    );
    
    if (todayIndex >= 0) {
      setCurrentDayIndex(todayIndex);
      saveDayIndex(todayIndex);
    } else {
      // If today not found, go to first day (closest to today)
      setCurrentDayIndex(0);
      saveDayIndex(0);
    }
  }, [events, saveDayIndex]);

  // Swipe gesture enabled state
  const swipeEnabled = !loading && events.length > 0;

  // Filter handlers
  const handleFiltersPress = useCallback(() => {
    setFilterModalVisible(true);
  }, []);

  const handleCityPress = useCallback(() => {
    setCityModalVisible(true);
  }, []);

  const handleFiltersChange = useCallback((newFilters: FilterState) => {
    setFilters(newFilters);
    // Save filters to AsyncStorage
    AsyncStorage.setItem('event_filters', JSON.stringify(newFilters)).catch(
      (err) => console.error('Error saving filters:', err)
    );
  }, []);

  // Load saved filters on mount
  useEffect(() => {
    const loadFilters = async () => {
      try {
        const saved = await AsyncStorage.getItem('event_filters');
        if (saved) {
          setFilters(JSON.parse(saved));
        }
      } catch (error) {
        console.error('Error loading filters:', error);
      }
    };
    loadFilters();
  }, []);

  // Error display
  if (error && events.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Header
          onFiltersPress={handleFiltersPress}
          onRefreshPress={refresh}
          onCityPress={handleCityPress}
          onToday={handleJumpToToday}
          showTodayButton={false}
          hasActiveFilters={hasActiveFilters(filters)}
        />
        <View style={styles.errorContainer}>
          <LoadingState message={`Error: ${error}`} />
        </View>
      </SafeAreaView>
    );
  }

  // Initial loading
  if (loading && events.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Header
          onFiltersPress={handleFiltersPress}
          onRefreshPress={refresh}
          onCityPress={handleCityPress}
          onToday={handleJumpToToday}
          showTodayButton={false}
          hasActiveFilters={hasActiveFilters(filters)}
        />
        <LoadingState />
      </SafeAreaView>
    );
  }

  const currentDay = events[currentDayIndex];
  const canGoPrevious = currentDayIndex > 0;
  const canGoNext = currentDayIndex < events.length - 1;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        onFiltersPress={handleFiltersPress}
        onRefreshPress={refresh}
        onCityPress={handleCityPress}
        onToday={handleJumpToToday}
        showTodayButton={events.length > 0}
        hasActiveFilters={hasActiveFilters(filters)}
      />

      <DateNavigation
        events={events}
        currentIndex={currentDayIndex}
        onPrevious={handlePrevious}
        onNext={handleNext}
        onDaySelect={handleDaySelect}
        canGoPrevious={canGoPrevious}
        canGoNext={canGoNext}
      />

      <SwipeableContainer
        onSwipeLeft={handleNext}
        onSwipeRight={handlePrevious}
        enabled={swipeEnabled}
      >
        <View style={styles.content}>
          <EventList
            events={events}
            currentDayIndex={currentDayIndex}
            searchInput={searchInput}
            searchQuery={searchQuery}
            onSearchChange={handleSearchChange}
            onClearSearch={handleClearSearch}
            loading={loading}
            refreshing={isRefreshing}
            onRefresh={refresh}
            filters={filters}
          />
        </View>
      </SwipeableContainer>

      <Footer lastUpdated={lastUpdated} />

      <FilterModal
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        filters={filters}
        onFiltersChange={handleFiltersChange}
        events={events}
        currentDayIndex={currentDayIndex}
      />

      <CityPickerModal
        visible={cityModalVisible}
        onClose={() => setCityModalVisible(false)}
      />
    </SafeAreaView>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
  },
});
