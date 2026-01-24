import AsyncStorage from '@react-native-async-storage/async-storage';
import { Show } from '../types';

const USER_PROFILE_KEY = 'user_profile';

export interface UserProfile {
  favoriteArtists: Record<string, number>;
  favoriteVenues: Record<string, number>;
  timePreferences: {
    morning: number;
    afternoon: number;
    evening: number;
    lateNight: number;
  };
  dayPreferences: Record<string, number>;
  totalInteractions: number;
  lastUpdated: string;
}

function extractTimeOfDay(time: string | null): 'morning' | 'afternoon' | 'evening' | 'lateNight' | null {
  if (!time) return null;
  try {
    const hour = parseInt(time.split(':')[0]);
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 22) return 'evening';
    if (hour >= 22 || hour < 2) return 'lateNight';
  } catch (error) {
    // Invalid time format
  }
  return null;
}

function getDayOfWeek(date: string): string {
  try {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { weekday: 'long' });
  } catch (error) {
    return 'Unknown';
  }
}

export async function updateUserProfile(favorites: Show[]): Promise<UserProfile> {
  const profile: UserProfile = {
    favoriteArtists: {},
    favoriteVenues: {},
    timePreferences: { morning: 0, afternoon: 0, evening: 0, lateNight: 0 },
    dayPreferences: {},
    totalInteractions: favorites.length,
    lastUpdated: new Date().toISOString(),
  };

  // Analyze favorites
  for (const show of favorites) {
    // Track artists
    profile.favoriteArtists[show.artist] = (profile.favoriteArtists[show.artist] || 0) + 1;
    
    // Track venues
    profile.favoriteVenues[show.venue] = (profile.favoriteVenues[show.venue] || 0) + 1;
    
    // Track time preferences
    const timeOfDay = extractTimeOfDay(show.time);
    if (timeOfDay) {
      profile.timePreferences[timeOfDay]++;
    }
  }

  // Save profile
  try {
    await AsyncStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profile));
  } catch (error) {
    console.error('Error saving user profile:', error);
  }
  
  return profile;
}

export async function getUserProfile(): Promise<UserProfile | null> {
  try {
    const stored = await AsyncStorage.getItem(USER_PROFILE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error('Error loading user profile:', error);
    return null;
  }
}

export async function clearUserProfile(): Promise<void> {
  try {
    await AsyncStorage.removeItem(USER_PROFILE_KEY);
  } catch (error) {
    console.error('Error clearing user profile:', error);
  }
}
