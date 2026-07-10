import { NextRequest, NextResponse } from "next/server";
import { checkCorsOrigin, applyCorsHeaders, checkAuth } from "@/lib/server/auth";
import { getClientIp, checkRateLimit } from "@/lib/server/rate-limiter";
import { getSupabase } from "@/lib/supabase/client";
import { extractMemoryFacts } from "@/lib/llm/openrouter";
import {
  deduplicateAndSupersedeFacts,
  generateMarkdown,
} from "@/lib/knowledge/engine";
import type { MemoryFact } from "@/types/memory";
import {
  memoryFactsCollection,
  fetchFactsForScope,
  fetchActiveFacts,
} from "@/lib/knowledge/memory-facts-store";

/**
 * CONVERSATION DATA MODEL RECONCILIATION NOTE:
 * In this pipeline, the memory fact extraction runs against the raw captured conversation shape
 * (defined in `types/conversation.ts`), which is the single source of truth in the database
 * `conversations` table. We read from this raw store to feed messages to the LLM.
 *
 * The `sourceConversationId` written to `memory_facts` is the raw conversation ID.
 * The recovery / enriched shape (defined in `types/recovery.ts`) is a read-side projection
 * constructed on the client via `buildConversationFromCaptured` inside `use-recovery-store.ts`.
 * Both recovery conversations and memory facts point to the same conversation ID (raw),
 * ensuring they cross-reference perfectly without duplicating the source of truth.
 */

export async function OPTIONS(req: NextRequest) {
  const corsCheck = checkCorsOrigin(req);
  const response = NextResponse.json(null, { status: 204 });
  if (corsCheck.allowed) {
    applyCorsHeaders(response, corsCheck.origin);
  }
  return response;
}

// MemoryFactRow interface, fromRow, and toRow are imported from memory-facts-store

/**
 * POST /api/memory/extract
 * Body: { conversationId: string, projectId?: string, userId?: string }
 *
 * Runs Claude Haiku to extract memory facts from a raw conversation, compares them
 * against existing facts in the same project/user scope, writes the new/updated facts
 * to Supabase (handling deduplication and supersession), and incrementally regenerates
 * the markdown document (Skill.md or AI_PROFILE.md).
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

  const ip = getClientIp(req);
  if (checkRateLimit(`memory-extract-${ip}`, 5)) {
    const response = NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    applyCorsHeaders(response, corsCheck.origin);
    return response;
  }

  let body: { conversationId?: string; projectId?: string; userId?: string };
  try {
    body = await req.json();
  } catch {
    const response = NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    applyCorsHeaders(response, corsCheck.origin);
    return response;
  }

  const { conversationId, projectId, userId } = body;
  if (!conversationId) {
    const response = NextResponse.json({ error: "Missing conversationId." }, { status: 400 });
    applyCorsHeaders(response, corsCheck.origin);
    return response;
  }

  const supabase = getSupabase();

  // 1. Fetch raw conversation (source of truth)
  const { data: conversation, error: convError } = await supabase
    .from("conversations")
    .select("*")
    .eq("id", conversationId)
    .maybeSingle();

  if (convError || !conversation) {
    const response = NextResponse.json(
      { error: `Conversation not found: ${convError?.message || "unknown"}` },
      { status: 404 }
    );
    applyCorsHeaders(response, corsCheck.origin);
    return response;
  }

  // Extract messages from raw capture shape
  const messages = conversation.messages || [];

  // 2. Extract facts via OpenRouter
  const freshFacts = await extractMemoryFacts(messages);
  if (!freshFacts) {
    const response = NextResponse.json({ error: "Failed to extract facts from LLM." }, { status: 502 });
    applyCorsHeaders(response, corsCheck.origin);
    return response;
  }

  // 3. Fetch existing facts for deduplication/supersession scope
  let existingFacts: MemoryFact[];
  try {
    existingFacts = await fetchFactsForScope({ projectId, userId, conversationId });
  } catch (e: any) {
    const response = NextResponse.json({ error: `Failed to fetch existing facts: ${e.message}` }, { status: 500 });
    applyCorsHeaders(response, corsCheck.origin);
    return response;
  }

  // 4. Run dedup and supersession logic
  const { toInsert, toUpdate } = deduplicateAndSupersedeFacts(
    existingFacts,
    freshFacts,
    conversationId,
    projectId,
    userId
  );

  // 5. Commit database changes
  try {
    if (toInsert.length > 0) {
      await memoryFactsCollection.insertMany(toInsert);
    }
    for (const updateFact of toUpdate) {
      await memoryFactsCollection.update(updateFact);
    }
  } catch (e: any) {
    const response = NextResponse.json({ error: `Failed to save facts: ${e.message}` }, { status: 500 });
    applyCorsHeaders(response, corsCheck.origin);
    return response;
  }

  // 6. Incremental Markdown Update
  const now = new Date().toISOString();
  let updatedDocType: string | null = null;
  let updatedDocTitle: string | null = null;

  if (projectId) {
    const { data: skill, error: skillError } = await supabase
      .from("skills")
      .select("*")
      .eq("id", projectId)
      .maybeSingle();

    if (skill && !skillError) {
      // Fetch all active non-superseded facts for this project
      let activeFacts: MemoryFact[] = [];
      try {
        activeFacts = await fetchActiveFacts(projectId);
      } catch (e: any) {
        console.error("Failed to fetch active facts for skill: ", e);
      }
      const newMarkdown = generateMarkdown(skill.markdown, activeFacts, skill.name);

      await supabase
        .from("skills")
        .update({ markdown: newMarkdown, updated_at: now })
        .eq("id", projectId);

      updatedDocType = "skill";
      updatedDocTitle = skill.name;
    }
  } else {
    // If no project is specified, we fall back to user AI_PROFILE.md (Persona)
    const { data: persona, error: personaError } = await supabase
      .from("personas")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (persona && !personaError) {
      // Fetch all active non-superseded facts for this user
      let activeFacts: MemoryFact[] = [];
      try {
        activeFacts = await fetchActiveFacts(null);
      } catch (e: any) {
        console.error("Failed to fetch active facts for persona: ", e);
      }
      const newMarkdown = generateMarkdown(persona.markdown, activeFacts, persona.name);

      await supabase
        .from("personas")
        .update({ markdown: newMarkdown, updated_at: now })
        .eq("id", persona.id);

      updatedDocType = "persona";
      updatedDocTitle = persona.name;
    }
  }

  const response = NextResponse.json({
    success: true,
    extracted: freshFacts.length,
    inserted: toInsert.length,
    updated: toUpdate.length,
    updatedDocument: updatedDocType ? { type: updatedDocType, title: updatedDocTitle } : null,
  });
  applyCorsHeaders(response, corsCheck.origin);
  return response;
}
