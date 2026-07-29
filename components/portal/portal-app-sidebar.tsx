"use client";

import { usePathname, useRouter } from "next/navigation";
import { LogOut, Settings } from "lucide-react";
import { PortalNavLinks } from "@/components/portal/portal-nav-links";
import { usePortalPaths } from "@/components/portal/portal-paths";
import { useAuth } from "@/components/providers/auth-provider";
import { staffNav } from "@/lib/staff-nav-theme";
import { cn } from "@/lib/utils";

export function PortalAppSidebar({
  previewMode = false,
}: {
  previewMode?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const paths = usePortalPaths();
  const { signOut } = useAuth();
  const settingsActive = paths.business
    ? pathname.startsWith(paths.business())
    : false;

  return (
    <aside
      className={cn(
        "hidden lg:flex lg:w-[240px] lg:shrink-0 lg:flex-col border-r",
        staffNav.sidebar,
        staffNav.sidebarBorder
      )}
    >
      <div className="scroll-pane min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-2 py-3">
        <PortalNavLinks />
      </div>

      <div className={cn("shrink-0 space-y-0.5 border-t p-2", staffNav.sidebarBorder)}>
        <button
          type="button"
          onClick={() => router.push(paths.business())}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors",
            settingsActive ? staffNav.linkActive : staffNav.link
          )}
        >
          <Settings className="size-[18px] shrink-0 opacity-90" />
          Account
        </button>
        {!previewMode ? (
          <button
            type="button"
            onClick={async () => {
              await signOut();
              router.push("/portal");
            }}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors",
              staffNav.link
            )}
          >
            <LogOut className="size-[18px] shrink-0 opacity-90" />
            Log out
          </button>
        ) : null}
      </div>
    </aside>
  );
}
