import type { Conversation as CapturedConversation } from "@/types/conversation";
import type { Conversation as RecoveryConversation, Message, Platform, ProjectSummary } from "@/types/recovery";
import { buildConversation, type RawImport } from "@/lib/recovery/metadata-pipeline";

/** Maps the browser extension's provider ids onto this dashboard's Platform
 * enum. "other" has no dedicated platform here, so it falls back to PlainText. */
const PLATFORM_MAP: Record<string, Platform> = {
  chatgpt: "ChatGPT",
  claude: "Claude",
  gemini: "Gemini",
  grok: "Grok",
  perplexity: "Perplexity",
  other: "PlainText",
};

function toRecoveryRole(role: string): Message["role"] {
  if (role === "assistant" || role === "system") return role;
  return "user";
}

function capturedToRawImport(captured: CapturedConversation): RawImport {
  return {
    platform: PLATFORM_MAP[captured.provider] ?? "PlainText",
    title: captured.title,
    createdAt: captured.capturedAt,
    messages: captured.messages.map((m) => ({
      role: toRecoveryRole(m.role),
      content: m.content,
    })),
  };
}

/**
 * Runs a captured conversation (from the browser extension, via
 * /api/conversations) through the same local metadata pipeline used for
 * manually pasted imports — summary, keywords, topics, embedding, project
 * detection — so it shows up in the dashboard exactly like any other import.
 *
 * The captured conversation's own id is reused (instead of generating a new
 * one) so repeated syncs can dedupe against conversations already imported.
 */
export function buildConversationFromCaptured(
  captured: CapturedConversation,
  knownProjects: ProjectSummary[]
): RecoveryConversation {
  const built = buildConversation(capturedToRawImport(captured), knownProjects);
  return { ...built, id: captured.id };
}
