import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking, Alert } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { Show } from '../types';
import { useTheme } from '../context/ThemeContext';
import { useCity } from '../context/CityContext';
import { useFavorites } from '../context/FavoritesContext';
import { shareEvent } from '../utils/shareHelpers';
import { addEventToCalendar } from '../utils/calendarHelpers';
import { parse } from 'date-fns';
import { useRecommendationsContext } from '../context/RecommendationsContext';
import { getRecommendationData } from '../utils/mlRecommendationEngine';
import { MLRecommendationBadge } from './MLRecommendationBadge';

interface ShowCardProps {
  show: Show;
  showFavoriteButton?: boolean;
  eventDate?: string; // Date string like "Saturday, January 24th 2026"
  accessibilityLabel?: string; // Optional custom accessibility label
  onShowPress?: (show: Show, eventDate?: string) => void; // Tap row to open event detail
}

export const ShowCard: React.FC<ShowCardProps> = ({ 
  show, 
  showFavoriteButton = true,
  eventDate,
  accessibilityLabel,
  onShowPress,
}) => {
  const { colors } = useTheme();
  const { city } = useCity();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { recommendations } = useRecommendationsContext();
  const favorited = isFavorite(show);
  const [showQuickActions, setShowQuickActions] = useState(false);
  
  // Check if this show is recommended
  const recommendationData = getRecommendationData(show, recommendations);

  const handleFavoritePress = (e?: any) => {
    // Stop event propagation to prevent outer TouchableOpacity from interfering
    if (e) {
      e.stopPropagation?.();
    }
    toggleFavorite(show);
  };

  const handleLongPress = () => {
    setShowQuickActions(true);
  };

  const handleShare = async () => {
    setShowQuickActions(false);
    await shareEvent(show, city);
  };

  const handleAddToCalendar = async () => {
    setShowQuickActions(false);
    if (eventDate) {
      try {
        const date = parse(eventDate, 'EEEE, MMMM do yyyy', new Date());
        await addEventToCalendar(show, date);
      } catch (error) {
        Alert.alert('Error', 'Could not parse event date');
      }
    } else {
      Alert.alert('Error', 'Event date not available');
    }
  };

  const handleQuickFavorite = () => {
    setShowQuickActions(false);
    toggleFavorite(show);
  };

  const handleArtistPress = async () => {
    if (show.eventLink) {
      try {
        const canOpen = await Linking.canOpenURL(show.eventLink);
        if (canOpen) {
          await Linking.openURL(show.eventLink);
        }
      } catch (error) {
        console.error('Error opening event link:', error);
      }
    }
  };

  const handleMapPress = async () => {
    if (show.mapLink) {
      try {
        const canOpen = await Linking.canOpenURL(show.mapLink);
        if (canOpen) {
          await Linking.openURL(show.mapLink);
        }
      } catch (error) {
        console.error('Error opening map link:', error);
      }
    } else if (show.venue) {
      // Fallback: open Google Maps search for venue
      const searchQuery = encodeURIComponent(`${show.venue} ${show.address}`);
      const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${searchQuery}`;
      try {
        await Linking.openURL(mapsUrl);
      } catch (error) {
        console.error('Error opening maps search:', error);
      }
    }
  };

  // Swipe up to favorite gesture
  // Only activate on clear upward swipe (at least 30px up)
  // Fail if there's significant horizontal or downward movement
  const swipeUpGesture = Gesture.Pan()
    .activeOffsetY([-50, -30]) // Require at least 30px upward movement to activate
    .failOffsetX([-15, 15]) // Fail if horizontal movement exceeds 15px
    .failOffsetY([5, 100]) // Fail if downward movement (prevents accidental activation on taps)
    .onEnd((event) => {
      // Only trigger if it's a clear upward swipe
      const { translationY, velocityY } = event;
      if (translationY < -30 && velocityY < -500 && !favorited) {
        runOnJS(toggleFavorite)(show);
      }
    });

  const styles = createStyles(colors);

  return (
    <GestureDetector gesture={swipeUpGesture}>
      <View style={styles.container}>
        <TouchableOpacity
          onLongPress={handleLongPress}
          onPress={() => onShowPress?.(show, eventDate)}
          activeOpacity={onShowPress ? 0.7 : 1}
          delayLongPress={500}
          accessibilityLabel={accessibilityLabel || `Event: ${show.artist} at ${show.venue}${show.time ? ` at ${show.time}` : ''}`}
          accessibilityRole="button"
          accessibilityHint={onShowPress ? "Double tap to view event details. Long press for quick actions." : "Long press to open quick actions menu. Tap artist name to open event link, tap map icon for directions, tap heart to favorite."}
        >
        <View style={styles.content}>
          <TouchableOpacity
            onPress={(e) => {
              e?.stopPropagation?.();
              handleArtistPress();
            }}
            disabled={!show.eventLink}
            style={styles.artistContainer}
            accessibilityLabel={`${show.artist} event${show.eventLink ? '' : '. No event link available'}`}
            accessibilityRole="link"
            accessibilityHint={show.eventLink ? "Double tap to open event details or tickets" : "Event link not available"}
            accessibilityState={{ disabled: !show.eventLink }}
          >
            <Text style={styles.artist}>{show.artist}</Text>
          </TouchableOpacity>
          
          <Text style={styles.text}> at </Text>
          
          <Text style={styles.venue}>{show.venue}</Text>
          
          <TouchableOpacity
            onPress={(e) => {
              e?.stopPropagation?.();
              handleMapPress();
            }}
            style={styles.mapIconContainer}
            accessibilityLabel={`Map to ${show.venue}`}
            accessibilityRole="button"
            accessibilityHint="Double tap to open map directions to this venue"
            minHeight={44}
            minWidth={44}
          >
            <Text style={styles.mapIcon}>📍</Text>
          </TouchableOpacity>
          
          {show.time && (
            <Text style={styles.time}> [{show.time}]</Text>
          )}
          
          {recommendationData && (
            <MLRecommendationBadge 
              explanation={recommendationData.explanation}
              compact={true}
            />
          )}
          
          {showFavoriteButton && (
          <TouchableOpacity
            onPress={(e) => {
              e?.stopPropagation?.();
              handleFavoritePress(e);
            }}
            style={styles.favoriteButton}
            accessibilityLabel={favorited ? 'Remove from favorites' : 'Add to favorites'}
            accessibilityRole="button"
            accessibilityHint={favorited ? 'Double tap to remove this event from your favorites' : 'Double tap to add this event to your favorites'}
          >
              <Text style={styles.favoriteIcon}>
                {favorited ? '❤️' : '🤍'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>

      {showQuickActions && (
        <View style={styles.quickActionsContainer}>
          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={handleQuickFavorite}
            accessibilityLabel={favorited ? 'Remove from favorites' : 'Add to favorites'}
            accessibilityRole="button"
            accessibilityHint={favorited ? 'Double tap to remove this event from your favorites' : 'Double tap to add this event to your favorites'}
          >
            <Text style={styles.quickActionIcon}>
              {favorited ? '❤️' : '🤍'}
            </Text>
            <Text style={styles.quickActionText}>
              {favorited ? 'Remove' : 'Favorite'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={handleAddToCalendar}
            accessibilityLabel="Add to calendar"
            accessibilityRole="button"
            accessibilityHint="Double tap to add this event to your device calendar"
          >
            <Text style={styles.quickActionIcon}>📅</Text>
            <Text style={styles.quickActionText}>Calendar</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={handleShare}
            accessibilityLabel="Share event"
            accessibilityRole="button"
            accessibilityHint="Double tap to share this event with others"
          >
            <Text style={styles.quickActionIcon}>📤</Text>
            <Text style={styles.quickActionText}>Share</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => setShowQuickActions(false)}
            accessibilityLabel="Close quick actions"
            accessibilityRole="button"
            accessibilityHint="Double tap to close the quick actions menu"
          >
            <Text style={styles.quickActionIcon}>✕</Text>
            <Text style={styles.quickActionText}>Close</Text>
          </TouchableOpacity>
        </View>
      )}
      </View>
    </GestureDetector>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.cardBackground,
  },
  content: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  artistContainer: {
    marginRight: 4,
  },
  artist: {
    fontSize: 16,
    color: colors.text,
    textDecorationLine: 'underline',
  },
  text: {
    fontSize: 16,
    color: colors.text,
  },
  venue: {
    fontSize: 16,
    color: colors.text,
    marginLeft: 4,
  },
  mapIconContainer: {
    marginLeft: 4,
    padding: 12, // Increased for 44x44px touch target (16px icon + 12px padding * 2 = 40px, but we'll ensure min 44)
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapIcon: {
    fontSize: 16,
  },
  time: {
    fontSize: 16,
    color: colors.text,
    marginLeft: 4,
  },
  favoriteButton: {
    marginLeft: 8,
    padding: 12, // Increased for 44x44px touch target (20px icon + 12px padding * 2 = 44px)
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  favoriteIcon: {
    fontSize: 20,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  quickActionButton: {
    alignItems: 'center',
    padding: 12, // Increased for 44x44px touch target
    minWidth: 60,
    minHeight: 44,
  },
  quickActionIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  quickActionText: {
    fontSize: 14, // Increased to meet minimum readable size (WCAG AA - 14px bold is acceptable)
    color: colors.text,
    fontWeight: '600',
  },
});
