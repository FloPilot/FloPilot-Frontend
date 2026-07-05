"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createContractFeeId,
  defaultAdditionalLocationFee,
  defaultSetupFee,
  getAdditionalLocationFee,
  getCustomContractFees,
  getSetupFee,
  upsertContractFee,
} from "@/lib/order-contract-fees";
import {
  dashboardControlClass,
  dashboardInsetSurfaceClass,
  dashboardTaskDetailClass,
  dashboardTaskTitleClass,
} from "@/lib/dashboard-styles";
import type { CustomerContractFee, CustomerNegotiatedRateSheet } from "@/types";
import { cn } from "@/lib/utils";

function FeeToggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-center gap-2 text-[13px] font-medium text-[#303030]">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="size-4 rounded border-[#c9c9c9]"
      />
      {label}
    </label>
  );
}

function MoneyInput({
  value,
  onChange,
  className,
}: {
  value: number;
  onChange: (value: number) => void;
  className?: string;
}) {
  return (
    <Input
      type="number"
      min={0}
      step="0.01"
      value={Number.isFinite(value) ? value : 0}
      onFocus={(event) => event.currentTarget.select()}
      onChange={(event) => onChange(Number(event.target.value) || 0)}
      className={cn("h-9 rounded-lg border-[#e3e3e3]", className)}
    />
  );
}

function ContractFeeCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn(dashboardInsetSurfaceClass, "space-y-3 p-4")}>
      <div>
        <h3 className={dashboardTaskTitleClass}>{title}</h3>
        <p className={cn("mt-0.5", dashboardTaskDetailClass)}>{description}</p>
      </div>
      {children}
    </div>
  );
}

export function CustomerContractFeesEditor({
  sheet,
  onChange,
  currency,
}: {
  sheet: CustomerNegotiatedRateSheet;
  onChange: (sheet: CustomerNegotiatedRateSheet) => void;
  currency: string;
}) {
  const setupFee = getSetupFee(sheet) ?? defaultSetupFee();
  const locationFee =
    getAdditionalLocationFee(sheet) ?? defaultAdditionalLocationFee();
  const customFees = getCustomContractFees(sheet);

  const updateSetup = (patch: Partial<CustomerContractFee>) => {
    onChange(upsertContractFee(sheet, { ...setupFee, ...patch }));
  };

  const updateLocation = (patch: Partial<CustomerContractFee>) => {
    onChange(upsertContractFee(sheet, { ...locationFee, ...patch }));
  };

  const updateCustomFee = (id: string, patch: Partial<CustomerContractFee>) => {
    const next = (sheet.contractFees ?? []).map((fee) =>
      fee.id === id ? { ...fee, ...patch } : fee
    );
    onChange({ ...sheet, contractFees: next });
  };

  const addCustomFee = () => {
    onChange({
      ...sheet,
      contractFees: [
        ...(sheet.contractFees ?? []),
        {
          id: createContractFeeId(),
          kind: "custom",
          label: "Other fee",
          amount: 0,
          chargeMode: "per_order",
          enabled: true,
        },
      ],
    });
  };

  const removeCustomFee = (id: string) => {
    onChange({
      ...sheet,
      contractFees: (sheet.contractFees ?? []).filter((fee) => fee.id !== id),
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className={dashboardTaskTitleClass}>Contract fees</h3>
        <p className={cn("mt-0.5", dashboardTaskDetailClass)}>
          Setup and location surcharges auto-apply on orders using this rate
          sheet. Staff can still add one-off fees on the estimate.
        </p>
      </div>

      <ContractFeeCard
        title="Setup fee"
        description="One-time charge per order — e.g. screen or digitizing setup."
      >
        <FeeToggle
          label="Apply setup fee on new orders"
          checked={setupFee.enabled}
          onChange={(enabled) => updateSetup({ enabled })}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
              Label
            </Label>
            <Input
              value={setupFee.label}
              onChange={(event) => updateSetup({ label: event.target.value })}
              className="h-9 rounded-lg border-[#e3e3e3]"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
              Amount ({currency})
            </Label>
            <MoneyInput
              value={setupFee.amount}
              onChange={(amount) => updateSetup({ amount })}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
            Notes
          </Label>
          <Textarea
            value={setupFee.notes ?? ""}
            onChange={(event) => updateSetup({ notes: event.target.value })}
            rows={2}
            className="rounded-lg border-[#e3e3e3]"
          />
        </div>
      </ContractFeeCard>

      <ContractFeeCard
        title="Additional locations"
        description="Charge per imprint beyond the included count — tiered by order quantity."
      >
        <FeeToggle
          label="Apply additional location fees"
          checked={locationFee.enabled}
          onChange={(enabled) => updateLocation({ enabled })}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
              Label
            </Label>
            <Input
              value={locationFee.label}
              onChange={(event) => updateLocation({ label: event.target.value })}
              className="h-9 rounded-lg border-[#e3e3e3]"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
              Locations included in base rate
            </Label>
            <Input
              type="number"
              min={0}
              step={1}
              value={locationFee.includedLocations ?? 2}
              onFocus={(event) => event.currentTarget.select()}
              onChange={(event) =>
                updateLocation({
                  includedLocations: Math.max(0, Number(event.target.value) || 0),
                })
              }
              className="h-9 rounded-lg border-[#e3e3e3]"
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
              Qty tiers ({currency} per extra location)
            </Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-[12px]"
              onClick={() =>
                updateLocation({
                  quantityTiers: [
                    ...(locationFee.quantityTiers ?? []),
                    { minQty: 72, amount: locationFee.amount || 0 },
                  ],
                })
              }
            >
              <Plus className="size-3.5" />
              Add tier
            </Button>
          </div>
          <div className="space-y-2">
            {(locationFee.quantityTiers ?? []).map((tier, index) => (
              <div key={`${tier.minQty}-${index}`} className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  value={tier.minQty}
                  onFocus={(event) => event.currentTarget.select()}
                  onChange={(event) => {
                    const tiers = [...(locationFee.quantityTiers ?? [])];
                    tiers[index] = {
                      ...tiers[index],
                      minQty: Math.max(1, Number(event.target.value) || 1),
                    };
                    updateLocation({ quantityTiers: tiers });
                  }}
                  className="h-9 w-28 rounded-lg border-[#e3e3e3]"
                  placeholder="Min qty"
                />
                <span className="text-[12px] text-[#8a8a8a]">pcs →</span>
                <MoneyInput
                  value={tier.amount}
                  onChange={(amount) => {
                    const tiers = [...(locationFee.quantityTiers ?? [])];
                    tiers[index] = { ...tiers[index], amount };
                    updateLocation({ quantityTiers: tiers });
                  }}
                  className="w-28"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 text-[#8f1f1f]"
                  onClick={() =>
                    updateLocation({
                      quantityTiers: (locationFee.quantityTiers ?? []).filter(
                        (_, rowIndex) => rowIndex !== index
                      ),
                    })
                  }
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            ))}
            {(locationFee.quantityTiers ?? []).length === 0 ? (
              <p className={dashboardTaskDetailClass}>
                No tiers yet — uses flat amount of {locationFee.amount.toFixed(2)}.
              </p>
            ) : null}
          </div>
        </div>
      </ContractFeeCard>

      {customFees.length > 0 ? (
        <div className="space-y-3">
          <h4 className="text-[13px] font-semibold text-[#303030]">Other fees</h4>
          {customFees.map((fee) => (
            <div
              key={fee.id}
              className={cn(dashboardInsetSurfaceClass, "grid gap-3 p-4 sm:grid-cols-[1fr_120px_auto]")}
            >
              <Input
                value={fee.label}
                onChange={(event) =>
                  updateCustomFee(fee.id, { label: event.target.value })
                }
                className="h-9 rounded-lg border-[#e3e3e3]"
              />
              <MoneyInput
                value={fee.amount}
                onChange={(amount) => updateCustomFee(fee.id, { amount })}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-9 text-[#8f1f1f]"
                onClick={() => removeCustomFee(fee.id)}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      ) : null}

      <Button
        type="button"
        variant="outline"
        className={cn(dashboardControlClass, "h-9 gap-1.5 px-3 text-[13px]")}
        onClick={addCustomFee}
      >
        <Plus className="size-3.5" />
        Add other fee
      </Button>
    </div>
  );
}
