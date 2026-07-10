import type { Answers } from "@/types";

/** A prior snapshot of a persona, kept when the persona is re-saved/updated. */
export interface PersonaVersion {
  answers: Answers;
  markdown: string;
  savedAt: string;
}

export interface Persona {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  answers: Answers;
  markdown: string;
  /** Free-form labels for organizing/searching the Persona Library. */
  tags: string[];
  /** Previous versions, most recent first. Capped to keep storage lean. */
  history: PersonaVersion[];
}
