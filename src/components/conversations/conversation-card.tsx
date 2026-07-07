"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, ArrowRightCircle, Check, Eye, MessageSquare, Send, Sparkles, Trash2 } from "lucide-react";
import { GlassPanel } from "@/components/glass-panel";
import { Button } from "@/components/ui/button";
import { HandoffDialog } from "@/components/conversations/handoff-dialog";
import { providerColor, providerLabel } from "@/lib/conversations/provider-style";
import type { Conversation } from "@/types/conversation";

interface HandoffResult {
  ok: boolean;
  markdown?: string;
  title?: string;
  usedAI?: boolean;
  error?: string;
}

interface ConversationCardProps {
  conversation: Conversation;
  onView: () => void;
  onDelete?: () => void;
  onGenerateInsights?: (id: string) => Promise<{ ok: boolean; error?: string }>;
  onContinue?: (id: string) => void;
  /** AI-processed Markdown handoff -- distills this conversation into a brief
   * meant to be pasted into a different LLM. Present on every list that
   * reads from useConversations()'s getHandoff(). */
  onShare?: (id: string) => Promise<HandoffResult>;
  /** When set, the card renders in bulk-select mode: clicking it toggles
   * selection instead of opening the viewer, and a checkmark badge shows
   * the current state. */
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
}

export function ConversationCard({
  conversation,
  onView,
  onDelete,
  onGenerateInsights,
  onContinue,
  onShare,
  selectable,
  selected,
  onToggleSelect,
}: ConversationCardProps) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [handoff, setHandoff] = useState<HandoffResult | null>(null);
  const preview =
    conversation.insights?.summary || conversation.messages[0]?.content?.slice(0, 140) || "No content captured.";

  const handleGenerate = async () => {
    if (!onGenerateInsights) return;
    setGenerating(true);
    setError(null);
    const result = await onGenerateInsights(conversation.id);
    setGenerating(false);
    if (!result.ok) setError(result.error ?? "Extraction failed.");
  };

  const handleShare = async () => {
    if (!onShare) return;
    setSharing(true);
    setError(null);
    const result = await onShare(conversation.id);
    setSharing(false);
    if (!result.ok) {
      setError(result.error ?? "Handoff generation failed.");
      return;
    }
    setHandoff(result);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3 }}
    >
      <GlassPanel
        className={`relative flex h-full flex-col p-6 ${selectable ? "cursor-pointer" : ""} ${
          selected ? "ring-2 ring-[var(--accent)]" : ""
        }`}
        whileHover={{ y: -3 }}
        onClick={selectable ? onToggleSelect : undefined}
      >
        {selectable && (
          <span
            className={`absolute right-4 top-4 flex h-5 w-5 items-center justify-center rounded-full border transition-colors ${
              selected
                ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                : "border-[var(--border)] bg-white/40 dark:bg-white/5"
            }`}
          >
            {selected && <Check className="h-3 w-3" strokeWidth={3} />}
          </span>
        )}
        <div className="mb-2 flex items-center gap-2">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-full"
            style={{ background: `${providerColor(conversation.provider)}26` }}
          >
            <MessageSquare className="h-4 w-4" style={{ color: providerColor(conversation.provider) }} strokeWidth={1.75} />
          </div>
          <h3 className="truncate text-body font-semibold text-[var(--text-primary)] pr-6">
            {conversation.title}
          </h3>
        </div>

        {conversation.limitReached && (
          <div className="mb-3 flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1.5 text-[11px] font-medium text-amber-500">
            <AlertTriangle className="h-3 w-3" />
            Limit reached -- continue this elsewhere
          </div>
        )}
        <p className="mb-4 flex items-center gap-1.5 text-[11px] text-[var(--text-secondary)]">
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: providerColor(conversation.provider) }}
          />
          {providerLabel(conversation.provider)} · {conversation.messages.length} messages · captured{" "}
          {new Date(conversation.capturedAt).toLocaleDateString()}
        </p>
        <p className="mb-3 flex-1 text-small text-[var(--text-secondary)]">{preview}</p>

        {conversation.insights && conversation.insights.topics.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-1.5">
            {conversation.insights.topics.map((topic) => (
              <span
                key={topic}
                className="rounded-full bg-[var(--accent)]/10 px-2.5 py-1 text-[11px] font-medium text-[var(--accent)]"
              >
                {topic}
              </span>
            ))}
          </div>
        )}

        {error && <p className="mb-3 text-[11px] text-red-500">{error}</p>}

        {!selectable && (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="glass" onClick={onView}>
              <Eye className="h-3.5 w-3.5" />
              View
            </Button>
            {conversation.limitReached && onContinue && (
              <Button size="sm" onClick={() => onContinue(conversation.id)}>
                <ArrowRightCircle className="h-3.5 w-3.5" />
                Continue in another LLM
              </Button>
            )}
            {!conversation.insights && onGenerateInsights && (
              <Button size="sm" variant="ghost" onClick={handleGenerate} disabled={generating}>
                <Sparkles className="h-3.5 w-3.5" />
                {generating ? "Generating…" : "Generate insights"}
              </Button>
            )}
            {onShare && (
              <Button size="sm" variant="ghost" onClick={handleShare} disabled={sharing}>
                <Send className="h-3.5 w-3.5" />
                {sharing ? "Processing…" : "Share to another LLM"}
              </Button>
            )}
            {onDelete && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onDelete}
                className="text-red-500 hover:bg-red-500/10"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        )}
      </GlassPanel>

      {handoff?.markdown && (
        <HandoffDialog
          title={conversation.title}
          markdown={handoff.markdown}
          usedAI={handoff.usedAI}
          filename={handoff.title}
          onClose={() => setHandoff(null)}
        />
      )}
    </motion.div>
  );
}
