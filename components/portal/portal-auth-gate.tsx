"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { AppLoadingScreen } from "@/components/ui/app-loading-screen";

export function PortalAuthGate({ children }: { children: React.ReactNode }) {
  const { user, profile, loading, configured, refreshProfile } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading || !configured) return;

    if (!user) {
      router.replace(`/portal/login?next=${encodeURIComponent(pathname)}`);
      return;
    }

    if (profile?.type === "portal") return;

    if (profile?.type === "staff") {
      // Staff users can open portal only after switching to a portal membership.
      void refreshProfile(true).then((me) => {
        if (me?.type === "portal") return;
        router.replace("/portal");
      });
      return;
    }

    if (profile?.type === "none") {
      router.replace(`/portal/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [user, profile, loading, configured, router, pathname, refreshProfile]);

  if (!configured) {
    return (
      <div className="flex min-h-dvh items-center justify-center p-8">
        <div className="max-w-md rounded-2xl border border-[#ebebeb] bg-white p-6 text-center shadow-sm">
          <p className="font-medium text-[#303030]">Firebase not configured</p>
          <p className="mt-2 text-sm text-[#616161]">
            Add Firebase keys to continue using the customer portal.
          </p>
        </div>
      </div>
    );
  }

  if (loading || !user || profile?.type !== "portal") {
    return <AppLoadingScreen fullScreen label="Opening your portal…" />;
  }

  return children;
}
