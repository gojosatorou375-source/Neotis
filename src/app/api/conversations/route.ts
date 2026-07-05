import { NextRequest, NextResponse } from "next/server";
import {
  readConversations,
  upsertConversation,
  updateConversation,
  deleteAllConversations,
} from "@/lib/server/conversation-store";
import { extractInsights } from "@/lib/llm/openrouter";
import { checkAccessKey } from "@/lib/server/access-key";
import type { Conversation } from "@/types/conversation";

// Lets the browser extension (running as a separate origin) push captures
// straight into this dev server, and lets the app poll for new ones.
function withCors(response: NextResponse): NextResponse {
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, X-PersonaMD-Access");
  return response;
}

export async function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }));
}

export async function GET(req: NextRequest) {
  const denied = checkAccessKey(req);
  if (denied) return withCors(denied);

  const conversations = await readConversations();
  return withCors(NextResponse.json({ conversations }));
}

export async function POST(req: NextRequest) {
  const denied = checkAccessKey(req);
  if (denied) return withCors(denied);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return withCors(NextResponse.json({ error: "Invalid JSON body." }, { status: 400 }));
  }

  const incoming = body as Partial<Conversation>;
  if (!incoming.id || !incoming.provider || !Array.isArray(incoming.messages)) {
    return withCors(
      NextResponse.json({ error: "Missing required fields: id, provider, messages." }, { status: 400 })
    );
  }

  const conversation: Conversation = {
    id: incoming.id,
    provider: incoming.provider,
    title: incoming.title || "Untitled conversation",
    url: incoming.url,
    capturedAt: incoming.capturedAt || new Date().toISOString(),
    importedAt: new Date().toISOString(),
    messages: incoming.messages,
    limitReached: incoming.limitReached ?? false,
  };

  let { conversation: stored, isNew } = await upsertConversation(conversation);

  // A conversation can get re-captured after the limit banner appears (the
  // first capture may have happened earlier in the same chat). If it already
  // existed without the flag, promote it rather than silently dropping the signal.
  if (!isNew && incoming.limitReached && !stored.limitReached) {
    const updated = await updateConversation(stored.id, { limitReached: true, messages: incoming.messages });
    if (updated) stored = updated;
  }

  // Fire-and-forget: extraction can take several seconds (it's a real LLM
  // call), and the browser extension is waiting on this response to tell
  // the popup "captured!". Don't make it wait on top of that — respond
  // immediately, and let the client pick up insights on its next poll once
  // they're ready. (Only for genuinely new conversations without insights
  // already, e.g. from a retried push.)
  if (isNew && !stored.insights) {
    extractInsights(stored.messages)
      .then((insights) => {
        if (insights) return updateConversation(stored.id, { insights });
      })
      .catch((err) => console.error("Background insight extraction failed:", err));
  }

  return withCors(NextResponse.json({ conversation: stored, isNew }));
}

/** Wipes every captured conversation. Used by the Dashboard's "Reset all
 * data" action — since conversations are the source of truth for the whole
 * app, this is the one call that needs to actually reach every row, not
 * just the ones currently loaded on some client. */
export async function DELETE(req: NextRequest) {
  const denied = checkAccessKey(req);
  if (denied) return withCors(denied);

  await deleteAllConversations();
  return withCors(NextResponse.json({ ok: true }));
}
