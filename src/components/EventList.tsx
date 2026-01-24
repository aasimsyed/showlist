import React, { useMemo, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Show, EventDay } from '../types';
import { ShowCard } from './ShowCard';
import { useTheme } from '../context/ThemeContext';
import { filterShows } from '../utils/helpers';
import { FilterState } from '../types/filters';
import { applyFilters } from '../utils/filterHelpers';

interface EventListProps {
  events: EventDay[];
  currentDayIndex: number;
  searchInput: string;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onClearSearch: () => void;
  loading?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  filters?: FilterState;
}

export const EventList: React.FC<EventListProps> = ({
  events,
  currentDayIndex,
  searchInput,
  searchQuery,
  onSearchChange,
  onClearSearch,
  loading,
  refreshing = false,
  onRefresh,
  filters,
}) => {
  const currentDay = events[currentDayIndex];
  const filteredShows = useMemo(() => {
    if (!currentDay) return [];
    
    // First apply filters
    let shows = filters 
      ? applyFilters(currentDay.shows, filters)
      : currentDay.shows;
    
    // Then apply search query
    shows = filterShows(shows, searchQuery);
    
    return shows;
  }, [currentDay, searchQuery, filters]);

  const renderShow = ({ item }: { item: Show }) => {
    return (
      <ShowCard 
        show={item} 
        eventDate={currentDay?.date}
        accessibilityLabel={`Event: ${item.artist} at ${item.venue}${item.time ? ` at ${item.time}` : ''}`}
      />
    );
  };

  const { colors } = useTheme();
  const styles = createStyles(colors);
  const flatListRef = useRef<FlatList>(null);

  const renderEmpty = () => {
    if (loading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={colors.pink} />
          <Text style={styles.emptyText}>Loading events...</Text>
        </View>
      );
    }

    if (filteredShows.length === 0) {
      if (searchQuery || filters) {
        return (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No events found</Text>
            <Text style={styles.emptySubtext}>
              Try adjusting your search or filters
            </Text>
          </View>
        );
      }
      
      if (!currentDay || currentDay.shows.length === 0) {
        return (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No events scheduled</Text>
          </View>
        );
      }
    }

    return null;
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search show titles"
          placeholderTextColor={colors.textSecondary}
          value={searchInput}
          onChangeText={onSearchChange}
          accessibilityLabel="Search events"
          accessibilityHint="Type to search for events by artist name or venue"
          returnKeyType="search"
        />
        {searchInput.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={onClearSearch}
            accessibilityLabel="Clear search"
            accessibilityRole="button"
            accessibilityHint="Double tap to clear the search field"
          >
            <Text style={styles.clearButtonText}>X</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        ref={flatListRef}
        data={filteredShows}
        renderItem={renderShow}
        keyExtractor={(item, index) => `${item.artist}-${item.venue}-${index}`}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={
          filteredShows.length === 0 ? styles.emptyList : undefined
        }
        showsVerticalScrollIndicator={false}
        accessibilityLabel={`Event list with ${filteredShows.length} ${filteredShows.length === 1 ? 'event' : 'events'}`}
        accessibilityRole="list"
        // Allow vertical scrolling to take priority
        scrollEnabled={true}
        nestedScrollEnabled={false}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.pink}
              colors={[colors.pink]}
              accessibilityLabel="Pull to refresh events"
            />
          ) : undefined
        }
      />
    </View>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchInput: {
    flex: 1,
    height: 44, // Increased from 40px for better touch target (WCAG AA)
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16, // Meets minimum readable size
    backgroundColor: colors.cardBackground,
    color: colors.text,
  },
  clearButton: {
    marginLeft: 8,
    width: 44, // WCAG AA: Minimum touch target size
    height: 44, // WCAG AA: Minimum touch target size
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: 18,
    color: colors.text,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    color: colors.text,
    marginTop: 16,
    opacity: 0.8, // Increased for better contrast (WCAG AA)
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
    opacity: 0.7, // Increased for better contrast (WCAG AA)
  },
  emptyList: {
    flexGrow: 1,
  },
});
