"use client";

import { useCallback, useEffect, useState } from "react";
import type { Answers, Phase } from "@/types";
import { TOTAL_QUESTIONS } from "@/lib/questions";

const STORAGE_KEY = "personamd-interview-v1";

interface PersistedState {
  currentIndex: number;
  answers: Answers;
  phase: Phase;
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
 * Central state for the interview flow: current phase, question index,
 * answers, and persistence to localStorage (auto-save).
 */
export function useInterview() {
  const [phase, setPhase] = useState<Phase>("landing");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage on mount.
  useEffect(() => {
    const persisted = loadPersisted();
    if (persisted) {
      setPhase(persisted.phase === "loading" ? "interview" : persisted.phase);
      setCurrentIndex(persisted.currentIndex);
      setAnswers(persisted.answers);
    }
    setHydrated(true);
  }, []);

  // Auto-save whenever state changes.
  useEffect(() => {
    if (!hydrated) return;
    const payload: PersistedState = { phase, currentIndex, answers };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [phase, currentIndex, answers, hydrated]);

  const start = useCallback(() => {
    setPhase("interview");
    setCurrentIndex(0);
  }, []);

  const setAnswer = useCallback((questionId: number, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }, []);

  const next = useCallback(() => {
    setCurrentIndex((prev) => {
      const nextIndex = prev + 1;
      if (nextIndex >= TOTAL_QUESTIONS) {
        setPhase("loading");
        return prev;
      }
      return nextIndex;
    });
  }, []);

  const prev = useCallback(() => {
    setCurrentIndex((p) => Math.max(0, p - 1));
  }, []);

  const jumpTo = useCallback((index: number) => {
    setCurrentIndex(Math.min(Math.max(index, 0), TOTAL_QUESTIONS - 1));
    setPhase("interview");
  }, []);

  const finishLoading = useCallback(() => {
    setPhase("completion");
  }, []);

  const restart = useCallback(() => {
    setAnswers({});
    setCurrentIndex(0);
    setPhase("landing");
    window.localStorage.removeItem(STORAGE_KEY);
  }, []);

  /** Restores a saved persona's answers into the interview for editing/regeneration. */
  const loadAnswers = useCallback((restored: Answers) => {
    setAnswers(restored);
    setCurrentIndex(0);
    setPhase("interview");
  }, []);

  /**
   * "Use" a saved persona straight from the landing page: load its answers
   * and jump directly to the loading -> completion flow, skipping the
   * question-by-question interview entirely.
   */
  const applyPersona = useCallback((restored: Answers) => {
    setAnswers(restored);
    setCurrentIndex(TOTAL_QUESTIONS - 1);
    setPhase("loading");
  }, []);

  /** Jumps back to the landing/home screen without losing in-progress answers. */
  const goHome = useCallback(() => {
    setPhase("landing");
  }, []);

  /** Discards any in-progress/persisted answers and jumps straight into a
   * fresh interview -- used when the user explicitly asks for a *new*
   * profile (e.g. from the Skills Library) rather than the marketing
   * landing screen they'd otherwise land on. */
  const startNew = useCallback(() => {
    setAnswers({});
    setCurrentIndex(0);
    setPhase("interview");
  }, []);

  const progress = ((currentIndex + (phase === "completion" ? 1 : 0)) / TOTAL_QUESTIONS) * 100;

  return {
    phase,
    currentIndex,
    answers,
    hydrated,
    progress,
    start,
    setAnswer,
    next,
    prev,
    jumpTo,
    finishLoading,
    restart,
    loadAnswers,
    applyPersona,
    goHome,
    startNew,
  };
}
