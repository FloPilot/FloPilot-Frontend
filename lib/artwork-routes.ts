import type { ArtworkQueueEntry } from "@/lib/artwork-queue";
import type { Message, Order, RevisionNote } from "@/types";
import { sortRevisionNotes } from "@/lib/revision-notes";

export const ARTWORK_ORDERS_BASE = "/app/artwork/orders";

export function artworkOrderWorkspaceHref(
  orderId: string,
  jobId?: string,
  imprintId?: string
): string {
  const base = `${ARTWORK_ORDERS_BASE}/${orderId}`;
  if (!jobId || !imprintId) return base;
  const params = new URLSearchParams({ job: jobId, imprint: imprintId });
  return `${base}?${params.toString()}`;
}

function activityMatchesProof(
  detail: string | undefined,
  entry: Pick<ArtworkQueueEntry, "imprintLabel" | "artwork">
): boolean {
  if (!detail) return false;
  const haystack = detail.toLowerCase();
  const label = entry.imprintLabel.toLowerCase();
  const name = entry.artwork.name.toLowerCase();
  return (
    haystack.includes(label) ||
    (name.length > 2 && haystack.includes(name))
  );
}

function parseActivityDetailMessage(detail: string | undefined): string {
  if (!detail?.trim()) return "Revision requested";
  const separator = " — ";
  const index = detail.indexOf(separator);
  if (index >= 0) {
    const message = detail.slice(index + separator.length).trim();
    if (message) return message;
  }
  return detail.trim();
}

function stripProofLabelPrefix(content: string, label: string): string {
  const prefix = `[${label}] `;
  if (content.startsWith(prefix)) return content.slice(prefix.length);
  return content;
}

function messageMatchesProofScope(
  message: Pick<Message, "jobId" | "imprintId" | "content">,
  entry: Pick<ArtworkQueueEntry, "jobId" | "imprintId" | "imprintLabel">
): boolean {
  if (message.jobId && message.imprintId) {
    return (
      message.jobId === entry.jobId && message.imprintId === entry.imprintId
    );
  }
  return message.content.startsWith(`[${entry.imprintLabel}]`);
}

function mergeOrderMessagesIntoProofNotes(
  messages: Message[] | undefined,
  entry: Pick<
    ArtworkQueueEntry,
    "jobId" | "imprintId" | "imprintLabel" | "customerName"
  >,
  merged: RevisionNote[],
  seen: Set<string>
): void {
  if (!messages?.length) return;

  const labelPrefix = `[${entry.imprintLabel}]`;
  let threadOpen = false;

  for (const message of messages) {
    const scoped = messageMatchesProofScope(message, entry);
    const bracketMatch =
      message.role === "staff" && message.content.startsWith(labelPrefix);

    if (scoped || bracketMatch) {
      threadOpen = true;
      const content = bracketMatch
        ? stripProofLabelPrefix(message.content, entry.imprintLabel)
        : message.content;
      const key = `${message.timestamp}::${content}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push({
        id: `msg-${message.id}`,
        content,
        author: message.author,
        role: message.role === "customer" ? "customer" : "staff",
        timestamp: message.timestamp,
        kind: "comment",
      });
      continue;
    }

    if (
      threadOpen &&
      message.role === "customer" &&
      !message.content.startsWith("[")
    ) {
      const key = `${message.timestamp}::${message.content}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push({
        id: `msg-${message.id}`,
        content: message.content,
        author: message.author,
        role: "customer",
        timestamp: message.timestamp,
        kind: "comment",
      });
      continue;
    }

    if (
      threadOpen &&
      message.role === "staff" &&
      /^\[[^\]]+\]/.test(message.content) &&
      !message.content.startsWith(labelPrefix)
    ) {
      threadOpen = false;
    }
  }
}

/** Merge scoped proof notes with legacy order activity and message thread entries. */
export function resolveArtworkRevisionNotes(
  order: Pick<Order, "activity" | "messages"> | undefined,
  entry: Pick<
    ArtworkQueueEntry,
    "jobId" | "imprintId" | "imprintLabel" | "artwork" | "customerName"
  >
): RevisionNote[] {
  const scoped = sortRevisionNotes(entry.artwork.revisionNotes);
  const seen = new Set(
    scoped.map((note) => `${note.timestamp}::${note.content}`)
  );
  const merged: RevisionNote[] = [...scoped];

  for (const activity of order?.activity ?? []) {
    if (activity.type !== "artwork_revision") continue;
    if (!activityMatchesProof(activity.detail, entry)) continue;

    const content = parseActivityDetailMessage(activity.detail);
    const key = `${activity.timestamp}::${content}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const isCustomer =
      activity.author &&
      entry.customerName &&
      activity.author.toLowerCase() === entry.customerName.toLowerCase();

    merged.push({
      id: `legacy-${activity.id}`,
      content,
      author: activity.author || "Shop",
      role: isCustomer ? "customer" : "staff",
      timestamp: activity.timestamp,
      kind: "revision_request",
    });
  }

  mergeOrderMessagesIntoProofNotes(order?.messages, entry, merged, seen);

  return sortRevisionNotes(merged);
}

export function resolveReviewProofNotes(
  proof: {
    jobId: string;
    imprintId: string;
    label: string;
    artwork: { revisionNotes?: RevisionNote[]; name: string };
  },
  context?: {
    customerName?: string;
    messages?: Message[];
    activity?: Order["activity"];
  }
): RevisionNote[] {
  return resolveArtworkRevisionNotes(
    context?.messages || context?.activity
      ? {
          messages: context.messages ?? [],
          activity: context.activity ?? [],
        }
      : undefined,
    {
      jobId: proof.jobId,
      imprintId: proof.imprintId,
      imprintLabel: proof.label,
      artwork: {
        ...proof.artwork,
        id: "",
        version: 0,
        status: "pending",
        uploadedAt: "",
      },
      customerName: context?.customerName ?? "",
    }
  );
}
