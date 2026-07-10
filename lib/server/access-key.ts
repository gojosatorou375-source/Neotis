import { NextRequest, NextResponse } from "next/server";

/**
 * Shared secret check for the custom API routes under /api/conversations,
 * which the browser extension hits directly (not through the Supabase
 * client, so the RLS-level check in supabase/schema.sql doesn't cover them).
 *
 * Same tradeoff as the Supabase RLS check: this raises the bar against
 * casual/automated hits on a publicly deployed instance, it is not
 * equivalent to real per-user authentication.
 */
export function checkAccessKey(req: NextRequest): NextResponse | null {
  const expected = process.env.NEXT_PUBLIC_APP_ACCESS_KEY;
  // If no key is configured (e.g. local dev before setup), don't lock the
  // developer out — just skip the check, same posture as before this was added.
  if (!expected) return null;

  const provided = req.headers.get("x-personamd-access");
  if (provided === expected) return null;

  return NextResponse.json({ error: "Missing or invalid access key." }, { status: 401 });
}
