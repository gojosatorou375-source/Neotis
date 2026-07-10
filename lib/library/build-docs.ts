import { fetchPersonas, fetchPersona } from "@/lib/personas/storage";
import { skillsCollection } from "@/lib/skills/storage";
import { knowledgeCollection } from "@/lib/knowledge/storage";
import { KNOWLEDGE_CATEGORIES, KNOWLEDGE_CATEGORY_LABELS } from "@/types/knowledge";

// Server-only compilers behind the browser extension's "insert a doc into
// this composer" menu (see capture-widget.js's Project.md / Skills.md /
// Library.md picker). Each one turns whatever's already in Supabase into one
// self-contained Markdown document meant to be pasted straight into any
// LLM's chat box, so a person's communication preferences, project
// knowledge, and extracted facts travel with them across providers instead
// of staying siloed in this app.

export interface LibraryDoc {
  markdown: string;
  title: string;
}

/**
 * personal.md — the AI_PROFILE.md from the person's most recently updated
 * Persona (the 10-question interview's output: how they want an AI to
 * communicate with them).
 */
export async function buildPersonalMarkdown(docId?: string | null): Promise<LibraryDoc> {
  let target;
  if (docId) {
    target = await fetchPersona(docId);
  } else {
    const personas = await fetchPersonas(); // already ordered by updated_at desc
    target = personas[0];
  }

  if (!target) {
    return {
      title: "personal.md",
      markdown:
        "# personal.md\n\nNo Personal Profile has been created yet. Go to PersonaMD and complete the 6-question interview to generate one — it'll show up here automatically afterward.\n",
    };
  }

  return { title: `${target.name.toLowerCase().replace(/\s+/g, "-")}.md`, markdown: target.markdown };
}

/**
 * project.md — the Project.md / Skill.md from the person's most recently updated
 * project profile (the 6-question project interview's output where no persona is attached,
 * meaning personaId is null or empty).
 */
export async function buildProjectMarkdown(docId?: string | null): Promise<LibraryDoc> {
  let target;
  if (docId) {
    target = await skillsCollection.fetchOne(docId);
  } else {
    const all = await skillsCollection.fetchAll();
    const activeProjects = all
      .filter((s) => !s.archived && (!s.personaId || s.personaId === ""))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    target = activeProjects[0];
  }

  if (!target) {
    return {
      title: "project.md",
      markdown:
        "# project.md\n\nNo Project Profile has been created yet. Go to the Skills Library and complete the Project interview — it'll show up here automatically afterward.\n",
    };
  }

  return { title: `${target.name.toLowerCase().replace(/\s+/g, "-")}.md`, markdown: target.markdown };
}

/**
 * skills.md — every non-archived Skill (a project's permanent knowledge:
 * stack, architecture, conventions, business rules) compiled into one
 * document, most recently updated first. Each Skill already has its own
 * generated Skill.md; this just concatenates them under one header per
 * skill so the whole library travels as a single paste.
 */
export async function buildSkillsMarkdown(): Promise<LibraryDoc> {
  const all = await skillsCollection.fetchAll();
  const active = all.filter((s) => !s.archived).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  if (active.length === 0) {
    return {
      title: "skills.md",
      markdown:
        "# skills.md\n\nNo Skills saved yet. Run the Adaptive Project Interview from the Dashboard's Skills tab to generate one.\n",
    };
  }

  const sections = active.map((skill) => {
    const heading = `## ${skill.name}${skill.projectName ? ` — ${skill.projectName}` : ""}`;
    return `${heading}\n\n${skill.markdown.trim()}`;
  });

  return {
    title: "skills.md",
    markdown: `# skills.md\n\n${active.length} saved skill${active.length === 1 ? "" : "s"}.\n\n${sections.join(
      "\n\n---\n\n"
    )}\n`,
  };
}

/**
 * library.md — every extracted Knowledge item (features, APIs, decisions,
 * rules, ...) across every conversation, grouped by category. This is the
 * broadest of the three docs — a running index of concrete facts the
 * Knowledge Extractor has pulled out, rather than raw conversation text.
 */
export async function buildLibraryMarkdown(): Promise<LibraryDoc> {
  const items = await knowledgeCollection.fetchAll();

  if (items.length === 0) {
    return {
      title: "library.md",
      markdown:
        "# library.md\n\nNo knowledge extracted yet. Open the Dashboard's Knowledge tab and run extraction on a captured conversation.\n",
    };
  }

  const byCategory = new Map<string, typeof items>();
  for (const item of items) {
    const bucket = byCategory.get(item.category) ?? [];
    bucket.push(item);
    byCategory.set(item.category, bucket);
  }

  const sections = KNOWLEDGE_CATEGORIES.filter((cat) => byCategory.has(cat)).map((cat) => {
    const bucket = byCategory.get(cat)!;
    const bullets = bucket
      .map((item) => `- **${item.title}** — ${item.description} _(from "${item.conversationTitle}")_`)
      .join("\n");
    return `## ${KNOWLEDGE_CATEGORY_LABELS[cat]}\n\n${bullets}`;
  });

  return {
    title: "library.md",
    markdown: `# library.md\n\n${items.length} extracted item${items.length === 1 ? "" : "s"} across ${
      byCategory.size
    } categories.\n\n${sections.join("\n\n")}\n`,
  };
}

export async function buildLibraryDoc(
  doc: "project" | "skills" | "library" | "personal",
  skillId?: string | null,
  docId?: string | null
): Promise<LibraryDoc> {
  const targetId = docId || skillId;
  if (doc === "personal") return buildPersonalMarkdown(targetId);
  if (doc === "project") return buildProjectMarkdown(targetId);
  if (doc === "skills") {
    if (targetId) {
      try {
        const skill = await skillsCollection.fetchOne(targetId);
        if (skill) {
          return {
            title: `${skill.name.toLowerCase().replace(/\s+/g, "-")}.md`,
            markdown: skill.markdown,
          };
        }
      } catch (err) {
        console.error("Failed to fetch individual skill:", err);
      }
    }
    return buildSkillsMarkdown();
  }
  return buildLibraryMarkdown();
}

export interface LibraryListItem {
  id: string;
  name: string;
  type: string;
  updatedAt: string;
  sizeKb: string;
}

export async function listLibraryDocs(doc: string): Promise<LibraryListItem[]> {
  if (doc === "personal") {
    const personas = await fetchPersonas();
    return personas.map((p) => ({
      id: p.id,
      name: p.name,
      type: "Personal",
      updatedAt: p.updatedAt,
      sizeKb: (p.markdown.length / 1024).toFixed(1),
    }));
  }
  if (doc === "project") {
    const skills = await skillsCollection.fetchAll();
    const projects = skills.filter((s) => !s.archived && (!s.personaId || s.personaId === ""));
    return projects.map((s) => ({
      id: s.id,
      name: s.name,
      type: "Project",
      updatedAt: s.updatedAt,
      sizeKb: (s.markdown.length / 1024).toFixed(1),
    }));
  }
  if (doc === "skills") {
    const skills = await skillsCollection.fetchAll();
    const active = skills.filter((s) => !s.archived);
    return active.map((s) => ({
      id: s.id,
      name: s.name,
      type: s.personaId ? "Combined" : "Project",
      updatedAt: s.updatedAt,
      sizeKb: (s.markdown.length / 1024).toFixed(1),
    }));
  }
  return [];
}
