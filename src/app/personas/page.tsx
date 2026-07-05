"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { BookmarkPlus, Home, Search, Sparkles, X } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { PersonaCard } from "@/components/persona/persona-card";
import { PersonaViewDialog } from "@/components/persona/persona-view-dialog";
import { usePersonas } from "@/lib/personas/use-personas";
import { setPendingLoad } from "@/lib/personas/storage";
import type { Persona } from "@/types/persona";

export default function PersonasPage() {
  const {
    hydrated,
    personas,
    renamePersona,
    deletePersona,
    setPersonaTags,
    restorePersonaVersion,
  } = usePersonas();
  const [viewing, setViewing] = useState<Persona | null>(null);
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const router = useRouter();

  const allTags = useMemo(() => {
    const seen = new Set<string>();
    for (const p of personas) for (const t of p.tags) seen.add(t);
    return Array.from(seen).sort((a, b) => a.localeCompare(b));
  }, [personas]);

  const filteredPersonas = useMemo(() => {
    const q = query.trim().toLowerCase();
    return personas.filter((p) => {
      const matchesTag = !activeTag || p.tags.includes(activeTag);
      const matchesQuery =
        q.length === 0 ||
        p.name.toLowerCase().includes(q) ||
        p.markdown.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q));
      return matchesTag && matchesQuery;
    });
  }, [personas, query, activeTag]);

  if (!hydrated) return null;

  const handleEditAnswers = (persona: Persona) => {
    setPendingLoad(persona.answers);
    router.push("/");
  };

  const handleEditTags = (persona: Persona) => {
    const raw = window.prompt(
      "Edit tags (comma-separated)",
      persona.tags.join(", ")
    );
    if (raw === null) return;
    const tags = Array.from(
      new Set(
        raw
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
      )
    );
    setPersonaTags(persona.id, tags);
  };

  return (
    <div className="relative z-10 min-h-screen">
      <header className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4 sm:px-10">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-white/30 px-3 py-1.5 text-small font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] dark:bg-white/5"
          >
            <Home className="h-3.5 w-3.5" />
            Home
          </Link>
          <span className="text-[var(--border)]">/</span>
          <span className="text-small font-semibold text-[var(--text-primary)]">
            Persona Library
          </span>
        </div>
        <ThemeToggle />
      </header>

      <div className="mx-auto max-w-[1100px] px-6 py-14 sm:px-10">
        <div className="mb-10 flex flex-col items-center text-center">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--accent)]/15">
            <BookmarkPlus className="h-6 w-6 text-[var(--accent)]" strokeWidth={1.75} />
          </div>
          <h1 className="text-section text-[var(--text-primary)]">Your saved personas</h1>
          <p className="mt-3 max-w-[520px] text-body text-[var(--text-secondary)]">
            Every profile you save gets a name — like &quot;Coder&quot; or
            &quot;Writer&quot; — so you can reuse or download it again anytime,
            without redoing the interview.
          </p>
        </div>

        {personas.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-xl3 border border-dashed border-[var(--border)] py-20 text-center">
            <Sparkles className="h-6 w-6 text-[var(--text-secondary)]" />
            <p className="text-body text-[var(--text-secondary)]">
              No personas saved yet. Finish an interview and use{" "}
              <span className="font-medium text-[var(--text-primary)]">Save as Persona</span> to
              create your first one.
            </p>
            <Link href="/">
              <Button>Start an interview</Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-6 flex flex-col gap-4">
              <div className="relative mx-auto w-full max-w-[440px]">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search personas…"
                  className="w-full rounded-full border border-[var(--border)] bg-white/40 py-2.5 pl-11 pr-10 text-small text-[var(--text-primary)] outline-none focus:border-[var(--accent)] dark:bg-white/5"
                />
                {query.length > 0 && (
                  <button
                    type="button"
                    aria-label="Clear search"
                    onClick={() => setQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/5"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {allTags.length > 0 && (
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {allTags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                      className={`rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors ${
                        activeTag === tag
                          ? "bg-[var(--accent)] text-white"
                          : "bg-black/5 text-[var(--text-secondary)] hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10"
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {filteredPersonas.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-xl3 border border-dashed border-[var(--border)] py-16 text-center">
                <p className="text-body text-[var(--text-secondary)]">
                  No personas match your search or filter.
                </p>
              </div>
            ) : (
              <motion.div layout className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                <AnimatePresence>
                  {filteredPersonas.map((persona) => (
                    <PersonaCard
                      key={persona.id}
                      persona={persona}
                      onView={() => setViewing(persona)}
                      onEditAnswers={() => handleEditAnswers(persona)}
                      onRename={() => {
                        const name = window.prompt("Rename persona", persona.name);
                        if (name) renamePersona(persona.id, name);
                      }}
                      onEditTags={() => handleEditTags(persona)}
                      onDelete={() => {
                        if (window.confirm(`Delete "${persona.name}"? This can't be undone.`)) {
                          deletePersona(persona.id);
                        }
                      }}
                    />
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
          </>
        )}
      </div>

      <AnimatePresence>
        {viewing && (
          <PersonaViewDialog
            persona={viewing}
            onClose={() => setViewing(null)}
            onRestoreVersion={(versionIndex) => {
              restorePersonaVersion(viewing.id, versionIndex);
              setViewing(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
