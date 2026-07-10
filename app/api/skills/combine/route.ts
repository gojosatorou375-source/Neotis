import { NextRequest, NextResponse } from "next/server";
import { generateCombinedSkill } from "@/lib/llm/combine-skill";
import { checkCorsOrigin, applyCorsHeaders, checkAuth } from "@/lib/server/auth";
import { getClientIp, checkRateLimit } from "@/lib/server/rate-limiter";

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

  const ip = getClientIp(req);
  if (checkRateLimit(`skills-combine-${ip}`, 5)) {
    const response = NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    applyCorsHeaders(response, corsCheck.origin);
    return response;
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    const response = NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    applyCorsHeaders(response, corsCheck.origin);
    return response;
  }

  const { projectName, projectMarkdown, personaMarkdown } = (body ?? {}) as {
    projectName?: string;
    projectMarkdown?: string;
    personaMarkdown?: string;
  };

  if (!projectName || !projectMarkdown || !personaMarkdown) {
    const response = NextResponse.json(
      { error: "Provide projectName, projectMarkdown, and personaMarkdown." },
      { status: 400 }
    );
    applyCorsHeaders(response, corsCheck.origin);
    return response;
  }

  try {
    const { markdown, usedAI } = await generateCombinedSkill(projectName, projectMarkdown, personaMarkdown);
    const response = NextResponse.json({ markdown, usedAI });
    applyCorsHeaders(response, corsCheck.origin);
    return response;
  } catch (err) {
    const response = NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to generate combined skill." },
      { status: 500 }
    );
    applyCorsHeaders(response, corsCheck.origin);
    return response;
  }
}
