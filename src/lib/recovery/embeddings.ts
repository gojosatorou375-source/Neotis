import { tokenize } from "@/lib/recovery/text-utils";

/**
 * PersonaMD runs fully local-first: there is no server, API key, or vector
 * database in this build. Instead of calling an embeddings API, we build a
 * fixed-length pseudo-embedding using the "hashing trick" (feature hashing)
 * over term frequencies. It behaves like a lightweight bag-of-words vector:
 * documents that share vocabulary land close together under cosine
 * similarity, which is enough to power "find similar / forgotten
 * conversation" style search without any network dependency.
 *
 * Swap-in path for real semantic search later: replace `embedText` with a
 * call to an embeddings endpoint (OpenAI, Voyage, Cohere, etc.) and keep the
 * rest of the pipeline (storage, cosine similarity, ranking) unchanged.
 */

export const EMBEDDING_DIMENSIONS = 256;

function hashToken(token: string, dimensions: number): number {
  let hash = 2166136261;
  for (let i = 0; i < token.length; i++) {
    hash ^= token.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash) % dimensions;
}

export function embedText(text: string, dimensions = EMBEDDING_DIMENSIONS): number[] {
  const vector = new Array(dimensions).fill(0);
  const tokens = tokenize(text);
  if (tokens.length === 0) return vector;

  for (const token of tokens) {
    const bucket = hashToken(token, dimensions);
    // Sign hashing reduces collision bias.
    const sign = hashToken(token + "#sign", 2) === 0 ? 1 : -1;
    vector[bucket] += sign;
  }

  return l2Normalize(vector);
}

function l2Normalize(vector: number[]): number[] {
  const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
  if (magnitude === 0) return vector;
  return vector.map((v) => v / magnitude);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
  }
  // Vectors are already L2-normalized, so dot product == cosine similarity.
  // Clamp for floating point safety.
  return Math.max(-1, Math.min(1, dot));
}
