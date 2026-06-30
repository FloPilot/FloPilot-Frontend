"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export function StationHeader() {
  const pathname = usePathname();
  const onMachinePage =
    pathname.startsWith("/station/") && pathname !== "/station";

  return (
    <div className="border-b border-[#e3e3e3] bg-[#f6f6f7] px-4 py-4 sm:px-6 lg:px-8">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold tracking-tight text-[#303030] sm:text-[1.35rem]">
            Station
          </h1>
          <p className="mt-1 text-sm text-[#616161]">
            {onMachinePage ? "Floor view" : "Select a machine to begin"}
          </p>
        </div>

        {onMachinePage && (
          <Link
            href="/station"
            className={cn(
              "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-[#c9cccf] bg-white px-3",
              "text-[13px] font-medium text-[#303030] shadow-sm",
              "hover:bg-[#fafafa] transition-colors"
            )}
          >
            <ArrowLeft className="size-4 shrink-0" />
            <span className="hidden sm:inline">Change station</span>
            <span className="sm:hidden">Back</span>
          </Link>
        )}
      </div>
    </div>
  );
}
