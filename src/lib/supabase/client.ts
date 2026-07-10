import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let browserCached: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Supabase isn't configured yet. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local, then restart the dev server."
    );
  }

  // Client-side (browser): Safe to use a cached singleton.
  if (typeof window !== "undefined") {
    if (browserCached) return browserCached;
    browserCached = createClient(url, anonKey);
    return browserCached;
  }

  // Server-side (API Routes / Server Components):
  // Generate a request-scoped client using dynamic require to bypass Webpack bundling on the client.
  let authHeader = "";
  try {
    const nextHeaders = eval('require')("next/headers");
    const reqHeaders = nextHeaders.headers();
    authHeader =
      reqHeaders.get("authorization") ||
      reqHeaders.get("x-personamd-session") ||
      reqHeaders.get("X-PersonaMD-Session") ||
      "";
  } catch {
    // Safe fallback if called outside request context or during build
  }

  const options: any = {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  };

  if (authHeader) {
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (token) {
      options.global = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };
    }
  }

  return createClient(url, anonKey, options);
}
