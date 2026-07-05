"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Code2, FileText, Package, Plus, Search } from "lucide-react";
import { GlassPanel } from "@/components/glass-panel";
import { Button } from "@/components/ui/button";
import { CapsuleCreateDialog } from "@/components/recovery/capsule-create-dialog";
import { CapsuleViewDialog } from "@/components/recovery/capsule-view-dialog";
import type { Conversation } from "@/types/recovery";
import type { Capsule } from "@/types/atlas";

interface CapsulesViewProps {
  conversations: Conversation[];
  capsules: Capsule[];
  onCreateCapsule: (name: string, conversationIds: string[]) => Capsule;
  onDeleteCapsule: (id: string) => void;
}

export function CapsulesView({
  conversations,
  capsules,
  onCreateCapsule,
  onDeleteCapsule,
}: CapsulesViewProps) {
  const [creating, setCreating] = useState(false);
  const [viewing, setViewing] = useState<Capsule | null>(null);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (query.trim().length === 0) return capsules;
    const q = query.toLowerCase();
    return capsules.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.summary.toLowerCase().includes(q) ||
        c.decisions.some((d) => d.toLowerCase().includes(q)) ||
        c.references.some((r) => r.toLowerCase().includes(q))
    );
  }, [capsules, query]);

  return (
    <div className="flex-1 overflow-y-auto p-6 sm:p-10">
      <div className="mx-auto max-w-[900px]">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="mb-1 flex items-center gap-2 text-small font-semibold text-[var(--text-primary)]">
              <Package className="h-4 w-4 text-[var(--accent)]" />
              Capsules
            </div>
            <p className="text-small text-[var(--text-secondary)]">
              Saved conversations, findable anytime — and portable enough to paste into any AI.
            </p>
          </div>
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" />
            New Capsule
          </Button>
        </div>

        {capsules.length > 0 && (
          <div className="relative mb-6">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search saved capsules by name, summary, or reference..."
              aria-label="Search capsules"
              className="w-full rounded-2xl border border-[var(--border)] bg-white/40 py-3 pl-11 pr-4 text-body text-[var(--text-primary)] outline-none focus:border-[var(--accent)] dark:bg-white/5"
            />
          </div>
        )}

        {capsules.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-xl3 border border-dashed border-[var(--border)] py-20 text-center">
            <Package className="h-6 w-6 text-[var(--text-secondary)]" />
            <p className="max-w-[420px] text-body text-[var(--text-secondary)]">
              No capsules yet. Open any conversation and hit{" "}
              <span className="font-medium text-[var(--text-primary)]">Save as Capsule</span>, or
              pick several related ones here to distill together.
            </p>
            <Button onClick={() => setCreating(true)}>Create your first Capsule</Button>
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-10 text-center text-small text-[var(--text-secondary)]">
            Nothing matches &quot;{query}&quot;.
          </p>
        ) : (
          <motion.div layout className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <AnimatePresence>
              {filtered.map((capsule) => (
                <motion.div
                  key={capsule.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                >
                  <GlassPanel className="flex h-full flex-col p-6">
                    <h3 className="mb-1 truncate text-body font-semibold text-[var(--text-primary)]">
                      {capsule.name}
                    </h3>
                    <p className="mb-3 text-[11px] text-[var(--text-secondary)]">
                      {new Date(capsule.createdAt).toLocaleDateString()} ·{" "}
                      {capsule.sourceConversationIds.length} source{" "}
                      {capsule.sourceConversationIds.length === 1 ? "conversation" : "conversations"}
                    </p>
                    <p className="mb-4 flex-1 text-small text-[var(--text-secondary)]">
                      {capsule.summary}
                    </p>
                    <div className="mb-4 flex flex-wrap gap-3 text-[11px] text-[var(--text-secondary)]">
                      {capsule.keyCode.length > 0 && (
                        <span className="flex items-center gap-1">
                          <Code2 className="h-3 w-3" />
                          {capsule.keyCode.length} code snippets
                        </span>
                      )}
                      {capsule.references.length > 0 && (
                        <span className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          {capsule.references.length} references
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="glass" onClick={() => setViewing(capsule)}>
                        View & copy
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-500 hover:bg-red-500/10"
                        onClick={() => {
                          if (window.confirm(`Delete capsule "${capsule.name}"?`)) {
                            onDeleteCapsule(capsule.id);
                          }
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </GlassPanel>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {creating && (
          <CapsuleCreateDialog
            conversations={conversations}
            onClose={() => setCreating(false)}
            onCreate={(name, ids) => {
              const capsule = onCreateCapsule(name, ids);
              setCreating(false);
              setViewing(capsule);
            }}
          />
        )}
        {viewing && <CapsuleViewDialog capsule={viewing} onClose={() => setViewing(null)} />}
      </AnimatePresence>
    </div>
  );
}
