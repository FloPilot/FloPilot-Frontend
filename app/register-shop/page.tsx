"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronRight, Store } from "lucide-react";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { useAuth } from "@/components/providers/auth-provider";
import { listUserTenants, registerShop } from "@/lib/api";
import { markShopSetupPending } from "@/lib/onboarding";
import {
  persistStaffDisplayName,
  pickStaffDisplayName,
  readStaffDisplayName,
} from "@/lib/staff-display-name";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function slugifyShopName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

/** Best available label for the admin user record — never ask on this form. */
async function resolveAccountAdminName({
  user,
  profile,
  getIdToken,
}: {
  user: NonNullable<ReturnType<typeof useAuth>["user"]>;
  profile: ReturnType<typeof useAuth>["profile"];
  getIdToken: ReturnType<typeof useAuth>["getIdToken"];
}): Promise<string> {
  const tokenResult = await user.getIdTokenResult().catch(() => null);
  const claimName =
    typeof tokenResult?.claims.name === "string"
      ? tokenResult.claims.name
      : "";

  let memberNames: string[] = [];
  try {
    const token = await getIdToken();
    if (token) {
      const { tenants } = await listUserTenants(token);
      memberNames = tenants
        .map((tenant) => tenant.memberName || "")
        .filter(Boolean);
    }
  } catch {
    /* optional */
  }

  const fromAccount = pickStaffDisplayName(
    profile?.type === "staff" ? profile.user.name : null,
    profile?.type === "none" ? profile.name : null,
    claimName,
    user.displayName,
    ...memberNames,
    readStaffDisplayName()
  );
  if (fromAccount) return fromAccount;

  // Last resort for the admin user record — never store a bare email as the
  // person's name (it shows up in greetings like "Welcome, info@…").
  return "Admin";
}

function RegisterShopForm() {
  const { user, profile, getIdToken, refreshProfile, switchShop } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  // From workspace switcher “Create shop” — allow an additional workspace.
  const creatingAdditional = searchParams.get("new") === "1";

  const [shopName, setShopName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [checkingExisting, setCheckingExisting] = useState(!creatingAdditional);

  const suggestedSlug = useMemo(() => slugifyShopName(shopName), [shopName]);

  useEffect(() => {
    if (!user) {
      const next = creatingAdditional
        ? "/register-shop?new=1"
        : "/register-shop";
      router.replace(`/login?next=${encodeURIComponent(next)}`);
    }
  }, [user, router, creatingAdditional]);

  // Signup path only: existing members should never see create-shop.
  // Additional-shop path (`?new=1`) must keep the form open.
  useEffect(() => {
    let cancelled = false;

    async function redirectIfAlreadyInShop() {
      if (!user || creatingAdditional) {
        setCheckingExisting(false);
        return;
      }

      try {
        if (profile?.type === "staff") {
          router.replace("/app/dashboard");
          return;
        }

        const me = await refreshProfile(true);
        if (cancelled) return;
        if (me?.type === "staff") {
          router.replace("/app/dashboard");
          return;
        }

        const token = await getIdToken(true);
        if (!token || cancelled) return;
        const { tenants } = await listUserTenants(token);
        if (cancelled) return;
        if (tenants.length > 0) {
          if (switchShop) {
            await switchShop(tenants[0].tenantId);
          }
          router.replace("/app/dashboard");
          return;
        }
      } catch {
        /* show form if lookup fails */
      } finally {
        if (!cancelled) setCheckingExisting(false);
      }
    }

    void redirectIfAlreadyInShop();
    return () => {
      cancelled = true;
    };
  }, [
    user,
    creatingAdditional,
    profile?.type,
    refreshProfile,
    getIdToken,
    router,
    switchShop,
  ]);

  useEffect(() => {
    if (slugTouched) return;
    setSlug(suggestedSlug);
  }, [suggestedSlug, slugTouched]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      if (!user) throw new Error("Not signed in");
      const token = await getIdToken(true);
      if (!token) throw new Error("Not signed in");

      const adminName = await resolveAccountAdminName({
        user,
        profile,
        getIdToken,
      });

      const result = await registerShop(token, {
        shopName,
        slug: slug.trim() || suggestedSlug || undefined,
        adminName,
      });

      if (result?.user && result.user.role !== "admin") {
        throw new Error(
          "Shop was created but admin access was not assigned. Please contact support."
        );
      }

      if (result.user?.name) persistStaffDisplayName(result.user.name);

      // Claims already point at the new shop; refresh so the session picks it up.
      // switchShop is a no-op if we're already on that tenant after refresh.
      await refreshProfile(true);
      if (result.tenantId && switchShop) {
        await switchShop(result.tenantId);
      }
      markShopSetupPending();
      router.push("/app/dashboard?setup=1");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (!user || checkingExisting) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white text-sm text-brand-muted">
        {!user ? "Redirecting to sign in…" : "Checking your workspace…"}
      </div>
    );
  }

  return (
    <AuthPageShell
      eyebrow={creatingAdditional ? "Add a shop" : "Create a shop"}
      title={creatingAdditional ? "Name your new shop" : "Name your shop"}
      subtitle={
        creatingAdditional
          ? "You’ll be the admin for this workspace. Your other shops stay in the account switcher."
          : "This is how your team and customers will see your workspace. You’ll be the admin for this shop."
      }
      footer={
        <p className="text-xs">
          Creating as admin · signed in as{" "}
          <span className="font-medium text-brand-ink">{user.email}</span>
          {creatingAdditional ? (
            <>
              {" · "}
              <button
                type="button"
                className="font-medium text-brand-ink underline-offset-2 hover:underline"
                onClick={() => router.push("/app/dashboard")}
              >
                Cancel
              </button>
            </>
          ) : null}
        </p>
      }
    >
      <div className="mb-6 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-brand-ink text-white">
          <Store className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-brand-ink">Your new workspace</p>
          <p className="truncate text-xs text-brand-muted">
            {shopName.trim() || "Shop name appears here"}
            {slug.trim() ? (
              <span className="text-brand-muted/80"> · /{slug.trim()}</span>
            ) : null}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="shopName">Shop name</Label>
          <Input
            id="shopName"
            value={shopName}
            onChange={(e) => setShopName(e.target.value)}
            placeholder="FloPilot Print Co."
            className="h-11 rounded-xl"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="slug">
            URL slug{" "}
            <span className="font-normal text-brand-muted">(optional)</span>
          </Label>
          <Input
            id="slug"
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(slugifyShopName(e.target.value));
            }}
            placeholder={suggestedSlug || "your-shop"}
            className="h-11 rounded-xl"
          />
          <p className="text-xs text-brand-muted">
            Auto-fills from your shop name. Edit anytime before creating.
          </p>
        </div>

        {error && (
          <p
            className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700"
            role="alert"
          >
            {error}
          </p>
        )}

        <Button
          type="submit"
          className="h-11 w-full rounded-lg bg-brand-ink text-[15px] font-medium hover:bg-brand-ink/90"
          disabled={submitting}
        >
          {submitting ? (
            "Creating workspace…"
          ) : (
            <>
              Create workspace
              <ChevronRight className="size-4" />
            </>
          )}
        </Button>
      </form>
    </AuthPageShell>
  );
}

export default function RegisterShopPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-white text-sm text-brand-muted">
          Loading…
        </div>
      }
    >
      <RegisterShopForm />
    </Suspense>
  );
}
