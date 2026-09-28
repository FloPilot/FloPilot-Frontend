import { Suspense } from "react";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { AppLoadingScreen } from "@/components/ui/app-loading-screen";

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={<AppLoadingScreen fullScreen label="Loading…" />}
    >
      <ForgotPasswordForm />
    </Suspense>
  );
}
