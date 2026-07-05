"use client";

import { useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Landing } from "@/components/landing";
import { Interview } from "@/components/interview";
import { LoadingScreen } from "@/components/loading-screen";
import { CompletionScreen } from "@/components/completion-screen";
import { useInterview } from "@/lib/use-interview";
import { usePersonas } from "@/lib/personas/use-personas";
import { consumePendingLoad } from "@/lib/personas/storage";

export default function Home() {
  const {
    phase,
    currentIndex,
    answers,
    hydrated,
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
  } = useInterview();

  const { personas, savePersona } = usePersonas();

  // If the user clicked "Edit answers" from the Persona Library, pick up the
  // handed-off answers and drop straight into the interview.
  useEffect(() => {
    if (!hydrated) return;
    const pending = consumePendingLoad();
    if (pending) loadAnswers(pending);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  if (!hydrated) {
    return null;
  }

  const hasSavedProgress = Object.keys(answers).length > 0 && phase !== "landing";

  return (
    <>
      <Header onGoHome={phase !== "landing" ? goHome : undefined} />
      <main className="relative z-10">
        <AnimatePresence mode="wait">
          {phase === "landing" && (
            <Landing
              key="landing"
              onStart={start}
              hasSavedProgress={hasSavedProgress}
              personas={personas}
              onUsePersona={(persona) => applyPersona(persona.answers)}
            />
          )}
          {phase === "interview" && (
            <Interview
              key="interview"
              currentIndex={currentIndex}
              answers={answers}
              onChange={setAnswer}
              onNext={next}
              onPrev={prev}
            />
          )}
          {phase === "loading" && (
            <LoadingScreen key="loading" onDone={finishLoading} />
          )}
          {phase === "completion" && (
            <CompletionScreen
              key="completion"
              answers={answers}
              onEdit={() => jumpTo(0)}
              onRestart={restart}
              onSavePersona={(name, markdown, tags) => savePersona(name, answers, markdown, tags)}
              existingPersonaNames={personas.map((p) => p.name)}
            />
          )}
        </AnimatePresence>
      </main>
      {phase === "landing" && <Footer />}
    </>
  );
}
