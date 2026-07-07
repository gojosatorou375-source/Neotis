"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Layers, X } from "lucide-react";
import { GlassPanel } from "@/components/glass-panel";
import { Button } from "@/components/ui/button";

interface SaveSkillDialogProps {
  suggestedName: string;
  onSave: (name: string, tags: string[]) => void;
  onClose: () => void;
}

/** Parses a comma-separated tags input into a clean, deduped tag list. */
function parseTags(raw: string): string[] {
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const part of raw.split(",")) {
    const tag = part.trim();
    if (!tag || seen.has(tag.toLowerCase())) continue;
    seen.add(tag.toLowerCase());
    tags.push(tag);
  }
  return tags;
}

export function SaveSkillDialog({ suggestedName, onSave, onClose }: SaveSkillDialogProps) {
  const [name, setName] = useState(suggestedName);
  const [tagsInput, setTagsInput] = useState("");

  const handleSave = () => {
    if (name.trim().length === 0) return;
    onSave(name.trim(), parseTags(tagsInput));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-6 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94 }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
        className="w-full max-w-[480px]"
      >
        <GlassPanel className="p-8">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent)]/15">
                <Layers className="h-5 w-5 text-[var(--accent)]" strokeWidth={1.75} />
              </div>
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Save this Skill</h2>
            </div>
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="rounded-full p-1.5 text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/5"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <label className="mb-1.5 block text-small font-medium text-[var(--text-secondary)]">
            Name
          </label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
            }}
            className="mb-6 w-full rounded-2xl border border-[var(--border)] bg-white/40 px-4 py-3 text-body text-[var(--text-primary)] outline-none focus:border-[var(--accent)] dark:bg-white/5"
          />

          <label className="mb-1.5 block text-small font-medium text-[var(--text-secondary)]">
            Tags <span className="font-normal text-[var(--text-secondary)]/70">(optional, comma-separated)</span>
          </label>
          <input
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
            }}
            placeholder="e.g. backend, client-project, active"
            className="mb-6 w-full rounded-2xl border border-[var(--border)] bg-white/40 px-4 py-3 text-body text-[var(--text-primary)] outline-none focus:border-[var(--accent)] dark:bg-white/5"
          />

          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={name.trim().length === 0}>
              Save Skill
            </Button>
          </div>
        </GlassPanel>
      </motion.div>
    </div>
  );
}
