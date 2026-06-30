"use client";

import { customerInitials } from "@/lib/customer-list-summary";
import {
  getCustomerAccent,
} from "@/lib/production-customer-colors";
import type { Customer } from "@/types";
import { cn } from "@/lib/utils";

const SIZE_CLASS = {
  xs: "size-5 text-[9px] rounded-md",
  sm: "size-8 text-[11px] rounded-md",
  md: "size-9 text-xs rounded-lg",
  lg: "size-11 text-sm rounded-lg",
  xl: "size-16 text-base rounded-lg",
} as const;

export function CustomerBrandMark({
  company,
  logoUrl,
  accentColorKey,
  customerId,
  fallbackKey = "",
  size = "md",
  className,
}: {
  company: string;
  logoUrl?: string | null;
  accentColorKey?: string | null;
  customerId?: string;
  fallbackKey?: string;
  size?: keyof typeof SIZE_CLASS;
  className?: string;
}) {
  const accent = getCustomerAccent(
    customerId,
    fallbackKey || company,
    accentColorKey
  );
  const initials = customerInitials(company || "?");

  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden border font-semibold leading-none text-white",
        logoUrl ? "border-[#e3e3e3] bg-white" : cn("border-transparent", accent.cap),
        SIZE_CLASS[size],
        className
      )}
    >
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl}
          alt={`${company || "Customer"} logo`}
          className="size-full object-contain p-0.5"
        />
      ) : (
        initials
      )}
      {logoUrl ? (
        <span
          aria-hidden
          className={cn(
            "absolute bottom-0 right-0 size-2 rounded-full ring-2 ring-white",
            accent.dot
          )}
        />
      ) : null}
    </div>
  );
}

export function CustomerBrandMarkFromRecord({
  customer,
  fallbackKey = "",
  size = "md",
  className,
}: {
  customer: Pick<
    Customer,
    "id" | "company" | "logoUrl" | "accentColorKey"
  >;
  fallbackKey?: string;
  size?: keyof typeof SIZE_CLASS;
  className?: string;
}) {
  return (
    <CustomerBrandMark
      company={customer.company}
      logoUrl={customer.logoUrl}
      accentColorKey={customer.accentColorKey}
      customerId={customer.id}
      fallbackKey={fallbackKey || customer.id}
      size={size}
      className={className}
    />
  );
}
