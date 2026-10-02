"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, Loader2, Mail } from "lucide-react";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPasswordReset } from "@/lib/api";

function continuePathFromSearch(searchParams: URLSearchParams): string {
  const from = searchParams.get("from");
  const next = searchParams.get("next") || searchParams.get("continue");
  if (next?.startsWith("/")) return next;
  if (from === "portal") return "/portal/login";
  if (from === "team") return "/team/login";
  // On the team host, default back to team login.
  if (
    typeof window !== "undefined" &&
    window.location.pathname.startsWith("/team/")
  ) {
    return "/team/login";
  }
  return "/login";
}

function loginHref(continuePath: string): string {
  if (continuePath.startsWith("/portal")) return "/portal/login";
  if (continuePath.startsWith("/team")) return "/team/login";
  return "/login";
}

export function ForgotPasswordForm() {
  const { configured } = useAuth();
  const searchParams = useSearchParams();
  const continuePath = useMemo(
    () => continuePathFromSearch(searchParams),
    [searchParams]
  );
  const signInHref = loginHref(continuePath);

  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    setDevResetUrl(null);
    try {
      const result = await requestPasswordReset({
        email: email.trim(),
        continuePath: signInHref,
        appOrigin:
          typeof window !== "undefined" ? window.location.origin : undefined,
      });
      setSent(true);
      if (result.dev && result.resetUrl) {
        setDevResetUrl(result.resetUrl);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not send the reset email. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthPageShell
      eyebrow="Account recovery"
      title={sent ? "Check your email" : "Forgot your password?"}
      subtitle={
        sent
          ? "If an account exists for that address, we sent a link to reset your password."
          : "Enter the email you use to sign in. We’ll email you a secure link to choose a new password."
      }
      footer={
        <p>
          Remembered it?{" "}
          <Link
            href={signInHref}
            className="font-medium text-brand-ink underline-offset-2 hover:underline"
          >
            Back to sign in
          </Link>
        </p>
      }
    >
      {!configured && (
        <p className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-950">
          Firebase is not configured. Add keys to <code>.env.local</code> first.
        </p>
      )}

      {sent ? (
        <div className="space-y-5">
          <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-sm text-emerald-950">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
            <div>
              <p className="font-medium">Reset link sent</p>
              <p className="mt-1 text-emerald-900/80">
                Open the email at <strong>{email.trim()}</strong> and follow the
                link. It expires in about an hour.
              </p>
            </div>
          </div>

          {devResetUrl ? (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-950">
              Dev mode (Resend not configured). Use this link:{" "}
              <a
                href={devResetUrl}
                className="font-medium underline underline-offset-2"
              >
                Reset password
              </a>
            </p>
          ) : null}

          <Button
            type="button"
            variant="outline"
            className="h-11 w-full rounded-lg"
            onClick={() => {
              setSent(false);
              setError(null);
            }}
          >
            <Mail className="size-4" />
            Send another email
          </Button>

          <Button
            type="button"
            className="h-11 w-full rounded-lg bg-brand-ink text-[15px] font-medium hover:bg-brand-ink/90"
            nativeButton={false}
            render={<Link href={signInHref} />}
          >
            <ArrowLeft className="size-4" />
            Back to sign in
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="forgot-email">Work email</Label>
            <Input
              id="forgot-email"
              type="email"
              autoComplete="email"
              placeholder="you@yourshop.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-11 rounded-xl"
              required
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
            disabled={submitting || !configured}
          >
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Sending…
              </>
            ) : (
              "Email reset link"
            )}
          </Button>
        </form>
      )}
    </AuthPageShell>
  );
}
