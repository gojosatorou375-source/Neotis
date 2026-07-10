# Skill: Frontend Development (Next.js & React)

> This file represents project-level coding preferences for modern React, Next.js, and web styling. Apply these rules to all frontend work.

## Technology Stack
- **Framework:** Next.js (App Router, React 18+)
- **Language:** TypeScript (strict mode enabled)
- **Styling:** Tailwind CSS, CSS Variables
- **State Management:** React Context, Zustand
- **Data Fetching:** React Query (TanStack Query) / Server Actions

## Coding Standards & Conventions
- **Component Definition:** Use functional components with explicit `React.FC` or parameter typings.
- **RSC vs Client Components:** By default, all components must be React Server Components (RSCs). Only use `'use client'` when state (`useState`, `useEffect`), browser APIs, or interactivity are strictly required.
- **TypeScript Strictness:** Never use `any`. Always define explicit prop interfaces and type definitions for API responses.
- **File Structure:**
  - Page routes go in `src/app/`
  - Reusable presentation components go in `src/components/ui/`
  - Page-specific helper components go in `src/components/<feature>/`
  - Hooks and utility functions go in `src/lib/` or `src/hooks/`

## Styling & Layout
- **Responsiveness:** Build mobile-first responsive layouts using Tailwind's breakpoint prefixes (`sm:`, `md:`, `lg:`).
- **Theme Variables:** Restrict colors to project CSS custom variables (e.g. `bg-[var(--bg)]` or `text-[var(--text-primary)]`) for smooth theme transitions.
- **Neo-Brutalism Details:** Use high-contrast solid borders (`border-2 border-black`), flat offsets on interactions, and bold typography where requested.

## Testing & Performance
- **Image Optimization:** Always use Next.js `<Image />` component instead of native `<img>` tags.
- **Bundle Size:** Lazy load heavy components or third-party libraries using `next/dynamic` to keep initial bundle sizes low.

---

*This Skill is portable and can be pasted into the custom instructions, system prompt, or project knowledge of ChatGPT, Claude, Gemini, Grok, DeepSeek, Llama, Mistral, or any other AI assistant.*
