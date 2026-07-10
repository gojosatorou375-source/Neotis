"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, ArrowRightCircle, Check, Download, Eye, MessageSquare, Send, Sparkles, Trash2 } from "lucide-react";
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
  onExportMarkdown?: (id: string) => Promise<{ ok: boolean; markdown?: string; filename?: string; error?: string }>;
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
  onExportMarkdown,
}: ConversationCardProps) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [exporting, setExporting] = useState(false);
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

  const handleExport = async () => {
    if (!onExportMarkdown) return;
    setExporting(true);
    setError(null);
    const result = await onExportMarkdown(conversation.id);
    setExporting(false);
    if (!result.ok) {
      setError(result.error ?? "Export failed.");
      return;
    }
    if (result.markdown) {
      const blob = new Blob([result.markdown], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.filename || "conversation-capsule.md";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }
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
          selected ? "border-[#B8FF33] shadow-[4px_4px_0px_rgba(184,255,51,1)]" : ""
        }`}
        whileHover={{ y: -3 }}
        onClick={selectable ? onToggleSelect : undefined}
      >
        {selectable && (
          <span
            className={`absolute right-4 top-4 flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors ${
              selected
                ? "border-black bg-[#B8FF33] text-black"
                : "border-black bg-white"
            }`}
          >
            {selected && <Check className="h-3 w-3" strokeWidth={4} />}
          </span>
        )}
        <div className="mb-2 flex items-center gap-2">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-black"
            style={{ background: `${providerColor(conversation.provider)}26` }}
          >
            <MessageSquare className="h-4 w-4" style={{ color: providerColor(conversation.provider) }} strokeWidth={2} />
          </div>
          <h3 className="truncate text-body font-black text-black pr-6">
            {conversation.title}
          </h3>
        </div>

        {conversation.limitReached && (
          <div className="mb-3 flex items-center gap-1.5 rounded-full border-2 border-black bg-amber-100 px-3 py-1.5 text-[11px] font-black text-black">
            <AlertTriangle className="h-3 w-3" />
            Limit reached -- continue this elsewhere
          </div>
        )}
        <p className="mb-4 flex items-center gap-1.5 text-[11px] font-bold text-black/60">
          <span
            className="h-1.5 w-1.5 rounded-full border border-black"
            style={{ background: providerColor(conversation.provider) }}
          />
          {providerLabel(conversation.provider)} · {conversation.messages.length} messages · captured{" "}
          {new Date(conversation.capturedAt).toLocaleDateString()}
        </p>
        <p className="mb-3 flex-1 text-small text-black/80 font-medium">{preview}</p>

        {conversation.insights && conversation.insights.topics.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-1.5">
            {conversation.insights.topics.map((topic) => (
              <span
                key={topic}
                className="rounded-full bg-[#B8FF33] border border-black px-2.5 py-1 text-[11px] font-black text-black shadow-[1px_1px_0px_rgba(0,0,0,1)]"
              >
                {topic}
              </span>
            ))}
          </div>
        )}

        {error && <p className="mb-3 text-[11px] font-black text-red-600">{error}</p>}

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
              <Button size="sm" variant="ghost" onClick={handleGenerate} disabled={generating} className="border-2 border-black hover:-translate-y-0.5 hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-y-0 bg-white">
                <Sparkles className="h-3.5 w-3.5" />
                {generating ? "Generating…" : "Generate insights"}
              </Button>
            )}
            {onShare && (
              <Button size="sm" variant="ghost" onClick={handleShare} disabled={sharing} className="w-full border-2 border-black hover:-translate-y-0.5 hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-y-0 bg-white">
                <Send className="h-3.5 w-3.5" />
                {sharing ? "Processing…" : "Share to another LLM"}
              </Button>
            )}
            {onExportMarkdown && (
              <Button size="sm" variant="ghost" onClick={handleExport} disabled={exporting} className="border-2 border-black hover:-translate-y-0.5 hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-y-0 bg-white">
                <Download className="h-3.5 w-3.5" />
                {exporting ? "Exporting…" : "Export .md"}
              </Button>
            )}
            {onDelete && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onDelete}
                className="text-red-600 border-2 border-black bg-red-50 hover:bg-red-100 hover:-translate-y-0.5 hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-y-0"
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
