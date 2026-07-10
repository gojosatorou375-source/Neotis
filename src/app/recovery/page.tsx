"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Home, Plus, Trash2 } from "lucide-react";
import { useConversations } from "@/lib/conversations/use-conversations";
import { AnimatePresence } from "framer-motion";
import { ThemeToggle } from "@/components/theme-toggle";
import dynamic from "next/dynamic";

const WorkspaceTree = dynamic(
  () => import("@/components/recovery/workspace-tree").then((mod) => mod.WorkspaceTree),
  { ssr: false, loading: () => <div className="p-4 text-small text-[var(--text-secondary)]">Loading workspace...</div> }
);
const ConversationDashboard = dynamic(
  () => import("@/components/recovery/conversation-dashboard").then((mod) => mod.ConversationDashboard),
  { ssr: false, loading: () => <div className="p-6 text-small text-[var(--text-secondary)]">Loading dashboard...</div> }
);
const RightSidebar = dynamic(
  () => import("@/components/recovery/right-sidebar").then((mod) => mod.RightSidebar),
  { ssr: false, loading: () => <div className="p-4 text-small text-[var(--text-secondary)]">Loading details...</div> }
);
const TimelineView = dynamic(
  () => import("@/components/recovery/timeline-view").then((mod) => mod.TimelineView),
  { ssr: false, loading: () => <div className="p-6 text-small text-[var(--text-secondary)]">Loading timeline...</div> }
);
const KnowledgeGraphView = dynamic(
  () => import("@/components/recovery/knowledge-graph-view").then((mod) => mod.KnowledgeGraphView),
  { ssr: false, loading: () => <div className="p-6 text-small text-[var(--text-secondary)]">Loading knowledge graph...</div> }
);
const KnowledgeView = dynamic(
  () => import("@/components/recovery/knowledge-view").then((mod) => mod.KnowledgeView),
  { ssr: false, loading: () => <div className="p-6 text-small text-[var(--text-secondary)]">Loading knowledge...</div> }
);
const SkillsView = dynamic(
  () => import("@/components/recovery/skills-view").then((mod) => mod.SkillsView),
  { ssr: false, loading: () => <div className="p-6 text-small text-[var(--text-secondary)]">Loading skills library...</div> }
);
const ConversationsView = dynamic(
  () => import("@/components/recovery/conversations-view").then((mod) => mod.ConversationsView),
  { ssr: false, loading: () => <div className="p-6 text-small text-[var(--text-secondary)]">Loading conversations...</div> }
);
const ImportDialog = dynamic(
  () => import("@/components/recovery/import-dialog").then((mod) => mod.ImportDialog),
  { ssr: false }
);
const DuplicatePopup = dynamic(
  () => import("@/components/recovery/duplicate-popup").then((mod) => mod.DuplicatePopup),
  { ssr: false }
);
const CapsuleViewDialog = dynamic(
  () => import("@/components/recovery/capsule-view-dialog").then((mod) => mod.CapsuleViewDialog),
  { ssr: false }
);
import { Button } from "@/components/ui/button";
import { FindWhatIForgot } from "@/components/recovery/find-what-i-forgot";
import { ProductivityDashboard } from "@/components/recovery/productivity-dashboard";
import { TabBar, type RecoveryTab } from "@/components/recovery/tab-bar";
import { useRecoveryStore } from "@/lib/recovery/use-recovery-store";
import { useCapsules } from "@/lib/recovery/use-capsules";
import { useSkills } from "@/lib/skills/use-skills";
import { useKnowledge } from "@/lib/knowledge/use-knowledge";
import { buildKnowledgeGraph } from "@/lib/recovery/knowledge-graph";
import { emptyStats } from "@/lib/recovery/storage";
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
    syncCapturedConversations,
    resetAll: resetRecoveryData,
  } = useRecoveryStore();

  const {
    hydrated: capsulesHydrated,
    createCapsule,
    resetAll: resetCapsuleData,
  } = useCapsules();

  // Skills -- the Dashboard's former "Capsules" tab now shows these instead:
  // permanent, project-level knowledge from the Adaptive Project Interview,
  // not conversation-derived snapshots. Unlike stats/capsules above, Skills
  // are user-authored and independent of captured conversations, so they are
  // NOT zeroed out by the hasConversations gate below.
  const {
    hydrated: skillsHydrated,
    skills,
    error: skillsError,
    renameSkill,
    setSkillTags,
    toggleFavorite,
    togglePinned,
    toggleArchived,
    duplicateSkill,
    deleteSkill,
    restoreSkillVersion,
    updateSkillMarkdown,
  } = useSkills();

  // FEATURE 1 -- AI Knowledge Extractor: structured facts pulled out of
  // conversations (features, APIs, decisions, rules, ...) rather than raw
  // conversation text. Extraction runs on demand from the Knowledge tab.
  const {
    hydrated: knowledgeHydrated,
    items: knowledgeItems,
    extractFromConversation,
    deleteItem: deleteKnowledgeItem,
    clearForConversation: clearKnowledgeForConversation,
    resetAll: resetKnowledgeData,
  } = useKnowledge();

  // Conversations captured by the PersonaMD browser extension (a separate
  // store, server-backed via /api/conversations) get folded into this
  // dashboard automatically, so nothing needs to be pasted in by hand.
  const {
    conversations: captured,
    importCapsule: importCapturedCapsule,
    deleteConversation: deleteCaptured,
    deleteConversations: deleteCapturedMany,
    resetAll: resetCapturedData,
    generateInsights: generateCapturedInsights,
    getHandoff,
    exportConversationMarkdown,
  } = useConversations();
  useEffect(() => {
    // Runs on every change to `captured` -- including it shrinking to zero --
    // so deletions (single or bulk) cascade into the recovery mirror and
    // every conversation-derived tab (Timeline, Graph) downgrades in step.
    // Gated on `hydrated`: this hook's own effects run before the render-time
    // `if (!hydrated) return null` below, so without this guard the very first
    // poll of `captured` can race the recovery store's own Supabase fetch --
    // `conversations` still reads as empty, every already-persisted captured
    // conversation looks "new", and re-inserting them all hits a duplicate-key
    // conflict on every single poll forever.
    if (!hydrated) return;
    syncCapturedConversations(captured);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [captured, hydrated]);

  useEffect(() => {
    // Knowledge items cascade with their source conversation, same principle
    // as the recovery mirror above: if a conversation disappears, whatever
    // was extracted from it should disappear too rather than going stale.
    const validIds = new Set(conversations.map((c) => c.id));
    const orphanedConversationIds = new Set(
      knowledgeItems.filter((item) => !validIds.has(item.conversationId)).map((item) => item.conversationId)
    );
    for (const conversationId of orphanedConversationIds) {
      clearKnowledgeForConversation(conversationId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversations, knowledgeItems]);

  // Auto-trigger knowledge extraction for newly imported or synced conversations.
  // Tracked by a ref (not derived from `knowledgeItems`) because a conversation
  // that yields zero extractable items never appears in `knowledgeItems` -- deriving
  // "already extracted" from that array would retry it, and thus call setItems,
  // on every single render forever.
  const attemptedExtractionRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!hydrated || !knowledgeHydrated) return;
    for (const c of conversations) {
      if (!attemptedExtractionRef.current.has(c.id)) {
        attemptedExtractionRef.current.add(c.id);
        extractFromConversation(c.id, c.title, c.conversationHistory);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversations, hydrated, knowledgeHydrated]);

  const [importOpen, setImportOpen] = useState(false);
  const [tab, setTab] = useState<RecoveryTab>("workspace");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlTab = params.get("tab") as RecoveryTab;
      if (
        urlTab &&
        ["workspace", "conversations", "knowledge", "timeline", "graph", "skills"].includes(urlTab)
      ) {
        setTab(urlTab);
      }
    }
  }, []);
  const [continueCapsule, setContinueCapsule] = useState<Capsule | null>(null);

  const graph = useMemo(() => buildKnowledgeGraph(conversations), [conversations]);

  // Hard rule: conversations are the single source of truth for this whole
  // dashboard. Whatever `stats` happens to hold in state or in Supabase, the
  // moment there are zero conversations every conversation-derived surface
  // must read as zero/empty too -- this is a display-level gate on top of the
  // cascade-delete logic in useRecoveryStore, so a stray stat left over from
  // some other code path can never make the dashboard look non-empty when
  // the underlying data is gone. Skills are user-authored project knowledge,
  // not derived from conversations, so they are intentionally excluded from
  // this gate.
  const hasConversations = conversations.length > 0;
  const effectiveStats = hasConversations ? stats : emptyStats();

  if (!hydrated || !capsulesHydrated || !skillsHydrated || !knowledgeHydrated) return null;

  const selectAndGoToWorkspace = (id: string) => {
    setSelectedId(id);
    setTab("workspace");
  };

  /**
   * "Continue in another LLM": a captured conversation flagged limitReached
   * has, by now, also synced into the recovery store under the same id (see
   * syncCapturedConversations above) -- so it already has a summary,
   * decisions, code snippets, etc. from the local metadata pipeline. Build a
   * one-conversation Capsule from it and open the copy/download dialog.
   */
  const handleContinue = (conversationId: string) => {
    const enriched = conversations.find((c) => c.id === conversationId);
    if (!enriched) return; // hasn't finished syncing into the recovery store yet -- try again in a moment
    const capsule = createCapsule(`Continue: ${enriched.title}`, [conversationId], conversations);
    setContinueCapsule(capsule);
  };

  const handleExtractKnowledge = (conversationId: string, conversationTitle: string) => {
    const conversation = conversations.find((c) => c.id === conversationId);
    if (!conversation) return;
    extractFromConversation(conversationId, conversationTitle, conversation.conversationHistory);
  };

  const handleExtractAllKnowledge = () => {
    for (const conversation of conversations) {
      extractFromConversation(conversation.id, conversation.title, conversation.conversationHistory);
    }
  };

  /**
   * True full reset -- wipes every row behind this dashboard (captured
   * conversations, the recovery mirror, capsules, and stats), not just what
   * the client currently has loaded. Needed because deleting conversations
   * one-by-one only ever cascades the ones the client knows about; seed
   * data or anything inserted through another path stays behind otherwise.
   */
  const handleResetAll = async () => {
    if (
      !window.confirm(
        "Reset ALL data? This permanently deletes every captured conversation, recovery record, capsule, and stat. This can't be undone."
      )
    ) {
      return;
    }
    await Promise.all([resetCapturedData(), resetRecoveryData(), resetCapsuleData(), resetKnowledgeData()]);
  };

  return (
    <div className="relative z-10 flex min-h-screen flex-col bg-[#FAFAFA] text-[#111111]">
      <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-4 border-b-2 border-black bg-white px-6 py-4 shadow-sm">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-1.5 rounded-full border-2 border-black bg-white px-4 py-2 text-xs font-black tracking-wide uppercase text-black hover:bg-[#B8FF33] hover:-translate-y-0.5 hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] transition-all duration-150 active:translate-y-0 active:shadow-none"
          >
            <Home className="h-3.5 w-3.5" />
            Home
          </Link>
          <span className="text-black/20 font-black">/</span>
          <span className="text-xs font-black tracking-wide uppercase text-black">Dashboard</span>
        </div>
        <TabBar active={tab} onChange={setTab} />
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="ghost"
            className="border-2 border-black bg-red-50 hover:bg-red-100 text-red-700 rounded-full px-4 py-2 text-xs font-black tracking-wide uppercase hover:-translate-y-0.5 hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] transition-all duration-150 active:translate-y-0 active:shadow-none"
            onClick={handleResetAll}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Reset all data
          </Button>
          <Button 
            size="sm" 
            className="border-2 border-black bg-black hover:bg-black/90 text-white rounded-full px-4 py-2 text-xs font-black tracking-wide uppercase hover:-translate-y-0.5 hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] transition-all duration-150 active:translate-y-0 active:shadow-none"
            onClick={() => setImportOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Import conversation
          </Button>
          <ThemeToggle />
        </div>
      </header>

      {tab === "workspace" && (
        <>
          <div className="border-b-2 border-black px-6 py-5 bg-[#FAFAFA]">
            <FindWhatIForgot conversations={conversations} onSelect={setSelectedId} />
          </div>
          <div className="border-b-2 border-black px-6 py-5 bg-[#FAFAFA]">
            <ProductivityDashboard stats={effectiveStats} />
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
            onDeleteMany={deleteCapturedMany}
            onGenerateInsights={generateCapturedInsights}
            onContinue={handleContinue}
            onShare={getHandoff}
            onSelect={selectAndGoToWorkspace}
            onExportMarkdown={exportConversationMarkdown}
          />
        )}

        {tab === "knowledge" && (
          <KnowledgeView
            conversations={conversations}
            items={knowledgeItems}
            onExtract={handleExtractKnowledge}
            onExtractAll={handleExtractAllKnowledge}
            onDeleteItem={deleteKnowledgeItem}
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

        {tab === "skills" && (
          <SkillsView
            skills={skills}
            error={skillsError}
            onRenameSkill={renameSkill}
            onSetSkillTags={setSkillTags}
            onToggleFavorite={toggleFavorite}
            onTogglePinned={togglePinned}
            onToggleArchived={toggleArchived}
            onDuplicateSkill={duplicateSkill}
            onDeleteSkill={deleteSkill}
            onRestoreSkillVersion={restoreSkillVersion}
            onUpdateSkillMarkdown={updateSkillMarkdown}
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
