"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, Eye, Loader2 } from "lucide-react";
import { CustomerReviewFlow } from "@/components/review/customer-review-flow";
import { useAuth } from "@/components/providers/auth-provider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  dashboardTaskDetailClass,
  dashboardTaskTitleClass,
} from "@/lib/dashboard-styles";
import {
  fetchCustomerReviewPreview,
  type CustomerReviewSession,
} from "@/lib/customer-review-api";
import { cn } from "@/lib/utils";

export function CustomerReviewPreviewModal({
  orderId,
  orderNumber,
  open,
  onOpenChange,
}: {
  orderId: string;
  orderNumber: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { getIdToken } = useAuth();
  const [session, setSession] = useState<CustomerReviewSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getIdToken();
      if (!token) throw new Error("You need to be signed in to preview.");
      const data = await fetchCustomerReviewPreview(token, orderId);
      setSession(data);
    } catch (err) {
      setSession(null);
      setError(
        err instanceof Error ? err.message : "Could not load the preview."
      );
    } finally {
      setLoading(false);
    }
  }, [getIdToken, orderId]);

  useEffect(() => {
    if (!open) {
      setSession(null);
      setError(null);
      return;
    }
    void load();
  }, [open, load]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="flex h-[min(94vh,920px)] w-[calc(100vw-1.5rem)] max-w-6xl flex-col gap-0 overflow-hidden p-0 sm:max-w-6xl"
      >
        <DialogHeader className="shrink-0 border-b border-[#ebebeb] px-5 py-4 pr-12">
          <DialogTitle className={dashboardTaskTitleClass}>
            Customer preview
          </DialogTitle>
          <p className={cn("mt-0.5", dashboardTaskDetailClass)}>
            Order {orderNumber} — estimate and proofs as your customer will see
            them.
          </p>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex min-h-[360px] flex-col items-center justify-center gap-2 text-[#616161]">
              <Loader2 className="size-6 animate-spin text-[#2c6ecb]" />
              <p className="text-[13px]">Building preview…</p>
            </div>
          ) : error ? (
            <div className="flex min-h-[280px] flex-col items-center justify-center gap-2 px-6 text-center">
              <AlertCircle className="size-7 text-[#d72c0d]" />
              <p className="text-[14px] font-medium text-[#303030]">
                Preview unavailable
              </p>
              <p className="text-[13px] text-[#616161]">{error}</p>
            </div>
          ) : session ? (
            <CustomerReviewFlow
              initialSession={session}
              mode="preview"
              embedded
            />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function CustomerPreviewTrigger({
  orderId,
  orderNumber,
  className,
}: {
  orderId: string;
  orderNumber: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={className}
      >
        <Eye className="size-3.5 shrink-0" />
        Preview customer view
      </button>
      <CustomerReviewPreviewModal
        orderId={orderId}
        orderNumber={orderNumber}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
