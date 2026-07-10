"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Copy, Download, History, RotateCcw, X, Edit, Save } from "lucide-react";
import { GlassPanel } from "@/components/glass-panel";
import { Button } from "@/components/ui/button";
import { MarkdownPreview } from "@/components/markdown-preview";
import { copyMarkdown, downloadMarkdown, extractPreview } from "@/lib/markdown-file";
import type { Skill } from "@/types/skill";

interface SkillViewDialogProps {
  skill: Skill;
  onClose: () => void;
  onRestoreVersion: (versionIndex: number) => void;
  onSaveMarkdown?: (markdown: string) => Promise<void> | void;
}

function skillFilename(name: string): string {
  const safe = name.trim().replace(/[^a-z0-9\-_ ]/gi, "").replace(/\s+/g, "_");
  return `${safe || "Skill"}.md`;
}

export function SkillViewDialog({ skill, onClose, onRestoreVersion, onSaveMarkdown }: SkillViewDialogProps) {
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<"current" | "history">("current");
  const [editMode, setEditMode] = useState(false);
  const [editedMarkdown, setEditedMarkdown] = useState(skill.markdown);
  const [saving, setSaving] = useState(false);

  const handleCopy = async () => {
    await copyMarkdown(skill.markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async () => {
    if (onSaveMarkdown) {
      setSaving(true);
      await onSaveMarkdown(editedMarkdown);
      setSaving(false);
    }
    setEditMode(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-6 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94 }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
        className="w-full max-w-[700px]"
      >
        <GlassPanel className="p-8">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-black text-black">{skill.name}</h2>
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="rounded-full p-1.5 border border-black hover:bg-[#B8FF33] transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {skill.history.length > 0 && !editMode && (
            <div className="mb-5 flex gap-1 rounded-full border border-black p-1 bg-white">
              <button
                type="button"
                onClick={() => setTab("current")}
                className={`flex-1 rounded-full px-3 py-1.5 text-xs font-black tracking-wide uppercase transition-colors ${
                  tab === "current"
                    ? "bg-[#B8FF33] text-black border border-black shadow-[1px_1px_0px_rgba(0,0,0,1)]"
                    : "text-black/60"
                }`}
              >
                Current
              </button>
              <button
                type="button"
                onClick={() => setTab("history")}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-black tracking-wide uppercase transition-colors ${
                  tab === "history"
                    ? "bg-[#B8FF33] text-black border border-black shadow-[1px_1px_0px_rgba(0,0,0,1)]"
                    : "text-black/60"
                }`}
              >
                <History className="h-3.5 w-3.5" />
                History ({skill.history.length})
              </button>
            </div>
          )}

          {tab === "current" ? (
            <>
              {editMode ? (
                <div className="mb-4">
                  <textarea
                    value={editedMarkdown}
                    onChange={(e) => setEditedMarkdown(e.target.value)}
                    className="w-full h-80 rounded-2xl border-2 border-black p-4 font-mono text-xs outline-none focus:shadow-[2px_2px_0px_rgba(0,0,0,1)] transition-all bg-white text-black"
                    placeholder="Enter markdown content..."
                  />
                </div>
              ) : (
                <MarkdownPreview markdown={skill.markdown} />
              )}

              <div className="mt-6 flex flex-wrap justify-end gap-3">
                {editMode ? (
                  <>
                    <Button variant="glass" onClick={() => { setEditMode(false); setEditedMarkdown(skill.markdown); }}>
                      Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={saving}>
                      <Save className="h-4 w-4" />
                      {saving ? "Saving..." : "Save"}
                    </Button>
                  </>
                ) : (
                  <>
                    {onSaveMarkdown && (
                      <Button variant="glass" onClick={() => setEditMode(true)}>
                        <Edit className="h-4 w-4" />
                        Edit
                      </Button>
                    )}
                    <Button variant="glass" onClick={handleCopy}>
                      {copied ? <Check className="h-4 w-4 text-[var(--success)]" /> : <Copy className="h-4 w-4" />}
                      {copied ? "Copied" : "Copy Markdown"}
                    </Button>
                    <Button onClick={() => downloadMarkdown(skill.markdown, skillFilename(skill.name))}>
                      <Download className="h-4 w-4" />
                      Download
                    </Button>
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="flex max-h-[420px] flex-col gap-3 overflow-y-auto pr-1">
              {skill.history.map((version, index) => (
                <div
                  key={version.savedAt}
                  className="rounded-2xl border-2 border-black bg-white p-4"
                >
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="text-xs font-black text-black">
                      {new Date(version.savedAt).toLocaleString()}
                    </p>
                    <Button size="sm" variant="glass" onClick={() => onRestoreVersion(index)}>
                      <RotateCcw className="h-3.5 w-3.5" />
                      Restore
                    </Button>
                  </div>
                  <p className="text-xs font-medium text-black/60">
                    {extractPreview(version.markdown)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </GlassPanel>
      </motion.div>
    </div>
  );
}
