import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useCity } from '../context/CityContext';
import { useCities } from '../hooks/useCities';

interface HeaderProps {
  onFiltersPress: () => void;
  onRefreshPress: () => void;
  onCityPress?: () => void;
  onToday?: () => void;
  hasActiveFilters?: boolean;
  showTodayButton?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onFiltersPress,
  onRefreshPress,
  onCityPress,
  onToday,
  hasActiveFilters = false,
  showTodayButton = true,
}) => {
  const { colors, typography, mode, setMode, isDark } = useTheme();
  const { city } = useCity();
  const { cities } = useCities();
  const cityLabel = cities.find((c) => c.id === city)?.label ?? city;
  const styles = createStyles(colors, typography);

  const toggleTheme = () => {
    if (mode === 'light') {
      setMode('dark');
    } else if (mode === 'dark') {
      setMode('auto');
    } else {
      setMode('light');
    }
  };

  const titleCity = onCityPress ? (
    <TouchableOpacity
      onPress={onCityPress}
      accessibilityLabel={`Change city. Current city: ${cityLabel}`}
      accessibilityRole="button"
      accessibilityHint="Double tap to choose a city"
      style={styles.cityTouchable}
    >
      <Text style={styles.title}>
        Showlist<Text style={styles.colon}>:</Text> <Text style={styles.cityName}>{cityLabel} ▼</Text>
      </Text>
    </TouchableOpacity>
  ) : (
    <Text style={styles.title}>
      Showlist<Text style={styles.colon}>:</Text> {cityLabel}
    </Text>
  );

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {titleCity}
        
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.themeButton}
            onPress={toggleTheme}
            accessibilityLabel={`Toggle theme. Current mode: ${mode === 'auto' ? 'automatic' : mode}`}
            accessibilityRole="button"
            accessibilityHint="Double tap to cycle between light, dark, and automatic theme modes"
          >
            <Text style={styles.themeIcon}>{isDark ? '☀️' : '🌙'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={onRefreshPress}
            accessibilityLabel="Refresh events"
            accessibilityRole="button"
            accessibilityHint="Double tap to refresh the event list with the latest data"
          >
            <Text style={styles.refreshIcon}>↻</Text>
          </TouchableOpacity>
        </View>
      </View>

      {(onFiltersPress || (showTodayButton && onToday)) && (
        <View style={styles.toolbar}>
          <TouchableOpacity
            style={[
              styles.filtersButton,
              hasActiveFilters && styles.filtersButtonActive,
            ]}
            onPress={onFiltersPress}
            accessibilityLabel={hasActiveFilters ? "Open filters. Filters are currently active" : "Open filters"}
            accessibilityRole="button"
            accessibilityHint="Double tap to open the filters menu"
            accessibilityState={{ selected: hasActiveFilters }}
          >
            <Text style={styles.filtersText}>
              Filters {hasActiveFilters ? '●' : '+'}
            </Text>
          </TouchableOpacity>
          {showTodayButton && onToday && (
            <TouchableOpacity
              style={styles.todayButton}
              onPress={onToday}
              accessibilityLabel="Jump to today"
              accessibilityRole="button"
              accessibilityHint="Double tap to jump to today's events"
            >
              <Text style={styles.todayButtonText}>Today</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <View style={styles.border} />
    </View>
  );
};

const createStyles = (colors: any, typography: any) => StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 12,
    paddingHorizontal: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4 },
      android: {
        elevation: 3,
      },
      default: {},
    }),
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: typography.titleSize,
    fontWeight: typography.titleWeight,
    color: colors.text,
  },
  colon: {
    color: colors.pink,
  },
  cityTouchable: {
    flexShrink: 0,
  },
  cityName: {
    textDecorationLine: 'underline',
    textDecorationColor: colors.text,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  themeButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  themeIcon: {
    fontSize: 20,
  },
  refreshButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  refreshIcon: {
    fontSize: 20,
    color: colors.text,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 10,
  },
  filtersButton: {
    backgroundColor: colors.text,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    minHeight: 40,
    justifyContent: 'center',
  },
  filtersButtonActive: {
    backgroundColor: colors.pink,
  },
  filtersText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  todayButton: {
    backgroundColor: colors.pink,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minHeight: 40,
    justifyContent: 'center',
  },
  todayButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  border: {
    height: 4,
    backgroundColor: colors.border,
    marginTop: 12,
  },
});
