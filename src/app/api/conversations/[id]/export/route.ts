import { NextRequest, NextResponse } from "next/server";
import { readConversation } from "@/lib/server/conversation-store";
import { buildConversationFromCaptured } from "@/lib/recovery/from-captured";
import { buildCapsule } from "@/lib/recovery/capsule-builder";
import { capsuleToMarkdown, capsuleFilename } from "@/lib/recovery/capsule-markdown";
import { insertCapsule } from "@/lib/recovery/capsules-storage";
import { checkCorsOrigin, applyCorsHeaders, checkAuth } from "@/lib/server/auth";

export async function OPTIONS(req: NextRequest) {
  const corsCheck = checkCorsOrigin(req);
  const response = NextResponse.json(null, { status: 204 });
  if (corsCheck.allowed) {
    applyCorsHeaders(response, corsCheck.origin);
  }
  return response;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const captured = await readConversation(params.id);
    if (!captured) {
      const response = NextResponse.json({ error: "Conversation not found" }, { status: 404 });
      applyCorsHeaders(response, corsCheck.origin);
      return response;
    }

    const recoveryConv = buildConversationFromCaptured(captured, []);
    const capsule = buildCapsule(
      captured.title,
      [captured.id],
      [recoveryConv]
    );

    // Save Capsule to database
    await insertCapsule(capsule);

    const markdown = capsuleToMarkdown(capsule);
    const filename = capsuleFilename(capsule.name);

    const response = new NextResponse(markdown, {
      status: 200,
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });

    applyCorsHeaders(response, corsCheck.origin);
    return response;
  } catch (err: any) {
    const response = NextResponse.json({ error: err.message }, { status: 500 });
    applyCorsHeaders(response, corsCheck.origin);
    return response;
  }
}
