import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { AppLoadingScreen } from "@/components/ui/app-loading-screen";

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={<AppLoadingScreen fullScreen label="Loading…" />}
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
