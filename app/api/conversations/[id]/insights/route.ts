import { NextRequest, NextResponse } from "next/server";
import { readConversations, updateConversation } from "@/lib/server/conversation-store";
import { extractInsights } from "@/lib/llm/openrouter";
import { checkCorsOrigin, applyCorsHeaders, checkAuth } from "@/lib/server/auth";

// Backfills insights for a conversation that was captured before
// OPENROUTER_API_KEY was configured (insights otherwise only run once, at
// ingest time in POST /api/conversations).
export async function OPTIONS(req: NextRequest) {
  const corsCheck = checkCorsOrigin(req);
  const response = NextResponse.json(null, { status: 204 });
  if (corsCheck.allowed) {
    applyCorsHeaders(response, corsCheck.origin);
  }
  return response;
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const corsCheck = checkCorsOrigin(req);
  if (!corsCheck.allowed) {
    return NextResponse.json({ error: "CORS origin not allowed" }, { status: 403 });
  }

  const denied = await checkAuth(req);
  if (denied) {
    applyCorsHeaders(denied, corsCheck.origin);
    return denied;
  }

  const conversations = await readConversations();
  const conversation = conversations.find((c) => c.id === params.id);
  if (!conversation) {
    const response = NextResponse.json({ error: "Conversation not found." }, { status: 404 });
    applyCorsHeaders(response, corsCheck.origin);
    return response;
  }

  const insights = await extractInsights(conversation.messages);
  if (!insights) {
    const response = NextResponse.json(
      { error: "No OPENROUTER_API_KEY configured, or extraction failed. Check the dev server logs." },
      { status: 422 }
    );
    applyCorsHeaders(response, corsCheck.origin);
    return response;
  }

  const updated = await updateConversation(conversation.id, { insights });
  const response = NextResponse.json({ conversation: updated });
  applyCorsHeaders(response, corsCheck.origin);
  return response;
}
