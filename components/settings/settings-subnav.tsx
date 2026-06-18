"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageSquarePlus, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  {
    href: "/app/settings",
    label: "Workspace",
    icon: Settings2,
    isActive: (pathname: string) =>
      pathname === "/app/settings" || pathname === "/app/settings/",
  },
  {
    href: "/app/settings/feedback",
    label: "Feedback & ideas",
    icon: MessageSquarePlus,
    isActive: (pathname: string) => pathname.startsWith("/app/settings/feedback"),
  },
] as const;

export function SettingsSubnav() {
  const pathname = usePathname();

  return (
    <div className="border-b border-border/50 bg-white/80 px-4 sm:px-6 lg:px-8">
      <nav className="flex gap-1 overflow-x-auto py-2">
        {TABS.map((tab) => {
          const active = tab.isActive(pathname);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-brand-muted hover:bg-accent hover:text-brand-ink"
              )}
            >
              <Icon className="size-4" />
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
