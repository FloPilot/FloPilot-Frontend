"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Shield } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { AppLoadingScreen } from "@/components/ui/app-loading-screen";
import { Button } from "@/components/ui/button";
import { isPlatformTeamMember } from "@/lib/platform-team";
import { teamPortalPath } from "@/lib/team-portal";

export function TeamAuthGate({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const allowed = isPlatformTeamMember(profile);

  useEffect(() => {
    if (!loading && !user) {
      router.replace(teamPortalPath("/login"));
      return;
    }
    if (!loading && user && !allowed) {
      router.replace(teamPortalPath("/login?error=access"));
    }
  }, [loading, user, allowed, router]);

  if (loading) {
    return <AppLoadingScreen fullScreen label="Loading team workspace…" />;
  }

  if (!user || !allowed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white p-6">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white px-6 py-8 text-center shadow-sm">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-slate-100">
            <Shield className="size-5 text-brand-muted" />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-brand-ink">
            Team access only
          </h2>
          <p className="mt-2 text-sm text-brand-muted">
            This portal is for FloPilot platform team members only — not shop
            admins. Sign in with the company email that was added to the team
            roster in Firestore.
          </p>
          <Button
            className="mt-6 rounded-lg bg-brand-ink"
            nativeButton={false}
            render={<Link href={teamPortalPath("/login")} />}
          >
            Back to sign in
          </Button>
        </div>
      </div>
    );
  }

  return children;
}
