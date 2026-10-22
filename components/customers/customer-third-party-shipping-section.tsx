"use client";

import { useMemo, useState } from "react";
import {
  ChevronRight,
  CreditCard,
  Loader2,
  Plus,
  Star,
  Trash2,
  Truck,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  dashboardCardClass,
  dashboardControlClass,
  dashboardPrimaryButtonClass,
  dashboardSelectContentClass,
  dashboardSelectItemClass,
  dashboardTaskDetailClass,
  dashboardTaskTitleClass,
} from "@/lib/dashboard-styles";
import {
  createThirdPartyAccountId,
  emptyThirdPartyAccountDraft,
  ensureSingleDefaultThirdPartyAccount,
  formatThirdPartyAccountSummary,
  formatThirdPartyAccountTitle,
  normalizeThirdPartyShippingAccount,
  resolveCustomerThirdPartyAccounts,
  sortThirdPartyAccounts,
  THIRD_PARTY_BILLING_TYPES,
  THIRD_PARTY_CARRIERS,
  thirdPartyBillingTypeLabel,
  thirdPartyCarrierLabel,
} from "@/lib/third-party-shipping";
import type { Customer, ThirdPartyShippingAccount } from "@/types";
import { cn } from "@/lib/utils";

type AccountDraft = Omit<ThirdPartyShippingAccount, "id"> & { id?: string };

const fieldLabelClass =
  "text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]";
const fieldInputClass = cn(
  dashboardControlClass,
  "h-10 w-full shadow-none"
);

export function CustomerThirdPartyShippingSection({
  customer,
  onSave,
  variant = "card",
  className,
}: {
  customer: Customer;
  onSave: (accounts: ThirdPartyShippingAccount[]) => Promise<void>;
  variant?: "card" | "compact";
  className?: string;
}) {
  const savedAccounts = useMemo(
    () => resolveCustomerThirdPartyAccounts(customer),
    [customer]
  );

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<AccountDraft>(emptyThirdPartyAccountDraft());
  const [saving, setSaving] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] =
    useState<ThirdPartyShippingAccount | null>(null);
  const [deleting, setDeleting] = useState(false);

  const openNew = () => {
    setEditingId(null);
    setDraft({
      ...emptyThirdPartyAccountDraft(),
      isDefault: savedAccounts.length === 0,
    });
    setDraftError(null);
    setDialogOpen(true);
  };

  const openEdit = (account: ThirdPartyShippingAccount) => {
    setEditingId(account.id);
    setDraft({ ...account });
    setDraftError(null);
    setDialogOpen(true);
  };

  const persist = async (next: ThirdPartyShippingAccount[]) => {
    setSaving(true);
    try {
      await onSave(ensureSingleDefaultThirdPartyAccount(sortThirdPartyAccounts(next)));
    } finally {
      setSaving(false);
    }
  };

  const saveDraft = async () => {
    const normalized = normalizeThirdPartyShippingAccount(
      {
        ...draft,
        id: editingId ?? createThirdPartyAccountId(),
      },
      0
    );
    if (!normalized) {
      setDraftError("Account number and billing ZIP are required.");
      return;
    }

    const withoutEdited = editingId
      ? savedAccounts.filter((entry) => entry.id !== editingId)
      : savedAccounts;
    const clearedDefaults = draft.isDefault
      ? withoutEdited.map((entry) => ({ ...entry, isDefault: false }))
      : withoutEdited;
    const next = sortThirdPartyAccounts([
      ...clearedDefaults,
      { ...normalized, isDefault: draft.isDefault === true },
    ]);

    await persist(next);
    setDialogOpen(false);
    setDraft(emptyThirdPartyAccountDraft());
    setEditingId(null);
    setDraftError(null);
  };

  const deleteAccount = async (accountId: string) => {
    setDeleting(true);
    try {
      await persist(savedAccounts.filter((entry) => entry.id !== accountId));
      setDeleteTarget(null);
      setDialogOpen(false);
      setEditingId(null);
    } finally {
      setDeleting(false);
    }
  };

  const list = (
    <div className="space-y-2">
      {savedAccounts.length === 0 ? (
        <div
          className={cn(
            "rounded-lg border border-dashed border-[#e3e3e3] bg-[#fafafa] px-4 py-6 text-center",
            variant === "compact" && "py-5"
          )}
        >
          <CreditCard className="mx-auto size-6 text-[#c9c9c9]" />
          <p className="mt-2 text-[13px] font-medium text-[#303030]">
            No third-party shipping accounts
          </p>
          <p className={cn("mx-auto mt-1 max-w-sm", dashboardTaskDetailClass)}>
            Save the customer’s UPS / FedEx account # and billing ZIP so new
            orders default to bill their account.
          </p>
        </div>
      ) : (
        savedAccounts.map((account) => (
          <button
            key={account.id}
            type="button"
            onClick={() => openEdit(account)}
            className="group flex w-full items-start justify-between gap-3 rounded-lg border border-[#ebebeb] bg-white px-3.5 py-3 text-left transition-colors hover:border-[#d4d4d4] hover:bg-[#fafafa]"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[13px] font-semibold text-[#303030]">
                  {formatThirdPartyAccountTitle(account)}
                </p>
                {account.isDefault ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#f4f7fd] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#2c6ecb]">
                    <Star className="size-3 fill-current" />
                    Default
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-[12px] leading-relaxed text-[#616161]">
                {formatThirdPartyAccountSummary(account)}
                {account.billingType
                  ? ` · ${thirdPartyBillingTypeLabel(account.billingType)}`
                  : ""}
              </p>
              {account.accountName ? (
                <p className="mt-0.5 text-[12px] text-[#8a8a8a]">
                  {account.accountName}
                </p>
              ) : null}
            </div>
            <ChevronRight className="mt-1 size-4 shrink-0 text-[#8a8a8a] transition-transform group-hover:translate-x-0.5 group-hover:text-[#2c6ecb]" />
          </button>
        ))
      )}
    </div>
  );

  const headerActions = (
    <Button
      type="button"
      size="sm"
      className={cn(dashboardPrimaryButtonClass, "h-8 shrink-0 text-[12px]")}
      onClick={openNew}
    >
      <Plus className="size-3.5" />
      Add account
    </Button>
  );

  const dialog = (
    <Dialog
      open={dialogOpen}
      onOpenChange={(open) => {
        if (!open && (saving || deleting)) return;
        setDialogOpen(open);
        if (!open) {
          setDraftError(null);
          setEditingId(null);
        }
      }}
    >
      <DialogContent className="flex max-h-[min(92vh,760px)] w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden rounded-2xl border border-[#ebebeb] bg-white p-0 shadow-lg sm:max-w-2xl">
        <DialogHeader className="shrink-0 space-y-0 border-b border-[#ebebeb] px-6 py-5 pr-14 text-left">
          <div className="flex items-start gap-3.5">
            <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#f4f7fd] text-[#2c6ecb]">
              <Truck className="size-5" />
            </span>
            <div className="min-w-0">
              <DialogTitle className={dashboardTaskTitleClass}>
                {editingId
                  ? "Edit third-party account"
                  : "Add third-party shipping account"}
              </DialogTitle>
              <DialogDescription
                className={cn("mt-1.5 max-w-xl", dashboardTaskDetailClass)}
              >
                Carriers need the account number and billing ZIP to bill{" "}
                {customer.company || "this customer"} on outbound labels. The
                default copies onto new orders and stays editable per order.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
          <div className="space-y-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
              Account
            </p>
            <div className="space-y-1.5">
              <Label className={fieldLabelClass}>Label</Label>
              <Input
                value={draft.label || ""}
                className={fieldInputClass}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    label: event.target.value,
                  }))
                }
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className={fieldLabelClass}>Carrier</Label>
                <Select
                  value={draft.carrier || "ups"}
                  onValueChange={(value) => {
                    if (!value) return;
                    setDraft((current) => ({
                      ...current,
                      carrier: value as AccountDraft["carrier"],
                      carrierOther:
                        value === "other" ? current.carrierOther || "" : "",
                    }));
                  }}
                >
                  <SelectTrigger className={fieldInputClass}>
                    <SelectValue>
                      {thirdPartyCarrierLabel(
                        draft.carrier,
                        draft.carrierOther
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent
                    side="bottom"
                    align="start"
                    alignItemWithTrigger={false}
                    collisionAvoidance={{ side: "none" }}
                    className={dashboardSelectContentClass}
                  >
                    {THIRD_PARTY_CARRIERS.map((carrier) => (
                      <SelectItem
                        key={carrier.value}
                        value={carrier.value}
                        className={dashboardSelectItemClass}
                      >
                        {carrier.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className={fieldLabelClass}>Billing type</Label>
                <Select
                  value={draft.billingType || "third_party"}
                  onValueChange={(value) => {
                    if (!value) return;
                    setDraft((current) => ({
                      ...current,
                      billingType: value as AccountDraft["billingType"],
                    }));
                  }}
                >
                  <SelectTrigger className={fieldInputClass}>
                    <SelectValue>
                      {thirdPartyBillingTypeLabel(draft.billingType)}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent
                    side="bottom"
                    align="start"
                    alignItemWithTrigger={false}
                    collisionAvoidance={{ side: "none" }}
                    className={dashboardSelectContentClass}
                  >
                    {THIRD_PARTY_BILLING_TYPES.map((type) => (
                      <SelectItem
                        key={type.value}
                        value={type.value}
                        className={dashboardSelectItemClass}
                      >
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {draft.carrier === "other" ? (
              <div className="space-y-1.5">
                <Label className={fieldLabelClass}>Carrier name</Label>
                <Input
                  value={draft.carrierOther || ""}
                  className={fieldInputClass}
                  autoFocus
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      carrierOther: event.target.value,
                    }))
                  }
                />
              </div>
            ) : null}
          </div>

          <div className="space-y-4 border-t border-[#ebebeb] pt-5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
              Billing details
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className={fieldLabelClass}>
                  Account number{" "}
                  <span className="font-normal normal-case tracking-normal text-[#b42318]">
                    *
                  </span>
                </Label>
                <Input
                  value={draft.accountNumber}
                  className={cn(fieldInputClass, "font-mono tracking-wide")}
                  onChange={(event) => {
                    setDraft((current) => ({
                      ...current,
                      accountNumber: event.target.value,
                    }));
                    if (draftError) setDraftError(null);
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <Label className={fieldLabelClass}>
                  Billing ZIP{" "}
                  <span className="font-normal normal-case tracking-normal text-[#b42318]">
                    *
                  </span>
                </Label>
                <Input
                  value={draft.billingPostalCode}
                  className={fieldInputClass}
                  onChange={(event) => {
                    setDraft((current) => ({
                      ...current,
                      billingPostalCode: event.target.value,
                    }));
                    if (draftError) setDraftError(null);
                  }}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-[1fr_7.5rem]">
              <div className="space-y-1.5">
                <Label className={fieldLabelClass}>
                  Name on account{" "}
                  <span className="font-normal normal-case tracking-normal text-[#a0a0a0]">
                    (optional)
                  </span>
                </Label>
                <Input
                  value={draft.accountName || ""}
                  className={fieldInputClass}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      accountName: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label className={fieldLabelClass}>Country</Label>
                <Input
                  value={draft.billingCountry || "US"}
                  className={fieldInputClass}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      billingCountry: event.target.value,
                    }))
                  }
                />
              </div>
            </div>
          </div>

          <div className="space-y-4 border-t border-[#ebebeb] pt-5">
            <div className="space-y-1.5">
              <Label className={fieldLabelClass}>
                Notes{" "}
                <span className="font-normal normal-case tracking-normal text-[#a0a0a0]">
                  (optional)
                </span>
              </Label>
              <Textarea
                value={draft.notes || ""}
                rows={3}
                className="min-h-[88px] resize-y rounded-lg border-[#e3e3e3] bg-white text-[13px] shadow-none"
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    notes: event.target.value,
                  }))
                }
              />
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#d7e3fb] bg-[#f4f7fd] px-4 py-3.5 text-[13px] text-[#616161] transition-colors hover:border-[#c0d2f5]">
              <input
                type="checkbox"
                checked={draft.isDefault === true}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    isDefault: event.target.checked,
                  }))
                }
                className="mt-0.5 size-4 rounded border-[#c9c9c9] text-[#2c6ecb]"
              />
              <span className="min-w-0">
                <span className="flex items-center gap-1.5 font-semibold text-[#303030]">
                  <Star className="size-3.5 text-[#2c6ecb]" />
                  Default for new orders
                </span>
                <span className="mt-1 block text-[12px] leading-relaxed text-[#616161]">
                  Copied onto Shipping when this customer’s orders are created —
                  still editable per order.
                </span>
              </span>
            </label>
          </div>

          {draftError ? (
            <p className="rounded-lg border border-[#f5b5b5] bg-[#fff1f1] px-3.5 py-2.5 text-[13px] font-medium text-[#8f1f1f]">
              {draftError}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-[#ebebeb] bg-[#fafafa] px-6 py-4">
          {editingId ? (
            <Button
              type="button"
              variant="ghost"
              className="h-10 px-2.5 text-[13px] text-[#b42318] hover:bg-[#fff1f1] hover:text-[#b42318]"
              disabled={saving || deleting}
              onClick={() => {
                const account = savedAccounts.find(
                  (entry) => entry.id === editingId
                );
                if (account) setDeleteTarget(account);
              }}
            >
              <Trash2 className="size-3.5" />
              Remove
            </Button>
          ) : (
            <span className="text-[12px] text-[#8a8a8a]">
              <span className="font-medium text-[#b42318]">*</span> Required
            </span>
          )}
          <div className="flex gap-2.5">
            <Button
              type="button"
              variant="outline"
              className={cn(dashboardControlClass, "h-10 px-4")}
              disabled={saving || deleting}
              onClick={() => setDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className={cn(dashboardPrimaryButtonClass, "h-10 px-5")}
              disabled={saving || deleting}
              onClick={() => void saveDraft()}
            >
              {saving ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Saving…
                </>
              ) : editingId ? (
                "Save account"
              ) : (
                "Add account"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  const deleteDialog = (
    <Dialog
      open={deleteTarget !== null}
      onOpenChange={(open) => {
        if (!open && !deleting) setDeleteTarget(null);
      }}
    >
      <DialogContent className="w-[calc(100%-2rem)] gap-0 overflow-hidden rounded-2xl border border-[#ebebeb] bg-white p-0 shadow-lg sm:max-w-md">
        <DialogHeader className="space-y-0 border-b border-[#ebebeb] px-6 py-5 pr-12 text-left">
          <DialogTitle className={dashboardTaskTitleClass}>
            Remove this account?
          </DialogTitle>
          <DialogDescription
            className={cn("mt-1.5", dashboardTaskDetailClass)}
          >
            {deleteTarget
              ? `${formatThirdPartyAccountTitle(deleteTarget)} will no longer
                default onto new orders. Existing orders keep their own copy.`
              : null}
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-2.5 bg-[#fafafa] px-6 py-4">
          <Button
            type="button"
            variant="outline"
            className={cn(dashboardControlClass, "h-10 px-4")}
            disabled={deleting}
            onClick={() => setDeleteTarget(null)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="h-10 rounded-lg bg-[#b42318] px-4 text-[13px] font-medium text-white hover:bg-[#912018]"
            disabled={deleting || !deleteTarget}
            onClick={() => {
              if (deleteTarget) void deleteAccount(deleteTarget.id);
            }}
          >
            {deleting ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Removing…
              </>
            ) : (
              "Remove"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );

  if (variant === "compact") {
    return (
      <div className={cn("space-y-3", className)}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[12px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
              Third-party accounts
            </p>
            <p className={cn("mt-0.5", dashboardTaskDetailClass)}>
              Bill their carrier account on labels
            </p>
          </div>
          {headerActions}
        </div>
        {list}
        {dialog}
        {deleteDialog}
      </div>
    );
  }

  return (
    <section className={cn(dashboardCardClass, className)}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#ebebeb] px-4 py-3.5 sm:px-5">
        <div className="min-w-0">
          <h2 className={dashboardTaskTitleClass}>Third-party shipping</h2>
          <p className={cn("mt-0.5", dashboardTaskDetailClass)}>
            Carrier account # and billing ZIP for collect / third-party labels.
            The default fills onto new orders — editable per order.
          </p>
        </div>
        {headerActions}
      </div>
      <div className="p-4 sm:p-5">{list}</div>
      {dialog}
      {deleteDialog}
    </section>
  );
}
