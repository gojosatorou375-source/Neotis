"use client";

import { motion } from "framer-motion";
import { User, Briefcase, X, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface OnboardingChoiceDialogProps {
  onClose: () => void;
  onCreatePersonal: () => void;
  onCreateProject: () => void;
}

export function OnboardingChoiceDialog({
  onClose,
  onCreatePersonal,
  onCreateProject,
}: OnboardingChoiceDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="relative w-full max-w-2xl overflow-hidden border-2 border-black bg-white rounded-[24px] p-6 sm:p-10 shadow-[8px_8px_0px_rgba(0,0,0,1)] text-black"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full border-2 border-transparent hover:border-black hover:bg-black/5 transition-all"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="text-center space-y-3 mb-8 sm:mb-10">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[#B8FF33] border-2 border-black px-4 py-1.5 text-xs font-black uppercase tracking-widest shadow-[3px_3px_0px_rgba(0,0,0,1)]">
            <Sparkles className="h-3.5 w-3.5 fill-black" />
            Get Started
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight mt-2">
            Configure Your AI Persona or Project Context
          </h2>
          <p className="text-sm text-black/60 max-w-lg mx-auto">
            Choose what type of document you want to create to enhance your LLM chats. You can generate a global personal instruction file or a workspace-specific project context.
          </p>
        </div>

        {/* Choice Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
          {/* Choice 1: Personal Profile */}
          <button
            onClick={onCreatePersonal}
            className="flex flex-col text-left border-2 border-black bg-white rounded-[20px] p-6 shadow-[5px_5px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[8px_8px_0px_rgba(0,0,0,1)] transition-all group hover:border-[#B8FF33] min-h-[220px]"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-black text-white group-hover:bg-[#B8FF33] group-hover:text-black border-2 border-black transition-colors duration-200">
              <User className="h-6 w-6" />
            </div>
            <div className="mt-5 space-y-2 flex-grow">
              <h3 className="text-lg font-black tracking-tight flex items-center gap-1.5">
                Personalized Profile
                <span className="text-[10px] bg-black text-white px-2 py-0.5 rounded-full border border-black uppercase font-bold">
                  personalized.md
                </span>
              </h3>
              <p className="text-xs text-black/60 leading-relaxed">
                Create a global instruction profile by answering 10 questions. Defines your personality, writing style, expertise, and coding guidelines.
              </p>
            </div>
            <div className="mt-4 flex items-center text-xs font-black uppercase tracking-wider group-hover:text-[#B8FF33] transition-colors duration-200">
              Create Profile <ArrowRight className="ml-1.5 h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
            </div>
          </button>

          {/* Choice 2: Project Scope */}
          <button
            onClick={onCreateProject}
            className="flex flex-col text-left border-2 border-black bg-white rounded-[20px] p-6 shadow-[5px_5px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[8px_8px_0px_rgba(0,0,0,1)] transition-all group hover:border-[#B8FF33] min-h-[220px]"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-black text-white group-hover:bg-[#B8FF33] group-hover:text-black border-2 border-black transition-colors duration-200">
              <Briefcase className="h-6 w-6" />
            </div>
            <div className="mt-5 space-y-2 flex-grow">
              <h3 className="text-lg font-black tracking-tight flex items-center gap-1.5">
                Project Workspace
                <span className="text-[10px] bg-[#B8FF33] text-black px-2 py-0.5 rounded-full border border-black uppercase font-bold">
                  project.md
                </span>
              </h3>
              <p className="text-xs text-black/60 leading-relaxed">
                Answer 6 project-centric questions to compile specific technical stacks, rules, structures, and preferences for a codebase.
              </p>
            </div>
            <div className="mt-4 flex items-center text-xs font-black uppercase tracking-wider group-hover:text-[#B8FF33] transition-colors duration-200">
              Create Workspace <ArrowRight className="ml-1.5 h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
            </div>
          </button>
        </div>

        {/* Footer/Skip option */}
        <div className="flex justify-center border-t border-black/10 pt-6">
          <Button
            variant="ghost"
            onClick={onClose}
            className="text-xs font-black tracking-wide uppercase text-black/60 hover:text-black hover:bg-black/5 rounded-full px-6 py-2 border border-transparent hover:border-black"
          >
            Explore Dashboard First
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
