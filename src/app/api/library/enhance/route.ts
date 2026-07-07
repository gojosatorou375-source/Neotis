import { NextRequest, NextResponse } from "next/server";
import { enhanceDocument } from "@/lib/llm/enhance-document";
import { checkCorsOrigin, applyCorsHeaders, checkAuth } from "@/lib/server/auth";

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

  const denied = await checkAuth(req);
  if (denied) {
    applyCorsHeaders(denied, corsCheck.origin);
    return denied;
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    const response = NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    applyCorsHeaders(response, corsCheck.origin);
    return response;
  }

  const { answers, docType, projectName, personaMarkdown } = (body ?? {}) as {
    answers?: Record<string | number, string>;
    docType?: "persona" | "project" | "combined";
    projectName?: string;
    personaMarkdown?: string | null;
  };

  if (!answers || !docType) {
    const response = NextResponse.json(
      { error: "Provide answers and docType." },
      { status: 400 }
    );
    applyCorsHeaders(response, corsCheck.origin);
    return response;
  }

  try {
    const { markdown, usedAI } = await enhanceDocument({
      answers,
      docType,
      projectName,
      personaMarkdown,
    });
    const response = NextResponse.json({ markdown, usedAI });
    applyCorsHeaders(response, corsCheck.origin);
    return response;
  } catch (err) {
    const response = NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to enhance document." },
      { status: 500 }
    );
    applyCorsHeaders(response, corsCheck.origin);
    return response;
  }
}
