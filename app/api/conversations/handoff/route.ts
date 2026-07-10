import { NextRequest, NextResponse } from "next/server";
import { readConversations } from "@/lib/server/conversation-store";
import { generateHandoffMarkdown } from "@/lib/llm/handoff";
import { checkCorsOrigin, applyCorsHeaders, checkAuth } from "@/lib/server/auth";
import type { Conversation } from "@/types/conversation";

export async function OPTIONS(req: NextRequest) {
  const corsCheck = checkCorsOrigin(req);
  const response = NextResponse.json(null, { status: 204 });
  if (corsCheck.allowed) {
    applyCorsHeaders(response, corsCheck.origin);
  }
  return response;
}

/**
 * Turns a conversation into a distilled Markdown "handoff" document (see
 * generateHandoffMarkdown) meant to be pasted into a different LLM to
 * continue the conversation there. Two ways to call it:
 *
 *   - { conversationId } — for a conversation already saved in this library
 *     (used by the Dashboard's Share action).
 *   - { conversation }   — a full conversation payload inline, not
 *     necessarily saved yet (used by the extension's in-page Share button,
 *     which may be sharing a conversation the user hasn't explicitly saved).
 */
export async function POST(req: NextRequest) {
  const corsCheck = checkCorsOrigin(req);
  if (!corsCheck.allowed) {
    return NextResponse.json({ error: "CORS origin not allowed" }, { status: 403 });
  }

  const denied = await checkAuth(req);
  if (denied) {
    applyCorsHeaders(denied, corsCheck.origin);
    return denied;
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    const response = NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    applyCorsHeaders(response, corsCheck.origin);
    return response;
  }

  const { conversationId, conversation: inlineConversation } = (body ?? {}) as {
    conversationId?: string;
    conversation?: Partial<Conversation>;
  };

  let conversation: Conversation | undefined;

  if (conversationId) {
    const all = await readConversations();
    conversation = all.find((c) => c.id === conversationId);
    if (!conversation) {
      const response = NextResponse.json({ error: "Conversation not found." }, { status: 404 });
      applyCorsHeaders(response, corsCheck.origin);
      return response;
    }
  } else if (inlineConversation && Array.isArray(inlineConversation.messages)) {
    conversation = {
      id: inlineConversation.id || "unsaved",
      provider: inlineConversation.provider || "other",
      title: inlineConversation.title || "Untitled conversation",
      url: inlineConversation.url,
      capturedAt: inlineConversation.capturedAt || new Date().toISOString(),
      importedAt: new Date().toISOString(),
      messages: inlineConversation.messages,
      insights: inlineConversation.insights,
      limitReached: inlineConversation.limitReached ?? false,
    };
  }

  if (!conversation) {
    const response = NextResponse.json(
      { error: "Provide either conversationId or a conversation payload." },
      { status: 400 }
    );
    applyCorsHeaders(response, corsCheck.origin);
    return response;
  }

  if (conversation.messages.length === 0) {
    const response = NextResponse.json({ error: "This conversation has no messages to share." }, { status: 422 });
    applyCorsHeaders(response, corsCheck.origin);
    return response;
  }

  const { markdown, usedAI } = await generateHandoffMarkdown(conversation);

  const safeTitle = conversation.title.replace(/[^\w\-\s]/g, "").trim().slice(0, 60) || "conversation";
  const filename = `${safeTitle.replace(/\s+/g, "-").toLowerCase()}-handoff.md`;

  const response = NextResponse.json({
    markdown,
    title: filename,
    usedAI,
  });
  applyCorsHeaders(response, corsCheck.origin);
  return response;
}
