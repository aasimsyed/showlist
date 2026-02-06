import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useCity } from '../context/CityContext';
import { usePlacements } from '../hooks/usePlacements';
import { formatDistanceToNow } from 'date-fns';

interface FooterProps {
  lastUpdated?: Date | null;
}

export const Footer: React.FC<FooterProps> = ({ lastUpdated }) => {
  const { colors } = useTheme();
  const { city } = useCity();
  const { support, advertiseUrl, sponsors, loading } = usePlacements(city);

  const handleSubmitPress = async () => {
    const url = `https://${city}.showlists.net/submit/`;
    try {
      await Linking.openURL(url);
    } catch (err) {
      console.error('Error opening submit link:', err);
    }
  };

  const handleSupportPress = async () => {
    const url = support.patreonUrl || 'https://www.patreon.com/showlistaustin';
    try {
      await Linking.openURL(url);
    } catch (err) {
      console.error('Error opening support link:', err);
    }
  };

  const handleAdvertisePress = async () => {
    if (!advertiseUrl) return;
    try {
      await Linking.openURL(advertiseUrl);
    } catch (err) {
      console.error('Error opening advertise link:', err);
    }
  };

  const handleSponsorPress = (url: string) => async () => {
    try {
      await Linking.openURL(url);
    } catch (err) {
      console.error('Error opening sponsor link:', err);
    }
  };

  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      {support.copy && !loading && (
        <Text style={styles.supportCopy} numberOfLines={2}>
          {support.copy}
        </Text>
      )}

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

        {advertiseUrl && (
          <>
            <Text style={styles.separator} accessibilityRole="none"> | </Text>
            <TouchableOpacity
              onPress={handleAdvertisePress}
              style={styles.linkButton}
              accessibilityLabel="Advertise"
              accessibilityRole="link"
            >
              <Text style={styles.link}>Advertise</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {sponsors.length > 0 && (
        <View style={styles.sponsorsRow}>
          <Text style={styles.sponsorsLabel}>Partners: </Text>
          {sponsors.slice(0, 5).map((s, i) => (
            <TouchableOpacity
              key={`${s.url}-${i}`}
              onPress={handleSponsorPress(s.url)}
              style={styles.linkButton}
              accessibilityLabel={s.label}
              accessibilityRole="link"
            >
              <Text style={styles.link}>{s.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  supportCopy: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 4,
    maxWidth: '100%',
  },
  attribution: {
    fontSize: 12,
    color: colors.textSecondary,
    opacity: 0.8,
    marginBottom: 0,
  },
  lastUpdated: {
    fontSize: 12,
    color: colors.textSecondary,
    opacity: 0.7,
    marginBottom: 2,
  },
  links: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  linkButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    minHeight: 44,
    justifyContent: 'center',
  },
  link: {
    fontSize: 12,
    color: colors.text,
    textDecorationLine: 'underline',
    fontWeight: '500',
  },
  separator: {
    fontSize: 12,
    color: colors.text,
    opacity: 0.6,
  },
  sponsorsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  sponsorsLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginRight: 4,
  },
});
