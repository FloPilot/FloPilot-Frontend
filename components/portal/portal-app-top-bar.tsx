"use client";

import { Menu, Search } from "lucide-react";
import { FloPilotTopBarMark } from "@/components/branding/flopilot-top-bar-mark";
import { ShopTopBarIdentity } from "@/components/branding/shop-top-bar-identity";
import { PortalNavLinks } from "@/components/portal/portal-nav-links";
import { useCustomerPortalOptional } from "@/components/portal/customer-portal-provider";
import { usePortalAppOptional } from "@/components/portal/portal-app-provider";
import { usePortalSearch } from "@/components/portal/portal-search-provider";
import { PortalTopBarSearch } from "@/components/portal/portal-top-bar-search";
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

export function PortalAppTopBar({
  previewMode = false,
}: {
  previewMode?: boolean;
}) {
  const tokenPortal = useCustomerPortalOptional();
  const appPortal = usePortalAppOptional();
  const { openSearch, searchAnchorRef, headerRef } = usePortalSearch();
  const shopName =
    tokenPortal?.dashboard?.shop?.name ||
    appPortal?.dashboard?.shop?.name ||
    "Customer portal";
  const customerLabel =
    tokenPortal?.dashboard?.customer?.company ||
    tokenPortal?.dashboard?.customer?.name ||
    appPortal?.dashboard?.customer?.company ||
    appPortal?.dashboard?.customer?.name ||
    null;

  return (
    <header
      ref={headerRef}
      className={cn(
        "relative z-40 grid h-[52px] shrink-0 grid-cols-[1fr_minmax(200px,820px)_1fr] items-center gap-2 px-3 sm:px-4",
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
            <div className="px-2 py-3">
              <PortalNavLinks />
            </div>
          </SheetContent>
        </Sheet>

        <FloPilotTopBarMark />
        <span className="ml-1 hidden rounded-md bg-white/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[#e3e3e3] sm:inline">
          {previewMode ? "Staff preview" : "Customer Portal"}
        </span>
      </div>

      <div
        ref={searchAnchorRef}
        className="hidden w-full justify-self-stretch px-2 md:block"
      >
        <PortalTopBarSearch />
      </div>

      <div className="flex min-w-0 shrink-0 items-center justify-self-end gap-0.5 sm:gap-1">
        <TopBarIconButton className="md:hidden" onClick={openSearch}>
          <Search className="size-[18px]" strokeWidth={1.75} />
        </TopBarIconButton>

        {previewMode ? (
          <div className="hidden min-w-0 text-right sm:block">
            <p className="truncate text-[13px] font-medium text-[#e3e3e3]">
              {shopName}
            </p>
            {customerLabel ? (
              <p className="truncate text-[11px] text-[#8a8a8a]">
                Viewing as {customerLabel}
              </p>
            ) : null}
          </div>
        ) : (
          <ShopTopBarIdentity />
        )}
      </div>
    </header>
  );
}
