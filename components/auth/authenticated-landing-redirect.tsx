"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";

/** Signed-in staff skip the marketing page and go straight to the dashboard. */
export function AuthenticatedLandingRedirect() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading || !user) return;

    if (profile?.type === "staff") {
      router.replace("/app/dashboard");
      return;
    }

    if (profile?.type === "none" && profile.needsRegistration) {
      router.replace("/register-shop");
    }
  }, [user, profile, loading, router]);

  return null;
}
