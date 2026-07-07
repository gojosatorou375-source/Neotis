/**
 * FEATURE 1 — AI Knowledge Extractor.
 *
 * A KnowledgeItem is one structured, categorized fact pulled out of a
 * conversation — never the raw conversation text itself. This is the base
 * unit the rest of the Universal Project Brain (Skill Generator, Decision
 * Engine, Timeline, Project Brain export) will eventually build on.
 */
export type KnowledgeCategory =
  | "feature"
  | "component"
  | "api"
  | "database_change"
  | "business_rule"
  | "architecture_decision"
  | "folder_structure"
  | "coding_standard"
  | "dependency"
  | "todo"
  | "bug"
  | "security_rule"
  | "deployment_note";

export const KNOWLEDGE_CATEGORIES: KnowledgeCategory[] = [
  "architecture_decision",
  "feature",
  "component",
  "api",
  "database_change",
  "security_rule",
  "business_rule",
  "coding_standard",
  "folder_structure",
  "dependency",
  "deployment_note",
  "bug",
  "todo",
];

export const KNOWLEDGE_CATEGORY_LABELS: Record<KnowledgeCategory, string> = {
  feature: "Feature",
  component: "Component",
  api: "API",
  database_change: "Database Change",
  business_rule: "Business Rule",
  architecture_decision: "Architecture Decision",
  folder_structure: "Folder Structure",
  coding_standard: "Coding Standard",
  dependency: "Dependency",
  todo: "TODO",
  bug: "Bug",
  security_rule: "Security Rule",
  deployment_note: "Deployment Note",
};

export interface KnowledgeItem {
  id: string;
  conversationId: string;
  conversationTitle: string;
  category: KnowledgeCategory;
  /** Short heading, derived from the source sentence. */
  title: string;
  /** The full normalized sentence this item was extracted from. */
  description: string;
  /** Heuristic confidence score, 0-1 — see extract-knowledge.ts. */
  confidence: number;
  /** Verbatim excerpt this item was extracted from, kept for traceability. */
  sourceExcerpt: string;
  createdAt: string;
  updatedAt: string;
}
