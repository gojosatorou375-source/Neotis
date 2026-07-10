"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, CornerDownLeft } from "lucide-react";
import { GlassPanel } from "@/components/glass-panel";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { Question } from "@/types";
import { TOTAL_PROJECT_QUESTIONS } from "@/lib/skills/project-interview-questions";

interface SkillQuestionCardProps {
  question: Question;
  index: number;
  value: string;
  onChange: (value: string) => void;
  onNext: () => void;
  onPrev: () => void;
  canGoPrev: boolean;
}

const MIN_LENGTH = 2;

/** Same interaction model as QuestionCard, sized for the 6-question
 * Adaptive Project Interview instead of the 6-question Persona interview. */
export function SkillQuestionCard({
  question,
  index,
  value,
  onChange,
  onNext,
  onPrev,
  canGoPrev,
}: SkillQuestionCardProps) {
  const [touched, setTouched] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setTouched(false);
    const timer = setTimeout(() => textareaRef.current?.focus(), 300);
    return () => clearTimeout(timer);
  }, [question.id]);

  const isValid = value.trim().length >= MIN_LENGTH;
  const progressValue = ((index + 1) / TOTAL_PROJECT_QUESTIONS) * 100;

  const handleNext = () => {
    if (!isValid) {
      setTouched(true);
      return;
    }
    onNext();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleNext();
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center px-6 py-24">
      <div className="w-full max-w-[900px]">
        <div className="mb-8 flex items-center justify-between">
          <span className="text-small font-medium text-[var(--text-secondary)]">
            Question {index + 1} of {TOTAL_PROJECT_QUESTIONS}
          </span>
          <span className="text-small font-medium text-[var(--text-secondary)]">
            {Math.round(progressValue)}%
          </span>
        </div>
        <div className="mb-10">
          <Progress value={progressValue} label={`Question ${index + 1} of ${TOTAL_PROJECT_QUESTIONS}`} />
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={question.id}
            initial={{ opacity: 0, y: 24, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -24, filter: "blur(6px)" }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <GlassPanel className="p-8 sm:p-12">
              <h2 className="text-question tracking-tight text-[var(--text-primary)]">
                {question.title}
              </h2>
              <p className="mt-4 text-body text-[var(--text-secondary)]">
                {question.description}
              </p>

              <div className="mt-8">
                <Textarea
                  ref={textareaRef}
                  rows={5}
                  value={value}
                  placeholder={question.placeholder}
                  onChange={(e) => onChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  aria-label={question.title}
                  aria-invalid={touched && !isValid}
                  aria-describedby={`${question.id}-example${
                    touched && !isValid ? ` ${question.id}-error` : ""
                  }`}
                />
                <p
                  id={`${question.id}-example`}
                  className="mt-2.5 text-small italic text-[var(--text-secondary)]/80"
                >
                  {question.placeholder}
                </p>
                <div className="mt-2 flex items-center justify-between">
                  <AnimatePresence>
                    {touched && !isValid && (
                      <motion.p
                        id={`${question.id}-error`}
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="text-small text-red-500"
                        role="alert"
                      >
                        Please share a few words before continuing.
                      </motion.p>
                    )}
                  </AnimatePresence>
                  <span className="ml-auto flex items-center gap-1.5 text-small text-[var(--text-secondary)]">
                    <CornerDownLeft className="h-3.5 w-3.5" />⌘/Ctrl + Enter
                  </span>
                </div>
              </div>

              <div className="mt-10 flex items-center justify-between">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={onPrev}
                  disabled={!canGoPrev}
                  aria-label="Previous question"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
                <Button type="button" onClick={handleNext} aria-label="Next question">
                  {index === TOTAL_PROJECT_QUESTIONS - 1 ? "Finish" : "Next"}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </GlassPanel>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
