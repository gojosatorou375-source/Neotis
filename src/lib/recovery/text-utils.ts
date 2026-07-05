/**
 * Small, dependency-free text utilities used across the recovery engine's
 * local metadata pipeline (no external NLP/API calls required).
 */

export const STOPWORDS = new Set([
  "a", "an", "the", "and", "or", "but", "if", "then", "so", "of", "to", "in",
  "on", "for", "with", "at", "by", "from", "up", "about", "into", "over",
  "after", "is", "are", "was", "were", "be", "been", "being", "it", "its",
  "this", "that", "these", "those", "i", "you", "he", "she", "we", "they",
  "me", "him", "her", "us", "them", "my", "your", "his", "their", "our",
  "as", "do", "does", "did", "not", "no", "yes", "can", "could", "should",
  "would", "will", "just", "also", "there", "here", "what", "which", "who",
  "how", "when", "where", "why", "have", "has", "had", "am", "please",
  "want", "need", "like", "get", "got", "make", "made", "one", "some",
  "any", "all", "more", "most", "very", "really",
]);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

export function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export function termFrequencies(tokens: string[]): Map<string, number> {
  const freq = new Map<string, number>();
  for (const token of tokens) {
    freq.set(token, (freq.get(token) ?? 0) + 1);
  }
  return freq;
}

/** Top N most frequent, non-trivial terms — used as keywords. */
export function topTerms(text: string, n = 8): string[] {
  const freq = termFrequencies(tokenize(text));
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([term]) => term);
}

/**
 * Extractive summary: scores sentences by how many high-frequency terms
 * they contain, then returns the top few in original order.
 */
export function extractiveSummary(text: string, maxSentences = 3): string {
  const sentences = splitSentences(text);
  if (sentences.length <= maxSentences) return sentences.join(" ");

  const freq = termFrequencies(tokenize(text));
  const scored = sentences.map((sentence, index) => {
    const tokens = tokenize(sentence);
    const score = tokens.reduce((sum, t) => sum + (freq.get(t) ?? 0), 0) / (tokens.length || 1);
    return { sentence, index, score };
  });

  const top = scored
    .sort((a, b) => b.score - a.score)
    .slice(0, maxSentences)
    .sort((a, b) => a.index - b.index);

  return top.map((s) => s.sentence).join(" ");
}

const TASK_MARKERS = [
  /\btodo\b/i,
  /\bto-do\b/i,
  /\bnext step/i,
  /\bstill need/i,
  /\bfollow[\s-]?up\b/i,
  /\bremaining\b/i,
  /\bnot (yet )?(done|finished|complete)/i,
  /\bneed(s)? to\b/i,
  /\bshould (still|also)\b/i,
  /\?\s*$/,
];

/** Heuristically pulls candidate open/pending tasks out of raw text. */
export function detectTasks(text: string): string[] {
  const sentences = splitSentences(text);
  const tasks = sentences.filter((s) => TASK_MARKERS.some((re) => re.test(s)));
  return dedupeStrings(tasks).slice(0, 6);
}

export function dedupeStrings(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const key = item.toLowerCase().trim();
    if (key.length === 0 || seen.has(key)) continue;
    seen.add(key);
    out.push(item.trim());
  }
  return out;
}
