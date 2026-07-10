import type { Conversation, Platform } from "@/types/recovery";
import { buildConversation, type RawImport } from "@/lib/recovery/metadata-pipeline";

interface SeedSpec {
  id: string;
  platform: Platform;
  title: string;
  createdAt: string;
  project: string;
  status?: Conversation["status"];
  content: string;
}

const SEEDS: SeedSpec[] = [
  {
    id: "seed-1",
    platform: "ChatGPT",
    title: "Restaurant Website",
    createdAt: "2026-07-04T10:15:00",
    project: "Restaurant Website",
    status: "In Progress",
    content:
      "I want to build a restaurant website with an online menu, reservation form, and a hero image of the dining room. We decided to use a warm color palette and serif headings. Still need to add the reservation form validation and connect the contact form to email. Next step is to write the About page copy.",
  },
  {
    id: "seed-2",
    platform: "ChatGPT",
    title: "Resume Improvement",
    createdAt: "2026-07-04T15:42:00",
    project: "Career",
    status: "Completed",
    content:
      "Help me improve my resume for a product manager role. We tightened the bullet points to focus on measurable impact, rewrote the summary, and reordered the experience section by relevance. Final version looks strong and ready to send.",
  },
  {
    id: "seed-3",
    platform: "Claude",
    title: "Restaurant Website — Menu Copy",
    createdAt: "2026-07-05T09:00:00",
    project: "Restaurant Website",
    status: "Pending",
    content:
      "Continuing the restaurant site — need menu descriptions for 12 dishes in a warm, appetizing tone. We drafted 6 so far. Still need descriptions for the dessert section and the drinks menu. Follow up: ask the client for allergen information.",
  },
  {
    id: "seed-4",
    platform: "Gemini",
    title: "Restaurant Logo Concepts",
    createdAt: "2026-07-06T18:20:00",
    project: "Restaurant Website",
    status: "In Progress",
    content:
      "Generate logo concepts for an Italian restaurant, warm color palette, rustic but modern feel. We picked concept 3 as the direction. Still need a horizontal lockup version and a favicon-sized mark.",
  },
  {
    id: "seed-5",
    platform: "Perplexity",
    title: "Pricing Strategy Research",
    createdAt: "2026-06-18T11:05:00",
    project: "Startup Pricing",
    status: "In Progress",
    content:
      "Researching pricing strategy for a B2B SaaS product — tiered vs usage-based pricing, competitor benchmarks. We decided tiered pricing fits our stage better. Next step: draft three pricing tiers and test messaging with 5 customers.",
  },
  {
    id: "seed-6",
    platform: "DeepSeek",
    title: "Invoice Generator Script",
    createdAt: "2026-05-02T14:30:00",
    project: "Invoice Tool",
    status: "Completed",
    content:
      "Wrote a Python script that generates PDF invoices from a CSV of line items, using reportlab. Tested with sample data, output looks correct. No remaining tasks.",
  },
  {
    id: "seed-7",
    platform: "Cursor",
    title: "React Portfolio Site — Component Setup",
    createdAt: "2026-04-11T20:12:00",
    project: "Portfolio Website",
    status: "Pending",
    content:
      "Setting up a React portfolio site with a projects grid and case study pages. We still need to build the contact form and connect it to a serverless function. Next step is deploying to Vercel.",
  },
  {
    id: "seed-8",
    platform: "ChatGPT",
    title: "Marketing Campaign Ideas",
    createdAt: "2026-03-22T08:45:00",
    project: "Marketing",
    status: "In Progress",
    content:
      "Brainstorming a launch marketing campaign — social posts, email sequence, and a referral incentive. We finalized the email sequence outline. Still need the social post calendar and referral program terms.",
  },
  {
    id: "seed-9",
    platform: "Claude",
    title: "Brand Voice Strategy",
    createdAt: "2026-03-20T13:10:00",
    project: "Marketing",
    status: "Completed",
    content:
      "Defined brand voice guidelines: warm, direct, no jargon. Documented three example rewrites for common marketing copy. This is finished and ready to share with the team.",
  },
  {
    id: "seed-10",
    platform: "Windsurf",
    title: "Landing Page Refactor",
    createdAt: "2026-02-14T16:00:00",
    project: "Portfolio Website",
    status: "Archived",
    content:
      "Refactored the landing page hero section to use CSS grid instead of flexbox for the layout. Cleaned up unused styles. No further action needed on this thread.",
  },
];

export function generateSeedConversations(): Conversation[] {
  const conversations: Conversation[] = [];

  for (const seed of SEEDS) {
    const raw: RawImport = {
      platform: seed.platform,
      title: seed.title,
      createdAt: new Date(seed.createdAt).toISOString(),
      messages: [{ role: "user", content: seed.content }],
    };

    const projectContext = conversations.map((c) => ({
      name: c.project,
      conversationIds: [],
      providers: [],
      createdAt: c.createdAt,
      lastActivity: c.lastUpdated,
      completedTasks: 0,
      totalTasks: 0,
    }));

    const conversation = buildConversation(raw, projectContext);
    conversation.id = seed.id;
    conversation.project = seed.project;
    if (seed.status) conversation.status = seed.status;
    conversation.lastUpdated = conversation.createdAt;
    conversations.push(conversation);
  }

  return conversations;
}
