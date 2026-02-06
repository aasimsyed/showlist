/**
 * Two-tower scoring: user embedding (mean of favorite show embeddings) vs item embedding (description embedding).
 * Score = cosine similarity, normalized to 0–1 for blending with other signals.
 */

export function showKey(artist: string, venue: string): string {
  return `${(artist || '').trim()}|${(venue || '').trim()}`;
}

/** Mean of vectors (same length); returns zero vector if empty. */
export function meanVector(vectors: number[][]): number[] {
  if (!vectors.length) return [];
  const dim = vectors[0].length;
  const sum = new Array(dim).fill(0);
  let n = 0;
  for (const v of vectors) {
    if (v.length !== dim) continue;
    for (let i = 0; i < dim; i++) sum[i] += v[i];
    n++;
  }
  if (n === 0) return [];
  for (let i = 0; i < dim; i++) sum[i] /= n;
  return sum;
}

/** Cosine similarity in [-1, 1]. Returns 0 if either vector is empty or zero. */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (!a.length || !b.length || a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  if (denom <= 0) return 0;
  return dot / denom;
}

/** Map cosine from [-1,1] to [0,1] for blending. */
export function cosineToZeroOne(cos: number): number {
  return Math.max(0, (cos + 1) / 2);
}
