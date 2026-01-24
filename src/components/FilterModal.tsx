import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FilterState, TimeOfDayFilter, DEFAULT_FILTERS } from '../types/filters';
import { useTheme } from '../context/ThemeContext';
import { getUniqueVenues } from '../utils/filterHelpers';
import { Show, EventDay } from '../types';

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  events: EventDay[];
  currentDayIndex: number;
}

export const FilterModal: React.FC<FilterModalProps> = ({
  visible,
  onClose,
  filters,
  onFiltersChange,
  events,
  currentDayIndex,
}) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [localFilters, setLocalFilters] = useState<FilterState>(filters);

  // Update local filters when props change
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const currentDay = events[currentDayIndex];
  const allShows = currentDay?.shows || [];
  const availableVenues = getUniqueVenues(allShows);

  const handleApply = () => {
    onFiltersChange(localFilters);
    onClose();
  };

  const handleReset = () => {
    setLocalFilters(DEFAULT_FILTERS);
  };

  const toggleVenue = (venue: string) => {
    setLocalFilters((prev) => {
      const isSelected = prev.selectedVenues.includes(venue);
      return {
        ...prev,
        selectedVenues: isSelected
          ? prev.selectedVenues.filter((v) => v !== venue)
          : [...prev.selectedVenues, venue],
      };
    });
  };

  const timeOfDayOptions: { value: TimeOfDayFilter; label: string }[] = [
    { value: 'all', label: 'All Times' },
    { value: 'morning', label: 'Morning (before 12pm)' },
    { value: 'afternoon', label: 'Afternoon (12pm - 5pm)' },
    { value: 'evening', label: 'Evening (5pm - 10pm)' },
    { value: 'late-night', label: 'Late Night (after 10pm)' },
    { value: 'with-time-only', label: 'Shows with Time Only' },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.title}>Filters</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity 
              onPress={handleReset} 
              style={styles.resetButton}
              accessibilityLabel="Reset filters"
              accessibilityRole="button"
              accessibilityHint="Double tap to reset all filters to default values"
            >
              <Text style={styles.resetButtonText}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={onClose} 
              style={styles.closeButton}
              accessibilityLabel="Close filters"
              accessibilityRole="button"
              accessibilityHint="Double tap to close the filters menu"
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Filter Presets */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Presets</Text>
            <TouchableOpacity
              style={styles.presetButton}
              onPress={() => {
                const tonight = new Date();
                tonight.setHours(17, 0, 0, 0); // 5pm
                const tomorrow = new Date(tonight);
                tomorrow.setDate(tomorrow.getDate() + 1);
                tomorrow.setHours(2, 0, 0, 0); // 2am next day
                
                setLocalFilters({
                  ...DEFAULT_FILTERS,
                  timeOfDay: 'evening',
                  excludeCanceled: true,
                  showsWithTimeOnly: false,
                });
              }}
              accessibilityLabel="Filter: Tonight only, 5pm to 10pm"
              accessibilityRole="button"
              accessibilityHint="Double tap to filter events for tonight between 5pm and 10pm"
            >
              <Text style={styles.presetButtonText}>Tonight Only (5pm-10pm)</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.presetButton}
              onPress={() => {
                setLocalFilters({
                  ...DEFAULT_FILTERS,
                  timeOfDay: 'all',
                  excludeCanceled: true,
                  showsWithTimeOnly: true,
                });
              }}
              accessibilityLabel="Filter: This weekend, shows with times only"
              accessibilityRole="button"
              accessibilityHint="Double tap to filter events for this weekend that have times listed"
            >
              <Text style={styles.presetButtonText}>This Weekend (with times)</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.presetButton}
              onPress={() => {
                setLocalFilters({
                  ...DEFAULT_FILTERS,
                  timeOfDay: 'late-night',
                  excludeCanceled: true,
                });
              }}
              accessibilityLabel="Filter: Late night, after 10pm"
              accessibilityRole="button"
              accessibilityHint="Double tap to filter events that start after 10pm"
            >
              <Text style={styles.presetButtonText}>Late Night (10pm+)</Text>
            </TouchableOpacity>
          </View>

          {/* Time of Day Filter */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Time of Day</Text>
            {timeOfDayOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.optionButton,
                  localFilters.timeOfDay === option.value && styles.optionButtonActive,
                ]}
                onPress={() =>
                  setLocalFilters((prev) => ({ ...prev, timeOfDay: option.value }))
                }
                accessibilityLabel={`Filter by ${option.label}`}
                accessibilityRole="button"
                accessibilityState={{ selected: localFilters.timeOfDay === option.value }}
                accessibilityHint={localFilters.timeOfDay === option.value ? "Selected. Double tap to deselect" : "Double tap to select this time filter"}
              >
                <Text
                  style={[
                    styles.optionText,
                    localFilters.timeOfDay === option.value && styles.optionTextActive,
                  ]}
                >
                  {option.label}
                </Text>
                {localFilters.timeOfDay === option.value && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Quick Filters */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Filters</Text>
            
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel} accessibilityRole="text">Exclude Canceled/Closed Shows</Text>
              <Switch
                value={localFilters.excludeCanceled}
                onValueChange={(value) =>
                  setLocalFilters((prev) => ({ ...prev, excludeCanceled: value }))
                }
                trackColor={{ false: colors.border, true: colors.pink }}
                thumbColor={colors.white}
                accessibilityLabel="Exclude canceled or closed shows"
                accessibilityRole="switch"
                accessibilityState={{ checked: localFilters.excludeCanceled }}
                accessibilityHint={localFilters.excludeCanceled ? "Enabled. Double tap to show canceled shows" : "Disabled. Double tap to hide canceled shows"}
              />
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel} accessibilityRole="text">Shows with Time Only</Text>
              <Switch
                value={localFilters.showsWithTimeOnly}
                onValueChange={(value) =>
                  setLocalFilters((prev) => ({ ...prev, showsWithTimeOnly: value }))
                }
                trackColor={{ false: colors.border, true: colors.pink }}
                thumbColor={colors.white}
                accessibilityLabel="Show only events with times listed"
                accessibilityRole="switch"
                accessibilityState={{ checked: localFilters.showsWithTimeOnly }}
                accessibilityHint={localFilters.showsWithTimeOnly ? "Enabled. Double tap to show all events" : "Disabled. Double tap to show only events with times"}
              />
            </View>
          </View>

          {/* Event Link Filter */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Event Links</Text>
            {[
              { value: null, label: 'All Events' },
              { value: true, label: 'Only Events with Ticket Links' },
              { value: false, label: 'Only Events without Links' },
            ].map((option) => (
              <TouchableOpacity
                key={String(option.value)}
                style={[
                  styles.optionButton,
                  localFilters.hasEventLink === option.value && styles.optionButtonActive,
                ]}
                onPress={() =>
                  setLocalFilters((prev) => ({ ...prev, hasEventLink: option.value }))
                }
                accessibilityLabel={`Filter: ${option.label}`}
                accessibilityRole="button"
                accessibilityState={{ selected: localFilters.hasEventLink === option.value }}
                accessibilityHint={localFilters.hasEventLink === option.value ? "Selected. Double tap to deselect" : "Double tap to select this filter"}
              >
                <Text
                  style={[
                    styles.optionText,
                    localFilters.hasEventLink === option.value && styles.optionTextActive,
                  ]}
                >
                  {option.label}
                </Text>
                {localFilters.hasEventLink === option.value && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Map Link Filter */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Map Links</Text>
            {[
              { value: null, label: 'All Events' },
              { value: true, label: 'Only Events with Map Links' },
              { value: false, label: 'Only Events without Maps' },
            ].map((option) => (
              <TouchableOpacity
                key={String(option.value)}
                style={[
                  styles.optionButton,
                  localFilters.hasMapLink === option.value && styles.optionButtonActive,
                ]}
                onPress={() =>
                  setLocalFilters((prev) => ({ ...prev, hasMapLink: option.value }))
                }
                accessibilityLabel={`Filter: ${option.label}`}
                accessibilityRole="button"
                accessibilityState={{ selected: localFilters.hasMapLink === option.value }}
                accessibilityHint={localFilters.hasMapLink === option.value ? "Selected. Double tap to deselect" : "Double tap to select this filter"}
              >
                <Text
                  style={[
                    styles.optionText,
                    localFilters.hasMapLink === option.value && styles.optionTextActive,
                  ]}
                >
                  {option.label}
                </Text>
                {localFilters.hasMapLink === option.value && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Venue Filter */}
          {availableVenues.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Venues ({availableVenues.length} available)
              </Text>
              <Text style={styles.sectionSubtitle}>
                Select specific venues to show
              </Text>
              <ScrollView
                style={styles.venueList}
                nestedScrollEnabled
                showsVerticalScrollIndicator={false}
              >
                {availableVenues.slice(0, 20).map((venue) => (
                  <TouchableOpacity
                    key={venue}
                    style={[
                      styles.venueButton,
                      localFilters.selectedVenues.includes(venue) &&
                        styles.venueButtonActive,
                    ]}
                    onPress={() => toggleVenue(venue)}
                    accessibilityLabel={`Venue: ${venue}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected: localFilters.selectedVenues.includes(venue) }}
                    accessibilityHint={localFilters.selectedVenues.includes(venue) ? "Selected. Double tap to deselect this venue" : "Double tap to select this venue"}
                    minHeight={44}
                  >
                    <Text
                      style={[
                        styles.venueText,
                        localFilters.selectedVenues.includes(venue) &&
                          styles.venueTextActive,
                      ]}
                    >
                      {venue}
                    </Text>
                    {localFilters.selectedVenues.includes(venue) && (
                      <Text style={styles.checkmark}>✓</Text>
                    )}
                  </TouchableOpacity>
                ))}
                {availableVenues.length > 20 && (
                  <Text style={styles.moreVenuesText}>
                    +{availableVenues.length - 20} more venues
                  </Text>
                )}
              </ScrollView>
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity 
            style={styles.applyButton} 
            onPress={handleApply}
            accessibilityLabel="Apply filters"
            accessibilityRole="button"
            accessibilityHint="Double tap to apply the selected filters and close this menu"
          >
            <Text style={styles.applyButtonText}>Apply Filters</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
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
  headerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  resetButton: {
    paddingHorizontal: 12,
    paddingVertical: 10, // Increased for 44px minimum height
    minHeight: 44,
    justifyContent: 'center',
  },
  resetButtonText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
  },
  closeButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    color: colors.text,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    opacity: 0.6,
    marginBottom: 12,
  },
  presetButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
    backgroundColor: colors.grayLight,
    borderWidth: 1,
    borderColor: colors.pink,
    minHeight: 44, // WCAG AA: Minimum touch target size
  },
  presetButtonText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
    textAlign: 'center',
  },
  optionButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
    backgroundColor: colors.grayLight,
    minHeight: 44, // WCAG AA: Minimum touch target size
  },
  optionButtonActive: {
    backgroundColor: colors.pink,
  },
  optionText: {
    fontSize: 16,
    color: colors.text,
  },
  optionTextActive: {
    color: colors.white,
    fontWeight: '600',
  },
  checkmark: {
    fontSize: 18,
    color: colors.white,
    fontWeight: 'bold',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 8,
  },
  switchLabel: {
    fontSize: 16,
    color: colors.text,
    flex: 1,
  },
  venueList: {
    maxHeight: 200,
  },
  venueButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12, // Increased for 44px minimum
    paddingHorizontal: 12,
    marginBottom: 6,
    borderRadius: 6,
    backgroundColor: colors.grayLight,
    minHeight: 44, // WCAG AA: Minimum touch target size
  },
  venueButtonActive: {
    backgroundColor: colors.pink,
  },
  venueText: {
    fontSize: 14,
    color: colors.text,
    flex: 1,
  },
  venueTextActive: {
    color: colors.white,
    fontWeight: '600',
  },
  moreVenuesText: {
    fontSize: 14, // Increased from 12px for better readability (WCAG AA)
    color: colors.textSecondary,
    opacity: 0.7, // Increased for better contrast (WCAG AA)
    textAlign: 'center',
    paddingVertical: 8,
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  applyButton: {
    backgroundColor: colors.pink,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.white,
  },
});
