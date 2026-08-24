/**
 * Legacy client-side archive ids (pre server-backed design.archived).
 * New archive/restore goes through the API; this helper only keeps older
 * local-only archives visible until they are re-archived on the server.
 */
const STORAGE_KEY = "pressflow.designLibrary.archivedIds";

export function readLocalArchivedDesignIds(): string[] {
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

export function clearLocalArchivedDesignIds(ids: string[]) {
  if (typeof window === "undefined" || ids.length === 0) return;
  try {
    const current = readLocalArchivedDesignIds();
    const remove = new Set(ids);
    const next = current.filter((id) => !remove.has(id));
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}
