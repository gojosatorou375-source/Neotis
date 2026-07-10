"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Briefcase, Check, Copy, Download, Home, ListRestart, Sparkles } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { GlassPanel } from "@/components/glass-panel";
import { MarkdownPreview } from "@/components/markdown-preview";
import { SkillSetupScreen } from "@/components/skill/skill-setup-screen";
import { SkillQuestionCard } from "@/components/skill/skill-question-card";
import { SaveSkillDialog } from "@/components/skill/save-skill-dialog";
import { useSkillInterview } from "@/lib/skills/use-skill-interview";
import { useSkills } from "@/lib/skills/use-skills";
import { usePersonas } from "@/lib/personas/use-personas";
import { generateSkill } from "@/lib/skills/generate-skill";
import { copyMarkdown, downloadMarkdown } from "@/lib/markdown-file";
import { PROJECT_QUESTIONS } from "@/lib/skills/project-interview-questions";

export default function NewSkillPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { personas, hydrated: personasHydrated } = usePersonas();
  const { createSkill } = useSkills();
  const {
    hydrated: interviewHydrated,
    phase,
    currentIndex,
    answers,
    projectName,
    personaId,
    startInterview,
    setAnswer,
    next,
    prev,
    jumpTo,
    reset,
  } = useSkillInterview();

  const hydrated = personasHydrated && interviewHydrated;

  const projectOnly = searchParams.get("mode") === "project";

  const [copied, setCopied] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [savedAs, setSavedAs] = useState<string | null>(null);

  const [markdown, setMarkdown] = useState<string>("");
  const [usedAI, setUsedAI] = useState<boolean>(false);
  const [generating, setGenerating] = useState<boolean>(false);

  const persona = useMemo(() => personas.find((p) => p.id === personaId) ?? null, [personas, personaId]);

  useEffect(() => {
    if (phase !== "review") return;

    let active = true;
    const fetchEnhanced = async () => {
      setGenerating(true);
      try {
        const accessKey = process.env.NEXT_PUBLIC_APP_ACCESS_KEY || "";
        const res = await fetch("/api/library/enhance", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-PersonaMD-Access": accessKey,
          },
          body: JSON.stringify({
            answers,
            docType: persona ? "combined" : "project",
            projectName,
            personaMarkdown: persona?.markdown ?? null,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (active) {
            setMarkdown(data.markdown);
            setUsedAI(data.usedAI);
          }
        }
      } catch (err) {
        console.error("Failed to fetch enhanced document", err);
      } finally {
        if (active) setGenerating(false);
      }
    };

    fetchEnhanced();
    return () => {
      active = false;
    };
  }, [phase, projectName, answers, persona]);

  if (!hydrated) return null;

  const handleCopy = async () => {
    await copyMarkdown(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = (name: string, tags: string[]) => {
    createSkill(name, projectName, personaId, answers, markdown, tags);
    setSaveOpen(false);
    setSavedAs(name);
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-20 flex items-center justify-between px-6 py-5 sm:px-10">
        <Link
          href="/skills"
          className="flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-white/30 px-3 py-1.5 text-small font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] dark:bg-white/5"
        >
          <Home className="h-3.5 w-3.5" />
          Knowledge
        </Link>
        <ThemeToggle />
      </header>

      <main className="relative z-10">
        <AnimatePresence mode="wait">
          {phase === "setup" && (
            <SkillSetupScreen
              key="setup"
              personas={personas}
              onStart={startInterview}
              projectOnly={projectOnly}
            />
          )}
          {phase === "interview" && (
            <SkillQuestionCard
              key="interview"
              question={PROJECT_QUESTIONS[currentIndex]}
              index={currentIndex}
              value={answers[PROJECT_QUESTIONS[currentIndex].id] ?? ""}
              onChange={(value) => setAnswer(PROJECT_QUESTIONS[currentIndex].id, value)}
              onNext={next}
              onPrev={prev}
              canGoPrev={currentIndex > 0}
            />
          )}
          {phase === "review" && generating && (
            <div className="flex min-h-[60vh] w-full items-center justify-center">
              <GlassPanel className="p-8 text-center space-y-4 max-w-sm">
                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-[var(--accent)] border-t-transparent" />
                <p className="text-body text-[var(--text-secondary)] font-medium">Enhancing profile with AI...</p>
              </GlassPanel>
            </div>
          )}
          {phase === "review" && !generating && (
            <motion.div
              key="review"
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
                    {projectOnly ? "Project.md is ready" : "Skill.md is ready"}
                    {usedAI && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[var(--accent)]/10 px-2.5 py-0.5 text-xs font-semibold text-[var(--accent)]">
                        Enhanced by AI
                      </span>
                    )}
                  </h2>
                  <p className="mt-3 max-w-[520px] text-body text-[var(--text-secondary)]">
                    Generated for &quot;{projectName}&quot;. Save it to your Skills Library, copy it into any
                    assistant&apos;s project knowledge, or download it to keep.
                  </p>
                </motion.div>

                <GlassPanel className="p-6 sm:p-10">
                  <MarkdownPreview markdown={markdown} />

                  <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                    <Button
                      onClick={() =>
                        downloadMarkdown(
                          markdown,
                          `${projectName.replace(/\s+/g, "_")}_${projectOnly ? "Project" : "Skill"}.md`
                        )
                      }
                    >
                      <Download className="h-4 w-4" />
                      Download .md
                    </Button>
                    <Button variant="glass" onClick={handleCopy}>
                      {copied ? <Check className="h-4 w-4 text-[var(--success)]" /> : <Copy className="h-4 w-4" />}
                      {copied ? "Copied to clipboard!" : "Copy as Prompt"}
                    </Button>
                    <Button variant="glass" onClick={() => setSaveOpen(true)}>
                      {savedAs ? `Saved as "${savedAs}"` : "Save to Skills Library"}
                    </Button>
                    <Button variant="ghost" onClick={() => jumpTo(0)}>
                      Edit answers
                    </Button>
                    <Link href="/recovery?tab=skills">
                      <Button variant="ghost">
                        View in Skills Library
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        reset();
                        router.push("/recovery?tab=skills");
                      }}
                    >
                      <ListRestart className="h-4 w-4" />
                      Done
                    </Button>
                  </div>
                </GlassPanel>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {saveOpen && (
          <SaveSkillDialog
            suggestedName={projectName}
            onSave={handleSave}
            onClose={() => setSaveOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
