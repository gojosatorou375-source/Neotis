"use client";

import { ArrowRight, Clock, Copy, FileStack, Sparkles, TrendingUp } from "lucide-react";
import { GlassPanel } from "@/components/glass-panel";
import { StatusBadge } from "@/components/recovery/status-badge";
import type { Conversation, ProjectSummary } from "@/types/recovery";
import {
  continueWhereLeftOff,
  findSimilarConversations,
  relatedConversations,
  suggestedNextAction,
} from "@/lib/recovery/derive";

interface RightSidebarProps {
  conversations: Conversation[];
  projects: ProjectSummary[];
  selected: Conversation | null;
  onSelect: (id: string) => void;
}

function WidgetShell({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Sparkles;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <GlassPanel className="p-5">
      <div className="mb-3 flex items-center gap-2 text-small font-semibold text-[var(--text-primary)]">
        <Icon className="h-4 w-4 text-[var(--accent)]" />
        {title}
      </div>
      {children}
    </GlassPanel>
  );
}

export function RightSidebar({
  conversations,
  projects,
  selected,
  onSelect,
}: RightSidebarProps) {
  const continuable = continueWhereLeftOff(conversations).slice(0, 3);
  const duplicates = selected
    ? findSimilarConversations(selected, conversations, selected.id)
    : [];
  const related = selected ? relatedConversations(selected, conversations, 4) : [];
  const recentFiles = conversations
    .flatMap((c) => c.files.map((f) => ({ file: f, conversation: c })))
    .slice(0, 5);

  const topProjects = [...projects].slice(0, 4);

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-4">
      <WidgetShell icon={ArrowRight} title="Continue Where You Left Off">
        {continuable.length === 0 && (
          <p className="text-small text-[var(--text-secondary)]">Everything is caught up.</p>
        )}
        <div className="space-y-3">
          {continuable.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onSelect(c.id)}
              className="block w-full rounded-xl border border-[var(--border)] bg-white/30 p-3 text-left hover:bg-white/50 dark:bg-white/5 dark:hover:bg-white/10"
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="truncate text-small font-medium text-[var(--text-primary)]">
                  {c.title}
                </span>
                <StatusBadge status={c.status} />
              </div>
              <p className="line-clamp-2 text-[11px] text-[var(--text-secondary)]">
                {suggestedNextAction(c)}
              </p>
            </button>
          ))}
        </div>
      </WidgetShell>

      {selected && (
        <WidgetShell icon={Sparkles} title="Suggested Next Action">
          <p className="text-small text-[var(--text-primary)]">{suggestedNextAction(selected)}</p>
        </WidgetShell>
      )}

      {duplicates.length > 0 && (
        <WidgetShell icon={Copy} title="Duplicate Detection">
          <div className="space-y-2">
            {duplicates.map(({ conversation, score }) => (
              <button
                key={conversation.id}
                type="button"
                onClick={() => onSelect(conversation.id)}
                className="flex w-full items-center justify-between rounded-xl px-2 py-1.5 text-left hover:bg-black/5 dark:hover:bg-white/5"
              >
                <span className="truncate text-small text-[var(--text-primary)]">
                  {conversation.title}
                </span>
                <span className="ml-2 shrink-0 text-[11px] font-semibold text-amber-500">
                  {Math.round(score * 100)}%
                </span>
              </button>
            ))}
          </div>
        </WidgetShell>
      )}

      {related.length > 0 && (
        <WidgetShell icon={TrendingUp} title="Related Conversations">
          <div className="space-y-2">
            {related.map(({ conversation }) => (
              <button
                key={conversation.id}
                type="button"
                onClick={() => onSelect(conversation.id)}
                className="block w-full truncate rounded-xl px-2 py-1.5 text-left text-small text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5"
              >
                {conversation.title}
              </button>
            ))}
          </div>
        </WidgetShell>
      )}

      <WidgetShell icon={Clock} title="Project Progress">
        <div className="space-y-3">
          {topProjects.map((p) => {
            const pct = p.totalTasks === 0 ? 100 : Math.round((p.completedTasks / Math.max(p.totalTasks, p.completedTasks || 1)) * 100);
            return (
              <div key={p.name}>
                <div className="mb-1 flex items-center justify-between text-small text-[var(--text-primary)]">
                  <span className="truncate">{p.name}</span>
                  <span className="text-[11px] text-[var(--text-secondary)]">{p.conversationIds.length} threads</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
                  <div
                    className="h-full rounded-full bg-[var(--accent)]"
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </WidgetShell>

      <WidgetShell icon={FileStack} title="Recent Files">
        {recentFiles.length === 0 ? (
          <p className="text-small text-[var(--text-secondary)]">No generated files yet.</p>
        ) : (
          <ul className="space-y-1.5">
            {recentFiles.map(({ file, conversation }) => (
              <li key={`${conversation.id}-${file}`} className="truncate text-small text-[var(--text-secondary)]">
                {file} <span className="text-[11px]">— {conversation.title}</span>
              </li>
            ))}
          </ul>
        )}
      </WidgetShell>
    </div>
  );
}
