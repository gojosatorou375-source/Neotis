import { getSupabase } from "@/lib/supabase/client";
import type { Conversation, ProductivityStats } from "@/types/recovery";

/**
 * Backed by the `recovery_conversations` and `productivity_stats` tables
 * (see supabase/schema.sql) — previously a localStorage-only, fully
 * client-side, offline-first store. Moving to Supabase means this data now
 * syncs across browsers/devices instead of being trapped in one browser's
 * localStorage.
 */

interface RecoveryConversationRow {
  id: string;
  platform: string;
  title: string;
  created_at: string;
  last_updated: string;
  project: string;
  status: string;
  summary: string;
  keywords: unknown;
  topics: unknown;
  embedding: unknown;
  files: unknown;
  prompts: unknown;
  outputs: unknown;
  follow_up_tasks: unknown;
  decisions: unknown;
  tags: unknown;
  similarity_links: unknown;
  conversation_history: unknown;
  archived: boolean;
}

function fromRow(row: RecoveryConversationRow): Conversation {
  return {
    id: row.id,
    platform: row.platform as Conversation["platform"],
    title: row.title,
    createdAt: row.created_at,
    lastUpdated: row.last_updated,
    project: row.project,
    status: row.status as Conversation["status"],
    summary: row.summary,
    keywords: (row.keywords as string[]) ?? [],
    topics: (row.topics as string[]) ?? [],
    embedding: (row.embedding as number[]) ?? [],
    files: (row.files as string[]) ?? [],
    prompts: (row.prompts as string[]) ?? [],
    outputs: (row.outputs as string[]) ?? [],
    followUpTasks: (row.follow_up_tasks as string[]) ?? [],
    decisions: (row.decisions as string[]) ?? [],
    tags: (row.tags as string[]) ?? [],
    similarityLinks: (row.similarity_links as Conversation["similarityLinks"]) ?? [],
    conversationHistory: (row.conversation_history as Conversation["conversationHistory"]) ?? [],
    archived: row.archived,
  };
}

function toRow(c: Conversation): RecoveryConversationRow {
  return {
    id: c.id,
    platform: c.platform,
    title: c.title,
    created_at: c.createdAt,
    last_updated: c.lastUpdated,
    project: c.project,
    status: c.status,
    summary: c.summary,
    keywords: c.keywords,
    topics: c.topics,
    embedding: c.embedding,
    files: c.files,
    prompts: c.prompts,
    outputs: c.outputs,
    follow_up_tasks: c.followUpTasks,
    decisions: c.decisions,
    tags: c.tags,
    similarity_links: c.similarityLinks,
    conversation_history: c.conversationHistory,
    archived: c.archived,
  };
}

export async function fetchRecoveryConversations(): Promise<Conversation[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("recovery_conversations")
    .select("*")
    .order("last_updated", { ascending: false });
  if (error) throw new Error(`Failed to load conversations: ${error.message}`);
  return ((data ?? []) as RecoveryConversationRow[]).map(fromRow);
}

export async function insertRecoveryConversation(conversation: Conversation): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from("recovery_conversations").insert(toRow(conversation));
  if (error) throw new Error(`Failed to save conversation: ${error.message}`);
}

export async function updateRecoveryConversation(conversation: Conversation): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("recovery_conversations")
    .update(toRow(conversation))
    .eq("id", conversation.id);
  if (error) throw new Error(`Failed to update conversation: ${error.message}`);
}

export async function deleteRecoveryConversation(id: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from("recovery_conversations").delete().eq("id", id);
  if (error) throw new Error(`Failed to delete conversation: ${error.message}`);
}

interface StatsRow {
  recovered_conversations: number;
  duplicate_work_prevented: number;
  projects_resumed: number;
  hours_saved: number;
  repeated_prompts_avoided: number;
}

function statsFromRow(row: StatsRow): ProductivityStats {
  return {
    recoveredConversations: row.recovered_conversations,
    duplicateWorkPrevented: row.duplicate_work_prevented,
    projectsResumed: row.projects_resumed,
    hoursSaved: row.hours_saved,
    repeatedPromptsAvoided: row.repeated_prompts_avoided,
  };
}

export async function fetchStats(): Promise<ProductivityStats> {
  const supabase = getSupabase();
  const { data, error } = await supabase.from("productivity_stats").select("*").eq("id", 1).maybeSingle();
  if (error) throw new Error(`Failed to load stats: ${error.message}`);
  if (!data) return emptyStats();
  return statsFromRow(data as StatsRow);
}

export async function saveStats(stats: ProductivityStats): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("productivity_stats")
    .update({
      recovered_conversations: stats.recoveredConversations,
      duplicate_work_prevented: stats.duplicateWorkPrevented,
      projects_resumed: stats.projectsResumed,
      hours_saved: stats.hoursSaved,
      repeated_prompts_avoided: stats.repeatedPromptsAvoided,
    })
    .eq("id", 1);
  if (error) throw new Error(`Failed to save stats: ${error.message}`);
}

export function emptyStats(): ProductivityStats {
  return {
    recoveredConversations: 0,
    duplicateWorkPrevented: 0,
    projectsResumed: 0,
    hoursSaved: 0,
    repeatedPromptsAvoided: 0,
  };
}
