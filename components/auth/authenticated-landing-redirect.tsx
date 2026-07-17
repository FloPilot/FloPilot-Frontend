"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";

/** Signed-in staff skip the marketing page and go straight to the dashboard. */
export function AuthenticatedLandingRedirect() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const router = useRouter();
  const recoveryAttempted = useRef(false);

  useEffect(() => {
    if (loading || !user) return;

    if (profile?.type === "staff") {
      router.replace("/app/dashboard");
      return;
    }

    if (profile?.type === "none" && profile.needsRegistration) {
      if (!recoveryAttempted.current) {
        recoveryAttempted.current = true;
        void refreshProfile(true).then((me) => {
          if (me?.type === "staff") {
            router.replace("/app/dashboard");
            return;
          }
          // Only send truly shop-less accounts to create-shop (signup path).
          if (me?.type === "none" && me.needsRegistration) {
            router.replace("/register-shop");
          }
        });
        return;
      }
      router.replace("/register-shop");
    }
  }, [user, profile, loading, router, refreshProfile]);

  return null;
}
