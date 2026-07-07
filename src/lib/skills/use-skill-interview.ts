"use client";

import { useCallback, useEffect, useState } from "react";
import type { ProjectInterviewAnswers } from "@/types/skill";
import { TOTAL_PROJECT_QUESTIONS } from "@/lib/skills/project-interview-questions";

export type SkillInterviewPhase = "setup" | "interview" | "review";

const STORAGE_KEY = "personamd-skill-interview-v1";

interface PersistedState {
  phase: SkillInterviewPhase;
  currentIndex: number;
  answers: ProjectInterviewAnswers;
  projectName: string;
  personaId: string | null;
}

function loadPersisted(): PersistedState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedState;
  } catch {
    return null;
  }
}

/**
 * Drives the Adaptive Project Interview: setup (project name + optional
 * Persona) -> 6-question interview -> review/save. Mirrors use-interview.ts's
 * shape and auto-save behavior, adapted for the Skill flow.
 */
export function useSkillInterview() {
  const [phase, setPhase] = useState<SkillInterviewPhase>("setup");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<ProjectInterviewAnswers>({});
  const [projectName, setProjectName] = useState("");
  const [personaId, setPersonaId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const persisted = loadPersisted();
    if (persisted) {
      setPhase(persisted.phase);
      setCurrentIndex(persisted.currentIndex);
      setAnswers(persisted.answers);
      setProjectName(persisted.projectName);
      setPersonaId(persisted.personaId);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const payload: PersistedState = { phase, currentIndex, answers, projectName, personaId };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [phase, currentIndex, answers, projectName, personaId, hydrated]);

  const startInterview = useCallback((name: string, selectedPersonaId: string | null) => {
    setProjectName(name);
    setPersonaId(selectedPersonaId);
    setCurrentIndex(0);
    setPhase("interview");
  }, []);

  const setAnswer = useCallback((questionId: number, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }, []);

  const next = useCallback(() => {
    setCurrentIndex((prev) => {
      const nextIndex = prev + 1;
      if (nextIndex >= TOTAL_PROJECT_QUESTIONS) {
        setPhase("review");
        return prev;
      }
      return nextIndex;
    });
  }, []);

  const prev = useCallback(() => {
    setCurrentIndex((p) => Math.max(0, p - 1));
  }, []);

  const jumpTo = useCallback((index: number) => {
    setCurrentIndex(Math.min(Math.max(index, 0), TOTAL_PROJECT_QUESTIONS - 1));
    setPhase("interview");
  }, []);

  const reset = useCallback(() => {
    setAnswers({});
    setCurrentIndex(0);
    setProjectName("");
    setPersonaId(null);
    setPhase("setup");
    window.localStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    hydrated,
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
  };
}
