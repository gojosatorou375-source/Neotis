import { getSupabase } from "@/lib/supabase/client";
import type { Capsule } from "@/types/atlas";

// Backed by the `capsules` table (see supabase/schema.sql). The `references`
// field is stored under the column `refs` since REFERENCES is a reserved
// SQL keyword.

interface CapsuleRow {
  id: string;
  name: string;
  created_at: string;
  source_conversation_ids: unknown;
  summary: string;
  decisions: unknown;
  key_code: unknown;
  architecture_notes: unknown;
  key_messages: unknown;
  refs: unknown;
}

function fromRow(row: CapsuleRow): Capsule {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    sourceConversationIds: (row.source_conversation_ids as string[]) ?? [],
    summary: row.summary,
    decisions: (row.decisions as string[]) ?? [],
    keyCode: (row.key_code as Capsule["keyCode"]) ?? [],
    architectureNotes: (row.architecture_notes as string[]) ?? [],
    keyMessages: (row.key_messages as string[]) ?? [],
    references: (row.refs as string[]) ?? [],
  };
}

function toRow(capsule: Capsule): CapsuleRow {
  return {
    id: capsule.id,
    name: capsule.name,
    created_at: capsule.createdAt,
    source_conversation_ids: capsule.sourceConversationIds,
    summary: capsule.summary,
    decisions: capsule.decisions,
    key_code: capsule.keyCode,
    architecture_notes: capsule.architectureNotes,
    key_messages: capsule.keyMessages,
    refs: capsule.references,
  };
}

export async function fetchCapsules(): Promise<Capsule[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("capsules")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Failed to load capsules: ${error.message}`);
  return ((data ?? []) as CapsuleRow[]).map(fromRow);
}

export async function insertCapsule(capsule: Capsule): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from("capsules").insert(toRow(capsule));
  if (error) throw new Error(`Failed to save capsule: ${error.message}`);
}

export async function updateCapsuleRow(capsule: Capsule): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from("capsules").update(toRow(capsule)).eq("id", capsule.id);
  if (error) throw new Error(`Failed to update capsule: ${error.message}`);
}

export async function deleteCapsuleRow(id: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from("capsules").delete().eq("id", id);
  if (error) throw new Error(`Failed to delete capsule: ${error.message}`);
}

/** Wipes every capsule — used by the "Reset all data" action. */
export async function deleteAllCapsules(): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from("capsules").delete().not("id", "is", null);
  if (error) throw new Error(`Failed to reset capsules: ${error.message}`);
}
