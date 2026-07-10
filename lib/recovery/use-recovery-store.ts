"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  deleteAllRecoveryConversations,
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

  /**
   * Every feature in this app (Timeline, Knowledge Graph, Capsules, the
   * productivity stats) is derived from `conversations` — there is no
   * independent source of truth for any of them. Deleting a conversation
   * here must therefore "downgrade" every dependent view in the same tick:
   * remove it from state (so derived views recompute immediately), delete
   * its row server-side, and pull its contribution back out of the stats
   * counters so they never overstate what's actually left.
   */
  const deleteConversation = useCallback(
    (id: string) => {
      setConversations((prev) => {
        const next = prev.filter((c) => c.id !== id);
        if (selectedId === id) setSelectedId(next[0]?.id ?? null);
        return next;
      });
      persistStats({
        ...stats,
        recoveredConversations: Math.max(0, stats.recoveredConversations - 1),
      });
      deleteRecoveryConversation(id).catch((err) => console.error("Failed to delete conversation:", err));
    },
    [selectedId, persistStats, stats]
  );

  /**
   * Bulk variant of deleteConversation — removes every id from state and
   * stats in one pass instead of one setState per card, so a large "select
   * all, delete" doesn't thrash renders or double-decrement stats.
   */
  const deleteConversations = useCallback(
    (ids: string[]) => {
      if (ids.length === 0) return;
      const idSet = new Set(ids);
      setConversations((prev) => {
        const next = prev.filter((c) => !idSet.has(c.id));
        if (selectedId && idSet.has(selectedId)) setSelectedId(next[0]?.id ?? null);
        return next;
      });
      persistStats({
        ...stats,
        recoveredConversations: Math.max(0, stats.recoveredConversations - ids.length),
      });
      for (const id of ids) {
        deleteRecoveryConversation(id).catch((err) => console.error("Failed to delete conversation:", err));
      }
    },
    [selectedId, persistStats, stats]
  );

  // Tracks which recovery conversations currently mirror a captured
  // (extension) conversation, so that a captured conversation being deleted
  // can be detected and its mirror removed here too — otherwise Timeline,
  // Knowledge Graph, and Capsules would keep showing a conversation whose
  // "source of truth" record is already gone.
  const capturedIdsRef = useRef<Set<string>>(new Set());

  /**
   * Syncs conversations captured by the browser extension (via
   * /api/conversations) into this dashboard, in both directions:
   *  - new captured conversations are run through the same local metadata
   *    pipeline as a manual paste-import and added here (reusing the
   *    captured conversation's own id, so this is naturally idempotent);
   *  - captured conversations that have since been deleted (bulk-deleted on
   *    the Conversations page, for example) have their mirror here removed,
   *    so every dependent feature downgrades to match — if the last
   *    conversation disappears, Timeline/Graph/Capsules fall back to their
   *    empty states rather than showing stale data.
   */
  const syncCapturedConversations = useCallback(
    (captured: CapturedConversation[]) => {
      const capturedIds = new Set(captured.map((c) => c.id));
      const previouslyTracked = capturedIdsRef.current;
      const staleIds = [...previouslyTracked].filter((id) => !capturedIds.has(id));

      setConversations((prev) => {
        let next = prev;

        if (staleIds.length > 0) {
          const staleSet = new Set(staleIds);
          next = next.filter((c) => !staleSet.has(c.id));
          for (const id of staleIds) {
            deleteRecoveryConversation(id).catch((err) =>
              console.error("Failed to remove stale captured conversation:", err)
            );
          }
          if (selectedId && staleSet.has(selectedId)) setSelectedId(next[0]?.id ?? null);
        }

        const existingIds = new Set(next.map((c) => c.id));
        const toImport = captured.filter((c) => !existingIds.has(c.id));
        if (toImport.length > 0) {
          const built = toImport.map((c) => buildConversationFromCaptured(c, projects));
          next = [...next, ...built];
          for (const conversation of built) {
            insertRecoveryConversation(conversation).catch((err) =>
              console.error("Failed to save captured conversation:", err)
            );
          }
          if (!selectedId) setSelectedId(built[0].id);
        }

        if (staleIds.length > 0 || toImport.length > 0) {
          persistStats({
            ...stats,
            recoveredConversations: Math.max(
              0,
              stats.recoveredConversations - staleIds.length + toImport.length
            ),
          });
        }

        return next;
      });

      capturedIdsRef.current = capturedIds;
    },
    [projects, persistStats, stats, selectedId]
  );

  const updateStatus = useCallback((id: string, status: Conversation["status"]) => {
    setConversations((prev) => {
      const next = prev.map((c) => (c.id === id ? { ...c, status } : c));
      const updated = next.find((c) => c.id === id);
      if (updated) updateRecoveryConversation(updated).catch((err) => console.error("Failed to update status:", err));
      return next;
    });
  }, []);

  /**
   * True full wipe of this store — unlike deleteConversations(ids), this
   * reaches every row in Supabase regardless of what's currently loaded
   * (seed data, conversations from an old import path, anything), because
   * "Reset all data" needs to guarantee an actual zero, not just clear
   * whatever the client happened to fetch on load.
   */
  const resetAll = useCallback(async () => {
    setConversations([]);
    setSelectedId(null);
    capturedIdsRef.current = new Set();
    persistStats(emptyStats());
    await deleteAllRecoveryConversations();
  }, [persistStats]);

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
    deleteConversations,
    updateStatus,
    syncCapturedConversations,
    resetAll,
  };
}
