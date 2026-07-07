import { NextRequest, NextResponse } from "next/server";
import { buildLibraryDoc, listLibraryDocs } from "@/lib/library/build-docs";
import { checkCorsOrigin, applyCorsHeaders, checkAuth } from "@/lib/server/auth";

export async function OPTIONS(req: NextRequest) {
  const corsCheck = checkCorsOrigin(req);
  const response = NextResponse.json(null, { status: 204 });
  if (corsCheck.allowed) {
    applyCorsHeaders(response, corsCheck.origin);
  }
  return response;
}

const VALID_DOCS = new Set(["project", "skills", "library", "personal"]);

/**
 * GET /api/library?doc=project|skills|library|personal — returns list of items
 * (if action=list) or fetches a specific/latest document.
 */
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

  const doc = req.nextUrl.searchParams.get("doc");
  if (!doc || !VALID_DOCS.has(doc)) {
    const response = NextResponse.json(
      { error: "Query param 'doc' must be one of: project, skills, library, personal." },
      { status: 400 }
    );
    applyCorsHeaders(response, corsCheck.origin);
    return response;
  }

  const action = req.nextUrl.searchParams.get("action");
  if (action === "list") {
    try {
      const list = await listLibraryDocs(doc);
      const response = NextResponse.json({ list });
      applyCorsHeaders(response, corsCheck.origin);
      return response;
    } catch (err) {
      const response = NextResponse.json(
        { error: err instanceof Error ? err.message : "Failed to list documents." },
        { status: 500 }
      );
      applyCorsHeaders(response, corsCheck.origin);
      return response;
    }
  }

  const skillId = req.nextUrl.searchParams.get("skillId");
  const docId = req.nextUrl.searchParams.get("id");

  try {
    const { markdown, title } = await buildLibraryDoc(
      doc as "project" | "skills" | "library" | "personal",
      skillId,
      docId
    );
    const response = NextResponse.json({ markdown, title });
    applyCorsHeaders(response, corsCheck.origin);
    return response;
  } catch (err) {
    const response = NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to build this document." },
      { status: 500 }
    );
    applyCorsHeaders(response, corsCheck.origin);
    return response;
  }
}
