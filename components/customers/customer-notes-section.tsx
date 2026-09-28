"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ChevronRight,
  Info,
  Plus,
  StickyNote,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createCustomerNoteId,
  CUSTOMER_NOTE_PRIORITY_OPTIONS,
  customerNotePriorityLabel,
  MAX_CUSTOMER_ACCOUNT_NOTES,
  sortCustomerAccountNotes,
} from "@/lib/customer-notes";
import {
  dashboardCardClass,
  dashboardControlClass,
  dashboardGhostButtonClass,
  dashboardPrimaryButtonClass,
  dashboardTaskDetailClass,
  dashboardTaskTitleClass,
} from "@/lib/dashboard-styles";
import { formatDate } from "@/lib/format";
import type { CustomerNote, CustomerNotePriority } from "@/types";
import { cn } from "@/lib/utils";

type NoteDraft = {
  id?: string;
  content: string;
  priority: CustomerNotePriority;
};

function emptyNoteDraft(): NoteDraft {
  return { content: "", priority: "normal" };
}

function priorityStyles(priority: CustomerNotePriority) {
  if (priority === "warning") {
    return {
      card: "border-[#f5b5b5] bg-[#fff1f1]",
      badge: "bg-[#fdf2f2] text-[#b42318]",
      icon: "bg-[#fff1f1] text-[#b42318]",
    };
  }
  if (priority === "high") {
    return {
      card: "border-[#f0d9a8] bg-[#fff8eb]",
      badge: "bg-[#fff8eb] text-[#8a6116]",
      icon: "bg-[#fff8eb] text-[#8a6116]",
    };
  }
  return {
    card: "border-[#ebebeb] bg-white",
    badge: "bg-[#f6f6f7] text-[#616161]",
    icon: "bg-[#f4f7fd] text-[#2c6ecb]",
  };
}

export function CustomerNotesSection({
  notes,
  companyName,
  onChange,
  className,
}: {
  notes: CustomerNote[];
  companyName: string;
  onChange: (notes: CustomerNote[]) => void;
  className?: string;
}) {
  const sorted = useMemo(() => sortCustomerAccountNotes(notes), [notes]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<NoteDraft>(emptyNoteDraft());
  const [draftError, setDraftError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CustomerNote | null>(null);

  const atLimit = sorted.length >= MAX_CUSTOMER_ACCOUNT_NOTES;
  const warningCount = sorted.filter((note) => note.priority === "warning").length;

  const openNew = () => {
    setEditingId(null);
    setDraft(emptyNoteDraft());
    setDraftError(null);
    setDialogOpen(true);
  };

  const openEdit = (entry: CustomerNote) => {
    setEditingId(entry.id);
    setDraft({
      id: entry.id,
      content: entry.content,
      priority: entry.priority,
    });
    setDraftError(null);
    setDialogOpen(true);
  };

  const saveDraft = () => {
    const content = draft.content.trim();
    if (!content) {
      setDraftError("Note content is required.");
      return;
    }
    if (!editingId && sorted.length >= MAX_CUSTOMER_ACCOUNT_NOTES) {
      setDraftError(`You can add up to ${MAX_CUSTOMER_ACCOUNT_NOTES} notes.`);
      return;
    }

    const now = new Date().toISOString();
    const nextEntry: CustomerNote = {
      id: editingId ?? createCustomerNoteId(),
      content,
      priority: draft.priority,
      createdAt: editingId
        ? sorted.find((entry) => entry.id === editingId)?.createdAt ?? now
        : now,
      updatedAt: now,
    };

    const withoutEdited = editingId
      ? notes.filter((entry) => entry.id !== editingId)
      : notes;

    onChange(sortCustomerAccountNotes([...withoutEdited, nextEntry]));
    setDialogOpen(false);
    setDraft(emptyNoteDraft());
    setEditingId(null);
    setDraftError(null);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    onChange(notes.filter((entry) => entry.id !== deleteTarget.id));
    setDeleteTarget(null);
    setDialogOpen(false);
    setEditingId(null);
  };

  return (
    <>
      <section className={cn(dashboardCardClass, className)}>
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#ebebeb] px-4 py-3 sm:px-5">
          <div>
            <h2 className="flex items-center gap-2 text-[15px] font-semibold text-[#303030]">
              <StickyNote className="size-4 text-[#2c6ecb]" />
              Notes &amp; warnings
            </h2>
            <p className={cn("mt-1 max-w-xl", dashboardTaskDetailClass)}>
              Internal notes for the team. Mark a note as a warning to alert
              staff when they create an order for this account.
            </p>
            {warningCount > 0 ? (
              <p className="mt-1.5 inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#b42318]">
                <AlertTriangle className="size-3" />
                {warningCount} warning{warningCount !== 1 ? "s" : ""} on file
              </p>
            ) : null}
          </div>
          <Button
            type="button"
            className={cn(dashboardPrimaryButtonClass, "h-9 rounded-lg")}
            onClick={openNew}
            disabled={atLimit}
          >
            <Plus className="size-3.5" />
            Add note
          </Button>
        </div>

        <div className="space-y-2 p-4 sm:p-5">
          {sorted.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[#e3e3e3] bg-[#fafafa] px-4 py-8 text-center">
              <StickyNote className="mx-auto size-8 text-[#c9c9c9]" />
              <p className="mt-3 text-[13px] font-medium text-[#303030]">
                No notes yet
              </p>
              <p className={cn("mx-auto mt-1 max-w-sm", dashboardTaskDetailClass)}>
                Add context for this account — payment habits, contacts to avoid,
                or a customer warning for tough accounts.
              </p>
            </div>
          ) : (
            sorted.map((entry) => {
              const styles = priorityStyles(entry.priority);
              const Icon =
                entry.priority === "warning"
                  ? AlertTriangle
                  : entry.priority === "high"
                    ? Info
                    : StickyNote;
              return (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => openEdit(entry)}
                  className={cn(
                    "group flex w-full items-start justify-between gap-3 rounded-lg border px-3.5 py-3 text-left transition-colors hover:brightness-[0.99]",
                    styles.card
                  )}
                >
                  <div className="flex min-w-0 flex-1 items-start gap-2.5">
                    <span
                      className={cn(
                        "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full",
                        styles.icon
                      )}
                    >
                      <Icon className="size-3.5" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            "rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                            styles.badge
                          )}
                        >
                          {customerNotePriorityLabel(entry.priority)}
                        </span>
                        <span className="text-[11px] text-[#8a8a8a]">
                          {formatDate(entry.updatedAt)}
                        </span>
                      </div>
                      <p className="mt-1.5 line-clamp-3 text-[13px] leading-relaxed text-[#303030]">
                        {entry.content}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="mt-0.5 size-4 shrink-0 text-[#8a8a8a] transition-transform group-hover:translate-x-0.5 group-hover:text-[#2c6ecb]" />
                </button>
              );
            })
          )}
        </div>
      </section>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="flex max-h-[min(92vh,640px)] w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-lg">
          <DialogHeader className="shrink-0 border-b border-[#ebebeb] px-5 py-4 text-left">
            <DialogTitle className={dashboardTaskTitleClass}>
              {editingId ? "Edit note" : "Add note"}
            </DialogTitle>
            <DialogDescription className={dashboardTaskDetailClass}>
              Saved under {companyName}. Warnings appear when creating a new
              order for this customer.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                Priority
              </Label>
              <Select
                value={draft.priority}
                onValueChange={(value) =>
                  setDraft((current) => ({
                    ...current,
                    priority: (value ?? "normal") as CustomerNotePriority,
                  }))
                }
              >
                <SelectTrigger className={cn(dashboardControlClass, "h-9 w-full")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CUSTOMER_NOTE_PRIORITY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className={dashboardTaskDetailClass}>
                {
                  CUSTOMER_NOTE_PRIORITY_OPTIONS.find(
                    (option) => option.value === draft.priority
                  )?.description
                }
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                Note *
              </Label>
              <Textarea
                value={draft.content}
                onChange={(event) => {
                  setDraft((current) => ({
                    ...current,
                    content: event.target.value,
                  }));
                  if (draftError) setDraftError(null);
                }}
                rows={5}
                className="min-h-[120px] rounded-lg border-[#e3e3e3] text-[13px]"
                placeholder="e.g. Always confirm PO numbers — past invoices disputed…"
                autoFocus
              />
            </div>

            {draft.priority === "warning" ? (
              <div className="rounded-lg border border-[#f5b5b5] bg-[#fff1f1] px-3.5 py-3 text-[12px] leading-relaxed text-[#b42318]">
                This will show as a customer warning when someone starts a new
                order for this account.
              </div>
            ) : null}

            {draftError ? (
              <p className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {draftError}
              </p>
            ) : null}
          </div>

          <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-[#ebebeb] bg-[#fafafa] px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
            {editingId ? (
              <button
                type="button"
                className={cn(
                  dashboardGhostButtonClass,
                  "h-9 justify-center text-[#b42318] hover:bg-[#fdf2f2] hover:text-[#b42318]"
                )}
                onClick={() => {
                  const entry = sorted.find((item) => item.id === editingId);
                  if (entry) setDeleteTarget(entry);
                }}
              >
                <Trash2 className="size-3.5" />
                Delete
              </button>
            ) : (
              <span />
            )}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                className={cn(dashboardGhostButtonClass, "h-9")}
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={cn(
                  dashboardPrimaryButtonClass,
                  "h-9 min-w-[120px] justify-center"
                )}
                onClick={saveDraft}
              >
                {editingId ? "Update note" : "Add note"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader className="text-left">
            <DialogTitle className={dashboardTaskTitleClass}>
              Delete note?
            </DialogTitle>
            <DialogDescription className={dashboardTaskDetailClass}>
              Remove this {deleteTarget ? customerNotePriorityLabel(deleteTarget.priority).toLowerCase() : "note"} from{" "}
              {companyName}.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className={cn(dashboardControlClass, "h-9")}
              onClick={() => setDeleteTarget(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="h-9 rounded-lg bg-[#b42318] text-white hover:bg-[#912018]"
              onClick={confirmDelete}
            >
              Delete note
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
