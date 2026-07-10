import { createSupabaseCollection } from "@/lib/data/supabase-collection";
import { getSupabase } from "@/lib/supabase/client";
import type { MemoryFact, FactType, FactPolarity } from "@/types/memory";

export interface MemoryFactRow {
  id: string;
  conversation_id: string;
  project_id: string | null;
  user_id: string | null;
  section: string;
  fact_type: string;
  polarity: string;
  content: string;
  confidence: number;
  reference_count: number;
  superseded_by: string | null;
  embedding: unknown;
  created_at: string;
  updated_at: string;
  last_confirmed_at: string;
}

export function fromRow(row: MemoryFactRow): MemoryFact {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    projectId: row.project_id,
    userId: row.user_id,
    section: row.section,
    factType: row.fact_type as FactType,
    polarity: row.polarity as FactPolarity,
    content: row.content,
    confidence: Number(row.confidence),
    referenceCount: row.reference_count,
    supersededBy: row.superseded_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastConfirmedAt: row.last_confirmed_at,
  };
}

export function toRow(fact: MemoryFact): MemoryFactRow {
  return {
    id: fact.id,
    conversation_id: fact.conversationId,
    project_id: fact.projectId ?? null,
    user_id: fact.userId ?? null,
    section: fact.section,
    fact_type: fact.factType,
    polarity: fact.polarity,
    content: fact.content,
    confidence: fact.confidence,
    reference_count: fact.referenceCount,
    superseded_by: fact.supersededBy ?? null,
    embedding: [],
    created_at: fact.createdAt,
    updated_at: fact.updatedAt,
    last_confirmed_at: fact.lastConfirmedAt,
  };
}

export const memoryFactsCollection = createSupabaseCollection<MemoryFact, MemoryFactRow>({
  table: "memory_facts",
  fromRow,
  toRow,
  getId: (fact) => fact.id,
  orderBy: { column: "created_at", ascending: false },
});

export async function fetchFactsForScope(scope: {
  projectId?: string;
  userId?: string;
  conversationId?: string;
}): Promise<MemoryFact[]> {
  const supabase = getSupabase();
  let query = supabase.from("memory_facts").select("*");

  if (scope.projectId) {
    query = query.eq("project_id", scope.projectId);
  } else if (scope.userId) {
    query = query.eq("user_id", scope.userId);
  } else if (scope.conversationId) {
    query = query.eq("conversation_id", scope.conversationId);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`Failed to fetch facts for scope: ${error.message}`);
  }
  return (data || []).map(fromRow);
}

export async function fetchActiveFacts(projectId: string | null): Promise<MemoryFact[]> {
  const supabase = getSupabase();
  let query = supabase.from("memory_facts").select("*").is("superseded_by", null);

  if (projectId) {
    query = query.eq("project_id", projectId);
  } else {
    query = query.is("project_id", null);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`Failed to fetch active facts: ${error.message}`);
  }
  return (data || []).map(fromRow);
}
