"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { PackagePlus, Search, X } from "lucide-react";
import { GlassPanel } from "@/components/glass-panel";
import { Button } from "@/components/ui/button";
import { PLATFORM_META } from "@/lib/recovery/platform-meta";
import type { Conversation } from "@/types/recovery";

interface CapsuleCreateDialogProps {
  conversations: Conversation[];
  onCreate: (name: string, conversationIds: string[]) => void;
  onClose: () => void;
}

export function CapsuleCreateDialog({
  conversations,
  onCreate,
  onClose,
}: CapsuleCreateDialogProps) {
  const [name, setName] = useState("");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    if (query.trim().length === 0) return conversations;
    const q = query.toLowerCase();
    return conversations.filter(
      (c) => c.title.toLowerCase().includes(q) || c.project.toLowerCase().includes(q)
    );
  }, [conversations, query]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCreate = () => {
    if (selected.size === 0 || name.trim().length === 0) return;
    onCreate(name.trim(), [...selected]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-6 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94 }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
        className="w-full max-w-[620px]"
      >
        <GlassPanel className="p-8">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent)]/15">
                <PackagePlus className="h-5 w-5 text-[var(--accent)]" strokeWidth={1.75} />
              </div>
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Create a Capsule</h2>
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
            Capsule name
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder='e.g. "Auth System Context"'
            className="mb-5 w-full rounded-2xl border border-[var(--border)] bg-white/40 px-4 py-3 text-body text-[var(--text-primary)] outline-none focus:border-[var(--accent)] dark:bg-white/5"
          />

          <label className="mb-1.5 block text-small font-medium text-[var(--text-secondary)]">
            Select conversations to distill ({selected.size} selected)
          </label>
          <div className="relative mb-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter by title or project..."
              className="w-full rounded-xl border border-[var(--border)] bg-white/40 py-2 pl-9 pr-3 text-small text-[var(--text-primary)] outline-none focus:border-[var(--accent)] dark:bg-white/5"
            />
          </div>

          <div className="mb-6 max-h-64 space-y-1.5 overflow-y-auto rounded-2xl border border-[var(--border)] p-2">
            {filtered.map((c) => {
              const meta = PLATFORM_META[c.platform];
              const Icon = meta.icon;
              const isSelected = selected.has(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggle(c.id)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors ${
                    isSelected ? "bg-[var(--accent)]/10" : "hover:bg-black/5 dark:hover:bg-white/5"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggle(c.id)}
                    className="h-4 w-4 shrink-0 accent-[var(--accent)]"
                  />
                  <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: meta.color }} />
                  <span className="min-w-0 flex-1 truncate text-small text-[var(--text-primary)]">
                    {c.title}
                  </span>
                  <span className="shrink-0 text-[11px] text-[var(--text-secondary)]">{c.project}</span>
                </button>
              );
            })}
            {filtered.length === 0 && (
              <p className="p-3 text-small text-[var(--text-secondary)]">No conversations match.</p>
            )}
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={selected.size === 0 || name.trim().length === 0}>
              Create Capsule
            </Button>
          </div>
        </GlassPanel>
      </motion.div>
    </div>
  );
}
