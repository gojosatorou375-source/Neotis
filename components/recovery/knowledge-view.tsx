"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Brain, RefreshCw, Search, Trash2 } from "lucide-react";
import { GlassPanel } from "@/components/glass-panel";
import { Button } from "@/components/ui/button";
import {
  KNOWLEDGE_CATEGORIES,
  KNOWLEDGE_CATEGORY_LABELS,
  type KnowledgeCategory,
  type KnowledgeItem,
} from "@/types/knowledge";
import type { Conversation } from "@/types/recovery";

interface KnowledgeViewProps {
  conversations: Conversation[];
  items: KnowledgeItem[];
  onExtract: (conversationId: string, conversationTitle: string) => void;
  onExtractAll: () => void;
  onDeleteItem: (id: string) => void;
}

/**
 * FEATURE 1 — AI Knowledge Extractor dashboard tab. Shows every structured
 * KnowledgeItem pulled out of conversations so far, grouped and filterable
 * by category, alongside a per-conversation "Extract" action.
 */
export function KnowledgeView({ conversations, items, onExtract, onExtractAll, onDeleteItem }: KnowledgeViewProps) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<KnowledgeCategory | null>(null);

  const categoryCounts = useMemo(() => {
    const counts = new Map<KnowledgeCategory, number>();
    for (const item of items) counts.set(item.category, (counts.get(item.category) ?? 0) + 1);
    return counts;
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items
      .filter((i) => !activeCategory || i.category === activeCategory)
      .filter(
        (i) =>
          q.length === 0 ||
          i.title.toLowerCase().includes(q) ||
          i.description.toLowerCase().includes(q) ||
          i.conversationTitle.toLowerCase().includes(q)
      )
      .sort((a, b) => b.confidence - a.confidence);
  }, [items, query, activeCategory]);

  return (
    <div className="flex-1 overflow-y-auto p-6 sm:p-10">
      <div className="mx-auto max-w-[1000px]">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="mb-1 flex items-center gap-2 text-small font-semibold text-[var(--text-primary)]">
              <Brain className="h-4 w-4 text-[var(--accent)]" />
              Knowledge
            </div>
            <p className="text-small text-[var(--text-secondary)]">
              Structured facts extracted from your conversations — features, APIs, decisions, rules — never the raw
              text itself.
            </p>
          </div>
          {conversations.length > 0 && (
            <Button onClick={onExtractAll}>
              <RefreshCw className="h-4 w-4" />
              Extract from all conversations
            </Button>
          )}
        </div>

        {conversations.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-xl3 border border-dashed border-[var(--border)] py-20 text-center">
            <Brain className="h-6 w-6 text-[var(--text-secondary)]" />
            <p className="max-w-[420px] text-body text-[var(--text-secondary)]">
              No conversations yet. Import or capture one first, then come back here to extract knowledge from it.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-5 flex flex-wrap gap-2">
              {conversations.map((c) => (
                <Button key={c.id} size="sm" variant="glass" onClick={() => onExtract(c.id, c.title)}>
                  <RefreshCw className="h-3 w-3" />
                  Extract: {c.title.length > 28 ? `${c.title.slice(0, 28)}…` : c.title}
                </Button>
              ))}
            </div>

            {items.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-xl3 border border-dashed border-[var(--border)] py-16 text-center">
                <p className="max-w-[420px] text-body text-[var(--text-secondary)]">
                  No knowledge extracted yet. Click a conversation above (or &quot;Extract from all
                  conversations&quot;) to pull structured facts out of it.
                </p>
              </div>
            ) : (
              <>
                <div className="mb-6 flex flex-col gap-4">
                  <div className="relative mx-auto w-full max-w-[440px]">
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]" />
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search knowledge…"
                      className="w-full rounded-full border border-[var(--border)] bg-white/40 py-2.5 pl-11 pr-4 text-small text-[var(--text-primary)] outline-none focus:border-[var(--accent)] dark:bg-white/5"
                    />
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveCategory(null)}
                      className={`rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors ${
                        activeCategory === null
                          ? "bg-[var(--accent)] text-white"
                          : "bg-black/5 text-[var(--text-secondary)] hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10"
                      }`}
                    >
                      All ({items.length})
                    </button>
                    {KNOWLEDGE_CATEGORIES.filter((c) => (categoryCounts.get(c) ?? 0) > 0).map((category) => (
                      <button
                        key={category}
                        type="button"
                        onClick={() => setActiveCategory(activeCategory === category ? null : category)}
                        className={`rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors ${
                          activeCategory === category
                            ? "bg-[var(--accent)] text-white"
                            : "bg-black/5 text-[var(--text-secondary)] hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10"
                        }`}
                      >
                        {KNOWLEDGE_CATEGORY_LABELS[category]} ({categoryCounts.get(category)})
                      </button>
                    ))}
                  </div>
                </div>

                {filtered.length === 0 ? (
                  <p className="py-10 text-center text-small text-[var(--text-secondary)]">
                    Nothing matches your search or filter.
                  </p>
                ) : (
                  <motion.div layout className="flex flex-col gap-3">
                    <AnimatePresence>
                      {filtered.map((item) => (
                        <motion.div
                          key={item.id}
                          layout
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                        >
                          <GlassPanel className="p-5">
                            <div className="mb-2 flex items-start justify-between gap-3">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-full bg-[var(--accent)]/10 px-2.5 py-1 text-[11px] font-medium text-[var(--accent)]">
                                  {KNOWLEDGE_CATEGORY_LABELS[item.category]}
                                </span>
                                <span className="text-[11px] text-[var(--text-secondary)]">
                                  from &quot;{item.conversationTitle}&quot;
                                </span>
                              </div>
                              <button
                                type="button"
                                aria-label="Delete knowledge item"
                                onClick={() => onDeleteItem(item.id)}
                                className="rounded-full p-1.5 text-[var(--text-secondary)] hover:bg-red-500/10 hover:text-red-500"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            <p className="mb-3 text-small text-[var(--text-primary)]">{item.description}</p>
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-24 overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
                                <div
                                  className="h-full rounded-full bg-[var(--accent)]"
                                  style={{ width: `${Math.round(item.confidence * 100)}%` }}
                                />
                              </div>
                              <span className="text-[11px] text-[var(--text-secondary)]">
                                {Math.round(item.confidence * 100)}% confidence
                              </span>
                            </div>
                          </GlassPanel>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </motion.div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
