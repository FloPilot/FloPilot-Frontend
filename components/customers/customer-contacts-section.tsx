"use client";

import { useMemo, useState } from "react";
import {
  ChevronRight,
  ContactRound,
  Loader2,
  Mail,
  Phone,
  Plus,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  dashboardCardClass,
  dashboardControlClass,
  dashboardGhostButtonClass,
  dashboardPrimaryButtonClass,
  dashboardTaskDetailClass,
  dashboardTaskTitleClass,
} from "@/lib/dashboard-styles";
import {
  createCustomerContactId,
  customerContactSummary,
  MAX_CUSTOMER_CONTACTS,
  sortCustomerContacts,
} from "@/lib/customer-contacts";
import type { Customer, CustomerContact } from "@/types";
import { cn } from "@/lib/utils";

type ContactDraft = {
  id?: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  position: string;
};

function emptyContactDraft(): ContactDraft {
  return {
    name: "",
    email: "",
    phone: "",
    department: "",
    position: "",
  };
}

export function CustomerContactsSection({
  customer,
  onSave,
  className,
}: {
  customer: Customer;
  onSave: (contacts: CustomerContact[]) => Promise<void>;
  className?: string;
}) {
  const savedContacts = useMemo(
    () => sortCustomerContacts(customer.contacts ?? []),
    [customer.contacts]
  );

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ContactDraft>(emptyContactDraft());
  const [saving, setSaving] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CustomerContact | null>(null);
  const [deleting, setDeleting] = useState(false);

  const atLimit = savedContacts.length >= MAX_CUSTOMER_CONTACTS;

  const openNew = () => {
    setEditingId(null);
    setDraft(emptyContactDraft());
    setDraftError(null);
    setDialogOpen(true);
  };

  const openEdit = (entry: CustomerContact) => {
    setEditingId(entry.id);
    setDraft({
      id: entry.id,
      name: entry.name,
      email: entry.email ?? "",
      phone: entry.phone ?? "",
      department: entry.department ?? "",
      position: entry.position ?? "",
    });
    setDraftError(null);
    setDialogOpen(true);
  };

  const persist = async (next: CustomerContact[]) => {
    setSaving(true);
    try {
      await onSave(next);
    } finally {
      setSaving(false);
    }
  };

  const saveDraft = async () => {
    const name = draft.name.trim();
    if (!name) {
      setDraftError("Name is required.");
      return;
    }

    const email = draft.email.trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setDraftError("Enter a valid email address.");
      return;
    }

    const now = new Date().toISOString();
    const nextEntry: CustomerContact = {
      id: editingId ?? createCustomerContactId(),
      name,
      ...(email ? { email } : {}),
      ...(draft.phone.trim() ? { phone: draft.phone.trim() } : {}),
      ...(draft.department.trim()
        ? { department: draft.department.trim() }
        : {}),
      ...(draft.position.trim() ? { position: draft.position.trim() } : {}),
      createdAt: editingId
        ? savedContacts.find((entry) => entry.id === editingId)?.createdAt ?? now
        : now,
      updatedAt: now,
    };

    const withoutEdited = editingId
      ? savedContacts.filter((entry) => entry.id !== editingId)
      : savedContacts;

    if (!editingId && withoutEdited.length >= MAX_CUSTOMER_CONTACTS) {
      setDraftError(`You can add up to ${MAX_CUSTOMER_CONTACTS} contacts.`);
      return;
    }

    await persist(sortCustomerContacts([...withoutEdited, nextEntry]));
    setDialogOpen(false);
    setDraft(emptyContactDraft());
    setEditingId(null);
    setDraftError(null);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await persist(
        savedContacts.filter((entry) => entry.id !== deleteTarget.id)
      );
      setDeleteTarget(null);
      setDialogOpen(false);
      setEditingId(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <section className={cn(dashboardCardClass, className)}>
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#ebebeb] px-4 py-3 sm:px-5">
          <div>
            <h2 className="flex items-center gap-2 text-[15px] font-semibold text-[#303030]">
              <ContactRound className="size-4 text-[#2c6ecb]" />
              Contacts
            </h2>
            <p className={cn("mt-1 max-w-xl", dashboardTaskDetailClass)}>
              People at this company you can attach to estimates and invoices —
              purchasing, A/P, project managers, and more.
            </p>
            <p className="mt-1 text-[11px] font-medium text-[#8a8a8a]">
              {savedContacts.length} of {MAX_CUSTOMER_CONTACTS} added
            </p>
          </div>
          <Button
            type="button"
            className={cn(dashboardPrimaryButtonClass, "h-9 rounded-lg")}
            onClick={openNew}
            disabled={atLimit}
          >
            <Plus className="size-3.5" />
            Add contact
          </Button>
        </div>

        <div className="space-y-2 p-4 sm:p-5">
          {savedContacts.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[#e3e3e3] bg-[#fafafa] px-4 py-8 text-center">
              <ContactRound className="mx-auto size-8 text-[#c9c9c9]" />
              <p className="mt-3 text-[13px] font-medium text-[#303030]">
                No contacts yet
              </p>
              <p className={cn("mx-auto mt-1 max-w-sm", dashboardTaskDetailClass)}>
                Add teammates at this account so you can include the right people
                on estimates and invoices.
              </p>
            </div>
          ) : (
            savedContacts.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => openEdit(entry)}
                className="group flex w-full items-start justify-between gap-3 rounded-lg border border-[#ebebeb] bg-white px-3.5 py-3 text-left transition-colors hover:border-[#d4d4d4] hover:bg-[#fafafa]"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[13px] font-semibold text-[#303030]">
                      {entry.name}
                    </p>
                    {entry.position ? (
                      <span className="rounded-full bg-[#f4f7fd] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#2c6ecb]">
                        {entry.position}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-[12px] text-[#616161]">
                    {customerContactSummary(entry)}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-[#8a8a8a]">
                    {entry.email ? (
                      <span className="inline-flex items-center gap-1">
                        <Mail className="size-3" />
                        {entry.email}
                      </span>
                    ) : null}
                    {entry.phone ? (
                      <span className="inline-flex items-center gap-1">
                        <Phone className="size-3" />
                        {entry.phone}
                      </span>
                    ) : null}
                  </div>
                </div>
                <ChevronRight className="mt-0.5 size-4 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:text-[#2c6ecb]" />
              </button>
            ))
          )}
        </div>
      </section>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="flex max-h-[min(92vh,680px)] w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-lg">
          <DialogHeader className="shrink-0 border-b border-[#ebebeb] px-5 py-4 text-left">
            <DialogTitle className={dashboardTaskTitleClass}>
              {editingId ? "Edit contact" : "Add contact"}
            </DialogTitle>
            <DialogDescription className={dashboardTaskDetailClass}>
              Saved under {customer.company}. You&apos;ll be able to attach
              contacts when sending estimates and invoices.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
            <p className="text-xs text-[#8a8a8a]">
              <span className="font-medium text-[#303030]">*</span> Required
            </p>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                Name *
              </Label>
              <Input
                value={draft.name}
                onChange={(event) => {
                  setDraft((current) => ({
                    ...current,
                    name: event.target.value,
                  }));
                  if (draftError) setDraftError(null);
                }}
                className="h-9 rounded-lg border-[#e3e3e3]"
                autoFocus
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                  Email
                </Label>
                <Input
                  type="email"
                  value={draft.email}
                  onChange={(event) => {
                    setDraft((current) => ({
                      ...current,
                      email: event.target.value,
                    }));
                    if (draftError) setDraftError(null);
                  }}
                  className="h-9 rounded-lg border-[#e3e3e3]"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                  Phone
                </Label>
                <Input
                  type="tel"
                  value={draft.phone}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      phone: event.target.value,
                    }))
                  }
                  className="h-9 rounded-lg border-[#e3e3e3]"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                  Department{" "}
                  <span className="font-normal normal-case tracking-normal text-[#a0a0a0]">
                    (optional)
                  </span>
                </Label>
                <Input
                  value={draft.department}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      department: event.target.value,
                    }))
                  }
                  className="h-9 rounded-lg border-[#e3e3e3]"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                  Position{" "}
                  <span className="font-normal normal-case tracking-normal text-[#a0a0a0]">
                    (optional)
                  </span>
                </Label>
                <Input
                  value={draft.position}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      position: event.target.value,
                    }))
                  }
                  className="h-9 rounded-lg border-[#e3e3e3]"
                />
              </div>
            </div>

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
                  const entry = savedContacts.find(
                    (item) => item.id === editingId
                  );
                  if (entry) setDeleteTarget(entry);
                }}
                disabled={saving || deleting}
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
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="button"
                className={cn(
                  dashboardPrimaryButtonClass,
                  "h-9 min-w-[120px] justify-center disabled:opacity-60"
                )}
                onClick={() => void saveDraft()}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    Saving…
                  </>
                ) : editingId ? (
                  "Save contact"
                ) : (
                  "Add contact"
                )}
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
              Delete contact?
            </DialogTitle>
            <DialogDescription className={dashboardTaskDetailClass}>
              Remove {deleteTarget?.name} from {customer.company}. This does not
              change past estimates or invoices.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className={cn(dashboardControlClass, "h-9")}
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="h-9 rounded-lg bg-[#b42318] text-white hover:bg-[#912018]"
              onClick={() => void confirmDelete()}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Deleting…
                </>
              ) : (
                "Delete contact"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
