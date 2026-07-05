"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, CheckCircle2, FileText, Lightbulb, MessageSquare, PackagePlus, Sparkles } from "lucide-react";
import { GlassPanel } from "@/components/glass-panel";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/recovery/status-badge";
import { PLATFORM_META } from "@/lib/recovery/platform-meta";
import { relatedConversations } from "@/lib/recovery/derive";
import type { Conversation } from "@/types/recovery";

interface ConversationDashboardProps {
  conversation: Conversation | null;
  allConversations: Conversation[];
  onSelect: (id: string) => void;
  /** Distills this single conversation into a findable Capsule under `name`. */
  onSaveAsCapsule: (conversationId: string, name: string) => void;
}

export function ConversationDashboard({
  conversation,
  allConversations,
  onSelect,
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
  const timeline = allConversations
    .filter((c) => c.project === conversation.project)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const related = relatedConversations(conversation, allConversations, 4);

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
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
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

        <GlassPanel className="mb-6 p-6">
          <div className="mb-3 flex items-center gap-2 text-small font-semibold text-[var(--text-primary)]">
            <Sparkles className="h-4 w-4 text-[var(--accent)]" />
            AI Context Summary
          </div>
          <p className="text-body text-[var(--text-secondary)]">{conversation.summary}</p>
          {conversation.keywords.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {conversation.keywords.map((k) => (
                <span
                  key={k}
                  className="rounded-full bg-black/5 px-2.5 py-1 text-[11px] text-[var(--text-secondary)] dark:bg-white/5"
                >
                  {k}
                </span>
              ))}
            </div>
          )}
        </GlassPanel>

        <GlassPanel className="mb-6 p-6">
          <div className="mb-4 flex items-center gap-2 text-small font-semibold text-[var(--text-primary)]">
            <CheckCircle2 className="h-4 w-4 text-[var(--success)]" />
            Project Timeline — {conversation.project}
          </div>
          <ol className="space-y-3 border-l border-[var(--border)] pl-4">
            {timeline.map((step) => (
              <li key={step.id} className="relative">
                <span
                  className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full"
                  style={{ background: step.id === conversation.id ? "var(--accent)" : "var(--border)" }}
                />
                <button
                  type="button"
                  onClick={() => onSelect(step.id)}
                  className="text-left"
                >
                  <span className="text-small font-medium text-[var(--text-primary)] hover:underline">
                    {step.platform} — {step.title}
                  </span>
                  <span className="ml-2 text-[11px] text-[var(--text-secondary)]">
                    {new Date(step.createdAt).toLocaleDateString()}
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </GlassPanel>

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <GlassPanel className="p-6">
            <div className="mb-3 flex items-center gap-2 text-small font-semibold text-[var(--text-primary)]">
              <MessageSquare className="h-4 w-4 text-[var(--accent)]" />
              Prompts Used
            </div>
            <ul className="space-y-2">
              {conversation.prompts.slice(0, 5).map((p, i) => (
                <li key={i} className="text-small text-[var(--text-secondary)] line-clamp-2">
                  {p}
                </li>
              ))}
              {conversation.prompts.length === 0 && (
                <li className="text-small text-[var(--text-secondary)]">No prompts recorded.</li>
              )}
            </ul>
          </GlassPanel>

          <GlassPanel className="p-6">
            <div className="mb-3 flex items-center gap-2 text-small font-semibold text-[var(--text-primary)]">
              <FileText className="h-4 w-4 text-[var(--accent)]" />
              Generated Files
            </div>
            <ul className="space-y-2">
              {conversation.files.length > 0 ? (
                conversation.files.map((f) => (
                  <li key={f} className="text-small text-[var(--text-secondary)]">
                    {f}
                  </li>
                ))
              ) : (
                <li className="text-small text-[var(--text-secondary)]">No files generated in this thread.</li>
              )}
            </ul>
          </GlassPanel>
        </div>

        <GlassPanel className="mb-6 p-6">
          <div className="mb-3 flex items-center gap-2 text-small font-semibold text-[var(--text-primary)]">
            <Lightbulb className="h-4 w-4 text-amber-500" />
            Remaining Tasks
          </div>
          {conversation.followUpTasks.length > 0 ? (
            <ul className="space-y-2">
              {conversation.followUpTasks.map((t, i) => (
                <li key={i} className="flex items-start gap-2 text-small text-[var(--text-primary)]">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                  {t}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-small text-[var(--text-secondary)]">
              No open tasks detected — this thread looks complete.
            </p>
          )}
        </GlassPanel>

        {related.length > 0 && (
          <GlassPanel className="p-6">
            <div className="mb-3 text-small font-semibold text-[var(--text-primary)]">
              Related Conversations
            </div>
            <div className="space-y-2">
              {related.map(({ conversation: rc, score }) => (
                <button
                  key={rc.id}
                  type="button"
                  onClick={() => onSelect(rc.id)}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left hover:bg-black/5 dark:hover:bg-white/5"
                >
                  <span className="truncate text-small text-[var(--text-primary)]">{rc.title}</span>
                  <span className="ml-3 shrink-0 text-[11px] text-[var(--text-secondary)]">
                    {Math.round(score * 100)}%
                  </span>
                </button>
              ))}
            </div>
          </GlassPanel>
        )}
      </div>
    </motion.div>
  );
}
