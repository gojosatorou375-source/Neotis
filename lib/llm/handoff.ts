import type { Conversation, ConversationMessage } from "@/types/conversation";

// Server-only, same rules as openrouter.ts: never import this from a client
// component, it reads process.env.OPENROUTER_API_KEY.
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "meta-llama/llama-3.3-70b-instruct:free";
const MAX_TRANSCRIPT_CHARS = 16000;

export interface HandoffResult {
  markdown: string;
  /** False when OPENROUTER_API_KEY isn't configured (or the call failed) and
   * the caller got the deterministic fallback instead of an AI summary. The
   * UI should say so rather than silently passing off a lower-quality result
   * as if it were AI-processed. */
  usedAI: boolean;
}

function buildTranscript(messages: ConversationMessage[]): string {
  const joined = messages.map((m) => `${m.role}: ${m.content}`).join("\n\n");
  return joined.length > MAX_TRANSCRIPT_CHARS
    ? joined.slice(0, MAX_TRANSCRIPT_CHARS) + "\n\n[...truncated]"
    : joined;
}

function frontMatter(conversation: Conversation): string {
  return [
    "---",
    `source: ${conversation.provider}`,
    `title: ${JSON.stringify(conversation.title)}`,
    `captured: ${conversation.capturedAt}`,
    `messages: ${conversation.messages.length}`,
    "generated_by: PersonaMD (Noetis) conversation handoff",
    "---",
    "",
  ].join("\n");
}

/**
 * Deterministic, no-LLM fallback. Used when OPENROUTER_API_KEY isn't
 * configured, or the AI call fails — the Share feature should still produce
 * something usable rather than a hard error, same graceful-degradation
 * pattern as extractInsights() in openrouter.ts.
 */
function buildFallbackMarkdown(conversation: Conversation): string {
  const { messages } = conversation;
  const firstUser = messages.find((m) => /user/i.test(m.role));
  const lastAssistant = [...messages].reverse().find((m) => /assistant|model|ai/i.test(m.role));

  const excerptCount = 6;
  const excerpt = messages
    .slice(-excerptCount)
    .map((m) => `**${m.role}:** ${m.content.slice(0, 600)}`)
    .join("\n\n");

  return `${frontMatter(conversation)}
# Conversation Handoff: ${conversation.title}

> Generated without AI processing (no OPENROUTER_API_KEY configured on the
> server, or the request failed) — this is a plain excerpt, not a distilled
> summary. Set OPENROUTER_API_KEY to get a proper AI-condensed handoff instead.

## Context

This conversation started on **${conversation.provider}** and ran for ${messages.length} messages.

${firstUser ? `**Original request:** ${firstUser.content.slice(0, 400)}` : ""}

${lastAssistant ? `**Most recent response:** ${lastAssistant.content.slice(0, 400)}` : ""}

## Recent excerpt (last ${Math.min(excerptCount, messages.length)} messages)

${excerpt}

## Instructions for the assistant reading this

Continue this conversation as if you were already part of it. Don't
re-introduce yourself or ask the user to repeat context that's already above.
`;
}

/**
 * Distills a captured conversation into a compact Markdown "handoff" document
 * meant to be pasted into a *different* LLM (or provider) so the user can
 * keep going without re-explaining everything from scratch. This is
 * deliberately not a raw transcript dump — it's optimized for another model
 * to read quickly: key facts, decisions already made, and open threads.
 *
 * Returns the deterministic fallback (usedAI: false) if no
 * OPENROUTER_API_KEY is configured or the call fails, so the feature still
 * works end-to-end without a key, just at lower quality.
 */
export async function generateHandoffMarkdown(conversation: Conversation): Promise<HandoffResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || conversation.messages.length === 0) {
    return { markdown: buildFallbackMarkdown(conversation), usedAI: false };
  }

  const transcript = buildTranscript(conversation.messages);

  const prompt = `You are preparing a "handoff" document so a person can paste it into a DIFFERENT AI assistant and continue a conversation that started elsewhere, without repeating everything.

Read the transcript below (from ${conversation.provider}, titled "${conversation.title}") and write a Markdown document with exactly these sections, in this order:

## Context
2-4 sentences: what is this conversation about, and why did the person start it.

## Key Facts & Decisions
A bullet list of concrete facts established, choices already made, or constraints given. Skip this section's bullets if none exist — do not pad with restated context.

## Open Questions / Next Steps
A bullet list of what's still unresolved or what the person was about to do next.

## Notes for the Assistant
1-2 sentences of direct instruction to whichever AI reads this next, e.g. "Continue from here without re-introducing yourself or asking the person to repeat this context."

Rules:
- Do not include a top-level title/heading, only the four "## " sections above.
- Be concise — this is a handoff brief, not a transcript. Do not quote long passages verbatim.
- Write in plain Markdown, no code fences around the whole thing.

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
        temperature: 0.3,
      }),
    });

    if (!res.ok) {
      console.error("OpenRouter handoff generation failed:", res.status, await res.text());
      return { markdown: buildFallbackMarkdown(conversation), usedAI: false };
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content || typeof content !== "string") {
      return { markdown: buildFallbackMarkdown(conversation), usedAI: false };
    }

    const markdown = `${frontMatter(conversation)}
# Conversation Handoff: ${conversation.title}

${content.trim()}
`;

    return { markdown, usedAI: true };
  } catch (err) {
    console.error("OpenRouter handoff generation error:", err);
    return { markdown: buildFallbackMarkdown(conversation), usedAI: false };
  }
}
