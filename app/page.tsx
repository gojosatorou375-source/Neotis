"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { Header } from "@/components/header";
import { RecoveryDashboard } from "@/components/recovery/recovery-dashboard";
import { Interview } from "@/components/interview";
import { LoadingScreen } from "@/components/loading-screen";
import { CompletionScreen } from "@/components/completion-screen";
import { useInterview } from "@/lib/use-interview";
import { usePersonas } from "@/lib/personas/use-personas";
import { consumePendingLoad } from "@/lib/personas/storage";

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
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
    startNew,
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

  // "+ New Personal Profile" links here with ?new=1 (e.g. from the Skills
  // Library) so they land straight in a fresh interview instead of the
  // marketing landing screen the bare "/" route would otherwise show.
  useEffect(() => {
    if (!hydrated) return;
    if (searchParams.get("new") === "1") {
      startNew();
      router.replace("/");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, searchParams]);

  if (!hydrated) {
    return null;
  }

  const hasSavedProgress = Object.keys(answers).length > 0 && phase !== "landing";

  return (
    <>
      {phase !== "landing" && <Header onGoHome={goHome} />}
      <main className="relative z-10">
        <AnimatePresence mode="wait">
          {phase === "landing" && (
            <RecoveryDashboard
              key="landing"
              onStartPersonal={start}
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
    </>
  );
}

export default function Home() {
  return (
    <Suspense fallback={null}>
      <HomeContent />
    </Suspense>
  );
}
