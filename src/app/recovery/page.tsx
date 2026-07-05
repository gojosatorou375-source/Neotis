"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Home, Plus } from "lucide-react";
import { useConversations } from "@/lib/conversations/use-conversations";
import { AnimatePresence } from "framer-motion";
import { ThemeToggle } from "@/components/theme-toggle";
import { WorkspaceTree } from "@/components/recovery/workspace-tree";
import { ConversationDashboard } from "@/components/recovery/conversation-dashboard";
import { RightSidebar } from "@/components/recovery/right-sidebar";
import { FindWhatIForgot } from "@/components/recovery/find-what-i-forgot";
import { ProductivityDashboard } from "@/components/recovery/productivity-dashboard";
import { ImportDialog } from "@/components/recovery/import-dialog";
import { DuplicatePopup } from "@/components/recovery/duplicate-popup";
import { TabBar, type RecoveryTab } from "@/components/recovery/tab-bar";
import { TimelineView } from "@/components/recovery/timeline-view";
import { KnowledgeGraphView } from "@/components/recovery/knowledge-graph-view";
import { CapsulesView } from "@/components/recovery/capsules-view";
import { ConversationsView } from "@/components/recovery/conversations-view";
import { CapsuleViewDialog } from "@/components/recovery/capsule-view-dialog";
import { Button } from "@/components/ui/button";
import { useRecoveryStore } from "@/lib/recovery/use-recovery-store";
import { useCapsules } from "@/lib/recovery/use-capsules";
import { buildKnowledgeGraph } from "@/lib/recovery/knowledge-graph";
import type { Capsule } from "@/types/atlas";

export default function RecoveryPage() {
  const {
    hydrated,
    conversations,
    projects,
    stats,
    selected,
    selectedId,
    setSelectedId,
    pendingImport,
    prepareImport,
    cancelImport,
    commitImport,
    continueExisting,
    mergeProjects,
    renameConversation,
    moveConversation,
    archiveConversation,
    deleteConversation,
    importCapturedConversations,
  } = useRecoveryStore();

  const {
    hydrated: capsulesHydrated,
    capsules,
    createCapsule,
    deleteCapsule,
  } = useCapsules();

  // Conversations captured by the PersonaMD browser extension (a separate
  // store, server-backed via /api/conversations) get folded into this
  // dashboard automatically, so nothing needs to be pasted in by hand.
  const {
    conversations: captured,
    importCapsule: importCapturedCapsule,
    deleteConversation: deleteCaptured,
    generateInsights: generateCapturedInsights,
  } = useConversations();
  useEffect(() => {
    if (captured.length > 0) importCapturedConversations(captured);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [captured]);

  const [importOpen, setImportOpen] = useState(false);
  const [tab, setTab] = useState<RecoveryTab>("workspace");
  const [continueCapsule, setContinueCapsule] = useState<Capsule | null>(null);

  const graph = useMemo(() => buildKnowledgeGraph(conversations), [conversations]);

  if (!hydrated || !capsulesHydrated) return null;

  const selectAndGoToWorkspace = (id: string) => {
    setSelectedId(id);
    setTab("workspace");
  };

  /**
   * "Continue in another LLM": a captured conversation flagged limitReached
   * has, by now, also synced into the recovery store under the same id (see
   * importCapturedConversations above) — so it already has a summary,
   * decisions, code snippets, etc. from the local metadata pipeline. Build a
   * one-conversation Capsule from it and open the copy/download dialog.
   */
  const handleContinue = (conversationId: string) => {
    const enriched = conversations.find((c) => c.id === conversationId);
    if (!enriched) return; // hasn't finished syncing into the recovery store yet — try again in a moment
    const capsule = createCapsule(`Continue: ${enriched.title}`, [conversationId], conversations);
    setContinueCapsule(capsule);
  };

  return (
    <div className="relative z-10 flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border)] bg-[var(--bg)]/80 px-6 py-4 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-white/30 px-3 py-1.5 text-small font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] dark:bg-white/5"
          >
            <Home className="h-3.5 w-3.5" />
            Home
          </Link>
          <span className="text-[var(--border)]">/</span>
          <span className="text-small font-semibold text-[var(--text-primary)]">Dashboard</span>
        </div>
        <TabBar active={tab} onChange={setTab} />
        <div className="flex items-center gap-3">
          <Button size="sm" onClick={() => setImportOpen(true)}>
            <Plus className="h-4 w-4" />
            Import conversation
          </Button>
          <ThemeToggle />
        </div>
      </header>

      {tab === "workspace" && (
        <>
          <div className="border-b border-[var(--border)] px-6 py-5">
            <FindWhatIForgot conversations={conversations} onSelect={setSelectedId} />
          </div>
          <div className="border-b border-[var(--border)] px-6 py-5">
            <ProductivityDashboard stats={stats} />
          </div>
        </>
      )}

      <div className="flex min-h-[70vh] flex-1 items-stretch">
        <aside className="glass-panel w-[300px] shrink-0 overflow-hidden rounded-none border-y-0 border-l-0">
          <WorkspaceTree
            conversations={conversations}
            selectedId={selectedId}
            onSelect={selectAndGoToWorkspace}
            onRename={renameConversation}
            onMove={moveConversation}
            onArchive={archiveConversation}
            onDelete={deleteConversation}
          />
        </aside>

        {tab === "workspace" && (
          <>
            <ConversationDashboard
              conversation={selected}
              allConversations={conversations}
              onSelect={setSelectedId}
              onSaveAsCapsule={(conversationId, name) => createCapsule(name, [conversationId], conversations)}
            />
            <aside className="glass-panel w-[320px] shrink-0 overflow-hidden rounded-none border-y-0 border-r-0">
              <RightSidebar
                conversations={conversations}
                projects={projects}
                selected={selected}
                onSelect={setSelectedId}
              />
            </aside>
          </>
        )}

        {tab === "conversations" && (
          <ConversationsView
            conversations={captured}
            onImport={importCapturedCapsule}
            onDelete={deleteCaptured}
            onGenerateInsights={generateCapturedInsights}
            onContinue={handleContinue}
          />
        )}

        {tab === "timeline" && (
          <TimelineView conversations={conversations} onSelectConversation={selectAndGoToWorkspace} />
        )}

        {tab === "graph" && (
          <KnowledgeGraphView
            graph={graph}
            conversations={conversations}
            onSelectConversation={selectAndGoToWorkspace}
          />
        )}

        {tab === "capsules" && (
          <CapsulesView
            conversations={conversations}
            capsules={capsules}
            onCreateCapsule={(name, ids) => createCapsule(name, ids, conversations)}
            onDeleteCapsule={deleteCapsule}
          />
        )}
      </div>

      <AnimatePresence>
        {importOpen && (
          <ImportDialog
            onClose={() => setImportOpen(false)}
            onImport={(text, platform, titleHint) => {
              const { conversation, duplicates } = prepareImport(text, platform, titleHint);
              setImportOpen(false);
              if (duplicates.length === 0) {
                commitImport(conversation);
              }
            }}
          />
        )}
        {pendingImport && pendingImport.duplicates.length > 0 && (
          <DuplicatePopup
            pending={pendingImport}
            onContinue={continueExisting}
            onMerge={mergeProjects}
            onCreateNew={commitImport}
            onDismiss={cancelImport}
          />
        )}
        {continueCapsule && (
          <CapsuleViewDialog capsule={continueCapsule} onClose={() => setContinueCapsule(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
