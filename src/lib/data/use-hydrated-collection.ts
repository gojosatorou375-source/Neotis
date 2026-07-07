"use client";

import { useCallback, useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { SupabaseCollection } from "@/lib/data/supabase-collection";

/**
 * INFRASTRUCTURE — shared hydrated/loading/error state for any feature hook
 * built on a SupabaseCollection. Every feature (Personas, Skills, Knowledge,
 * ...) previously reimplemented this same `useState` + `useEffect` +
 * try/catch boilerplate by hand, each with slightly different (or missing)
 * error surfacing. This gives every feature the same shape for free —
 * including a real `error` value the UI can show, instead of only a
 * console.error that the user never sees.
 */
export interface UseHydratedCollectionResult<T> {
  items: T[];
  setItems: Dispatch<SetStateAction<T[]>>;
  hydrated: boolean;
  /** Non-null if the initial load (or a manual reload()) failed. */
  error: string | null;
  reload: () => Promise<void>;
}

export function useHydratedCollection<T>(collection: SupabaseCollection<T>): UseHydratedCollectionResult<T> {
  const [items, setItems] = useState<T[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    return collection
      .fetchAll()
      .then((fetched) => {
        setItems(fetched);
        setError(null);
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        console.error(message);
        setError(message);
      })
      .finally(() => setHydrated(true));
  }, [collection]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { items, setItems, hydrated, error, reload: load };
}

/** Wraps a fire-and-forget persistence call with consistent error logging —
 * used for the optimistic-update writes (insert/update/delete) that follow
 * an already-applied local state change. */
export function logOnError(action: string): (err: unknown) => void {
  return (err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`${action}: ${message}`);
  };
}
