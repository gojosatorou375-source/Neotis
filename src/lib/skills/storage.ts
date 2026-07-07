import { createSupabaseCollection } from "@/lib/data/supabase-collection";
import type { Skill, ProjectInterviewAnswers } from "@/types/skill";

// Backed by the `skills` table (see supabase/schema.sql). CRUD mechanics
// live in the generic collection factory -- this file only owns the
// row<->domain mapping.

interface SkillRow {
  id: string;
  name: string;
  project_name: string;
  persona_id: string | null;
  created_at: string;
  updated_at: string;
  answers: unknown;
  markdown: string;
  tags: unknown;
  favorite: boolean;
  pinned: boolean;
  archived: boolean;
  history: unknown;
}

function fromRow(row: SkillRow): Skill {
  return {
    id: row.id,
    name: row.name,
    projectName: row.project_name,
    personaId: row.persona_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    answers: (row.answers as ProjectInterviewAnswers) ?? {},
    markdown: row.markdown,
    tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
    favorite: row.favorite,
    pinned: row.pinned,
    archived: row.archived,
    history: Array.isArray(row.history) ? (row.history as Skill["history"]) : [],
  };
}

function toRow(skill: Skill): SkillRow {
  return {
    id: skill.id,
    name: skill.name,
    project_name: skill.projectName,
    persona_id: skill.personaId,
    created_at: skill.createdAt,
    updated_at: skill.updatedAt,
    answers: skill.answers,
    markdown: skill.markdown,
    tags: skill.tags,
    favorite: skill.favorite,
    pinned: skill.pinned,
    archived: skill.archived,
    history: skill.history,
  };
}

export const skillsCollection = createSupabaseCollection<Skill, SkillRow>({
  table: "skills",
  fromRow,
  toRow,
  getId: (skill) => skill.id,
  orderBy: { column: "updated_at", ascending: false },
});
