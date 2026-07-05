"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Home, MessageSquare, Sparkles, Trash2, UploadCloud, X } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { ConversationCard } from "@/components/conversations/conversation-card";
import { ConversationViewDialog } from "@/components/conversations/conversation-view-dialog";
import { ImportCapsuleDialog } from "@/components/conversations/import-capsule-dialog";
import { useConversations } from "@/lib/conversations/use-conversations";
import type { Conversation } from "@/types/conversation";

export default function ConversationsPage() {
  const { hydrated, conversations, importCapsule, deleteConversation, deleteConversations, generateInsights } =
    useConversations();
  const [viewing, setViewing] = useState<Conversation | null>(null);
  const [importing, setImporting] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  if (!hydrated) return null;

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    // Conversations are the source of truth for every other feature —
    // deleting them here cascades into Timeline, Knowledge Graph, and
    // Capsules automatically via the recovery store's sync effect.
    if (
      window.confirm(
        `Delete ${selectedIds.size} conversation${selectedIds.size > 1 ? "s" : ""}? This can't be undone.`
      )
    ) {
      deleteConversations([...selectedIds]);
      exitSelectMode();
    }
  };

  return (
    <div className="relative z-10 min-h-screen">
      <header className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4 sm:px-10">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-white/30 px-3 py-1.5 text-small font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] dark:bg-white/5"
          >
            <Home className="h-3.5 w-3.5" />
            Home
          </Link>
          <span className="text-[var(--border)]">/</span>
          <span className="text-small font-semibold text-[var(--text-primary)]">Conversations</span>
        </div>
        <ThemeToggle />
      </header>

      <div className="mx-auto max-w-[1100px] px-6 py-14 sm:px-10">
        <div className="mb-10 flex flex-col items-center text-center">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--accent)]/15">
            <MessageSquare className="h-6 w-6 text-[var(--accent)]" strokeWidth={1.75} />
          </div>
          <h1 className="text-section text-[var(--text-primary)]">Imported conversations</h1>
          <p className="mt-3 max-w-[560px] text-body text-[var(--text-secondary)]">
            Capture conversations from ChatGPT or Claude with the Noetis
            Capture browser extension. With auto-push enabled they appear
            here automatically while this app is running — or import a
            Capsule file manually below.
          </p>
          <Button className="mt-6" variant="glass" onClick={() => setImporting(true)}>
            <UploadCloud className="h-4 w-4" />
            Import a Capsule manually
          </Button>
        </div>

        {conversations.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-xl3 border border-dashed border-[var(--border)] py-20 text-center">
            <Sparkles className="h-6 w-6 text-[var(--text-secondary)]" />
            <p className="text-body text-[var(--text-secondary)]">
              Nothing captured yet. Install the extension in{" "}
              <code className="rounded bg-black/5 px-1.5 py-0.5 dark:bg-white/10">/extension</code>, capture a
              conversation on ChatGPT or Claude, and it&apos;ll show up here (make sure this dev server is running).
            </p>
          </div>
        ) : (
          <>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <p className="text-small text-[var(--text-secondary)]">
                {conversations.length} conversation{conversations.length === 1 ? "" : "s"}
              </p>
              {selectMode ? (
                <div className="flex items-center gap-2">
                  <span className="text-small text-[var(--text-secondary)]">{selectedIds.size} selected</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-500 hover:bg-red-500/10"
                    onClick={handleBulkDelete}
                    disabled={selectedIds.size === 0}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete selected
                  </Button>
                  <Button size="sm" variant="glass" onClick={exitSelectMode}>
                    <X className="h-3.5 w-3.5" />
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button size="sm" variant="glass" onClick={() => setSelectMode(true)}>
                  Select
                </Button>
              )}
            </div>

            <motion.div layout className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <AnimatePresence>
                {conversations.map((conversation) => (
                  <ConversationCard
                    key={conversation.id}
                    conversation={conversation}
                    onView={() => setViewing(conversation)}
                    onGenerateInsights={generateInsights}
                    selectable={selectMode}
                    selected={selectedIds.has(conversation.id)}
                    onToggleSelect={() => toggleSelected(conversation.id)}
                    onDelete={() => {
                      if (window.confirm(`Delete "${conversation.title}"? This can't be undone.`)) {
                        deleteConversation(conversation.id);
                      }
                    }}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          </>
        )}
      </div>

      <AnimatePresence>
        {viewing && (
          <ConversationViewDialog conversation={viewing} onClose={() => setViewing(null)} />
        )}
        {importing && (
          <ImportCapsuleDialog onImport={importCapsule} onClose={() => setImporting(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
