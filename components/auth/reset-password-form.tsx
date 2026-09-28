"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  confirmPasswordReset,
  verifyPasswordResetCode,
} from "firebase/auth";
import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { teamPortalPath } from "@/lib/team-portal";
import { getFirebaseAuth } from "@/lib/firebase";

function loginHrefFromContinue(continuePath: string | null): string {
  if (continuePath?.startsWith("/portal")) return "/portal/login";
  if (continuePath?.startsWith("/team")) return "/team/login";
  return "/login";
}

function mapFirebaseResetError(err: unknown): string {
  const code =
    err && typeof err === "object" && "code" in err
      ? String((err as { code?: string }).code || "")
      : "";
  switch (code) {
    case "auth/expired-action-code":
      return "This reset link has expired. Request a new one.";
    case "auth/invalid-action-code":
      return "This reset link is invalid or was already used. Request a new one.";
    case "auth/user-disabled":
      return "This account has been disabled. Contact your shop admin.";
    case "auth/user-not-found":
      return "We couldn’t find an account for this reset link.";
    case "auth/weak-password":
      return "Choose a stronger password (at least 8 characters).";
    default:
      return err instanceof Error
        ? err.message
        : "Could not reset your password. Please try again.";
  }
}

export function ResetPasswordForm() {
  const { configured, signIn } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const oobCode = searchParams.get("oobCode") || searchParams.get("oob_code") || "";
  const continuePath = searchParams.get("continue") || searchParams.get("next");
  const signInHref = useMemo(
    () => loginHrefFromContinue(continuePath),
    [continuePath]
  );

  const [email, setEmail] = useState<string | null>(null);
  const [checking, setChecking] = useState(Boolean(oobCode));
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!configured || !oobCode) {
      setChecking(false);
      if (!oobCode) {
        setError("Missing reset code. Open the link from your email, or request a new one.");
      }
      return;
    }

    let cancelled = false;
    setChecking(true);
    void (async () => {
      try {
        const accountEmail = await verifyPasswordResetCode(
          getFirebaseAuth(),
          oobCode
        );
        if (!cancelled) {
          setEmail(accountEmail);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setEmail(null);
          setError(mapFirebaseResetError(err));
        }
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [configured, oobCode]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don’t match.");
      return;
    }
    if (!oobCode) {
      setError("Missing reset code. Request a new password reset email.");
      return;
    }

    setSubmitting(true);
    try {
      await confirmPasswordReset(getFirebaseAuth(), oobCode, password);
      setDone(true);
      if (email) {
        try {
          await signIn(email, password);
          router.push(
            signInHref.startsWith("/portal")
              ? "/portal/app"
              : signInHref.startsWith("/team")
                ? teamPortalPath()
                : "/app/dashboard"
          );
          return;
        } catch {
          // Fall through to success state — they can sign in manually.
        }
      }
    } catch (err) {
      setError(mapFirebaseResetError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthPageShell
      eyebrow="Account recovery"
      title={done ? "Password updated" : "Choose a new password"}
      subtitle={
        done
          ? "You’re all set. Sign in with your new password."
          : email
            ? `Create a new password for ${email}.`
            : "Create a new password for your FloPilot account."
      }
      footer={
        <p>
          <Link
            href={signInHref}
            className="font-medium text-brand-ink underline-offset-2 hover:underline"
          >
            Back to sign in
          </Link>
          {" · "}
          <Link
            href={`/forgot-password?from=${
              signInHref.startsWith("/portal")
                ? "portal"
                : signInHref.startsWith("/team")
                  ? "team"
                  : "app"
            }`}
            className="font-medium text-brand-ink underline-offset-2 hover:underline"
          >
            Request a new link
          </Link>
        </p>
      }
    >
      {!configured && (
        <p className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-950">
          Firebase is not configured.
        </p>
      )}

      {checking ? (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-brand-muted">
          <Loader2 className="size-4 animate-spin" />
          Checking reset link…
        </div>
      ) : done ? (
        <div className="space-y-5">
          <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-sm text-emerald-950">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
            <p>Your password was updated. You can sign in with it now.</p>
          </div>
          <Button
            type="button"
            className="h-11 w-full rounded-lg bg-brand-ink text-[15px] font-medium hover:bg-brand-ink/90"
            nativeButton={false}
            render={<Link href={signInHref} />}
          >
            <ArrowLeft className="size-4" />
            Sign in
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-password">New password</Label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              placeholder="At least 8 characters"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-11 rounded-xl"
              required
              disabled={!oobCode || Boolean(error && !email)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm password</Label>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              placeholder="Repeat your new password"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              className="h-11 rounded-xl"
              required
              disabled={!oobCode || Boolean(error && !email)}
            />
          </div>

          {error ? (
            <p
              className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700"
              role="alert"
            >
              {error}
            </p>
          ) : null}

          <Button
            type="submit"
            className="h-11 w-full rounded-lg bg-brand-ink text-[15px] font-medium hover:bg-brand-ink/90"
            disabled={
              submitting || !configured || !oobCode || Boolean(error && !email)
            }
          >
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Updating…
              </>
            ) : (
              "Reset password"
            )}
          </Button>
        </form>
      )}
    </AuthPageShell>
  );
}
