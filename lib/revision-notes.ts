import type { RevisionNote } from "@/types";
import { formatDateTime } from "@/lib/format";

export function sortRevisionNotes(notes: RevisionNote[] = []): RevisionNote[] {
  return [...notes].sort(
    (a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
}

export function latestRevisionNote(
  notes: RevisionNote[] = []
): RevisionNote | undefined {
  const sorted = sortRevisionNotes(notes);
  return sorted[sorted.length - 1];
}

export function revisionNoteAuthorLabel(note: RevisionNote): string {
  if (note.role === "customer") return note.author || "Customer";
  return note.author || "Shop";
}

export function revisionNoteKindLabel(kind: RevisionNote["kind"]): string {
  if (kind === "comment") return "Reply";
  return "Revision request";
}
