import type { ConversationCapsule } from "@/types/conversation";

export class CapsuleParseError extends Error {}

/** Parses and validates a Capsule JSON file (produced by the browser
 * extension's popup) into a shape we can push to the server. */
export function parseCapsule(raw: string): ConversationCapsule {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new CapsuleParseError("That file isn't valid JSON.");
  }

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !Array.isArray((parsed as ConversationCapsule).conversations)
  ) {
    throw new CapsuleParseError("That file doesn't look like a Noetis Capsule.");
  }

  return parsed as ConversationCapsule;
}
