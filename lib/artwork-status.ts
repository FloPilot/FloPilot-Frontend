import type { ArtworkFile } from "@/types";

export type ArtworkStatus = ArtworkFile["status"];

export const ARTWORK_STATUS_LABELS: Record<ArtworkStatus, string> = {
  pending: "Drafting",
  with_art: "With artwork",
  art_ready: "Ready to send",
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

export function canSendProofToClient(status: ArtworkStatus): boolean {
  return (
    status === "art_ready" ||
    status === "with_art" ||
    status === "pending" ||
    status === "approved"
  );
}

export function artworkStatusDetail(artwork: ArtworkFile): string | null {
  if (artwork.artAssigneeName?.trim()) {
    return `Artist · ${artwork.artAssigneeName.trim()}`;
  }
  if (artwork.status === "art_ready" && artwork.artCompletedAt) {
    return "Artwork complete";
  }
  if (artwork.status === "with_art" && artwork.artSubmittedAt) {
    return "Submitted to art";
  }
  return null;
}
