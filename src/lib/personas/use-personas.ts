"use client";

import { useCallback, useEffect, useState } from "react";
import type { Persona } from "@/types/persona";
import type { Answers } from "@/types";
import { deletePersonaRow, fetchPersonas, insertPersona, updatePersonaRow } from "@/lib/personas/storage";

/** Max prior versions kept per persona before the oldest is dropped. */
const MAX_HISTORY = 10;

export function usePersonas() {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    fetchPersonas()
      .then(setPersonas)
      .catch((err) => console.error("Failed to load personas:", err))
      .finally(() => setHydrated(true));
  }, []);

  /**
   * Saves the current profile under `name`. If a persona with the same name
   * (case-insensitive) already exists, it's updated in place rather than
   * creating a duplicate — so re-saving "Coder" after tweaking answers just
   * refreshes that persona. Updates React state immediately (optimistic)
   * and persists to Supabase in the background.
   */
  const savePersona = useCallback(
    (name: string, answers: Answers, markdown: string, tags: string[] = []): Persona => {
      const trimmedName = name.trim();
      const now = new Date().toISOString();
      const existing = personas.find(
        (p) => p.name.toLowerCase() === trimmedName.toLowerCase()
      );

      if (existing) {
        // Keep the version being replaced so it can be restored later.
        const priorVersion = { answers: existing.answers, markdown: existing.markdown, savedAt: existing.updatedAt };
        const updated: Persona = {
          ...existing,
          answers,
          markdown,
          tags: tags.length > 0 ? tags : existing.tags,
          updatedAt: now,
          history: [priorVersion, ...existing.history].slice(0, MAX_HISTORY),
        };
        setPersonas((prev) => prev.map((p) => (p.id === existing.id ? updated : p)));
        updatePersonaRow(updated).catch((err) => console.error("Failed to save persona update:", err));
        return updated;
      }

      const created: Persona = {
        id: crypto.randomUUID(),
        name: trimmedName || "Untitled persona",
        createdAt: now,
        updatedAt: now,
        answers,
        markdown,
        tags,
        history: [],
      };
      setPersonas((prev) => [created, ...prev]);
      insertPersona(created).catch((err) => console.error("Failed to save persona:", err));
      return created;
    },
    [personas]
  );

  /** Restores a past version as the current state, stashing what was current
   * into history so the restore itself is reversible. */
  const restorePersonaVersion = useCallback(
    (id: string, versionIndex: number) => {
      const persona = personas.find((p) => p.id === id);
      if (!persona) return;
      const version = persona.history[versionIndex];
      if (!version) return;

      const now = new Date().toISOString();
      const currentAsVersion = {
        answers: persona.answers,
        markdown: persona.markdown,
        savedAt: persona.updatedAt,
      };
      const remainingHistory = persona.history.filter((_, i) => i !== versionIndex);

      const restored: Persona = {
        ...persona,
        answers: version.answers,
        markdown: version.markdown,
        updatedAt: now,
        history: [currentAsVersion, ...remainingHistory].slice(0, MAX_HISTORY),
      };
      setPersonas((prev) => prev.map((p) => (p.id === id ? restored : p)));
      updatePersonaRow(restored).catch((err) => console.error("Failed to save restored version:", err));
    },
    [personas]
  );

  const setPersonaTags = useCallback(
    (id: string, tags: string[]) => {
      const persona = personas.find((p) => p.id === id);
      if (!persona) return;
      const updated = { ...persona, tags };
      setPersonas((prev) => prev.map((p) => (p.id === id ? updated : p)));
      updatePersonaRow(updated).catch((err) => console.error("Failed to save tags:", err));
    },
    [personas]
  );

  const renamePersona = useCallback(
    (id: string, name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      const persona = personas.find((p) => p.id === id);
      if (!persona) return;
      const updated = { ...persona, name: trimmed, updatedAt: new Date().toISOString() };
      setPersonas((prev) => prev.map((p) => (p.id === id ? updated : p)));
      updatePersonaRow(updated).catch((err) => console.error("Failed to rename persona:", err));
    },
    [personas]
  );

  const updatePersonaMarkdown = useCallback(
    (id: string, markdown: string) => {
      const persona = personas.find((p) => p.id === id);
      if (!persona) return;
      const now = new Date().toISOString();
      const priorVersion = { answers: persona.answers, markdown: persona.markdown, savedAt: persona.updatedAt };
      const updated: Persona = {
        ...persona,
        markdown,
        updatedAt: now,
        history: [priorVersion, ...persona.history].slice(0, MAX_HISTORY),
      };
      setPersonas((prev) => prev.map((p) => (p.id === id ? updated : p)));
      updatePersonaRow(updated).catch((err) => console.error("Failed to save persona markdown:", err));
    },
    [personas]
  );

  const deletePersona = useCallback((id: string) => {
    setPersonas((prev) => prev.filter((p) => p.id !== id));
    deletePersonaRow(id).catch((err) => console.error("Failed to delete persona:", err));
  }, []);

  return {
    hydrated,
    personas,
    savePersona,
    renamePersona,
    deletePersona,
    restorePersonaVersion,
    setPersonaTags,
    updatePersonaMarkdown,
  };
}
