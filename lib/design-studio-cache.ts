"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { listDesigns } from "@/lib/api";
import type { SavedDesign } from "@/types";

type DesignsCacheSnapshot = {
  designs: SavedDesign[];
  fingerprint: string;
  fetchedAt: number;
};

let memoryCache: DesignsCacheSnapshot | null = null;
let inflight: Promise<SavedDesign[]> | null = null;

/** Stable signature so we skip re-renders when the library hasn't changed. */
export function designsFingerprint(designs: SavedDesign[]): string {
  return designs
    .map(
      (design) =>
        [
          design.id,
          design.updatedAt || design.createdAt || "",
          design.designMockup?.updatedAt || "",
          design.designMockup?.composedPreviewUrl?.slice(0, 48) || "",
          design.artwork?.previewUrl?.slice(0, 48) || "",
          design.versions?.length ?? 0,
        ].join(":")
    )
    .sort()
    .join("|");
}

export function peekDesignStudioCache(): SavedDesign[] | null {
  return memoryCache?.designs ?? null;
}

export function writeDesignStudioCache(designs: SavedDesign[]): boolean {
  const fingerprint = designsFingerprint(designs);
  if (memoryCache?.fingerprint === fingerprint) {
    return false;
  }
  memoryCache = {
    designs,
    fingerprint,
    fetchedAt: Date.now(),
  };
  return true;
}

/** Patch/replace one design in the cache after a studio save. */
export function upsertDesignStudioCache(design: SavedDesign): void {
  const current = memoryCache?.designs ?? [];
  const index = current.findIndex((row) => row.id === design.id);
  const next =
    index >= 0
      ? current.map((row, i) => (i === index ? design : row))
      : [design, ...current];
  writeDesignStudioCache(next);
}

async function fetchDesigns(token: string): Promise<SavedDesign[]> {
  if (inflight) return inflight;
  inflight = listDesigns(token)
    .then(({ designs }) => {
      writeDesignStudioCache(designs);
      return designs;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/**
 * Cached design library for Design Studio.
 * Shows the last known list immediately, refreshes in the background, and
 * only updates React state when the fingerprint actually changes.
 */
export function useDesignStudioDesigns(getIdToken: () => Promise<string | null>) {
  const [designs, setDesigns] = useState<SavedDesign[]>(
    () => memoryCache?.designs ?? []
  );
  const [loading, setLoading] = useState(() => memoryCache == null);
  const [refreshing, setRefreshing] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const applyIfChanged = useCallback((next: SavedDesign[]) => {
    const fingerprint = designsFingerprint(next);
    setDesigns((current) =>
      designsFingerprint(current) === fingerprint ? current : next
    );
  }, []);

  const refresh = useCallback(
    async (opts?: { force?: boolean }) => {
      const token = await getIdToken();
      if (!token) return;

      const hasCache = memoryCache != null;
      if (!hasCache) {
        if (mountedRef.current) setLoading(true);
      } else if (mountedRef.current) {
        setRefreshing(true);
      }

      try {
        let next: SavedDesign[];
        if (opts?.force) {
          inflight = null;
          const result = await listDesigns(token);
          writeDesignStudioCache(result.designs);
          next = result.designs;
        } else {
          next = await fetchDesigns(token);
        }
        if (mountedRef.current) applyIfChanged(next);
      } finally {
        if (mountedRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [getIdToken, applyIfChanged]
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Soft refresh when the tab becomes visible again (picks up new designs).
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void refresh();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [refresh]);

  return {
    designs,
    loading,
    refreshing,
    refresh,
    hasCache: memoryCache != null,
  };
}
