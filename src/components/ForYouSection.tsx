import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useRecommendations } from '../hooks/useRecommendations';
import { ShowCard } from './ShowCard';
import { useTheme } from '../context/ThemeContext';
import { MLRecommendationBadge } from './MLRecommendationBadge';

export const ForYouSection: React.FC = () => {
  const { recommendations, loading } = useRecommendations(5);
  const { colors } = useTheme();
  const styles = createStyles(colors);

  if (loading || recommendations.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🤖 Recommended For You</Text>
        <Text style={styles.subtitle}>
          Based on your favorites and preferences
        </Text>
      </View>
      
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {recommendations.map((rec, index) => (
          <View key={`rec-${index}`} style={styles.cardContainer}>
            <ShowCard 
              show={rec.show} 
              eventDate={rec.eventDate}
              showFavoriteButton={true}
            />
            <View style={styles.badgeContainer}>
              <MLRecommendationBadge explanation={rec.explanation} />
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  cardContainer: {
    width: 300,
    marginRight: 12,
    backgroundColor: colors.cardBackground,
    borderRadius: 8,
    overflow: 'hidden',
  },
  badgeContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
});
