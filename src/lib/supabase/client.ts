import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// A single client shared by both server code (API routes) and client
// components (the various "use *Store" hooks). PersonaMD is single-user and
// local-first, so one client is used everywhere rather than maintaining
// separate server/browser clients with different privilege levels.
//
// SECURITY NOTE: the anon key below is a NEXT_PUBLIC_ variable, which means
// it ships inside the JavaScript bundle and is visible to anyone who opens
// dev tools — that's normal for Supabase's anon key, but combined with a
// permissive RLS policy it would let anyone who finds this key read/write
// every table. To raise the bar against casual/automated scraping (not
// against a determined attacker inspecting the bundle — that's a much bigger
// project involving real user auth), every request from this client also
// carries a shared access-key header, and supabase/schema.sql's RLS
// policies reject any request that doesn't present it. See
// NEXT_PUBLIC_APP_ACCESS_KEY in .env.local.example for setup.
let cached: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const accessKey = process.env.NEXT_PUBLIC_APP_ACCESS_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Supabase isn't configured yet. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local (see .env.local.example), then restart the dev server."
    );
  }

  cached = createClient(url, anonKey, {
    global: {
      headers: accessKey ? { "x-personamd-access": accessKey } : {},
    },
  });
  return cached;
}
