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
    <div className="flex flex-wrap items-center gap-1.5 rounded-full border-2 border-black bg-white p-1 shadow-[2px_2px_0px_rgba(0,0,0,1)]">
      {TABS.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onChange(tab.key)}
          className={cn(
            "flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-black tracking-wide uppercase transition-all duration-150",
            active === tab.key
              ? "bg-[#B8FF33] text-black border border-black shadow-[1px_1px_0px_rgba(0,0,0,1)] animate-none"
              : "text-black/60 hover:text-black border border-transparent"
          )}
        >
          <tab.icon className="h-3.5 w-3.5" />
          {tab.label}
        </button>
      ))}
    </div>
  );
}
