import type { Conversation, Message, Platform, ProjectSummary } from "@/types/recovery";
import { embedText } from "@/lib/recovery/embeddings";
import { detectTasks, extractiveSummary, topTerms } from "@/lib/recovery/text-utils";

export interface RawImport {
  platform: Platform;
  title: string;
  createdAt?: string;
  messages: Message[];
  files?: string[];
}

function fullText(messages: Message[]): string {
  return messages.map((m) => m.content).join("\n");
}

function extractPrompts(messages: Message[]): string[] {
  return messages.filter((m) => m.role === "user").map((m) => m.content.trim()).slice(0, 20);
}

function extractOutputs(messages: Message[]): string[] {
  return messages
    .filter((m) => m.role === "assistant")
    .map((m) => m.content.trim())
    .slice(0, 20);
}

function extractDecisions(text: string): string[] {
  const markers = [/\bwe (decided|will|chose|went with)\b/i, /\bdecision:/i, /\bfinal(ized)? (choice|answer)\b/i];
  return text
    .split(/(?<=[.!?])\s+/)
    .filter((s) => markers.some((re) => re.test(s)))
    .slice(0, 6);
}

/**
 * Guess which existing project (if any) this conversation belongs to by
 * scoring keyword/title overlap against known projects. Falls back to a
 * new project named after the conversation title.
 */
function detectProject(title: string, keywords: string[], knownProjects: ProjectSummary[]): string {
  const titleWords = new Set(topTerms(title, 6));
  let best: { name: string; score: number } | null = null;

  for (const project of knownProjects) {
    const projectWords = new Set(topTerms(project.name, 6));
    const overlap = keywords.filter((k) => projectWords.has(k) || titleWords.has(k)).length;
    if (!best || overlap > best.score) {
      best = { name: project.name, score: overlap };
    }
  }

  if (best && best.score >= 2) return best.name;
  return title.length > 40 ? `${title.slice(0, 40)}…` : title;
}

function inferStatus(tasks: string[]): "Completed" | "In Progress" | "Pending" {
  if (tasks.length === 0) return "Completed";
  if (tasks.length <= 2) return "In Progress";
  return "Pending";
}

/**
 * Runs the full local metadata pipeline on a freshly imported conversation:
 * parse -> summarize -> extract keywords/topics -> embed -> detect project
 * -> detect pending tasks -> ready to store & index.
 */
export function buildConversation(
  raw: RawImport,
  knownProjects: ProjectSummary[]
): Conversation {
  const text = fullText(raw.messages);
  const summary = extractiveSummary(text || raw.title, 3);
  const keywords = topTerms(text || raw.title, 10);
  const topics = keywords.slice(0, 5);
  const followUpTasks = detectTasks(text);
  const decisions = extractDecisions(text);
  const now = new Date().toISOString();
  const createdAt = raw.createdAt ?? now;

  return {
    id: crypto.randomUUID(),
    platform: raw.platform,
    title: raw.title || "Untitled conversation",
    createdAt,
    lastUpdated: now,
    project: detectProject(raw.title, keywords, knownProjects),
    status: inferStatus(followUpTasks),
    summary: summary || "No summary available.",
    keywords,
    topics,
    embedding: embedText(`${raw.title} ${text}`),
    files: raw.files ?? [],
    prompts: extractPrompts(raw.messages),
    outputs: extractOutputs(raw.messages),
    followUpTasks,
    decisions,
    tags: [],
    similarityLinks: [],
    conversationHistory: raw.messages,
    archived: false,
  };
}
