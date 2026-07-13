import type { ConversationInsights, ConversationMessage } from "@/types/conversation";
import type { FactType, FactPolarity } from "@/types/memory";


// Server-only. Never import this from a client component — it reads
// process.env.OPENROUTER_API_KEY, which must stay off the client bundle.
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "meta-llama/llama-3.3-70b-instruct:free";
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

export interface ExtractedFact {
  section: string;
  factType: FactType;
  polarity: FactPolarity;
  content: string;
  confidence: number;
}

/**
 * Extracts structured memory facts from a conversation transcript using Claude Haiku.
 * Validates that each fact has a valid factType and polarity.
 */
export async function extractMemoryFacts(
  messages: ConversationMessage[]
): Promise<ExtractedFact[] | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;
  if (messages.length === 0) return null;

  const transcript = buildTranscript(messages);

  const prompt = `You are a memory extraction engine. Analyze this conversation transcript and extract key technical facts, decisions, rules, API designs, constraints, bugs, requirements, and TODOs.

You must categorize each fact under a "section" (e.g. "Infrastructure", "Coding Style", "Database Schema", "APIs", "Bugs", etc.) and assign:
- "factType": must be exactly one of: "decision", "rule", "architecture", "feature", "api", "bug", "requirement", "constraint", "todo", "question_answer".
- "polarity": must be exactly one of: "adopted", "rejected", "proposed", "hypothetical".
- "content": the concise, atomic statement of the fact (e.g., "Use Supabase as the main database client").
- "confidence": a number between 0.0 and 1.0 indicating how clear and explicit this fact is in the conversation.

Respond with ONLY a JSON object containing a "facts" array. Do not include any markdown block formatting or introductory/concluding prose.

Format example:
{
  "facts": [
    {
      "section": "Infrastructure",
      "factType": "decision",
      "polarity": "adopted",
      "content": "Use Supabase instead of Firebase for the primary database store.",
      "confidence": 0.95
    }
  ]
}

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
        temperature: 0.1,
      }),
    });

    if (!res.ok) {
      console.error("OpenRouter memory fact extraction failed:", res.status, await res.text());
      return null;
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) return null;

    const parsed = parseJsonLoosely(content);
    if (!parsed || !Array.isArray(parsed.facts)) return null;

    const validFactTypes = new Set([
      "decision", "rule", "architecture", "feature", "api", "bug",
      "requirement", "constraint", "todo", "question_answer"
    ]);
    const validPolarities = new Set(["adopted", "rejected", "proposed", "hypothetical"]);

    const facts: ExtractedFact[] = [];
    for (const f of parsed.facts) {
      if (
        f &&
        typeof f.section === "string" &&
        typeof f.content === "string" &&
        typeof f.confidence === "number" &&
        validFactTypes.has(f.factType) &&
        validPolarities.has(f.polarity)
      ) {
        facts.push({
          section: f.section.trim(),
          factType: f.factType,
          polarity: f.polarity,
          content: f.content.trim(),
          confidence: f.confidence,
        });
      }
    }
    return facts;
  } catch (err) {
    console.error("OpenRouter memory fact extraction error:", err);
    return null;
  }
}

