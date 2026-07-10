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
    <div className="bg-white border-2 border-black p-6 rounded-2xl shadow-[4px_4px_0px_rgba(0,0,0,1)]">
      <div className="mb-4 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-black/50">
        <div className="w-5 h-5 rounded-full flex items-center justify-center bg-[#B8FF33] border-2 border-black shadow-[1px_1px_0px_rgba(0,0,0,1)]">
          <Sparkles className="h-3 w-3 text-black" strokeWidth={3} />
        </div>
        Find What I Forgot
      </div>
      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-black/60" strokeWidth={2.5} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Describe anything you remember..."
          aria-label="Find what I forgot"
          className="w-full rounded-full border-2 border-black bg-white py-3 pl-11 pr-4 text-sm font-semibold text-black placeholder-black/40 outline-none focus:ring-4 focus:ring-[#B8FF33]/30 transition-all duration-150"
        />
      </div>

      {query.trim().length === 0 && (
        <div className="flex flex-wrap gap-2.5">
          {EXAMPLES.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => setQuery(e)}
              className="rounded-full border-2 border-black bg-[#B8FF33] px-3.5 py-1.5 text-[10px] font-black uppercase tracking-wider text-black hover:-translate-y-0.5 hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-y-0 active:shadow-none transition-all duration-150"
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
            className="mt-4 space-y-3 overflow-hidden"
          >
            {results.map(({ conversation, score }) => {
              const meta = PLATFORM_META[conversation.platform];
              const Icon = meta.icon;
              return (
                <button
                  key={conversation.id}
                  type="button"
                  onClick={() => onSelect(conversation.id)}
                  className="flex w-full items-start justify-between gap-4 rounded-xl border-2 border-black bg-white p-4 text-left shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_rgba(0,0,0,1)] transition-all duration-150"
                >
                  <div className="min-w-0">
                    <div className="mb-1.5 flex items-center gap-2">
                      <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: meta.color }} />
                      <span className="truncate text-xs font-black uppercase tracking-wide text-black">
                        {conversation.title}
                      </span>
                      <StatusBadge status={conversation.status} />
                    </div>
                    <p className="line-clamp-1 text-[11px] font-semibold text-black/60">
                      {conversation.summary}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full border-2 border-black bg-[#B8FF33] px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-black shadow-[1px_1px_0px_rgba(0,0,0,1)]">
                    {Math.round(Math.min(score, 1) * 100)}% Confident
                  </span>
                </button>
              );
            })}
          </motion.div>
        )}
        {query.trim().length > 0 && results.length === 0 && (
          <p className="mt-4 text-xs font-black uppercase tracking-wider text-black/50">
            Nothing matched yet — try describing it differently.
          </p>
        )}
      </AnimatePresence>
    </div>
  );
}
