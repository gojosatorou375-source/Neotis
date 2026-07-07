import { NextRequest, NextResponse } from "next/server";
import { deleteConversation } from "@/lib/server/conversation-store";
import { checkCorsOrigin, applyCorsHeaders, checkAuth } from "@/lib/server/auth";

export async function OPTIONS(req: NextRequest) {
  const corsCheck = checkCorsOrigin(req);
  const response = NextResponse.json(null, { status: 204 });
  if (corsCheck.allowed) {
    applyCorsHeaders(response, corsCheck.origin);
  }
  return response;
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const corsCheck = checkCorsOrigin(req);
  if (!corsCheck.allowed) {
    return NextResponse.json({ error: "CORS origin not allowed" }, { status: 403 });
  }

  const denied = await checkAuth(req);
  if (denied) {
    applyCorsHeaders(denied, corsCheck.origin);
    return denied;
  }

  await deleteConversation(params.id);
  const response = NextResponse.json({ ok: true });
  applyCorsHeaders(response, corsCheck.origin);
  return response;
}
