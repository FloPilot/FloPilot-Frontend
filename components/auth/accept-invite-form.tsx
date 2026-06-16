"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { ArrowRight, Loader2, ShieldCheck } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { PlatformBrandMark } from "@/components/branding/shop-brand-mark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { acceptTeamInvite, fetchTeamInvite, type MeResponse } from "@/lib/api";
import { getFirebaseAuth } from "@/lib/firebase";

async function ensureStaffProfile(
  refreshProfile: (force?: boolean) => Promise<MeResponse | null>
) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const me = await refreshProfile(true);
    if (me?.type === "staff") return me;
    await new Promise((resolve) => window.setTimeout(resolve, 250));
  }
  throw new Error("Your account was created but the workspace did not load. Please sign in.");
}

async function completeInviteJoin({
  token,
  refreshProfile,
  router,
}: {
  token: string;
  refreshProfile: (force?: boolean) => Promise<MeResponse | null>;
  router: ReturnType<typeof useRouter>;
}) {
  const auth = getFirebaseAuth();
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) throw new Error("Sign in failed");

  const firebaseToken = await firebaseUser.getIdToken(true);
  await acceptTeamInvite(firebaseToken, token);
  await ensureStaffProfile(refreshProfile);
  router.replace("/app/dashboard");
}

export function AcceptInviteForm({ token }: { token: string }) {
  const router = useRouter();
  const { user, loading: authLoading, refreshProfile } = useAuth();
  const [invite, setInvite] = useState<Awaited<ReturnType<typeof fetchTeamInvite>> | null>(
    null
  );
  const [loadingInvite, setLoadingInvite] = useState(true);
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await fetchTeamInvite(token);
        if (!cancelled) setInvite(data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Invitation not found");
        }
      } finally {
        if (!cancelled) setLoadingInvite(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (authLoading || !user || !invite) return;
    if (user.email?.toLowerCase() !== invite.email.toLowerCase()) return;

    void (async () => {
      setSubmitting(true);
      setError(null);
      try {
        await completeInviteJoin({ token, refreshProfile, router });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not accept invitation");
        setSubmitting(false);
      }
    })();
  }, [authLoading, user, invite, token, refreshProfile, router]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!invite) return;

    setSubmitting(true);
    setError(null);

    try {
      const auth = getFirebaseAuth();
      if (mode === "signup") {
        await createUserWithEmailAndPassword(auth, invite.email, password);
      } else {
        await signInWithEmailAndPassword(auth, invite.email, password);
      }
      await completeInviteJoin({ token, refreshProfile, router });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not join the team");
      setSubmitting(false);
    }
  };

  if (loadingInvite) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <Loader2 className="size-6 animate-spin text-brand-muted" />
      </div>
    );
  }

  if (!invite) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6 text-center">
        <PlatformBrandMark />
        <h1 className="mt-8 text-xl font-semibold text-brand-ink">
          Invitation unavailable
        </h1>
        <p className="mt-2 max-w-sm text-sm text-brand-muted">
          {error || "This invitation may have expired or already been used."}
        </p>
        <Button
          className="mt-6 rounded-full"
          nativeButton={false}
          render={<Link href="/login" />}
        >
          Go to sign in
        </Button>
      </div>
    );
  }

  if (authLoading || (user && submitting)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-white">
        <Loader2 className="size-6 animate-spin text-brand-muted" />
        <p className="text-sm text-brand-muted">Joining {invite.shopName}…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="container-narrow px-6 py-6 sm:px-8">
        <PlatformBrandMark />
      </header>

      <main className="container-narrow flex flex-1 items-center justify-center px-6 pb-16 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-primary/15 bg-brand-primary/5 px-3 py-1 text-xs font-medium text-brand-primary">
            <ShieldCheck className="size-3.5" />
            Team invitation
          </div>

          <h1 className="text-2xl font-semibold tracking-tight text-brand-ink">
            Join {invite.shopName}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-brand-muted">
            You&apos;ve been invited as <strong>{invite.roleLabel}</strong>. Create
            your account or sign in with <strong>{invite.email}</strong> to get started.
          </p>

          <form onSubmit={(e) => void handleSubmit(e)} className="mt-8 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email-display">Email</Label>
              <Input id="invite-email-display" value={invite.email} disabled />
            </div>

            <div className="space-y-2">
              <Label htmlFor="invite-password">Password</Label>
              <Input
                id="invite-password"
                type="password"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === "signup" ? "Create a password" : "Your password"}
                minLength={6}
                required
              />
            </div>

            {error && (
              <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                {error}
              </p>
            )}

            <Button
              type="submit"
              className="h-11 w-full rounded-full"
              disabled={submitting || password.length < 6}
            >
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Joining team…
                </>
              ) : (
                <>
                  {mode === "signup" ? "Create account & join" : "Sign in & join"}
                  <ArrowRight className="size-4" />
                </>
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-brand-muted">
            {mode === "signup" ? "Already have an account?" : "Need a new account?"}{" "}
            <button
              type="button"
              className="font-medium text-brand-primary hover:underline"
              onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
            >
              {mode === "signup" ? "Sign in instead" : "Create one"}
            </button>
          </p>
        </div>
      </main>
    </div>
  );
}
