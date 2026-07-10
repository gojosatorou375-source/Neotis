"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { BookmarkPlus, X } from "lucide-react";
import { GlassPanel } from "@/components/glass-panel";
import { Button } from "@/components/ui/button";

interface SavePersonaDialogProps {
  suggestedName?: string;
  existingNames: string[];
  onSave: (name: string, tags: string[]) => void;
  onClose: () => void;
}

const PRESETS = ["Coder", "Writer", "Researcher", "Product Manager", "Student"];

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

export function SavePersonaDialog({
  suggestedName,
  existingNames,
  onSave,
  onClose,
}: SavePersonaDialogProps) {
  const [name, setName] = useState(suggestedName ?? "");
  const [tagsInput, setTagsInput] = useState("");
  const overwriting = existingNames.some(
    (n) => n.toLowerCase() === name.trim().toLowerCase()
  );

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
                <BookmarkPlus className="h-5 w-5 text-[var(--accent)]" strokeWidth={1.75} />
              </div>
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                Save this persona
              </h2>
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
            placeholder='e.g. "Coder", "Writer", "Researcher"'
            className="mb-2 w-full rounded-2xl border border-[var(--border)] bg-white/40 px-4 py-3 text-body text-[var(--text-primary)] outline-none focus:border-[var(--accent)] dark:bg-white/5"
          />

          {overwriting && (
            <p className="mb-3 text-small text-amber-500">
              A persona named &quot;{name.trim()}&quot; already exists — saving will update it and
              keep the previous version in its history.
            </p>
          )}

          <label className="mb-1.5 block text-small font-medium text-[var(--text-secondary)]">
            Tags <span className="font-normal text-[var(--text-secondary)]/70">(optional, comma-separated)</span>
          </label>
          <input
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
            }}
            placeholder="e.g. work, technical, concise"
            className="mb-6 w-full rounded-2xl border border-[var(--border)] bg-white/40 px-4 py-3 text-body text-[var(--text-primary)] outline-none focus:border-[var(--accent)] dark:bg-white/5"
          />

          <div className="mb-6 flex flex-wrap gap-2">
            {PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setName(preset)}
                className="rounded-full bg-black/5 px-3 py-1.5 text-[12px] text-[var(--text-secondary)] hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10"
              >
                {preset}
              </button>
            ))}
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={name.trim().length === 0}>
              {overwriting ? "Update persona" : "Save persona"}
            </Button>
          </div>
        </GlassPanel>
      </motion.div>
    </div>
  );
}
