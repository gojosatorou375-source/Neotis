-- Noetis (formerly PersonaMD) -- Multi-User Production Supabase Schema
--
-- Run this once in your project's SQL Editor (Supabase dashboard -> SQL
-- Editor -> New query -> paste -> Run).
--
-- SECURITY NOTE: This schema implements strict per-user multi-tenancy.
-- All data tables contain a user_id column referencing auth.users, and
-- Row Level Security (RLS) policies restrict users to only access their own data.

-- ---------------------------------------------------------------------
-- Captured conversations (from the browser extension)
-- ---------------------------------------------------------------------
create table if not exists conversations (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  provider text not null,
  title text not null,
  url text,
  captured_at timestamptz not null,
  imported_at timestamptz not null,
  messages jsonb not null default '[]',
  insights jsonb,
  limit_reached boolean not null default false
);

create index if not exists conversations_user_id_idx on conversations (user_id);

alter table conversations enable row level security;
drop policy if exists "requires access key" on conversations;
drop policy if exists "allow users access to own conversations" on conversations;
create policy "allow users access to own conversations" on conversations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- Personas (saved AI_PROFILE.md profiles)
-- ---------------------------------------------------------------------
create table if not exists personas (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  answers jsonb not null default '{}',
  markdown text not null,
  tags jsonb not null default '[]',
  history jsonb not null default '[]'
);

create index if not exists personas_user_id_idx on personas (user_id);

alter table personas enable row level security;
drop policy if exists "requires access key" on personas;
drop policy if exists "allow users access to own personas" on personas;
create policy "allow users access to own personas" on personas
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- Recovery / Dashboard conversations (enriched metadata pipeline output)
-- ---------------------------------------------------------------------
create table if not exists recovery_conversations (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
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

create index if not exists recovery_conversations_user_id_idx on recovery_conversations (user_id);

alter table recovery_conversations enable row level security;
drop policy if exists "requires access key" on recovery_conversations;
drop policy if exists "allow users access to own recovery conversations" on recovery_conversations;
create policy "allow users access to own recovery conversations" on recovery_conversations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- Capsules (portable context distilled from one or more conversations)
-- ---------------------------------------------------------------------
create table if not exists capsules (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null,
  source_conversation_ids jsonb not null default '[]',
  summary text not null default '',
  decisions jsonb not null default '[]',
  key_code jsonb not null default '[]',
  architecture_notes jsonb not null default '[]',
  key_messages jsonb not null default '[]',
  refs jsonb not null default '[]'
);

create index if not exists capsules_user_id_idx on capsules (user_id);

alter table capsules enable row level security;
drop policy if exists "requires access key" on capsules;
drop policy if exists "allow users access to own capsules" on capsules;
create policy "allow users access to own capsules" on capsules
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- Skills (Skill.md -- project-level knowledge from the Adaptive Project
-- Interview, optionally merged with a Persona's communication profile)
-- ---------------------------------------------------------------------
create table if not exists skills (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
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

create index if not exists skills_user_id_idx on skills (user_id);

alter table skills enable row level security;
drop policy if exists "requires access key" on skills;
drop policy if exists "allow users access to own skills" on skills;
create policy "allow users access to own skills" on skills
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- Knowledge items (Structured facts pulled out of conversations)
-- ---------------------------------------------------------------------
create table if not exists knowledge_items (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
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

create index if not exists knowledge_items_user_id_idx on knowledge_items (user_id);
create index if not exists knowledge_items_conversation_id_idx on knowledge_items (conversation_id);

alter table knowledge_items enable row level security;
drop policy if exists "requires access key" on knowledge_items;
drop policy if exists "allow users access to own knowledge items" on knowledge_items;
create policy "allow users access to own knowledge items" on knowledge_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- Productivity stats (per-user analytics rows)
-- ---------------------------------------------------------------------
create table if not exists productivity_stats (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  recovered_conversations int not null default 0,
  duplicate_work_prevented int not null default 0,
  projects_resumed int not null default 0,
  hours_saved numeric not null default 0,
  repeated_prompts_avoided int not null default 0
);

alter table productivity_stats enable row level security;
drop policy if exists "requires access key" on productivity_stats;
drop policy if exists "allow users access to own productivity stats" on productivity_stats;
create policy "allow users access to own productivity stats" on productivity_stats
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- Memory facts (FEATURE 1 Extended - Stage 0 Dynamic Memory Engine)
-- ---------------------------------------------------------------------
create table if not exists memory_facts (
  id uuid primary key default gen_random_uuid(),
  conversation_id text not null references conversations(id) on delete cascade,
  project_id text references skills(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  section text not null,
  fact_type text not null,
  polarity text not null default 'adopted',
  content text not null,
  confidence numeric not null,
  reference_count int not null default 1,
  superseded_by uuid references memory_facts(id) on delete set null,
  embedding jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_confirmed_at timestamptz not null default now()
);

create index if not exists memory_facts_project_id_section_idx on memory_facts (project_id, section) where superseded_by is null;
create index if not exists memory_facts_user_id_section_idx on memory_facts (user_id, section) where superseded_by is null;

alter table memory_facts enable row level security;
drop policy if exists "requires access key" on memory_facts;
drop policy if exists "allow users access to own memory facts" on memory_facts;
create policy "allow users access to own memory facts" on memory_facts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
