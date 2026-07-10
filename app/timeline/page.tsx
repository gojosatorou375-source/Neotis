"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Clock3, Home, Sparkles } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { GlassPanel } from "@/components/glass-panel";
import { ConversationViewDialog } from "@/components/conversations/conversation-view-dialog";
import { useConversations } from "@/lib/conversations/use-conversations";
import { providerColor, providerLabel } from "@/lib/conversations/provider-style";
import type { Conversation } from "@/types/conversation";

function dayKey(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

function dayLabel(key: string): string {
  const date = new Date(`${key}T00:00:00`);
  const today = dayKey(new Date().toISOString());
  const yesterday = dayKey(new Date(Date.now() - 86400000).toISOString());
  if (key === today) return "Today";
  if (key === yesterday) return "Yesterday";
  return date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
}

export default function TimelinePage() {
  const { hydrated, conversations } = useConversations();
  const [viewing, setViewing] = useState<Conversation | null>(null);

  const groups = useMemo(() => {
    const sorted = [...conversations].sort(
      (a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime()
    );
    const map = new Map<string, Conversation[]>();
    for (const c of sorted) {
      const key = dayKey(c.capturedAt);
      const bucket = map.get(key) ?? [];
      bucket.push(c);
      map.set(key, bucket);
    }
    return Array.from(map.entries());
  }, [conversations]);

  if (!hydrated) return null;

  return (
    <div className="relative z-10 min-h-screen">
      <header className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4 sm:px-10">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-white/30 px-3 py-1.5 text-small font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] dark:bg-white/5"
          >
            <Home className="h-3.5 w-3.5" />
            Home
          </Link>
          <span className="text-[var(--border)]">/</span>
          <span className="text-small font-semibold text-[var(--text-primary)]">Timeline</span>
        </div>
        <ThemeToggle />
      </header>

      <div className="mx-auto max-w-[760px] px-6 py-14 sm:px-10">
        <div className="mb-12 flex flex-col items-center text-center">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--accent)]/15">
            <Clock3 className="h-6 w-6 text-[var(--accent)]" strokeWidth={1.75} />
          </div>
          <h1 className="text-section text-[var(--text-primary)]">Your AI timeline</h1>
          <p className="mt-3 max-w-[520px] text-body text-[var(--text-secondary)]">
            Every captured conversation, in order, across every provider.
          </p>
        </div>

        {groups.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-xl3 border border-dashed border-[var(--border)] py-20 text-center">
            <Sparkles className="h-6 w-6 text-[var(--text-secondary)]" />
            <p className="text-body text-[var(--text-secondary)]">
              Nothing captured yet. Head to{" "}
              <Link href="/conversations" className="font-medium text-[var(--accent)]">
                Conversations
              </Link>{" "}
              to import your first one.
            </p>
          </div>
        ) : (
          <div className="relative">
            <div className="absolute left-[7px] top-2 bottom-2 w-px bg-[var(--border)]" aria-hidden />
            <div className="flex flex-col gap-10">
              {groups.map(([key, items]) => (
                <div key={key}>
                  <div className="relative mb-4 flex items-center gap-3 pl-0">
                    <span className="z-10 h-3.5 w-3.5 rounded-full bg-[var(--accent)] ring-4 ring-[var(--bg)]" />
                    <h2 className="text-small font-semibold text-[var(--text-primary)]">{dayLabel(key)}</h2>
                  </div>
                  <div className="ml-6 flex flex-col gap-3">
                    <AnimatePresence>
                      {items.map((c) => (
                        <motion.div
                          key={c.id}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0 }}
                        >
                          <GlassPanel
                            className="cursor-pointer p-5"
                            whileHover={{ y: -2 }}
                            onClick={() => setViewing(c)}
                          >
                            <div className="mb-1.5 flex items-center justify-between gap-3">
                              <h3 className="truncate text-body font-medium text-[var(--text-primary)]">
                                {c.title}
                              </h3>
                              <span
                                className="flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium"
                                style={{
                                  background: `${providerColor(c.provider)}1a`,
                                  color: providerColor(c.provider),
                                }}
                              >
                                <span
                                  className="h-1.5 w-1.5 rounded-full"
                                  style={{ background: providerColor(c.provider) }}
                                />
                                {providerLabel(c.provider)}
                              </span>
                            </div>
                            <p className="mb-2 text-small text-[var(--text-secondary)]">
                              {c.insights?.summary || `${c.messages.length} messages`}
                            </p>
                            {c.insights && c.insights.topics.length > 0 && (
                              <div className="flex flex-wrap gap-1.5">
                                {c.insights.topics.map((topic) => (
                                  <span
                                    key={topic}
                                    className="rounded-full bg-[var(--accent)]/10 px-2 py-0.5 text-[10.5px] font-medium text-[var(--accent)]"
                                  >
                                    {topic}
                                  </span>
                                ))}
                              </div>
                            )}
                          </GlassPanel>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {viewing && <ConversationViewDialog conversation={viewing} onClose={() => setViewing(null)} />}
      </AnimatePresence>
    </div>
  );
}
