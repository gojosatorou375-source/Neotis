"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight,
  MoreHorizontal,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import type { Conversation, ConversationStatus } from "@/types/recovery";
import { PLATFORM_META } from "@/lib/recovery/platform-meta";
import { cn } from "@/lib/utils";

interface WorkspaceTreeProps {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onMove: (id: string, project: string) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
}

interface TreeNode {
  provider: string;
  years: Map<string, Map<string, Map<string, Conversation[]>>>;
}

function buildTree(conversations: Conversation[]): TreeNode[] {
  const byProvider = new Map<string, TreeNode>();

  for (const c of conversations) {
    if (!byProvider.has(c.platform)) {
      byProvider.set(c.platform, { provider: c.platform, years: new Map() });
    }
    const node = byProvider.get(c.platform)!;
    const date = new Date(c.createdAt);
    const year = String(date.getFullYear());
    const month = date.toLocaleString("en-US", { month: "long" });
    const day = date.toLocaleString("en-US", { day: "2-digit", month: "short" });

    if (!node.years.has(year)) node.years.set(year, new Map());
    const years = node.years.get(year)!;
    if (!years.has(month)) years.set(month, new Map());
    const months = years.get(month)!;
    if (!months.has(day)) months.set(day, []);
    months.get(day)!.push(c);
  }

  return [...byProvider.values()].sort((a, b) => a.provider.localeCompare(b.provider));
}

const STATUS_FILTERS: (ConversationStatus | "All")[] = [
  "All",
  "Completed",
  "In Progress",
  "Pending",
  "Archived",
];

export function WorkspaceTree({
  conversations,
  selectedId,
  onSelect,
  onRename,
  onMove,
  onArchive,
  onDelete,
}: WorkspaceTreeProps) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ConversationStatus | "All">("All");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return conversations.filter((c) => {
      if (statusFilter !== "All" && c.status !== statusFilter) return false;
      if (query.trim().length === 0) return true;
      const haystack = `${c.title} ${c.project} ${c.tags.join(" ")} ${c.keywords.join(" ")}`.toLowerCase();
      return haystack.includes(query.toLowerCase());
    });
  }, [conversations, statusFilter, query]);

  const tree = useMemo(() => buildTree(filtered), [filtered]);

  // Auto-expand every provider on first load so the tree isn't empty-looking.
  useEffect(() => {
    if (expanded.size === 0 && tree.length > 0) {
      setExpanded(new Set(tree.map((t) => t.provider)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tree.length]);

  const toggle = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="flex h-full w-full flex-col">
      <div className="border-b border-[var(--border)] p-4">
        <h2 className="mb-3 text-small font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
          AI Workspace Explorer
        </h2>
        <div className="relative mb-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search this workspace..."
            aria-label="Search conversations"
            className="w-full rounded-xl border border-[var(--border)] bg-white/40 py-2 pl-9 pr-3 text-small text-[var(--text-primary)] outline-none focus:border-[var(--accent)] dark:bg-white/5"
          />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <SlidersHorizontal className="h-3.5 w-3.5 shrink-0 text-[var(--text-secondary)]" />
          {STATUS_FILTERS.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={cn(
                "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
                statusFilter === status
                  ? "bg-[var(--accent)] text-white"
                  : "bg-black/5 text-[var(--text-secondary)] hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10"
              )}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {tree.length === 0 && (
          <p className="p-4 text-small text-[var(--text-secondary)]">
            No conversations match this filter.
          </p>
        )}
        {tree.map((providerNode) => {
          const providerKey = providerNode.provider;
          const meta = PLATFORM_META[providerNode.provider as keyof typeof PLATFORM_META];
          const Icon = meta?.icon;
          const isOpen = expanded.has(providerKey);
          const count = [...providerNode.years.values()].reduce(
            (sum, months) =>
              sum +
              [...months.values()].reduce(
                (s2, days) => s2 + [...days.values()].reduce((s3, c) => s3 + c.length, 0),
                0
              ),
            0
          );

          return (
            <div key={providerKey} className="mb-1">
              <button
                type="button"
                onClick={() => toggle(providerKey)}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-small font-semibold text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5"
                aria-expanded={isOpen}
              >
                <ChevronRight
                  className={cn("h-3.5 w-3.5 shrink-0 transition-transform text-[var(--text-secondary)]", isOpen && "rotate-90")}
                />
                {Icon && <Icon className="h-4 w-4 shrink-0" style={{ color: meta.color }} strokeWidth={1.75} />}
                <span className="flex-1 truncate">{providerKey}</span>
                <span className="text-[11px] font-normal text-[var(--text-secondary)]">{count}</span>
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden pl-4"
                  >
                    {[...providerNode.years.entries()]
                      .sort((a, b) => Number(b[0]) - Number(a[0]))
                      .map(([year, months]) => {
                        const yearKey = `${providerKey}-${year}`;
                        const yearOpen = expanded.has(yearKey);
                        return (
                          <div key={yearKey} className="mb-0.5">
                            <button
                              type="button"
                              onClick={() => toggle(yearKey)}
                              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-small text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5"
                              aria-expanded={yearOpen}
                            >
                              <ChevronRight className={cn("h-3 w-3 shrink-0 transition-transform text-[var(--text-secondary)]", yearOpen && "rotate-90")} />
                              {year}
                            </button>
                            <AnimatePresence initial={false}>
                              {yearOpen && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.22 }}
                                  className="overflow-hidden pl-4"
                                >
                                  {[...months.entries()].map(([month, days]) => {
                                    const monthKey = `${yearKey}-${month}`;
                                    const monthOpen = expanded.has(monthKey);
                                    return (
                                      <div key={monthKey} className="mb-0.5">
                                        <button
                                          type="button"
                                          onClick={() => toggle(monthKey)}
                                          className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-small text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/5"
                                          aria-expanded={monthOpen}
                                        >
                                          <ChevronRight className={cn("h-3 w-3 shrink-0 transition-transform", monthOpen && "rotate-90")} />
                                          {month}
                                        </button>
                                        <AnimatePresence initial={false}>
                                          {monthOpen && (
                                            <motion.div
                                              initial={{ height: 0, opacity: 0 }}
                                              animate={{ height: "auto", opacity: 1 }}
                                              exit={{ height: 0, opacity: 0 }}
                                              transition={{ duration: 0.2 }}
                                              className="overflow-hidden pl-4"
                                            >
                                              {[...days.entries()].map(([day, convos]) => {
                                                const dayKey = `${monthKey}-${day}`;
                                                const dayOpen = expanded.has(dayKey);
                                                const sorted = [...convos].sort(
                                                  (a, b) =>
                                                    new Date(b.createdAt).getTime() -
                                                    new Date(a.createdAt).getTime()
                                                );
                                                return (
                                                  <div key={dayKey} className="mb-0.5">
                                                    <button
                                                      type="button"
                                                      onClick={() => toggle(dayKey)}
                                                      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-small text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/5"
                                                      aria-expanded={dayOpen}
                                                    >
                                                      <ChevronRight className={cn("h-3 w-3 shrink-0 transition-transform", dayOpen && "rotate-90")} />
                                                      {day}
                                                    </button>
                                                    <AnimatePresence initial={false}>
                                                      {dayOpen && (
                                                        <motion.div
                                                          initial={{ height: 0, opacity: 0 }}
                                                          animate={{ height: "auto", opacity: 1 }}
                                                          exit={{ height: 0, opacity: 0 }}
                                                          transition={{ duration: 0.18 }}
                                                          className="overflow-hidden pl-4"
                                                        >
                                                          {sorted.map((c) => (
                                                            <div key={c.id} className="group relative">
                                                              <button
                                                                type="button"
                                                                onClick={() => onSelect(c.id)}
                                                                className={cn(
                                                                  "flex w-full flex-col rounded-lg px-3 py-2 text-left transition-colors",
                                                                  selectedId === c.id
                                                                    ? "bg-[var(--accent)]/10"
                                                                    : "hover:bg-black/5 dark:hover:bg-white/5"
                                                                )}
                                                              >
                                                                <span className="truncate pr-6 text-small font-medium text-[var(--text-primary)]">
                                                                  {c.title}
                                                                </span>
                                                                <span className="text-[11px] text-[var(--text-secondary)]">
                                                                  {new Date(c.createdAt).toLocaleTimeString("en-US", {
                                                                    hour: "numeric",
                                                                    minute: "2-digit",
                                                                  })}
                                                                </span>
                                                              </button>
                                                              <button
                                                                type="button"
                                                                aria-label="Conversation actions"
                                                                onClick={(e) => {
                                                                  e.stopPropagation();
                                                                  setMenuOpenId(menuOpenId === c.id ? null : c.id);
                                                                }}
                                                                className="absolute right-1.5 top-1.5 rounded-md p-1 text-[var(--text-secondary)] opacity-0 hover:bg-black/10 group-hover:opacity-100 dark:hover:bg-white/10"
                                                              >
                                                                <MoreHorizontal className="h-3.5 w-3.5" />
                                                              </button>
                                                              {menuOpenId === c.id && (
                                                                <div className="glass-panel absolute right-1.5 top-8 z-30 w-36 rounded-xl p-1 text-small shadow-floating">
                                                                  <button
                                                                    className="block w-full rounded-md px-3 py-1.5 text-left hover:bg-black/5 dark:hover:bg-white/5"
                                                                    onClick={() => {
                                                                      const title = window.prompt("Rename conversation", c.title);
                                                                      if (title) onRename(c.id, title);
                                                                      setMenuOpenId(null);
                                                                    }}
                                                                  >
                                                                    Rename
                                                                  </button>
                                                                  <button
                                                                    className="block w-full rounded-md px-3 py-1.5 text-left hover:bg-black/5 dark:hover:bg-white/5"
                                                                    onClick={() => {
                                                                      const project = window.prompt("Move to project", c.project);
                                                                      if (project) onMove(c.id, project);
                                                                      setMenuOpenId(null);
                                                                    }}
                                                                  >
                                                                    Move
                                                                  </button>
                                                                  <button
                                                                    className="block w-full rounded-md px-3 py-1.5 text-left hover:bg-black/5 dark:hover:bg-white/5"
                                                                    onClick={() => {
                                                                      onArchive(c.id);
                                                                      setMenuOpenId(null);
                                                                    }}
                                                                  >
                                                                    {c.archived ? "Unarchive" : "Archive"}
                                                                  </button>
                                                                  <button
                                                                    className="block w-full rounded-md px-3 py-1.5 text-left text-red-500 hover:bg-red-500/10"
                                                                    onClick={() => {
                                                                      onDelete(c.id);
                                                                      setMenuOpenId(null);
                                                                    }}
                                                                  >
                                                                    Delete
                                                                  </button>
                                                                </div>
                                                              )}
                                                            </div>
                                                          ))}
                                                        </motion.div>
                                                      )}
                                                    </AnimatePresence>
                                                  </div>
                                                );
                                              })}
                                            </motion.div>
                                          )}
                                        </AnimatePresence>
                                      </div>
                                    );
                                  })}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
