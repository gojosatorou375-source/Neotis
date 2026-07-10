"use client";

import { useCallback } from "react";
import { extractKnowledgeItems, mergeIncremental, type ExtractableMessage } from "@/lib/knowledge/extract-knowledge";
import { deleteKnowledgeItemsForConversation, knowledgeCollection } from "@/lib/knowledge/storage";
import { logOnError, useHydratedCollection } from "@/lib/data/use-hydrated-collection";

/**
 * FEATURE 1 -- AI Knowledge Extractor, wired to Supabase via the generic
 * collection factory. Mirrors the storage.ts + use-X.ts pattern used by
 * Personas and Skills, now sharing its hydrated/error/loading state and CRUD
 * plumbing with every other feature through lib/data.
 */
export function useKnowledge() {
  const {
    items,
    setItems,
    hydrated,
    error,
    reload,
  } = useHydratedCollection(knowledgeCollection);

  /**
   * Runs the extractor over a conversation's messages and incrementally
   * merges the result against whatever is already stored for that
   * conversation -- safe to call repeatedly (e.g. every time a conversation
   * is re-imported or updated) without creating duplicates.
   */
  const extractFromConversation = useCallback(
    (conversationId: string, conversationTitle: string, messages: ExtractableMessage[]) => {
      setItems((prev) => {
        const existingForConversation = prev.filter((i) => i.conversationId === conversationId);
        const otherItems = prev.filter((i) => i.conversationId !== conversationId);
        const fresh = extractKnowledgeItems(conversationId, conversationTitle, messages);
        const { items: merged, toInsert, toUpdate } = mergeIncremental(existingForConversation, fresh);

        if (toInsert.length > 0) {
          knowledgeCollection.insertMany(toInsert).catch(logOnError("Failed to save knowledge items"));
        }
        for (const item of toUpdate) {
          knowledgeCollection.update(item).catch(logOnError("Failed to update knowledge item"));
        }

        return [...otherItems, ...merged];
      });
    },
    [setItems]
  );

  const deleteItem = useCallback(
    (id: string) => {
      setItems((prev) => prev.filter((i) => i.id !== id));
      knowledgeCollection.remove(id).catch(logOnError("Failed to delete knowledge item"));
    },
    [setItems]
  );

  /** Cascades: called when the source conversation itself is deleted. */
  const clearForConversation = useCallback(
    (conversationId: string) => {
      setItems((prev) => prev.filter((i) => i.conversationId !== conversationId));
      deleteKnowledgeItemsForConversation(conversationId).catch(
        logOnError("Failed to clear knowledge items for conversation")
      );
    },
    [setItems]
  );

  /** Full wipe -- used by the Dashboard's "Reset all data" action. */
  const resetAll = useCallback(async () => {
    setItems([]);
    await knowledgeCollection.removeAll();
  }, [setItems]);

  return {
    hydrated,
    error,
    reload,
    items,
    extractFromConversation,
    deleteItem,
    clearForConversation,
    resetAll,
  };
}
