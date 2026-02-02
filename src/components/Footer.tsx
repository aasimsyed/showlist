import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useCity } from '../context/CityContext';
import { formatDistanceToNow } from 'date-fns';

interface FooterProps {
  lastUpdated?: Date | null;
}

export const Footer: React.FC<FooterProps> = ({ lastUpdated }) => {
  const { colors } = useTheme();
  const { city } = useCity();

  const handleSubmitPress = async () => {
    const url = `https://${city}.showlists.net/submit/`;
    try {
      await Linking.openURL(url);
    } catch (err) {
      console.error('Error opening submit link:', err);
    }
  };

  const handleSupportPress = async () => {
    const url = 'https://www.patreon.com/showlistaustin';
    try {
      await Linking.openURL(url);
    } catch (err) {
      console.error('Error opening support link:', err);
    }
  };

  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      <Text style={styles.attribution}>
        Data sourced from {city}.showlists.net
      </Text>
      
      {lastUpdated && (
        <Text style={styles.lastUpdated}>
          Updated {formatDistanceToNow(lastUpdated, { addSuffix: true })}
        </Text>
      )}
      
      <View style={styles.links}>
        <TouchableOpacity
          onPress={handleSubmitPress}
          style={styles.linkButton}
          accessibilityLabel="Submit a show"
          accessibilityRole="link"
          accessibilityHint="Double tap to open the submit a show page in your browser"
        >
          <Text style={styles.link}>Submit A Show</Text>
        </TouchableOpacity>
        
        <Text style={styles.separator} accessibilityRole="none"> | </Text>
        
        <TouchableOpacity
          onPress={handleSupportPress}
          style={styles.linkButton}
          accessibilityLabel="Support us"
          accessibilityRole="link"
          accessibilityHint="Double tap to open the support page in your browser"
        >
          <Text style={styles.link}>Support Us</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    paddingVertical: 6, // Minimized to absolute minimum
    paddingHorizontal: 16,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  attribution: {
    fontSize: 12, // Reduced from 14px for more compact size
    color: colors.textSecondary,
    opacity: 0.8,
    marginBottom: 0,
  },
  lastUpdated: {
    fontSize: 12, // Reduced from 14px for more compact size
    color: colors.textSecondary,
    opacity: 0.7,
    marginBottom: 2, // Minimized margin
  },
  links: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2, // Small margin to separate from lastUpdated
  },
  linkButton: {
    paddingVertical: 4, // Minimized while maintaining 44px minimum
    paddingHorizontal: 8,
    minHeight: 44, // WCAG AA: Minimum touch target size
    justifyContent: 'center',
  },
  link: {
    fontSize: 12, // Reduced for more compact size
    color: colors.text,
    textDecorationLine: 'underline',
    fontWeight: '500',
  },
  separator: {
    fontSize: 12, // Reduced for more compact size
    color: colors.text,
    opacity: 0.6,
  },
});
