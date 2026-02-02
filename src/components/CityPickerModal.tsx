import React from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { ShowlistCityId } from '../types';
import { useTheme } from '../context/ThemeContext';
import { useCity } from '../context/CityContext';
import { useCities } from '../hooks/useCities';

interface CityPickerModalProps {
  visible: boolean;
  onClose: () => void;
}

export const CityPickerModal: React.FC<CityPickerModalProps> = ({ visible, onClose }) => {
  const { colors } = useTheme();
  const { city: selectedCity, setCity } = useCity();
  const { cities } = useCities();
  const styles = createStyles(colors);

  const handleSelect = (id: ShowlistCityId) => {
    setCity(id);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      accessibilityLabel="Choose city"
    >
      <Pressable style={styles.overlay} onPress={onClose} accessibilityLabel="Close city picker">
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <SafeAreaView edges={['bottom']} style={styles.safe}>
            <View style={styles.header}>
              <Text style={styles.title}>City</Text>
              <TouchableOpacity
                onPress={onClose}
                style={styles.closeButton}
                accessibilityLabel="Close"
                accessibilityRole="button"
              >
                <Text style={styles.closeText}>Done</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.list}>
              {cities.map(({ id, label }) => (
                <TouchableOpacity
                  key={id}
                  style={[styles.option, id === selectedCity && styles.optionSelected]}
                  onPress={() => handleSelect(id)}
                  accessibilityLabel={`${label}${id === selectedCity ? ', selected' : ''}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: id === selectedCity }}
                >
                  <Text style={[styles.optionLabel, id === selectedCity && styles.optionLabelSelected]}>
                    {label}
                  </Text>
                  {id === selectedCity && <Text style={styles.check}>✓</Text>}
                </TouchableOpacity>
              ))}
            </View>
          </SafeAreaView>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const createStyles = (colors: Record<string, string>) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.4)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      minHeight: 200,
      ...Platform.select({
        ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.15, shadowRadius: 8 },
        android: { elevation: 8 },
        default: {},
      }),
    },
    safe: {
      paddingBottom: 24,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    title: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
    },
    closeButton: {
      paddingVertical: 8,
      paddingHorizontal: 12,
      minHeight: 44,
      justifyContent: 'center',
    },
    closeText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.pink,
    },
    list: {
      paddingHorizontal: 16,
      paddingTop: 8,
    },
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
      paddingHorizontal: 12,
      minHeight: 44,
      borderRadius: 8,
    },
    optionSelected: {
      backgroundColor: colors.cardBackground,
    },
    optionLabel: {
      fontSize: 17,
      color: colors.text,
    },
    optionLabelSelected: {
      fontWeight: '600',
      color: colors.pink,
    },
    check: {
      fontSize: 18,
      color: colors.pink,
      fontWeight: '700',
    },
  });
