import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";
import { AppLoadingScreen } from "@/components/ui/app-loading-screen";

export default function LoginPage() {
  return (
    <Suspense
      fallback={<AppLoadingScreen fullScreen label="Loading sign in…" />}
    >
      <LoginForm />
    </Suspense>
  );
}
