"use client";

import { MessageSquare } from "lucide-react";
import {
  revisionNoteAuthorLabel,
  revisionNoteKindLabel,
  sortRevisionNotes,
} from "@/lib/revision-notes";
import {
  dashboardInsetSurfaceClass,
  dashboardTaskDetailClass,
} from "@/lib/dashboard-styles";
import { formatDateTime } from "@/lib/format";
import type { RevisionNote } from "@/types";
import { cn } from "@/lib/utils";

export function RevisionNotesPanel({
  notes,
  title = "Revision notes",
  emptyLabel = "No notes for this proof yet. Customer and team messages tied to this location will show here.",
  alwaysShow = false,
  className,
}: {
  notes?: RevisionNote[];
  title?: string;
  emptyLabel?: string;
  alwaysShow?: boolean;
  className?: string;
}) {
  const sorted = sortRevisionNotes(notes);

  if (sorted.length === 0 && !alwaysShow) {
    return null;
  }

  return (
    <section className={cn("space-y-2.5", className)}>
      <div className="flex items-center gap-2">
        <MessageSquare className="size-3.5 text-[#616161]" strokeWidth={1.75} />
        <h3 className="text-xs font-semibold uppercase tracking-wide text-[#616161]">
          {title}
        </h3>
      </div>
      {sorted.length === 0 ? (
        <p className={cn("rounded-lg border border-dashed border-[#e3e3e3] bg-[#fafafa] px-3 py-3", dashboardTaskDetailClass)}>
          {emptyLabel}
        </p>
      ) : (
        <div className="space-y-2">
          {sorted.map((note) => (
          <article
            key={note.id}
            className={cn(
              dashboardInsetSurfaceClass,
              "rounded-lg border px-3 py-2.5",
              note.role === "customer"
                ? "border-[#c4d7f2] bg-[#f8fbff]"
                : "border-[#ebebeb] bg-[#fafafa]"
            )}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[12px] font-semibold text-[#303030]">
                {revisionNoteAuthorLabel(note)}
                <span className="mx-1.5 font-normal text-[#c9cccf]">·</span>
                <span className="font-medium text-[#616161]">
                  {revisionNoteKindLabel(note.kind)}
                </span>
              </p>
              <time
                className="text-[11px] text-[#8a8a8a]"
                dateTime={note.timestamp}
              >
                {formatDateTime(note.timestamp)}
              </time>
            </div>
            <p className={cn("mt-1.5 whitespace-pre-wrap", dashboardTaskDetailClass)}>
              {note.content}
            </p>
          </article>
        ))}
        </div>
      )}
    </section>
  );
}

export function RevisionNotesEmptyHint({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p className={cn("text-[12px] text-[#8a8a8a]", className)}>{children}</p>
  );
}
