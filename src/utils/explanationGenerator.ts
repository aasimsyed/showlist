import { Show } from '../types';
import { UserProfile } from './userBehaviorTracker';

export interface RecommendationExplanation {
  explanation: string;
  reasons: string[];
  confidence: number;
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

export function generateExplanation(
  show: Show,
  profile: UserProfile,
  mlScore: number,
  eventDate?: string
): RecommendationExplanation {
  const reasons: string[] = [];
  let score = 0;
  const maxScore = 100;

  // 1. Artist match (40% weight)
  const artistCount = profile.favoriteArtists[show.artist] || 0;
  if (artistCount > 0) {
    const artistScore = Math.min(artistCount * 20, 40);
    score += artistScore;
    if (artistCount === 1) {
      reasons.push(`You've favorited ${show.artist} before`);
    } else {
      reasons.push(`You've favorited ${show.artist} ${artistCount} times`);
    }
  }

  // 2. Venue match (30% weight)
  const venueCount = profile.favoriteVenues[show.venue] || 0;
  if (venueCount > 0) {
    const venueScore = Math.min(venueCount * 15, 30);
    score += venueScore;
    if (venueCount === 1) {
      reasons.push(`You've been to ${show.venue} before`);
    } else {
      reasons.push(`You've been to ${show.venue} ${venueCount} times`);
    }
  }

  // 3. Time preference (20% weight)
  const timeOfDay = extractTimeOfDay(show.time);
  if (timeOfDay) {
    const timeCount = profile.timePreferences[timeOfDay] || 0;
    const totalTimeInteractions = Object.values(profile.timePreferences).reduce((a, b) => a + b, 0);
    if (totalTimeInteractions > 0) {
      const timePercentage = (timeCount / totalTimeInteractions) * 100;
      if (timePercentage > 30) {
        const timeScore = Math.min((timePercentage / 100) * 20, 20);
        score += timeScore;
        const timeLabels: Record<string, string> = {
          morning: 'morning',
          afternoon: 'afternoon',
          evening: 'evening',
          lateNight: 'late night',
        };
        reasons.push(`Matches your ${timeLabels[timeOfDay]} preference`);
      }
    }
  }

  // 4. ML Score boost (10% weight)
  if (mlScore > 0.5) {
    const mlBoost = (mlScore - 0.5) * 20; // Convert 0.5-1.0 to 0-10
    score += mlBoost;
    if (mlScore > 0.7) {
      reasons.push('Strong match based on your patterns');
    }
  }

  // 5. Recency boost (small bonus)
  if (eventDate) {
    try {
      const eventDateObj = new Date(eventDate);
      const today = new Date();
      const daysUntil = Math.floor((eventDateObj.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntil >= 0 && daysUntil <= 7) {
        const recencyBoost = Math.max(0, (7 - daysUntil) * 1);
        score += recencyBoost;
        if (daysUntil <= 3) {
          reasons.push('Happening soon');
        }
      }
    } catch (error) {
      // Invalid date
    }
  }

  // Generate explanation text
  let explanation = '';
  if (reasons.length === 0) {
    explanation = 'Similar to events you might enjoy';
  } else if (reasons.length === 1) {
    explanation = reasons[0];
  } else if (reasons.length === 2) {
    explanation = `${reasons[0]} and ${reasons[1]}`;
  } else {
    explanation = `${reasons[0]}, ${reasons[1]}, and ${reasons.length - 2} more reason${reasons.length - 2 > 1 ? 's' : ''}`;
  }

  // Calculate confidence (0-1)
  const confidence = Math.min(score / maxScore, 1.0);

  return {
    explanation,
    reasons,
    confidence,
  };
}
