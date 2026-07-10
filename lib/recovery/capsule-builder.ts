import type { Conversation } from "@/types/recovery";
import type { Capsule, CodeSnippet } from "@/types/atlas";
import { dedupeStrings, extractiveSummary } from "@/lib/recovery/text-utils";

const CODE_BLOCK_RE = /```(\w*)\n([\s\S]*?)```/g;
const ARCHITECTURE_MARKERS = [
  /\barchitecture\b/i,
  /\bdesign\b/i,
  /\bschema\b/i,
  /\bpattern\b/i,
  /\bstructure\b/i,
  /\bstack\b/i,
];

function extractCodeSnippets(conversation: Conversation): CodeSnippet[] {
  const snippets: CodeSnippet[] = [];
  for (const message of conversation.conversationHistory) {
    let match: RegExpExecArray | null;
    CODE_BLOCK_RE.lastIndex = 0;
    while ((match = CODE_BLOCK_RE.exec(message.content)) !== null) {
      const [, language, code] = match;
      if (code.trim().length === 0) continue;
      snippets.push({
        language: language || "text",
        code: code.trim(),
        fromConversationTitle: conversation.title,
      });
    }
  }
  return snippets;
}

function extractArchitectureNotes(conversation: Conversation): string[] {
  const candidates = [...conversation.decisions, conversation.summary];
  return candidates.filter((line) => ARCHITECTURE_MARKERS.some((re) => re.test(line)));
}

/**
 * Distills a set of conversations (possibly spanning multiple AI platforms)
 * into one portable Capsule: a summary, decisions, code, architecture notes,
 * key prompts, and references — everything needed to paste into a fresh
 * conversation on any LLM and pick up right where you left off.
 */
export function buildCapsule(
  name: string,
  conversationIds: string[],
  conversations: Conversation[]
): Capsule {
  const selected = conversations.filter((c) => conversationIds.includes(c.id));

  const combinedSummaryText = selected.map((c) => `${c.title}: ${c.summary}`).join(" ");
  const summary = selected.length > 0
    ? extractiveSummary(combinedSummaryText, Math.min(5, Math.max(2, selected.length)))
    : "No conversations selected.";

  const decisions = dedupeStrings(selected.flatMap((c) => c.decisions));
  const keyCode = selected.flatMap(extractCodeSnippets);
  const architectureNotes = dedupeStrings(selected.flatMap(extractArchitectureNotes));
  const keyMessages = dedupeStrings(selected.flatMap((c) => c.prompts)).slice(0, 10);
  const references = dedupeStrings(selected.flatMap((c) => c.files));

  return {
    id: crypto.randomUUID(),
    name: name.trim() || "Untitled capsule",
    createdAt: new Date().toISOString(),
    sourceConversationIds: conversationIds,
    summary,
    decisions,
    keyCode,
    architectureNotes,
    keyMessages,
    references,
  };
}
