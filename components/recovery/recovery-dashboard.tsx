"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Sparkles, Settings } from "lucide-react";
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
import { usePersonas } from "@/lib/personas/use-personas";
import { OnboardingChoiceDialog } from "@/components/recovery/onboarding-choice-dialog";
import { Logo } from "@/components/logo";
import { buildKnowledgeGraph } from "@/lib/recovery/knowledge-graph";
import { emptyStats } from "@/lib/recovery/storage";
import type { Capsule } from "@/types/atlas";


export function RecoveryDashboard({ onStartPersonal }: { onStartPersonal?: () => void }) {
  const router = useRouter();
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

  const {
    hydrated: knowledgeHydrated,
    items: knowledgeItems,
    extractFromConversation,
    deleteItem: deleteKnowledgeItem,
    clearForConversation: clearKnowledgeForConversation,
    resetAll: resetKnowledgeData,
  } = useKnowledge();

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
    if (!hydrated) return;
    syncCapturedConversations(captured);
  }, [captured, hydrated]);

  useEffect(() => {
    const validIds = new Set(conversations.map((c) => c.id));
    const orphanedConversationIds = new Set(
      knowledgeItems.filter((item) => !validIds.has(item.conversationId)).map((item) => item.conversationId)
    );
    for (const conversationId of orphanedConversationIds) {
      clearKnowledgeForConversation(conversationId);
    }
  }, [conversations, knowledgeItems]);

  const attemptedExtractionRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!hydrated || !knowledgeHydrated) return;
    for (const c of conversations) {
      if (!attemptedExtractionRef.current.has(c.id)) {
        attemptedExtractionRef.current.add(c.id);
        extractFromConversation(c.id, c.title, c.conversationHistory);
      }
    }
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

  const { personas, hydrated: personasHydrated } = usePersonas();
  const [onboardingOpen, setOnboardingOpen] = useState(false);

  useEffect(() => {
    if (hydrated && skillsHydrated && personasHydrated) {
      const isFirstTime = personas.length === 0 && skills.length === 0;
      const dismissedBefore = localStorage.getItem("noetis_onboarding_dismissed");
      if (isFirstTime && !dismissedBefore) {
        setOnboardingOpen(true);
      }
    }
  }, [hydrated, skillsHydrated, personasHydrated, personas.length, skills.length]);

  const [continueCapsule, setContinueCapsule] = useState<Capsule | null>(null);

  const graph = useMemo(() => buildKnowledgeGraph(conversations), [conversations]);

  const hasConversations = conversations.length > 0;
  const effectiveStats = hasConversations ? stats : emptyStats();

  if (!hydrated || !capsulesHydrated || !skillsHydrated || !knowledgeHydrated || !personasHydrated) return null;

  const selectAndGoToWorkspace = (id: string) => {
    setSelectedId(id);
    setTab("workspace");
  };

  const handleContinue = (conversationId: string) => {
    const enriched = conversations.find((c) => c.id === conversationId);
    if (!enriched) return;
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
      <header className="sticky top-0 z-20 flex flex-col md:flex-row md:items-center justify-between gap-3 border-b-2 border-black bg-white px-4 py-3 md:px-6 md:py-4 shadow-sm">
        <div className="flex items-center justify-between w-full md:w-auto">
          <div className="flex items-center gap-2">
            <Logo size={28} />
            <span className="font-black text-lg tracking-tight select-none">Noetis</span>
          </div>
          {/* Mobile Right Controls: horizontal row */}
          <div className="flex md:hidden items-center gap-2">
            <Button
              size="icon"
              variant="ghost"
              className={`w-[34px] h-[34px] border-2 border-black rounded-full shadow-[1.5px_1.5px_0px_rgba(0,0,0,1)] active:translate-y-0 active:shadow-none flex items-center justify-center transition-all duration-150 ${
                tab === "settings" ? "bg-[#B8FF33]" : "bg-white"
              }`}
              onClick={() => setTab("settings")}
              title="Settings"
            >
              <Settings className="h-4 w-4 text-black" />
            </Button>
            <ThemeToggle />
          </div>
        </div>

        {/* Tab bar container: full-width on mobile, auto-width on desktop */}
        <div className="w-full md:flex-1 flex items-center justify-center overflow-hidden">
          <TabBar active={tab} onChange={setTab} onOpenOnboarding={() => setOnboardingOpen(true)} />
        </div>

        {/* Desktop Right Controls: column stack */}
        <div className="hidden md:flex flex-col items-center gap-1.5">
          <Button
            size="icon"
            variant="ghost"
            className={`w-[34px] h-[34px] border-2 border-black rounded-full shadow-[1.5px_1.5px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-none flex items-center justify-center transition-all duration-150 ${
              tab === "settings" ? "bg-[#B8FF33]" : "bg-white hover:bg-black/5"
            }`}
            onClick={() => setTab("settings")}
            title="Settings"
          >
            <Settings className="h-4 w-4 text-black" />
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
            <ProductivityDashboard 
              stats={{
                recoveredConversations: effectiveStats.recoveredConversations,
                activePersonas: personas.length,
                activeSkills: skills.length,
                extractedFacts: knowledgeItems.length,
              }}
            />
          </div>
        </>
      )}

      <div className="flex flex-col lg:flex-row min-h-[70vh] flex-1 items-stretch">
        {tab !== "settings" && (
          <aside className="glass-panel w-full lg:w-[300px] shrink-0 overflow-hidden rounded-none border-y-0 border-l-0 border-b-2 lg:border-b-0 lg:border-r-2 border-black">
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
        )}

        {tab === "workspace" && (
          <>
            <ConversationDashboard
              conversation={selected}
              allConversations={conversations}
              onSelect={setSelectedId}
              onSaveAsCapsule={(conversationId, name) => createCapsule(name, [conversationId], conversations)}
            />
            <aside className="glass-panel w-full lg:w-[320px] shrink-0 overflow-hidden rounded-none border-y-0 border-r-0 border-t-2 lg:border-t-0 lg:border-l-2 border-black">
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

        {tab === "settings" && (
          <div className="flex-1 p-8 max-w-2xl mx-auto flex flex-col justify-start pt-12">
            <div className="bg-white border-2 border-black rounded-2xl p-6 shadow-[4px_4px_0px_rgba(0,0,0,1)] flex flex-col gap-6">
              <h2 className="text-xl font-black uppercase tracking-wide text-black flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Settings
              </h2>
              
              <div className="border-t border-black/10 pt-4">
                <h3 className="font-bold text-sm text-black/70 mb-2">Data Management</h3>
                <p className="text-xs text-black/50 mb-4">Reset all of your stored database tables, including recovery logs, knowledge extractions, and project profiles.</p>
                <Button
                  size="sm"
                  variant="ghost"
                  className="border-2 border-black bg-red-50 hover:bg-red-100 text-red-700 rounded-full px-4 py-2 text-xs font-black tracking-wide uppercase hover:-translate-y-0.5 hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] transition-all duration-150 active:translate-y-0 active:shadow-none"
                  onClick={handleResetAll}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                  Reset all data
                </Button>
              </div>

              <div className="border-t border-black/10 pt-4">
                <h3 className="font-bold text-sm text-black/70 mb-2">Import Conversations</h3>
                <p className="text-xs text-black/50 mb-4">Import external conversations from your LLM history files (Markdown or JSON format) to sync them into your workspace.</p>
                <Button 
                  size="sm" 
                  className="border-2 border-black bg-black hover:bg-black/90 text-white rounded-full px-4 py-2 text-xs font-black tracking-wide uppercase hover:-translate-y-0.5 hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] transition-all duration-150 active:translate-y-0 active:shadow-none"
                  onClick={() => setImportOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-1.5" />
                  Import conversation
                </Button>
              </div>
            </div>
          </div>
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
        {onboardingOpen && (
          <OnboardingChoiceDialog
            onClose={() => {
              localStorage.setItem("noetis_onboarding_dismissed", "true");
              setOnboardingOpen(false);
            }}
            onCreatePersonal={() => {
              setOnboardingOpen(false);
              if (onStartPersonal) onStartPersonal();
            }}
            onCreateProject={() => {
              setOnboardingOpen(false);
              router.push("/skills/new");
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
