"use client";

import Link from "next/link";
import { BookmarkPlus, Home, LayoutDashboard, Layers } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Logo } from "@/components/logo";

interface HeaderProps {
  /** When provided, shows a "Home" button that returns to the landing screen (without losing progress). */
  onGoHome?: () => void;
}

export function Header({ onGoHome }: HeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-20 flex items-center justify-between px-6 py-5 sm:px-10">
      <div className="flex items-center gap-2 text-[15px] font-semibold tracking-tight text-[var(--text-primary)]">
        <Logo size={22} />
        Noetis
      </div>
      <div className="flex items-center gap-3">
        {onGoHome && (
          <button
            type="button"
            onClick={onGoHome}
            className="flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-white/30 px-3 py-1.5 text-small font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] dark:bg-white/5"
          >
            <Home className="h-3.5 w-3.5" />
            Home
          </button>
        )}
        <Link
          href="/recovery"
          className="flex items-center gap-1.5 rounded-full bg-[var(--accent)] px-3.5 py-1.5 text-small font-semibold text-white shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_4px_16px_-4px_var(--accent)] transition hover:brightness-110"
        >
          <LayoutDashboard className="h-3.5 w-3.5" />
          Dashboard
        </Link>
        <ThemeToggle />
      </div>
    </header>
  );
}
