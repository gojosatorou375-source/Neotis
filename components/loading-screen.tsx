"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { GlassPanel } from "@/components/glass-panel";

interface LoadingScreenProps {
  onDone: () => void;
}

const steps = [
  "Reading your answers",
  "Merging related ideas",
  "Removing duplicates",
  "Writing your profile",
];

export function LoadingScreen({ onDone }: LoadingScreenProps) {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStepIndex((prev) => Math.min(prev + 1, steps.length - 1));
    }, 550);

    const timeout = setTimeout(onDone, 550 * steps.length + 300);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [onDone]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, filter: "blur(8px)" }}
      transition={{ duration: 0.4 }}
      className="flex min-h-screen w-full items-center justify-center px-6"
    >
      <GlassPanel className="flex w-full max-w-[480px] flex-col items-center p-12 text-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "linear" }}
          className="mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--accent)]/10"
        >
          <Sparkles className="h-6 w-6 text-[var(--accent)]" strokeWidth={1.75} />
        </motion.div>
        <h2 className="text-section text-[var(--text-primary)]">
          Building your profile
        </h2>
        <p className="mt-6 text-body text-[var(--text-secondary)]">
          {steps[stepIndex]}...
        </p>
        <div className="mt-8 flex gap-2">
          {steps.map((s, i) => (
            <motion.span
              key={s}
              className="h-1.5 w-8 rounded-full bg-black/10 dark:bg-white/10"
              animate={{
                backgroundColor:
                  i <= stepIndex ? "var(--accent)" : undefined,
              }}
              transition={{ duration: 0.3 }}
            />
          ))}
        </div>
      </GlassPanel>
    </motion.div>
  );
}
