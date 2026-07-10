# Noetis — Overall Project Context & Reference

> **Noetis** is a secure, local-first conversation capture layer and AI context synchronization manager. It allows developers to capture chat histories from web interfaces (ChatGPT, Claude, Perplexity, etc.) and distill them into unified, portable Markdown profiles.

---

## 1. Project Architecture

The system is split into three main components:
```
       ┌────────────────────────┐
       │   Browser Extension    │ (Manifest V3)
       │  (ChatGPT/Claude/etc)  │
       └───────────┬────────────┘
                   │ Pushes Captured JSON
                   ▼ (Authed HTTP Post)
       ┌────────────────────────┐
       │   Next.js Application  │ (Dashboard, API Endpoints,
       │    & Local Server      │  Interview Flow, Graph Visualizer)
       └───────────┬────────────┘
                   │
                   ▼ Queries & Mutates
       ┌────────────────────────┐
       │   Supabase Postgres    │ (Multi-user RLS Table Partitioning,
       │      Database          │  Persona & Skill histories)
       └────────────────────────┘
```

### 1.1 Technology Stack
- **Frontend Core:** Next.js (App Router, React 18)
- **Styling:** Tailwind CSS + Vanilla CSS Variables (Flat Neo-brutalist high-contrast theme)
- **Database:** Supabase (PostgreSQL with Row Level Security enabled for multi-user isolation)
- **LLM Integrations:** OpenRouter API (`anthropic/claude-haiku-4.5` preset)
- **Client State:** Custom React Hooks (`usePersonas`, `useSkills`, `useConversations`)

---

## 2. Database Schema (Supabase)

All tables use **Row Level Security (RLS)** to enforce multi-user isolation. The key tables include:
- `conversations`: Stores raw conversation histories, message nodes, and origin provider metadata.
- `personas`: Stores personal AI communication profiles (`AI_PROFILE.md`) and version histories.
- `skills`: Stores project-level skills and instructions compiled from project-guided interviews.
- `knowledge_items`: Houses extracted facts and key-value memory blocks distilled from past conversations.

---

## 3. Browser Extension

The Chrome extension (`extension/` folder) injects a lightweight capture widget into AI provider sites:
- **Supported Providers:** ChatGPT, Claude AI, Perplexity, Gemini, Grok, DeepSeek.
- **Scraping Engine:** Incorporates robust selector strategies inside `claude.js` and `perplexity.js` to extract both **user prompts** and **assistant/LLM responses**. Falls back to a `genericExtract` parser if the DOM structure changes.
- **Manual Capture:** Allows users to save conversations directly to the database or copy/download them as formatted `.md` briefs.

---

## 4. Core Features

### 4.1 Guided Interviews
Guided questionnaires that walk the user through:
- **Personal Profile:** Communication preferences, knowledge levels, and learning styles.
- **Project Skills:** Technology stack, constraints, coding standards, and deployment pipelines.
The system automatically compiles these answers into markdown templates and uses OpenRouter AI (when configured) to enhance the outputs.

### 4.2 In-App Markdown Editor
All generated Personas and Skills dialog views include a toggleable Neo-brutalist Markdown Editor. Users can modify their profiles directly in the dashboard and save updates directly to Supabase.

### 4.3 Interactive Knowledge Graph
A force-directed physics visualizer (styled in a flat, outlined Neo-brutalist theme) that connects projects, technologies, and concepts based on semantic keywords extracted from conversation histories.

---

## 5. Deployment Configurations

The project is fully pre-configured for modern hosting platforms:
- **Vercel:** Auto-detected Next.js deployment.
- **Netlify:** Managed via [netlify.toml](file:///c:/Users/mohan/Claude/Projects/tharun/PersonaMD/netlify.toml) configured to run `npm run build` targeting `.next/` and executing the `@netlify/plugin-nextjs` runtime.
