"use client";

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type ActionState = "idle" | "loading" | "success";

type ProofActionVariant = "primary" | "secondary" | "success" | "muted";

const VARIANT_STYLES: Record<ProofActionVariant, string> = {
  primary:
    "border-brand-primary bg-brand-primary text-white hover:bg-brand-primary/90 disabled:opacity-50",
  secondary:
    "border-[#e3e3e3] bg-white text-[#303030] hover:bg-[#fafafa] disabled:opacity-50",
  success:
    "border-[#86d4a8] bg-[#e8f5ee] text-[#0d5c2e] hover:bg-[#d4eddf] disabled:opacity-100",
  muted:
    "border-[#e3e3e3] bg-white text-[#616161] hover:bg-[#fafafa] hover:text-[#303030]",
};

export function ProofActionButton({
  children,
  onClick,
  disabled = false,
  variant = "secondary",
  className,
  successLabel,
  selected = false,
}: {
  children: React.ReactNode;
  onClick: () => Promise<void> | void;
  disabled?: boolean;
  variant?: ProofActionVariant;
  className?: string;
  successLabel?: string;
  selected?: boolean;
}) {
  const [state, setState] = useState<ActionState>("idle");

  const handleClick = async () => {
    if (disabled || state !== "idle") return;

    setState("loading");
    try {
      await onClick();
      setState("success");
      window.setTimeout(() => setState("idle"), 1100);
    } catch {
      setState("idle");
    }
  };

  const showSuccess = state === "success";
  const showLoading = state === "loading";

  return (
    <button
      type="button"
      disabled={disabled || showLoading}
      onClick={handleClick}
      className={cn(
        "inline-flex h-9 min-w-0 items-center justify-center gap-1.5 rounded-lg border px-3 text-[13px] font-medium transition-all",
        "shadow-[0_1px_0_rgba(26,26,26,0.04),0_1px_2px_rgba(26,26,26,0.05)]",
        "active:scale-[0.98] disabled:active:scale-100",
        showSuccess
          ? VARIANT_STYLES.success
          : selected
            ? VARIANT_STYLES.primary
            : VARIANT_STYLES[variant],
        selected && !showSuccess && !showLoading && "ring-2 ring-[#2c6ecb]/25",
        showSuccess && "ring-2 ring-[#86d4a8]/40",
        className
      )}
    >
      {showLoading ? (
        <Loader2 className="size-3.5 shrink-0 animate-spin" />
      ) : showSuccess ? (
        <Check className="size-3.5 shrink-0 animate-in zoom-in-50 duration-200" />
      ) : null}
      <span className="truncate">
        {showLoading ? "Working…" : showSuccess ? successLabel ?? "Done" : children}
      </span>
    </button>
  );
}
