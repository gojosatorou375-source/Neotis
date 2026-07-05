"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Copy, Download, History, RotateCcw, X } from "lucide-react";
import { GlassPanel } from "@/components/glass-panel";
import { Button } from "@/components/ui/button";
import { MarkdownPreview } from "@/components/markdown-preview";
import { copyMarkdown, downloadMarkdown, extractPreview, personaFilename } from "@/lib/markdown-file";
import type { Persona } from "@/types/persona";

interface PersonaViewDialogProps {
  persona: Persona;
  onClose: () => void;
  onRestoreVersion: (versionIndex: number) => void;
}

export function PersonaViewDialog({ persona, onClose, onRestoreVersion }: PersonaViewDialogProps) {
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<"current" | "history">("current");

  const handleCopy = async () => {
    await copyMarkdown(persona.markdown);
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
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">{persona.name}</h2>
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="rounded-full p-1.5 text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/5"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {persona.history.length > 0 && (
            <div className="mb-5 flex gap-1 rounded-full bg-black/5 p-1 dark:bg-white/5">
              <button
                type="button"
                onClick={() => setTab("current")}
                className={`flex-1 rounded-full px-3 py-1.5 text-small font-medium transition-colors ${
                  tab === "current"
                    ? "bg-white text-[var(--text-primary)] shadow-sm dark:bg-white/15"
                    : "text-[var(--text-secondary)]"
                }`}
              >
                Current
              </button>
              <button
                type="button"
                onClick={() => setTab("history")}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-small font-medium transition-colors ${
                  tab === "history"
                    ? "bg-white text-[var(--text-primary)] shadow-sm dark:bg-white/15"
                    : "text-[var(--text-secondary)]"
                }`}
              >
                <History className="h-3.5 w-3.5" />
                History ({persona.history.length})
              </button>
            </div>
          )}

          {tab === "current" ? (
            <>
              <MarkdownPreview markdown={persona.markdown} />

              <div className="mt-6 flex flex-wrap justify-end gap-3">
                <Button variant="glass" onClick={handleCopy}>
                  {copied ? <Check className="h-4 w-4 text-[var(--success)]" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copied" : "Copy Markdown"}
                </Button>
                <Button
                  onClick={() => downloadMarkdown(persona.markdown, personaFilename(persona.name))}
                >
                  <Download className="h-4 w-4" />
                  Download
                </Button>
              </div>
            </>
          ) : (
            <div className="flex max-h-[420px] flex-col gap-3 overflow-y-auto pr-1">
              {persona.history.map((version, index) => (
                <div
                  key={version.savedAt}
                  className="rounded-2xl border border-[var(--border)] bg-white/30 p-4 dark:bg-white/5"
                >
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="text-small font-medium text-[var(--text-primary)]">
                      {new Date(version.savedAt).toLocaleString()}
                    </p>
                    <Button size="sm" variant="glass" onClick={() => onRestoreVersion(index)}>
                      <RotateCcw className="h-3.5 w-3.5" />
                      Restore
                    </Button>
                  </div>
                  <p className="text-small text-[var(--text-secondary)]">
                    {extractPreview(version.markdown)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </GlassPanel>
      </motion.div>
    </div>
  );
}
