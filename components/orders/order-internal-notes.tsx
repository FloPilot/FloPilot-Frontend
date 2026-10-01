"use client";

import { useMemo, useState } from "react";
import { Loader2, Lock, StickyNote } from "lucide-react";
import { useRegisterUnsavedChanges } from "@/components/layout/staff-unsaved-changes-provider";
import { useAuth } from "@/components/providers/auth-provider";
import { useSchedule } from "@/components/providers/schedule-provider";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  dashboardCardClass,
  dashboardInsetSurfaceClass,
  dashboardPrimaryButtonClass,
  dashboardTaskDetailClass,
  dashboardTaskTitleClass,
} from "@/lib/dashboard-styles";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export function OrderInternalNotes({
  orderId,
  variant = "card",
  title = "Notes",
  description = "Internal notes for this order. Come back anytime to reread what the team left.",
  placeholder = "Add a note for the team — reminders, vendor calls, special handling…",
}: {
  orderId: string;
  /** `card` wraps in a dashboard card; `embedded` is content-only for nested panels. */
  variant?: "card" | "embedded";
  title?: string;
  description?: string;
  placeholder?: string;
}) {
  const { profile } = useAuth();
  const { getOrderById, addInternalNote } = useSchedule();
  const order = getOrderById(orderId);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const notes = useMemo(() => {
    const list = order?.internalNotes ?? [];
    return [...list].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }, [order?.internalNotes]);

  const authorName =
    profile?.type === "staff"
      ? profile.user.name?.trim() || profile.user.email || "Shop"
      : "Shop";

  const draftDirty = draft.trim().length > 0;

  const handleAdd = async () => {
    const content = draft.trim();
    if (!content || saving) return;
    setSaving(true);
    setError(null);
    try {
      await addInternalNote(orderId, content, authorName);
      setDraft("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save note.");
    } finally {
      setSaving(false);
    }
  };

  useRegisterUnsavedChanges(
    draftDirty || saving
      ? {
          dirty: true,
          saving,
          label: "Unsaved internal note",
          persistAcrossTabs: false,
          onSave: () => handleAdd(),
          onDiscard: () => {
            setDraft("");
            setError(null);
          },
        }
      : null,
    `order-internal-notes-${orderId}`
  );

  const body = (
    <div className="space-y-4">
      <div className="space-y-2">
        <Textarea
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            if (error) setError(null);
          }}
          placeholder={placeholder}
          rows={3}
          className="min-h-[88px] resize-none rounded-lg border-[#e3e3e3] text-[13px]"
          disabled={saving}
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className={cn("inline-flex items-center gap-1.5", dashboardTaskDetailClass)}>
            <Lock className="size-3.5" />
            Staff only — customers never see these.
          </p>
          <Button
            type="button"
            className={cn(dashboardPrimaryButtonClass, "h-9 px-4")}
            disabled={!draft.trim() || saving}
            onClick={() => void handleAdd()}
          >
            {saving ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Saving…
              </>
            ) : (
              "Save note"
            )}
          </Button>
        </div>
        {error ? (
          <p className="rounded-lg border border-[#f5b5b5] bg-[#fff1f1] px-3 py-2 text-[13px] text-[#b42318]">
            {error}
          </p>
        ) : null}
      </div>

      {notes.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[#e3e3e3] bg-[#fafafa] px-4 py-10 text-center">
          <StickyNote className="mx-auto size-8 text-[#c9c9c9]" />
          <p className="mt-3 text-[13px] font-medium text-[#303030]">
            No notes yet
          </p>
          <p className={cn("mx-auto mt-1 max-w-sm", dashboardTaskDetailClass)}>
            Add anything the team should remember when they come back to this
            order.
          </p>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {notes.map((note) => (
            <li
              key={note.id}
              className={cn(dashboardInsetSurfaceClass, "px-3 py-3")}
            >
              <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                <p className="text-[13px] font-medium text-[#303030]">
                  {note.author}
                </p>
                <p className="text-[11px] text-[#8a8a8a]">
                  {formatDateTime(note.timestamp)}
                </p>
              </div>
              <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-[#616161]">
                {note.content}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  if (variant === "embedded") {
    return body;
  }

  return (
    <section className={dashboardCardClass}>
      <div className="border-b border-[#ebebeb] bg-[#fafafa] px-4 py-3 sm:px-5">
        <h3 className={dashboardTaskTitleClass}>{title}</h3>
        {description ? (
          <p className={cn("mt-0.5", dashboardTaskDetailClass)}>{description}</p>
        ) : null}
      </div>
      <div className="p-4 sm:p-5">{body}</div>
    </section>
  );
}
