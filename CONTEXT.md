# Noetis — Project Structure & Deployment Reference

> **Noetis** is a secure, local-first conversation capture layer and AI context synchronization manager. It allows developers to capture chat histories from web interfaces (ChatGPT, Claude, Perplexity, etc.) and distill them into unified, portable Markdown profiles.

---

## 1. Tech Stack
- **Framework:** Next.js 14+ (App Router, React 18, TypeScript)
- **Styling:** Tailwind CSS + CSS Variables (Neo-brutalist flat high-contrast theme)
- **Database:** Supabase (PostgreSQL, RLS enabled)
- **LLM:** OpenRouter API (model: `anthropic/claude-haiku-4.5` preset)
- **Deployment:** Vercel (auto-detected Next.js) or Netlify (via `netlify.toml`)
- **Extension:** Chrome MV3 (built separately, loaded in Chrome manually)

---

## 2. Folder Structure

```text
noetis/
├── src/                          # Next.js Application Root
│   ├── app/                      # App Router Routes (Vercel entry points)
│   │   ├── layout.tsx            # Root layout — fonts, providers, global CSS
│   │   ├── page.tsx              # Landing / auth redirect
│   │   ├── recovery/page.tsx     # Recovery Dashboard
│   │   ├── personas/page.tsx     # Persona Profiles list
│   │   ├── skills/page.tsx       # Saved Skills list
│   │   └── api/                  # Serverless Route Handlers
│   │       ├── conversations/    # Capturing and exporting conversations
│   │       ├── library/enhance/  # Guided interview AI enhancements
│   │       └── skills/combine/   # Merging Persona + Skills profiles
│   │
│   ├── components/               # React UI Components
│   │   ├── ui/                   # Reusable primitives (Button, Input, Modal, Badge)
│   │   ├── graph/                # InteractiveGraph.tsx (force-directed canvas)
│   │   ├── persona/              # PersonaViewDialog.tsx, SavePersonaDialog.tsx
│   │   ├── skill/                # SkillViewDialog.tsx, SkillSetupScreen.tsx
│   │   └── recovery/             # WorkspaceTree.tsx, RightSidebar.tsx, SkillsView.tsx
│   │
│   ├── lib/                      # Business logic, helpers, and state managers
│   │   ├── supabase/             # Client-side and server-side Supabase instantiations
│   │   ├── server/               # Auth checks, rate-limiters, CORS filters
│   │   ├── knowledge/            # Memory fact storage algorithms
│   │   ├── conversations/        # useConversations React state hook
│   │   ├── personas/             # usePersonas React state hook
│   │   └── skills/               # useSkills React state hook
│   │
│   └── types/                    # TypeScript interfaces & definitions
│
├── extension/                    # Chrome MV3 Extension (packaged as public/extension.zip)
│   ├── manifest.json
│   ├── background.js             # Service worker handling captured payloads
│   └── content-scripts/          # Custom DOM observers (claude.js, perplexity.js, capture-widget.js)
│
├── examples/                     # Domain-specific Markdown profile templates
├── public/                       # Static assets and downloadable extension.zip
├── supabase/                     # Database schemas and setup migration scripts
├── netlify.toml                  # Netlify deployment configurations
└── package.json
```

---

## 3. Environment Variables (set in hosting dashboard)

```bash
# Exposed to the browser (exclusively these two)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Server-only secrets
SUPABASE_SERVICE_ROLE_KEY=
OPENROUTER_API_KEY=
JWT_SECRET_KEY=
APP_SECRET_KEY=
NEXT_PUBLIC_APP_ACCESS_KEY=
```

---

## 4. Key Architecture Rules
1. `NEXT_PUBLIC_` variables are exposed to the browser. Only Supabase URL and anon keys get this prefix.
2. The OpenRouter API key is **NEVER** sent to the client. All AI generation goes through server Route Handlers.
3. The Chrome extension posts to `/api/conversations` with an auth header (`X-PersonaMD-Access` or `Authorization`) validated against the Supabase server client.
4. The `extension/` folder is excluded from Vercel deployment — it is built separately and served compiled as `public/extension.zip`.
5. RLS is enabled on all PostgreSQL tables — always pass the user's session when querying data.

---

## 5. Deployment Configurations

- **Vercel Build Command:** `next build` (auto-detected)
- **Netlify Build Command:** Managed via `netlify.toml` automatically registering `@netlify/plugin-nextjs`.
- **Output Directory:** `.next`
- **Root Directory:** `/` (the root containing `package.json`).
