export type FactType =
  | "decision"
  | "rule"
  | "architecture"
  | "feature"
  | "api"
  | "bug"
  | "requirement"
  | "constraint"
  | "todo"
  | "question_answer";

export type FactPolarity = "adopted" | "rejected" | "proposed" | "hypothetical";

export interface MemoryFact {
  id: string; // uuid
  conversationId: string; // text
  projectId?: string | null; // text references skills(id)
  userId?: string | null; // uuid references auth.users(id)
  section: string; // e.g. 'Infrastructure', 'Coding Style'
  factType: FactType;
  polarity: FactPolarity;
  content: string;
  confidence: number;
  referenceCount: number;
  supersededBy?: string | null; // uuid references memory_facts(id)
  createdAt: string;
  updatedAt: string;
  lastConfirmedAt: string;
}
