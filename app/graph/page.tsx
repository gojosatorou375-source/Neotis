"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Home, Network, Sparkles } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { GlassPanel } from "@/components/glass-panel";
import { ConversationCard } from "@/components/conversations/conversation-card";
import { ConversationViewDialog } from "@/components/conversations/conversation-view-dialog";
import { InteractiveGraph, type InteractiveGraphEdge, type InteractiveGraphNode } from "@/components/graph/interactive-graph";
import { useConversations } from "@/lib/conversations/use-conversations";
import { providerColor, providerLabel } from "@/lib/conversations/provider-style";
import type { Conversation } from "@/types/conversation";

const TOPIC_COLOR = "#6b7094";

function buildGraph(conversations: Conversation[]) {
  const topicCounts = new Map<string, number>();
  for (const c of conversations) {
    for (const topic of c.insights?.topics ?? []) {
      topicCounts.set(topic, (topicCounts.get(topic) ?? 0) + 1);
    }
  }

  const nodes: InteractiveGraphNode[] = [];
  const edges: InteractiveGraphEdge[] = [];
  const conversationByNodeId = new Map<string, Conversation>();
  const topicsByNodeId = new Map<string, string[]>();

  for (const [label, count] of topicCounts.entries()) {
    nodes.push({
      id: `topic:${label}`,
      label,
      color: TOPIC_COLOR,
      radius: 9 + Math.min(count, 6) * 2.2,
      emphasis: true,
    });
  }

  for (const c of conversations) {
    const id = `conversation:${c.id}`;
    const topics = c.insights?.topics ?? [];
    nodes.push({
      id,
      label: c.title.slice(0, 22),
      color: providerColor(c.provider),
      radius: 4.5,
    });
    conversationByNodeId.set(id, c);
    topicsByNodeId.set(id, topics);
    for (const topic of topics) {
      edges.push({ source: id, target: `topic:${topic}` });
    }
  }

  return { nodes, edges, conversationByNodeId, topicsByNodeId };
}

export default function GraphPage() {
  const { hydrated, conversations } = useConversations();
  const [activeTopic, setActiveTopic] = useState<string | null>(null);
  const [viewing, setViewing] = useState<Conversation | null>(null);

  const { nodes, edges, conversationByNodeId, topicsByNodeId } = useMemo(
    () => buildGraph(conversations),
    [conversations]
  );

  const hasInsights = nodes.some((n) => n.emphasis);

  const providersPresent = useMemo(
    () => Array.from(new Set(conversations.map((c) => c.provider))).sort(),
    [conversations]
  );

  const filtered = activeTopic
    ? conversations.filter((c) => topicsByNodeId.get(`conversation:${c.id}`)?.includes(activeTopic))
    : conversations;

  const handleNodeClick = (id: string) => {
    if (id.startsWith("topic:")) {
      const label = id.slice("topic:".length);
      setActiveTopic((prev) => (prev === label ? null : label));
      return;
    }
    const convo = conversationByNodeId.get(id);
    if (convo) setViewing(convo);
  };

  if (!hydrated) return null;

  return (
    <div className="relative z-10 min-h-screen">
      <header className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4 sm:px-10">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-white/30 px-3 py-1.5 text-small font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] dark:bg-white/5"
          >
            <Home className="h-3.5 w-3.5" />
            Home
          </Link>
          <span className="text-[var(--border)]">/</span>
          <span className="text-small font-semibold text-[var(--text-primary)]">Knowledge Graph</span>
        </div>
        <ThemeToggle />
      </header>

      <div className="mx-auto max-w-[1100px] px-6 py-14 sm:px-10">
        <div className="mb-10 flex flex-col items-center text-center">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--accent)]/15">
            <Network className="h-6 w-6 text-[var(--accent)]" strokeWidth={1.75} />
          </div>
          <h1 className="text-section text-[var(--text-primary)]">Knowledge graph</h1>
          <p className="mt-3 max-w-[560px] text-body text-[var(--text-secondary)]">
            Every captured conversation as a node, linked to the topics it
            shares with others. Scroll or use the controls to zoom, drag the
            canvas to pan, drag a node to reposition it — click a topic to
            filter, click a conversation to open it.
          </p>
        </div>

        {providersPresent.length > 0 && hasInsights && (
          <div className="mb-6 flex flex-wrap items-center justify-center gap-4">
            {providersPresent.map((provider) => (
              <div key={provider} className="flex items-center gap-1.5">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: providerColor(provider), boxShadow: `0 0 8px ${providerColor(provider)}` }}
                />
                <span className="text-[12px] font-medium text-[var(--text-secondary)]">
                  {providerLabel(provider)}
                </span>
              </div>
            ))}
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: TOPIC_COLOR }} />
              <span className="text-[12px] font-medium text-[var(--text-secondary)]">Topic</span>
            </div>
          </div>
        )}

        {conversations.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-xl3 border border-dashed border-[var(--border)] py-20 text-center">
            <Sparkles className="h-6 w-6 text-[var(--text-secondary)]" />
            <p className="text-body text-[var(--text-secondary)]">
              Nothing captured yet. Head to{" "}
              <Link href="/conversations" className="font-medium text-[var(--accent)]">
                Conversations
              </Link>{" "}
              to import your first one.
            </p>
          </div>
        ) : !hasInsights ? (
          <div className="flex flex-col items-center gap-4 rounded-xl3 border border-dashed border-[var(--border)] py-20 text-center">
            <Sparkles className="h-6 w-6 text-[var(--text-secondary)]" />
            <p className="max-w-[440px] text-body text-[var(--text-secondary)]">
              No topics extracted yet. Insights only run automatically for
              conversations captured after <code className="rounded bg-black/5 px-1.5 py-0.5 dark:bg-white/10">OPENROUTER_API_KEY</code>{" "}
              was set — conversations captured earlier need a manual backfill.
              Head to{" "}
              <Link href="/conversations" className="font-medium text-[var(--accent)]">
                Conversations
              </Link>{" "}
              and click &quot;Generate insights&quot; on each one.
            </p>
          </div>
        ) : (
          <>
            <GlassPanel className="mb-8 overflow-hidden p-3">
              <InteractiveGraph
                nodes={nodes}
                edges={edges}
                activeId={activeTopic ? `topic:${activeTopic}` : null}
                onNodeClick={handleNodeClick}
                height={620}
              />
            </GlassPanel>

            {activeTopic && (
              <div className="mb-6 flex items-center justify-center gap-2">
                <span className="text-small text-[var(--text-secondary)]">Filtering by</span>
                <button
                  onClick={() => setActiveTopic(null)}
                  className="rounded-full bg-[var(--accent)] px-3 py-1 text-[12px] font-medium text-white"
                >
                  {activeTopic} ×
                </button>
              </div>
            )}

            <motion.div layout className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <AnimatePresence>
                {filtered.map((c) => (
                  <ConversationCard key={c.id} conversation={c} onView={() => setViewing(c)} />
                ))}
              </AnimatePresence>
            </motion.div>
          </>
        )}
      </div>

      <AnimatePresence>
        {viewing && <ConversationViewDialog conversation={viewing} onClose={() => setViewing(null)} />}
      </AnimatePresence>
    </div>
  );
}
