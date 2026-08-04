"use client";

import { Menu, Search } from "lucide-react";
import { FloPilotTopBarMark } from "@/components/branding/flopilot-top-bar-mark";
import { ShopTopBarIdentity } from "@/components/branding/shop-top-bar-identity";
import { StaffMobileNav } from "@/components/layout/staff-mobile-nav";
import { StaffNotificationsMenu } from "@/components/layout/staff-notifications-menu";
import { useStaffSearch } from "@/components/layout/staff-search-provider";
import { StaffTopBarSearch } from "@/components/layout/staff-top-bar-search";
import { StaffUnsavedChangesBar } from "@/components/layout/staff-unsaved-changes-bar";
import { useStaffUnsavedChanges } from "@/components/layout/staff-unsaved-changes-provider";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { staffNav } from "@/lib/staff-nav-theme";
import { cn } from "@/lib/utils";

function TopBarIconButton({
  className,
  children,
  ...props
}: React.ComponentProps<typeof Button>) {
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      className={cn(staffNav.topBarIcon, className)}
      {...props}
    >
      {children}
    </Button>
  );
}

export function StaffTopBar() {
  const { openSearch, searchAnchorRef, headerRef } = useStaffSearch();
  const { dirty } = useStaffUnsavedChanges();

  return (
    <>
      <header
        ref={headerRef}
        className={cn(
          "relative z-40 grid h-[52px] shrink-0 grid-cols-[1fr_minmax(360px,820px)_1fr] items-center gap-2 px-3 sm:px-4",
          staffNav.topBar
        )}
      >
        <div className="flex min-w-0 items-center justify-self-start gap-1.5">
          <Sheet>
            <SheetTrigger
              render={<TopBarIconButton className="lg:hidden shrink-0" />}
            >
              <Menu className="size-[18px]" strokeWidth={1.75} />
            </SheetTrigger>
            <SheetContent
              side="left"
              className={cn("w-[280px] gap-0 p-0", staffNav.sheet)}
            >
              <SheetHeader className="border-b border-[#d4d4d4] px-4 py-4">
                <SheetTitle className="text-left">
                  <FloPilotTopBarMark variant="light" />
                </SheetTitle>
              </SheetHeader>
              <StaffMobileNav />
            </SheetContent>
          </Sheet>

          <FloPilotTopBarMark />
        </div>

        <div
          ref={searchAnchorRef}
          className="relative hidden h-[34px] w-full justify-self-stretch overflow-hidden px-2 md:block"
        >
          <div
            className={cn(
              "absolute inset-x-2 inset-y-0 transition-[transform,opacity] duration-300 ease-out",
              dirty
                ? "pointer-events-none -translate-y-[120%] opacity-0"
                : "translate-y-0 opacity-100"
            )}
          >
            <StaffTopBarSearch />
          </div>
          <div
            className={cn(
              "absolute inset-x-2 inset-y-0 transition-[transform,opacity] duration-300 ease-out",
              dirty
                ? "translate-y-0 opacity-100"
                : "pointer-events-none translate-y-[120%] opacity-0"
            )}
          >
            <StaffUnsavedChangesBar />
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-self-end gap-0.5 sm:gap-1">
          {!dirty ? (
            <TopBarIconButton className="md:hidden" onClick={openSearch}>
              <Search className="size-[18px]" strokeWidth={1.75} />
            </TopBarIconButton>
          ) : null}

          <StaffNotificationsMenu />

          <span
            className="mx-1 hidden h-5 w-px bg-white/12 sm:block"
            aria-hidden
          />

          <ShopTopBarIdentity />
        </div>
      </header>

      {dirty ? (
        <div className={cn("border-b border-black px-3 py-2 md:hidden", staffNav.topBar)}>
          <StaffUnsavedChangesBar />
        </div>
      ) : null}
    </>
  );
}
