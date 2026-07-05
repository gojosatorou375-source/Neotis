"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Conversation, Platform, ProductivityStats } from "@/types/recovery";
import type { Conversation as CapturedConversation } from "@/types/conversation";
import { buildConversation } from "@/lib/recovery/metadata-pipeline";
import { buildConversationFromCaptured } from "@/lib/recovery/from-captured";
import { parseImport } from "@/lib/recovery/parsers";
import {
  computeProjects,
  findSimilarConversations,
  estimateHoursSaved,
  type RankedConversation,
} from "@/lib/recovery/derive";
import {
  deleteRecoveryConversation,
  emptyStats,
  fetchRecoveryConversations,
  fetchStats,
  insertRecoveryConversation,
  saveStats,
  updateRecoveryConversation,
} from "@/lib/recovery/storage";

export interface PendingImport {
  conversation: Conversation;
  duplicates: RankedConversation[];
}

export function useRecoveryStore() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [stats, setStats] = useState<ProductivityStats>(emptyStats());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    Promise.all([fetchRecoveryConversations(), fetchStats()])
      .then(([storedConversations, storedStats]) => {
        setConversations(storedConversations);
        setStats(storedStats);
        setSelectedId(storedConversations[0]?.id ?? null);
      })
      .catch((err) => console.error("Failed to load dashboard data:", err))
      .finally(() => setHydrated(true));
  }, []);

  const persistStats = useCallback((next: ProductivityStats) => {
    setStats(next);
    saveStats(next).catch((err) => console.error("Failed to save stats:", err));
  }, []);

  const projects = useMemo(() => computeProjects(conversations), [conversations]);

  const selected = useMemo(
    () => conversations.find((c) => c.id === selectedId) ?? null,
    [conversations, selectedId]
  );

  /** Step 1 of import: parse + run the metadata pipeline, then surface duplicates for user review. */
  const prepareImport = useCallback(
    (rawText: string, platform: Platform, titleHint?: string) => {
      const raw = parseImport(rawText, platform, titleHint);
      const conversation = buildConversation(raw, projects);
      const duplicates = findSimilarConversations(conversation, conversations);
      setPendingImport({ conversation, duplicates });
      return { conversation, duplicates };
    },
    [conversations, projects]
  );

  const cancelImport = useCallback(() => setPendingImport(null), []);

  /**
   * Step 2: finalize the import — either the brand-new conversation the user
   * confirmed despite similar matches, or (when there were no duplicates at
   * all) the conversation `prepareImport` just returned. Accepting an
   * explicit override avoids relying on `pendingImport` state that may not
   * have flushed yet if this is called immediately after `prepareImport`.
   */
  const commitImport = useCallback(
    (conversationOverride?: Conversation) => {
      const conversation = conversationOverride ?? pendingImport?.conversation;
      if (!conversation) return;
      setConversations((prev) => [...prev, conversation]);
      insertRecoveryConversation(conversation).catch((err) => console.error("Failed to save conversation:", err));
      setSelectedId(conversation.id);
      persistStats({ ...stats, recoveredConversations: stats.recoveredConversations + 1 });
      setPendingImport(null);
    },
    [pendingImport, persistStats, stats]
  );

  /** User chose to continue an existing conversation instead of creating a duplicate. */
  const continueExisting = useCallback(
    (existingId: string) => {
      setSelectedId(existingId);
      persistStats({
        ...stats,
        duplicateWorkPrevented: stats.duplicateWorkPrevented + 1,
        repeatedPromptsAvoided: stats.repeatedPromptsAvoided + 1,
        hoursSaved: estimateHoursSaved(stats.duplicateWorkPrevented + 1, stats.recoveredConversations),
      });
      setPendingImport(null);
    },
    [persistStats, stats]
  );

  /** Merge the new import's project into an existing conversation's project. */
  const mergeProjects = useCallback(
    (targetProject: string) => {
      if (!pendingImport) return;
      const merged: Conversation = { ...pendingImport.conversation, project: targetProject };
      setConversations((prev) => [...prev, merged]);
      insertRecoveryConversation(merged).catch((err) => console.error("Failed to save conversation:", err));
      setSelectedId(merged.id);
      persistStats({
        ...stats,
        projectsResumed: stats.projectsResumed + 1,
        recoveredConversations: stats.recoveredConversations + 1,
      });
      setPendingImport(null);
    },
    [pendingImport, persistStats, stats]
  );

  const renameConversation = useCallback(
    (id: string, title: string) => {
      setConversations((prev) => {
        const next = prev.map((c) => (c.id === id ? { ...c, title } : c));
        const updated = next.find((c) => c.id === id);
        if (updated) updateRecoveryConversation(updated).catch((err) => console.error("Failed to rename:", err));
        return next;
      });
    },
    []
  );

  const moveConversation = useCallback(
    (id: string, project: string) => {
      setConversations((prev) => {
        const next = prev.map((c) => (c.id === id ? { ...c, project } : c));
        const updated = next.find((c) => c.id === id);
        if (updated) updateRecoveryConversation(updated).catch((err) => console.error("Failed to move:", err));
        return next;
      });
    },
    []
  );

  const archiveConversation = useCallback((id: string) => {
    setConversations((prev) => {
      const next = prev.map((c) =>
        c.id === id ? { ...c, archived: !c.archived, status: c.archived ? c.status : "Archived" as const } : c
      );
      const updated = next.find((c) => c.id === id);
      if (updated) updateRecoveryConversation(updated).catch((err) => console.error("Failed to archive:", err));
      return next;
    });
  }, []);

  const deleteConversation = useCallback(
    (id: string) => {
      setConversations((prev) => {
        const next = prev.filter((c) => c.id !== id);
        if (selectedId === id) setSelectedId(next[0]?.id ?? null);
        return next;
      });
      deleteRecoveryConversation(id).catch((err) => console.error("Failed to delete conversation:", err));
    },
    [selectedId]
  );

  /**
   * Syncs conversations captured by the browser extension (via
   * /api/conversations) into this dashboard. Each one is run through the
   * same local metadata pipeline as a manual paste-import, and reuses the
   * captured conversation's own id so repeated calls (e.g. from a polling
   * hook) only import conversations not already present here.
   */
  const importCapturedConversations = useCallback(
    (captured: CapturedConversation[]) => {
      const existingIds = new Set(conversations.map((c) => c.id));
      const toImport = captured.filter((c) => !existingIds.has(c.id));
      if (toImport.length === 0) return;

      const built = toImport.map((c) => buildConversationFromCaptured(c, projects));
      setConversations((prev) => [...prev, ...built]);
      for (const conversation of built) {
        insertRecoveryConversation(conversation).catch((err) =>
          console.error("Failed to save captured conversation:", err)
        );
      }
      if (!selectedId) setSelectedId(built[0].id);
      persistStats({
        ...stats,
        recoveredConversations: stats.recoveredConversations + built.length,
      });
    },
    [conversations, projects, persistStats, stats, selectedId]
  );

  const updateStatus = useCallback((id: string, status: Conversation["status"]) => {
    setConversations((prev) => {
      const next = prev.map((c) => (c.id === id ? { ...c, status } : c));
      const updated = next.find((c) => c.id === id);
      if (updated) updateRecoveryConversation(updated).catch((err) => console.error("Failed to update status:", err));
      return next;
    });
  }, []);

  return {
    hydrated,
    conversations,
    projects,
    stats,
    selected,
    selectedId,
    setSelectedId,
    pendingImport,
    prepareImport,
    cancelImport,
    commitImport,
    continueExisting,
    mergeProjects,
    renameConversation,
    moveConversation,
    archiveConversation,
    deleteConversation,
    updateStatus,
    importCapturedConversations,
  };
}
