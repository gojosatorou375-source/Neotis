"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Clock } from "lucide-react";
import { GlassPanel } from "@/components/glass-panel";
import { StatusBadge } from "@/components/recovery/status-badge";
import { PLATFORM_META } from "@/lib/recovery/platform-meta";
import { buildTimeline } from "@/lib/recovery/timeline";
import type { Conversation } from "@/types/recovery";

interface TimelineViewProps {
  conversations: Conversation[];
  onSelectConversation: (id: string) => void;
}

export function TimelineView({ conversations, onSelectConversation }: TimelineViewProps) {
  const buckets = useMemo(() => buildTimeline(conversations), [conversations]);
  const byId = useMemo(() => new Map(conversations.map((c) => [c.id, c])), [conversations]);

  if (buckets.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-10 text-center text-body text-[var(--text-secondary)]">
        Nothing to show yet — import a conversation to start building your timeline.
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 sm:p-10">
      <div className="mx-auto max-w-[760px]">
        <div className="mb-6 flex items-center gap-2 text-small font-semibold text-[var(--text-primary)]">
          <Clock className="h-4 w-4 text-[var(--accent)]" />
          Timeline — everything you&apos;ve learned
        </div>

        {buckets.map((bucket) => (
          <motion.div
            key={bucket.key}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mb-8"
          >
            <h2 className="mb-3 text-body font-semibold text-[var(--text-primary)]">{bucket.key}</h2>
            <div className="space-y-3">
              {bucket.conversationIds.map((id) => {
                const c = byId.get(id);
                if (!c) return null;
                const meta = PLATFORM_META[c.platform];
                const Icon = meta.icon;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => onSelectConversation(id)}
                    className="block w-full text-left"
                  >
                    <GlassPanel className="flex items-center gap-4 p-4" whileHover={{ x: 3 }}>
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--accent)]/10">
                        <Icon className="h-4 w-4" style={{ color: meta.color }} strokeWidth={1.75} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-small font-medium text-[var(--text-primary)]">
                          {c.title}
                        </p>
                        <p className="truncate text-[11px] text-[var(--text-secondary)]">
                          {c.platform} · {c.project} ·{" "}
                          {new Date(c.createdAt).toLocaleTimeString("en-US", {
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      <StatusBadge status={c.status} />
                    </GlassPanel>
                  </button>
                );
              })}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
