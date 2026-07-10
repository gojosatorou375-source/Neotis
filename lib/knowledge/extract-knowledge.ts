import type { KnowledgeCategory, KnowledgeItem } from "@/types/knowledge";

/**
 * FEATURE 1 — AI Knowledge Extractor engine.
 *
 * Turns raw conversation messages into structured KnowledgeItems, entirely
 * locally and deterministically (no external LLM call — consistent with the
 * rest of PersonaMD's local metadata pipeline in lib/recovery). Confidence
 * scores are heuristic, not probabilistic, and are intended to be tuned over
 * time or eventually replaced by a real model without changing the shape of
 * the output.
 *
 * Deliberately self-contained (no imports from lib/recovery/text-utils) so
 * this module can run standalone under `node --experimental-strip-types`
 * for its test suite without needing path-alias resolution at runtime.
 */

export interface ExtractableMessage {
  role: string;
  content: string;
}

function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 12);
}

function normalizeTitle(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 72);
}

function titleFromSentence(sentence: string): string {
  const trimmed = sentence.trim().replace(/\s+/g, " ");
  return trimmed.length > 90 ? `${trimmed.slice(0, 90).trim()}…` : trimmed;
}

interface CategoryMatcher {
  category: KnowledgeCategory;
  patterns: RegExp[];
  baseConfidence: number;
}

/**
 * Ordered most-specific-first — a sentence is assigned to the first category
 * whose pattern matches, so narrower/rarer signals (security, database,
 * API) take priority over broad ones (feature, component).
 */
const CATEGORY_MATCHERS: CategoryMatcher[] = [
  {
    category: "security_rule",
    baseConfidence: 0.68,
    patterns: [
      /\b(auth(entication|orization)?|security|access[\s-]?key|row[\s-]level security|\brls\b|encrypt(ion)?|password|api[\s-]?key|token|vulnerab\w*|permission)\b/i,
    ],
  },
  {
    category: "database_change",
    baseConfidence: 0.68,
    patterns: [
      /\b(table|schema|migration|column|postgres\w*|supabase|database|sql (query|statement)|foreign key|row level security)\b/i,
    ],
  },
  {
    category: "api",
    baseConfidence: 0.65,
    patterns: [
      /\b(endpoint|api route|\/api\/\w+|rest api|graphql|http (get|post|put|delete|patch)\b|webhook)\b/i,
    ],
  },
  {
    category: "deployment_note",
    baseConfidence: 0.62,
    patterns: [
      /\b(deploy(ed|ment)?|vercel|ci\/cd|hosting|env(ironment)? var(iable)?s?|production build|redeploy)\b/i,
    ],
  },
  {
    category: "dependency",
    baseConfidence: 0.6,
    patterns: [
      /\b(npm install|yarn add|pip install|package\.json|added? (a |the |new )?(package|library|dependency))\b/i,
    ],
  },
  {
    // Checked before "bug" -- an explicit TODO marker is a more unambiguous
    // signal than an incidental word like "crash" appearing in the same
    // sentence (e.g. "TODO: fix the crash" is a todo, not just a bug report).
    category: "todo",
    baseConfidence: 0.5,
    patterns: [
      /\btodo\b|\bto-do\b|\bnext step|\bstill need|\bfollow[\s-]?up|\bremaining\b|\bnot (yet )?(done|finished|complete)/i,
    ],
  },
  {
    category: "bug",
    baseConfidence: 0.55,
    patterns: [
      /\b(bug|error|crash(ed|es)?|broken|doesn'?t work|not working|fail(ed|ing)?|exception)\b/i,
    ],
  },
  {
    category: "architecture_decision",
    baseConfidence: 0.6,
    patterns: [
      /\b(decided to|instead of|we (chose|went with)|architecture|redesigned|switched from|design decision)\b/i,
    ],
  },
  {
    category: "coding_standard",
    baseConfidence: 0.55,
    patterns: [
      /\b(convention|style guide|naming convention|lint rule|coding standard|best practice)\b/i,
    ],
  },
  {
    category: "folder_structure",
    baseConfidence: 0.55,
    patterns: [
      /\b(folder structure|directory structure|src\/\w+|file organization|organized the files)\b/i,
    ],
  },
  {
    category: "business_rule",
    baseConfidence: 0.55,
    patterns: [
      /\b(business rule|must always|should never|policy|constraint|non-negotiable|validation rule)\b/i,
    ],
  },
  {
    category: "component",
    baseConfidence: 0.45,
    patterns: [/\b(component|button|card|dialog|modal|panel|widget)\b/i],
  },
  {
    category: "feature",
    baseConfidence: 0.45,
    patterns: [
      /\b(add(ed)? (a |the |new )?feature|implement(ed|ing)?|built (a|the)|new (page|tab|button|screen)|now supports)\b/i,
    ],
  },
];

const CODE_HINT = /`[^`]+`|\.[jt]sx?\b|\bfunction\b|\bconst\b|\bimport\b/;

function classifySentence(
  sentence: string,
  role: string
): { category: KnowledgeCategory; confidence: number } | null {
  for (const matcher of CATEGORY_MATCHERS) {
    if (matcher.patterns.some((re) => re.test(sentence))) {
      let confidence = matcher.baseConfidence;
      if (role === "assistant") confidence += 0.1;
      if (CODE_HINT.test(sentence)) confidence += 0.05;
      return { category: matcher.category, confidence: Math.min(0.95, confidence) };
    }
  }
  return null;
}

/** Per-category cap so one long conversation can't flood a single category. */
const MAX_PER_CATEGORY = 12;

/**
 * Extracts structured KnowledgeItems from a conversation's messages. Pure
 * function -- does not read or write storage.
 */
export function extractKnowledgeItems(
  conversationId: string,
  conversationTitle: string,
  messages: ExtractableMessage[]
): KnowledgeItem[] {
  const now = new Date().toISOString();
  const seen = new Map<string, KnowledgeItem>(); // key: category|normalizedTitle

  for (const message of messages) {
    const sentences = splitSentences(message.content ?? "");
    for (const sentence of sentences) {
      const classified = classifySentence(sentence, message.role);
      if (!classified) continue;

      const key = `${classified.category}|${normalizeTitle(sentence)}`;
      const existing = seen.get(key);
      if (existing && existing.confidence >= classified.confidence) continue;

      seen.set(key, {
        id: crypto.randomUUID(),
        conversationId,
        conversationTitle,
        category: classified.category,
        title: titleFromSentence(sentence),
        description: sentence.trim(),
        confidence: classified.confidence,
        sourceExcerpt: sentence.trim(),
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  const byCategory = new Map<KnowledgeCategory, KnowledgeItem[]>();
  for (const item of seen.values()) {
    const list = byCategory.get(item.category) ?? [];
    list.push(item);
    byCategory.set(item.category, list);
  }

  const result: KnowledgeItem[] = [];
  for (const list of byCategory.values()) {
    result.push(...list.sort((a, b) => b.confidence - a.confidence).slice(0, MAX_PER_CATEGORY));
  }

  return result.sort((a, b) => b.confidence - a.confidence);
}

export interface MergeResult {
  /** Full, deduped set of items for this conversation after merging. */
  items: KnowledgeItem[];
  /** Items that are brand new and need to be inserted into storage. */
  toInsert: KnowledgeItem[];
  /** Previously-stored items whose confidence/description changed and need updating. */
  toUpdate: KnowledgeItem[];
}

/**
 * Incremental update: merges freshly extracted items for one conversation
 * against what's already stored for that same conversation, so re-running
 * extraction after new messages arrive doesn't create duplicates -- it only
 * adds genuinely new knowledge and strengthens existing items whose
 * confidence improved.
 */
export function mergeIncremental(
  existingForConversation: KnowledgeItem[],
  freshlyExtracted: KnowledgeItem[]
): MergeResult {
  const existingByKey = new Map<string, KnowledgeItem>();
  for (const item of existingForConversation) {
    existingByKey.set(`${item.category}|${normalizeTitle(item.title)}`, item);
  }

  const toInsert: KnowledgeItem[] = [];
  const toUpdate: KnowledgeItem[] = [];
  const finalByKey = new Map<string, KnowledgeItem>();

  for (const fresh of freshlyExtracted) {
    const key = `${fresh.category}|${normalizeTitle(fresh.title)}`;
    const existing = existingByKey.get(key);
    if (!existing) {
      toInsert.push(fresh);
      finalByKey.set(key, fresh);
      continue;
    }
    if (fresh.confidence > existing.confidence) {
      const updated: KnowledgeItem = {
        ...existing,
        description: fresh.description,
        sourceExcerpt: fresh.sourceExcerpt,
        confidence: fresh.confidence,
        updatedAt: new Date().toISOString(),
      };
      toUpdate.push(updated);
      finalByKey.set(key, updated);
    } else {
      finalByKey.set(key, existing);
    }
  }

  // Anything stored previously that the fresh extraction no longer produced
  // (e.g. the conversation was edited) is still kept -- extraction is
  // additive/strengthening, never silently destructive.
  for (const [key, existing] of existingByKey) {
    if (!finalByKey.has(key)) finalByKey.set(key, existing);
  }

  return { items: Array.from(finalByKey.values()), toInsert, toUpdate };
}
