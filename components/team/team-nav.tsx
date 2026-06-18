"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, LogOut, MessageSquare, Users } from "lucide-react";
import { MarketingLogoLink } from "@/components/marketing/marketing-logo";
import { useAuth } from "@/components/providers/auth-provider";
import { teamPortalPath } from "@/lib/team-portal";
import { cn } from "@/lib/utils";
import { canManagePlatformTeam } from "@/lib/platform-team";

const NAV: {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact: boolean;
  managerOnly?: boolean;
}[] = [
  { href: teamPortalPath(), label: "Dashboard", icon: LayoutDashboard, exact: true },
  {
    href: teamPortalPath("/tickets"),
    label: "Feedback inbox",
    icon: MessageSquare,
    exact: false,
  },
  {
    href: teamPortalPath("/members"),
    label: "Team",
    icon: Users,
    exact: false,
    managerOnly: true,
  },
];

export function TeamNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, signOut } = useAuth();
  const showManagerNav = canManagePlatformTeam(profile);
  const navItems = NAV.filter((item) => !item.managerOnly || showManagerNav);

  return (
    <>
    <header className="fixed inset-x-0 top-0 z-[100] border-b border-slate-200/80 bg-white/95 backdrop-blur-md supports-[backdrop-filter]:bg-white/80">
      <div className="container-marketing flex h-[60px] items-center justify-between gap-4 px-6 sm:px-8 lg:px-10">
        <div className="flex min-w-0 items-center gap-6">
          <MarketingLogoLink />
          <span className="hidden rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-brand-muted sm:inline">
            Team
          </span>
          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => {
              const active = item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-brand-ink text-white"
                      : "text-brand-muted hover:bg-slate-100 hover:text-brand-ink"
                  )}
                >
                  <Icon className="size-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {user?.email && (
            <span className="hidden max-w-[180px] truncate text-sm text-brand-muted sm:inline">
              {user.email}
            </span>
          )}
          <button
            type="button"
            onClick={async () => {
              await signOut();
              router.replace(teamPortalPath("/login"));
            }}
            className="inline-flex h-9 items-center gap-2 rounded-full border border-slate-200 px-3.5 text-sm font-medium text-brand-ink transition-colors hover:bg-slate-50"
          >
            <LogOut className="size-3.5" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </div>
    </header>
    <nav className="fixed inset-x-0 top-[60px] z-[99] border-b border-slate-200/80 bg-white/95 px-4 py-2 backdrop-blur-md md:hidden">
      <div className="flex gap-2">
        {navItems.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-medium transition-colors",
                active
                  ? "bg-brand-ink text-white"
                  : "text-brand-muted hover:bg-slate-100 hover:text-brand-ink"
              )}
            >
              <Icon className="size-3.5" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
    </>
  );
}
