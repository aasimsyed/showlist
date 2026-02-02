import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { MIN_TOUCH_TARGET } from '../utils/constants';
import { useTheme } from '../context/ThemeContext';
import { formatShortDate } from '../utils/helpers';
import type { EventDay } from '../types';

interface DateNavigationProps {
  events: EventDay[];
  currentIndex: number;
  onPrevious: () => void;
  onNext: () => void;
  onDaySelect: (index: number) => void;
  canGoPrevious: boolean;
  canGoNext: boolean;
}

const PILL_WIDTH = 72;
const PILL_GAP = 8;

export const DateNavigation: React.FC<DateNavigationProps> = ({
  events,
  currentIndex,
  onPrevious,
  onNext,
  onDaySelect,
  canGoPrevious,
  canGoNext,
}) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const scrollRef = useRef<ScrollView>(null);
  const isProgrammaticScrollRef = useRef(false);

  useEffect(() => {
    if (events.length === 0) return;
    isProgrammaticScrollRef.current = true;
    const x = Math.max(0, currentIndex * (PILL_WIDTH + PILL_GAP) - PILL_WIDTH);
    scrollRef.current?.scrollTo({ x, animated: true });
  }, [currentIndex, events.length]);

  const handleScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (isProgrammaticScrollRef.current) {
      isProgrammaticScrollRef.current = false;
      return;
    }
    const offset = e.nativeEvent.contentOffset.x;
    const index = Math.round(offset / (PILL_WIDTH + PILL_GAP));
    const clamped = Math.max(0, Math.min(index, events.length - 1));
    if (clamped !== currentIndex) onDaySelect(clamped);
  };

  if (events.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.datePlaceholder}>No dates</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.arrowButton, !canGoPrevious && styles.arrowButtonDisabled]}
        onPress={onPrevious}
        disabled={!canGoPrevious}
        accessibilityLabel="Previous day"
        accessibilityRole="button"
        accessibilityHint={canGoPrevious ? "Double tap to view the previous day's events" : "No previous days available"}
        accessibilityState={{ disabled: !canGoPrevious }}
      >
        <Text style={[styles.arrow, !canGoPrevious && styles.arrowDisabled]}>‹</Text>
      </TouchableOpacity>

      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={styles.scroll}
        onMomentumScrollEnd={handleScrollEnd}
        onScrollEndDrag={handleScrollEnd}
        scrollEventThrottle={16}
        decelerationRate="fast"
        snapToInterval={PILL_WIDTH + PILL_GAP}
        snapToAlignment="start"
      >
        {events.map((day, index) => (
          <TouchableOpacity
            key={`${day.date}-${index}`}
            style={[styles.pill, index === currentIndex && styles.pillSelected]}
            onPress={() => onDaySelect(index)}
            accessibilityLabel={`${formatShortDate(day.date)}${index === currentIndex ? ', selected' : ''}`}
            accessibilityRole="button"
            accessibilityState={{ selected: index === currentIndex }}
          >
            <Text style={[styles.pillText, index === currentIndex && styles.pillTextSelected]} numberOfLines={1}>
              {formatShortDate(day.date)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <TouchableOpacity
        style={[styles.arrowButton, !canGoNext && styles.arrowButtonDisabled]}
        onPress={onNext}
        disabled={!canGoNext}
        accessibilityLabel="Next day"
        accessibilityRole="button"
        accessibilityHint={canGoNext ? "Double tap to view the next day's events" : "No more days available"}
        accessibilityState={{ disabled: !canGoNext }}
      >
        <Text style={[styles.arrow, !canGoNext && styles.arrowDisabled]}>›</Text>
      </TouchableOpacity>
    </View>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  arrowButton: {
    width: MIN_TOUCH_TARGET,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowButtonDisabled: {
    opacity: 0.4,
  },
  arrow: {
    fontSize: 28,
    color: colors.text,
    fontWeight: '300',
  },
  arrowDisabled: {
    color: colors.border,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: PILL_GAP,
    paddingHorizontal: 4,
  },
  pill: {
    width: PILL_WIDTH,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 10,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 36,
  },
  pillSelected: {
    backgroundColor: colors.pink,
    borderColor: colors.pink,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  pillTextSelected: {
    color: colors.white,
  },
  datePlaceholder: {
    flex: 1,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 8,
  },
});
