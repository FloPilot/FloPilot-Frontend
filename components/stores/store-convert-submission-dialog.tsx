"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  LabeledSelectValue,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  convertClientStoreSubmission,
  getCustomer,
} from "@/lib/api";
import type { ClientStoreSubmission } from "@/lib/client-stores";
import {
  dashboardControlClass,
  dashboardGhostButtonClass,
  dashboardPrimaryButtonClass,
  dashboardTaskDetailClass,
} from "@/lib/dashboard-styles";
import { formatCurrency } from "@/lib/format";
import { sortSubCustomers } from "@/lib/sub-customers";
import type { Order, SubCustomer } from "@/types";
import { cn } from "@/lib/utils";

type EndBusinessMode = "none" | "existing" | "from_shopper";

export function StoreConvertSubmissionDialog({
  open,
  onOpenChange,
  submission,
  customerId,
  onConverted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  submission: ClientStoreSubmission | null;
  customerId: string;
  onConverted: (result: {
    submission: ClientStoreSubmission;
    order: Order;
  }) => void;
}) {
  const { getIdToken } = useAuth();
  const [subCustomers, setSubCustomers] = useState<SubCustomer[]>([]);
  const [loadingCustomer, setLoadingCustomer] = useState(false);
  const [mode, setMode] = useState<EndBusinessMode>("none");
  const [subCustomerId, setSubCustomerId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !customerId) return;
    let cancelled = false;
    setLoadingCustomer(true);
    setError(null);
    setMode("none");
    setSubCustomerId("");

    void (async () => {
      try {
        const token = await getIdToken();
        if (!token || cancelled) return;
        const res = await getCustomer(token, customerId);
        if (cancelled) return;
        setSubCustomers(sortSubCustomers(res.customer.subCustomers || []));
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Could not load customer."
          );
        }
      } finally {
        if (!cancelled) setLoadingCustomer(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, customerId, getIdToken]);

  const endBusinessOptions = useMemo(
    () => [
      { value: "none", label: "General account order" },
      ...subCustomers.map((entry) => ({
        value: entry.id,
        label: entry.name,
      })),
      {
        value: "__from_shopper__",
        label: submission
          ? `Create “${submission.shopper.name}” as end business`
          : "Create from shopper",
      },
    ],
    [subCustomers, submission]
  );

  const selectValue =
    mode === "from_shopper"
      ? "__from_shopper__"
      : mode === "existing" && subCustomerId
        ? subCustomerId
        : "none";

  async function handleConvert() {
    if (!submission) return;
    setSubmitting(true);
    setError(null);
    try {
      const token = await getIdToken();
      if (!token) throw new Error("Not signed in");
      const result = await convertClientStoreSubmission(token, {
        submissionId: submission.id,
        subCustomerId:
          mode === "existing" && subCustomerId ? subCustomerId : undefined,
        createSubCustomerFromShopper: mode === "from_shopper",
      });
      onConverted(result);
      onOpenChange(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not create the order."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg gap-0 p-0 sm:max-w-lg">
        <DialogHeader className="border-b border-[#ebebeb] px-5 py-4 text-left">
          <DialogTitle className="text-[16px] font-semibold text-[#303030]">
            Create sales order
          </DialogTitle>
          <DialogDescription className={cn(dashboardTaskDetailClass, "mt-1")}>
            Review this storefront request, optionally assign an end business,
            then create a draft order in Orders.
          </DialogDescription>
        </DialogHeader>

        {submission ? (
          <div className="space-y-5 px-5 py-4">
            <div className="rounded-lg border border-[#ebebeb] bg-[#fafafa] px-3.5 py-3">
              <p className="text-[13px] font-semibold text-[#303030]">
                {submission.shopper.name}
              </p>
              <p className="mt-0.5 text-[12px] text-[#8a8a8a]">
                {[submission.shopper.email, submission.shopper.phone]
                  .filter(Boolean)
                  .join(" · ") || "No contact"}
              </p>
              <ul className="mt-3 space-y-1 border-t border-[#ebebeb] pt-3">
                {submission.items.map((item, index) => (
                  <li
                    key={`${submission.id}-convert-${index}`}
                    className="flex items-baseline justify-between gap-3 text-[12px] text-[#616161]"
                  >
                    <span>
                      {item.qty}× {item.productName}
                      {item.color ? ` · ${item.color}` : ""} · {item.size}
                    </span>
                    <span className="shrink-0 tabular-nums text-[#303030]">
                      {formatCurrency(item.lineTotal)}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex items-center justify-between border-t border-[#ebebeb] pt-3 text-[13px]">
                <span className="text-[#616161]">Subtotal</span>
                <span className="font-semibold tabular-nums text-[#303030]">
                  {formatCurrency(submission.subtotal)}
                </span>
              </div>
              {submission.shopper.notes ? (
                <p className="mt-2 text-[12px] text-[#8a8a8a]">
                  Note: {submission.shopper.notes}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <label
                htmlFor="convert-end-business"
                className="text-[13px] font-medium text-[#303030]"
              >
                End business
              </label>
              <Select
                value={selectValue}
                disabled={loadingCustomer || submitting}
                onValueChange={(value) => {
                  const next = value ?? "none";
                  if (next === "__from_shopper__") {
                    setMode("from_shopper");
                    setSubCustomerId("");
                    return;
                  }
                  if (next === "none") {
                    setMode("none");
                    setSubCustomerId("");
                    return;
                  }
                  setMode("existing");
                  setSubCustomerId(next);
                }}
              >
                <SelectTrigger
                  id="convert-end-business"
                  className={cn(dashboardControlClass, "h-10 w-full")}
                >
                  <LabeledSelectValue
                    value={selectValue}
                    options={endBusinessOptions}
                    placeholder="General account order"
                  />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">General account order</SelectItem>
                  {subCustomers.map((entry) => (
                    <SelectItem key={entry.id} value={entry.id}>
                      {entry.name}
                    </SelectItem>
                  ))}
                  <SelectItem value="__from_shopper__">
                    Create “{submission.shopper.name}” as end business
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className={dashboardTaskDetailClass}>
                Orders stay on the store’s billing customer. End business is
                optional for brokers or per-shopper accounts.
              </p>
            </div>

            {error ? (
              <p className="text-[13px] text-[#8f1f1f]">{error}</p>
            ) : null}
          </div>
        ) : null}

        <div className="flex items-center justify-end gap-2 border-t border-[#ebebeb] px-5 py-3">
          <Button
            type="button"
            variant="ghost"
            className={dashboardGhostButtonClass}
            disabled={submitting}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className={dashboardPrimaryButtonClass}
            disabled={!submission || submitting || loadingCustomer}
            onClick={() => void handleConvert()}
          >
            {submitting ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Creating…
              </>
            ) : (
              "Create draft order"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
