"use client";

import { Bell, Menu, Search } from "lucide-react";
import { NewOrderButton } from "@/components/providers/new-order-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ShopBrandMark } from "@/components/branding/shop-brand-mark";
import { StaffMobileNav } from "@/components/layout/staff-mobile-nav";

interface StaffHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function StaffHeader({ title, description, action }: StaffHeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-white/90 backdrop-blur-md supports-[backdrop-filter]:bg-white/80">
      <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3 min-w-0">
          <Sheet>
            <SheetTrigger
              render={
                <Button variant="outline" size="icon" className="lg:hidden shrink-0" />
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

          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold tracking-tight text-brand-ink sm:text-xl">
              {title}
            </h1>
            {description && (
              <p className="hidden text-sm text-brand-muted sm:block">
                {description}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search orders, customers..."
              className="w-64 pl-9 bg-muted/50 border-transparent focus-visible:border-input"
            />
          </div>
          <Button variant="outline" size="icon" className="hidden sm:flex">
            <Bell className="size-4" />
          </Button>
          {action !== undefined ? action : <NewOrderButton label="New Order" />}
        </div>
      </div>
    </header>
  );
}
