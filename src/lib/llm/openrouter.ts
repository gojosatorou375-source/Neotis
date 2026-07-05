import type { ConversationInsights, ConversationMessage } from "@/types/conversation";

// Server-only. Never import this from a client component — it reads
// process.env.OPENROUTER_API_KEY, which must stay off the client bundle.
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "anthropic/claude-haiku-4.5";
const MAX_TRANSCRIPT_CHARS = 12000;

function buildTranscript(messages: ConversationMessage[]): string {
  const joined = messages.map((m) => `${m.role}: ${m.content}`).join("\n\n");
  return joined.length > MAX_TRANSCRIPT_CHARS
    ? joined.slice(0, MAX_TRANSCRIPT_CHARS) + "\n\n[...truncated]"
    : joined;
}

/**
 * Extracts a short summary plus topic/entity tags from a conversation, used
 * to power the Timeline and Knowledge Graph views. Returns `null` if no
 * OPENROUTER_API_KEY is configured, so the rest of the app degrades
 * gracefully (conversations just show without insights).
 */
export async function extractInsights(
  messages: ConversationMessage[]
): Promise<ConversationInsights | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;
  if (messages.length === 0) return null;

  const transcript = buildTranscript(messages);

  const prompt = `You will be given a transcript of a conversation between a person and an AI assistant. Extract:
- "summary": one concise sentence (max 30 words) describing what the conversation was about.
- "topics": 2-5 short topic labels (1-3 words each), e.g. "React performance", "trip planning".
- "entities": specific named things mentioned (people, products, companies, technologies, places) — up to 8, empty array if none.

Respond with ONLY a JSON object with exactly these three keys, no other text.

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
      console.error("OpenRouter extraction failed:", res.status, await res.text());
      return null;
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) return null;

    const parsed = parseJsonLoosely(content);
    if (!parsed) return null;

    return {
      summary: typeof parsed.summary === "string" ? parsed.summary : "",
      topics: Array.isArray(parsed.topics) ? parsed.topics.filter((t: unknown) => typeof t === "string") : [],
      entities: Array.isArray(parsed.entities) ? parsed.entities.filter((e: unknown) => typeof e === "string") : [],
    };
  } catch (err) {
    console.error("OpenRouter extraction error:", err);
    return null;
  }
}

/** Not every model reliably returns pure JSON even when asked to — this
 * tries a straight parse first, then falls back to grabbing the outermost
 * {...} block in case the model wrapped it in prose or a code fence. */
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
