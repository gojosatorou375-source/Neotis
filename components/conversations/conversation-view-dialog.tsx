"use client";

import { motion } from "framer-motion";
import { X } from "lucide-react";
import { GlassPanel } from "@/components/glass-panel";
import type { Conversation } from "@/types/conversation";

interface ConversationViewDialogProps {
  conversation: Conversation;
  onClose: () => void;
}

export function ConversationViewDialog({ conversation, onClose }: ConversationViewDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-6 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94 }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
        className="w-full max-w-[700px]"
      >
        <GlassPanel className="p-8">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">{conversation.title}</h2>
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="rounded-full p-1.5 text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/5"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex max-h-[480px] flex-col gap-3 overflow-y-auto pr-1">
            {conversation.messages.map((message, i) => (
              <div
                key={i}
                className={`rounded-2xl border border-[var(--border)] p-4 text-small ${
                  message.role === "user" || message.role === "human"
                    ? "bg-white/40 dark:bg-white/5"
                    : "bg-[var(--accent)]/5"
                }`}
              >
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                  {message.role}
                </p>
                <p className="whitespace-pre-wrap text-[var(--text-primary)]">{message.content}</p>
              </div>
            ))}
          </div>
        </GlassPanel>
      </motion.div>
    </div>
  );
}
