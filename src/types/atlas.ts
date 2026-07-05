/**
 * Atlas: the "universal memory" layer built on top of the Recovery Engine's
 * conversation store. Everything here is derived from or persisted
 * alongside `Conversation[]` — no separate backend, same local-first model.
 */

export interface Capsule {
  id: string;
  name: string;
  createdAt: string;
  /** Conversations this capsule was distilled from. */
  sourceConversationIds: string[];
  summary: string;
  decisions: string[];
  keyCode: CodeSnippet[];
  architectureNotes: string[];
  keyMessages: string[];
  references: string[];
}

export interface CodeSnippet {
  language: string;
  code: string;
  fromConversationTitle: string;
}

export type KnowledgeNodeType = "technology" | "project" | "concept" | "platform";

export interface KnowledgeNode {
  id: string;
  label: string;
  type: KnowledgeNodeType;
  /** How many conversations touch this node — drives visual weight. */
  weight: number;
  conversationIds: string[];
}

export interface KnowledgeEdge {
  source: string;
  target: string;
  weight: number;
}

export interface KnowledgeGraph {
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
}

export type TimelineBucketKey = "Today" | "Yesterday" | "This Week" | "This Month" | "Earlier";

export interface TimelineBucket {
  key: TimelineBucketKey;
  conversationIds: string[];
}
