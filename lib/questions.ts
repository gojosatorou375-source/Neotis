import type { Question } from "@/types";

export const QUESTIONS: Question[] = [
  {
    id: 1,
    title: "What do you mainly use AI for and what is your current focus?",
    description: "Describe your day-to-day use (e.g. coding, writing, studying) and what projects or skills you are currently focused on.",
    placeholder: "For example: I mostly use AI for writing code and learning new topics. Right now I'm building a Next.js startup.",
  },
  {
    id: 2,
    title: "How much do you already know about the things you ask about?",
    description: "This tells the AI whether to explain the basics or jump straight to the advanced details — no need to be modest.",
    placeholder: "For example: I'm a complete beginner at database optimization, but I already know a lot about frontend React development.",
  },
  {
    id: 3,
    title: "How should the AI communicate with you, and what styles annoy you most?",
    description: "Specify your preferred tone (casual, blunt, formal) and what to avoid (e.g., repeating questions back, long preambles).",
    placeholder: "For example: Be direct, skip the small talk, and keep it casual. Avoid long intro/outro prose or repeating my question.",
  },
  {
    id: 4,
    title: "What helps you understand new concepts, and what makes an AI response exceptional?",
    description: "Explain your learning style (e.g., code examples, step-by-step guides, high-level concepts) and what good answers do.",
    placeholder: "For example: I understand things best through clean code examples and short explanations of why they work.",
  },
  {
    id: 5,
    title: "When you ask for advice, what do you actually want back?",
    description: "Should the AI make the decision and give its single recommendation, or lay out choices with pros/cons for you?",
    placeholder: "For example: Lay out the top 2 choices with a brief comparison of pros/cons, then let me decide.",
  },
  {
    id: 6,
    title: "What core facts, constraints, or goals should every AI always remember about you?",
    description: "Include practical details (your primary languages, tools, time zone, name) and the single most important thing about your goals.",
    placeholder: "For example: My name is Tharun, I code in TypeScript/Next.js, live in IST, and want to build high-performance web apps.",
  },
];

export const TOTAL_QUESTIONS = QUESTIONS.length;
