"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MessageSquare, Sparkles, Trash2, UploadCloud, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConversationCard } from "@/components/conversations/conversation-card";
import { ImportCapsuleDialog } from "@/components/conversations/import-capsule-dialog";
import type { Conversation, ConversationCapsule } from "@/types/conversation";

interface ConversationsViewProps {
  conversations: Conversation[];
  onImport: (capsule: ConversationCapsule) => Promise<{ added: number; skipped: number }>;
  onDelete: (id: string) => void;
  /** Bulk delete -- every dependent feature (Timeline, Knowledge Graph,
   * Capsules) downgrades to match once these ids disappear from here. */
  onDeleteMany?: (ids: string[]) => void;
  onGenerateInsights: (id: string) => Promise<{ ok: boolean; error?: string }>;
  /** Present only when this conversation has also synced into the recovery
   * store -- builds a Capsule from it and opens the copy/download dialog. */
  onContinue?: (id: string) => void;
  /** AI-processed Markdown handoff for pasting into a different LLM. */
  onShare?: (
    id: string
  ) => Promise<{ ok: boolean; markdown?: string; title?: string; usedAI?: boolean; error?: string }>;
  /** Selects this conversation and switches to the Workspace tab, where the
   * full transcript renders -- this ID is reused as-is by the recovery
   * store's synced copy of this same conversation, so it resolves directly. */
  onSelect: (id: string) => void;
}

/**
 * The same "raw captures" view as the standalone /conversations page, folded
 * in as a Dashboard tab -- this is the extension's direct output (one card
 * per capture, colored by provider) rather than the Workspace tab's
 * pipeline-enriched view (projects, tags, similarity links).
 */
export function ConversationsView({
  conversations,
  onImport,
  onDelete,
  onDeleteMany,
  onGenerateInsights,
  onContinue,
  onShare,
  onSelect,
}: ConversationsViewProps) {
  const [importing, setImporting] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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

  const allSelected = selectedIds.size > 0 && selectedIds.size === conversations.length;
  const toggleSelectAll = () => {
    setSelectedIds(allSelected ? new Set() : new Set(conversations.map((c) => c.id)));
  };

  const handleBulkDelete = () => {
    if (!onDeleteMany || selectedIds.size === 0) return;
    if (
      window.confirm(
        `Delete ${selectedIds.size} conversation${selectedIds.size > 1 ? "s" : ""}? This can't be undone.`
      )
    ) {
      onDeleteMany([...selectedIds]);
      exitSelectMode();
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 sm:p-10">
      <div className="mx-auto max-w-[1000px]">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent)]/15">
            <MessageSquare className="h-5 w-5 text-[var(--accent)]" strokeWidth={1.75} />
          </div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Captured conversations</h2>
          <p className="mt-2 max-w-[520px] text-small text-[var(--text-secondary)]">
            Raw captures from the Noetis browser extension -- these are the
            same conversations that feed the Workspace, Timeline, and
            Knowledge Graph tabs.
          </p>
          <Button className="mt-5" size="sm" variant="glass" onClick={() => setImporting(true)}>
            <UploadCloud className="h-3.5 w-3.5" />
            Import a Capsule manually
          </Button>
        </div>

        {conversations.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-xl3 border border-dashed border-[var(--border)] py-20 text-center">
            <Sparkles className="h-6 w-6 text-[var(--text-secondary)]" />
            <p className="text-body text-[var(--text-secondary)]">
              Nothing captured yet. Capture a conversation with the extension
              -- it&apos;ll show up here automatically.
            </p>
          </div>
        ) : (
          <>
            {onDeleteMany && (
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <p className="text-small text-[var(--text-secondary)]">
                  {conversations.length} conversation{conversations.length === 1 ? "" : "s"}
                </p>
                {selectMode ? (
                  <div className="flex items-center gap-2">
                    <span className="text-small text-[var(--text-secondary)]">{selectedIds.size} selected</span>
                    <Button size="sm" variant="glass" onClick={toggleSelectAll}>
                      {allSelected ? "Deselect all" : "Select all"}
                    </Button>
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
            )}

            <motion.div layout className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <AnimatePresence>
                {conversations.map((conversation) => (
                  <ConversationCard
                    key={conversation.id}
                    conversation={conversation}
                    onView={() => onSelect(conversation.id)}
                    onGenerateInsights={onGenerateInsights}
                    onContinue={onContinue}
                    onShare={onShare}
                    selectable={selectMode}
                    selected={selectedIds.has(conversation.id)}
                    onToggleSelect={() => toggleSelected(conversation.id)}
                    onDelete={() => {
                      if (window.confirm(`Delete "${conversation.title}"? This can't be undone.`)) {
                        onDelete(conversation.id);
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
        {importing && <ImportCapsuleDialog onImport={onImport} onClose={() => setImporting(false)} />}
      </AnimatePresence>
    </div>
  );
}
