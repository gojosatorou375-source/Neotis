import type { Conversation, ProjectSummary } from "@/types/recovery";
import { SIMILARITY_THRESHOLD } from "@/types/recovery";
import { cosineSimilarity, embedText } from "@/lib/recovery/embeddings";

export interface RankedConversation {
  conversation: Conversation;
  score: number;
}

const DAY_MS = 1000 * 60 * 60 * 24;

/** Groups conversations into project rollups sorted by recency. */
export function computeProjects(conversations: Conversation[]): ProjectSummary[] {
  const byProject = new Map<string, Conversation[]>();
  for (const c of conversations) {
    if (!byProject.has(c.project)) byProject.set(c.project, []);
    byProject.get(c.project)!.push(c);
  }

  const summaries: ProjectSummary[] = [];
  for (const [name, convos] of byProject) {
    const sorted = [...convos].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    const totalTasks = convos.reduce((sum, c) => sum + c.followUpTasks.length, 0);
    const completedTasks = convos.filter((c) => c.status === "Completed").length;
    summaries.push({
      name,
      conversationIds: sorted.map((c) => c.id),
      providers: [...new Set(convos.map((c) => c.platform))],
      createdAt: sorted[0].createdAt,
      lastActivity: sorted[sorted.length - 1].lastUpdated,
      completedTasks,
      totalTasks,
    });
  }

  return summaries.sort(
    (a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
  );
}

/** Cosine-similarity search across the corpus for a raw natural-language query. */
export function semanticSearch(
  query: string,
  conversations: Conversation[],
  limit = 8
): RankedConversation[] {
  if (query.trim().length === 0) return [];
  const queryVector = embedText(query);
  const now = Date.now();

  return conversations
    .map((conversation) => {
      const similarity = cosineSimilarity(queryVector, conversation.embedding);
      const recencyDays = (now - new Date(conversation.lastUpdated).getTime()) / DAY_MS;
      const recencyBoost = Math.max(0, 1 - recencyDays / 180) * 0.15;
      const keywordBoost = conversation.keywords.some((k) =>
        query.toLowerCase().includes(k)
      )
        ? 0.1
        : 0;
      const score = similarity + recencyBoost + keywordBoost;
      return { conversation, score };
    })
    .filter((r) => r.score > 0.05)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/** Finds conversations similar enough to `target` to warrant a duplicate-work warning. */
export function findSimilarConversations(
  target: Conversation,
  all: Conversation[],
  excludeId?: string
): RankedConversation[] {
  return all
    .filter((c) => c.id !== excludeId && c.id !== target.id)
    .map((conversation) => ({
      conversation,
      score: cosineSimilarity(target.embedding, conversation.embedding),
    }))
    .filter((r) => r.score >= SIMILARITY_THRESHOLD)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}

/** Conversations that still have open work, most urgent first. */
export function continueWhereLeftOff(conversations: Conversation[]): Conversation[] {
  return conversations
    .filter((c) => !c.archived && (c.status === "In Progress" || c.status === "Pending"))
    .sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime());
}

/** Projects with no activity in `afterDays` days. */
export function inactiveProjects(
  projects: ProjectSummary[],
  afterDays = 60
): ProjectSummary[] {
  const now = Date.now();
  return projects.filter(
    (p) => (now - new Date(p.lastActivity).getTime()) / DAY_MS > afterDays
  );
}

export function suggestedNextAction(conversation: Conversation): string {
  if (conversation.followUpTasks.length > 0) {
    return conversation.followUpTasks[0];
  }
  if (conversation.status === "Completed") {
    return "This conversation looks complete — no action needed.";
  }
  return `Review "${conversation.title}" and decide on a next step.`;
}

/** Related conversations: same project first, then closest by embedding. */
export function relatedConversations(
  target: Conversation,
  all: Conversation[],
  limit = 5
): RankedConversation[] {
  return all
    .filter((c) => c.id !== target.id)
    .map((conversation) => {
      const sameProject = conversation.project === target.project ? 0.3 : 0;
      const similarity = cosineSimilarity(target.embedding, conversation.embedding);
      return { conversation, score: similarity + sameProject };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function estimateHoursSaved(duplicatesPrevented: number, recovered: number): number {
  return Math.round((duplicatesPrevented * 0.75 + recovered * 0.4) * 10) / 10;
}
