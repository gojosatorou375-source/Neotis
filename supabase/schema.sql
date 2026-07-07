-- PersonaMD -- Supabase schema
--
-- Run this once in your project's SQL Editor (Supabase dashboard -> SQL
-- Editor -> New query -> paste -> Run). Safe to re-run: every statement is
-- guarded with IF NOT EXISTS / OR REPLACE.
--
-- SECURITY NOTE: PersonaMD is a single-user, local-first tool with no login
-- system. The anon key used by the app is a NEXT_PUBLIC_ variable, which
-- means it's visible to anyone who opens dev tools on the site -- that's
-- normal for Supabase, but it means a plain "allow everyone" RLS policy
-- would let anyone who finds that key read/write every table.
--
-- To raise the bar against casual/automated scraping (NOT a substitute for
-- real per-user auth -- see the README for that tradeoff), every policy below
-- requires a shared "access key" header that only this app's own client and
-- browser extension send. Two steps before this works:
--
--   1. Pick a long random string and put it in .env.local (and your Vercel
--      env vars) as NEXT_PUBLIC_APP_ACCESS_KEY=<your-key>.
--   2. Run the UPDATE statement near the bottom of this file with that same
--      value substituted in, so the database knows what to check requests
--      against. Re-run it if you ever rotate the key.
--
-- NOTE: earlier versions of this file used `alter database ... set
-- app.settings.personamd_access_key = ...` to store the key as a custom
-- Postgres GUC. Supabase's hosted SQL Editor doesn't run with enough
-- privilege to execute ALTER DATABASE ... SET (you'll see "permission
-- denied to set parameter"), so the key is stored in a regular table
-- instead (app_config below) -- any normal SQL Editor session can UPDATE a
-- table it owns, no special privileges required.

-- ---------------------------------------------------------------------
-- Holds the access key itself. RLS denies ALL direct access (even with the
-- anon key) -- the only way to read this table is through
-- personamd_access_ok() below, which is declared SECURITY DEFINER so it
-- runs with the privileges of the function's owner and can see this table
-- regardless of the calling role's own policies.
-- ---------------------------------------------------------------------
create table if not exists app_config (
  id smallint primary key default 1,
  access_key text not null default '',
  constraint singleton check (id = 1)
);

alter table app_config enable row level security;
drop policy if exists "no direct access" on app_config;
create policy "no direct access" on app_config for all using (false) with check (false);

insert into app_config (id) values (1) on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- Shared access-key check, used by every table's policy below.
-- ---------------------------------------------------------------------
create or replace function personamd_access_ok() returns boolean
language sql stable
security definer
set search_path = public
as $$
  select
    exists (select 1 from app_config where id = 1 and access_key <> '')
    and coalesce(
      (current_setting('request.headers', true)::json ->> 'x-personamd-access'),
      ''
    ) = (select access_key from app_config where id = 1);
$$;

-- ---------------------------------------------------------------------
-- Captured conversations (from the browser extension)
-- ---------------------------------------------------------------------
create table if not exists conversations (
  id text primary key,
  provider text not null,
  title text not null,
  url text,
  captured_at timestamptz not null,
  imported_at timestamptz not null,
  messages jsonb not null default '[]',
  insights jsonb,
  limit_reached boolean not null default false
);

alter table conversations enable row level security;
drop policy if exists "allow all" on conversations;
drop policy if exists "requires access key" on conversations;
create policy "requires access key" on conversations for all using (personamd_access_ok()) with check (personamd_access_ok());

-- ---------------------------------------------------------------------
-- Personas (saved AI_PROFILE.md profiles)
-- ---------------------------------------------------------------------
create table if not exists personas (
  id text primary key,
  name text not null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  answers jsonb not null default '{}',
  markdown text not null,
  tags jsonb not null default '[]',
  history jsonb not null default '[]'
);

alter table personas enable row level security;
drop policy if exists "allow all" on personas;
drop policy if exists "requires access key" on personas;
create policy "requires access key" on personas for all using (personamd_access_ok()) with check (personamd_access_ok());

-- ---------------------------------------------------------------------
-- Recovery / Dashboard conversations (the enriched pipeline output --
-- summary, keywords, embeddings, decisions, etc.)
-- ---------------------------------------------------------------------
create table if not exists recovery_conversations (
  id text primary key,
  platform text not null,
  title text not null,
  created_at timestamptz not null,
  last_updated timestamptz not null,
  project text not null default '',
  status text not null default 'Completed',
  summary text not null default '',
  keywords jsonb not null default '[]',
  topics jsonb not null default '[]',
  embedding jsonb not null default '[]',
  files jsonb not null default '[]',
  prompts jsonb not null default '[]',
  outputs jsonb not null default '[]',
  follow_up_tasks jsonb not null default '[]',
  decisions jsonb not null default '[]',
  tags jsonb not null default '[]',
  similarity_links jsonb not null default '[]',
  conversation_history jsonb not null default '[]',
  archived boolean not null default false
);

alter table recovery_conversations enable row level security;
drop policy if exists "allow all" on recovery_conversations;
drop policy if exists "requires access key" on recovery_conversations;
create policy "requires access key" on recovery_conversations for all using (personamd_access_ok()) with check (personamd_access_ok());

-- ---------------------------------------------------------------------
-- Capsules (portable context distilled from one or more conversations)
-- ---------------------------------------------------------------------
create table if not exists capsules (
  id text primary key,
  name text not null,
  created_at timestamptz not null,
  source_conversation_ids jsonb not null default '[]',
  summary text not null default '',
  decisions jsonb not null default '[]',
  key_code jsonb not null default '[]',
  architecture_notes jsonb not null default '[]',
  key_messages jsonb not null default '[]',
  refs jsonb not null default '[]' -- maps to Capsule.references ("references" is a reserved word)
);

alter table capsules enable row level security;
drop policy if exists "allow all" on capsules;
drop policy if exists "requires access key" on capsules;
create policy "requires access key" on capsules for all using (personamd_access_ok()) with check (personamd_access_ok());

-- ---------------------------------------------------------------------
-- Skills (Skill.md -- project-level knowledge from the Adaptive Project
-- Interview, optionally merged with a Persona's communication profile)
-- ---------------------------------------------------------------------
create table if not exists skills (
  id text primary key,
  name text not null,
  project_name text not null default '',
  persona_id text,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  answers jsonb not null default '{}',
  markdown text not null,
  tags jsonb not null default '[]',
  favorite boolean not null default false,
  pinned boolean not null default false,
  archived boolean not null default false,
  history jsonb not null default '[]'
);

alter table skills enable row level security;
drop policy if exists "allow all" on skills;
drop policy if exists "requires access key" on skills;
create policy "requires access key" on skills for all using (personamd_access_ok()) with check (personamd_access_ok());

-- ---------------------------------------------------------------------
-- Knowledge items (FEATURE 1 -- AI Knowledge Extractor). Structured facts
-- pulled out of conversations -- never the raw conversation text itself.
-- ---------------------------------------------------------------------
create table if not exists knowledge_items (
  id text primary key,
  conversation_id text not null,
  conversation_title text not null default '',
  category text not null,
  title text not null,
  description text not null default '',
  confidence numeric not null default 0,
  source_excerpt text not null default '',
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create index if not exists knowledge_items_conversation_id_idx on knowledge_items (conversation_id);

alter table knowledge_items enable row level security;
drop policy if exists "allow all" on knowledge_items;
drop policy if exists "requires access key" on knowledge_items;
create policy "requires access key" on knowledge_items for all using (personamd_access_ok()) with check (personamd_access_ok());

-- ---------------------------------------------------------------------
-- Productivity stats (singleton row, id is always 1)
-- ---------------------------------------------------------------------
create table if not exists productivity_stats (
  id smallint primary key default 1,
  recovered_conversations int not null default 0,
  duplicate_work_prevented int not null default 0,
  projects_resumed int not null default 0,
  hours_saved numeric not null default 0,
  repeated_prompts_avoided int not null default 0,
  constraint singleton check (id = 1)
);

alter table productivity_stats enable row level security;
drop policy if exists "allow all" on productivity_stats;
drop policy if exists "requires access key" on productivity_stats;
create policy "requires access key" on productivity_stats for all using (personamd_access_ok()) with check (personamd_access_ok());

insert into productivity_stats (id)
values (1)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- REQUIRED: tell the database what the access key actually is. Replace the
-- placeholder below with the exact value you put in NEXT_PUBLIC_APP_ACCESS_KEY
-- and run this statement by itself (it's outside the "safe to re-run
-- blindly" table setup above, since it contains your secret value). This is
-- a plain UPDATE -- no elevated privileges needed, unlike the old ALTER
-- DATABASE approach.
-- ---------------------------------------------------------------------
-- update app_config set access_key = 'REPLACE_WITH_YOUR_NEXT_PUBLIC_APP_ACCESS_KEY' where id = 1;

-- Verify it took effect:
-- select access_key from app_config where id = 1;

-- ---------------------------------------------------------------------
-- Memory facts (FEATURE 1 Extended - Stage 0 Dynamic Memory Engine)
-- ---------------------------------------------------------------------
create table if not exists memory_facts (
  id uuid primary key default gen_random_uuid(),
  conversation_id text not null references conversations(id) on delete cascade,
  project_id text references skills(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  section text not null,
  fact_type text not null,
  polarity text not null default 'adopted',
  content text not null,
  confidence numeric not null,
  reference_count int not null default 1,
  superseded_by uuid references memory_facts(id) on delete set null,
  embedding jsonb not null default '[]', -- JSONB instead of pgvector vector(1536) for Stage 0 compatibility
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_confirmed_at timestamptz not null default now()
);

create index if not exists memory_facts_project_id_section_idx on memory_facts (project_id, section) where superseded_by is null;
create index if not exists memory_facts_user_id_section_idx on memory_facts (user_id, section) where superseded_by is null;

alter table memory_facts enable row level security;
drop policy if exists "requires access key" on memory_facts;
create policy "requires access key" on memory_facts for all using (personamd_access_ok()) with check (personamd_access_ok());

