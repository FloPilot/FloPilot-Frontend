"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Settings } from "lucide-react";
import { StaffNavLinks } from "@/components/layout/staff-nav-links";
import { useAuth } from "@/components/providers/auth-provider";
import { staffNav } from "@/lib/staff-nav-theme";
import { cn } from "@/lib/utils";

export function StaffMobileNav({ onNavigate }: { onNavigate?: () => void }) {
  const router = useRouter();
  const { signOut } = useAuth();

  return (
    <div className="flex h-full flex-col">
      <StaffNavLinks onNavigate={onNavigate} className="flex-1 p-2" />
      <div className={cn("space-y-0.5 border-t p-2", staffNav.sidebarBorder)}>
        <Link
          href="/app/settings"
          onClick={onNavigate}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors",
            staffNav.link
          )}
        >
          <Settings className="size-[18px] shrink-0 opacity-80" />
          Settings
        </Link>
        <button
          type="button"
          onClick={async () => {
            onNavigate?.();
            await signOut();
            router.push("/login");
          }}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors",
            staffNav.link
          )}
        >
          <LogOut className="size-[18px] shrink-0 opacity-80" />
          Log out
        </button>
      </div>
    </div>
  );
}
