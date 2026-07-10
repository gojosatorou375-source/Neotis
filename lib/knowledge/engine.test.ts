import assert from "node:assert/strict";
import test from "node:test";
import {
  deduplicateAndSupersedeFacts,
  generateMarkdown,
  computeSectionHash,
  parseMarkdownSections,
} from "./engine.ts";
import type { MemoryFact } from "@/types/memory";

test("deduplicateAndSupersedeFacts - adds a completely new fact", () => {
  const existing: MemoryFact[] = [];
  const fresh = [
    {
      section: "Infrastructure",
      factType: "decision" as const,
      polarity: "adopted" as const,
      content: "Use Supabase as our primary DB.",
      confidence: 0.9,
    },
  ];

  const result = deduplicateAndSupersedeFacts(existing, fresh, "c1", "p1");
  assert.strictEqual(result.toInsert.length, 1);
  assert.strictEqual(result.toUpdate.length, 0);
  assert.strictEqual(result.toInsert[0].content, "Use Supabase as our primary DB.");
  assert.strictEqual(result.toInsert[0].referenceCount, 1);
});

test("deduplicateAndSupersedeFacts - increments reference count on agreement", () => {
  const existing: MemoryFact[] = [
    {
      id: "f1",
      conversationId: "c1",
      projectId: "p1",
      section: "Infrastructure",
      factType: "decision",
      polarity: "adopted",
      content: "Use Supabase as our primary DB.",
      confidence: 0.8,
      referenceCount: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastConfirmedAt: new Date().toISOString(),
    },
  ];

  const fresh = [
    {
      section: "Infrastructure",
      factType: "decision" as const,
      polarity: "adopted" as const,
      content: "Use Supabase as our primary DB.",
      confidence: 0.95,
    },
  ];

  const result = deduplicateAndSupersedeFacts(existing, fresh, "c2", "p1");
  assert.strictEqual(result.toInsert.length, 0);
  assert.strictEqual(result.toUpdate.length, 1);
  assert.strictEqual(result.toUpdate[0].referenceCount, 2);
  assert.strictEqual(result.toUpdate[0].confidence, 0.95); // Raised confidence
});

test("deduplicateAndSupersedeFacts - supersedes prior adopted fact on rejection", () => {
  const existing: MemoryFact[] = [
    {
      id: "f1",
      conversationId: "c1",
      projectId: "p1",
      section: "Infrastructure",
      factType: "decision",
      polarity: "adopted",
      content: "Use Firebase as our primary DB.",
      confidence: 0.8,
      referenceCount: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastConfirmedAt: new Date().toISOString(),
    },
  ];

  const fresh = [
    {
      section: "Infrastructure",
      factType: "decision" as const,
      polarity: "rejected" as const,
      content: "Use Firebase as our primary DB.",
      confidence: 0.9,
    },
  ];

  const result = deduplicateAndSupersedeFacts(existing, fresh, "c2", "p1");
  assert.strictEqual(result.toInsert.length, 1); // Inserts the new rejected fact
  assert.strictEqual(result.toUpdate.length, 1); // Updates the old fact to mark it superseded
  assert.strictEqual(result.toUpdate[0].id, "f1");
  assert.strictEqual(result.toUpdate[0].supersededBy, result.toInsert[0].id);
});

test("generateMarkdown - incrementally regenerates changed sections", () => {
  const initialMarkdown = `# Project Plan

## Infrastructure
<!-- section-hash: 00000000000000000000000000000000 -->
- Old bullet point that was manually edited
`;

  const activeFacts: MemoryFact[] = [
    {
      id: "f1",
      conversationId: "c1",
      projectId: "p1",
      section: "Infrastructure",
      factType: "decision",
      polarity: "adopted",
      content: "Use Supabase for database.",
      confidence: 0.9,
      referenceCount: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastConfirmedAt: new Date().toISOString(),
    },
  ];

  const result = generateMarkdown(initialMarkdown, activeFacts, "Project Plan");

  // Since the old hash (0000...) doesn't match the new facts' hash, the section should regenerate.
  assert.ok(result.includes("Use Supabase for database."));
  assert.ok(!result.includes("Old bullet point"));
  
  // Now if we render again with matching hash, it should keep the text exactly
  const nextHash = computeSectionHash(activeFacts);
  const parsed = parseMarkdownSections(result);
  assert.strictEqual(parsed.sections.get("Infrastructure")?.hash, nextHash);

  // If we add manually edited text to that section but keep the same facts (same hash), it preserves the manual edit:
  const manualEdits = result.replace("Use Supabase for database.", "Use Supabase for database (manually refined).");
  const resultAfterNoChange = generateMarkdown(manualEdits, activeFacts, "Project Plan");
  assert.ok(resultAfterNoChange.includes("(manually refined)"));
});
