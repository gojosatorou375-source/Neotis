"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { UploadCloud, X } from "lucide-react";
import { GlassPanel } from "@/components/glass-panel";
import { Button } from "@/components/ui/button";
import { parseCapsule, CapsuleParseError } from "@/lib/conversations/storage";
import type { ConversationCapsule } from "@/types/conversation";

interface ImportCapsuleDialogProps {
  onImport: (capsule: ConversationCapsule) => Promise<{ added: number; skipped: number }>;
  onClose: () => void;
}

export function ImportCapsuleDialog({ onImport, onClose }: ImportCapsuleDialogProps) {
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ added: number; skipped: number } | null>(null);
  const [importing, setImporting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setError(null);
    setResult(null);
    setImporting(true);
    try {
      const text = await file.text();
      const capsule = parseCapsule(text);
      setResult(await onImport(capsule));
    } catch (e) {
      setError(e instanceof CapsuleParseError ? e.message : "Couldn't read that file.");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-6 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94 }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
        className="w-full max-w-[520px]"
      >
        <GlassPanel className="p-8">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent)]/15">
                <UploadCloud className="h-5 w-5 text-[var(--accent)]" strokeWidth={1.75} />
              </div>
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                Import a Capsule
              </h2>
            </div>
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="rounded-full p-1.5 text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/5"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <p className="mb-5 text-small text-[var(--text-secondary)]">
            Use the Noetis Capture browser extension to capture a ChatGPT or
            Claude conversation, download it as a Capsule JSON file from the
            extension popup, then drop that file here.
          </p>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              const file = e.dataTransfer.files?.[0];
              if (file) handleFile(file);
            }}
            onClick={() => inputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-10 text-center transition-colors ${
              dragging
                ? "border-[var(--accent)] bg-[var(--accent)]/5"
                : "border-[var(--border)] hover:border-[var(--accent)]/50"
            }`}
          >
            <UploadCloud className="h-6 w-6 text-[var(--text-secondary)]" />
            <p className="text-small text-[var(--text-secondary)]">
              Drop a <span className="font-medium text-[var(--text-primary)]">personamd-capsule-*.json</span> file here,
              or click to browse
            </p>
            <input
              ref={inputRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
          </div>

          {importing && <p className="mt-4 text-small text-[var(--text-secondary)]">Importing…</p>}
          {error && <p className="mt-4 text-small text-red-500">{error}</p>}
          {result && (
            <p className="mt-4 text-small text-[var(--success)]">
              Imported {result.added} conversation{result.added === 1 ? "" : "s"}
              {result.skipped > 0 ? ` (${result.skipped} already in your library).` : "."}
            </p>
          )}

          <div className="mt-6 flex justify-end gap-3">
            <Button variant="ghost" onClick={onClose}>
              {result ? "Done" : "Cancel"}
            </Button>
          </div>
        </GlassPanel>
      </motion.div>
    </div>
  );
}
