/** Persist public review-store decisions and votes in localStorage. */

import type {
  ClientStoreReviewDecision,
  ClientStoreReviewVote,
} from "@/lib/client-stores";

export type StoredClientStoreReviewDecision = {
  productId: string;
  /** Empty string when the product has no color options. */
  color: string;
  decision: ClientStoreReviewDecision;
  note?: string;
};

type StoredClientStoreReview = {
  expiresAt: number;
  decisions: StoredClientStoreReviewDecision[];
};

export type StoredClientStoreVote = {
  productId: string;
  color: string;
  vote: ClientStoreReviewVote;
};

type StoredClientStoreVoter = {
  expiresAt: number;
  voterId: string;
  voterName: string;
  votes: StoredClientStoreVote[];
};

export const CLIENT_STORE_REVIEW_TTL_MS = 24 * 60 * 60 * 1000;
/** Keep voter identity longer so returning teammates don't lose their thumbs. */
export const CLIENT_STORE_VOTER_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function storageKey(token: string): string {
  return `flopilot.client-store.review.${token}`;
}

function voterStorageKey(token: string): string {
  return `flopilot.client-store.voter.${token}`;
}

export function reviewDecisionKey(productId: string, color = ""): string {
  return `${productId}::${color.trim().toLowerCase()}`;
}

function isDecision(
  value: unknown
): value is StoredClientStoreReviewDecision {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.productId === "string" &&
    (row.decision === "included" || row.decision === "excluded") &&
    (typeof row.color === "string" || row.color == null)
  );
}

function isVote(value: unknown): value is StoredClientStoreVote {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.productId === "string" &&
    (row.vote === "up" || row.vote === "down") &&
    (typeof row.color === "string" || row.color == null)
  );
}

function createVoterId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().replace(/-/g, "");
  }
  return `v${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
}

export function readClientStoreReview(
  token: string
): StoredClientStoreReviewDecision[] {
  if (typeof window === "undefined" || !token) return [];
  try {
    const raw = window.localStorage.getItem(storageKey(token));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredClientStoreReview;
    if (
      !parsed ||
      typeof parsed.expiresAt !== "number" ||
      !Array.isArray(parsed.decisions)
    ) {
      window.localStorage.removeItem(storageKey(token));
      return [];
    }
    if (parsed.expiresAt <= Date.now()) {
      window.localStorage.removeItem(storageKey(token));
      return [];
    }
    return parsed.decisions.filter(isDecision).map((row) => ({
      productId: row.productId,
      color: typeof row.color === "string" ? row.color : "",
      decision: row.decision,
      note: typeof row.note === "string" ? row.note : undefined,
    }));
  } catch {
    return [];
  }
}

export function writeClientStoreReview(
  token: string,
  decisions: StoredClientStoreReviewDecision[]
): void {
  if (typeof window === "undefined" || !token) return;
  try {
    if (!decisions.length) {
      window.localStorage.removeItem(storageKey(token));
      return;
    }
    const payload: StoredClientStoreReview = {
      expiresAt: Date.now() + CLIENT_STORE_REVIEW_TTL_MS,
      decisions,
    };
    window.localStorage.setItem(storageKey(token), JSON.stringify(payload));
  } catch {
    /* ignore quota */
  }
}

export function clearClientStoreReview(token: string): void {
  if (typeof window === "undefined" || !token) return;
  try {
    window.localStorage.removeItem(storageKey(token));
  } catch {
    /* ignore */
  }
}

export function readClientStoreVoter(token: string): {
  voterId: string;
  voterName: string;
  votes: StoredClientStoreVote[];
} {
  if (typeof window === "undefined" || !token) {
    return { voterId: "", voterName: "", votes: [] };
  }
  try {
    const raw = window.localStorage.getItem(voterStorageKey(token));
    if (!raw) {
      const voterId = createVoterId();
      writeClientStoreVoter(token, { voterId, voterName: "", votes: [] });
      return { voterId, voterName: "", votes: [] };
    }
    const parsed = JSON.parse(raw) as StoredClientStoreVoter;
    if (
      !parsed ||
      typeof parsed.expiresAt !== "number" ||
      typeof parsed.voterId !== "string" ||
      parsed.voterId.length < 8
    ) {
      window.localStorage.removeItem(voterStorageKey(token));
      const voterId = createVoterId();
      writeClientStoreVoter(token, { voterId, voterName: "", votes: [] });
      return { voterId, voterName: "", votes: [] };
    }
    if (parsed.expiresAt <= Date.now()) {
      window.localStorage.removeItem(voterStorageKey(token));
      const voterId = createVoterId();
      writeClientStoreVoter(token, { voterId, voterName: "", votes: [] });
      return { voterId, voterName: "", votes: [] };
    }
    return {
      voterId: parsed.voterId,
      voterName: typeof parsed.voterName === "string" ? parsed.voterName : "",
      votes: Array.isArray(parsed.votes)
        ? parsed.votes.filter(isVote).map((row) => ({
            productId: row.productId,
            color: typeof row.color === "string" ? row.color : "",
            vote: row.vote,
          }))
        : [],
    };
  } catch {
    const voterId = createVoterId();
    return { voterId, voterName: "", votes: [] };
  }
}

export function writeClientStoreVoter(
  token: string,
  input: {
    voterId: string;
    voterName: string;
    votes: StoredClientStoreVote[];
  }
): void {
  if (typeof window === "undefined" || !token) return;
  try {
    const payload: StoredClientStoreVoter = {
      expiresAt: Date.now() + CLIENT_STORE_VOTER_TTL_MS,
      voterId: input.voterId,
      voterName: input.voterName,
      votes: input.votes,
    };
    window.localStorage.setItem(voterStorageKey(token), JSON.stringify(payload));
  } catch {
    /* ignore quota */
  }
}

export function upsertClientStoreVote(
  token: string,
  vote: StoredClientStoreVote
): StoredClientStoreVote[] {
  const current = readClientStoreVoter(token);
  const key = reviewDecisionKey(vote.productId, vote.color);
  const votes = [
    ...current.votes.filter(
      (row) => reviewDecisionKey(row.productId, row.color) !== key
    ),
    { ...vote, color: vote.color || "" },
  ];
  writeClientStoreVoter(token, {
    voterId: current.voterId,
    voterName: current.voterName,
    votes,
  });
  return votes;
}

export function setClientStoreVoterName(token: string, voterName: string): void {
  const current = readClientStoreVoter(token);
  writeClientStoreVoter(token, {
    voterId: current.voterId,
    voterName: voterName.trim(),
    votes: current.votes,
  });
}
