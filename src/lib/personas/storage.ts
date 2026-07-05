import { getSupabase } from "@/lib/supabase/client";
import type { Persona } from "@/types/persona";
import type { Answers } from "@/types";

// Backed by the `personas` table (see supabase/schema.sql).

const PENDING_LOAD_KEY = "personamd-pending-load-v1";

interface PersonaRow {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  answers: unknown;
  markdown: string;
  tags: unknown;
  history: unknown;
}

function fromRow(row: PersonaRow): Persona {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    answers: (row.answers as Answers) ?? {},
    markdown: row.markdown,
    tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
    history: Array.isArray(row.history) ? (row.history as Persona["history"]) : [],
  };
}

function toRow(persona: Persona): PersonaRow {
  return {
    id: persona.id,
    name: persona.name,
    created_at: persona.createdAt,
    updated_at: persona.updatedAt,
    answers: persona.answers,
    markdown: persona.markdown,
    tags: persona.tags,
    history: persona.history,
  };
}

export async function fetchPersonas(): Promise<Persona[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("personas")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw new Error(`Failed to load personas: ${error.message}`);
  return ((data ?? []) as PersonaRow[]).map(fromRow);
}

export async function insertPersona(persona: Persona): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from("personas").insert(toRow(persona));
  if (error) throw new Error(`Failed to save persona: ${error.message}`);
}

export async function updatePersonaRow(persona: Persona): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from("personas").update(toRow(persona)).eq("id", persona.id);
  if (error) throw new Error(`Failed to update persona: ${error.message}`);
}

export async function deletePersonaRow(id: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from("personas").delete().eq("id", id);
  if (error) throw new Error(`Failed to delete persona: ${error.message}`);
}

/**
 * Small handoff used by the Persona Library's "Edit answers" action: it
 * stashes the answers to restore, then navigates to the interview, which
 * picks them up on mount via `consumePendingLoad`. This one small piece of
 * ephemeral, browser-tab-local UI state stays in sessionStorage rather than
 * Supabase — it's not data worth persisting or syncing.
 */
export function setPendingLoad(answers: Answers): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PENDING_LOAD_KEY, JSON.stringify(answers));
}

export function consumePendingLoad(): Answers | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(PENDING_LOAD_KEY);
  if (!raw) return null;
  window.localStorage.removeItem(PENDING_LOAD_KEY);
  try {
    return JSON.parse(raw) as Answers;
  } catch {
    return null;
  }
}
