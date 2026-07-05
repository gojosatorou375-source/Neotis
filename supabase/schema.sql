-- PersonaMD — Supabase schema
--
-- Run this once in your project's SQL Editor (Supabase dashboard -> SQL
-- Editor -> New query -> paste -> Run). Safe to re-run: every statement is
-- guarded with IF NOT EXISTS / OR REPLACE.
--
-- SECURITY NOTE: PersonaMD is a single-user, local-first tool with no login
-- system. The anon key used by the app is a NEXT_PUBLIC_ variable, which
-- means it's visible to anyone who opens dev tools on the site — that's
-- normal for Supabase, but it means a plain "allow everyone" RLS policy
-- would let anyone who finds that key read/write every table.
--
-- To raise the bar against casual/automated scraping (NOT a substitute for
-- real per-user auth — see the README for that tradeoff), every policy below
-- requires a shared "access key" header that only this app's own client and
-- browser extension send. Two steps before this works:
--
--   1. Pick a long random string and put it in .env.local as
--      NEXT_PUBLIC_APP_ACCESS_KEY=<your-key> (see .env.local.example).
--   2. Run the ALTER DATABASE statement near the bottom of this file with
--      that same value substituted in, so Postgres knows what to check
--      requests against. Re-run it if you ever rotate the key.

-- ---------------------------------------------------------------------
-- Shared access-key check, used by every table's policy below.
-- ---------------------------------------------------------------------
create or replace function personamd_access_ok() returns boolean
language sql stable
as $$
  select
    current_setting('app.settings.personamd_access_key', true) is not null
    and current_setting('app.settings.personamd_access_key', true) <> ''
    and coalesce(
      (current_setting('request.headers', true)::json ->> 'x-personamd-access'),
      ''
    ) = current_setting('app.settings.personamd_access_key', true);
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
-- Recovery / Dashboard conversations (the enriched pipeline output —
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
-- REQUIRED: tell Postgres what the access key actually is. Replace the
-- placeholder below with the exact value you put in NEXT_PUBLIC_APP_ACCESS_KEY
-- and run this statement by itself (it's outside the "safe to re-run
-- blindly" table setup above, since it contains your secret value).
-- ---------------------------------------------------------------------
-- alter database postgres set app.settings.personamd_access_key = 'REPLACE_WITH_YOUR_NEXT_PUBLIC_APP_ACCESS_KEY';
