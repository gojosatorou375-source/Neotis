"use client";

import { Suspense } from "react";
import { Landing } from "@/components/landing";
import { usePersonas } from "@/lib/personas/use-personas";
import { useRouter } from "next/navigation";

function AboutPageContent() {
  const router = useRouter();
  const { personas, hydrated } = usePersonas();

  if (!hydrated) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-[#FAFAFA]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-black border-t-transparent" />
      </div>
    );
  }

  return (
    <Landing
      onStart={() => router.push("/?new=1")}
      hasSavedProgress={false}
      personas={personas}
      onUsePersona={(persona) => {
        if (typeof window !== "undefined") {
          localStorage.setItem("personamd_pending_load", JSON.stringify(persona.answers));
        }
        router.push("/");
      }}
    />
  );
}

export default function AboutPage() {
  return (
    <Suspense fallback={null}>
      <AboutPageContent />
    </Suspense>
  );
}
