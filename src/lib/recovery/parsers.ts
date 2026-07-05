import type { Message, Platform } from "@/types/recovery";
import type { RawImport } from "@/lib/recovery/metadata-pipeline";

/**
 * Accepts pasted/uploaded exports in three shapes:
 *  - JSON (ChatGPT/Claude/Gemini-style export: array of {role, content})
 *  - Markdown (headings + "**User:**" / "**Assistant:**" style turns)
 *  - Plain text (falls back to treating the whole blob as one user message)
 */
export function parseImport(
  rawText: string,
  platform: Platform,
  titleHint?: string
): RawImport {
  const trimmed = rawText.trim();

  if (looksLikeJson(trimmed)) {
    const parsed = tryParseJson(trimmed);
    if (parsed) return parsed;
  }

  if (/\*\*(user|assistant)\*\*|^#{1,3}\s/im.test(trimmed)) {
    return parseMarkdown(trimmed, platform, titleHint);
  }

  return parsePlainText(trimmed, platform, titleHint);
}

function looksLikeJson(text: string): boolean {
  return text.startsWith("{") || text.startsWith("[");
}

function tryParseJson(text: string): RawImport | null {
  try {
    const data = JSON.parse(text);
    const messages: Message[] = [];
    let title = "";
    let createdAt: string | undefined;

    const items = Array.isArray(data) ? data : data.messages ?? data.conversation ?? [];
    title = !Array.isArray(data) ? data.title ?? data.name ?? "" : "";
    createdAt = !Array.isArray(data) ? data.created_at ?? data.createdAt : undefined;

    for (const item of items) {
      const role = normalizeRole(item.role ?? item.author?.role ?? "user");
      const content =
        typeof item.content === "string"
          ? item.content
          : item.content?.parts?.join("\n") ?? item.text ?? "";
      if (content) messages.push({ role, content });
    }

    if (messages.length === 0) return null;

    return {
      platform: "JSON",
      title: title || messages[0].content.slice(0, 60),
      createdAt,
      messages,
    };
  } catch {
    return null;
  }
}

function normalizeRole(role: string): Message["role"] {
  const r = role.toLowerCase();
  if (r.includes("assistant") || r.includes("model") || r.includes("bot")) return "assistant";
  if (r.includes("system")) return "system";
  return "user";
}

function parseMarkdown(text: string, platform: Platform, titleHint?: string): RawImport {
  const lines = text.split("\n");
  const titleLine = lines.find((l) => /^#\s+/.test(l));
  const title = titleHint || titleLine?.replace(/^#\s+/, "").trim() || "Imported conversation";

  const messages: Message[] = [];
  let currentRole: Message["role"] = "user";
  let buffer: string[] = [];

  const flush = () => {
    const content = buffer.join("\n").trim();
    if (content) messages.push({ role: currentRole, content });
    buffer = [];
  };

  for (const line of lines) {
    const userMatch = /^\*\*user\*\*:?/i.test(line.trim());
    const assistantMatch = /^\*\*assistant\*\*:?/i.test(line.trim());
    if (userMatch || assistantMatch) {
      flush();
      currentRole = userMatch ? "user" : "assistant";
      const rest = line.replace(/^\*\*(user|assistant)\*\*:?/i, "").trim();
      if (rest) buffer.push(rest);
    } else if (!/^#\s+/.test(line)) {
      buffer.push(line);
    }
  }
  flush();

  if (messages.length === 0) {
    messages.push({ role: "user", content: text });
  }

  return { platform, title, messages };
}

function parsePlainText(text: string, platform: Platform, titleHint?: string): RawImport {
  const firstLine = text.split("\n").find((l) => l.trim().length > 0) ?? "Imported conversation";
  return {
    platform,
    title: titleHint || firstLine.slice(0, 80),
    messages: [{ role: "user", content: text }],
  };
}
