"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { MarketingLogoLink } from "@/components/marketing/marketing-logo";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isPlatformTeamMember } from "@/lib/platform-team";
import { teamPortalPath } from "@/lib/team-portal";

const TEAM_ACCESS_DENIED_MESSAGE =
  "That account does not have FloPilot team access. Shop admin is separate — your email must be added as a platform team member first.";

export function TeamLoginForm() {
  const { signIn, refreshProfile, configured, user, profile, loading } =
    useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || teamPortalPath();
  const accessError = searchParams.get("error") === "access";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    accessError ? TEAM_ACCESS_DENIED_MESSAGE : null
  );
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (user && isPlatformTeamMember(profile)) {
      router.replace(next);
    }
  }, [user, profile, loading, next, router]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await signIn(email, password);
      const me = await refreshProfile(true);
      if (!isPlatformTeamMember(me)) {
        setError(TEAM_ACCESS_DENIED_MESSAGE);
        return;
      }
      router.push(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative min-h-screen bg-white">
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(0,0,0,0.07) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      />

      <header className="relative z-10 border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
        <div className="container-marketing flex h-[60px] items-center justify-between px-6 sm:px-8 lg:px-10">
          <MarketingLogoLink />
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand-muted">
            Team portal
          </span>
        </div>
      </header>

      <div className="relative mx-auto flex min-h-[calc(100vh-60px)] max-w-6xl flex-col px-6 py-10 sm:px-8 lg:flex-row lg:items-center lg:gap-16 lg:px-10 lg:py-16">
        <div className="mb-10 max-w-md lg:mb-0 lg:flex-1">
          <p className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-brand-muted shadow-sm">
            FloPilot internal
          </p>
          <h1 className="mt-4 text-3xl font-semibold tracking-[-0.025em] text-brand-ink sm:text-4xl">
            Team workspace
          </h1>
          <p className="mt-4 text-base leading-relaxed text-brand-muted">
            Triage customer feedback, track product improvements, and run
            FloPilot operations from one place.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-brand-ink">
            <li className="flex items-start gap-2">
              <ChevronRight className="mt-0.5 size-4 shrink-0 text-brand-primary" />
              Feedback inbox from all beta shops
            </li>
            <li className="flex items-start gap-2">
              <ChevronRight className="mt-0.5 size-4 shrink-0 text-brand-primary" />
              Status tracking from open → done
            </li>
            <li className="flex items-start gap-2">
              <ChevronRight className="mt-0.5 size-4 shrink-0 text-brand-primary" />
              More internal tools coming soon
            </li>
          </ul>
        </div>

        <div className="w-full lg:max-w-md lg:flex-1">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
            {!configured && (
              <p className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-950">
                Firebase is not configured.
              </p>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="team-email">Company email</Label>
                <Input
                  id="team-email"
                  type="email"
                  autoComplete="email"
                  placeholder="info@necti.io"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 rounded-xl"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="team-password">Password</Label>
                <Input
                  id="team-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 rounded-xl"
                  required
                />
              </div>

              {error && (
                <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                className="h-11 w-full rounded-lg bg-brand-ink text-[15px] font-medium hover:bg-brand-ink/90"
                disabled={submitting || !configured}
              >
                {submitting ? "Signing in…" : "Sign in to team portal"}
              </Button>
            </form>

            <p className="mt-6 text-center text-xs text-brand-muted">
              Customer or shop login?{" "}
              <Link
                href="/login"
                className="font-medium text-brand-ink underline-offset-2 hover:underline"
              >
                Go to app login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
