import { createHash } from "node:crypto";
import type { MemoryFact, FactType, FactPolarity } from "@/types/memory";

export interface DedupResult {
  toInsert: MemoryFact[];
  toUpdate: MemoryFact[];
  supersededIds: string[];
}

/**
 * Normalizes a string for near-string matching by removing casing, spaces, and punctuation.
 */
export function normalizeContent(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Compares fresh facts with existing stored facts in the same section.
 * Handles deduplication (incrementing reference count) and supersession (marking contradiction).
 */
export function deduplicateAndSupersedeFacts(
  existingFacts: MemoryFact[],
  freshFacts: Array<{
    section: string;
    factType: FactType;
    polarity: FactPolarity;
    content: string;
    confidence: number;
  }>,
  conversationId: string,
  projectId?: string | null,
  userId?: string | null
): DedupResult {
  const toInsert: MemoryFact[] = [];
  const toUpdate: MemoryFact[] = [];
  const supersededIds: string[] = [];

  const now = new Date().toISOString();

  for (const fresh of freshFacts) {
    const freshNorm = normalizeContent(fresh.content);
    
    // Find matching existing facts in the same section that are NOT superseded
    const match = existingFacts.find(
      (ef) => !ef.supersededBy && ef.section === fresh.section && normalizeContent(ef.content) === freshNorm
    );

    if (match) {
      if (fresh.polarity === "rejected" && match.polarity === "adopted") {
        // Contradiction: new fact rejects a prior adopted fact
        const newFactId = crypto.randomUUID();
        
        // Mark old fact as superseded
        match.supersededBy = newFactId;
        match.updatedAt = now;
        toUpdate.push(match);
        supersededIds.push(match.id);

        // Insert the new rejected fact
        toInsert.push({
          id: newFactId,
          conversationId,
          projectId: projectId || null,
          userId: userId || null,
          section: fresh.section,
          factType: fresh.factType,
          polarity: fresh.polarity,
          content: fresh.content,
          confidence: fresh.confidence,
          referenceCount: 1,
          supersededBy: null,
          createdAt: now,
          updatedAt: now,
          lastConfirmedAt: now,
        });
      } else if (fresh.polarity === match.polarity) {
        // Agreement: increment reference count and update timestamp
        match.referenceCount += 1;
        match.lastConfirmedAt = now;
        match.updatedAt = now;
        // Keep the highest confidence
        if (fresh.confidence > match.confidence) {
          match.confidence = fresh.confidence;
        }
        toUpdate.push(match);
      } else {
        // Other polarity changes (e.g. adopted replaces proposed, or hypothetical replaces adopted)
        const newFactId = crypto.randomUUID();
        match.supersededBy = newFactId;
        match.updatedAt = now;
        toUpdate.push(match);
        supersededIds.push(match.id);

        toInsert.push({
          id: newFactId,
          conversationId,
          projectId: projectId || null,
          userId: userId || null,
          section: fresh.section,
          factType: fresh.factType,
          polarity: fresh.polarity,
          content: fresh.content,
          confidence: fresh.confidence,
          referenceCount: 1,
          supersededBy: null,
          createdAt: now,
          updatedAt: now,
          lastConfirmedAt: now,
        });
      }
    } else {
      // New fact entirely
      toInsert.push({
        id: crypto.randomUUID(),
        conversationId,
        projectId: projectId || null,
        userId: userId || null,
        section: fresh.section,
        factType: fresh.factType,
        polarity: fresh.polarity,
        content: fresh.content,
        confidence: fresh.confidence,
        referenceCount: 1,
        supersededBy: null,
        createdAt: now,
        updatedAt: now,
        lastConfirmedAt: now,
      });
    }
  }

  return { toInsert, toUpdate, supersededIds };
}

/**
 * Computes a deterministic MD5 hash for a list of facts in a section.
 */
export function computeSectionHash(facts: MemoryFact[]): string {
  const data = facts
    .map((f) => `${f.factType}|${f.polarity}|${f.content}`)
    .sort()
    .join("\n");
  return createHash("md5").update(data).digest("hex");
}

interface ParsedSection {
  name: string;
  hash: string;
  content: string;
}

/**
 * Parses existing markdown to extract sections and their hashes.
 */
export function parseMarkdownSections(markdown: string): {
  header: string;
  sections: Map<string, ParsedSection>;
} {
  const sections = new Map<string, ParsedSection>();
  
  // Find first section index to extract the header
  const firstSectionIdx = markdown.indexOf("\n## ");
  const header = firstSectionIdx === -1 ? markdown : markdown.slice(0, firstSectionIdx + 1);

  // Regex to match sections: ## Name \n <!-- section-hash: hash --> \n content
  const sectionRegex = /## ([^\n]+)\n<!-- section-hash: ([a-f0-9]+) -->\n([\s\S]*?)(?=(?:\n## )|$)/g;
  let match;
  
  // Reset regex index
  sectionRegex.lastIndex = 0;
  while ((match = sectionRegex.exec(markdown)) !== null) {
    const name = match[1].trim();
    const hash = match[2];
    const content = match[3];
    sections.set(name, { name, hash, content });
  }

  return { header, sections };
}

/**
 * Regenerates the Markdown document incrementally based on section hashes.
 * Only rewrites sections whose underlying facts changed.
 */
export function generateMarkdown(
  existingMarkdown: string,
  allActiveFacts: MemoryFact[],
  title: string
): string {
  const { header, sections: parsedSections } = parseMarkdownSections(existingMarkdown || `# ${title}\n\n`);

  // Filter only adopted, non-superseded facts
  const adoptedFacts = allActiveFacts.filter((f) => !f.supersededBy && f.polarity === "adopted");

  // Group facts by section
  const factsBySection = new Map<string, MemoryFact[]>();
  for (const fact of adoptedFacts) {
    const bucket = factsBySection.get(fact.section) ?? [];
    bucket.push(fact);
    factsBySection.set(fact.section, bucket);
  }

  const outputSections: string[] = [];
  
  // Ensure we include sections in a consistent order
  const allSectionNames = Array.from(
    new Set([...Array.from(parsedSections.keys()), ...Array.from(factsBySection.keys())])
  ).sort();

  for (const sectionName of allSectionNames) {
    const facts = factsBySection.get(sectionName) ?? [];
    
    // If a section exists but now has 0 facts, we omit it.
    if (facts.length === 0) continue;

    const currentHash = computeSectionHash(facts);
    const parsed = parsedSections.get(sectionName);

    if (parsed && parsed.hash === currentHash) {
      // Reuse existing section content directly (diff-safe, format-preserving)
      outputSections.push(`## ${sectionName}\n<!-- section-hash: ${parsed.hash} -->\n${parsed.content.trim()}`);
    } else {
      // Regenerate changed or new section
      const bullets = facts
        .sort((a, b) => b.confidence - a.confidence)
        .map((f) => `- **[${f.factType}]** ${f.content}`)
        .join("\n");

      outputSections.push(`## ${sectionName}\n<!-- section-hash: ${currentHash} -->\n${bullets}`);
    }
  }

  return `${header.trim()}\n\n${outputSections.join("\n\n")}\n`;
}
