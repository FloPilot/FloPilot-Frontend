"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RegisterShopForm } from "@/components/auth/register-shop-form";
import { useAuth } from "@/components/providers/auth-provider";
import { AppLoadingScreen } from "@/components/ui/app-loading-screen";

/**
 * Existing account → create another shop/workspace.
 * Separate from /register-shop (first shop after signup) so the two flows
 * cannot fight over redirects or “Checking your workspace…”.
 */
export default function NewShopPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [waitTimedOut, setWaitTimedOut] = useState(false);

  useEffect(() => {
    if (waitTimedOut) return;
    const timer = window.setTimeout(() => setWaitTimedOut(true), 2500);
    return () => window.clearTimeout(timer);
  }, [waitTimedOut]);

  useEffect(() => {
    if (loading && !waitTimedOut) return;

    if (!user) {
      router.replace(`/login?next=${encodeURIComponent("/new-shop")}`);
      return;
    }

    // No shop yet — use the signup onboarding path instead.
    if (profile?.type === "none" && profile.needsRegistration) {
      router.replace("/register-shop");
      return;
    }

    if (profile?.type === "portal") {
      router.replace("/portal/app");
    }
  }, [loading, waitTimedOut, user, profile, router]);

  if (!user) {
    return (
      <AppLoadingScreen
        fullScreen
        label={loading && !waitTimedOut ? "Loading…" : "Redirecting to sign in…"}
      />
    );
  }

  if (profile?.type === "none" && profile.needsRegistration) {
    return <AppLoadingScreen fullScreen label="Setting up your account…" />;
  }

  if (profile?.type === "portal") {
    return <AppLoadingScreen fullScreen label="Redirecting…" />;
  }

  // Staff users (and fail-open if profile is slow) — create another workspace.
  return <RegisterShopForm intent="additional" cancelHref="/app/dashboard" />;
}
