import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { EventDay, Show } from '../src/types/index.ts';
import type { UserProfile } from '../src/utils/userBehaviorTracker.ts';
import { scoreRecommendationsFromProfile } from '../src/utils/scoreRecommendationsFromProfile.ts';

function show(artist: string, venue: string, time: string | null = '20:00'): Show {
  return {
    artist,
    venue,
    address: '123 Main',
    eventLink: '',
    venueLink: '',
    mapLink: null,
    time,
  };
}

function profileFrom(favorites: Show[]): UserProfile {
  const p: UserProfile = {
    favoriteArtists: {},
    favoriteVenues: {},
    timePreferences: { morning: 0, afternoon: 0, evening: 0, lateNight: 0 },
    dayPreferences: {},
    totalInteractions: favorites.length,
    lastUpdated: new Date().toISOString(),
  };
  for (const s of favorites) {
    p.favoriteArtists[s.artist] = (p.favoriteArtists[s.artist] || 0) + 1;
    p.favoriteVenues[s.venue] = (p.favoriteVenues[s.venue] || 0) + 1;
  }
  p.timePreferences.evening = favorites.length;
  return p;
}

test('returns matching venue/artist shows from saved events without ranking the favorited show itself', () => {
  const favorite = show('Saved Band', 'Emo\'s');
  const sameVenue = show('Other Band', 'Emo\'s');
  const sameArtist = show('Saved Band', 'Stubb\'s');
  const unrelated = show('No Match', 'Unknown Bar', '09:00');
  const events: EventDay[] = [
    { date: 'Friday, August 21st 2026', shows: [favorite, sameVenue, sameArtist] },
    { date: 'Tuesday, December 1st 2026', shows: [unrelated] },
  ];
  const favorites = [favorite, show('A', 'X'), show('B', 'Y')];
  const recs = scoreRecommendationsFromProfile(events, favorites, profileFrom(favorites), 10);

  const keys = recs.map((r) => `${r.show.artist}|${r.show.venue}`);
  assert.ok(keys.includes('Other Band|Emo\'s'));
  assert.ok(keys.includes('Saved Band|Stubb\'s'));
  assert.ok(!keys.includes('Saved Band|Emo\'s'));
  assert.ok(!keys.includes('No Match|Unknown Bar'));
});

test('ranks a repeated venue above a one-off artist match on the same day', () => {
  const events: EventDay[] = [
    {
      date: 'Friday, August 21st 2026',
      shows: [show('New Act', 'Hotel Vegas'), show('Favorite Artist', 'Other Room')],
    },
  ];
  const favorites = [
    show('A', 'Hotel Vegas'),
    show('B', 'Hotel Vegas'),
    show('Favorite Artist', 'Somewhere Else'),
  ];
  const recs = scoreRecommendationsFromProfile(events, favorites, profileFrom(favorites), 10);
  assert.equal(recs[0].show.venue, 'Hotel Vegas');
  assert.ok(recs[0].score > recs[1].score);
});

test('sorts earlier dates first even when a later day has a higher score', () => {
  const events: EventDay[] = [
    { date: 'Sunday, August 23rd 2026', shows: [show('Later Band', 'Hotel Vegas')] },
    { date: 'Friday, August 21st 2026', shows: [show('Soon Band', 'Hotel Vegas')] },
  ];
  const favorites = [
    show('A', 'Hotel Vegas'),
    show('B', 'Hotel Vegas'),
    show('C', 'Hotel Vegas'),
  ];
  const recs = scoreRecommendationsFromProfile(events, favorites, profileFrom(favorites), 10);
  assert.equal(recs[0].show.artist, 'Soon Band');
  assert.equal(recs[1].show.artist, 'Later Band');
});

test('respects limit and is synchronous (returns immediately)', () => {
  const shows = Array.from({ length: 40 }, (_, i) => show(`Act ${i}`, 'Hotel Vegas'));
  const events: EventDay[] = [{ date: 'Friday, August 21st 2026', shows }];
  const favorites = [
    show('A', 'Hotel Vegas'),
    show('B', 'Hotel Vegas'),
    show('C', 'Hotel Vegas'),
  ];
  const started = Date.now();
  const recs = scoreRecommendationsFromProfile(events, favorites, profileFrom(favorites), 5);
  const elapsed = Date.now() - started;
  assert.equal(recs.length, 5);
  assert.ok(elapsed < 50, `expected local scoring in <50ms, took ${elapsed}ms`);
});
