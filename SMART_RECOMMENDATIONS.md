# Smart Recommendations Feature - Implementation Plan

## Overview
A personalized recommendation system that learns from user behavior to suggest relevant events.

## Architecture

### 1. Data Collection & User Profile

**Track User Behavior:**
- Favorite events (already available)
- Time preferences (when they favorite events)
- Venue preferences (which venues they frequent)
- Artist preferences (which artists they like)
- Interaction patterns (how often they check events, which days)

**User Profile Structure:**
```typescript
interface UserProfile {
  favoriteArtists: Map<string, number>; // artist -> count
  favoriteVenues: Map<string, number>;   // venue -> count
  timePreferences: {
    morning: number;
    afternoon: number;
    evening: number;
    lateNight: number;
  };
  dayPreferences: Map<string, number>; // day of week -> count
  totalInteractions: number;
  lastUpdated: Date;
}
```

### 2. Recommendation Algorithm

**Multi-Strategy Approach:**

1. **Content-Based Filtering**
   - Match events with similar artists/venues to favorites
   - Weight by frequency of interaction

2. **Collaborative Filtering** (if we had user data)
   - "Users who favorited X also favorited Y"
   - Not applicable without backend user data

3. **Time-Based Recommendations**
   - Suggest events at preferred times
   - Prioritize upcoming events

4. **Hybrid Scoring**
   - Combine multiple signals with weights
   - Boost recent favorites
   - Decay old preferences

### 3. Implementation Components

#### A. User Behavior Tracker (`src/utils/userBehaviorTracker.ts`)
- Track favorites, views, interactions
- Build user profile
- Persist to AsyncStorage

#### B. Recommendation Engine (`src/utils/recommendationEngine.ts`)
- Score events based on user profile
- Generate recommendations
- Cache results

#### C. Recommendations Hook (`src/hooks/useRecommendations.ts`)
- React hook to get recommendations
- Auto-update when favorites change
- Memoized for performance

#### D. Recommendations UI (`src/components/RecommendationsBadge.tsx`)
- Badge/indicator on recommended events
- "For You" section
- Recommendation explanations

## Implementation Steps

### Step 1: User Behavior Tracking

```typescript
// src/utils/userBehaviorTracker.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Show } from '../types';

const USER_PROFILE_KEY = 'user_profile';

interface UserProfile {
  favoriteArtists: Record<string, number>;
  favoriteVenues: Record<string, number>;
  timePreferences: {
    morning: number;
    afternoon: number;
    evening: number;
    lateNight: number;
  };
  dayPreferences: Record<string, number>;
  totalInteractions: number;
  lastUpdated: string;
}

function extractTimeOfDay(time: string | null): 'morning' | 'afternoon' | 'evening' | 'lateNight' | null {
  if (!time) return null;
  const hour = parseInt(time.split(':')[0]);
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 22) return 'evening';
  if (hour >= 22 || hour < 2) return 'lateNight';
  return null;
}

function getDayOfWeek(date: string): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', { weekday: 'long' });
}

export async function updateUserProfile(favorites: Show[]): Promise<UserProfile> {
  const profile: UserProfile = {
    favoriteArtists: {},
    favoriteVenues: {},
    timePreferences: { morning: 0, afternoon: 0, evening: 0, lateNight: 0 },
    dayPreferences: {},
    totalInteractions: favorites.length,
    lastUpdated: new Date().toISOString(),
  };

  // Analyze favorites
  for (const show of favorites) {
    // Track artists
    profile.favoriteArtists[show.artist] = (profile.favoriteArtists[show.artist] || 0) + 1;
    
    // Track venues
    profile.favoriteVenues[show.venue] = (profile.favoriteVenues[show.venue] || 0) + 1;
    
    // Track time preferences
    const timeOfDay = extractTimeOfDay(show.time);
    if (timeOfDay) {
      profile.timePreferences[timeOfDay]++;
    }
  }

  // Save profile
  await AsyncStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profile));
  return profile;
}

export async function getUserProfile(): Promise<UserProfile | null> {
  try {
    const stored = await AsyncStorage.getItem(USER_PROFILE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error('Error loading user profile:', error);
    return null;
  }
}

export async function trackEventView(show: Show): Promise<void> {
  // Optional: Track which events user views (not just favorites)
  // This could be used for implicit feedback
}
```

### Step 2: Recommendation Engine

```typescript
// src/utils/recommendationEngine.ts
import { Show, EventDay } from '../types';
import { getUserProfile } from './userBehaviorTracker';

interface RecommendationScore {
  show: Show;
  score: number;
  reasons: string[];
}

function extractTimeOfDay(time: string | null): 'morning' | 'afternoon' | 'evening' | 'lateNight' | null {
  if (!time) return null;
  const hour = parseInt(time.split(':')[0]);
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 22) return 'evening';
  if (hour >= 22 || hour < 2) return 'lateNight';
  return null;
}

export async function getRecommendations(
  events: EventDay[],
  favorites: Show[],
  limit: number = 10
): Promise<RecommendationScore[]> {
  const profile = await getUserProfile();
  
  if (!profile || profile.totalInteractions < 3) {
    // Not enough data for recommendations
    return [];
  }

  const scores: RecommendationScore[] = [];
  const favoriteKeys = new Set(favorites.map(s => `${s.artist}|${s.venue}|${s.time || ''}`));

  // Score all upcoming events
  for (const day of events) {
    for (const show of day.shows) {
      const showKey = `${show.artist}|${show.venue}|${show.time || ''}`;
      
      // Skip if already favorited
      if (favoriteKeys.has(showKey)) continue;

      const score: RecommendationScore = {
        show,
        score: 0,
        reasons: [],
      };

      // 1. Artist match (40% weight)
      const artistCount = profile.favoriteArtists[show.artist] || 0;
      if (artistCount > 0) {
        const artistScore = Math.min(artistCount * 20, 100); // Cap at 100
        score.score += artistScore * 0.4;
        score.reasons.push(`You've favorited ${show.artist} ${artistCount} time${artistCount > 1 ? 's' : ''}`);
      }

      // 2. Venue match (30% weight)
      const venueCount = profile.favoriteVenues[show.venue] || 0;
      if (venueCount > 0) {
        const venueScore = Math.min(venueCount * 15, 100);
        score.score += venueScore * 0.3;
        score.reasons.push(`You've been to ${show.venue} ${venueCount} time${venueCount > 1 ? 's' : ''}`);
      }

      // 3. Time preference (20% weight)
      const timeOfDay = extractTimeOfDay(show.time);
      if (timeOfDay) {
        const timeCount = profile.timePreferences[timeOfDay] || 0;
        const totalTimeInteractions = Object.values(profile.timePreferences).reduce((a, b) => a + b, 0);
        if (totalTimeInteractions > 0) {
          const timeScore = (timeCount / totalTimeInteractions) * 100;
          score.score += timeScore * 0.2;
          if (timeScore > 30) {
            score.reasons.push(`Matches your ${timeOfDay} preference`);
          }
        }
      }

      // 4. Recency boost (10% weight)
      // Events happening soon get a small boost
      const eventDate = new Date(day.date);
      const today = new Date();
      const daysUntil = Math.floor((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntil >= 0 && daysUntil <= 7) {
        score.score += (7 - daysUntil) * 2; // Up to 14 points
        if (daysUntil <= 3) {
          score.reasons.push('Happening soon');
        }
      }

      // Only include if score is above threshold
      if (score.score > 20) {
        scores.push(score);
      }
    }
  }

  // Sort by score and return top N
  return scores
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function isRecommended(show: Show, recommendations: RecommendationScore[]): boolean {
  return recommendations.some(rec => 
    rec.show.artist === show.artist && 
    rec.show.venue === show.venue &&
    rec.show.time === show.time
  );
}

export function getRecommendationReason(show: Show, recommendations: RecommendationScore[]): string[] {
  const rec = recommendations.find(r => 
    r.show.artist === show.artist && 
    r.show.venue === show.venue &&
    r.show.time === show.time
  );
  return rec?.reasons || [];
}
```

### Step 3: Recommendations Hook

```typescript
// src/hooks/useRecommendations.ts
import { useMemo, useEffect, useState } from 'react';
import { useEvents } from './useEvents';
import { useFavorites } from '../context/FavoritesContext';
import { getRecommendations, RecommendationScore } from '../utils/recommendationEngine';
import { updateUserProfile } from '../utils/userBehaviorTracker';

export function useRecommendations(limit: number = 10) {
  const { events } = useEvents();
  const { favorites } = useFavorites();
  const [recommendations, setRecommendations] = useState<RecommendationScore[]>([]);
  const [loading, setLoading] = useState(false);

  // Update user profile when favorites change
  useEffect(() => {
    if (favorites.length > 0) {
      updateUserProfile(favorites).catch(console.error);
    }
  }, [favorites.length]);

  // Calculate recommendations
  useEffect(() => {
    const calculateRecommendations = async () => {
      if (events.length === 0 || favorites.length < 3) {
        setRecommendations([]);
        return;
      }

      setLoading(true);
      try {
        const recs = await getRecommendations(events, favorites, limit);
        setRecommendations(recs);
      } catch (error) {
        console.error('Error calculating recommendations:', error);
        setRecommendations([]);
      } finally {
        setLoading(false);
      }
    };

    calculateRecommendations();
  }, [events, favorites, limit]);

  return { recommendations, loading };
}
```

### Step 4: UI Components

```typescript
// src/components/RecommendationsBadge.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface RecommendationsBadgeProps {
  reasons: string[];
}

export const RecommendationsBadge: React.FC<RecommendationsBadgeProps> = ({ reasons }) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  if (reasons.length === 0) return null;

  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>⭐ For You</Text>
    </View>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  badge: {
    backgroundColor: colors.pink,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  badgeText: {
    fontSize: 10,
    color: colors.white,
    fontWeight: '600',
  },
});
```

### Step 5: Integration into ShowCard

```typescript
// Update ShowCard.tsx to show recommendation badge
import { isRecommended, getRecommendationReason } from '../utils/recommendationEngine';

// In ShowCard component:
const { recommendations } = useRecommendations();
const isRec = isRecommended(show, recommendations);
const reasons = getRecommendationReason(show, recommendations);

// In render:
{isRec && <RecommendationsBadge reasons={reasons} />}
```

### Step 6: "For You" Section (Optional)

```typescript
// src/components/ForYouSection.tsx
import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { useRecommendations } from '../hooks/useRecommendations';
import { ShowCard } from './ShowCard';
import { useTheme } from '../context/ThemeContext';

export const ForYouSection: React.FC = () => {
  const { recommendations, loading } = useRecommendations(5);
  const { colors } = useTheme();
  const styles = createStyles(colors);

  if (loading || recommendations.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>⭐ Recommended For You</Text>
      <FlatList
        horizontal
        data={recommendations}
        renderItem={({ item }) => (
          <View style={styles.cardContainer}>
            <ShowCard show={item.show} />
          </View>
        )}
        keyExtractor={(item, index) => `rec-${index}`}
        showsHorizontalScrollIndicator={false}
      />
    </View>
  );
};
```

## Advanced Features (Future Enhancements)

1. **Machine Learning Integration**
   - Use TensorFlow.js for on-device ML
   - Train model on user behavior
   - Improve recommendations over time

2. **Social Recommendations**
   - "Friends who liked this also liked..."
   - Requires backend with user accounts

3. **Contextual Recommendations**
   - Weather-based (indoor vs outdoor)
   - Location-based (nearby venues)
   - Calendar integration (free time slots)

4. **A/B Testing**
   - Test different recommendation algorithms
   - Measure engagement metrics

5. **Explanation System**
   - "Because you favorited X, Y, Z"
   - Build user trust in recommendations

## Performance Considerations

1. **Caching**: Cache recommendations for 1 hour
2. **Debouncing**: Recalculate only when favorites change significantly
3. **Lazy Loading**: Only calculate when user views recommendations
4. **Background Processing**: Use Web Workers for heavy calculations

## Privacy

- All data stored locally (AsyncStorage)
- No user data sent to servers
- User can clear profile data
- Transparent about what data is used

## Testing Strategy

1. **Unit Tests**: Test scoring algorithm
2. **Integration Tests**: Test recommendation flow
3. **User Testing**: A/B test recommendation quality
4. **Performance Tests**: Ensure calculations are fast
