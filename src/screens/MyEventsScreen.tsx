import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFavorites } from '../context/FavoritesContext';
import { useTheme } from '../context/ThemeContext';
import { ShowCard } from '../components/ShowCard';
import { filterShows } from '../utils/helpers';
import { Show } from '../types';

export const MyEventsScreen: React.FC = () => {
  const { colors } = useTheme();
  const { favorites, loading, removeFavorite, clearFavorites } = useFavorites();
  const [searchQuery, setSearchQuery] = useState('');
  const styles = createStyles(colors);

  const filteredFavorites = useMemo(() => {
    return filterShows(favorites, searchQuery);
  }, [favorites, searchQuery]);

  const handleRemoveFavorite = useCallback(
    async (show: Show) => {
      await removeFavorite(show);
    },
    [removeFavorite]
  );

  const renderShow = ({ item }: { item: Show }) => {
    return (
      <View>
        <ShowCard show={item} showFavoriteButton={false} />
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => handleRemoveFavorite(item)}
          accessibilityLabel={`Remove ${item.artist} at ${item.venue} from favorites`}
          accessibilityRole="button"
          accessibilityHint="Double tap to remove this event from your favorites"
        >
          <Text style={styles.removeButtonText}>Remove</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderEmpty = () => {
    if (loading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={colors.pink} />
          <Text style={styles.emptyText}>Loading favorites...</Text>
        </View>
      );
    }

    if (searchQuery && filteredFavorites.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No favorites found</Text>
          <Text style={styles.emptySubtext}>
            Try adjusting your search query
          </Text>
        </View>
      );
    }

    if (favorites.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No favorite events yet</Text>
          <Text style={styles.emptySubtext}>
            Tap the heart icon on events to add them to your favorites
          </Text>
        </View>
      );
    }

    return null;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>My Events</Text>
        {favorites.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={clearFavorites}
            accessibilityLabel="Clear all favorites"
            accessibilityRole="button"
            accessibilityHint="Double tap to remove all events from your favorites list"
          >
            <Text style={styles.clearButtonText}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>

      {favorites.length > 0 && (
        <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search favorites"
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          accessibilityLabel="Search favorites"
          accessibilityHint="Type to search your favorite events by artist name or venue"
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            style={styles.clearSearchButton}
            onPress={() => setSearchQuery('')}
            accessibilityLabel="Clear search"
            accessibilityRole="button"
            accessibilityHint="Double tap to clear the search field"
          >
            <Text style={styles.clearSearchButtonText}>X</Text>
          </TouchableOpacity>
        )}
      </View>
      )}

      <FlatList
        data={filteredFavorites}
        renderItem={renderShow}
        keyExtractor={(item, index) => `${item.artist}-${item.venue}-${index}`}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={
          filteredFavorites.length === 0 ? styles.emptyList : undefined
        }
        showsVerticalScrollIndicator={false}
        accessibilityLabel={`Favorites list with ${filteredFavorites.length} ${filteredFavorites.length === 1 ? 'event' : 'events'}`}
        accessibilityRole="list"
      />
    </SafeAreaView>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 10, // Increased for 44px minimum height
    borderRadius: 8,
    backgroundColor: colors.grayLight,
    minHeight: 44, // WCAG AA: Minimum touch target size
    justifyContent: 'center',
  },
  clearButtonText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
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
    height: 44, // Increased from 40px for better touch target
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    backgroundColor: colors.cardBackground,
    color: colors.text,
  },
  clearSearchButton: {
    marginLeft: 8,
    width: 44, // WCAG AA: Minimum touch target size
    height: 44, // WCAG AA: Minimum touch target size
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearSearchButtonText: {
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
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  emptyList: {
    flexGrow: 1,
  },
  removeButton: {
    marginHorizontal: 16,
    marginBottom: 8,
    paddingVertical: 12, // Increased for 44px minimum height
    paddingHorizontal: 12,
    backgroundColor: colors.grayLight,
    borderRadius: 6,
    alignItems: 'center',
    minHeight: 44, // WCAG AA: Minimum touch target size
    justifyContent: 'center',
  },
  removeButtonText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
  },
});

