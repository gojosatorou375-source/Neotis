# Noetis (formerly PersonaMD) — Architecture & Code Analysis

This document explains how the entire codebase at this repo root works: the Next.js web app, its Supabase-backed data layer, the browser extension that feeds it, and the vendored **Proxima** subproject that acts as an MCP/automation gateway into AI providers (including the new conversation-sync bridge between the two).

## 1. What this project is

Noetis started as a single feature — a 10-question interview that produces a portable `AI_PROFILE.md` personalization file for any LLM's custom instructions — and grew into a suite of tools built around **capturing, organizing, and re-using AI conversations**:

- **Interview → Persona** (`/`, `/personas`) — generate and save `AI_PROFILE.md` profiles.
- **Conversation Recovery Engine** (`/recovery`, `/conversations`, `/timeline`, `/graph`) — import, search, and de-duplicate AI conversations across providers.
- **Atlas** (Timeline / Knowledge Graph / Capsules) — derived views over the same conversation store.
- **Skills** (`/skills`, `/skills/new`, `/skills/combine`) — an "Adaptive Project Interview" that produces a `Skill.md` (permanent project knowledge), optionally merged with a Persona.
- **AI Knowledge Extractor** & **Memory Facts** — two parallel systems that mine structured facts out of conversations.
- A **browser extension** that captures conversations from ChatGPT/Claude/Gemini/Perplexity/Grok/DeepSeek and pushes them into the app.
- **Proxima** (`Proxima/`) — a vendored Electron app + MCP server that drives real logged-in browser sessions for AI providers; recently extended (see §9) to push full conversation history into Noetis's Supabase automatically.

## 2. Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Framer Motion, Lucide Icons |
| Backend | Next.js API routes (`src/app/api/**`) |
| Database | Supabase (Postgres), row-level security gated by a shared access-key header |
| LLM calls | OpenRouter (`anthropic/claude-haiku-4.5`) — insight extraction, memory-fact extraction, document enhancement |
| Extension | Chrome Manifest V3, vanilla JS, Shadow DOM UI |
| Proxima | Electron 33, Node 18+, `@modelcontextprotocol/sdk`, raw TCP IPC |

## 3. Repository layout

```
PersonaMD/
├── src/
│   ├── app/            # Next.js pages + API routes
│   ├── components/     # React components, grouped by feature
│   ├── lib/            # Business logic (see §6)
│   └── types/          # Domain models
├── extension/          # Browser extension (Manifest V3)
├── supabase/schema.sql # Full DB schema + RLS policies
├── Proxima/            # Vendored Electron/MCP AI-provider gateway (see §8-9)
└── .env.local.example  # Required env vars
```

## 4. Pages (`src/app`)

| Route | Purpose |
|---|---|
| `/` | Interview flow (`landing → interview → loading → completion`), driven by `use-interview.ts`. Produces `AI_PROFILE.md`. |
| `/personas` | Persona Library — save/view/edit/rename/restore-version/delete saved profiles. |
| `/graph` | Standalone knowledge graph built from conversations' LLM-extracted topics. |
| `/recovery` | The main dashboard — tabs for Workspace, Conversations, Knowledge, Timeline, Graph, Skills. Composes most of `src/components/recovery/`. |
| `/timeline` | Chronological feed of captured conversations (Today/Yesterday/This Week/…). |
| `/skills` | Skills Library (project-level knowledge docs). |
| `/skills/new` | Adaptive Project Interview (6 questions) → `Skill.md`, AI-enhanced via `/api/library/enhance`. |
| `/skills/combine` | Merges a Persona + a Skill into one document via `/api/skills/combine`. |
| `/conversations` | Browser-extension-captured conversations — import, bulk delete, generate insights, share/handoff. |

## 5. API routes (`src/app/api`)

All routes share CORS validation and access-key/session auth (`src/lib/server/auth.ts`) so the browser extension can call them cross-origin.

| Route | Methods | Purpose |
|---|---|---|
| `api/auth/session` | POST | Exchanges an access key for a short-lived session JWT (used by the extension). |
| `api/conversations` | GET/POST/DELETE | List, upsert (extension push), or wipe captured conversations. POST fires an async OpenRouter `extractInsights` call for new conversations. |
| `api/conversations/[id]` | DELETE | Delete one conversation. |
| `api/conversations/[id]/insights` | POST | Backfill insights for conversations captured before an API key was configured. |
| `api/conversations/handoff` | POST | Distills a conversation into a "handoff" Markdown brief for continuing elsewhere. |
| `api/library` | GET | Builds/returns Project.md, Skills.md, Library.md, or Personal.md on demand (`?doc=`, `?action=list`). |
| `api/library/enhance` | POST | AI-enhances raw interview answers into a polished persona/project/combined document. |
| `api/memory/extract` | POST | The Supabase-backed "Memory Facts" pipeline — see §6.5. |
| `api/skills` | GET | Lightweight list of active skills (id/name/projectName). |
| `api/skills/combine` | POST | Merges a project + persona doc via LLM. |

## 6. Business logic (`src/lib`)

### 6.1 Personas (`lib/personas`)
A `Persona` = `{id, name, answers, markdown, tags, history[]}`. `storage.ts` is hand-rolled Supabase CRUD against the `personas` table; `use-personas.ts` adds optimistic local state, name-based upsert, and version history/restore.

### 6.2 Conversation Recovery Engine (`lib/recovery`)
The most elaborate module. Everything derives from one conversation store:

- `embeddings.ts` — local pseudo-embeddings via feature hashing (deliberate stand-in for a real embeddings API — no network call).
- `parsers.ts` + `metadata-pipeline.ts` — turn a pasted/uploaded/captured conversation into a full record: extractive summary, keywords/topics, embedding, project auto-detection, pending-task/decision detection.
- `derive.ts` — semantic search, duplicate detection, "continue where you left off," related conversations, hours-saved estimate.
- `timeline.ts`, `knowledge-graph.ts`, `capsule-builder.ts`/`capsule-markdown.ts` — the three Atlas views (see §7).
- `storage.ts` — **Supabase-backed** (`recovery_conversations`, `productivity_stats` tables) — despite the module's own doc-comments still describing a "local-first, no server" design, it has been migrated off `localStorage`.
- `use-recovery-store.ts` — the orchestrating hook: import flow (duplicate check → commit/continue/merge), CRUD, and `syncCapturedConversations` (keeps this store in sync with extension-captured conversations).

### 6.3 Skills (`lib/skills`)
A `Skill` = permanent project knowledge (`{id, name, projectName, personaId?, answers, markdown, tags, favorite, pinned, archived, history[]}`). `generate-skill.ts` deterministically synthesizes Markdown from interview answers (optionally folding in a linked Persona). Built on the generic collection factory (§6.6), backed by the `skills` table.

### 6.4 AI Knowledge Extractor (`lib/knowledge`)
Two parallel, non-LLM extraction engines:
- `extract-knowledge.ts` — regex/heuristic classification of conversation sentences into 13 categories (security rules, API changes, TODOs, bugs, architecture decisions, etc.), confidence-scored, capped per category, incrementally merged. Backed by the `knowledge_items` table.
- `engine.ts` — a **separate** system for LLM-extracted "memory facts": dedup/contradiction handling (a rejected fact supersedes a prior adopted one) and hash-based incremental Markdown regeneration so unchanged doc sections stay byte-identical. Consumed only by `api/memory/extract`.

### 6.5 Memory Facts pipeline
`api/memory/extract` reads a raw conversation, calls `lib/llm/openrouter.ts`'s `extractMemoryFacts` (Claude Haiku), dedupes/supersedes against existing facts scoped by project/user, writes to the `memory_facts` table, then regenerates the target Skill's or Persona's markdown. **This is the one feature still missing a dedicated `storage.ts`/hook** — persistence is inline in the route handler rather than following the pattern used everywhere else.

### 6.6 Shared infrastructure (`lib/data`)
`supabase-collection.ts` is a generic `createSupabaseCollection<T, Row>()` factory (fetch/insert/update/remove) used by Skills and Knowledge; Personas and Recovery predate it and still hand-roll their own storage.

### 6.7 LLM integration (`lib/llm`, server-only, OpenRouter)
- `openrouter.ts` — `extractInsights` (summary/topics/entities) and `extractMemoryFacts`.
- `handoff.ts`, `draft-skill.ts`, `combine-skill.ts`, `enhance-document.ts` — each a specific LLM-assisted document transform, all with deterministic non-AI fallbacks when no API key is set.

## 7. Atlas: Timeline, Knowledge Graph, Capsules
Three more views over the same `recovery` conversation store (`/recovery` tab bar):
- **Timeline** — buckets by Today/Yesterday/This Week/This Month/Earlier.
- **Knowledge Graph** — co-occurrence graph of tech/project/concept nodes extracted from conversation keywords, rendered via a dependency-free force-directed layout (`lib/graph/force-layout.ts`) and a reusable SVG component (`components/graph/interactive-graph.tsx`).
- **Capsules** — distill selected conversations into one portable Markdown bundle (summary, decisions, extracted code blocks, architecture notes), stored in the `capsules` table.

## 8. Database (`supabase/schema.sql`)
Every table (`conversations`, `personas`, `recovery_conversations`, `capsules`, `skills`, `knowledge_items`, `productivity_stats`, `memory_facts`) has row-level security requiring a shared access key sent via request header, validated by a `SECURITY DEFINER` Postgres function (`personamd_access_ok()`) — a "raise the bar against casual scraping" measure, not real per-user auth, since the app has no login system.

## 9. Browser extension (`extension/`)
Manifest V3 extension that captures conversations from provider tabs and pushes them to Noetis:
- **`background.js`** — service worker: stores captures locally, auto-pushes to `POST /api/conversations`, handles session-token auth, batch capture (walks a provider's sidebar list, capped at 20), and the "handoff"/library-doc fetches used by the in-page widget.
- **`content-scripts/capture-widget.js`** — a floating button + dropdown menu injected into every provider page (rendered in Shadow DOM to avoid CSS collisions and survive Trusted-Types CSP). Lets a user save/share the current conversation or insert Project.md/Skills.md/Library.md into the composer.
- **Per-provider extraction quality tiers**: `chatgpt.js`/`claude.js` (precise DOM selectors, sidebar conversation listing, rate-limit banner detection) > `gemini.js`/`perplexity.js` (best-guess selectors with generic fallback) > `grok.js`/`deepseek.js` (generic-extraction only).
- **`popup.html`/`popup.js`** — settings (auto-push, base URL, access key), manual/batch capture triggers, captured-conversation list management.

## 10. Proxima (`Proxima/`) — AI provider gateway

A vendored Electron app that gives ChatGPT/Claude/Gemini/Perplexity access **without API keys**, by driving the user's real logged-in browser sessions:

- Each provider runs in its own Electron `BrowserView` with a persistent session partition (real cookies/login).
- A small "engine" script is injected into each page's own JS context (`webContents.executeJavaScript`) and calls the provider's private internal REST API directly (`fetch(..., {credentials:'include'})`) — e.g. Claude's `/api/organizations/{org}/chat_conversations`, ChatGPT's `/backend-api/conversation` (including a full pure-JS SHA3-512 proof-of-work solver for OpenAI's anti-bot challenge).
- Exposed as: an MCP server (`src/mcp-server-v3.js`, ~50 tools) for editors/Claude Desktop, an OpenAI-compatible REST API (`electron/rest-api.cjs`, port 3210), a WebSocket server, and a `proxima` CLI.
- Electron main process (`electron/main-v2.cjs`) runs a TCP JSON-line IPC server ("Agent Hub", port 19222) that both the MCP server and CLI talk to.

## 11. Proxima → Noetis conversation sync (new)

To turn manual, one-at-a-time extension capture into automated full-history ingestion, Proxima's engines and MCP server were extended:

- **`electron/providers/claude-engine.js`** / **`chatgpt-engine.js`** gained `listConversations()` and `getConversationMessages(id)`, reusing each engine's existing auth, to read a user's entire conversation history (not just the open chat). Gemini/Perplexity are not yet supported — their engines use more fragile reverse-engineered protocols with no discovered history-listing endpoint.
- **`electron/provider-api.cjs`** — `listConversationsViaAPI`/`getConversationViaAPI` wrappers plus a `supportsHistorySync()` capability check.
- **`electron/noetis-sync.cjs`** (new) — POSTs a conversation to Noetis's existing `/api/conversations` route (reusing its auth, dedupe, and insight-extraction pipeline instead of duplicating it), configured via Proxima settings or `NOETIS_BASE_URL`/`NOETIS_ACCESS_KEY` env vars.
- **`electron/main-v2.cjs`** — a `syncProviderConversations(provider)` orchestrator: lists a provider's conversations, fetches each one's full messages, maps into Noetis's `Conversation` shape (id namespaced as `provider:nativeId` to avoid collisions), and pushes each via `noetis-sync.cjs`.
- **`src/mcp-server-v3.js`** — new `sync_conversations({provider?, limit?})` and `list_synced_status({provider?})` MCP tools, callable on demand from any MCP client.

Idempotency is delegated entirely to Noetis's existing id-based `upsertConversation` — re-running a sync is safe and won't duplicate rows.

## 12. Multi-User Production Readiness Upgrades (Completed)

- **Strict Multi-Tenancy:** Added `user_id` columns referencing `auth.users` to all transactional tables (`conversations`, `personas`, `recovery_conversations`, `capsules`, `skills`, `knowledge_items`, `productivity_stats`, `memory_facts`).
- **Dynamic Owner Mapping:** Set `default auth.uid()` on all `user_id` columns, enabling PostgREST to automatically map and enforce record ownership on inserts/updates.
- **Per-User RLS Policies:** Replaced the shared-secret `personamd_access_ok()` policies with strict `USING (auth.uid() = user_id)` RLS checks.
- **Request-Scoped Supabase Client:** Refactored `src/lib/supabase/client.ts` to dynamically instantiate a request-scoped client using Next.js `headers()`, propagating the user's JWT from `Authorization` or custom session headers down to PostgREST.
- **Resolved Secret Key Mismatch:** Updated auth middleware to fallback to `NEXT_PUBLIC_APP_ACCESS_KEY` when `APP_SECRET_KEY` is not set on the server, preventing open auth bypasses in production.
- **Refactored Memory Facts Store:** Extracted inline queries from `src/app/api/memory/extract/route.ts` into a structured [memory-facts-store.ts](file:///c:/Users/mohan/Claude/Projects/tharun/PersonaMD/src/lib/knowledge/memory-facts-store.ts) aligning it with the generic collection factory pattern.
- **Rate Limiting:** Integrated IP/User rate limits on OpenRouter endpoints to protect against query floods.
- **Single Conversation Export:** Implemented single-conversation Markdown export capability via a GET endpoint at `/api/conversations/[id]/export` that inserts the resulting capsule and triggers file download.
