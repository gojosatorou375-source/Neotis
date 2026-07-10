"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, PackagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/recovery/status-badge";
import { TranscriptView } from "@/components/recovery/transcript-view";
import { PLATFORM_META } from "@/lib/recovery/platform-meta";
import type { Conversation } from "@/types/recovery";

interface ConversationDashboardProps {
  conversation: Conversation | null;
  allConversations: Conversation[];
  onSelect: (id: string) => void;
  /** Distills this single conversation into a findable Capsule under `name`. */
  onSaveAsCapsule: (conversationId: string, name: string) => void;
}

/**
 * Shows exactly one conversation: its own back-and-forth transcript, styled
 * like ChatGPT/Claude/etc. show it, and nothing else. This used to also
 * render a stack of AI-derived metadata cards (summary, keyword chips,
 * project timeline, prompts-used digest, generated-files list, follow-up
 * tasks, related-conversations matches) above the transcript -- all useful
 * in the abstract, but it meant opening a saved conversation showed a report
 * *about* it instead of the conversation itself, which is what someone
 * actually wants when they come back to pick up where they left off.
 * `allConversations`/`onSelect` stay in the prop signature (unused here for
 * now) so a future "related conversations" surface can live elsewhere --
 * e.g. the workspace explorer sidebar -- without this component's callers
 * needing to change.
 */
export function ConversationDashboard({
  conversation,
  onSaveAsCapsule,
}: ConversationDashboardProps) {
  const [saved, setSaved] = useState(false);

  if (!conversation) {
    return (
      <div className="flex h-full flex-1 items-center justify-center p-10 text-center text-body text-[var(--text-secondary)]">
        Select a conversation from the workspace explorer, or import one to get started.
      </div>
    );
  }

  const meta = PLATFORM_META[conversation.platform];
  const Icon = meta.icon;

  return (
    <motion.div
      key={conversation.id}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex-1 overflow-y-auto p-6 sm:p-10"
    >
      <div className="mx-auto max-w-[760px]">
        <div className="mb-2 flex items-center gap-2 text-small text-[var(--text-secondary)]">
          <Icon className="h-4 w-4" style={{ color: meta.color }} />
          {conversation.platform}
          <span>·</span>
          {conversation.project}
        </div>
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-section text-[var(--text-primary)]">{conversation.title}</h1>
          <div className="flex items-center gap-3">
            <StatusBadge status={conversation.status} />
            <Button
              size="sm"
              variant="glass"
              onClick={() => {
                const name = window.prompt("Save this conversation as a Capsule named:", conversation.title);
                if (!name) return;
                onSaveAsCapsule(conversation.id, name);
                setSaved(true);
                setTimeout(() => setSaved(false), 2000);
              }}
            >
              {saved ? (
                <Check className="h-3.5 w-3.5 text-[var(--success)]" />
              ) : (
                <PackagePlus className="h-3.5 w-3.5" />
              )}
              {saved ? "Saved" : "Save as Capsule"}
            </Button>
          </div>
        </div>

        <TranscriptView messages={conversation.conversationHistory} />
      </div>
    </motion.div>
  );
}
