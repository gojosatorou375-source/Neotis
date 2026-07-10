"use client";

import { motion } from "framer-motion";
import {
  Archive,
  ArchiveRestore,
  Copy,
  Download,
  Eye,
  Layers,
  Pin,
  Star,
  Tags,
  Trash2,
} from "lucide-react";
import { GlassPanel } from "@/components/glass-panel";
import { Button } from "@/components/ui/button";
import { copyMarkdown, downloadMarkdown, extractPreview } from "@/lib/markdown-file";
import type { Skill } from "@/types/skill";

interface SkillCardProps {
  skill: Skill;
  onView: () => void;
  onRename: () => void;
  onEditTags: () => void;
  onToggleFavorite: () => void;
  onTogglePinned: () => void;
  onToggleArchived: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

function skillFilename(name: string): string {
  const safe = name.trim().replace(/[^a-z0-9\-_ ]/gi, "").replace(/\s+/g, "_");
  return `${safe || "Skill"}.md`;
}

export function SkillCard({
  skill,
  onView,
  onRename,
  onEditTags,
  onToggleFavorite,
  onTogglePinned,
  onToggleArchived,
  onDuplicate,
  onDelete,
}: SkillCardProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3 }}
    >
      <GlassPanel className="flex h-full flex-col p-6" whileHover={{ y: -3 }}>
        <div className="mb-2 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--accent)]/15">
            <Layers className="h-4 w-4 text-[var(--accent)]" strokeWidth={1.75} />
          </div>
          <h3 className="truncate text-body font-semibold text-[var(--text-primary)]">{skill.name}</h3>
          <button
            type="button"
            aria-label={skill.favorite ? "Unfavorite" : "Favorite"}
            onClick={onToggleFavorite}
            className="ml-auto rounded-full p-1.5 text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/5"
          >
            <Star
              className={`h-4 w-4 ${skill.favorite ? "fill-[var(--accent)] text-[var(--accent)]" : ""}`}
              strokeWidth={1.75}
            />
          </button>
          <button
            type="button"
            aria-label={skill.pinned ? "Unpin" : "Pin"}
            onClick={onTogglePinned}
            className="rounded-full p-1.5 text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/5"
          >
            <Pin
              className={`h-4 w-4 ${skill.pinned ? "fill-[var(--accent)] text-[var(--accent)]" : ""}`}
              strokeWidth={1.75}
            />
          </button>
        </div>
        {skill.projectName && (
          <p className="mb-1 text-[11px] font-medium text-[var(--accent)]">{skill.projectName}</p>
        )}
        <p className="mb-4 text-[11px] text-[var(--text-secondary)]">
          Updated {new Date(skill.updatedAt).toLocaleDateString()}
        </p>
        <p className="mb-3 flex-1 text-small text-[var(--text-secondary)]">
          {extractPreview(skill.markdown)}
        </p>

        {skill.tags.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-1.5">
            {skill.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-[var(--accent)]/10 px-2.5 py-1 text-[11px] font-medium text-[var(--accent)]"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {skill.history.length > 0 && (
          <p className="mb-4 text-[11px] text-[var(--text-secondary)]">
            {skill.history.length} earlier {skill.history.length === 1 ? "version" : "versions"} saved
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="glass" onClick={onView}>
            <Eye className="h-3.5 w-3.5" />
            View
          </Button>
          <Button
            size="sm"
            variant="glass"
            onClick={() => downloadMarkdown(skill.markdown, skillFilename(skill.name))}
          >
            <Download className="h-3.5 w-3.5" />
            Download
          </Button>
          <Button size="sm" variant="ghost" onClick={() => copyMarkdown(skill.markdown)}>
            <Copy className="h-3.5 w-3.5" />
            Copy
          </Button>
          <Button size="sm" variant="ghost" onClick={onRename}>
            Rename
          </Button>
          <Button size="sm" variant="ghost" onClick={onEditTags}>
            <Tags className="h-3.5 w-3.5" />
            Tags
          </Button>
          <Button size="sm" variant="ghost" onClick={onDuplicate}>
            <Copy className="h-3.5 w-3.5" />
            Duplicate
          </Button>
          <Button size="sm" variant="ghost" onClick={onToggleArchived}>
            {skill.archived ? (
              <ArchiveRestore className="h-3.5 w-3.5" />
            ) : (
              <Archive className="h-3.5 w-3.5" />
            )}
            {skill.archived ? "Unarchive" : "Archive"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onDelete}
            className="text-red-500 hover:bg-red-500/10"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </GlassPanel>
    </motion.div>
  );
}
