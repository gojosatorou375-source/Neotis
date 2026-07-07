"use client";

import { Brain, Clock, GitBranch, LayoutGrid, Layers, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

export type RecoveryTab = "workspace" | "conversations" | "knowledge" | "timeline" | "graph" | "skills";

interface TabBarProps {
  active: RecoveryTab;
  onChange: (tab: RecoveryTab) => void;
}

const TABS: { key: RecoveryTab; label: string; icon: typeof LayoutGrid }[] = [
  { key: "workspace", label: "Workspace", icon: LayoutGrid },
  { key: "conversations", label: "Conversations", icon: MessageSquare },
  { key: "knowledge", label: "Knowledge", icon: Brain },
  { key: "timeline", label: "Timeline", icon: Clock },
  { key: "graph", label: "Knowledge Graph", icon: GitBranch },
  { key: "skills", label: "Skills", icon: Layers },
];

export function TabBar({ active, onChange }: TabBarProps) {
  return (
    <div className="flex items-center gap-1 rounded-full bg-black/5 p-1 dark:bg-white/5">
      {TABS.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onChange(tab.key)}
          className={cn(
            "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-small font-medium transition-colors",
            active === tab.key
              ? "bg-white text-[var(--text-primary)] shadow-sm dark:bg-white/15"
              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          )}
        >
          <tab.icon className="h-3.5 w-3.5" />
          {tab.label}
        </button>
      ))}
    </div>
  );
}
