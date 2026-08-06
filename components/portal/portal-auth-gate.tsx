"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { AppLoadingScreen } from "@/components/ui/app-loading-screen";
import { Button } from "@/components/ui/button";

export function PortalAuthGate({ children }: { children: React.ReactNode }) {
  const { user, profile, loading, configured, refreshProfile, signOut } =
    useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const staffHandled = useRef(false);
  const [blockedReason, setBlockedReason] = useState<string | null>(null);

  useEffect(() => {
    if (loading || !configured) return;

    if (!user) {
      setBlockedReason(null);
      router.replace(`/portal/login?next=${encodeURIComponent(pathname)}`);
      return;
    }

    if (profile?.type === "portal") {
      setBlockedReason(null);
      staffHandled.current = false;
      return;
    }

    if (profile?.type === "staff") {
      if (staffHandled.current) {
        setBlockedReason(
          "You're signed in as shop staff. Customer portal needs a customer account."
        );
        return;
      }
      staffHandled.current = true;
      void refreshProfile(true)
        .then((me) => {
          if (me?.type === "portal") return;
          setBlockedReason(
            "You're signed in as shop staff. Sign out to use the customer portal, or open the invite link from the customer's email."
          );
        })
        .catch(() => {
          setBlockedReason(
            "Couldn't open the customer portal with this account."
          );
        });
      return;
    }

    if (profile?.type === "none") {
      setBlockedReason(null);
      router.replace(`/portal/login?next=${encodeURIComponent(pathname)}`);
      return;
    }

    // User is signed in but profile never resolved to portal — don't spin forever.
    if (!loading && user && profile == null) {
      setBlockedReason(
        "We couldn't load your portal membership. Try signing in again from your invite email."
      );
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

  if (blockedReason) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#f6f6f7] px-4">
        <div className="max-w-md rounded-2xl border border-[#ebebeb] bg-white p-8 text-center shadow-sm">
          <p className="text-[18px] font-semibold text-[#303030]">
            Can&apos;t open this portal
          </p>
          <p className="mt-2 text-[14px] text-[#616161]">{blockedReason}</p>
          <div className="mt-6 flex flex-col gap-2">
            <Button
              type="button"
              className="h-11 w-full"
              onClick={() => {
                void signOut().then(() => {
                  router.replace(
                    `/portal/login?next=${encodeURIComponent(pathname)}`
                  );
                });
              }}
            >
              Sign out & try again
            </Button>
            <Link
              href="/portal"
              className="inline-flex h-11 w-full items-center justify-center rounded-md border border-[#e3e3e3] bg-white text-[14px] font-medium text-[#303030] hover:bg-[#fafafa]"
            >
              Back to portal home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (loading || !user || profile?.type !== "portal") {
    return <AppLoadingScreen fullScreen label="Opening your portal…" />;
  }

  return children;
}
