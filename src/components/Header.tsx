import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface HeaderProps {
  onFiltersPress: () => void;
  onRefreshPress: () => void;
  hasActiveFilters?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ 
  onFiltersPress, 
  onRefreshPress,
  hasActiveFilters = false,
}) => {
  const { colors, mode, setMode, isDark } = useTheme();
  const styles = createStyles(colors);

  const toggleTheme = () => {
    if (mode === 'light') {
      setMode('dark');
    } else if (mode === 'dark') {
      setMode('auto');
    } else {
      setMode('light');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>
          Showlist<Text style={styles.colon}>:</Text> Austin
        </Text>
        
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
        </View>
      </View>
      
      <View style={styles.border} />
    </View>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
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
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  colon: {
    color: colors.pink,
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
  filtersButton: {
    backgroundColor: colors.text,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minHeight: 44,
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
  border: {
    height: 4,
    backgroundColor: colors.border,
    marginTop: 12,
  },
});
