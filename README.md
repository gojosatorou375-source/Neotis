# Noetis

_(formerly PersonaMD — the project folder/package name is unchanged to avoid breaking local paths)_

A premium, glassmorphic interview experience that turns 10 short questions into a portable `AI_PROFILE.md` — a personalization file you can drop into ChatGPT, Claude, Gemini, Grok, DeepSeek, Llama, Mistral, or any other assistant's custom instructions.

## Stack

Next.js 14 (App Router) · React 18 · TypeScript · Tailwind CSS · Framer Motion · Lucide Icons

## Getting started

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Vercel Deployment Guide

1. **Sign up / Log in** to Vercel (https://vercel.com)
2. **Connect your GitHub account** to Vercel
3. **Import the repository** https://github.com/tharun-creator/Noetis
4. **Configure environment variables** in Vercel dashboard:
   - `OPENROUTER_API_KEY` (optional, for AI document enhancement)
   - `NEXT_PUBLIC_SUPABASE_URL` (from Supabase project settings)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (from Supabase project settings)
   - `APP_SECRET_KEY` (or `NEXT_PUBLIC_APP_ACCESS_KEY` — secure key used for browser extension API verification)
   - `JWT_SECRET_KEY` (random string for signing extension session tokens)
5. **Deploy!** Click "Deploy" button in Vercel dashboard

### Local Dev Environment Setup

Copy `.env.local.example` to `.env.local` and fill in the values:

```bash
cp .env.local.example .env.local
```

## How it works

- `src/lib/questions.ts` — the 10 interview questions.
- `src/lib/use-interview.ts` — flow state (phase, current question, answers) with auto-save to `localStorage`.
- `src/lib/generate-profile.ts` — merges, dedupes, and rewrites raw answers into the structured `AI_PROFILE.md` markdown.
- `src/components/` — Landing, Interview/QuestionCard, LoadingScreen, CompletionScreen, and shared glass UI primitives (`Button`, `Textarea`, `Progress`, `GlassPanel`).

## Features

Light & dark themes, keyboard navigation (arrow keys + ⌘/Ctrl+Enter), auto-save and resume, edit previous answers, restart, copy-to-clipboard, and one-click `.md` download.

## Persona Library (`/personas`)

Save a generated profile under a name — "Coder", "Writer", "Researcher" — and come back to it anytime without redoing the interview.

- On the completion screen, **Save as Persona** opens a naming dialog (with quick presets) and stores the name, the answers, and the generated markdown. Saving under a name that already exists updates that persona instead of creating a duplicate.
- `/personas` (linked from the header) lists every saved persona as a card: preview snippet, last-updated date, and actions to **View** (full markdown + copy/download), **Download** the `.md` directly, **Copy**, **Rename**, **Edit** (loads that persona's answers back into the interview so you can tweak and regenerate it), and **Delete**.
- `src/types/persona.ts` / `src/lib/personas/` — the persona data model, localStorage persistence, and the `use-personas` hook.
- `src/lib/markdown-file.ts` — shared copy/download/preview helpers used by both the completion screen and the Persona Library.

## Conversation Recovery Engine (`/recovery`)

A second module, linked from the header, that recovers forgotten conversations and prevents duplicate work across AI platforms (ChatGPT, Claude, Gemini, Grok, DeepSeek, Perplexity, Llama, Cursor, Windsurf, plus Markdown/JSON/plain-text imports).

This build is **local-first by design**: there is no server, database, or embeddings API key involved. Everything — parsing, metadata extraction, "semantic" search, and storage — runs in the browser.

- `src/types/recovery.ts` — the conversation/project data model.
- `src/lib/recovery/embeddings.ts` — a fixed-length pseudo-embedding built with the hashing trick (feature hashing) over term frequencies, used for cosine-similarity search. It's a stand-in for a real embeddings API (OpenAI/Voyage/Cohere) — swap `embedText` for a real API call and the rest of the pipeline (storage, ranking, duplicate detection) is unchanged.
- `src/lib/recovery/metadata-pipeline.ts` — turns a raw import into a full `Conversation`: extractive summary, keyword/topic extraction, pending-task detection, and project auto-detection.
- `src/lib/recovery/parsers.ts` — accepts JSON exports, Markdown transcripts, or plain text.
- `src/lib/recovery/derive.ts` — semantic search, duplicate/similarity detection, "continue where you left off", related conversations, and project rollups.
- `src/lib/recovery/storage.ts` — localStorage persistence (swap-in point for Postgres + a vector DB in a hosted deployment).
- `src/components/recovery/` — Workspace Explorer (collapsible provider → year → month → day tree), Conversation Dashboard, right-rail widgets, Find-What-I-Forgot search, Import dialog, and the "Similar Conversation Found" duplicate-prevention popup.

Ships with 10 seeded sample conversations (across providers, dates, and projects) so the tree, search, duplicate detection, and continuity features all have real data to demonstrate on first load.

### Atlas: Timeline, Knowledge Graph & Capsules

Atlas is "universal AI memory" built as three more tabs on `/recovery`, on top of the same local conversation store — a tab bar next to Import switches between **Workspace**, **Timeline**, **Knowledge Graph**, and **Capsules**. Same local-first constraint as everything else here: no FastAPI/PostgreSQL/Qdrant/Celery backend and no real browser extension reading live ChatGPT/Claude pages — sync is still the manual Import dialog. This is the architecture a real backend + extension would plug into, not a replacement for one.

- **Timeline** (`src/lib/recovery/timeline.ts`) — groups every conversation into Today / Yesterday / This Week / This Month / Earlier, newest first.
- **Knowledge Graph** (`src/lib/recovery/knowledge-graph.ts`, `src/components/recovery/knowledge-graph-view.tsx`) — extracts technology/project/concept nodes from each conversation's keywords and project, links nodes that co-occur in the same conversation, and renders it as a clickable SVG graph (deterministic concentric layout, no charting library) with a detail panel listing linked conversations per node.
- **Capsules** (`src/lib/recovery/capsule-builder.ts`, `capsule-markdown.ts`, `use-capsules.ts`) — pick any set of conversations and distill them into one portable Markdown bundle: merged summary, key decisions, extracted code blocks (parsed straight out of the stored message text), architecture notes, key prompts, and file references. Copy or download it to paste into a fresh conversation on any LLM.

Capsules and the graph are both derived from/persisted alongside the same `Conversation` data — no new backend, same `localStorage` model as the rest of the recovery engine.

# Noetis
