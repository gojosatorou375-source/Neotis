"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MessageSquare, Sparkles, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConversationCard } from "@/components/conversations/conversation-card";
import { ConversationViewDialog } from "@/components/conversations/conversation-view-dialog";
import { ImportCapsuleDialog } from "@/components/conversations/import-capsule-dialog";
import type { Conversation, ConversationCapsule } from "@/types/conversation";

interface ConversationsViewProps {
  conversations: Conversation[];
  onImport: (capsule: ConversationCapsule) => Promise<{ added: number; skipped: number }>;
  onDelete: (id: string) => void;
  onGenerateInsights: (id: string) => Promise<{ ok: boolean; error?: string }>;
  /** Present only when this conversation has also synced into the recovery
   * store — builds a Capsule from it and opens the copy/download dialog. */
  onContinue?: (id: string) => void;
}

/**
 * The same "raw captures" view as the standalone /conversations page, folded
 * in as a Dashboard tab — this is the extension's direct output (one card
 * per capture, colored by provider) rather than the Workspace tab's
 * pipeline-enriched view (projects, tags, similarity links).
 */
export function ConversationsView({
  conversations,
  onImport,
  onDelete,
  onGenerateInsights,
  onContinue,
}: ConversationsViewProps) {
  const [viewing, setViewing] = useState<Conversation | null>(null);
  const [importing, setImporting] = useState(false);

  return (
    <div className="flex-1 overflow-y-auto p-6 sm:p-10">
      <div className="mx-auto max-w-[1000px]">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent)]/15">
            <MessageSquare className="h-5 w-5 text-[var(--accent)]" strokeWidth={1.75} />
          </div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Captured conversations</h2>
          <p className="mt-2 max-w-[520px] text-small text-[var(--text-secondary)]">
            Raw captures from the Noetis browser extension — these are the
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
              — it&apos;ll show up here automatically.
            </p>
          </div>
        ) : (
          <motion.div layout className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence>
              {conversations.map((conversation) => (
                <ConversationCard
                  key={conversation.id}
                  conversation={conversation}
                  onView={() => setViewing(conversation)}
                  onGenerateInsights={onGenerateInsights}
                  onContinue={onContinue}
                  onDelete={() => {
                    if (window.confirm(`Delete "${conversation.title}"? This can't be undone.`)) {
                      onDelete(conversation.id);
                    }
                  }}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {viewing && <ConversationViewDialog conversation={viewing} onClose={() => setViewing(null)} />}
        {importing && <ImportCapsuleDialog onImport={onImport} onClose={() => setImporting(false)} />}
      </AnimatePresence>
    </div>
  );
}
