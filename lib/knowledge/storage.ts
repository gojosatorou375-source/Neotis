import { createSupabaseCollection } from "@/lib/data/supabase-collection";
import type { KnowledgeCategory, KnowledgeItem } from "@/types/knowledge";

// Backed by the `knowledge_items` table (see supabase/schema.sql). CRUD
// mechanics live in the generic collection factory -- this file only owns
// the row<->domain mapping plus the one knowledge-specific bulk delete
// (removeWhere on conversation_id, used for conversation cascade deletes).

interface KnowledgeItemRow {
  id: string;
  conversation_id: string;
  conversation_title: string;
  category: string;
  title: string;
  description: string;
  confidence: number;
  source_excerpt: string;
  created_at: string;
  updated_at: string;
}

function fromRow(row: KnowledgeItemRow): KnowledgeItem {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    conversationTitle: row.conversation_title,
    category: row.category as KnowledgeCategory,
    title: row.title,
    description: row.description,
    confidence: row.confidence,
    sourceExcerpt: row.source_excerpt,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toRow(item: KnowledgeItem): KnowledgeItemRow {
  return {
    id: item.id,
    conversation_id: item.conversationId,
    conversation_title: item.conversationTitle,
    category: item.category,
    title: item.title,
    description: item.description,
    confidence: item.confidence,
    source_excerpt: item.sourceExcerpt,
    created_at: item.createdAt,
    updated_at: item.updatedAt,
  };
}

export const knowledgeCollection = createSupabaseCollection<KnowledgeItem, KnowledgeItemRow>({
  table: "knowledge_items",
  fromRow,
  toRow,
  getId: (item) => item.id,
  orderBy: { column: "confidence", ascending: false },
});

/** Cascade delete: removes every knowledge item extracted from one conversation. */
export function deleteKnowledgeItemsForConversation(conversationId: string): Promise<void> {
  return knowledgeCollection.removeWhere("conversation_id", conversationId);
}
