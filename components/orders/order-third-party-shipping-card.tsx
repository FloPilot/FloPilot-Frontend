"use client";

import Link from "next/link";
import { CreditCard } from "lucide-react";
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
  dashboardControlClass,
  dashboardInsetSurfaceClass,
  dashboardTaskDetailClass,
} from "@/lib/dashboard-styles";
import {
  accountsMatchOrderSnapshot,
  formatThirdPartyAccountTitle,
  normalizeOrderThirdPartyAccount,
  resolveCustomerThirdPartyAccounts,
  snapshotOrderThirdPartyAccount,
  THIRD_PARTY_BILLING_TYPES,
  THIRD_PARTY_CARRIERS,
  thirdPartyBillingTypeLabel,
  thirdPartyCarrierLabel,
} from "@/lib/third-party-shipping";
import type {
  Customer,
  OrderThirdPartyShippingAccount,
  ThirdPartyBillingType,
  ThirdPartyShippingCarrier,
} from "@/types";
import { cn } from "@/lib/utils";

const NONE_VALUE = "__none__";
const CUSTOM_VALUE = "__custom__";

export function OrderThirdPartyShippingCard({
  customer,
  value,
  onChange,
  disabled,
  controlClassName,
}: {
  customer?: Customer | null;
  value: OrderThirdPartyShippingAccount | null | undefined;
  onChange: (next: OrderThirdPartyShippingAccount | null) => void;
  disabled?: boolean;
  controlClassName?: string;
}) {
  const accounts = resolveCustomerThirdPartyAccounts(customer);
  const current = normalizeOrderThirdPartyAccount(value);
  const matchedAccount = accounts.find((account) =>
    accountsMatchOrderSnapshot(account, current)
  );

  const selectValue = !current
    ? NONE_VALUE
    : matchedAccount
      ? matchedAccount.id
      : CUSTOM_VALUE;

  const fieldClass = cn(
    dashboardControlClass,
    "h-10",
    controlClassName
  );

  const patch = (partial: Partial<OrderThirdPartyShippingAccount>) => {
    const base: OrderThirdPartyShippingAccount = current ?? {
      carrier: "ups",
      accountNumber: "",
      billingPostalCode: "",
      billingType: "third_party",
      billingCountry: "US",
      customerAccountId: null,
    };
    onChange(
      normalizeOrderThirdPartyAccount({
        ...base,
        ...partial,
        customerAccountId: null,
      }) ?? {
        ...base,
        ...partial,
        customerAccountId: null,
      }
    );
  };

  return (
    <div className={cn(dashboardInsetSurfaceClass, "space-y-3.5 rounded-xl p-4")}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <CreditCard className="size-4 text-[#2c6ecb]" />
            <p className="text-[13px] font-semibold text-[#303030]">
              Third-party billing
            </p>
          </div>
          <p className={cn("mt-0.5", dashboardTaskDetailClass)}>
            Bill a customer carrier account on labels. Defaults from the
            customer profile — change freely for this order.
          </p>
        </div>
        {customer ? (
          <Link
            href={`/app/customers/${customer.id}`}
            className="text-[12px] font-medium text-[#2c6ecb] hover:underline"
          >
            Manage on customer
          </Link>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
          Account source
        </Label>
        <Select
          value={selectValue}
          disabled={disabled}
          onValueChange={(next) => {
            if (!next) return;
            if (next === NONE_VALUE) {
              onChange(null);
              return;
            }
            if (next === CUSTOM_VALUE) {
              onChange(
                current
                  ? { ...current, customerAccountId: null }
                  : {
                      carrier: "ups",
                      accountNumber: "",
                      billingPostalCode: "",
                      billingType: "third_party",
                      billingCountry: "US",
                      customerAccountId: null,
                    }
              );
              return;
            }
            const account = accounts.find((entry) => entry.id === next);
            if (account) onChange(snapshotOrderThirdPartyAccount(account));
          }}
        >
          <SelectTrigger className={cn(fieldClass, "justify-between")}>
            <SelectValue placeholder="Select account">
              {selectValue === NONE_VALUE
                ? "Shop pays (no 3rd party)"
                : selectValue === CUSTOM_VALUE
                  ? "Custom for this order"
                  : matchedAccount
                    ? formatThirdPartyAccountTitle(matchedAccount)
                    : "Select account"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent
            side="bottom"
            align="start"
            alignItemWithTrigger={false}
            collisionAvoidance={{ side: "none" }}
          >
            <SelectItem value={NONE_VALUE}>Shop pays (no 3rd party)</SelectItem>
            {accounts.map((account) => (
              <SelectItem key={account.id} value={account.id}>
                {formatThirdPartyAccountTitle(account)}
                {account.isDefault ? " · Default" : ""}
              </SelectItem>
            ))}
            <SelectItem value={CUSTOM_VALUE}>Custom for this order</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {current ? (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                Carrier
              </Label>
              <Select
                value={current.carrier}
                disabled={disabled}
                onValueChange={(next) => {
                  if (!next) return;
                  patch({
                    carrier: next as ThirdPartyShippingCarrier,
                    carrierOther:
                      next === "other" ? current.carrierOther || "" : "",
                  });
                }}
              >
                <SelectTrigger className={cn(fieldClass, "justify-between")}>
                  <SelectValue>
                    {thirdPartyCarrierLabel(
                      current.carrier,
                      current.carrierOther
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent
                  side="bottom"
                  align="start"
                  alignItemWithTrigger={false}
                  collisionAvoidance={{ side: "none" }}
                >
                  {THIRD_PARTY_CARRIERS.map((carrier) => (
                    <SelectItem key={carrier.value} value={carrier.value}>
                      {carrier.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                Billing type
              </Label>
              <Select
                value={current.billingType || "third_party"}
                disabled={disabled}
                onValueChange={(next) => {
                  if (!next) return;
                  patch({ billingType: next as ThirdPartyBillingType });
                }}
              >
                <SelectTrigger className={cn(fieldClass, "justify-between")}>
                  <SelectValue>
                    {thirdPartyBillingTypeLabel(current.billingType)}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent
                  side="bottom"
                  align="start"
                  alignItemWithTrigger={false}
                  collisionAvoidance={{ side: "none" }}
                >
                  {THIRD_PARTY_BILLING_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {current.carrier === "other" ? (
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                Carrier name
              </Label>
              <Input
                value={current.carrierOther || ""}
                disabled={disabled}
                className={fieldClass}
                onChange={(event) =>
                  patch({ carrierOther: event.target.value })
                }
              />
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                Account number
              </Label>
              <Input
                value={current.accountNumber}
                disabled={disabled}
                className={cn(fieldClass, "font-mono")}
                onChange={(event) =>
                  patch({ accountNumber: event.target.value })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                Billing ZIP
              </Label>
              <Input
                value={current.billingPostalCode}
                disabled={disabled}
                className={fieldClass}
                onChange={(event) =>
                  patch({ billingPostalCode: event.target.value })
                }
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                Name on account
              </Label>
              <Input
                value={current.accountName || ""}
                disabled={disabled}
                className={fieldClass}
                onChange={(event) =>
                  patch({ accountName: event.target.value })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                Label
              </Label>
              <Input
                value={current.label || ""}
                disabled={disabled}
                className={fieldClass}
                onChange={(event) => patch({ label: event.target.value })}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
              Notes for this order
            </Label>
            <Textarea
              value={current.notes || ""}
              disabled={disabled}
              rows={2}
              className="min-h-[64px] w-full resize-none rounded-lg border-[#e3e3e3]"
              onChange={(event) => patch({ notes: event.target.value })}
            />
          </div>
        </div>
      ) : accounts.length === 0 && customer ? (
        <p className={dashboardTaskDetailClass}>
          No accounts on file yet.{" "}
          <Link
            href={`/app/customers/${customer.id}`}
            className="font-medium text-[#2c6ecb] hover:underline"
          >
            Add one on the customer
          </Link>{" "}
          or choose custom for this order.
        </p>
      ) : null}
    </div>
  );
}
