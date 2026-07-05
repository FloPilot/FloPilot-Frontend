"use client";

import { useCallback, useState } from "react";
import { Check, Copy, ExternalLink, Loader2 } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { getOrderCustomerPortalLink } from "@/lib/api";
import { cn } from "@/lib/utils";

/** Use localhost when previewing/copying from a local dev server. */
function portalUrlForCurrentHost(url: string): string {
  if (typeof window === "undefined") return url;
  const { hostname } = window.location;
  if (hostname !== "localhost" && hostname !== "127.0.0.1") return url;

  try {
    const parsed = new URL(url);
    parsed.protocol = window.location.protocol;
    parsed.host = window.location.host;
    return parsed.toString();
  } catch {
    return url;
  }
}

export function CustomerPortalActions({
  orderId,
  className,
  previewClassName,
  copyClassName,
}: {
  orderId: string;
  className?: string;
  previewClassName?: string;
  copyClassName?: string;
}) {
  const { getIdToken } = useAuth();
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingCopy, setLoadingCopy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPortalLink = useCallback(async () => {
    const token = await getIdToken();
    if (!token) throw new Error("You need to be signed in.");
    const result = await getOrderCustomerPortalLink(token, orderId);
    return {
      ...result,
      portalOrderUrl: portalUrlForCurrentHost(result.portalOrderUrl),
      portalHomeUrl: portalUrlForCurrentHost(result.portalHomeUrl),
    };
  }, [getIdToken, orderId]);

  const handlePreview = async () => {
    setLoadingPreview(true);
    setError(null);
    setCopied(false);
    try {
      const { portalOrderUrl } = await fetchPortalLink();
      const opened = window.open(portalOrderUrl, "_blank", "noopener,noreferrer");
      if (!opened) {
        throw new Error(
          "Your browser blocked the new tab. Allow pop-ups for this site and try again."
        );
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not open the portal."
      );
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleCopyLink = async () => {
    setLoadingCopy(true);
    setError(null);
    try {
      const { portalOrderUrl } = await fetchPortalLink();
      await navigator.clipboard.writeText(portalOrderUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not copy the portal link."
      );
    } finally {
      setLoadingCopy(false);
    }
  };

  const busy = loadingPreview || loadingCopy;

  return (
    <div className={cn("space-y-2", className)}>
      <button
        type="button"
        onClick={() => void handlePreview()}
        disabled={busy}
        aria-busy={loadingPreview}
        className={cn(
          previewClassName,
          busy && !loadingPreview && "opacity-60"
        )}
      >
        {loadingPreview ? (
          <>
            <Loader2 className="size-3.5 shrink-0 animate-spin text-white" />
            Opening preview…
          </>
        ) : (
          <>
            <ExternalLink className="size-3.5 shrink-0" />
            Preview customer portal
          </>
        )}
      </button>
      <button
        type="button"
        onClick={() => void handleCopyLink()}
        disabled={busy}
        aria-busy={loadingCopy}
        className={cn(copyClassName, busy && !loadingCopy && "opacity-60")}
      >
        {loadingCopy ? (
          <>
            <Loader2 className="size-3.5 shrink-0 animate-spin text-[#616161]" />
            Copying link…
          </>
        ) : copied ? (
          <>
            <Check className="size-3.5 shrink-0 text-[#0d5c2e]" />
            Portal link copied
          </>
        ) : (
          <>
            <Copy className="size-3.5 shrink-0" />
            Copy portal link
          </>
        )}
      </button>
      {error ? (
        <p className="rounded-lg border border-[#f5b5b5] bg-[#fff1f1] px-3 py-2 text-[12px] leading-snug text-[#8f1f1f]">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** @deprecated Use CustomerPortalActions */
export function CustomerPreviewTrigger({
  orderId,
  orderNumber: _orderNumber,
  className,
}: {
  orderId: string;
  orderNumber: string;
  className?: string;
}) {
  return (
    <CustomerPortalActions
      orderId={orderId}
      previewClassName={className}
      copyClassName={cn(
        className,
        "mt-0 border-[#e3e3e3] bg-white text-[#303030] hover:bg-[#fafafa]"
      )}
    />
  );
}
