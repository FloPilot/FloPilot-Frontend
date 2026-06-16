"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Store } from "lucide-react";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { useAuth } from "@/components/providers/auth-provider";
import { registerShop } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function RegisterShopPage() {
  const { user, getIdToken, refreshProfile } = useAuth();
  const router = useRouter();
  const [shopName, setShopName] = useState("");
  const [slug, setSlug] = useState("");
  const [adminName, setAdminName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) {
      router.replace("/login?next=/register-shop");
    }
  }, [user, router]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const token = await getIdToken();
      if (!token) throw new Error("Not signed in");

      await registerShop(token, {
        shopName,
        slug: slug || undefined,
        adminName: adminName || undefined,
      });

      await refreshProfile(true);
      router.push("/app/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white text-sm text-brand-muted">
        Redirecting to sign in…
      </div>
    );
  }

  return (
    <AuthPageShell
      eyebrow="Step 2 of 2"
      title="Name your shop"
      subtitle="This is how your team and customers will see your workspace. You can customize your logo and brand colors right after."
      footer={
        <p className="text-xs">
          Signed in as <span className="font-medium text-brand-ink">{user.email}</span>
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
            onChange={(e) => setSlug(e.target.value)}
            placeholder="flopilot"
            className="h-11 rounded-xl"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="adminName">
            Your name{" "}
            <span className="font-normal text-brand-muted">(optional)</span>
          </Label>
          <Input
            id="adminName"
            value={adminName}
            onChange={(e) => setAdminName(e.target.value)}
            placeholder="Alex"
            className="h-11 rounded-xl"
          />
        </div>

        {error && (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
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
