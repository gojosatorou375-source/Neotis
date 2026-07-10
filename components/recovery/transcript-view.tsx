"use client";

import type { Message } from "@/types/recovery";

interface TranscriptViewProps {
  messages: Message[];
}

/**
 * Renders the conversation the way ChatGPT/Claude/etc. actually show it --
 * a plain message feed, nothing else. No summary card, no keyword chips, no
 * "related conversations" -- just what was actually said, in order. Both
 * turns get a rounded border so each message reads as its own distinct
 * block on the page: the user's turn is right-aligned with a filled
 * background (a "bubble"), the assistant's turn is left-aligned and
 * full-width with just an outline -- filled would compete for attention
 * with the user bubble on a long response, but leaving it borderless made
 * long answers blur into the page with no visible boundary at all.
 */
export function TranscriptView({ messages }: TranscriptViewProps) {
  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center py-24 text-center text-body text-[var(--text-secondary)]">
        No transcript was captured for this conversation.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-16">
      {messages.map((message, i) => {
        const isUser = message.role === "user";
        return (
          <div key={i} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
            <div
              className={
                isUser
                  ? "max-w-[80%] whitespace-pre-wrap rounded-2xl bg-black/5 px-4 py-3 text-body leading-relaxed text-[var(--text-primary)] dark:bg-white/[0.06]"
                  : "max-w-[85%] whitespace-pre-wrap rounded-2xl border border-[var(--border)] px-4 py-3 text-body leading-relaxed text-[var(--text-primary)]"
              }
            >
              {message.content}
            </div>
          </div>
        );
      })}
    </div>
  );
}
