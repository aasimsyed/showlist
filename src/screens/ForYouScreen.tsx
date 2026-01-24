import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRecommendations } from '../hooks/useRecommendations';
import { useEvents } from '../hooks/useEvents';
import { ShowCard } from '../components/ShowCard';
import { useTheme } from '../context/ThemeContext';
import { MLRecommendationBadge } from '../components/MLRecommendationBadge';
import { useFavorites } from '../context/FavoritesContext';

export const ForYouScreen: React.FC = () => {
  const { colors } = useTheme();
  const { recommendations, loading } = useRecommendations(50);
  const { refresh, isRefreshing } = useEvents();
  const { favorites } = useFavorites();
  const styles = createStyles(colors);

  const renderRecommendation = ({ item }: { item: typeof recommendations[0] }) => {
    return (
      <View style={styles.cardWrapper}>
        <ShowCard 
          show={item.show} 
          eventDate={item.eventDate}
          showFavoriteButton={true}
        />
        <View style={styles.badgeContainer}>
          <MLRecommendationBadge explanation={item.explanation} />
        </View>
      </View>
    );
  };

  const renderEmpty = () => {
    if (loading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={colors.pink} />
          <Text style={styles.emptyText}>Analyzing your preferences...</Text>
        </View>
      );
    }

    if (favorites.length < 3) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Start building your recommendations</Text>
          <Text style={styles.emptySubtext}>
            Favorite at least 3 events to get personalized recommendations
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No recommendations right now</Text>
        <Text style={styles.emptySubtext}>
          Check back later for new events that match your preferences
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>🤖 For You</Text>
        <Text style={styles.subtitle}>
          Personalized recommendations based on your favorites
        </Text>
      </View>

      <FlatList
        data={recommendations}
        renderItem={renderRecommendation}
        keyExtractor={(item, index) => `rec-${item.show.artist}-${item.show.venue}-${index}`}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={
          recommendations.length === 0 ? styles.emptyList : undefined
        }
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refresh}
            tintColor={colors.pink}
            colors={[colors.pink]}
            accessibilityLabel="Pull to refresh recommendations"
          />
        }
        accessibilityLabel={`Recommendations list with ${recommendations.length} ${recommendations.length === 1 ? 'event' : 'events'}`}
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
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  cardWrapper: {
    backgroundColor: colors.cardBackground,
    marginBottom: 1,
  },
  badgeContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 18,
    color: colors.text,
    marginTop: 16,
    opacity: 0.8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
    opacity: 0.7,
    textAlign: 'center',
  },
  emptyList: {
    flexGrow: 1,
  },
});
