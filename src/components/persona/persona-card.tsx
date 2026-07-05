"use client";

import { motion } from "framer-motion";
import { Copy, Download, Eye, PenLine, Tag, Tags, Trash2 } from "lucide-react";
import { GlassPanel } from "@/components/glass-panel";
import { Button } from "@/components/ui/button";
import { copyMarkdown, downloadMarkdown, extractPreview, personaFilename } from "@/lib/markdown-file";
import type { Persona } from "@/types/persona";

interface PersonaCardProps {
  persona: Persona;
  onView: () => void;
  onEditAnswers: () => void;
  onRename: () => void;
  onEditTags: () => void;
  onDelete: () => void;
}

export function PersonaCard({
  persona,
  onView,
  onEditAnswers,
  onRename,
  onEditTags,
  onDelete,
}: PersonaCardProps) {
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
            <Tag className="h-4 w-4 text-[var(--accent)]" strokeWidth={1.75} />
          </div>
          <h3 className="truncate text-body font-semibold text-[var(--text-primary)]">
            {persona.name}
          </h3>
        </div>
        <p className="mb-4 text-[11px] text-[var(--text-secondary)]">
          Updated {new Date(persona.updatedAt).toLocaleDateString()}
        </p>
        <p className="mb-3 flex-1 text-small text-[var(--text-secondary)]">
          {extractPreview(persona.markdown)}
        </p>

        {persona.tags.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-1.5">
            {persona.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-[var(--accent)]/10 px-2.5 py-1 text-[11px] font-medium text-[var(--accent)]"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {persona.history.length > 0 && (
          <p className="mb-4 text-[11px] text-[var(--text-secondary)]">
            {persona.history.length} earlier {persona.history.length === 1 ? "version" : "versions"} saved
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
            onClick={() => downloadMarkdown(persona.markdown, personaFilename(persona.name))}
          >
            <Download className="h-3.5 w-3.5" />
            Download
          </Button>
          <Button size="sm" variant="ghost" onClick={() => copyMarkdown(persona.markdown)}>
            <Copy className="h-3.5 w-3.5" />
            Copy
          </Button>
          <Button size="sm" variant="ghost" onClick={onEditAnswers}>
            <PenLine className="h-3.5 w-3.5" />
            Edit
          </Button>
          <Button size="sm" variant="ghost" onClick={onRename}>
            Rename
          </Button>
          <Button size="sm" variant="ghost" onClick={onEditTags}>
            <Tags className="h-3.5 w-3.5" />
            Tags
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
