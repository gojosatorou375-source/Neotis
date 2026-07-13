"use client";

import { Suspense, useEffect, useState } from "react";
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
import { getSupabase } from "@/lib/supabase/client";
import { LoginPage } from "@/components/login-page";

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

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

  // Handle Authentication State
  useEffect(() => {
    try {
      const supabase = getSupabase();
      
      // Check current session
      supabase.auth.getSession().then(({ data: { session } }) => {
        setUser(session?.user ?? null);
        setAuthLoading(false);
      });

      // Listen for auth events
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null);
        setAuthLoading(false);
      });

      return () => {
        subscription.unsubscribe();
      };
    } catch {
      setAuthLoading(false);
    }
  }, []);

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
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-[#FAFAFA] dark:bg-[#0A0A0A]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-black dark:border-white border-t-transparent" />
      </div>
    );
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
