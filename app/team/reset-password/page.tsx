import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { AppLoadingScreen } from "@/components/ui/app-loading-screen";

/** Team-host rewrite target for /reset-password on team.flopilot.io */
export default function TeamResetPasswordPage() {
  return (
    <Suspense fallback={<AppLoadingScreen fullScreen label="Loading…" />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
