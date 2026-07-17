"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { AppLoadingScreen } from "@/components/ui/app-loading-screen";

export function StaffAuthGate({ children }: { children: React.ReactNode }) {
  const { user, profile, loading, configured, refreshProfile } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const recoveryAttempted = useRef(false);

  useEffect(() => {
    if (loading) return;

    if (!configured) return;

    if (!user) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }

    if (profile?.type === "staff") {
      recoveryAttempted.current = false;
      return;
    }

    if (!profile || profile.type === "none") {
      // Re-resolve tenants once — stale claims can look like "needs registration".
      if (!recoveryAttempted.current) {
        recoveryAttempted.current = true;
        void refreshProfile(true).then((me) => {
          if (me?.type === "staff") return;
          if (me?.type === "none" && me.needsRegistration) {
            router.replace("/register-shop");
          }
        });
        return;
      }

      if (profile?.needsRegistration) {
        router.replace("/register-shop");
      }
    }
  }, [user, profile, loading, configured, router, pathname, refreshProfile]);

  if (!configured) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="max-w-md rounded-2xl border border-border bg-white p-6 text-center shadow-sm">
          <p className="font-medium text-brand-ink">Firebase not configured</p>
          <p className="mt-2 text-sm text-brand-muted">
            Add Firebase keys to <code className="text-xs">frontend/.env.local</code>{" "}
            and redeploy the app.
          </p>
        </div>
      </div>
    );
  }

  if (loading || !user) {
    return <AppLoadingScreen fullScreen label="Loading your workspace…" />;
  }

  if (!profile || profile.type === "none") {
    return (
      <AppLoadingScreen
        fullScreen
        label={
          profile?.needsRegistration
            ? "Setting up your account…"
            : "Loading your workspace…"
        }
      />
    );
  }

  if (profile.type !== "staff") {
    return <AppLoadingScreen fullScreen label="Loading your workspace…" />;
  }

  return children;
}
