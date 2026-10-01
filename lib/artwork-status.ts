import type { ArtworkFile } from "@/types";

export type ArtworkStatus = ArtworkFile["status"];

export const ARTWORK_STATUS_LABELS: Record<ArtworkStatus, string> = {
  pending: "Drafting",
  with_art: "With artwork",
  art_ready: "Ready for team",
  approved: "Approved",
  revision_requested: "Revision",
};

/** Shorter labels for narrow sidebars and dense lists. */
export const ARTWORK_STATUS_SHORT_LABELS: Record<ArtworkStatus, string> = {
  pending: "Draft",
  with_art: "With art",
  art_ready: "Ready",
  approved: "Approved",
  revision_requested: "Revision",
};

/** Statuses that belong in the artwork department queue. */
export function isArtworkDepartmentStatus(status: ArtworkStatus): boolean {
  return (
    status === "with_art" ||
    status === "revision_requested" ||
    // Legacy open proofs that were never migrated to with_art.
    status === "pending"
  );
}

export function canSubmitProofToArt(status: ArtworkStatus): boolean {
  return status === "pending" || status === "revision_requested";
}

export function canMarkArtComplete(status: ArtworkStatus): boolean {
  return status === "with_art";
}

/** Artist finished and handed the proof back for internal review / customer send. */
export function isArtworkReturnedToTeam(status: ArtworkStatus): boolean {
  return status === "art_ready" || status === "approved";
}

export function canSendProofToClient(status: ArtworkStatus): boolean {
  return (
    status === "art_ready" ||
    status === "with_art" ||
    status === "pending" ||
    status === "approved"
  );
}

export function artworkStatusDetail(artwork: ArtworkFile): string | null {
  const parts: string[] = [];
  if (artwork.artAssigneeName?.trim()) {
    parts.push(`Artist · ${artwork.artAssigneeName.trim()}`);
  }
  if (artwork.artDueAt) {
    parts.push(`Due ${formatArtDueLabel(artwork.artDueAt)}`);
  } else if (artwork.status === "art_ready" && artwork.artCompletedAt) {
    parts.push("Artwork complete");
  } else if (artwork.status === "with_art" && artwork.artSubmittedAt) {
    parts.push("Submitted to art");
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}

export function formatArtDueLabel(dueAt: string): string {
  const raw = dueAt.trim();
  if (!raw) return "";
  const day = raw.slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!match) return raw;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function artDueDateKey(dueAt?: string | null): string | null {
  if (!dueAt?.trim()) return null;
  const day = dueAt.trim().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : null;
}

/** Worst-open status across an order’s proofs for summary badges. */
export function rollupArtworkStatus(
  statuses: ArtworkStatus[]
): ArtworkStatus | null {
  if (statuses.length === 0) return null;
  const rank: Record<ArtworkStatus, number> = {
    revision_requested: 0,
    pending: 1,
    with_art: 2,
    art_ready: 3,
    approved: 4,
  };
  return statuses.reduce((worst, status) =>
    rank[status] < rank[worst] ? status : worst
  );
}

/** Shared artist id when every proof has the same assignee; otherwise null. */
export function sharedArtAssigneeId(
  artworks: Pick<ArtworkFile, "artAssigneeId">[]
): string | null {
  if (artworks.length === 0) return null;
  const first = artworks[0]?.artAssigneeId?.trim() || null;
  if (!first) return null;
  return artworks.every(
    (artwork) => (artwork.artAssigneeId?.trim() || null) === first
  )
    ? first
    : null;
}
