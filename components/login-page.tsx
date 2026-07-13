"use client";

import { useState } from "react";
import { getSupabase } from "@/lib/supabase/client";
import { Chrome, Mail, Sparkles } from "lucide-react";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      const supabase = getSupabase();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Google Sign-in failed." });
      setLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    try {
      setLoading(true);
      setMessage(null);
      const supabase = getSupabase();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });
      if (error) throw error;
      setMessage({ type: "success", text: "Check your email for the magic link!" });
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Magic link request failed." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#FAFAFA] dark:bg-[#0A0A0A] px-4">
      <div className="w-full max-w-md bg-white dark:bg-[#121212] border-4 border-black dark:border-white p-8 rounded-3xl shadow-[8px_8px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_rgba(255,255,255,0.15)] transition-all">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border-2 border-black dark:border-white bg-[#B8FF33] text-black text-xs font-black uppercase tracking-widest mb-4 shadow-[2px_2px_0px_rgba(0,0,0,1)]">
            <Sparkles className="h-3.5 w-3.5" />
            Noetis Auth
          </div>
          <h1 className="text-3xl font-black tracking-tight text-black dark:text-white mb-2 uppercase">
            Welcome to Noetis
          </h1>
          <p className="text-sm font-bold text-black/60 dark:text-white/60">
            Sign in to access your personal AI profiles & conversations
          </p>
        </div>

        {/* Feedback Messages */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-xl border-2 border-black font-bold text-xs uppercase tracking-wide shadow-[2px_2px_0px_rgba(0,0,0,1)] ${
              message.type === "success"
                ? "bg-[#B8FF33] text-black"
                : "bg-red-200 dark:bg-red-900/50 text-red-800 dark:text-red-200"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Actions */}
        <div className="space-y-4">
          {/* Google Sign-in */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="flex w-full items-center justify-center gap-3 rounded-full border-2 border-black dark:border-white bg-white hover:bg-neutral-50 dark:bg-neutral-900 dark:hover:bg-neutral-800 py-3.5 px-4 text-sm font-black uppercase tracking-wider text-black dark:text-white shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(255,255,255,0.15)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-none transition-all duration-150 disabled:opacity-50"
          >
            <Chrome className="h-5 w-5" />
            Sign in with Google
          </button>

          <div className="relative flex py-3 items-center">
            <div className="flex-grow border-t-2 border-black/10 dark:border-white/10"></div>
            <span className="flex-shrink mx-4 text-[10px] font-black uppercase tracking-widest text-black/40 dark:text-white/40">
              Or use Email
            </span>
            <div className="flex-grow border-t-2 border-black/10 dark:border-white/10"></div>
          </div>

          {/* Email OTP Login */}
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div className="relative">
              <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-black/60 dark:text-white/60" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address..."
                disabled={loading}
                className="w-full rounded-full border-2 border-black dark:border-white bg-white dark:bg-black py-3.5 pl-11 pr-4 text-sm font-semibold text-black dark:text-white placeholder-black/40 dark:placeholder-white/40 outline-none focus:ring-4 focus:ring-[#B8FF33]/30 transition-all duration-150 disabled:opacity-50"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full border-2 border-black dark:border-white bg-[#B8FF33] hover:bg-[#a6e622] py-3.5 px-4 text-sm font-black uppercase tracking-wider text-black shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-none transition-all duration-150 disabled:opacity-50"
            >
              {loading ? "Sending..." : "Send Magic Link"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
