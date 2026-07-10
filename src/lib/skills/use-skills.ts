"use client";

import { useCallback } from "react";
import type { Skill, ProjectInterviewAnswers } from "@/types/skill";
import { skillsCollection } from "@/lib/skills/storage";
import { logOnError, useHydratedCollection } from "@/lib/data/use-hydrated-collection";

/** Max prior versions kept per Skill before the oldest is dropped. */
const MAX_HISTORY = 10;

export function useSkills() {
  const { items: skills, setItems: setSkills, hydrated, error, reload } = useHydratedCollection(skillsCollection);

  /**
   * Creates a new Skill from a completed Adaptive Project Interview. Updates
   * React state immediately (optimistic) and persists to Supabase in the
   * background.
   */
  const createSkill = useCallback(
    (
      name: string,
      projectName: string,
      personaId: string | null,
      answers: ProjectInterviewAnswers,
      markdown: string,
      tags: string[] = []
    ): Skill => {
      const now = new Date().toISOString();
      const created: Skill = {
        id: crypto.randomUUID(),
        name: name.trim() || "Untitled skill",
        projectName: projectName.trim(),
        personaId,
        createdAt: now,
        updatedAt: now,
        answers,
        markdown,
        tags,
        favorite: false,
        pinned: false,
        archived: false,
        history: [],
      };
      setSkills((prev) => [created, ...prev]);
      skillsCollection.insert(created).catch(logOnError("Failed to save skill"));
      return created;
    },
    [setSkills]
  );

  /** Re-runs the interview for an existing Skill, keeping the old version in history. */
  const updateSkillAnswers = useCallback(
    (id: string, answers: ProjectInterviewAnswers, markdown: string) => {
      setSkills((prev) =>
        prev.map((s) => {
          if (s.id !== id) return s;
          const now = new Date().toISOString();
          const priorVersion = { answers: s.answers, markdown: s.markdown, savedAt: s.updatedAt };
          const updated: Skill = {
            ...s,
            answers,
            markdown,
            updatedAt: now,
            history: [priorVersion, ...s.history].slice(0, MAX_HISTORY),
          };
          skillsCollection.update(updated).catch(logOnError("Failed to update skill"));
          return updated;
        })
      );
    },
    [setSkills]
  );

  const updateSkillMarkdown = useCallback(
    (id: string, markdown: string) => {
      setSkills((prev) =>
        prev.map((s) => {
          if (s.id !== id) return s;
          const now = new Date().toISOString();
          const priorVersion = { answers: s.answers, markdown: s.markdown, savedAt: s.updatedAt };
          const updated: Skill = {
            ...s,
            markdown,
            updatedAt: now,
            history: [priorVersion, ...s.history].slice(0, MAX_HISTORY),
          };
          skillsCollection.update(updated).catch(logOnError("Failed to update skill markdown"));
          return updated;
        })
      );
    },
    [setSkills]
  );

  const restoreSkillVersion = useCallback(
    (id: string, versionIndex: number) => {
      setSkills((prev) =>
        prev.map((s) => {
          if (s.id !== id) return s;
          const version = s.history[versionIndex];
          if (!version) return s;
          const now = new Date().toISOString();
          const currentAsVersion = { answers: s.answers, markdown: s.markdown, savedAt: s.updatedAt };
          const remainingHistory = s.history.filter((_, i) => i !== versionIndex);
          const restored: Skill = {
            ...s,
            answers: version.answers,
            markdown: version.markdown,
            updatedAt: now,
            history: [currentAsVersion, ...remainingHistory].slice(0, MAX_HISTORY),
          };
          skillsCollection.update(restored).catch(logOnError("Failed to restore skill version"));
          return restored;
        })
      );
    },
    [setSkills]
  );

  const renameSkill = useCallback(
    (id: string, name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      setSkills((prev) =>
        prev.map((s) => {
          if (s.id !== id) return s;
          const updated = { ...s, name: trimmed, updatedAt: new Date().toISOString() };
          skillsCollection.update(updated).catch(logOnError("Failed to rename skill"));
          return updated;
        })
      );
    },
    [setSkills]
  );

  const setSkillTags = useCallback(
    (id: string, tags: string[]) => {
      setSkills((prev) =>
        prev.map((s) => {
          if (s.id !== id) return s;
          const updated = { ...s, tags, updatedAt: new Date().toISOString() };
          skillsCollection.update(updated).catch(logOnError("Failed to save skill tags"));
          return updated;
        })
      );
    },
    [setSkills]
  );

  const toggleFavorite = useCallback(
    (id: string) => {
      setSkills((prev) =>
        prev.map((s) => {
          if (s.id !== id) return s;
          const updated = { ...s, favorite: !s.favorite, updatedAt: new Date().toISOString() };
          skillsCollection.update(updated).catch(logOnError("Failed to toggle skill favorite"));
          return updated;
        })
      );
    },
    [setSkills]
  );

  const togglePinned = useCallback(
    (id: string) => {
      setSkills((prev) =>
        prev.map((s) => {
          if (s.id !== id) return s;
          const updated = { ...s, pinned: !s.pinned, updatedAt: new Date().toISOString() };
          skillsCollection.update(updated).catch(logOnError("Failed to toggle skill pin"));
          return updated;
        })
      );
    },
    [setSkills]
  );

  const toggleArchived = useCallback(
    (id: string) => {
      setSkills((prev) =>
        prev.map((s) => {
          if (s.id !== id) return s;
          const updated = { ...s, archived: !s.archived, updatedAt: new Date().toISOString() };
          skillsCollection.update(updated).catch(logOnError("Failed to toggle skill archive"));
          return updated;
        })
      );
    },
    [setSkills]
  );

  const duplicateSkill = useCallback(
    (id: string) => {
      setSkills((prev) => {
        const source = prev.find((s) => s.id === id);
        if (!source) return prev;
        const now = new Date().toISOString();
        const copy: Skill = {
          ...source,
          id: crypto.randomUUID(),
          name: `${source.name} (copy)`,
          favorite: false,
          pinned: false,
          archived: false,
          createdAt: now,
          updatedAt: now,
          history: [],
        };
        skillsCollection.insert(copy).catch(logOnError("Failed to duplicate skill"));
        return [copy, ...prev];
      });
    },
    [setSkills]
  );

  const deleteSkill = useCallback(
    (id: string) => {
      setSkills((prev) => prev.filter((s) => s.id !== id));
      skillsCollection.remove(id).catch(logOnError("Failed to delete skill"));
    },
    [setSkills]
  );

  return {
    hydrated,
    error,
    reload,
    skills,
    createSkill,
    updateSkillAnswers,
    updateSkillMarkdown,
    restoreSkillVersion,
    renameSkill,
    setSkillTags,
    toggleFavorite,
    togglePinned,
    toggleArchived,
    duplicateSkill,
    deleteSkill,
  };
}
