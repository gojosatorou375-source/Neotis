import type { Question } from "@/types";

export const QUESTIONS: Question[] = [
  {
    id: 1,
    title: "What do you mainly use AI for?",
    description: "In plain words — work, studying, writing, coding, or something else. Just describe your day-to-day use.",
    placeholder: "For example: I mostly use AI for writing code, drafting emails, and learning new topics quickly.",
  },
  {
    id: 2,
    title: "What's on your plate right now?",
    description: "What are you currently working on or focused on — a project, a skill you're building, a goal you're chasing?",
    placeholder: "For example: Launching my startup, improving my Python skills, and staying consistent with the gym.",
  },
  {
    id: 3,
    title: "How much do you already know about the things you ask about?",
    description: "This tells me whether to explain the basics or jump straight to the details — no need to be modest.",
    placeholder: "For example: I'm a complete beginner at coding, but I already know a lot about marketing and business.",
  },
  {
    id: 4,
    title: "How should I talk to you?",
    description: "Think of it like giving instructions to a new assistant — formal or casual, short or detailed, blunt or gentle?",
    placeholder: "For example: Be direct and to the point, skip the small talk, and keep things casual and friendly.",
  },
  {
    id: 5,
    title: "What actually helps you understand something new?",
    description: "Everyone learns differently — some people need examples, others need diagrams, others need the big picture first.",
    placeholder: "For example: I understand things best through real examples and step-by-step instructions, not long theory.",
  },
  {
    id: 6,
    title: "Think of the best answer an AI ever gave you — what made it good?",
    description: "This helps me know what to aim for every time I respond to you.",
    placeholder: "For example: It gave me clear steps I could follow right away, with a short reason why each step mattered.",
  },
  {
    id: 7,
    title: "What annoys you most about AI responses?",
    description: "Be honest here — this is the fastest way to stop me from repeating mistakes with you.",
    placeholder: "For example: Answers that are too long, repeat my question back to me, or over-explain simple things.",
  },
  {
    id: 8,
    title: "When you ask for advice, what do you actually want back?",
    description: "Should I just pick the best option and tell you, or lay out the choices and let you decide?",
    placeholder: "For example: Just give me your single best recommendation — don't list every possible option.",
  },
  {
    id: 9,
    title: "Anything practical I should always keep in mind?",
    description: "Think job, tools you use, dietary needs, time zone, accessibility — anything that changes how I should help.",
    placeholder: "For example: I only code in Python, I'm vegetarian, and I'm based in India (IST time zone).",
  },
  {
    id: 10,
    title: "If every AI could remember one thing about you, what should it be?",
    description: "This is your one chance to say something important that should never get lost or forgotten.",
    placeholder: "For example: My name is Tharun, I run a small design studio, and my goal is to grow it into an agency.",
  },
];

export const TOTAL_QUESTIONS = QUESTIONS.length;
