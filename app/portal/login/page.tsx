"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { portalAppHomePath } from "@/lib/customer-portal-api";
import { cn } from "@/lib/utils";
import { AppLoadingScreen } from "@/components/ui/app-loading-screen";

function PortalLoginForm() {
  const { signIn, signUp, refreshProfile, configured } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || portalAppHomePath();
  const initialMode =
    searchParams.get("mode") === "signup" ? "signup" : "signin";

  const [mode, setMode] = useState<"signin" | "signup">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === "signup") {
        await signUp(email, password);
      } else {
        await signIn(email, password);
      }
      const me = await refreshProfile(true);
      if (me?.type === "portal") {
        router.push(next.startsWith("/portal") ? next : portalAppHomePath());
        return;
      }
      if (me?.type === "staff") {
        router.push("/app/dashboard");
        return;
      }
      setError(
        "No customer portal is linked to this account yet. Open the invite link from your shop’s email to connect."
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setSubmitting(false);
    }
  }

  const isSignup = mode === "signup";

  return (
    <AuthPageShell
      eyebrow="Customer portal"
      title={isSignup ? "Create your portal account" : "Sign in to your portal"}
      subtitle={
        isSignup
          ? "Use the email from your shop’s invite. You’ll review estimates, artwork, and invoices here."
          : "Access orders, artwork approvals, estimates, and invoices from your print shop."
      }
      footer={
        <p>
          {isSignup ? "Already have an account?" : "First time here?"}{" "}
          <button
            type="button"
            className="font-medium text-brand-ink underline-offset-2 hover:underline"
            onClick={() => {
              setMode(isSignup ? "signin" : "signup");
              setError(null);
            }}
          >
            {isSignup ? "Sign in" : "Create an account"}
          </button>
        </p>
      }
    >
      {!configured && (
        <p className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-950">
          Firebase is not configured.
        </p>
      )}

      <div className="mb-6 flex rounded-xl border border-slate-200 bg-slate-50 p-1">
        <button
          type="button"
          className={cn(
            "flex-1 rounded-lg py-2 text-sm font-medium transition-colors",
            !isSignup
              ? "bg-white text-brand-ink shadow-sm"
              : "text-brand-muted hover:text-brand-ink"
          )}
          onClick={() => setMode("signin")}
        >
          Sign in
        </button>
        <button
          type="button"
          className={cn(
            "flex-1 rounded-lg py-2 text-sm font-medium transition-colors",
            isSignup
              ? "bg-white text-brand-ink shadow-sm"
              : "text-brand-muted hover:text-brand-ink"
          )}
          onClick={() => setMode("signup")}
        >
          Create account
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete={isSignup ? "new-password" : "current-password"}
          />
        </div>
        {error ? (
          <p className="rounded-lg border border-[#f5b5b5] bg-[#fff1f1] px-3 py-2 text-[13px] text-[#8f1f1f]">
            {error}
          </p>
        ) : null}
        <Button type="submit" disabled={submitting || !configured} className="h-11 w-full">
          {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
          {isSignup ? "Create account" : "Sign in"}
        </Button>
      </form>
    </AuthPageShell>
  );
}

export default function PortalLoginPage() {
  return (
    <Suspense fallback={<AppLoadingScreen fullScreen label="Loading…" />}>
      <PortalLoginForm />
    </Suspense>
  );
}
