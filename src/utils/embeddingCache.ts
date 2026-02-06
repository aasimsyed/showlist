/**
 * In-memory cache for description embeddings (showKey -> vector).
 * TTL 7 days; max 300 entries; evicts oldest when full.
 */

import { showKey } from './twoTowerScoring';

const TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_ENTRIES = 300;

interface Entry {
  embedding: number[];
  ts: number;
}

const cache = new Map<string, Entry>();

function evictOldest(): void {
  if (cache.size < MAX_ENTRIES) return;
  let oldestKey: string | null = null;
  let oldestTs = Infinity;
  for (const [k, v] of cache) {
    if (v.ts < oldestTs) {
      oldestTs = v.ts;
      oldestKey = k;
    }
  }
  if (oldestKey != null) cache.delete(oldestKey);
}

export function getEmbedding(artist: string, venue: string): number[] | null {
  const k = showKey(artist, venue);
  const e = cache.get(k);
  if (!e || e.embedding.length === 0) return null;
  if (Date.now() - e.ts > TTL_MS) {
    cache.delete(k);
    return null;
  }
  return e.embedding;
}

export function setEmbedding(artist: string, venue: string, embedding: number[]): void {
  if (!embedding || embedding.length === 0) return;
  if (cache.size >= MAX_ENTRIES) evictOldest();
  cache.set(showKey(artist, venue), { embedding, ts: Date.now() });
}

export function getEmbeddingMap(keys: { artist: string; venue: string }[]): Map<string, number[]> {
  const out = new Map<string, number[]>();
  for (const { artist, venue } of keys) {
    const v = getEmbedding(artist, venue);
    if (v) out.set(showKey(artist, venue), v);
  }
  return out;
}

export function setEmbeddingMap(items: { artist: string; venue: string; embedding: number[] }[]): void {
  for (const it of items) {
    setEmbedding(it.artist, it.venue, it.embedding);
  }
}
