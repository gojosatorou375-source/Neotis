"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Check, Copy, Download, Home, Layers, Sparkles } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { GlassPanel } from "@/components/glass-panel";
import { MarkdownPreview } from "@/components/markdown-preview";
import { useSkills } from "@/lib/skills/use-skills";
import { usePersonas } from "@/lib/personas/use-personas";
import { copyMarkdown, downloadMarkdown } from "@/lib/markdown-file";

export default function CombineSkillsPage() {
  const { skills, createSkill, hydrated: skillsHydrated } = useSkills();
  const { personas, hydrated: personasHydrated } = usePersonas();
  const router = useRouter();

  // Selections
  const [selectedSkillId, setSelectedSkillId] = useState("");
  const [selectedPersonaId, setSelectedPersonaId] = useState("");
  const [customName, setCustomName] = useState("");

  // Loading/Result States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [combinedMarkdown, setCombinedMarkdown] = useState<string | null>(null);
  const [usedAI, setUsedAI] = useState<boolean>(false);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  const activeSkills = useMemo(() => skills.filter((s) => !s.archived), [skills]);

  const selectedSkill = useMemo(() => skills.find((s) => s.id === selectedSkillId) ?? null, [skills, selectedSkillId]);
  const selectedPersona = useMemo(() => personas.find((p) => p.id === selectedPersonaId) ?? null, [personas, selectedPersonaId]);

  const handleCombine = async () => {
    if (!selectedSkill || !selectedPersona) return;
    setLoading(true);
    setError(null);

    const name = customName.trim() || `${selectedSkill.projectName} (Combined)`;

    try {
      const accessKey = process.env.NEXT_PUBLIC_APP_ACCESS_KEY || "";
      const res = await fetch("/api/skills/combine", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-PersonaMD-Access": accessKey,
        },
        body: JSON.stringify({
          projectName: name,
          projectMarkdown: selectedSkill.markdown,
          personaMarkdown: selectedPersona.markdown,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to combine profiles.");
      }

      setCombinedMarkdown(data.markdown);
      setUsedAI(data.usedAI || false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    if (!combinedMarkdown || !selectedSkill) return;
    const name = customName.trim() || `${selectedSkill.projectName} (Combined)`;
    
    // Save to the local database / Supabase
    createSkill(
      name,
      selectedSkill.projectName,
      selectedPersonaId || null,
      selectedSkill.answers, // keep answers of the project
      combinedMarkdown,
      ["Combined", ...selectedSkill.tags]
    );

    setSaved(true);
  };

  const handleCopy = async () => {
    if (!combinedMarkdown) return;
    await copyMarkdown(combinedMarkdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!skillsHydrated || !personasHydrated) return null;

  return (
    <div className="relative z-10 min-h-screen">
      <header className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4 sm:px-10">
        <div className="flex items-center gap-4">
          <Link
            href="/skills"
            className="flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-white/30 px-3 py-1.5 text-small font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] dark:bg-white/5"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </Link>
          <span className="text-[var(--border)]">/</span>
          <span className="text-small font-semibold text-[var(--text-primary)]">Combine Profiles</span>
        </div>
        <ThemeToggle />
      </header>

      <div className="mx-auto max-w-[800px] px-6 py-14 sm:px-10">
        <div className="mb-10 flex flex-col items-center text-center">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--accent)]/15">
            <Sparkles className="h-6 w-6 text-[var(--accent)]" strokeWidth={1.75} />
          </div>
          <h1 className="text-section text-[var(--text-primary)]">AI Profile Synthesizer</h1>
          <p className="mt-3 max-w-[520px] text-body text-[var(--text-secondary)]">
            Merge a Project Profile (Project.md) and a Personalized AI Communication Profile (Personal.md) into a single, cohesive Skill.md file optimized for AI assistants.
          </p>
        </div>

        <AnimatePresence mode="wait">
          {!combinedMarkdown ? (
            <motion.div
              key="setup"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
            >
              <GlassPanel className="space-y-6 p-6 sm:p-10">
                <div className="flex flex-col gap-2">
                  <label htmlFor="project-select" className="text-small font-semibold text-[var(--text-primary)]">
                    Select Project Profile (Project.md)
                  </label>
                  <select
                    id="project-select"
                    value={selectedSkillId}
                    onChange={(e) => {
                      setSelectedSkillId(e.target.value);
                      const sk = skills.find((s) => s.id === e.target.value);
                      if (sk) {
                        setCustomName(`${sk.projectName} (Combined)`);
                      }
                    }}
                    className="w-full rounded-xl border border-[var(--border)] bg-white/40 p-3 text-body text-[var(--text-primary)] outline-none focus:border-[var(--accent)] dark:bg-zinc-900"
                  >
                    <option value="" className="dark:text-black">-- Select a Saved Project --</option>
                    {activeSkills.map((sk) => (
                      <option key={sk.id} value={sk.id} className="dark:text-black">
                        {sk.projectName} ({sk.name})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-2">
                  <label htmlFor="persona-select" className="text-small font-semibold text-[var(--text-primary)]">
                    Select Personalized AI Profile (Personal.md)
                  </label>
                  <select
                    id="persona-select"
                    value={selectedPersonaId}
                    onChange={(e) => setSelectedPersonaId(e.target.value)}
                    className="w-full rounded-xl border border-[var(--border)] bg-white/40 p-3 text-body text-[var(--text-primary)] outline-none focus:border-[var(--accent)] dark:bg-zinc-900"
                  >
                    <option value="" className="dark:text-black">-- Select a Persona profile --</option>
                    {personas.map((p) => (
                      <option key={p.id} value={p.id} className="dark:text-black">
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-2">
                  <label htmlFor="name-input" className="text-small font-semibold text-[var(--text-primary)]">
                    Skill Name
                  </label>
                  <input
                    id="name-input"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="e.g. My Project Combined Profile"
                    className="w-full rounded-xl border border-[var(--border)] bg-white/40 p-3 text-body text-[var(--text-primary)] outline-none focus:border-[var(--accent)] dark:bg-zinc-900"
                  />
                </div>

                {error && (
                  <p className="text-small text-red-500" role="alert">
                    {error}
                  </p>
                )}

                <Button
                  onClick={handleCombine}
                  disabled={loading || !selectedSkillId || !selectedPersonaId}
                  className="w-full py-6 text-body font-semibold"
                >
                  {loading ? "Processing with AI..." : "Combine with AI"}
                </Button>
              </GlassPanel>
            </motion.div>
          ) : (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
            >
              <GlassPanel className="p-6 sm:p-10">
                <h3 className="mb-4 text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
                  Combined Skill.md
                  {usedAI && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--accent)]/10 px-2.5 py-0.5 text-xs font-semibold text-[var(--accent)]">
                      Enhanced by AI
                    </span>
                  )}
                </h3>
                <MarkdownPreview markdown={combinedMarkdown} />

                <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                  <Button
                    onClick={() =>
                      downloadMarkdown(
                        combinedMarkdown,
                        `${(customName || selectedSkill?.projectName || "Combined").replace(/\s+/g, "_")}_Skill.md`
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
                  <Button variant="glass" onClick={handleSave} disabled={saved}>
                    {saved ? "Saved✓" : "Save to Skills Library"}
                  </Button>
                  <Link href="/recovery?tab=skills">
                    <Button variant="ghost">
                      View in Skills Library
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setCombinedMarkdown(null);
                      setSaved(false);
                    }}
                  >
                    Start Over
                  </Button>
                </div>
              </GlassPanel>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
