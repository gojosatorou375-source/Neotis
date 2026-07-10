"use client";

import { useEffect } from "react";
import { QuestionCard } from "@/components/question-card";
import { QUESTIONS } from "@/lib/questions";
import type { Answers } from "@/types";

interface InterviewProps {
  currentIndex: number;
  answers: Answers;
  onChange: (questionId: number, value: string) => void;
  onNext: () => void;
  onPrev: () => void;
}

export function Interview({
  currentIndex,
  answers,
  onChange,
  onNext,
  onPrev,
}: InterviewProps) {
  const question = QUESTIONS[currentIndex];

  // Keyboard navigation: Escape to blur, arrow keys handled only outside inputs.
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const isTyping = target.tagName === "TEXTAREA" || target.tagName === "INPUT";
      if (isTyping) return;
      if (e.key === "ArrowRight") onNext();
      if (e.key === "ArrowLeft") onPrev();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onNext, onPrev]);

  return (
    <QuestionCard
      question={question}
      index={currentIndex}
      value={answers[question.id] ?? ""}
      onChange={(value) => onChange(question.id, value)}
      onNext={onNext}
      onPrev={onPrev}
      canGoPrev={currentIndex > 0}
    />
  );
}
