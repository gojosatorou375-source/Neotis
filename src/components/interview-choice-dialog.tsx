"use client";

import { motion } from "framer-motion";
import { ArrowRight, FolderGit2, User, X } from "lucide-react";
import { GlassPanel } from "@/components/glass-panel";

interface InterviewChoiceDialogProps {
  onChoosePersonal: () => void;
  onChooseProject: () => void;
  onClose: () => void;
}

/**
 * Shown the moment someone clicks "Begin interview" on the landing page --
 * before now that button jumped straight into the 6-question Persona
 * interview with no way to reach the separate Project.md flow from here at
 * all (it only existed buried in the Dashboard's Skills tab). This is the
 * front door, so it's the right place to ask which of the two documents
 * they actually want, rather than assuming Personal.md every time.
 */
export function InterviewChoiceDialog({ onChoosePersonal, onChooseProject, onClose }: InterviewChoiceDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-6 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94 }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
        className="w-full max-w-[560px]"
      >
        <GlassPanel className="p-8">
          <div className="mb-6 flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">What would you like to create?</h2>
              <p className="mt-2 text-small text-[var(--text-secondary)]">
                Both become a portable Markdown file you can hand to any AI assistant.
              </p>
            </div>
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="shrink-0 rounded-full p-1.5 text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/5"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={onChoosePersonal}
              className="group flex items-center gap-4 rounded-2xl border border-[var(--border)] p-5 text-left transition-colors hover:border-[var(--accent)] hover:bg-[var(--accent)]/5"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--accent)]/15">
                <User className="h-5 w-5 text-[var(--accent)]" strokeWidth={1.75} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-body font-semibold text-[var(--text-primary)]">Personalized-AI.md</p>
                <p className="mt-0.5 text-small text-[var(--text-secondary)]">
                  6 short questions about how you like an AI to communicate, learn, and give you advice.
                </p>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-[var(--text-secondary)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--accent)]" />
            </button>

            <button
              type="button"
              onClick={onChooseProject}
              className="group flex items-center gap-4 rounded-2xl border border-[var(--border)] p-5 text-left transition-colors hover:border-[var(--accent)] hover:bg-[var(--accent)]/5"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--accent)]/15">
                <FolderGit2 className="h-5 w-5 text-[var(--accent)]" strokeWidth={1.75} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-body font-semibold text-[var(--text-primary)]">Project.md</p>
                <p className="mt-0.5 text-small text-[var(--text-secondary)]">
                  6 questions about a specific project -- stack, architecture, conventions, rules.
                </p>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-[var(--text-secondary)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--accent)]" />
            </button>
          </div>
        </GlassPanel>
      </motion.div>

    </div>
  );
}
