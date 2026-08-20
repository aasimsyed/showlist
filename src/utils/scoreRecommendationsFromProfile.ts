import { Show, EventDay } from '../types';
import type { UserProfile } from './userBehaviorTracker';
import { generateExplanation, RecommendationExplanation } from './explanationGenerator';
import { parseEventDateToTimestamp } from './helpers';

export interface ScoredRecommendation {
  show: Show;
  score: number;
  mlScore: number;
  explanation: RecommendationExplanation;
  eventDate?: string;
}

function showIdentity(show: Show): string {
  return `${show.artist}|${show.venue}|${show.time || ''}`;
}

/**
 * Rank upcoming shows from the local favorites profile only (artist, venue, time).
 * No network, embeddings, or TensorFlow: For You should return as soon as saved events exist.
 */
export function scoreRecommendationsFromProfile(
  events: EventDay[],
  favorites: Show[],
  profile: UserProfile,
  limit: number = 10
): ScoredRecommendation[] {
  const favoriteKeys = new Set(favorites.map(showIdentity));
  const scores: ScoredRecommendation[] = [];

  for (const day of events) {
    for (const show of day.shows) {
      if (favoriteKeys.has(showIdentity(show))) continue;

      const explanation = generateExplanation(show, profile, 0, day.date);
      const artistCount = profile.favoriteArtists[show.artist] || 0;
      const venueCount = profile.favoriteVenues[show.venue] || 0;
      const score = Math.min(artistCount * 20, 40) + Math.min(venueCount * 15, 30);

      if (score > 20 || explanation.reasons.length > 0) {
        scores.push({
          show,
          score,
          mlScore: 0,
          explanation,
          eventDate: day.date,
        });
      }
    }
  }

  return scores
    .sort((a, b) => {
      const tA = parseEventDateToTimestamp(a.eventDate || '');
      const tB = parseEventDateToTimestamp(b.eventDate || '');
      if (tA !== tB) return tA - tB;
      return b.score - a.score;
    })
    .slice(0, limit);
}
