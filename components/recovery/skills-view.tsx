"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  Sparkles,
  Search,
  User,
  Briefcase,
  Layers,
  Folder,
  Grid,
  List,
  ChevronRight,
  Star,
  Pin,
  Trash2,
  Copy,
  Download,
  Edit2,
  MoreVertical,
  SlidersHorizontal,
  Eye,
  ArrowUpDown,
  FileCode,
  Archive,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassPanel } from "@/components/glass-panel";
import { SkillViewDialog } from "@/components/skill/skill-view-dialog";
import { usePersonas } from "@/lib/personas/use-personas";
import { copyMarkdown, downloadMarkdown } from "@/lib/markdown-file";
import type { Skill } from "@/types/skill";

interface SkillsViewProps {
  skills: Skill[];
  error?: string | null;
  onRenameSkill: (id: string, name: string) => void;
  onSetSkillTags: (id: string, tags: string[]) => void;
  onToggleFavorite: (id: string) => void;
  onTogglePinned: (id: string) => void;
  onToggleArchived: (id: string) => void;
  onDuplicateSkill: (id: string) => void;
  onDeleteSkill: (id: string) => void;
  onRestoreSkillVersion: (id: string, versionIndex: number) => void;
  onUpdateSkillMarkdown?: (id: string, markdown: string) => void;
}

interface UnifiedItem {
  id: string;
  name: string;
  projectName?: string;
  type: "Personal" | "Project" | "Combined";
  updatedAt: string;
  markdown: string;
  favorite: boolean;
  pinned: boolean;
  archived: boolean;
  tags: string[];
  original: any;
}

export function SkillsView({
  skills,
  error,
  onRenameSkill,
  onSetSkillTags,
  onToggleFavorite,
  onTogglePinned,
  onToggleArchived,
  onDuplicateSkill,
  onDeleteSkill,
  onRestoreSkillVersion,
  onUpdateSkillMarkdown,
}: SkillsViewProps) {
  const { personas, renamePersona, deletePersona, updatePersonaMarkdown } = usePersonas();
  
  // UI states
  const [viewingSkill, setViewingSkill] = useState<Skill | null>(null);
  const [viewingPersona, setViewingPersona] = useState<any | null>(null);
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "Personal" | "Project" | "Combined" | "favorites">("all");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [sortBy, setSortBy] = useState<"recent" | "name" | "type">("recent");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Reconcile and unify skills and personas
  const unifiedItems = useMemo(() => {
    const list: UnifiedItem[] = [];

    // Add personas
    for (const p of personas) {
      list.push({
        id: p.id,
        name: p.name,
        type: "Personal",
        updatedAt: p.updatedAt,
        markdown: p.markdown,
        favorite: false,
        pinned: false,
        archived: false,
        tags: p.tags || [],
        original: p,
      });
    }

    // Add skills
    for (const s of skills) {
      const isCombined = s.personaId !== null && s.personaId !== "";
      list.push({
        id: s.id,
        name: s.name,
        projectName: s.projectName,
        type: isCombined ? "Combined" : "Project",
        updatedAt: s.updatedAt,
        markdown: s.markdown,
        favorite: s.favorite,
        pinned: s.pinned,
        archived: s.archived,
        tags: s.tags || [],
        original: s,
      });
    }

    return list;
  }, [personas, skills]);

  // Counts for summary folders
  const stats = useMemo(() => {
    const active = unifiedItems.filter((i) => !i.archived);
    return {
      personal: active.filter((i) => i.type === "Personal").length,
      project: active.filter((i) => i.type === "Project").length,
      combined: active.filter((i) => i.type === "Combined").length,
      favorites: active.filter((i) => i.favorite).length,
    };
  }, [unifiedItems]);

  // Filtered and sorted items
  const processedItems = useMemo(() => {
    let list = unifiedItems.filter((i) => !i.archived);

    // Apply category filter
    if (activeFilter === "Personal") {
      list = list.filter((i) => i.type === "Personal");
    } else if (activeFilter === "Project") {
      list = list.filter((i) => i.type === "Project");
    } else if (activeFilter === "Combined") {
      list = list.filter((i) => i.type === "Combined");
    } else if (activeFilter === "favorites") {
      list = list.filter((i) => i.favorite);
    }

    // Apply search query
    if (query.trim().length > 0) {
      const q = query.toLowerCase();
      list = list.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          (i.projectName && i.projectName.toLowerCase().includes(q)) ||
          i.markdown.toLowerCase().includes(q) ||
          i.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    // Apply sorting
    list.sort((a, b) => {
      // Pinned items always float to top in default lists
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;

      if (sortBy === "recent") {
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
      if (sortBy === "name") {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === "type") {
        return a.type.localeCompare(b.type);
      }
      return 0;
    });

    return list;
  }, [unifiedItems, activeFilter, query, sortBy]);

  const handleRename = (item: UnifiedItem) => {
    const newName = window.prompt("Rename this profile", item.name);
    if (!newName || !newName.trim()) return;

    if (item.type === "Personal") {
      renamePersona(item.id, newName.trim());
    } else {
      onRenameSkill(item.id, newName.trim());
    }
  };

  const handleDelete = (item: UnifiedItem) => {
    if (!window.confirm(`Are you sure you want to delete "${item.name}"? This cannot be undone.`)) return;

    if (item.type === "Personal") {
      deletePersona(item.id);
    } else {
      onDeleteSkill(item.id);
    }
  };

  const handleCopy = async (markdown: string) => {
    await copyMarkdown(markdown);
    alert("Copied markdown to clipboard!");
  };

  const handleDownload = (item: UnifiedItem) => {
    const filename = `${item.name.toLowerCase().replace(/\s+/g, "_")}.md`;
    downloadMarkdown(item.markdown, filename);
  };

  const getRelativeTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    } catch {
      return "Unknown";
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 sm:p-10">
      <div className="mx-auto max-w-[1000px] space-y-10">
        
        {/* Header Row */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-section font-bold text-[var(--text-primary)]">
              <Sparkles className="h-5 w-5 text-[var(--accent)]" />
              Skills Library
            </h1>
            <p className="text-small text-[var(--text-secondary)]">
              Your knowledge. Organized. <span className="text-[var(--accent)] font-medium">Always ready.</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex-1 md:w-64">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-black/60" strokeWidth={2.5} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search library..."
                className="w-full rounded-full border-2 border-black bg-white py-2 pl-10 pr-4 text-xs font-semibold text-black placeholder-black/40 outline-none focus:ring-4 focus:ring-[#B8FF33]/30 transition-all duration-150"
              />
            </div>
            <Button
              size="sm"
              onClick={() => {
                const q = window.prompt("Filter tags:", "");
                if (q !== null) setQuery(q);
              }}
              className="border-2 border-black bg-white text-black hover:bg-black/5 rounded-full px-4 py-2 text-xs font-black tracking-wide uppercase hover:-translate-y-0.5 hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] transition-all duration-150 active:translate-y-0 active:shadow-none"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Filter
            </Button>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-small text-red-500 dark:bg-red-500/10">
            <strong>Database Error:</strong> {error}
            <p className="mt-1 text-[11px] text-[var(--text-secondary)]">
              This usually means the required tables have not been created in your Supabase database. Please execute the SQL migration script from <code>supabase/schema.sql</code> in the Supabase SQL editor.
            </p>
          </div>
        )}

        {/* Three Action Cards */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {/* Card 1: Personal Profile */}
          <div className="p-6 flex flex-col justify-between min-h-[240px] bg-white border-2 border-black rounded-2xl shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_rgba(0,0,0,1)] transition-all duration-200">
            <div className="space-y-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#E9D5FF] text-black border-2 border-black shadow-[1px_1px_0px_rgba(0,0,0,1)]">
                <User className="h-5 w-5" strokeWidth={2.5} />
              </div>
              <div className="space-y-2">
                <h3 className="text-base font-black uppercase tracking-wide text-black">Personal Profile</h3>
                <p className="text-xs font-semibold text-black/60 leading-relaxed">
                  Capture your preferences, communication style, and how AI should work with you.
                </p>
              </div>
            </div>
            <Link href="/?new=1" className="mt-6 block">
              <Button className="w-full border-2 border-black bg-black hover:bg-black/90 text-white rounded-full py-2.5 text-xs font-black tracking-wide uppercase hover:-translate-y-0.5 hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] transition-all duration-150 active:translate-y-0 active:shadow-none">
                + New Personal Profile
              </Button>
            </Link>
          </div>

          {/* Card 2: Project Profile */}
          <div className="p-6 flex flex-col justify-between min-h-[240px] bg-white border-2 border-black rounded-2xl shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_rgba(0,0,0,1)] transition-all duration-200">
            <div className="space-y-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#FED7AA] text-black border-2 border-black shadow-[1px_1px_0px_rgba(0,0,0,1)]">
                <Briefcase className="h-5 w-5" strokeWidth={2.5} />
              </div>
              <div className="space-y-2">
                <h3 className="text-base font-black uppercase tracking-wide text-black">Project Profile</h3>
                <p className="text-xs font-semibold text-black/60 leading-relaxed">
                  Document your project&apos;s stack, architecture, conventions, and key decisions.
                </p>
              </div>
            </div>
            <Link href="/skills/new?mode=project" className="mt-6 block">
              <Button className="w-full border-2 border-black bg-white hover:bg-[#FED7AA]/20 text-black rounded-full py-2.5 text-xs font-black tracking-wide uppercase hover:-translate-y-0.5 hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] transition-all duration-150 active:translate-y-0 active:shadow-none">
                + New Project Profile
              </Button>
            </Link>
          </div>

          {/* Card 3: Combined Skill */}
          <div className="p-6 flex flex-col justify-between min-h-[240px] bg-white border-2 border-black rounded-2xl shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_rgba(0,0,0,1)] transition-all duration-200">
            <div className="space-y-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#99F6E4] text-black border-2 border-black shadow-[1px_1px_0px_rgba(0,0,0,1)]">
                <Layers className="h-5 w-5" strokeWidth={2.5} />
              </div>
              <div className="space-y-2">
                <h3 className="text-base font-black uppercase tracking-wide text-black">Combined Skill</h3>
                <p className="text-xs font-semibold text-black/60 leading-relaxed">
                  Combine personal + project knowledge into a unified Skill.md.
                </p>
              </div>
            </div>
            <Link href="/skills/combine" className="mt-6 block">
              <Button className="w-full border-2 border-black bg-white hover:bg-[#99F6E4]/20 text-black rounded-full py-2.5 text-xs font-black tracking-wide uppercase hover:-translate-y-0.5 hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] transition-all duration-150 active:translate-y-0 active:shadow-none">
                + New Combined Skill
              </Button>
            </Link>
          </div>
        </div>

        {/* Saved Skills Section Header */}
        <div className="flex flex-col gap-4 border-t-2 border-black pt-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#B8FF33] text-black border-2 border-black shadow-[1.5px_1.5px_0px_rgba(0,0,0,1)]">
              <Folder className="h-5 w-5" strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-lg font-black uppercase tracking-wide text-black">Your Saved Skills</h2>
              <p className="text-xs font-semibold text-black/50">All your profiles and skills in one place.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Sort Dropdown */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="appearance-none rounded-full border-2 border-black bg-white py-2 pl-4 pr-9 text-xs font-bold uppercase tracking-wider text-black outline-none focus:ring-4 focus:ring-[#B8FF33]/30 transition-all"
              >
                <option value="recent">Recently Updated</option>
                <option value="name">Alphabetical</option>
                <option value="type">Category Type</option>
              </select>
              <ArrowUpDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-black" strokeWidth={2.5} />
            </div>
            {/* View Mode Toggle */}
            <div className="flex rounded-full border-2 border-black bg-white p-0.5 shadow-[1.5px_1.5px_0px_rgba(0,0,0,1)]">
              <button
                onClick={() => setViewMode("list")}
                aria-label="List view"
                className={`rounded-full p-1.5 transition-colors ${viewMode === "list" ? "bg-[#B8FF33] text-black border border-black" : "text-black/50"}`}
              >
                <List className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode("grid")}
                aria-label="Grid view"
                className={`rounded-full p-1.5 transition-colors ${viewMode === "grid" ? "bg-[#B8FF33] text-black border border-black" : "text-black/50"}`}
              >
                <Grid className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* 4 Summary Folder Cards */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <button
            onClick={() => setActiveFilter(activeFilter === "Personal" ? "all" : "Personal")}
            className={`flex items-center justify-between rounded-xl p-4 border-2 border-black text-left transition-all ${
              activeFilter === "Personal"
                ? "bg-[#E9D5FF] text-black shadow-[1.5px_1.5px_0px_rgba(0,0,0,1)] translate-y-0.5"
                : "bg-white hover:bg-black/[0.02] text-black shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5"
            }`}
          >
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-black" strokeWidth={2.5} />
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-black">Personal</p>
                <p className="text-[10px] font-bold text-black/50">{stats.personal} items</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-black" strokeWidth={2.5} />
          </button>

          <button
            onClick={() => setActiveFilter(activeFilter === "Project" ? "all" : "Project")}
            className={`flex items-center justify-between rounded-xl p-4 border-2 border-black text-left transition-all ${
              activeFilter === "Project"
                ? "bg-[#FED7AA] text-black shadow-[1.5px_1.5px_0px_rgba(0,0,0,1)] translate-y-0.5"
                : "bg-white hover:bg-black/[0.02] text-black shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5"
            }`}
          >
            <div className="flex items-center gap-3">
              <Briefcase className="h-5 w-5 text-black" strokeWidth={2.5} />
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-black">Project</p>
                <p className="text-[10px] font-bold text-black/50">{stats.project} items</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-black" strokeWidth={2.5} />
          </button>

          <button
            onClick={() => setActiveFilter(activeFilter === "Combined" ? "all" : "Combined")}
            className={`flex items-center justify-between rounded-xl p-4 border-2 border-black text-left transition-all ${
              activeFilter === "Combined"
                ? "bg-[#99F6E4] text-black shadow-[1.5px_1.5px_0px_rgba(0,0,0,1)] translate-y-0.5"
                : "bg-white hover:bg-black/[0.02] text-black shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5"
            }`}
          >
            <div className="flex items-center gap-3">
              <Layers className="h-5 w-5 text-black" strokeWidth={2.5} />
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-black">Combined</p>
                <p className="text-[10px] font-bold text-black/50">{stats.combined} items</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-black" strokeWidth={2.5} />
          </button>

          <button
            onClick={() => setActiveFilter(activeFilter === "favorites" ? "all" : "favorites")}
            className={`flex items-center justify-between rounded-xl p-4 border-2 border-black text-left transition-all ${
              activeFilter === "favorites"
                ? "bg-yellow-100 text-black shadow-[1.5px_1.5px_0px_rgba(0,0,0,1)] translate-y-0.5"
                : "bg-white hover:bg-black/[0.02] text-black shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5"
            }`}
          >
            <div className="flex items-center gap-3">
              <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" strokeWidth={2.5} />
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-black">Favorites</p>
                <p className="text-[10px] font-bold text-black/50">{stats.favorites} items</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-black" strokeWidth={2.5} />
          </button>
        </div>

        {/* Content View: List (Table) vs Grid */}
        <AnimatePresence mode="wait">
          {processedItems.length === 0 ? (
            <div className="rounded-2xl border-2 border-black bg-white p-12 text-center shadow-[4px_4px_0px_rgba(0,0,0,1)]">
              <svg className="mx-auto h-16 w-16 mb-4 text-black/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A9 9 0 0112 3v0a9 9 0 019 9v.75m-.501 5.495l-2.122-2.122m0 0a3.918 3.918 0 000-5.537m0 5.537a3.918 3.918 0 010-5.537M7.5 12h9" />
              </svg>
              <p className="text-xs font-black uppercase tracking-widest text-black/50">
                No matching profiles or skills found in your library.
              </p>
            </div>
          ) : viewMode === "list" ? (
            <motion.div
              key="list-view"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="overflow-x-auto rounded-2xl border-2 border-black bg-white shadow-[4px_4px_0px_rgba(0,0,0,1)]"
            >
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-[var(--border)] text-small font-semibold text-[var(--text-secondary)] bg-white/20 dark:bg-white/[0.02]">
                    <th className="p-4 pl-6">Name</th>
                    <th className="p-4">Type</th>
                    <th className="p-4">Updated</th>
                    <th className="p-4">Size</th>
                    <th className="p-4 pr-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)] text-small text-[var(--text-primary)]">
                  {processedItems.map((item) => (
                    <tr
                      key={item.id}
                      tabIndex={0}
                      role="button"
                      aria-label={`Open ${item.name}`}
                      onClick={() => {
                        if (item.type === "Personal") {
                          setViewingPersona(item.original);
                        } else {
                          setViewingSkill(item.original);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          if (item.type === "Personal") {
                            setViewingPersona(item.original);
                          } else {
                            setViewingSkill(item.original);
                          }
                        }
                      }}
                      className="hover:bg-white/20 dark:hover:bg-white/[0.03] focus:bg-white/20 dark:focus:bg-white/[0.03] transition-colors relative cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40 outline-none"
                    >
                      <td className="p-4 pl-6">
                        <div className="flex items-center gap-3">
                          <FileCode className="h-4 w-4 text-[var(--text-secondary)]" />
                          <div>
                            <div className="font-semibold flex items-center gap-1.5">
                              {item.name}
                              {item.pinned && <Pin className="h-3 w-3 fill-[var(--accent)] text-[var(--accent)]" />}
                            </div>
                            {item.projectName && (
                              <div className="text-[11px] text-[var(--text-secondary)]">{item.projectName}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                            item.type === "Personal"
                              ? "bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20"
                              : item.type === "Project"
                                ? "bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20"
                                : "bg-[var(--success)]/10 text-[var(--success)] border border-[var(--success)]/20"
                          }`}
                        >
                          {item.type}
                        </span>
                      </td>
                      <td className="p-4 text-[var(--text-secondary)]">
                        {getRelativeTime(item.updatedAt)}
                      </td>
                      <td className="p-4 text-[var(--text-secondary)]">
                        {item.markdown ? `${(item.markdown.length / 1024).toFixed(1)} KB` : "0.0 KB"}
                      </td>
                      <td className="p-4 pr-6 text-right relative">
                        <div className="flex items-center justify-end gap-1.5">
                          {item.type !== "Personal" && (
                            <>
                              <button
                                aria-label="Toggle pin"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onTogglePinned(item.id);
                                }}
                                className="rounded-full p-1.5 text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/5"
                              >
                                <Pin className={`h-3.5 w-3.5 ${item.pinned ? "fill-[var(--accent)] text-[var(--accent)]" : ""}`} />
                              </button>
                              <button
                                aria-label="Toggle favorite"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onToggleFavorite(item.id);
                                }}
                                className="rounded-full p-1.5 text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/5"
                              >
                                <Star className={`h-3.5 w-3.5 ${item.favorite ? "fill-yellow-500 text-yellow-500" : ""}`} />
                              </button>
                            </>
                          )}
                          <div className="relative">
                            <button
                              aria-label="Actions menu"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuId(openMenuId === item.id ? null : item.id);
                              }}
                              className="rounded-full p-1.5 text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/5"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </button>
                            
                            {openMenuId === item.id && (
                              <>
                                <div
                                  className="fixed inset-0 z-10"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenMenuId(null);
                                  }}
                                />
                                <div
                                  className="absolute right-0 mt-1 w-44 z-20 rounded-xl border border-[var(--border)] bg-white p-1.5 shadow-lg dark:bg-zinc-900 text-left"
                                  onClick={(e) => {
                                    // Prevent clicks on the menu body itself from closing/opening the row
                                    e.stopPropagation();
                                  }}
                                >
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenMenuId(null);
                                      if (item.type === "Personal") {
                                        setViewingPersona(item.original);
                                      } else {
                                        setViewingSkill(item.original);
                                      }
                                    }}
                                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-small text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5"
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                    View Markdown
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenMenuId(null);
                                      handleRename(item);
                                    }}
                                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-small text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5"
                                  >
                                    <Edit2 className="h-3.5 w-3.5" />
                                    Rename
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenMenuId(null);
                                      handleCopy(item.markdown);
                                    }}
                                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-small text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5"
                                  >
                                    <Copy className="h-3.5 w-3.5" />
                                    Copy Markdown
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenMenuId(null);
                                      handleDownload(item);
                                    }}
                                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-small text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5"
                                  >
                                    <Download className="h-3.5 w-3.5" />
                                    Download (.md)
                                  </button>
                                  {item.type !== "Personal" && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setOpenMenuId(null);
                                        onToggleArchived(item.id);
                                      }}
                                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-small text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5"
                                    >
                                      <Archive className="h-3.5 w-3.5" />
                                      Archive
                                    </button>
                                  )}
                                  <hr className="my-1 border-[var(--border)]" />
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenMenuId(null);
                                      handleDelete(item);
                                    }}
                                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-small text-red-500 hover:bg-red-500/10"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    Delete
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </motion.div>
          ) : (
            <motion.div
              key="grid-view"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 gap-5 sm:grid-cols-2"
            >
              {processedItems.map((item) => (
                <div key={item.id} className="relative flex flex-col justify-between p-6 bg-white border-2 border-black rounded-2xl shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_rgba(0,0,0,1)] transition-all duration-200">
                  <div>
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 truncate">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center border-2 border-black ${
                          item.type === "Personal"
                            ? "bg-[#E9D5FF]"
                            : item.type === "Project"
                              ? "bg-[#FED7AA]"
                              : "bg-[#99F6E4]"
                        } shadow-[1px_1px_0px_rgba(0,0,0,1)]`}>
                          <FileCode className="h-3.5 w-3.5 text-black" strokeWidth={2.5} />
                        </div>
                        <h3 className="truncate text-sm font-black uppercase tracking-wide text-black">{item.name}</h3>
                      </div>
                      <span
                        className={`rounded-full border-2 border-black px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-black shadow-[1px_1px_0px_rgba(0,0,0,1)] ${
                          item.type === "Personal"
                            ? "bg-[#E9D5FF]"
                            : item.type === "Project"
                              ? "bg-[#FED7AA]"
                              : "bg-[#99F6E4]"
                        }`}
                      >
                        {item.type}
                      </span>
                    </div>
                    {item.projectName && (
                      <p className="mb-2 text-[10px] font-black uppercase tracking-wider text-[#B8FF33] bg-black px-2 py-0.5 rounded border border-black inline-block">{item.projectName}</p>
                    )}
                    <p className="mb-3 text-[11px] font-bold text-black/40">
                      Updated {getRelativeTime(item.updatedAt)} • {item.markdown ? `${(item.markdown.length / 1024).toFixed(1)} KB` : "0.0 KB"}
                    </p>
                    <p className="mb-6 line-clamp-3 text-xs font-semibold text-black/60 leading-relaxed">
                      {item.markdown ? item.markdown.slice(0, 150) + "..." : "No preview available"}
                    </p>
                  </div>
                  <div className="flex items-center justify-between border-t-2 border-black pt-4">
                    <div className="flex items-center gap-1">
                      {item.type !== "Personal" && (
                        <>
                          <button
                            onClick={() => onTogglePinned(item.id)}
                            className="rounded-full border border-black p-1.5 text-black hover:bg-black/5 bg-white shadow-[1px_1px_0px_rgba(0,0,0,1)]"
                          >
                            <Pin className={`h-3.5 w-3.5 ${item.pinned ? "fill-black text-black" : "text-black/50"}`} />
                          </button>
                          <button
                            onClick={() => onToggleFavorite(item.id)}
                            className="rounded-full border border-black p-1.5 text-black hover:bg-black/5 bg-white shadow-[1px_1px_0px_rgba(0,0,0,1)]"
                          >
                            <Star className={`h-3.5 w-3.5 ${item.favorite ? "fill-yellow-400 text-black" : "text-black/50"}`} />
                          </button>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        className="border-2 border-black bg-white hover:bg-black/5 text-black rounded-full px-3 py-1 text-xs font-black tracking-wide uppercase shadow-[1.5px_1.5px_0px_rgba(0,0,0,1)]"
                        onClick={() => {
                          if (item.type === "Personal") setViewingPersona(item.original);
                          else setViewingSkill(item.original);
                        }}
                      >
                        View
                      </Button>
                      <Button
                        size="sm"
                        className="border-2 border-black bg-white hover:bg-black/5 text-black rounded-full px-3 py-1 text-xs font-black tracking-wide uppercase shadow-[1.5px_1.5px_0px_rgba(0,0,0,1)]"
                        onClick={() => handleRename(item)}
                      >
                        Rename
                      </Button>
                      <Button
                        size="sm"
                        className="border-2 border-black bg-red-50 hover:bg-red-100 text-red-700 rounded-full px-3 py-1 text-xs font-black tracking-wide uppercase shadow-[1.5px_1.5px_0px_rgba(0,0,0,1)]"
                        onClick={() => handleDelete(item)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer Line */}
        <div className="flex flex-col items-center justify-center gap-2 border-t border-[var(--border)] pt-8 text-center text-small text-[var(--text-secondary)]">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-[var(--accent)] animate-pulse" />
            <span>Your knowledge is your superpower. <span className="text-[var(--accent)] font-medium">Keep building.</span></span>
          </div>
        </div>

      </div>

      {/* Dialog viewers */}
      <AnimatePresence>
        {viewingSkill && (
          <SkillViewDialog
            skill={viewingSkill}
            onClose={() => setViewingSkill(null)}
            onRestoreVersion={(versionIndex) => {
              onRestoreSkillVersion(viewingSkill.id, versionIndex);
              setViewingSkill(null);
            }}
            onSaveMarkdown={(markdown) => {
              if (onUpdateSkillMarkdown) {
                onUpdateSkillMarkdown(viewingSkill.id, markdown);
                setViewingSkill((prev) => prev ? { ...prev, markdown } : null);
              }
            }}
          />
        )}
        {viewingPersona && (
          <SkillViewDialog
            skill={{
              id: viewingPersona.id,
              name: viewingPersona.name,
              projectName: "Personal AI Profile",
              personaId: null,
              createdAt: viewingPersona.createdAt,
              updatedAt: viewingPersona.updatedAt,
              answers: viewingPersona.answers,
              markdown: viewingPersona.markdown,
              tags: viewingPersona.tags,
              favorite: false,
              pinned: false,
              archived: false,
              history: viewingPersona.history || [],
            }}
            onClose={() => setViewingPersona(null)}
            onRestoreVersion={() => {}}
            onSaveMarkdown={(markdown) => {
              updatePersonaMarkdown(viewingPersona.id, markdown);
              setViewingPersona((prev: any) => prev ? { ...prev, markdown } : null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

