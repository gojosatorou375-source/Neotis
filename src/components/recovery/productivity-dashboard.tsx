"use client";

import { Clock3, Copy, FolderCheck, RotateCcw, Sparkles } from "lucide-react";
import { GlassPanel } from "@/components/glass-panel";
import type { ProductivityStats } from "@/types/recovery";

interface ProductivityDashboardProps {
  stats: ProductivityStats;
}

export function ProductivityDashboard({ stats }: ProductivityDashboardProps) {
  const items = [
    { icon: Sparkles, label: "Recovered Conversations", value: stats.recoveredConversations },
    { icon: Copy, label: "Duplicate Work Prevented", value: stats.duplicateWorkPrevented },
    { icon: FolderCheck, label: "Projects Resumed", value: stats.projectsResumed },
    { icon: Clock3, label: "Hours Saved", value: `${stats.hoursSaved}h` },
    { icon: RotateCcw, label: "Repeated Prompts Avoided", value: stats.repeatedPromptsAvoided },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      {items.map((item) => (
        <GlassPanel key={item.label} className="flex flex-col items-start gap-2 p-4">
          <item.icon className="h-4 w-4 text-[var(--accent)]" strokeWidth={1.75} />
          <span className="text-lg font-semibold text-[var(--text-primary)]">{item.value}</span>
          <span className="text-[11px] leading-tight text-[var(--text-secondary)]">{item.label}</span>
        </GlassPanel>
      ))}
    </div>
  );
}
