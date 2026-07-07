/**
 * Standalone test for the Knowledge Extractor — no test framework
 * dependency. Run with:
 *
 *   node --experimental-strip-types src/lib/knowledge/extract-knowledge.test.ts
 *
 * (also wired up as `npm run test:knowledge`)
 */
import assert from "node:assert/strict";
import test from "node:test";
import { extractKnowledgeItems, mergeIncremental } from "./extract-knowledge.ts";

test("extracts a security_rule from an access-key sentence", () => {
  const items = extractKnowledgeItems("c1", "Auth work", [
    { role: "assistant", content: "Every request now requires an access key header checked by Supabase RLS." },
  ]);
  const found = items.find((i) => i.category === "security_rule");
  assert.ok(found, "expected a security_rule item");
  assert.ok(found!.confidence > 0.6);
});

test("extracts a database_change from a schema sentence", () => {
  const items = extractKnowledgeItems("c1", "Schema work", [
    { role: "user", content: "We added a new table called skills with a jsonb answers column." },
  ]);
  assert.ok(items.some((i) => i.category === "database_change"));
});

test("extracts a todo and a bug separately", () => {
  const items = extractKnowledgeItems("c1", "Cleanup", [
    {
      role: "user",
      content:
        "There's still a bug where the dashboard crashes on empty state. TODO: fix the empty state crash before shipping.",
    },
  ]);
  assert.ok(items.some((i) => i.category === "bug"));
  assert.ok(items.some((i) => i.category === "todo"));
});

test("assistant messages get a confidence boost over identical user text", () => {
  const userItems = extractKnowledgeItems("c1", "T", [
    { role: "user", content: "We decided to use Supabase instead of Firebase for the database." },
  ]);
  const assistantItems = extractKnowledgeItems("c1", "T", [
    { role: "assistant", content: "We decided to use Supabase instead of Firebase for the database." },
  ]);
  assert.ok(assistantItems[0].confidence > userItems[0].confidence);
});

test("does not duplicate the same sentence extracted twice", () => {
  const items = extractKnowledgeItems("c1", "T", [
    { role: "user", content: "We decided to use server components instead of client components for this page." },
    { role: "user", content: "We decided to use server components instead of client components for this page." },
  ]);
  const decisions = items.filter((i) => i.category === "architecture_decision");
  assert.strictEqual(decisions.length, 1);
});

test("mergeIncremental keeps existing id/createdAt but raises confidence when it improves", () => {
  const first = extractKnowledgeItems("c1", "T", [
    { role: "user", content: "We decided to use Supabase instead of Firebase for the database." },
  ]);
  const stronger = extractKnowledgeItems("c1", "T", [
    { role: "assistant", content: "We decided to use Supabase instead of Firebase for the database." },
  ]);

  const merge = mergeIncremental(first, stronger);
  assert.strictEqual(merge.toInsert.length, 0, "should not insert a duplicate");
  assert.strictEqual(merge.toUpdate.length, 1, "should update the existing item");
  assert.strictEqual(merge.toUpdate[0].id, first[0].id, "id must be preserved across updates");
  assert.ok(merge.toUpdate[0].confidence > first[0].confidence);
});

test("mergeIncremental inserts genuinely new items without touching old ones", () => {
  const existing = extractKnowledgeItems("c1", "T", [
    { role: "user", content: "We decided to use Supabase instead of Firebase for the database." },
  ]);
  const fresh = extractKnowledgeItems("c1", "T", [
    { role: "user", content: "There's still a bug where login crashes on refresh." },
  ]);

  const merge = mergeIncremental(existing, fresh);
  assert.strictEqual(merge.toInsert.length, 1);
  assert.strictEqual(merge.toUpdate.length, 0);
  assert.strictEqual(merge.items.length, 2);
});

test("plain unrelated sentences produce no knowledge items", () => {
  const items = extractKnowledgeItems("c1", "T", [
    { role: "user", content: "Thanks, that looks good to me!" },
  ]);
  assert.strictEqual(items.length, 0);
});
