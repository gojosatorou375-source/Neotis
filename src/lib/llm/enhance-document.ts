import { generateProfile } from "@/lib/generate-profile";
import { generateSkill } from "@/lib/skills/generate-skill";
import type { DocumentGenerationResult } from "@/types";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "anthropic/claude-haiku-4.5";

export interface EnhanceDocumentOptions {
  answers: Record<string | number, string>;
  docType: "persona" | "project" | "combined";
  projectName?: string;
  personaMarkdown?: string | null;
}

function buildFallbackMarkdown({
  answers,
  docType,
  projectName = "Untitled Project",
  personaMarkdown = null,
}: EnhanceDocumentOptions): string {
  if (docType === "persona") {
    return generateProfile(answers as any);
  } else {
    return generateSkill({
      projectName,
      answers: answers as any,
      personaMarkdown,
    });
  }
}

export async function enhanceDocument({
  answers,
  docType,
  projectName = "Untitled Project",
  personaMarkdown = null,
}: EnhanceDocumentOptions): Promise<DocumentGenerationResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return {
      markdown: buildFallbackMarkdown({ answers, docType, projectName, personaMarkdown }),
      usedAI: false,
    };
  }

  // Format answers for LLM readability
  const formattedAnswers = Object.entries(answers)
    .map(([num, ans]) => `Question ${num}: ${ans.trim()}`)
    .join("\n\n");

  let prompt = "";
  if (docType === "persona") {
    prompt = `You are a professional documentation builder. You will be given a user's answers to a 6-question interview about their AI communication preferences. Reorganize and rewrite these answers into a polished, high-signal Markdown document named AI_PROFILE.md.

Guidelines:
1. Reorganize raw or terse answers into clear, logical sections with appropriate Markdown headers (e.g. "Communication Preferences", "Working Style", "Constraints & Guardrails").
2. Since user answers are now sparser (from a consolidated 6-question layout), perform deeper inference and expansion to fill out complete, professional sections. Rely on common developer requirements and preferences to expand brief inputs, but do not fabricate unique personal details.
3. Tighten vague or rambling answers into concise, declarative, imperative statements an AI assistant can act on directly.
4. Intelligently identify and append highly relevant communication guidelines, workspace settings, or behavioral rules that developers typically want from an AI assistant but might have been missed in the raw answers (e.g. asking for code comments, preferred response lengths, or structured explanations). Label these recommendations clearly.
5. Preserve every concrete detail exactly (names, tools, guidelines, libraries).
6. Do NOT include any preamble, introduction, or concluding chat commentary. Output ONLY the raw Markdown content.
7. End with this exact notice line:
"This Skill is portable and can be pasted into the custom instructions, system prompt, or project knowledge of ChatGPT, Claude, Gemini, Grok, DeepSeek, Llama, Mistral, or any other AI assistant."

User Answers:
${formattedAnswers}`;
  } else if (docType === "project") {
    prompt = `You are a professional software documentation builder. You will be given a user's answers to an Adaptive Project Interview for project "${projectName}". Synthesize these answers into a professional, high-signal project Markdown profile.

Guidelines:
1. Reorganize raw answers into clear, standard sections with proper Markdown headers:
   - "Project Overview & Users"
   - "Tech Stack & Architecture"
   - "Core Features & AI Integration"
   - "Coding Standards & Testing"
   - "Security, Constraints & Business Rules"
   - "Operations, Deployment & Performance"
2. Since user answers are now sparser (from a consolidated 6-question layout), perform deeper inference and expansion to build out rich, detailed technical sections. Infer reasonable technical context based on the mentioned stack, but do not invent custom features or domain facts.
3. Tighten vague or conversational answers into concise, declarative, imperative rules (e.g. "Use TypeScript for all new files; do not use any types").
4. Proactively identify and add standard development best practices, security guardrails, performance benchmarks, and common code conventions that are highly relevant to the specified tech stack (e.g. Next.js App Router rules, React Server Component guidelines, Tailwind styling practices, or SQL query conventions) but might have been missed in the user's raw answers. Clearly specify these inferred best practices to make the profile complete, dynamic, and highly productive.
5. Preserve every concrete detail exactly (names, libraries, tool names, file paths, parameters).
6. Do NOT include any preamble or chat commentary. Output ONLY the raw Markdown content.
7. Start with a header: "# Skill: ${projectName}" followed by a blockquote explaining that this file describes permanent project-level knowledge.
8. End with this exact notice line:
"This Skill is portable and can be pasted into the custom instructions, system prompt, or project knowledge of ChatGPT, Claude, Gemini, Grok, DeepSeek, Llama, Mistral, or any other AI assistant."

User Answers:
${formattedAnswers}`;
  } else {
    // Combined doc
    prompt = `You are a professional software documentation builder. You will be given a user's answers to an Adaptive Project Interview for project "${projectName}", plus their already generated Personal communication profile. Synthesize and merge these into a professional, high-signal combined Markdown profile.

Guidelines:
1. Reorganize raw answers into clear, standard sections with proper Markdown headers:
   - "Project Overview & Users"
   - "Tech Stack & Architecture"
   - "Core Features & AI Integration"
   - "Coding Standards & Testing"
   - "Security, Constraints & Business Rules"
   - "Operations, Deployment & Performance"
2. Fold in a new section: "## Communication Preferences" which synthesizes the user's communication preferences.
3. Since user answers are now sparser (from a consolidated 6-question layout), perform deeper inference and expansion to construct comprehensive, detailed sections. Rely on standard conventions for the tech stack to populate empty fields, but do not invent custom project specifics.
4. Tighten vague or conversational answers into concise, declarative, imperative rules.
5. Proactively identify and add standard development best practices, security guardrails, performance benchmarks, and common code conventions that are highly relevant to the specified tech stack (e.g. Next.js App Router rules, React Server Component guidelines, Tailwind styling practices, or SQL query conventions) but might have been missed in the user's raw answers. Combine these with the user's communication preferences for a comprehensive, highly productive profile.
6. Preserve every concrete detail exactly (names, libraries, tool names, file paths, parameters).
7. Do NOT include any preamble or chat commentary. Output ONLY the raw Markdown content.
8. Start with a header: "# Skill: ${projectName}" followed by a blockquote explaining that this file describes permanent project-level knowledge.
9. End with this exact notice line:
"This Skill is portable and can be pasted into the custom instructions, system prompt, or project knowledge of ChatGPT, Claude, Gemini, Grok, DeepSeek, Llama, Mistral, or any other AI assistant."

Project Answers:
${formattedAnswers}

Personal Profile:
${personaMarkdown || "None provided."}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      console.error("OpenRouter enhancement failed:", res.status, await res.text());
      return {
        markdown: buildFallbackMarkdown({ answers, docType, projectName, personaMarkdown }),
        usedAI: false,
      };
    }

    const data = await res.json();
    let content = data?.choices?.[0]?.message?.content;
    if (!content) {
      return {
        markdown: buildFallbackMarkdown({ answers, docType, projectName, personaMarkdown }),
        usedAI: false,
      };
    }

    // Clean up code fences if model wrapped it
    content = content.trim();
    if (content.startsWith("```")) {
      const firstNewLine = content.indexOf("\n");
      const lastFence = content.lastIndexOf("```");
      if (firstNewLine !== -1 && lastFence > firstNewLine) {
        content = content.slice(firstNewLine + 1, lastFence).trim();
      }
    }

    return { markdown: content, usedAI: true };
  } catch (err) {
    clearTimeout(timeoutId);
    console.error("OpenRouter enhancement error:", err);
    return {
      markdown: buildFallbackMarkdown({ answers, docType, projectName, personaMarkdown }),
      usedAI: false,
    };
  }
}
