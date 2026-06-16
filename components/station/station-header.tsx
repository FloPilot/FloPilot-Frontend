"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, Menu, Monitor } from "lucide-react";
import { ShopBrandMark } from "@/components/branding/shop-brand-mark";
import { StaffMobileNav } from "@/components/layout/staff-mobile-nav";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export function StationHeader() {
  const pathname = usePathname();
  const onMachinePage =
    pathname.startsWith("/station/") && pathname !== "/station";

  return (
    <header className="glass sticky top-0 z-30 border-b border-border shrink-0 bg-white/90 backdrop-blur-md">
      <div className="flex h-14 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <Sheet>
            <SheetTrigger
              render={
                <Button
                  variant="outline"
                  size="icon"
                  className="lg:hidden shrink-0"
                />
              }
            >
              <Menu className="size-4" />
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SheetHeader className="border-b px-6 py-4">
                <SheetTitle className="text-left">
                  <ShopBrandMark />
                </SheetTitle>
              </SheetHeader>
              <StaffMobileNav />
            </SheetContent>
          </Sheet>

          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-primary text-white lg:hidden">
              <Monitor className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-brand-ink truncate">
                Station
              </p>
              <p className="text-[11px] text-brand-muted truncate">
                {onMachinePage ? "Floor view" : "Select a machine"}
              </p>
            </div>
          </div>
        </div>

        {onMachinePage && (
          <Link
            href="/station"
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-3.5 h-10 shrink-0",
              "text-sm font-medium text-brand-ink shadow-sm",
              "hover:bg-brand-surface transition-colors"
            )}
          >
            <ArrowLeft className="size-4 shrink-0" />
            <span className="hidden sm:inline">Change station</span>
            <span className="sm:hidden">Back</span>
          </Link>
        )}
      </div>
    </header>
  );
}
