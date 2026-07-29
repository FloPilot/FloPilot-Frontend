"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  fetchCustomerPortalInvite,
  type CustomerPortalInvite,
} from "@/lib/api";
import { portalAppHomePath, portalAppOrderPath } from "@/lib/customer-portal-api";
import { cn } from "@/lib/utils";

function resolveNextPath(searchParams: URLSearchParams, token: string) {
  const next = searchParams.get("next");
  if (next?.startsWith("/portal/app")) return next;

  const orderId = searchParams.get("orderId");
  const view = searchParams.get("view") || undefined;
  const focus = searchParams.get("focus") || undefined;
  if (orderId) {
    return portalAppOrderPath(orderId, { view, focus });
  }

  // Deep links under /portal/c/[token]/orders/...
  if (typeof window !== "undefined") {
    const match = window.location.pathname.match(
      /\/portal\/c\/[^/]+\/orders\/([^/?#]+)/
    );
    if (match?.[1]) {
      return portalAppOrderPath(decodeURIComponent(match[1]), { view, focus });
    }
  }

  void token;
  return portalAppHomePath();
}

export function PortalClaimForm({ token }: { token: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    user,
    loading: authLoading,
    configured,
    signIn,
    signUp,
    claimPortalInvite,
  } = useAuth();

  const [invite, setInvite] = useState<CustomerPortalInvite | null>(null);
  const [inviteLoading, setInviteLoading] = useState(true);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoClaiming, setAutoClaiming] = useState(false);
  const autoClaimAttempted = useRef(false);

  const nextPath = useMemo(
    () => resolveNextPath(searchParams, token),
    [searchParams, token]
  );
  const accent = invite?.shop?.primaryColor || "#2c6ecb";

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setInviteLoading(true);
      setInviteError(null);
      try {
        const data = await fetchCustomerPortalInvite(token);
        if (cancelled) return;
        setInvite(data);
        if (data.hasAccount) setMode("signin");
        if (data.customer?.email) setEmail(data.customer.email);
        if (data.customer?.name) setName(data.customer.name);
      } catch (err) {
        if (!cancelled) {
          setInviteError(
            err instanceof Error ? err.message : "Could not open this invite."
          );
        }
      } finally {
        if (!cancelled) setInviteLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (authLoading || inviteLoading || !invite || invite.expired) return;
    if (!user || autoClaimAttempted.current) return;

    autoClaimAttempted.current = true;
    let cancelled = false;
    void (async () => {
      setAutoClaiming(true);
      setError(null);
      try {
        await claimPortalInvite(token, { name: name || undefined });
        if (!cancelled) router.replace(nextPath);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Could not connect this portal to your account."
          );
          setAutoClaiming(false);
          autoClaimAttempted.current = false;
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    authLoading,
    inviteLoading,
    invite,
    user,
    token,
    name,
    nextPath,
    claimPortalInvite,
    router,
  ]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    autoClaimAttempted.current = true;
    try {
      if (mode === "signup") {
        await signUp(email, password);
      } else {
        await signIn(email, password);
      }
      await claimPortalInvite(token, { name: name || undefined });
      router.replace(nextPath);
    } catch (err) {
      autoClaimAttempted.current = false;
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (inviteLoading || authLoading || autoClaiming) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-[#f6f6f7] text-[#616161]">
        <Loader2 className="size-6 animate-spin" style={{ color: accent }} />
        <p className="text-[14px]">
          {autoClaiming ? "Connecting your portal…" : "Loading your invite…"}
        </p>
      </div>
    );
  }

  if (inviteError || !invite) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#f6f6f7] px-4">
        <div className="max-w-md rounded-2xl border border-[#ebebeb] bg-white p-8 text-center shadow-sm">
          <p className="text-[18px] font-semibold text-[#303030]">
            Couldn&apos;t open this invite
          </p>
          <p className="mt-2 text-[14px] text-[#616161]">
            {inviteError || "This portal link is invalid."}
          </p>
        </div>
      </div>
    );
  }

  if (invite.expired) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#f6f6f7] px-4">
        <div className="max-w-md rounded-2xl border border-[#ebebeb] bg-white p-8 text-center shadow-sm">
          <p className="text-[18px] font-semibold text-[#303030]">
            This invite link has expired
          </p>
          <p className="mt-2 text-[14px] text-[#616161]">
            Request a new link from your shop and you&apos;ll get another 90 days
            of access.
          </p>
          {invite.reactivateUrl ? (
            <a
              href={invite.reactivateUrl}
              className="mt-6 inline-flex h-11 items-center justify-center rounded-lg px-6 text-[14px] font-semibold text-white"
              style={{ backgroundColor: accent }}
            >
              Renew portal access
            </a>
          ) : null}
        </div>
      </div>
    );
  }

  const shopName = invite.shop?.name || "your print shop";
  const isSignup = mode === "signup";

  return (
    <AuthPageShell
      eyebrow="Customer portal"
      title={
        isSignup
          ? `Create your portal account for ${shopName}`
          : `Sign in to ${shopName}`
      }
      subtitle={
        isSignup
          ? "Set an email and password once — review estimates, artwork, and invoices anytime."
          : invite.hasAccount
            ? `Sign in with ${invite.accountEmail || "your portal email"} to continue.`
            : "Use the account you created for this shop’s customer portal."
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
          Firebase is not configured. Add keys to <code>.env.local</code> first.
        </p>
      )}

      <div className="mb-5 rounded-xl border border-[#ebebeb] bg-[#fafafa] px-3.5 py-3 text-[13px] text-[#616161]">
        <p className="font-medium text-[#303030]">
          {invite.customer?.company || invite.customer?.name}
        </p>
        {invite.customer?.company && invite.customer?.name ? (
          <p className="mt-0.5">{invite.customer.name}</p>
        ) : null}
        {invite.customer?.email ? (
          <p className="mt-0.5">{invite.customer.email}</p>
        ) : null}
      </div>

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
        {isSignup ? (
          <div className="space-y-1.5">
            <Label htmlFor="portal-name">Your name</Label>
            <Input
              id="portal-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="name"
              placeholder="Alex Rivera"
            />
          </div>
        ) : null}
        <div className="space-y-1.5">
          <Label htmlFor="portal-email">Email</Label>
          <Input
            id="portal-email"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="portal-password">Password</Label>
          <Input
            id="portal-password"
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

        <Button
          type="submit"
          disabled={submitting || !configured}
          className="h-11 w-full text-[14px] font-semibold text-white"
          style={{ backgroundColor: accent }}
        >
          {submitting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : isSignup ? (
            "Create account & open portal"
          ) : (
            "Sign in & open portal"
          )}
        </Button>
      </form>
    </AuthPageShell>
  );
}
