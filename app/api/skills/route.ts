import { NextRequest, NextResponse } from "next/server";
import { skillsCollection } from "@/lib/skills/storage";
import { checkCorsOrigin, applyCorsHeaders, checkAuth } from "@/lib/server/auth";

export async function OPTIONS(req: NextRequest) {
  const corsCheck = checkCorsOrigin(req);
  const response = NextResponse.json(null, { status: 204 });
  if (corsCheck.allowed) {
    applyCorsHeaders(response, corsCheck.origin);
  }
  return response;
}

export async function GET(req: NextRequest) {
  const corsCheck = checkCorsOrigin(req);
  if (!corsCheck.allowed) {
    return NextResponse.json({ error: "CORS origin not allowed" }, { status: 403 });
  }

  const denied = await checkAuth(req);
  if (denied) {
    applyCorsHeaders(denied, corsCheck.origin);
    return denied;
  }

  try {
    const all = await skillsCollection.fetchAll();
    const active = all.filter((s) => !s.archived).map((s) => ({
      id: s.id,
      name: s.name,
      projectName: s.projectName,
    }));
    const response = NextResponse.json({ skills: active });
    applyCorsHeaders(response, corsCheck.origin);
    return response;
  } catch (err) {
    const response = NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch skills." },
      { status: 500 }
    );
    applyCorsHeaders(response, corsCheck.origin);
    return response;
  }
}
