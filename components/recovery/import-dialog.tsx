"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { UploadCloud, X } from "lucide-react";
import { GlassPanel } from "@/components/glass-panel";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PLATFORMS, type Platform } from "@/types/recovery";

interface ImportDialogProps {
  onImport: (rawText: string, platform: Platform, titleHint?: string) => void;
  onClose: () => void;
}

export function ImportDialog({ onImport, onClose }: ImportDialogProps) {
  const [platform, setPlatform] = useState<Platform>("ChatGPT");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const handleFile = async (file: File) => {
    const text = await file.text();
    setContent(text);
    if (!title) setTitle(file.name.replace(/\.[^.]+$/, ""));
  };

  const handleSubmit = () => {
    if (content.trim().length === 0) return;
    onImport(content, platform, title || undefined);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-6 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94 }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
        className="w-full max-w-[640px]"
      >
        <GlassPanel className="p-8">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              Import a conversation
            </h2>
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="rounded-full p-1.5 text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/5"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-small font-medium text-[var(--text-secondary)]">
                Source platform
              </label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value as Platform)}
                className="w-full rounded-xl border border-[var(--border)] bg-white/40 px-3 py-2.5 text-small text-[var(--text-primary)] outline-none focus:border-[var(--accent)] dark:bg-white/5"
              >
                {PLATFORMS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-small font-medium text-[var(--text-secondary)]">
                Title (optional)
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Auto-detected if left blank"
                className="w-full rounded-xl border border-[var(--border)] bg-white/40 px-3 py-2.5 text-small text-[var(--text-primary)] outline-none focus:border-[var(--accent)] dark:bg-white/5"
              />
            </div>
          </div>

          <label className="mb-1.5 block text-small font-medium text-[var(--text-secondary)]">
            Paste JSON, Markdown, or plain text
          </label>
          <Textarea
            rows={8}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder='Paste an export, e.g. [{"role":"user","content":"..."}] or a Markdown transcript...'
          />

          <label className="mt-4 flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-[var(--border)] px-4 py-4 text-small text-[var(--text-secondary)] hover:border-[var(--accent)]">
            <UploadCloud className="h-4 w-4" />
            Or upload a .json / .md / .txt file
            <input
              type="file"
              accept=".json,.md,.txt"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
          </label>

          <div className="mt-6 flex justify-end gap-3">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={content.trim().length === 0}>
              Analyze & import
            </Button>
          </div>
        </GlassPanel>
      </motion.div>
    </div>
  );
}
