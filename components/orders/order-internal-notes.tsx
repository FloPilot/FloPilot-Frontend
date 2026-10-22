"use client";

import { useMemo, useState } from "react";
import { Loader2, Lock, StickyNote } from "lucide-react";
import { useRegisterUnsavedChanges } from "@/components/layout/staff-unsaved-changes-provider";
import { useAuth } from "@/components/providers/auth-provider";
import { useSchedule } from "@/components/providers/schedule-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  LabeledSelectValue,
  SelectTrigger,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { DepartmentSlug } from "@/lib/departments";
import {
  dashboardCardClass,
  dashboardInsetSurfaceClass,
  dashboardPrimaryButtonClass,
  dashboardTaskDetailClass,
  dashboardTaskTitleClass,
} from "@/lib/dashboard-styles";
import { formatDateTime } from "@/lib/format";
import {
  STAFF_DEPARTMENT_OPTIONS,
  staffDepartmentLabel,
} from "@/lib/staff-departments";
import { cn } from "@/lib/utils";

const GENERAL_TARGET = "general";

export function OrderInternalNotes({
  orderId,
  variant = "card",
  title = "Notes",
  description = "Internal notes for this order. Come back anytime to reread what the team left.",
  placeholder = "Add a note for the team — reminders, vendor calls, special handling…",
  defaultTargetDepartment = null,
}: {
  orderId: string;
  /** `card` wraps in a dashboard card; `embedded` is content-only for nested panels. */
  variant?: "card" | "embedded";
  title?: string;
  description?: string;
  placeholder?: string;
  /** Pre-select a department target (e.g. receiving notes tab). */
  defaultTargetDepartment?: DepartmentSlug | null;
}) {
  const { profile } = useAuth();
  const { getOrderById, addInternalNote } = useSchedule();
  const order = getOrderById(orderId);
  const [draft, setDraft] = useState("");
  const [targetDepartment, setTargetDepartment] = useState<
    DepartmentSlug | typeof GENERAL_TARGET
  >(defaultTargetDepartment || GENERAL_TARGET);
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
      await addInternalNote(orderId, content, authorName, {
        targetDepartment:
          targetDepartment === GENERAL_TARGET ? null : targetDepartment,
      });
      setDraft("");
      if (!defaultTargetDepartment) {
        setTargetDepartment(GENERAL_TARGET);
      }
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

  const departmentSelectOptions = [
    { value: GENERAL_TARGET, label: "Everyone (no popup)" },
    ...STAFF_DEPARTMENT_OPTIONS.map((dept) => ({
      value: dept.id,
      label: dept.label,
    })),
  ];

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
        <div className="space-y-1.5">
          <Label className="text-[12px] font-medium text-[#616161]">
            Show as popup for
          </Label>
          <Select
            value={targetDepartment}
            onValueChange={(value) => {
              if (!value) return;
              setTargetDepartment(
                value === GENERAL_TARGET
                  ? GENERAL_TARGET
                  : (value as DepartmentSlug)
              );
            }}
          >
            <SelectTrigger className="h-10 w-full rounded-lg border-[#e3e3e3] bg-white text-[13px] sm:max-w-xs">
              <LabeledSelectValue
                value={targetDepartment}
                options={departmentSelectOptions}
              />
            </SelectTrigger>
            <SelectContent>
              {departmentSelectOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className={dashboardTaskDetailClass}>
            Department notes pop up when that team opens the app, so they see
            them right away.
          </p>
        </div>
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
            order. Assign a department to surface it as a popup.
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
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[13px] font-medium text-[#303030]">
                    {note.author}
                  </p>
                  {note.targetDepartment ? (
                    <Badge
                      variant="outline"
                      className="rounded-md border-[#dbe6ff] bg-[#f4f7ff] px-1.5 py-0 text-[10px] font-semibold uppercase tracking-wide text-[#2c6ecb]"
                    >
                      {staffDepartmentLabel(note.targetDepartment)}
                    </Badge>
                  ) : null}
                </div>
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
