"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Boxes,
  Clock3,
  FileText,
  LayoutDashboard,
  MessageCircle,
  MessageSquare,
  Network,
  Sparkles,
  Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassPanel } from "@/components/glass-panel";
import { InterviewChoiceDialog } from "@/components/interview-choice-dialog";
import { TOTAL_QUESTIONS } from "@/lib/questions";
import type { Persona } from "@/types/persona";

// Apple's signature "ease-out expo"-ish curve — fast start, long soft settle.
const APPLE_EASE = [0.16, 1, 0.3, 1] as const;

const reveal = (delay = 0) => ({
  initial: { opacity: 0, y: 36 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.8, delay, ease: APPLE_EASE },
});

const capabilities = [
  {
    icon: MessageCircle,
    title: "One guided interview",
    description: "10 short questions, answered once, turned into a profile every model can read.",
  },
  {
    icon: MessageSquare,
    title: "Capture every conversation",
    description: "A lightweight browser extension pulls in chats from ChatGPT, Claude, and more — automatically.",
  },
  {
    icon: Clock3,
    title: "A timeline of your work",
    description: "See everything you've discussed across every provider, laid out chronologically in one place.",
  },
  {
    icon: Network,
    title: "A living knowledge graph",
    description: "Conversations connect through shared topics — drag, zoom, and explore how your ideas relate.",
  },
  {
    icon: Boxes,
    title: "Portable capsules",
    description: "Distill any conversation into a shareable Markdown capsule you can hand to a different model.",
  },
  {
    icon: LayoutDashboard,
    title: "One recovery dashboard",
    description: "Search anything you remember, pick up where a conversation hit its limit, and never lose context again.",
  },
];

interface LandingProps {
  onStart: () => void;
  hasSavedProgress: boolean;
  personas: Persona[];
  onUsePersona: (persona: Persona) => void;
}

const features = [
  {
    icon: MessageCircle,
    title: "10 thoughtful questions",
    description: "A short, conversational interview — never a form.",
  },
  {
    icon: Sparkles,
    title: "AI-synthesized profile",
    description: "Your answers are merged and distilled, not just copied.",
  },
  {
    icon: FileText,
    title: "One portable file",
    description: "AI_PROFILE.md works with any modern assistant.",
  },
];

export function Landing({ onStart, hasSavedProgress, personas, onUsePersona }: LandingProps) {
  const router = useRouter();
  const [showChoice, setShowChoice] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, filter: "blur(8px)" }}
      transition={{ duration: 0.4 }}
      className="flex min-h-screen w-full flex-col items-center justify-center px-6 pt-28 pb-10 sm:pt-32"
    >
      <div className="mx-auto flex max-w-[900px] flex-col items-center text-center">
        <motion.span
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="mb-6 rounded-full border border-[var(--border)] bg-white/40 px-4 py-1.5 text-small font-medium text-[var(--text-secondary)] dark:bg-white/5"
        >
          A better way to be understood by AI
        </motion.span>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="text-hero tracking-tight text-[var(--text-primary)]"
        >
          Meet Noetis
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="mt-6 max-w-[560px] text-body text-[var(--text-secondary)]"
        >
          Document your personal AI preferences and project knowledge. Generate portable profiles that teach every AI assistant how to work with you and your codebase.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="mt-10"
        >
          <Link href="/recovery?tab=skills">
            <Button size="lg" className="group">
              Get started
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Button>
          </Link>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="mt-4 text-small text-[var(--text-secondary)]"
        >
          Takes about 3–5 minutes per profile
        </motion.p>

        {personas.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.6 }}
            className="mt-16 w-full"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-body font-semibold text-[var(--text-primary)]">
                Your personas
              </h2>
              <Link
                href="/personas"
                className="text-small font-medium text-[var(--accent)] hover:underline"
              >
                Manage all
              </Link>
            </div>
            <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-3">
              {personas.slice(0, 6).map((persona) => (
                <motion.button
                  key={persona.id}
                  type="button"
                  onClick={() => onUsePersona(persona)}
                  whileHover={{ y: -3 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="glass-panel flex items-center gap-3 rounded-xl3 p-4 text-left"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--accent)]/15">
                    <Tag className="h-4 w-4 text-[var(--accent)]" strokeWidth={1.75} />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-small font-semibold text-[var(--text-primary)]">
                      {persona.name}
                    </p>
                    <p className="truncate text-[11px] text-[var(--text-secondary)]">
                      Updated {new Date(persona.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.6 }}
          className="mt-20 grid w-full grid-cols-1 gap-4 sm:grid-cols-3"
        >
          {features.map((feature) => (
            <GlassPanel
              key={feature.title}
              className="flex flex-col items-start gap-3 p-6 text-left"
              whileHover={{ y: -4 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <feature.icon
                className="h-5 w-5 text-[var(--accent)]"
                strokeWidth={1.75}
              />
              <h3 className="text-body font-semibold text-[var(--text-primary)]">
                {feature.title}
              </h3>
              <p className="text-small text-[var(--text-secondary)]">
                {feature.description}
              </p>
            </GlassPanel>
          ))}
        </motion.div>
      </div>

      {/* --- Everything the product does, explained for a first-time visitor --- */}
      <div className="mx-auto mt-32 flex w-full max-w-[1100px] flex-col items-center px-2 text-center">
        <motion.span
          {...reveal()}
          className="mb-4 rounded-full border border-[var(--border)] bg-white/40 px-4 py-1.5 text-small font-medium text-[var(--text-secondary)] dark:bg-white/5"
        >
          Beyond the profile
        </motion.span>
        <motion.h2 {...reveal(0.08)} className="text-section tracking-tight text-[var(--text-primary)]">
          One place that remembers everything
        </motion.h2>
        <motion.p {...reveal(0.16)} className="mt-4 max-w-[620px] text-body text-[var(--text-secondary)]">
          Noetis doesn&apos;t stop at your profile. It quietly builds a
          complete, searchable memory of your AI work — across every
          provider you use.
        </motion.p>

        <div className="mt-14 grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {capabilities.map((item, i) => (
            <motion.div key={item.title} {...reveal(0.06 * i)}>
              <GlassPanel
                className="flex h-full flex-col items-start gap-3 p-6 text-left"
                whileHover={{ y: -4 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent)]/15">
                  <item.icon className="h-5 w-5 text-[var(--accent)]" strokeWidth={1.75} />
                </div>
                <h3 className="text-body font-semibold text-[var(--text-primary)]">{item.title}</h3>
                <p className="text-small text-[var(--text-secondary)]">{item.description}</p>
              </GlassPanel>
            </motion.div>
          ))}
        </div>
      </div>

      {/* --- Dashboard preview + CTA --- */}
      <motion.div {...reveal()} className="mx-auto mt-28 mb-24 w-full max-w-[1100px] px-2">
        <GlassPanel className="relative overflow-hidden p-8 sm:p-12">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,var(--accent)_0%,transparent_45%)] opacity-[0.08]" />
          <div className="relative grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
            <div className="text-left">
              <h2 className="text-section tracking-tight text-[var(--text-primary)]">
                See it all in the Dashboard
              </h2>
              <p className="mt-4 max-w-[440px] text-body text-[var(--text-secondary)]">
                Every captured conversation, your timeline, your knowledge
                graph, and your saved capsules — recovered stats included —
                live in one workspace built to help you pick up exactly where
                you left off.
              </p>
              <div className="mt-8">
                <Link href="/recovery">
                  <Button size="lg" className="group">
                    Open the Dashboard
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </Button>
                </Link>
              </div>
            </div>

            {/* Stylized dashboard mockup — mirrors the real layout without being a literal screenshot */}
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.9, delay: 0.15, ease: APPLE_EASE }}
              className="overflow-hidden rounded-2xl border border-white/10 bg-[#111114] shadow-[0_20px_60px_-20px_rgba(0,0,0,0.5)]"
            >
              <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
                <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
                <span className="ml-3 text-[11px] font-medium text-white/40">Dashboard</span>
              </div>
              <div className="space-y-3 p-4">
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <div className="mb-2 h-2 w-28 rounded-full bg-white/15" />
                  <div className="h-8 w-full rounded-lg bg-white/[0.04]" />
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[25, 12, 6, "0h"].map((val, i) => (
                    <div key={i} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                      <div className="text-[15px] font-semibold text-white/80">{val}</div>
                      <div className="mt-1 h-1.5 w-10 rounded-full bg-white/10" />
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {["ChatGPT", "Claude", "Gemini"].map((label, i) => (
                    <div
                      key={label}
                      className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-2"
                    >
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ background: ["#10a37f", "#d97757", "#4285f4"][i] }}
                      />
                      <span className="text-[10.5px] font-medium text-white/50">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </GlassPanel>
      </motion.div>

      <AnimatePresence>
        {showChoice && (
          <InterviewChoiceDialog
            onClose={() => setShowChoice(false)}
            onChoosePersonal={() => {
              setShowChoice(false);
              onStart();
            }}
            onChooseProject={() => {
              setShowChoice(false);
              router.push("/skills/new?mode=project");
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
