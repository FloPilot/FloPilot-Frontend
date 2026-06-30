"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Client-side archive for saved designs.
 *
 * The backend does not yet expose an archive endpoint for the design library,
 * so archived design ids are persisted in localStorage. This keeps the UX fully
 * functional today and can be swapped for a server-backed flag (e.g. a
 * `archived` field via updateDesign) without changing the component API.
 */
const STORAGE_KEY = "pressflow.designLibrary.archivedIds";

function readArchived(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === "string")
      : [];
  } catch {
    return [];
  }
}

function writeArchived(ids: string[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    /* ignore quota / serialization errors */
  }
}

export function useArchivedDesigns() {
  const [archivedIds, setArchivedIds] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setArchivedIds(readArchived());
    setHydrated(true);
  }, []);

  const archive = useCallback((id: string) => {
    setArchivedIds((current) => {
      if (current.includes(id)) return current;
      const next = [...current, id];
      writeArchived(next);
      return next;
    });
  }, []);

  const restore = useCallback((id: string) => {
    setArchivedIds((current) => {
      if (!current.includes(id)) return current;
      const next = current.filter((value) => value !== id);
      writeArchived(next);
      return next;
    });
  }, []);

  const isArchived = useCallback(
    (id: string) => archivedIds.includes(id),
    [archivedIds]
  );

  return { archivedIds, hydrated, archive, restore, isArchived };
}
