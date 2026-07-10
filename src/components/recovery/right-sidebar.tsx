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
    <div className="bg-white border-2 border-black p-5 rounded-2xl shadow-[3px_3px_0px_rgba(0,0,0,1)]">
      <div className="mb-4 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-black">
        <div className="w-6 h-6 rounded-full bg-[#B8FF33] border-2 border-black flex items-center justify-center shadow-[1px_1px_0px_rgba(0,0,0,1)] shrink-0">
          <Icon className="h-3.5 w-3.5 text-black" strokeWidth={2.5} />
        </div>
        {title}
      </div>
      {children}
    </div>
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
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-4 bg-[#FAFAFA]">
      <WidgetShell icon={ArrowRight} title="Continue Where You Left Off">
        {continuable.length === 0 && (
          <p className="text-xs font-semibold text-black/50">Everything is caught up.</p>
        )}
        <div className="space-y-3">
          {continuable.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onSelect(c.id)}
              className="block w-full rounded-xl border-2 border-black bg-white p-3 text-left shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_rgba(0,0,0,1)] transition-all duration-150"
            >
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <span className="truncate text-xs font-black uppercase tracking-wide text-black">
                  {c.title}
                </span>
                <StatusBadge status={c.status} />
              </div>
              <p className="line-clamp-2 text-[11px] font-semibold text-black/60">
                {suggestedNextAction(c)}
              </p>
            </button>
          ))}
        </div>
      </WidgetShell>

      {selected && (
        <WidgetShell icon={Sparkles} title="Suggested Next Action">
          <p className="text-xs font-semibold text-black/80 leading-relaxed bg-[#B8FF33]/10 p-3 rounded-lg border border-black/10">{suggestedNextAction(selected)}</p>
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
                className="flex w-full items-center justify-between rounded-xl border-2 border-black bg-white p-2.5 shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 hover:shadow-[3.5px_3.5px_0px_rgba(0,0,0,1)] transition-all duration-150"
              >
                <span className="truncate text-xs font-black uppercase tracking-wide text-black">
                  {conversation.title}
                </span>
                <span className="ml-2 shrink-0 rounded-full border-2 border-black bg-[#FED7AA] px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-black shadow-[1px_1px_0px_rgba(0,0,0,1)]">
                  {Math.round(score * 100)}% Match
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
                className="block w-full truncate rounded-xl border-2 border-black bg-white p-2.5 shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 hover:shadow-[3.5px_3.5px_0px_rgba(0,0,0,1)] transition-all duration-150 text-left text-xs font-black uppercase tracking-wide text-black"
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
              <div key={p.name} className="bg-white border-2 border-black p-3 rounded-xl shadow-[2px_2px_0px_rgba(0,0,0,1)]">
                <div className="mb-2 flex items-center justify-between text-xs font-black uppercase tracking-wider text-black">
                  <span className="truncate">{p.name}</span>
                  <span className="text-[10px] text-black/50">{p.conversationIds.length} threads</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-black/5 border border-black">
                  <div
                    className="h-full rounded-full bg-[#B8FF33]"
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
          <p className="text-xs font-semibold text-black/50">No generated files yet.</p>
        ) : (
          <ul className="space-y-2">
            {recentFiles.map(({ file, conversation }) => (
              <li key={`${conversation.id}-${file}`} className="truncate text-xs font-semibold text-black/75 bg-white border-2 border-black p-2.5 rounded-xl shadow-[2px_2px_0px_rgba(0,0,0,1)]">
                {file} <span className="text-[10px] font-black uppercase tracking-wider text-black/40 block mt-0.5">— {conversation.title}</span>
              </li>
            ))}
          </ul>
        )}
      </WidgetShell>
    </div>
  );
}
