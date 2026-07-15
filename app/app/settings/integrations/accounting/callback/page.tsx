"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { completeQuickBooksOAuth } from "@/lib/api";
import {
  dashboardCardClass,
  dashboardControlClass,
  dashboardPrimaryButtonClass,
} from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";

/** Share one in-flight exchange across React Strict Mode remounts */
const inflightExchanges = new Map<string, Promise<void>>();

function QuickBooksOAuthCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { getIdToken } = useAuth();
  const [status, setStatus] = useState<"working" | "success" | "error">("working");
  const [message, setMessage] = useState("Finishing QuickBooks connection…");

  useEffect(() => {
    let cancelled = false;

    async function finish() {
      const code = searchParams.get("code");
      const state = searchParams.get("state");
      const realmId = searchParams.get("realmId");
      const error = searchParams.get("error");
      const errorDescription = searchParams.get("error_description");

      if (error) {
        if (!cancelled) {
          setStatus("error");
          setMessage(
            errorDescription || error || "QuickBooks authorization was denied."
          );
        }
        return;
      }

      if (!code || !state || !realmId) {
        if (!cancelled) {
          setStatus("error");
          setMessage(
            "Missing authorization details from QuickBooks. Please try connecting again."
          );
        }
        return;
      }

      const successKey = `qb-oauth-ok:${code}`;
      try {
        if (sessionStorage.getItem(successKey) === "1") {
          if (!cancelled) {
            setStatus("success");
            setMessage("QuickBooks is connected.");
            router.replace("/app/settings/integrations/accounting");
          }
          return;
        }
      } catch {
        // sessionStorage unavailable
      }

      try {
        let exchange = inflightExchanges.get(code);
        if (!exchange) {
          exchange = (async () => {
            const token = await getIdToken();
            if (!token) {
              throw new Error(
                "You must be signed in to finish connecting QuickBooks."
              );
            }
            await completeQuickBooksOAuth(token, { code, state, realmId });
            try {
              sessionStorage.setItem(successKey, "1");
            } catch {
              // ignore
            }
          })();
          inflightExchanges.set(code, exchange);
        }

        await exchange;
        inflightExchanges.delete(code);

        if (cancelled) return;
        setStatus("success");
        setMessage(
          "QuickBooks is connected. You can push estimates and invoices from orders."
        );
        window.setTimeout(() => {
          router.replace("/app/settings/integrations/accounting");
        }, 900);
      } catch (err) {
        inflightExchanges.delete(code);
        if (cancelled) return;
        setStatus("error");
        setMessage(
          err instanceof Error
            ? err.message
            : "Could not complete QuickBooks connection."
        );
      }
    }

    void finish();
    return () => {
      cancelled = true;
    };
  }, [getIdToken, router, searchParams]);

  return (
    <div className={cn(dashboardCardClass, "w-full max-w-md p-6 text-center")}>
      {status === "working" && (
        <Loader2 className="mx-auto size-8 animate-spin text-[#2c6ecb]" />
      )}
      {status === "success" && (
        <CheckCircle2 className="mx-auto size-8 text-[#0d5c2e]" />
      )}
      {status === "error" && <XCircle className="mx-auto size-8 text-[#8f1f1f]" />}
      <h1 className="mt-4 text-lg font-semibold text-[#303030]">
        {status === "working"
          ? "Connecting QuickBooks"
          : status === "success"
            ? "Connected"
            : "Connection failed"}
      </h1>
      <p className="mt-2 text-sm text-[#616161]">{message}</p>
      {status === "error" && (
        <div className="mt-5 flex justify-center gap-2">
          <Link
            href="/app/settings/integrations/accounting"
            className={cn(dashboardPrimaryButtonClass, "h-9 px-4")}
          >
            Back to Accounting
          </Link>
          <Link
            href="/app/settings/integrations/accounting"
            className={cn(dashboardControlClass, "h-9 px-4")}
          >
            Try again
          </Link>
        </div>
      )}
    </div>
  );
}

export default function QuickBooksOAuthCallbackPage() {
  return (
    <main className="flex min-h-[60vh] items-center justify-center p-6">
      <Suspense
        fallback={
          <div
            className={cn(dashboardCardClass, "w-full max-w-md p-6 text-center")}
          >
            <Loader2 className="mx-auto size-8 animate-spin text-[#2c6ecb]" />
            <p className="mt-4 text-sm text-[#616161]">Loading…</p>
          </div>
        }
      >
        <QuickBooksOAuthCallbackInner />
      </Suspense>
    </main>
  );
}
