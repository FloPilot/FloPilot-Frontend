"use client";

import { Search } from "lucide-react";
import { useStaffSearch } from "@/components/layout/staff-search-provider";
import { cn } from "@/lib/utils";

export function StaffTopBarSearch({
  className,
  placeholder = "Search",
}: {
  className?: string;
  placeholder?: string;
}) {
  const { open, openSearch } = useStaffSearch();

  return (
    <div className={cn("relative w-full", className)}>
      <button
        type="button"
        onClick={openSearch}
        aria-label="Open search"
        aria-expanded={open}
        className={cn(
          "relative w-full text-left transition-opacity duration-150",
          open && "pointer-events-none opacity-0"
        )}
      >
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8c9196]"
          strokeWidth={1.5}
        />
        <span
          className={cn(
            "flex h-[34px] w-full items-center rounded-lg border border-[#3a3a3a] bg-[#303030] pl-9 pr-[4.5rem] text-[13px] text-[#8c9196]",
            "shadow-[inset_0_1px_1px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.06),0_0_0_1px_rgba(255,255,255,0.04)]",
            "transition-[box-shadow,background-color,border-color]",
            "hover:border-[#525252] hover:bg-[#333333]",
            "hover:shadow-[inset_0_1px_1px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.08),0_0_0_1px_rgba(255,255,255,0.06)]"
          )}
        >
          {placeholder}
        </span>
        <div
          className="pointer-events-none absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1"
          aria-hidden
        >
          <kbd className="inline-flex h-[22px] min-w-[22px] items-center justify-center rounded-[6px] border border-[#4a4a4a] bg-[#262626] px-1.5 text-[11px] font-medium leading-none text-[#999999] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
            ⌘
          </kbd>
          <kbd className="inline-flex h-[22px] min-w-[22px] items-center justify-center rounded-[6px] border border-[#4a4a4a] bg-[#262626] px-1.5 text-[11px] font-medium leading-none text-[#999999] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
            K
          </kbd>
        </div>
      </button>
    </div>
  );
}
