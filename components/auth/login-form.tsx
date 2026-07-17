"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function LoginForm() {
  const { signIn, signUp, refreshProfile, configured } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/app/dashboard";
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
        const me = await refreshProfile(true);
        // Existing shop membership (e.g. invited before completing UI): skip create-shop
        if (me?.type === "staff") {
          router.push(next);
          return;
        }
        router.push("/register-shop");
        return;
      }

      await signIn(email, password);
      const me = await refreshProfile(true);

      if (!me) {
        setError("Signed in but could not load your workspace. Please try again.");
        return;
      }

      if (me.type === "staff") {
        router.push(next);
        return;
      }

      // Sign-in never opens create-shop — that flow is for Create account only.
      setError(
        "We couldn’t find a shop linked to this account. Use Create account if you’re new, or ask your shop admin for an invite."
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
      eyebrow={isSignup ? "Get started" : "Welcome back"}
      title={
        isSignup
          ? "Create your FloPilot account"
          : "Sign in to your workspace"
      }
      subtitle={
        isSignup
          ? "Set up your shop in minutes. Use email and password — no magic links required."
          : "Access your dashboard, production floor, and customer tools."
      }
      footer={
        <p>
          {isSignup ? "Already have an account?" : "New to FloPilot?"}{" "}
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
          Firebase is not configured. Add keys to <code>.env.local</code> first.
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
        <div className="space-y-2">
          <Label htmlFor="email">Work email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@yourshop.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11 rounded-xl"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete={isSignup ? "new-password" : "current-password"}
            minLength={8}
            placeholder={isSignup ? "At least 8 characters" : "Your password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-11 rounded-xl"
            required
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
          disabled={submitting || !configured}
        >
          {submitting ? (
            "Please wait…"
          ) : isSignup ? (
            <>
              Continue
              <ChevronRight className="size-4" />
            </>
          ) : (
            "Sign in"
          )}
        </Button>
      </form>

      <p className="mt-6 text-center text-xs leading-relaxed text-brand-muted">
        By continuing, you agree to use FloPilot for your shop operations.
        {" "}
        <Link href="/" className="text-brand-ink underline-offset-2 hover:underline">
          Learn more
        </Link>
      </p>
    </AuthPageShell>
  );
}
