import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useEventDetail } from '../context/EventDetailContext';
import { apiService } from '../services/api';
import { Show, EventDay } from '../types';

const MAX_SUGGESTIONS = 15;

function buildSuggestions(
  currentShow: Show,
  currentEventDate: string | null,
  events: EventDay[]
): { show: Show; eventDate: string }[] {
  const out: { show: Show; eventDate: string }[] = [];
  const key = (s: Show) => `${s.artist}|${s.venue}|${s.time ?? ''}`;
  const currentKey = key(currentShow);
  const currentDateStr = currentEventDate ?? '';

  const sameDay: { show: Show; eventDate: string }[] = [];
  const upcoming: { show: Show; eventDate: string }[] = [];

  for (const day of events) {
    for (const show of day.shows) {
      if (key(show) === currentKey) continue;
      const item = { show, eventDate: day.date };
      if (day.date === currentDateStr) sameDay.push(item);
      else upcoming.push(item);
    }
  }

  out.push(...sameDay, ...upcoming);
  return out.slice(0, MAX_SUGGESTIONS);
}

export const EventDetailModal: React.FC = () => {
  const { colors } = useTheme();
  const { show, eventDate, eventsForSuggestions, setSelected, clearSelected } = useEventDetail();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [fullDescription, setFullDescription] = useState('');
  const [artistDescription, setArtistDescription] = useState('');
  const [venueDescription, setVenueDescription] = useState('');

  const visible = show != null;

  useEffect(() => {
    if (!show) return;
    setLoading(true);
    setLoadError(false);
    setFullDescription('');
    setArtistDescription('');
    setVenueDescription('');
    apiService
      .fetchEventDescription(show.artist, show.venue)
      .then((res) => {
        if (res.description?.trim()) {
          setFullDescription(res.description.trim());
        } else if (res.artistDescription || res.venueDescription) {
          const parts = [res.artistDescription, res.venueDescription].filter(Boolean);
          setFullDescription(parts.join(' '));
        }
        setArtistDescription(res.artistDescription ?? '');
        setVenueDescription(res.venueDescription ?? '');
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, [show?.artist, show?.venue]);

  const suggestions = useMemo(() => {
    if (!show || !eventsForSuggestions.length) return [];
    return buildSuggestions(show, eventDate, eventsForSuggestions);
  }, [show, eventDate, eventsForSuggestions]);

  const styles = createStyles(colors);

  if (!show) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={clearSelected}
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={2}>
            {show.artist} at {show.venue}
          </Text>
          {eventDate && <Text style={styles.date}>{eventDate}</Text>}
          {show.time && <Text style={styles.time}>{show.time}</Text>}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={clearSelected}
            accessibilityLabel="Close"
            accessibilityRole="button"
          >
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.sectionTitle}>Event description</Text>
          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={colors.pink} />
              <Text style={styles.loadingText}>Loading event description…</Text>
            </View>
          ) : loadError ? (
            <Text style={styles.bodyMuted}>Description couldn't be loaded. Check your connection and try again.</Text>
          ) : fullDescription ? (
            <Text style={styles.body}>{fullDescription}</Text>
          ) : (
            <Text style={styles.bodyMuted}>No description available for this event.</Text>
          )}

          {(show.eventLink || show.mapLink) && (
            <View style={[styles.actions, { marginTop: 20 }]}>
              {show.eventLink && (
                <TouchableOpacity
                  style={styles.linkButton}
                  onPress={() => Linking.openURL(show.eventLink)}
                  accessibilityLabel="Open event link"
                  accessibilityRole="link"
                >
                  <Text style={styles.linkButtonText}>Event / tickets</Text>
                </TouchableOpacity>
              )}
              {show.mapLink && (
                <TouchableOpacity
                  style={styles.linkButton}
                  onPress={() => Linking.openURL(show.mapLink!)}
                  accessibilityLabel="Open map"
                  accessibilityRole="button"
                >
                  <Text style={styles.linkButtonText}>📍 Map</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {suggestions.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>More shows to check out</Text>
              {suggestions.map(({ show: sugShow, eventDate: sugDate }, index) => (
                <TouchableOpacity
                  key={`${sugShow.artist}-${sugShow.venue}-${index}`}
                  style={styles.suggestionRow}
                  onPress={() => setSelected(sugShow, sugDate, eventsForSuggestions)}
                  accessibilityLabel={`${sugShow.artist} at ${sugShow.venue}${sugShow.time ? ` ${sugShow.time}` : ''}`}
                  accessibilityRole="button"
                >
                  <Text style={styles.suggestionArtist} numberOfLines={1}>
                    {sugShow.artist}
                  </Text>
                  <Text style={styles.suggestionVenue} numberOfLines={1}>
                    at {sugShow.venue}
                    {sugShow.time ? ` · ${sugShow.time}` : ''}
                  </Text>
                  <Text style={styles.suggestionDate} numberOfLines={1}>
                    {sugDate}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    title: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 4,
    },
    date: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 2,
    },
    time: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 12,
    },
    closeButton: {
      alignSelf: 'flex-start',
      paddingVertical: 8,
      paddingHorizontal: 12,
      marginTop: 4,
    },
    closeText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.pink,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 32,
    },
    loadingBox: {
      paddingVertical: 32,
      alignItems: 'center',
    },
    loadingText: {
      marginTop: 12,
      fontSize: 14,
      color: colors.textSecondary,
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 8,
    },
    body: {
      fontSize: 15,
      lineHeight: 22,
      color: colors.text,
    },
    bodyMuted: {
      fontSize: 15,
      lineHeight: 22,
      color: colors.textSecondary,
      fontStyle: 'italic',
    },
    suggestionRow: {
      paddingVertical: 12,
      paddingHorizontal: 12,
      marginBottom: 8,
      backgroundColor: colors.cardBackground,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    suggestionArtist: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },
    suggestionVenue: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 2,
    },
    suggestionDate: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    actions: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 8,
    },
    linkButton: {
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: colors.pink,
      borderRadius: 10,
    },
    linkButtonText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.white,
    },
  });
