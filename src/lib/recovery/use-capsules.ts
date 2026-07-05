"use client";

import { useCallback, useEffect, useState } from "react";
import type { Capsule } from "@/types/atlas";
import type { Conversation } from "@/types/recovery";
import { buildCapsule } from "@/lib/recovery/capsule-builder";
import { deleteCapsuleRow, fetchCapsules, insertCapsule, updateCapsuleRow } from "@/lib/recovery/capsules-storage";

export function useCapsules() {
  const [capsules, setCapsules] = useState<Capsule[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    fetchCapsules()
      .then(setCapsules)
      .catch((err) => console.error("Failed to load capsules:", err))
      .finally(() => setHydrated(true));
  }, []);

  const createCapsule = useCallback(
    (name: string, conversationIds: string[], conversations: Conversation[]) => {
      const capsule = buildCapsule(name, conversationIds, conversations);
      setCapsules((prev) => [capsule, ...prev]);
      insertCapsule(capsule).catch((err) => console.error("Failed to save capsule:", err));
      return capsule;
    },
    []
  );

  const renameCapsule = useCallback((id: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setCapsules((prev) => {
      const next = prev.map((c) => (c.id === id ? { ...c, name: trimmed } : c));
      const updated = next.find((c) => c.id === id);
      if (updated) updateCapsuleRow(updated).catch((err) => console.error("Failed to rename capsule:", err));
      return next;
    });
  }, []);

  const deleteCapsule = useCallback((id: string) => {
    setCapsules((prev) => prev.filter((c) => c.id !== id));
    deleteCapsuleRow(id).catch((err) => console.error("Failed to delete capsule:", err));
  }, []);

  return {
    hydrated,
    capsules,
    createCapsule,
    renameCapsule,
    deleteCapsule,
  };
}
