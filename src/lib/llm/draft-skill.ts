import type { Conversation } from "@/types/conversation";
import type { ProjectInterviewAnswers } from "@/types/skill";
import { PROJECT_QUESTIONS } from "@/lib/skills/project-interview-questions";

// Server-only, same rules as openrouter.ts / handoff.ts: never import this
// from a client component, it reads process.env.OPENROUTER_API_KEY.
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "anthropic/claude-haiku-4.5";
const MAX_TRANSCRIPT_CHARS = 16000;

export interface SkillDraft {
  projectName: string;
  answers: ProjectInterviewAnswers;
  /** False when OPENROUTER_API_KEY isn't configured (or the call failed) --
   * the caller lands on a mostly-blank draft they fill in themselves rather
   * than a fabricated one. */
  usedAI: boolean;
}

function buildTranscript(conversation: Conversation): string {
  const joined = conversation.messages.map((m) => `${m.role}: ${m.content}`).join("\n\n");
  return joined.length > MAX_TRANSCRIPT_CHARS
    ? joined.slice(0, MAX_TRANSCRIPT_CHARS) + "\n\n[...truncated]"
    : joined;
}

/** No-AI fallback: just seeds the project name from the conversation title
 * and leaves every answer blank, so "Create Skill.md from this
 * conversation" still lands the person on a usable interview instead of a
 * hard error -- they just have to answer everything themselves, same as
 * starting fresh. */
function buildFallbackDraft(conversation: Conversation): SkillDraft {
  return {
    projectName: conversation.title || "Untitled project",
    answers: {},
    usedAI: false,
  };
}
/**
 * Reads a captured conversation and drafts answers to the 6-question
 * Adaptive Project Interview (see project-interview-questions.ts), so
 * someone who already discussed their project with an AI elsewhere doesn't
 * have to re-answer everything from scratch to get a Skill.md. The result
 * is explicitly a *draft* -- the person reviews and edits it on the normal
 * interview review screen before saving, same as any other Skill.
 */
export async function draftSkillAnswers(conversation: Conversation): Promise<SkillDraft> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || conversation.messages.length === 0) {
    return buildFallbackDraft(conversation);
  }

  const transcript = buildTranscript(conversation);
  const questionList = PROJECT_QUESTIONS.map((q) => `${q.id}. ${q.title} (${q.description})`).join("\n");

  const prompt = `You will be given a transcript of a conversation between a person and an AI assistant about a software project. Your job is to draft answers to a 6-question "project knowledge" interview, based ONLY on what's actually discussed in the transcript.

Questions (answer each with a short paragraph, 1-3 sentences):
${questionList}

Rules:
- If the transcript doesn't contain enough information to answer a question, use an empty string "" for that question rather than guessing or inventing details.
- Also suggest a short "projectName" (2-5 words) based on what the project seems to be called or about.
- Respond with ONLY a JSON object with exactly two top-level keys: "projectName" (string) and "answers" (an object whose keys are the question numbers 1-6 as strings, and whose values are the drafted answer strings, "" if unknown).

Transcript:
${transcript}`;

  try {
    const res = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
      }),
    });

    if (!res.ok) {
      console.error("OpenRouter skill-draft failed:", res.status, await res.text());
      return buildFallbackDraft(conversation);
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content || typeof content !== "string") {
      return buildFallbackDraft(conversation);
    }

    const parsed = parseJsonLoosely(content);
    if (!parsed) return buildFallbackDraft(conversation);

    const rawAnswers = (parsed.answers && typeof parsed.answers === "object" ? parsed.answers : {}) as Record<
      string,
      unknown
    >;

    const answers: ProjectInterviewAnswers = {};
    for (const q of PROJECT_QUESTIONS) {
      const value = rawAnswers[String(q.id)];
      if (typeof value === "string" && value.trim().length > 0) {
        answers[q.id] = value.trim();
      }
    }

    const projectName =
      typeof parsed.projectName === "string" && parsed.projectName.trim().length > 0
        ? parsed.projectName.trim()
        : conversation.title || "Untitled project";

    return { projectName, answers, usedAI: true };
  } catch (err) {
    console.error("OpenRouter skill-draft error:", err);
    return buildFallbackDraft(conversation);
  }
}

/** Same loose-JSON-extraction fallback used by openrouter.ts/handoff.ts --
 * not every model reliably returns pure JSON even when asked to. */
function parseJsonLoosely(content: string): Record<string, unknown> | null {
  try {
    return JSON.parse(content);
  } catch {
    const start = content.indexOf("{");
    const end = content.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) return null;
    try {
      return JSON.parse(content.slice(start, end + 1));
    } catch {
      return null;
    }
  }
}
