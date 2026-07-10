"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Copy, Download, X } from "lucide-react";
import { GlassPanel } from "@/components/glass-panel";
import { Button } from "@/components/ui/button";
import { MarkdownPreview } from "@/components/markdown-preview";
import { copyMarkdown, downloadMarkdown } from "@/lib/markdown-file";
import { capsuleToMarkdown, capsuleFilename } from "@/lib/recovery/capsule-markdown";
import type { Capsule } from "@/types/atlas";

interface CapsuleViewDialogProps {
  capsule: Capsule;
  onClose: () => void;
}

export function CapsuleViewDialog({ capsule, onClose }: CapsuleViewDialogProps) {
  const [copied, setCopied] = useState(false);
  const markdown = capsuleToMarkdown(capsule);

  const handleCopy = async () => {
    await copyMarkdown(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">{capsule.name}</h2>
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="rounded-full p-1.5 text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/5"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <MarkdownPreview markdown={markdown} />

          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <Button variant="glass" onClick={handleCopy}>
              {copied ? <Check className="h-4 w-4 text-[var(--success)]" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied" : "Copy for another LLM"}
            </Button>
            <Button onClick={() => downloadMarkdown(markdown, capsuleFilename(capsule.name))}>
              <Download className="h-4 w-4" />
              Download
            </Button>
          </div>
        </GlassPanel>
      </motion.div>
    </div>
  );
}
