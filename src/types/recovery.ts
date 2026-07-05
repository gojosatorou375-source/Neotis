export type Platform =
  | "ChatGPT"
  | "Claude"
  | "Gemini"
  | "Grok"
  | "DeepSeek"
  | "Perplexity"
  | "Llama"
  | "Cursor"
  | "Windsurf"
  | "Markdown"
  | "JSON"
  | "PlainText";

export const PLATFORMS: Platform[] = [
  "ChatGPT",
  "Claude",
  "Gemini",
  "Grok",
  "DeepSeek",
  "Perplexity",
  "Llama",
  "Cursor",
  "Windsurf",
  "Markdown",
  "JSON",
  "PlainText",
];

export type ConversationStatus = "Completed" | "In Progress" | "Pending" | "Archived";

export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface SimilarityLink {
  conversationId: string;
  score: number; // 0-1
}

export interface Conversation {
  id: string;
  platform: Platform;
  title: string;
  createdAt: string; // ISO datetime
  lastUpdated: string; // ISO datetime
  project: string;
  status: ConversationStatus;
  summary: string;
  keywords: string[];
  topics: string[];
  embedding: number[];
  files: string[];
  prompts: string[];
  outputs: string[];
  followUpTasks: string[];
  decisions: string[];
  tags: string[];
  similarityLinks: SimilarityLink[];
  conversationHistory: Message[];
  archived: boolean;
}

export interface ProjectSummary {
  name: string;
  conversationIds: string[];
  providers: Platform[];
  createdAt: string;
  lastActivity: string;
  completedTasks: number;
  totalTasks: number;
}

export interface ProductivityStats {
  recoveredConversations: number;
  duplicateWorkPrevented: number;
  projectsResumed: number;
  hoursSaved: number;
  repeatedPromptsAvoided: number;
}

/** Minimum cosine similarity to surface a "similar conversation" match. */
export const SIMILARITY_THRESHOLD = 0.42;
