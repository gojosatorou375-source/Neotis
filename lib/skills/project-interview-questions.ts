import type { Question } from "@/types";

/**
 * The Adaptive Project Interview: 6 consolidated categories covering the permanent,
 * project-level knowledge a Skill.md / Project.md needs, distinct from the 10-question
 * Persona interview.
 */
export const PROJECT_QUESTIONS: Question[] = [
  {
    id: 1,
    title: "What is this project, and who is it for?",
    description: "Describe the problem it solves, the primary users or audience, and what they need or expect from it.",
    placeholder: "For example: PersonaMD/Noetis is a developer-focused browser extension + web app that captures and indexes AI conversations so key decisions and code snippets are never lost.",
  },
  {
    id: 2,
    title: "What is the tech stack and codebase structure?",
    description: "Detail the languages, frameworks, databases, hosting environments, and main folder/architectural conventions.",
    placeholder: "For example: Next.js 14 App Router, TypeScript, Tailwind CSS, Supabase (Postgres). Business logic is under src/lib/<feature> with client hooks wrapping Supabase collection queries.",
  },
  {
    id: 3,
    title: "What are the core features and AI integrations?",
    description: "The main functionality of the application today, and any LLM integrations, prompt structures, or AI actions it performs.",
    placeholder: "For example: Captures conversation logs from Perplexity/Claude/ChatGPT, indexes them in a local knowledge graph, and exports them. Uses OpenRouter Claude-Haiku-4.5 for AI handoff briefs.",
  },
  {
    id: 4,
    title: "What coding standards and testing conventions do you follow?",
    description: "Any style guides, conventions you want the AI assistant to repeat (or avoid), and the strategy/frameworks used for testing.",
    placeholder: "For example: Strict TypeScript type safety, composition over duplication. Testing is done manually with browser verifications and static checks like tsc and eslint.",
  },
  {
    id: 5,
    title: "What security, business rules, or constraints apply?",
    description: "Authentication mechanisms, access controls, data sensitivity levels, domain constraints, or non-negotiable behaviors.",
    placeholder: "For example: A shared access-key header for API requests. Conversations are the source of truth, so deleting a conversation must cascade-delete all derived knowledge facts.",
  },
  {
    id: 6,
    title: "How is it deployed, and what performance or scaling rules matter?",
    description: "Deployment pipeline details, environment configuration, and performance bottlenecks or scaling constraints.",
    placeholder: "For example: Vercel auto-deploys from the main branch on GitHub. We poll Supabase instead of using real-time channels, which works at low volume but must scale carefully.",
  },
];

export const TOTAL_PROJECT_QUESTIONS = PROJECT_QUESTIONS.length;
