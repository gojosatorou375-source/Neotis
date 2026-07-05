"use client";

import { motion } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";
import { GlassPanel } from "@/components/glass-panel";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/recovery/status-badge";
import type { PendingImport } from "@/lib/recovery/use-recovery-store";

interface DuplicatePopupProps {
  pending: PendingImport;
  onContinue: (existingId: string) => void;
  onMerge: (project: string) => void;
  onCreateNew: () => void;
  onDismiss: () => void;
}

export function DuplicatePopup({
  pending,
  onContinue,
  onMerge,
  onCreateNew,
  onDismiss,
}: DuplicatePopupProps) {
  const top = pending.duplicates[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-6 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94 }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
        className="w-full max-w-[560px]"
      >
        <GlassPanel className="p-8">
          <div className="mb-6 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/15">
                <AlertTriangle className="h-5 w-5 text-amber-500" strokeWidth={1.75} />
              </div>
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                Similar Conversation Found
              </h2>
            </div>
            <button
              type="button"
              aria-label="Dismiss"
              onClick={onDismiss}
              className="rounded-full p-1.5 text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/5"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <p className="mb-5 text-body text-[var(--text-secondary)]">
            This looks related to work you may have already started. Continuing
            the existing conversation avoids duplicate effort.
          </p>

          <div className="max-h-64 space-y-3 overflow-y-auto pr-1">
            {pending.duplicates.map(({ conversation, score }) => (
              <div
                key={conversation.id}
                className="rounded-2xl border border-[var(--border)] bg-white/40 p-4 dark:bg-white/5"
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="truncate text-body font-medium text-[var(--text-primary)]">
                    {conversation.title}
                  </span>
                  <span className="shrink-0 rounded-full bg-[var(--accent)]/15 px-2 py-0.5 text-[11px] font-semibold text-[var(--accent)]">
                    {Math.round(score * 100)}% match
                  </span>
                </div>
                <div className="mb-2 flex items-center gap-2 text-[11px] text-[var(--text-secondary)]">
                  <span>{conversation.platform}</span>
                  <span>·</span>
                  <span>{conversation.project}</span>
                  <span>·</span>
                  <span>{new Date(conversation.createdAt).toLocaleDateString()}</span>
                  <StatusBadge status={conversation.status} />
                </div>
                <p className="mb-3 text-small text-[var(--text-secondary)]">
                  {conversation.summary}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => onContinue(conversation.id)}>
                    Continue existing
                  </Button>
                  <Button size="sm" variant="glass" onClick={() => onMerge(conversation.project)}>
                    Merge projects
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex items-center justify-end gap-3 border-t border-[var(--border)] pt-5">
            <Button variant="ghost" onClick={onDismiss}>
              Ignore
            </Button>
            <Button variant="ghost" onClick={() => onCreateNew()}>
              Create new anyway
            </Button>
          </div>
        </GlassPanel>
      </motion.div>
    </div>
  );
}
