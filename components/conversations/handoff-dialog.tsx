"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Copy, Download, Sparkles, X } from "lucide-react";
import { GlassPanel } from "@/components/glass-panel";
import { Button } from "@/components/ui/button";

interface HandoffDialogProps {
  title: string;
  markdown: string;
  usedAI?: boolean;
  filename?: string;
  onClose: () => void;
}

/**
 * Shows the AI-distilled Markdown handoff for a conversation (see
 * generateHandoffMarkdown on the server) with Copy and Download actions —
 * the two universal ways to hand this off to whatever LLM the person opens
 * next. Mirrors ConversationViewDialog's glass-panel styling.
 */
export function HandoffDialog({ title, markdown, usedAI, filename, onClose }: HandoffDialogProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard permissions can be denied — the textarea is still visible
      // to select/copy manually, so this isn't a hard failure.
    }
  };

  const handleDownload = () => {
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || "conversation-handoff.md";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

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
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Handoff: {title}</h2>
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="rounded-full p-1.5 text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/5"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <p className="mb-5 flex items-center gap-1.5 text-small text-[var(--text-secondary)]">
            <Sparkles className="h-3.5 w-3.5 text-[var(--accent)]" />
            {usedAI
              ? "Distilled by AI into a compact brief — paste it into any other assistant to continue this conversation."
              : "No AI key configured on the server, so this is a plain excerpt rather than an AI summary — still safe to paste elsewhere."}
          </p>

          <div className="mb-5 max-h-[400px] overflow-y-auto rounded-2xl border border-[var(--border)] bg-white/40 p-4 dark:bg-white/5">
            <pre className="whitespace-pre-wrap font-mono text-[12px] leading-relaxed text-[var(--text-primary)]">
              {markdown}
            </pre>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={handleCopy}>
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy markdown"}
            </Button>
            <Button size="sm" variant="glass" onClick={handleDownload}>
              <Download className="h-3.5 w-3.5" />
              Download .md
            </Button>
          </div>
        </GlassPanel>
      </motion.div>
    </div>
  );
}
