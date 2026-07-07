"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { BookmarkPlus, Check, Copy, Download, ListRestart, PenLine } from "lucide-react";
import { GlassPanel } from "@/components/glass-panel";
import { Button } from "@/components/ui/button";
import { MarkdownPreview } from "@/components/markdown-preview";
import { SavePersonaDialog } from "@/components/persona/save-persona-dialog";
import { copyMarkdown, downloadMarkdown } from "@/lib/markdown-file";
import type { Answers } from "@/types";

interface CompletionScreenProps {
  answers: Answers;
  onEdit: () => void;
  onRestart: () => void;
  onSavePersona: (name: string, markdown: string, tags: string[]) => void;
  existingPersonaNames: string[];
}

export function CompletionScreen({
  answers,
  onEdit,
  onRestart,
  onSavePersona,
  existingPersonaNames,
}: CompletionScreenProps) {
  const [copied, setCopied] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [savedAs, setSavedAs] = useState<string | null>(null);
  const [markdown, setMarkdown] = useState<string>("");
  const [usedAI, setUsedAI] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchEnhanced = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/library/enhance", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            answers,
            docType: "persona",
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setMarkdown(data.markdown);
          setUsedAI(data.usedAI);
        }
      } catch (err) {
        console.error("Failed to fetch enhanced document", err);
      } finally {
        setLoading(false);
      }
    };
    fetchEnhanced();
  }, [answers]);

  const handleCopy = async () => {
    await copyMarkdown(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = (filename?: string) => {
    downloadMarkdown(markdown, filename);
  };

  const handleSave = (name: string, tags: string[]) => {
    onSavePersona(name, markdown, tags);
    setSaveOpen(false);
    setSavedAs(name);
    setTimeout(() => setSavedAs(null), 3000);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center">
        <GlassPanel className="p-8 text-center space-y-4 max-w-sm">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-[var(--accent)] border-t-transparent" />
          <p className="text-body text-[var(--text-secondary)] font-medium">Generating your AI Profile...</p>
        </GlassPanel>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="flex min-h-screen w-full items-center justify-center px-6 py-24"
    >
      <div className="w-full max-w-[900px]">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 16, delay: 0.1 }}
          className="mb-8 flex flex-col items-center text-center"
        >
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--success)]/15">
            <Check className="h-7 w-7 text-[var(--success)]" strokeWidth={2} />
          </div>
          <h2 className="flex items-center justify-center gap-2 text-section text-[var(--text-primary)]">
            Your profile is ready
            {usedAI && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--accent)]/10 px-2.5 py-0.5 text-xs font-semibold text-[var(--accent)]">
                Enhanced by AI
              </span>
            )}
          </h2>
          <p className="mt-3 max-w-[520px] text-body text-[var(--text-secondary)]">
            AI_PROFILE.md is generated from your answers. Copy it into any
            assistant&apos;s custom instructions, save it as a named persona to
            reuse later, or download it to keep.
          </p>
        </motion.div>

        <GlassPanel className="p-6 sm:p-10">
          <MarkdownPreview markdown={markdown} />

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button onClick={() => handleDownload("AI_PROFILE.md")}>
              <Download className="h-4 w-4" />
              Download .md
            </Button>
            <Button variant="glass" onClick={handleCopy}>
              {copied ? (
                <Check className="h-4 w-4 text-[var(--success)]" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              {copied ? "Copied to clipboard!" : "Copy as Prompt"}
            </Button>
            <Button variant="glass" onClick={() => setSaveOpen(true)}>
              {savedAs ? (
                <Check className="h-4 w-4 text-[var(--success)]" />
              ) : (
                <BookmarkPlus className="h-4 w-4" />
              )}
              {savedAs ? `Saved as "${savedAs}"` : "Save as Persona"}
            </Button>
            <Button variant="ghost" onClick={onEdit}>
              <PenLine className="h-4 w-4" />
              Edit answers
            </Button>
            <Link href="/recovery?tab=skills">
              <Button variant="ghost">
                View in Skills Library
              </Button>
            </Link>
            <Button variant="ghost" onClick={onRestart}>
              <ListRestart className="h-4 w-4" />
              Restart
            </Button>
          </div>
        </GlassPanel>
      </div>

      <AnimatePresence>
        {saveOpen && (
          <SavePersonaDialog
            existingNames={existingPersonaNames}
            onSave={handleSave}
            onClose={() => setSaveOpen(false)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
