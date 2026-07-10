import { SignJWT, jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Allowed CORS origins from manifest.json
const ALLOWED_ORIGINS = new Set([
  "https://chatgpt.com",
  "https://chat.openai.com",
  "https://claude.ai",
  "https://gemini.google.com",
  "https://www.perplexity.ai",
  "https://grok.com",
  "https://chat.deepseek.com",
  "https://noetis.vercel.app",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]);

function getJwtSecret() {
  const secret = process.env.JWT_SECRET_KEY;
  if (!secret) {
    throw new Error("JWT_SECRET_KEY environment variable is not set");
  }
  return new TextEncoder().encode(secret);
}

function getAppSecretKey() {
  const key = process.env.APP_SECRET_KEY || process.env.NEXT_PUBLIC_APP_ACCESS_KEY;
  if (!key) {
    throw new Error("Neither APP_SECRET_KEY nor NEXT_PUBLIC_APP_ACCESS_KEY environment variable is set");
  }
  return key;
}

export async function generateSessionToken(): Promise<string> {
  const secret = getJwtSecret();
  const expirationTime = Date.now() + 1000 * 60 * 60 * 24 * 7; // 7 days
  return new SignJWT({ exp: Math.floor(expirationTime / 1000) })
    .setProtectedHeader({ alg: "HS256" })
    .sign(secret);
}

export async function validateSessionToken(token: string): Promise<boolean> {
  try {
    const secret = getJwtSecret();
    await jwtVerify(token, secret);
    return true;
  } catch {
    return false;
  }
}

export function validateAccessKey(key: string): boolean {
  const expectedKey = process.env.APP_SECRET_KEY || process.env.NEXT_PUBLIC_APP_ACCESS_KEY;
  if (!expectedKey) {
    if (process.env.NODE_ENV === "production") {
      return false; // Don't allow empty secret in production
    }
    return true; // Allow unconfigured dev environments
  }
  return key === expectedKey;
}

export function checkCorsOrigin(req: NextRequest): { allowed: boolean; origin?: string } {
  const origin = req.headers.get("origin");
  if (!origin) {
    // Same-origin request
    return { allowed: true };
  }
  if (ALLOWED_ORIGINS.has(origin) || origin.startsWith("chrome-extension://")) {
    return { allowed: true, origin };
  }
  return { allowed: false, origin };
}

export function applyCorsHeaders(response: NextResponse, origin?: string): NextResponse {
  if (origin) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-PersonaMD-Access, X-PersonaMD-Session");
  }
  return response;
}

export async function checkAuth(req: NextRequest): Promise<NextResponse | null> {
  const appSecretKey = process.env.APP_SECRET_KEY || process.env.NEXT_PUBLIC_APP_ACCESS_KEY;

  // 1. Fall back to access key for backward compatibility or extension/dev setups
  const accessKey = req.headers.get("X-PersonaMD-Access");
  if (accessKey && validateAccessKey(accessKey)) {
    return null;
  }

  // 2. Validate Supabase session token or custom app session token
  const authHeader =
    req.headers.get("Authorization") ||
    req.headers.get("X-PersonaMD-Session") ||
    req.headers.get("x-personamd-session") ||
    "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();

  if (!token) {
    if (!appSecretKey) {
      if (process.env.NODE_ENV === "production") {
        return NextResponse.json({ error: "Authentication configuration missing in production" }, { status: 500 });
      }
      return null; // Allow unconfigured dev environments
    }
    return NextResponse.json({ error: "Missing authentication token" }, { status: 401 });
  }

  // Verify against Supabase Auth
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) {
      return NextResponse.json({ error: "Supabase configuration missing" }, { status: 500 });
    }

    const supabase = createClient(url, anonKey);
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      // Check if it's a valid local session token (e.g. from extension exchange)
      if (await validateSessionToken(token)) {
        return null;
      }
      return NextResponse.json({ error: "Invalid or expired session token" }, { status: 401 });
    }

    return null; // Authorized
  } catch (err: any) {
    return NextResponse.json({ error: `Auth verification failed: ${err.message}` }, { status: 500 });
  }
}
