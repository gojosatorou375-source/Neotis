import { NextRequest, NextResponse } from "next/server";
import { readConversations, updateConversation } from "@/lib/server/conversation-store";
import { extractInsights } from "@/lib/llm/openrouter";
import { checkAccessKey } from "@/lib/server/access-key";

// Backfills insights for a conversation that was captured before
// OPENROUTER_API_KEY was configured (insights otherwise only run once, at
// ingest time in POST /api/conversations).
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const denied = checkAccessKey(req);
  if (denied) return denied;

  const conversations = await readConversations();
  const conversation = conversations.find((c) => c.id === params.id);
  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  }

  const insights = await extractInsights(conversation.messages);
  if (!insights) {
    return NextResponse.json(
      { error: "No OPENROUTER_API_KEY configured, or extraction failed. Check the dev server logs." },
      { status: 422 }
    );
  }

  const updated = await updateConversation(conversation.id, { insights });
  return NextResponse.json({ conversation: updated });
}
