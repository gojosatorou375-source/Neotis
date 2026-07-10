import type { Conversation } from "@/types/recovery";
import type { KnowledgeEdge, KnowledgeGraph, KnowledgeNode, KnowledgeNodeType } from "@/types/atlas";

/**
 * A small curated vocabulary used to classify a keyword as a "technology"
 * node rather than a generic "concept" node. Not exhaustive — just enough
 * to make the graph visually meaningful without an external NLP service.
 */
const TECH_TERMS = new Set([
  "react", "nextjs", "next", "typescript", "javascript", "python", "fastapi",
  "django", "flask", "node", "postgres", "postgresql", "mysql", "redis",
  "mongodb", "graphql", "rest", "docker", "kubernetes", "aws", "azure", "gcp",
  "vercel", "tailwind", "css", "html", "jwt", "oauth", "auth", "api",
  "webpack", "vite", "git", "github", "linux", "sql", "nosql", "celery",
  "qdrant", "pinecone", "openai", "anthropic", "llm", "embedding", "embeddings",
  "reportlab", "vercel", "framer", "zustand", "prisma", "supabase",
]);

const MAX_NODES = 40;

function nodeId(type: KnowledgeNodeType, label: string): string {
  return `${type}:${label.toLowerCase()}`;
}

function titleCase(label: string): string {
  return label.length <= 4 ? label.toUpperCase() : label.charAt(0).toUpperCase() + label.slice(1);
}

export function buildKnowledgeGraph(conversations: Conversation[]): KnowledgeGraph {
  const nodes = new Map<string, KnowledgeNode>();
  const edgeWeights = new Map<string, number>();

  const upsertNode = (type: KnowledgeNodeType, label: string, conversationId: string) => {
    const id = nodeId(type, label);
    const existing = nodes.get(id);
    if (existing) {
      existing.weight += 1;
      if (!existing.conversationIds.includes(conversationId)) {
        existing.conversationIds.push(conversationId);
      }
    } else {
      nodes.set(id, {
        id,
        label: titleCase(label),
        type,
        weight: 1,
        conversationIds: [conversationId],
      });
    }
    return id;
  };

  for (const c of conversations) {
    if (c.archived) continue;
    const nodeIdsThisConvo = new Set<string>();

    nodeIdsThisConvo.add(upsertNode("project", c.project, c.id));

    for (const keyword of [...c.keywords, ...c.topics]) {
      const type: KnowledgeNodeType = TECH_TERMS.has(keyword.toLowerCase()) ? "technology" : "concept";
      nodeIdsThisConvo.add(upsertNode(type, keyword, c.id));
    }

    // Co-occurrence edges: every pair of nodes touched by this conversation.
    const ids = [...nodeIdsThisConvo];
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const key = [ids[i], ids[j]].sort().join("|||");
        edgeWeights.set(key, (edgeWeights.get(key) ?? 0) + 1);
      }
    }
  }

  const topNodes = [...nodes.values()]
    .sort((a, b) => b.weight - a.weight)
    .slice(0, MAX_NODES);
  const keptIds = new Set(topNodes.map((n) => n.id));

  const edges: KnowledgeEdge[] = [];
  for (const [key, weight] of edgeWeights) {
    const [source, target] = key.split("|||");
    if (keptIds.has(source) && keptIds.has(target)) {
      edges.push({ source, target, weight });
    }
  }

  return { nodes: topNodes, edges };
}
