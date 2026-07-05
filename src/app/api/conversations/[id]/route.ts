import { NextRequest, NextResponse } from "next/server";
import { deleteConversation } from "@/lib/server/conversation-store";
import { checkAccessKey } from "@/lib/server/access-key";

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const denied = checkAccessKey(req);
  if (denied) return denied;

  await deleteConversation(params.id);
  return NextResponse.json({ ok: true });
}
