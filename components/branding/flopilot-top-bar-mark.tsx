"use client";

import Link from "next/link";
import { Boxes } from "lucide-react";
import { FLOPILOT_APP_VERSION } from "@/lib/app-version";
import { cn } from "@/lib/utils";

export function FloPilotTopBarMark({
  className,
  variant = "dark",
}: {
  className?: string;
  variant?: "dark" | "light";
}) {
  const onDark = variant === "dark";

  return (
    <Link
      href="/app/dashboard"
      className={cn(
        "group flex shrink-0 items-center gap-2 rounded-md px-1.5 py-1 transition-colors",
        onDark ? "hover:bg-[#303030]" : "hover:bg-black/5",
        className
      )}
    >
      <span
        className={cn(
          "flex size-[26px] shrink-0 items-center justify-center rounded-[7px] shadow-[0_0_0_1px_rgba(255,255,255,0.12),0_1px_2px_rgba(0,0,0,0.35)]",
          onDark ? "bg-white text-[#303030]" : "bg-[#303030] text-white"
        )}
      >
        <Boxes className="size-3.5" strokeWidth={2.25} />
      </span>
      <span className="hidden sm:flex sm:flex-col sm:leading-none">
        <span
          className={cn(
            "text-[1.0625rem] font-bold tracking-[-0.03em]",
            onDark ? "text-white" : "text-[#303030]"
          )}
        >
          FloPilot
        </span>
        <span
          className={cn(
            "mt-0.5 text-[9px] font-medium uppercase tracking-[0.14em]",
            onDark ? "text-white/40" : "text-[#8c9196]"
          )}
        >
          {FLOPILOT_APP_VERSION}
        </span>
      </span>
    </Link>
  );
}
