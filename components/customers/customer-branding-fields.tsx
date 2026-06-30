"use client";

import { useRef } from "react";
import { ImageIcon, Trash2, Upload } from "lucide-react";
import { CustomerAccentPicker } from "@/components/customers/customer-accent-picker";
import { CustomerBrandMark } from "@/components/customers/customer-brand-mark";
import {
  dashboardControlClass,
  dashboardGhostButtonClass,
} from "@/lib/dashboard-styles";
import { readImageFileAsDataUrl } from "@/lib/tenant-branding";
import type { CustomerAccentKey } from "@/lib/production-customer-colors";
import { cn } from "@/lib/utils";

export function CustomerBrandingFields({
  company,
  customerId,
  logo,
  onLogoChange,
  accentColorKey,
  onAccentColorKeyChange,
  onError,
}: {
  company: string;
  customerId?: string;
  logo: string | null;
  onLogoChange: (logo: string | null) => void;
  accentColorKey: CustomerAccentKey | null;
  onAccentColorKeyChange: (value: CustomerAccentKey | null) => void;
  onError?: (message: string) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogoPick = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const { dataUrl, error } = await readImageFileAsDataUrl(file);
    if (error) {
      onError?.(error);
      return;
    }
    onLogoChange(dataUrl);
  };

  return (
    <div className="rounded-lg border border-[#ebebeb] bg-[#fafafa] p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="flex items-center gap-3 sm:min-w-[180px]">
          <CustomerBrandMark
            company={company || "Customer"}
            logoUrl={logo}
            accentColorKey={accentColorKey}
            customerId={customerId}
            fallbackKey={company}
            size="xl"
          />
          <div className="min-w-0 sm:hidden">
            <p className="text-[13px] font-medium text-[#303030]">Preview</p>
            <p className="text-[11px] text-[#8a8a8a]">
              How this customer appears on the floor.
            </p>
          </div>
        </div>

        <div className="min-w-0 flex-1 space-y-4">
          <div>
            <p className="text-[13px] font-medium text-[#303030]">Logo</p>
            <p className="mt-0.5 text-[11px] text-[#8a8a8a]">
              Shown on the customer profile and production board.
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".png,.jpg,.jpeg,.webp,.svg"
                className="hidden"
                onChange={handleLogoPick}
              />
              <button
                type="button"
                className={cn(dashboardControlClass, "h-8 text-[12px]")}
                onClick={() => fileInputRef.current?.click()}
              >
                {logo ? (
                  <Upload className="size-3.5" />
                ) : (
                  <ImageIcon className="size-3.5" />
                )}
                {logo ? "Replace logo" : "Upload logo"}
              </button>
              {logo ? (
                <button
                  type="button"
                  className={cn(
                    dashboardGhostButtonClass,
                    "h-8 text-[12px] hover:text-destructive"
                  )}
                  onClick={() => onLogoChange(null)}
                >
                  <Trash2 className="size-3.5" />
                  Remove
                </button>
              ) : null}
              <p className="w-full text-[11px] text-[#8a8a8a]">
                PNG, JPG, WebP, or SVG · under 400 KB.
              </p>
            </div>
          </div>

          <div>
            <p className="text-[13px] font-medium text-[#303030]">
              Accent color
            </p>
            <div className="mt-2">
              <CustomerAccentPicker
                value={accentColorKey}
                onChange={onAccentColorKeyChange}
                customerId={customerId}
                fallbackKey={company}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
