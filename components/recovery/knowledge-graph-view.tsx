"use client";

import { useMemo, useState } from "react";
import { GitBranch, Sparkles } from "lucide-react";
import { GlassPanel } from "@/components/glass-panel";
import { InteractiveGraph } from "@/components/graph/interactive-graph";
import type { Conversation } from "@/types/recovery";
import type { KnowledgeGraph, KnowledgeNodeType } from "@/types/atlas";

interface KnowledgeGraphViewProps {
  graph: KnowledgeGraph;
  conversations: Conversation[];
  onSelectConversation: (id: string) => void;
}

const TYPE_COLOR: Record<KnowledgeNodeType, string> = {
  technology: "#0A84FF",
  project: "#34C759",
  concept: "#AF52DE",
  platform: "#FF9F0A",
};

export function KnowledgeGraphView({
  graph,
  conversations,
  onSelectConversation,
}: KnowledgeGraphViewProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const nodeById = useMemo(() => new Map(graph.nodes.map((n) => [n.id, n])), [graph.nodes]);
  const activeNode = activeId ? nodeById.get(activeId) ?? null : null;

  const maxWeight = Math.max(...graph.nodes.map((n) => n.weight), 1);
  const graphNodes = useMemo(
    () =>
      graph.nodes.map((n) => ({
        id: n.id,
        label: n.label,
        color: TYPE_COLOR[n.type],
        radius: 9 + (n.weight / maxWeight) * 17,
      })),
    [graph.nodes, maxWeight]
  );
  const graphEdges = useMemo(
    () => graph.edges.map((e) => ({ source: e.source, target: e.target, weight: e.weight })),
    [graph.edges]
  );

  if (graph.nodes.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-10 text-center text-body text-[var(--text-secondary)]">
        No knowledge graph yet — import or select more conversations to see technologies, projects, and concepts connect.
      </div>
    );
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      <div className="flex-1 overflow-auto p-6">
        <div className="mb-4 flex items-center gap-2 text-small font-semibold text-[var(--text-primary)]">
          <GitBranch className="h-4 w-4 text-[var(--accent)]" />
          Knowledge Graph
        </div>
        <GlassPanel className="overflow-hidden p-3">
          <InteractiveGraph
            nodes={graphNodes}
            edges={graphEdges}
            activeId={activeId}
            onNodeClick={(id) => setActiveId((prev) => (prev === id ? null : id))}
            height={640}
            emptyState={
              <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                <Sparkles className="h-5 w-5 text-[var(--text-secondary)]" />
                <p className="text-small text-[var(--text-secondary)]">Nothing to graph yet.</p>
              </div>
            }
          />
        </GlassPanel>

        <p className="mt-3 text-center text-[11px] text-[var(--text-secondary)]">
          Scroll or use the controls to zoom, drag the canvas to pan, drag a node to reposition it — click a node to focus its connections.
        </p>

        <div className="mt-4 flex flex-wrap justify-center gap-4 text-[11px] text-[var(--text-secondary)]">
          {(Object.keys(TYPE_COLOR) as KnowledgeNodeType[]).map((type) => (
            <span key={type} className="flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: TYPE_COLOR[type], boxShadow: `0 0 8px ${TYPE_COLOR[type]}` }}
              />
              {type}
            </span>
          ))}
        </div>
      </div>

      {activeNode && (
        <aside className="glass-panel w-[320px] shrink-0 overflow-y-auto rounded-none border-y-0 border-r-0 p-5">
          <div className="mb-1 flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: TYPE_COLOR[activeNode.type] }}
            />
            <h3 className="text-body font-semibold text-[var(--text-primary)]">{activeNode.label}</h3>
          </div>
          <p className="mb-4 text-[11px] uppercase tracking-wide text-[var(--text-secondary)]">
            {activeNode.type} · {activeNode.conversationIds.length} conversations
          </p>
          <div className="space-y-2">
            {activeNode.conversationIds.map((id) => {
              const convo = conversations.find((c) => c.id === id);
              if (!convo) return null;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onSelectConversation(id)}
                  className="block w-full truncate rounded-xl px-3 py-2 text-left text-small text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5"
                >
                  {convo.title}
                </button>
              );
            })}
          </div>
        </aside>
      )}
    </div>
  );
}
