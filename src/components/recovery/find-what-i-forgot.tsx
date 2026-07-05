"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Search, Sparkles } from "lucide-react";
import { GlassPanel } from "@/components/glass-panel";
import { StatusBadge } from "@/components/recovery/status-badge";
import { PLATFORM_META } from "@/lib/recovery/platform-meta";
import { semanticSearch } from "@/lib/recovery/derive";
import type { Conversation } from "@/types/recovery";

interface FindWhatIForgotProps {
  conversations: Conversation[];
  onSelect: (id: string) => void;
}

const EXAMPLES = [
  "I remember asking about taxes",
  "React project",
  "Logo prompt",
  "Pricing comparison",
  "Landing page",
];

export function FindWhatIForgot({ conversations, onSelect }: FindWhatIForgotProps) {
  const [query, setQuery] = useState("");
  const results = useMemo(() => semanticSearch(query, conversations, 6), [query, conversations]);

  return (
    <GlassPanel className="p-6">
      <div className="mb-4 flex items-center gap-2 text-small font-semibold text-[var(--text-primary)]">
        <Sparkles className="h-4 w-4 text-[var(--accent)]" />
        Find What I Forgot
      </div>
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Describe anything you remember..."
          aria-label="Find what I forgot"
          className="w-full rounded-2xl border border-[var(--border)] bg-white/40 py-3 pl-11 pr-4 text-body text-[var(--text-primary)] outline-none focus:border-[var(--accent)] dark:bg-white/5"
        />
      </div>

      {query.trim().length === 0 && (
        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => setQuery(e)}
              className="rounded-full bg-black/5 px-3 py-1.5 text-[12px] text-[var(--text-secondary)] hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10"
            >
              {e}
            </button>
          ))}
        </div>
      )}

      <AnimatePresence>
        {results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 space-y-2 overflow-hidden"
          >
            {results.map(({ conversation, score }) => {
              const meta = PLATFORM_META[conversation.platform];
              const Icon = meta.icon;
              return (
                <button
                  key={conversation.id}
                  type="button"
                  onClick={() => onSelect(conversation.id)}
                  className="flex w-full items-start justify-between gap-3 rounded-2xl border border-[var(--border)] bg-white/30 p-4 text-left hover:bg-white/50 dark:bg-white/5 dark:hover:bg-white/10"
                >
                  <div className="min-w-0">
                    <div className="mb-1 flex items-center gap-2">
                      <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: meta.color }} />
                      <span className="truncate text-small font-medium text-[var(--text-primary)]">
                        {conversation.title}
                      </span>
                      <StatusBadge status={conversation.status} />
                    </div>
                    <p className="line-clamp-1 text-[12px] text-[var(--text-secondary)]">
                      {conversation.summary}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-[var(--accent)]/15 px-2 py-1 text-[11px] font-semibold text-[var(--accent)]">
                    {Math.round(Math.min(score, 1) * 100)}% confident
                  </span>
                </button>
              );
            })}
          </motion.div>
        )}
        {query.trim().length > 0 && results.length === 0 && (
          <p className="mt-4 text-small text-[var(--text-secondary)]">
            Nothing matched yet — try describing it differently.
          </p>
        )}
      </AnimatePresence>
    </GlassPanel>
  );
}
