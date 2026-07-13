"use client";

import Link from "next/link";
import { Brain, Clock, GitBranch, LayoutGrid, Layers, MessageSquare, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export type RecoveryTab = "workspace" | "conversations" | "knowledge" | "timeline" | "graph" | "skills" | "settings";

interface TabBarProps {
  active: RecoveryTab;
  onChange: (tab: RecoveryTab) => void;
  onOpenOnboarding: () => void;
}

const TABS: { key: RecoveryTab; label: string; icon: typeof LayoutGrid }[] = [
  { key: "workspace", label: "Workspace", icon: LayoutGrid },
  { key: "conversations", label: "Conversations", icon: MessageSquare },
  { key: "knowledge", label: "Knowledge", icon: Brain },
  { key: "timeline", label: "Timeline", icon: Clock },
  { key: "graph", label: "Knowledge Graph", icon: GitBranch },
  { key: "skills", label: "Skills", icon: Layers },
];

export function TabBar({ active, onChange, onOpenOnboarding }: TabBarProps) {
  return (
    <div 
      className="flex overflow-x-auto md:flex-wrap items-center gap-1.5 rounded-full border-2 border-black bg-white p-1 shadow-[2px_2px_0px_rgba(0,0,0,1)] max-w-full whitespace-nowrap [&::-webkit-scrollbar]:hidden"
      style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
    >
      {/* About Us Link */}
      <Link
        href="/about"
        className="flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-black tracking-wide uppercase transition-all duration-150 text-black/60 hover:text-black border border-transparent shrink-0"
      >
        About Us
      </Link>

      {/* Dashboard Link */}
      <Link
        href="/"
        className="flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-black tracking-wide uppercase transition-all duration-150 text-black/60 hover:text-black border border-transparent shrink-0"
      >
        Dashboard
      </Link>

      {/* Create .md Button */}
      <button
        type="button"
        onClick={onOpenOnboarding}
        className="flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-black tracking-wide uppercase transition-all duration-150 text-black/60 hover:text-black border border-transparent shrink-0"
      >
        <Sparkles className="h-3.5 w-3.5 fill-current shrink-0" strokeWidth={2.5} />
        Create .md
      </button>

      {/* Vertical Divider */}
      <div className="h-6 w-[2px] bg-black/10 mx-1.5 self-center shrink-0" />

      {/* Main Tabs */}
      {TABS.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onChange(tab.key)}
          className={cn(
            "flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-black tracking-wide uppercase transition-all duration-150 shrink-0",
            active === tab.key && active !== "settings"
              ? "bg-[#B8FF33] text-black border border-black shadow-[1px_1px_0px_rgba(0,0,0,1)] animate-none"
              : "text-black/60 hover:text-black border border-transparent"
          )}
        >
          <tab.icon className="h-3.5 w-3.5 shrink-0" />
          {tab.label}
        </button>
      ))}
    </div>
  );
}
