import { SignJWT, jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";

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
  const key = process.env.APP_SECRET_KEY;
  if (!key) {
    throw new Error("APP_SECRET_KEY environment variable is not set");
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
  const expectedKey = process.env.APP_SECRET_KEY;
  if (!expectedKey) {
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
  if (ALLOWED_ORIGINS.has(origin)) {
    return { allowed: true, origin };
  }
  return { allowed: false, origin };
}

export function applyCorsHeaders(response: NextResponse, origin?: string): NextResponse {
  if (origin) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, X-PersonaMD-Access, X-PersonaMD-Session");
  }
  return response;
}

export async function checkAuth(req: NextRequest): Promise<NextResponse | null> {
  const appSecretKey = process.env.APP_SECRET_KEY;
  if (!appSecretKey) {
    return null; // Allow unconfigured dev environments
  }

  // Check for session token first
  const sessionToken = req.headers.get("X-PersonaMD-Session");
  if (sessionToken && await validateSessionToken(sessionToken)) {
    return null;
  }

  // Fall back to access key for backward compatibility (while transitioning)
  const accessKey = req.headers.get("X-PersonaMD-Access");
  if (accessKey && validateAccessKey(accessKey)) {
    return null;
  }

  return NextResponse.json({ error: "Missing or invalid authentication" }, { status: 401 });
}
