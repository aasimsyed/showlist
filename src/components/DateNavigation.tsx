import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MIN_TOUCH_TARGET } from '../utils/constants';
import { useTheme } from '../context/ThemeContext';
import { getDayCounter } from '../utils/helpers';

interface DateNavigationProps {
  date: string;
  currentIndex: number;
  totalDays: number;
  onPrevious: () => void;
  onNext: () => void;
  onToday?: () => void;
  canGoPrevious: boolean;
  canGoNext: boolean;
  showTodayButton?: boolean;
}

export const DateNavigation: React.FC<DateNavigationProps> = ({
  date,
  currentIndex,
  totalDays,
  onPrevious,
  onNext,
  onToday,
  canGoPrevious,
  canGoNext,
  showTodayButton = true,
}) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

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
        <Text style={[styles.arrow, !canGoPrevious && styles.arrowDisabled]}>
          ‹
        </Text>
      </TouchableOpacity>
      
      <View style={styles.center}>
        <Text style={styles.date}>{date}</Text>
        <Text style={styles.counter}>
          {getDayCounter(currentIndex, totalDays)}
        </Text>
        {showTodayButton && onToday && (
          <TouchableOpacity
            style={styles.todayButton}
            onPress={onToday}
            accessibilityLabel="Jump to today"
            accessibilityRole="button"
            accessibilityHint="Double tap to jump to today's events"
            minHeight={44}
            minWidth={44}
          >
            <Text style={styles.todayButtonText}>Today</Text>
          </TouchableOpacity>
        )}
      </View>
      
      <TouchableOpacity
        style={[styles.arrowButton, !canGoNext && styles.arrowButtonDisabled]}
        onPress={onNext}
        disabled={!canGoNext}
        accessibilityLabel="Next day"
        accessibilityRole="button"
        accessibilityHint={canGoNext ? "Double tap to view the next day's events" : "No more days available"}
        accessibilityState={{ disabled: !canGoNext }}
      >
        <Text style={[styles.arrow, !canGoNext && styles.arrowDisabled]}>
          ›
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  arrowButton: {
    width: MIN_TOUCH_TARGET,
    height: MIN_TOUCH_TARGET,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowButtonDisabled: {
    opacity: 0.4, // Increased from 0.3 for better visibility while still indicating disabled state
  },
  arrow: {
    fontSize: 32,
    color: colors.text,
    fontWeight: '300',
  },
  arrowDisabled: {
    color: colors.border,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  date: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.pink,
    marginBottom: 4,
  },
  counter: {
    fontSize: 14, // Increased from 12px for better readability
    color: colors.textSecondary,
    opacity: 0.8, // Slightly increased opacity for better contrast
  },
  todayButton: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 10, // Increased for 44px minimum height
    borderRadius: 12,
    backgroundColor: colors.pink,
    minHeight: 44,
    minWidth: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  todayButtonText: {
    fontSize: 14, // Increased from 11px to meet minimum readable size (14px bold)
    color: colors.white,
    fontWeight: '600',
  },
});
