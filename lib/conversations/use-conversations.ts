"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Conversation, ConversationCapsule } from "@/types/conversation";
import { getSupabase } from "@/lib/supabase/client";

const POLL_INTERVAL_MS = 4000;

// Sent alongside every request to /api/conversations so the shared secret
// check in src/lib/server/access-key.ts lets same-origin app traffic
// through (see NEXT_PUBLIC_APP_ACCESS_KEY in .env.local.example).
async function accessHeaders(extra?: Record<string, string>): Promise<Record<string, string>> {
  const key = process.env.NEXT_PUBLIC_APP_ACCESS_KEY;
  const headers: Record<string, string> = { ...(key ? { "X-PersonaMD-Access": key } : {}), ...extra };
  try {
    const supabase = getSupabase();
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      headers["Authorization"] = `Bearer ${session.access_token}`;
    }
  } catch {
    // Ignore error if Supabase auth is not ready or during builds
  }
  return headers;
}

/** Server-backed conversation library: reads from and writes through
 * /api/conversations (a local JSON file on the dev server), and polls so
 * conversations pushed directly by the browser extension show up here
 * without a manual import step. */
export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/conversations", { 
        cache: "no-store", 
        headers: await accessHeaders() 
      });
      if (!res.ok) return;
      const data = await res.json();
      setConversations(data.conversations ?? []);
    } catch {
      // Server not reachable (e.g. offline) -- keep showing whatever we last had.
    }
  }, []);

  useEffect(() => {
    fetchConversations().finally(() => setHydrated(true));
    pollRef.current = setInterval(fetchConversations, POLL_INTERVAL_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchConversations]);

  /** Pushes every conversation in a parsed Capsule to the server. The server
   * dedupes by id, so re-importing the same capsule is a no-op. */
  const importCapsule = useCallback(
    async (capsule: ConversationCapsule): Promise<{ added: number; skipped: number }> => {
      let added = 0;
      let skipped = 0;
      for (const conversation of capsule.conversations) {
        try {
          const res = await fetch("/api/conversations", {
            method: "POST",
            headers: await accessHeaders({ "Content-Type": "application/json" }),
            body: JSON.stringify(conversation),
          });
          const data = await res.json();
          if (data.isNew) added += 1;
          else skipped += 1;
        } catch {
          skipped += 1;
        }
      }
      await fetchConversations();
      return { added, skipped };
    },
    [fetchConversations]
  );

  /** Backfills insights for a conversation captured before an API key was
   * configured (insights otherwise only run once, at ingest time). */
  const generateInsights = useCallback(
    async (id: string): Promise<{ ok: boolean; error?: string }> => {
      try {
        const res = await fetch(`/api/conversations/${id}/insights`, {
          method: "POST",
          headers: await accessHeaders(),
        });
        const data = await res.json();
        if (!res.ok) return { ok: false, error: data.error || "Extraction failed." };
        await fetchConversations();
        return { ok: true };
      } catch {
        return { ok: false, error: "Couldn't reach the server." };
      }
    },
    [fetchConversations]
  );

  /** Distills a conversation into a Markdown "handoff" brief (see
   * generateHandoffMarkdown on the server) meant to be pasted into a
   * different LLM to continue the conversation there. Unlike
   * generateInsights, this doesn't mutate the stored conversation -- it just
   * returns the markdown for the caller to show/copy/download. */
  const getHandoff = useCallback(
    async (id: string): Promise<{ ok: boolean; markdown?: string; title?: string; usedAI?: boolean; error?: string }> => {
      try {
        const res = await fetch("/api/conversations/handoff", {
          method: "POST",
          headers: await accessHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({ conversationId: id }),
        });
        const data = await res.json();
        if (!res.ok) return { ok: false, error: data.error || "Handoff generation failed." };
        return { ok: true, markdown: data.markdown, title: data.title, usedAI: data.usedAI };
      } catch {
        return { ok: false, error: "Couldn't reach the server." };
      }
    },
    []
  );

  const exportConversationMarkdown = useCallback(
    async (id: string): Promise<{ ok: boolean; markdown?: string; filename?: string; error?: string }> => {
      try {
        const res = await fetch(`/api/conversations/${id}/export`, {
          method: "GET",
          headers: await accessHeaders(),
        });
        if (!res.ok) {
          const data = await res.json();
          return { ok: false, error: data.error || "Export failed." };
        }
        const markdown = await res.text();
        const disposition = res.headers.get("content-disposition");
        let filename = "conversation-export.md";
        if (disposition && disposition.indexOf("filename=") !== -1) {
          const matches = /filename="([^"]+)"/.exec(disposition);
          if (matches && matches[1]) {
            filename = matches[1];
          }
        }
        return { ok: true, markdown, filename };
      } catch {
        return { ok: false, error: "Couldn't reach the server." };
      }
    },
    []
  );

  const deleteConversation = useCallback(
    async (id: string) => {
      setConversations((prev) => prev.filter((c) => c.id !== id));
      try {
        await fetch(`/api/conversations/${id}`, { method: "DELETE", headers: await accessHeaders() });
      } finally {
        fetchConversations();
      }
    },
    [fetchConversations]
  );

  /** Bulk delete for the "select multiple, delete" flow -- conversations are
   * the source of truth for the whole app, so every id removed here is also
   * removed from the recovery mirror by the syncCapturedConversations effect
   * that watches this hook's `conversations` output. */
  const deleteConversations = useCallback(
    async (ids: string[]) => {
      if (ids.length === 0) return;
      const idSet = new Set(ids);
      setConversations((prev) => prev.filter((c) => !idSet.has(c.id)));
      try {
        await Promise.all(
          ids.map(async (id) => fetch(`/api/conversations/${id}`, { method: "DELETE", headers: await accessHeaders() }))
        );
      } finally {
        fetchConversations();
      }
    },
    [fetchConversations]
  );

  /** Wipes every captured conversation on the server in one call -- unlike
   * deleteConversations(ids), this reaches rows the client never loaded
   * (e.g. seed data from another import path), which is what "Reset all
   * data" needs to guarantee a true zero. */
  const resetAll = useCallback(async () => {
    setConversations([]);
    try {
      await fetch("/api/conversations", { method: "DELETE", headers: await accessHeaders() });
    } finally {
      fetchConversations();
    }
  }, [fetchConversations]);

  return {
    hydrated,
    conversations,
    importCapsule,
    deleteConversation,
    deleteConversations,
    resetAll,
    generateInsights,
    getHandoff,
    exportConversationMarkdown,
    refresh: fetchConversations,
  };
}
