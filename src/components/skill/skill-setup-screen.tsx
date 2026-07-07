"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { GlassPanel } from "@/components/glass-panel";
import { Button } from "@/components/ui/button";
import type { Persona } from "@/types/persona";

interface SkillSetupScreenProps {
  personas: Persona[];
  onStart: (projectName: string, personaId: string | null) => void;
  /** Project.md mode (entered via the landing page's "Begin interview" ->
   * Project.md choice, or `?mode=project`): same 6-question interview and
   * data model as a Skill, just presented as its own standalone document
   * with no Persona attached -- so the picker below never renders and the
   * copy doesn't mention "Skill.md" at all. */
  projectOnly?: boolean;
}

/** First step of the Adaptive Project Interview: name the project and
 * optionally attach a saved Persona so the generated Skill.md also carries
 * this person's communication preferences. In `projectOnly` mode, the
 * Persona picker is skipped entirely (personaId is always null) and the
 * copy refers to the output as Project.md instead of Skill.md. */
export function SkillSetupScreen({ personas, onStart, projectOnly = false }: SkillSetupScreenProps) {
  const [projectName, setProjectName] = useState("");
  const [personaId, setPersonaId] = useState<string | null>(null);

  const handleStart = () => {
    if (projectName.trim().length === 0) return;
    onStart(projectName.trim(), projectOnly ? null : personaId);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex min-h-screen w-full items-center justify-center px-6 py-24"
    >
      <div className="w-full max-w-[640px]">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--accent)]/15">
            <Sparkles className="h-6 w-6 text-[var(--accent)]" strokeWidth={1.75} />
          </div>
          <h1 className="text-section text-[var(--text-primary)]">
            {projectOnly ? "Create a new Project.md" : "Create a new Skill"}
          </h1>
          <p className="mt-3 max-w-[480px] text-body text-[var(--text-secondary)]">
            {projectOnly
              ? "A 6-question interview about this project — stack, architecture, conventions, rules — merged into a permanent Project.md any AI assistant can read."
              : "A 6-question interview about this project — stack, architecture, conventions, rules — merged into a permanent Skill.md any AI assistant can read."}
          </p>
        </div>

        <GlassPanel className="p-8">
          <label className="mb-1.5 block text-small font-medium text-[var(--text-secondary)]">
            Project name
          </label>
          <input
            autoFocus
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleStart();
            }}
            placeholder='e.g. "Noetis", "Internal Dashboard"'
            className="mb-6 w-full rounded-2xl border border-[var(--border)] bg-white/40 px-4 py-3 text-body text-[var(--text-primary)] outline-none focus:border-[var(--accent)] dark:bg-white/5"
          />

          {!projectOnly && personas.length > 0 && (
            <>
              <label className="mb-1.5 block text-small font-medium text-[var(--text-secondary)]">
                Attach a Persona <span className="font-normal text-[var(--text-secondary)]/70">(optional)</span>
              </label>
              <p className="mb-3 text-small text-[var(--text-secondary)]">
                Folds your communication preferences into this Skill so it covers both the project and how you like to be talked to.
              </p>
              <div className="mb-6 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setPersonaId(null)}
                  className={`rounded-full px-3.5 py-1.5 text-small font-medium transition-colors ${
                    personaId === null
                      ? "bg-[var(--accent)] text-white"
                      : "bg-black/5 text-[var(--text-secondary)] hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10"
                  }`}
                >
                  None
                </button>
                {personas.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPersonaId(p.id)}
                    className={`rounded-full px-3.5 py-1.5 text-small font-medium transition-colors ${
                      personaId === p.id
                        ? "bg-[var(--accent)] text-white"
                        : "bg-black/5 text-[var(--text-secondary)] hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10"
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </>
          )}

          <div className="flex justify-end">
            <Button onClick={handleStart} disabled={projectName.trim().length === 0}>
              Start interview
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </GlassPanel>
      </div>
    </motion.div>
  );
}
