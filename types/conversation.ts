export type ConversationProvider = "chatgpt" | "claude" | "gemini" | "grok" | "perplexity" | "other";

export interface ConversationMessage {
  role: string;
  content: string;
}

/** LLM-derived insight about a conversation, added server-side on ingest. */
export interface ConversationInsights {
  summary: string;
  topics: string[];
  entities: string[];
}

/** A conversation captured by the PersonaMD browser extension, either pushed
 * directly to the local dev server or imported via a Capsule JSON file. */
export interface Conversation {
  id: string;
  provider: ConversationProvider;
  title: string;
  url?: string;
  /** When the extension captured it. */
  capturedAt: string;
  /** When it was imported into this browser's PersonaMD library. */
  importedAt: string;
  messages: ConversationMessage[];
  /** Present once server-side extraction has run; absent if no API key is configured. */
  insights?: ConversationInsights;
  /** True when the extension auto-captured this because the provider's own
   * usage/rate limit banner appeared on the page — a signal that this
   * conversation was cut short and is a candidate to continue elsewhere. */
  limitReached?: boolean;
}

/** The file format the extension's popup downloads and this app imports. */
export interface ConversationCapsule {
  version: number;
  exportedAt: string;
  conversations: Array<Omit<Conversation, "importedAt">>;
}
