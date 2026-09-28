import { Suspense } from "react";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { AppLoadingScreen } from "@/components/ui/app-loading-screen";

/** Team-host rewrite target for /forgot-password on team.flopilot.io */
export default function TeamForgotPasswordPage() {
  return (
    <Suspense fallback={<AppLoadingScreen fullScreen label="Loading…" />}>
      <ForgotPasswordForm />
    </Suspense>
  );
}
