"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Settings } from "lucide-react";
import { StaffNavLinks } from "@/components/layout/staff-nav-links";
import { navItems } from "@/components/layout/nav-config";
import { useAuth } from "@/components/providers/auth-provider";
import { staffNav } from "@/lib/staff-nav-theme";
import { cn } from "@/lib/utils";

export function StaffSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useAuth();
  const settingsActive = pathname.startsWith("/app/settings");

  return (
    <aside
      className={cn(
        "hidden lg:flex lg:w-[240px] lg:shrink-0 lg:flex-col border-r",
        staffNav.sidebar,
        staffNav.sidebarBorder
      )}
    >
      <div className="flex-1 min-h-0 overflow-y-auto px-2 py-3">
        <StaffNavLinks />
      </div>

      <div className={cn("shrink-0 space-y-0.5 border-t p-2", staffNav.sidebarBorder)}>
        <Link
          href="/app/settings"
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors",
            settingsActive ? staffNav.linkActive : staffNav.link
          )}
        >
          <Settings className="size-[18px] shrink-0 opacity-90" />
          Settings
        </Link>
        <button
          type="button"
          onClick={async () => {
            await signOut();
            router.push("/login");
          }}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors",
            staffNav.link
          )}
        >
          <LogOut className="size-[18px] shrink-0 opacity-90" />
          Log out
        </button>
      </div>
    </aside>
  );
}

export { navItems as mobileNavItems };
