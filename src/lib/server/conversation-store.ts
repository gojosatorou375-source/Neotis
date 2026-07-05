import { getSupabase } from "@/lib/supabase/client";
import type { Conversation } from "@/types/conversation";

// Backed by the `conversations` table (see supabase/schema.sql). Function
// signatures are unchanged from the old JSON-file version so the API routes
// that call these don't need any changes.

interface ConversationRow {
  id: string;
  provider: string;
  title: string;
  url: string | null;
  captured_at: string;
  imported_at: string;
  messages: unknown;
  insights: unknown;
  limit_reached: boolean;
}

function fromRow(row: ConversationRow): Conversation {
  return {
    id: row.id,
    provider: row.provider as Conversation["provider"],
    title: row.title,
    url: row.url ?? undefined,
    capturedAt: row.captured_at,
    importedAt: row.imported_at,
    messages: (row.messages as Conversation["messages"]) ?? [],
    insights: (row.insights as Conversation["insights"]) ?? undefined,
    limitReached: row.limit_reached ?? false,
  };
}

function toRow(conversation: Conversation): ConversationRow {
  return {
    id: conversation.id,
    provider: conversation.provider,
    title: conversation.title,
    url: conversation.url ?? null,
    captured_at: conversation.capturedAt,
    imported_at: conversation.importedAt,
    messages: conversation.messages,
    insights: conversation.insights ?? null,
    limit_reached: conversation.limitReached ?? false,
  };
}

export async function readConversations(): Promise<Conversation[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .order("captured_at", { ascending: false });
  if (error) throw new Error(`Failed to read conversations: ${error.message}`);
  return ((data ?? []) as ConversationRow[]).map(fromRow);
}

/** Inserts a conversation if its id isn't already present; returns the
 * stored record (existing one if it was a duplicate). */
export async function upsertConversation(
  conversation: Conversation
): Promise<{ conversation: Conversation; isNew: boolean }> {
  const supabase = getSupabase();

  const { data: existing, error: selectError } = await supabase
    .from("conversations")
    .select("*")
    .eq("id", conversation.id)
    .maybeSingle();
  if (selectError) throw new Error(`Failed to check for existing conversation: ${selectError.message}`);
  if (existing) {
    return { conversation: fromRow(existing as ConversationRow), isNew: false };
  }

  const { data: inserted, error: insertError } = await supabase
    .from("conversations")
    .insert(toRow(conversation))
    .select()
    .single();
  if (insertError) throw new Error(`Failed to insert conversation: ${insertError.message}`);
  return { conversation: fromRow(inserted as ConversationRow), isNew: true };
}

export async function deleteConversation(id: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from("conversations").delete().eq("id", id);
  if (error) throw new Error(`Failed to delete conversation: ${error.message}`);
}

/** Merges fields (e.g. LLM-derived insights) into an already-stored
 * conversation, found by id. No-ops if the id isn't present. */
export async function updateConversation(
  id: string,
  patch: Partial<Conversation>
): Promise<Conversation | null> {
  const supabase = getSupabase();

  const rowPatch: Record<string, unknown> = {};
  if (patch.provider !== undefined) rowPatch.provider = patch.provider;
  if (patch.title !== undefined) rowPatch.title = patch.title;
  if (patch.url !== undefined) rowPatch.url = patch.url;
  if (patch.capturedAt !== undefined) rowPatch.captured_at = patch.capturedAt;
  if (patch.importedAt !== undefined) rowPatch.imported_at = patch.importedAt;
  if (patch.messages !== undefined) rowPatch.messages = patch.messages;
  if (patch.insights !== undefined) rowPatch.insights = patch.insights;
  if (patch.limitReached !== undefined) rowPatch.limit_reached = patch.limitReached;

  const { data, error } = await supabase
    .from("conversations")
    .update(rowPatch)
    .eq("id", id)
    .select()
    .maybeSingle();
  if (error) throw new Error(`Failed to update conversation: ${error.message}`);
  if (!data) return null;
  return fromRow(data as ConversationRow);
}
