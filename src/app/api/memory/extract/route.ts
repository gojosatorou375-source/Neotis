import { NextRequest, NextResponse } from "next/server";
import { checkCorsOrigin, applyCorsHeaders, checkAuth } from "@/lib/server/auth";
import { getSupabase } from "@/lib/supabase/client";
import { extractMemoryFacts } from "@/lib/llm/openrouter";
import {
  deduplicateAndSupersedeFacts,
  generateMarkdown,
} from "@/lib/knowledge/engine";
import type { MemoryFact, FactType, FactPolarity } from "@/types/memory";

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

interface MemoryFactRow {
  id: string;
  conversation_id: string;
  project_id: string | null;
  user_id: string | null;
  section: string;
  fact_type: string;
  polarity: string;
  content: string;
  confidence: number;
  reference_count: number;
  superseded_by: string | null;
  embedding: unknown;
  created_at: string;
  updated_at: string;
  last_confirmed_at: string;
}

function fromRow(row: MemoryFactRow): MemoryFact {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    projectId: row.project_id,
    userId: row.user_id,
    section: row.section,
    factType: row.fact_type as FactType,
    polarity: row.polarity as FactPolarity,
    content: row.content,
    confidence: Number(row.confidence),
    referenceCount: row.reference_count,
    supersededBy: row.superseded_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastConfirmedAt: row.last_confirmed_at,
  };
}

function toRow(fact: MemoryFact): MemoryFactRow {
  return {
    id: fact.id,
    conversation_id: fact.conversationId,
    project_id: fact.projectId ?? null,
    user_id: fact.userId ?? null,
    section: fact.section,
    fact_type: fact.factType,
    polarity: fact.polarity,
    content: fact.content,
    confidence: fact.confidence,
    reference_count: fact.referenceCount,
    superseded_by: fact.supersededBy ?? null,
    embedding: [],
    created_at: fact.createdAt,
    updated_at: fact.updatedAt,
    last_confirmed_at: fact.lastConfirmedAt,
  };
}

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
  let query = supabase.from("memory_facts").select("*");
  if (projectId) {
    query = query.eq("project_id", projectId);
  } else if (userId) {
    query = query.eq("user_id", userId);
  } else {
    query = query.eq("conversation_id", conversationId);
  }

  const { data: existingRows, error: existingError } = await query;
  if (existingError) {
    const response = NextResponse.json({ error: `Failed to fetch existing facts: ${existingError.message}` }, { status: 500 });
    applyCorsHeaders(response, corsCheck.origin);
    return response;
  }

  const existingFacts = (existingRows || []).map((row: MemoryFactRow) => fromRow(row));

  // 4. Run dedup and supersession logic
  const { toInsert, toUpdate } = deduplicateAndSupersedeFacts(
    existingFacts,
    freshFacts,
    conversationId,
    projectId,
    userId
  );

  // 5. Commit database changes
  if (toInsert.length > 0) {
    const { error: insertError } = await supabase
      .from("memory_facts")
      .insert(toInsert.map(toRow));
    if (insertError) {
      const response = NextResponse.json({ error: `Failed to insert new facts: ${insertError.message}` }, { status: 500 });
      applyCorsHeaders(response, corsCheck.origin);
      return response;
    }
  }

  for (const updateFact of toUpdate) {
    const { error: updateError } = await supabase
      .from("memory_facts")
      .update(toRow(updateFact))
      .eq("id", updateFact.id);
    if (updateError) {
      const response = NextResponse.json({ error: `Failed to update facts: ${updateError.message}` }, { status: 500 });
      applyCorsHeaders(response, corsCheck.origin);
      return response;
    }
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
      const { data: activeRows } = await supabase
        .from("memory_facts")
        .select("*")
        .eq("project_id", projectId)
        .is("superseded_by", null);

      const activeFacts = (activeRows || []).map((row: MemoryFactRow) => fromRow(row));
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
      const { data: activeRows } = await supabase
        .from("memory_facts")
        .select("*")
        .is("project_id", null)
        .is("superseded_by", null);

      const activeFacts = (activeRows || []).map((row: MemoryFactRow) => fromRow(row));
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
