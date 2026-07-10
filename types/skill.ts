/** The Adaptive Project Interview's raw answers — one string per question id. */
export type ProjectInterviewAnswers = Record<number, string>;

export interface SkillVersion {
  answers: ProjectInterviewAnswers;
  markdown: string;
  savedAt: string;
}

/**
 * A "Skill" is a provider-independent Skill.md: a project's permanent
 * knowledge (stack, architecture, conventions, business rules, etc.) merged
 * with the user's communication Persona, produced by the Adaptive Project
 * Interview. Mirrors the shape of `Persona` in `types/persona.ts`.
 */
export interface Skill {
  id: string;
  name: string;
  projectName: string;
  /** Id of the Persona this Skill was generated with, if any. */
  personaId: string | null;
  createdAt: string;
  updatedAt: string;
  answers: ProjectInterviewAnswers;
  markdown: string;
  tags: string[];
  favorite: boolean;
  pinned: boolean;
  archived: boolean;
  history: SkillVersion[];
}
