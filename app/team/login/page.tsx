import { Suspense } from "react";
import { TeamLoginForm } from "@/components/team/team-login-form";
import { AppLoadingScreen } from "@/components/ui/app-loading-screen";

export default function TeamLoginPage() {
  return (
    <Suspense fallback={<AppLoadingScreen fullScreen label="Loading…" />}>
      <TeamLoginForm />
    </Suspense>
  );
}
