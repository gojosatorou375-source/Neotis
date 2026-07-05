"use client";

import { useMemo } from "react";

interface MarkdownPreviewProps {
  markdown: string;
}

/**
 * Lightweight Markdown renderer for the profile preview.
 * Intentionally dependency-free: covers headings, bold, blockquotes,
 * lists, and horizontal rules, which is all AI_PROFILE.md uses.
 */
export function MarkdownPreview({ markdown }: MarkdownPreviewProps) {
  const html = useMemo(() => renderMarkdown(markdown), [markdown]);

  return (
    <div
      className="prose-personamd max-h-[420px] overflow-y-auto rounded-2xl border border-[var(--border)] bg-white/40 p-6 text-left dark:bg-white/5"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function renderInline(text: string): string {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>");
}

function renderMarkdown(markdown: string): string {
  const lines = markdown.split("\n");
  const html: string[] = [];
  let inList = false;

  const closeList = () => {
    if (inList) {
      html.push("</ul>");
      inList = false;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (line.trim() === "") {
      closeList();
      continue;
    }

    if (line.startsWith("# ")) {
      closeList();
      html.push(`<h1 class="text-section mb-4 mt-2 text-[var(--text-primary)]">${renderInline(line.slice(2))}</h1>`);
    } else if (line.startsWith("## ")) {
      closeList();
      html.push(`<h2 class="mb-3 mt-6 text-lg font-semibold text-[var(--text-primary)]">${renderInline(line.slice(3))}</h2>`);
    } else if (line.startsWith("> ")) {
      closeList();
      html.push(`<blockquote class="mb-3 border-l-2 border-[var(--accent)] pl-4 text-small text-[var(--text-secondary)]">${renderInline(line.slice(2))}</blockquote>`);
    } else if (line.startsWith("- ")) {
      if (!inList) {
        html.push('<ul class="mb-3 list-disc space-y-1 pl-5">');
        inList = true;
      }
      html.push(`<li class="text-body text-[var(--text-primary)]">${renderInline(line.slice(2))}</li>`);
    } else if (line.trim() === "---") {
      closeList();
      html.push('<hr class="my-4 border-[var(--border)]" />');
    } else {
      closeList();
      html.push(`<p class="mb-3 text-body text-[var(--text-primary)]">${renderInline(line)}</p>`);
    }
  }
  closeList();

  return html.join("\n");
}
