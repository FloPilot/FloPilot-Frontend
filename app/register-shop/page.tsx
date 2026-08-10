"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { RegisterShopForm } from "@/components/auth/register-shop-form";
import { AppLoadingScreen } from "@/components/ui/app-loading-screen";

/**
 * First-time signup path: create the user’s initial shop after Create account.
 * Existing staff who land here are sent to the dashboard by the form.
 * To add another shop, use /new-shop (workspace switcher → Create shop).
 */
function RegisterShopPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Legacy link from older builds — keep create-another working.
  useEffect(() => {
    if (searchParams.get("new") === "1") {
      router.replace("/new-shop");
    }
  }, [searchParams, router]);

  if (searchParams.get("new") === "1") {
    return <AppLoadingScreen fullScreen label="Opening create shop…" />;
  }

  return <RegisterShopForm intent="onboarding" />;
}

export default function RegisterShopPage() {
  return (
    <Suspense
      fallback={<AppLoadingScreen fullScreen label="Loading…" />}
    >
      <RegisterShopPageInner />
    </Suspense>
  );
}
