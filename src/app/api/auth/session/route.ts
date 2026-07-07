import { NextRequest, NextResponse } from "next/server";
import { checkCorsOrigin, applyCorsHeaders, validateAccessKey, generateSessionToken } from "@/lib/server/auth";

export async function OPTIONS(req: NextRequest) {
  const corsCheck = checkCorsOrigin(req);
  const response = NextResponse.json(null, { status: 204 });
  if (corsCheck.allowed) {
    applyCorsHeaders(response, corsCheck.origin);
  }
  return response;
}

export async function POST(req: NextRequest) {
  const corsCheck = checkCorsOrigin(req);
  if (!corsCheck.allowed) {
    return NextResponse.json({ error: "CORS origin not allowed" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    const response = NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    applyCorsHeaders(response, corsCheck.origin);
    return response;
  }

  const { accessKey } = body as { accessKey?: string };
  if (!accessKey) {
    const response = NextResponse.json({ error: "Missing accessKey" }, { status: 400 });
    applyCorsHeaders(response, corsCheck.origin);
    return response;
  }

  if (!validateAccessKey(accessKey)) {
    const response = NextResponse.json({ error: "Invalid access key" }, { status: 401 });
    applyCorsHeaders(response, corsCheck.origin);
    return response;
  }

  const sessionToken = await generateSessionToken();
  const response = NextResponse.json({ sessionToken });
  applyCorsHeaders(response, corsCheck.origin);
  return response;
}
