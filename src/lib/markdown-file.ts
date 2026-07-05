/** Shared helpers for copying/downloading a Markdown string as a .md file. */

export async function copyMarkdown(markdown: string): Promise<void> {
  await navigator.clipboard.writeText(markdown);
}

export function downloadMarkdown(markdown: string, filename = "AI_PROFILE.md"): void {
  const blob = new Blob([markdown], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** Turns a persona name into a filesystem-safe filename, e.g. "Coder" -> "Coder_AI_PROFILE.md". */
export function personaFilename(name: string): string {
  const safe = name.trim().replace(/[^a-z0-9\-_ ]/gi, "").replace(/\s+/g, "_");
  return `${safe || "AI_PROFILE"}_AI_PROFILE.md`;
}

/** Pulls a short, human-readable preview line out of a generated profile markdown. */
export function extractPreview(markdown: string, maxLength = 140): string {
  const line = markdown
    .split("\n")
    .map((l) => l.trim())
    .find(
      (l) =>
        l.length > 0 &&
        !l.startsWith("#") &&
        !l.startsWith(">") &&
        !l.startsWith("-") &&
        !l.startsWith("---")
    );
  const text = line ?? "No preview available.";
  return text.length > maxLength ? `${text.slice(0, maxLength).trim()}…` : text;
}
