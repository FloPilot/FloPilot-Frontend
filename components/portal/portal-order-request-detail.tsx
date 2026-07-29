"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  Download,
  ImageIcon,
  Loader2,
  XCircle,
} from "lucide-react";
import { usePortalAccess } from "@/components/portal/use-portal-access";
import { usePortalPaths } from "@/components/portal/portal-paths";
import {
  cancelPortalOrderRequest,
  downloadPortalOrderRequestEstimate,
  downloadPortalOrderRequestRecord,
  getPortalOrderRequest,
} from "@/lib/customer-portal-api";
import { PortalEstimateBreakdown } from "@/components/portal/portal-estimate-breakdown";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  ORDER_REQUEST_DECORATION_OPTIONS,
  ORDER_REQUEST_STATUS_LABELS,
  orderRequestStatusTone,
  pieceCountFromSizes,
  type OrderRequestDetail,
} from "@/lib/order-requests";
import { dashboardSectionTitleClass } from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";

function StatusBadge({ status }: { status: OrderRequestDetail["status"] }) {
  const tone = orderRequestStatusTone(status);
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-[12px] font-semibold",
        tone === "warning" && "bg-[#fff1d6] text-[#8a6116]",
        tone === "info" && "bg-[#ebf4ff] text-[#2c6ecb]",
        tone === "success" && "bg-[#f1faf1] text-[#0d5c2e]",
        tone === "danger" && "bg-[#fff1f1] text-[#8f1f1f]",
        tone === "neutral" && "bg-[#f1f1f1] text-[#616161]"
      )}
    >
      {ORDER_REQUEST_STATUS_LABELS[status]}
    </span>
  );
}

function decorationLabel(value: string) {
  return (
    ORDER_REQUEST_DECORATION_OPTIONS.find((o) => o.value === value)?.label ||
    value.replace(/_/g, " ")
  );
}

export function PortalOrderRequestDetail({
  requestId,
}: {
  requestId: string;
}) {
  const { mode, accent, getAccessToken } = usePortalAccess();
  const paths = usePortalPaths();
  const [request, setRequest] = useState<OrderRequestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [savingRecord, setSavingRecord] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const accessToken = await getAccessToken();
      const data = await getPortalOrderRequest(accessToken, requestId, {
        mode: mode === "auth" ? "auth" : "invite",
      });
      setRequest(data.request);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load this request."
      );
    } finally {
      setLoading(false);
    }
  }, [getAccessToken, mode, requestId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCancel = async () => {
    if (!request) return;
    const confirmed = window.confirm(
      "Cancel this order request? The shop will no longer process it."
    );
    if (!confirmed) return;
    setCancelling(true);
    setError(null);
    try {
      const accessToken = await getAccessToken();
      const data = await cancelPortalOrderRequest(accessToken, request.id, {
        mode: mode === "auth" ? "auth" : "invite",
      });
      setRequest(data.request);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not cancel this request."
      );
    } finally {
      setCancelling(false);
    }
  };

  const openPdfResult = (result: {
    downloadUrl?: string;
    pdfBase64?: string;
    filename?: string;
  }) => {
    if (result.downloadUrl) {
      window.open(result.downloadUrl, "_blank", "noopener,noreferrer");
      return;
    }
    if (result.pdfBase64) {
      const byteChars = atob(result.pdfBase64);
      const bytes = new Uint8Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i += 1) {
        bytes[i] = byteChars.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = result.filename || "order-request.pdf";
      anchor.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleExportEstimate = async () => {
    if (!request) return;
    setExporting(true);
    setError(null);
    try {
      const accessToken = await getAccessToken();
      const result = await downloadPortalOrderRequestEstimate(
        accessToken,
        request.id,
        { mode: mode === "auth" ? "auth" : "invite" }
      );
      openPdfResult(result);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not export estimate PDF."
      );
    } finally {
      setExporting(false);
    }
  };

  const handleDownloadRecord = async () => {
    if (!request) return;
    setSavingRecord(true);
    setError(null);
    try {
      const accessToken = await getAccessToken();
      const result = await downloadPortalOrderRequestRecord(
        accessToken,
        request.id,
        { mode: mode === "auth" ? "auth" : "invite" }
      );
      openPdfResult(result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not download this order request."
      );
    } finally {
      setSavingRecord(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-[#616161]">
        <Loader2 className="size-6 animate-spin" style={{ color: accent }} />
        <p className="text-[14px]">Loading request…</p>
      </div>
    );
  }

  if (error && !request) {
    return (
      <div className="rounded-2xl border border-[#ebebeb] bg-white p-8 text-center shadow-sm">
        <p className="text-[18px] font-semibold text-[#303030]">
          Couldn&apos;t load this request
        </p>
        <p className="mt-2 text-[14px] text-[#616161]">{error}</p>
        <Link
          href={paths.orderRequests()}
          className="mt-4 inline-flex text-[13px] font-medium underline"
          style={{ color: accent }}
        >
          Back to order requests
        </Link>
      </div>
    );
  }

  if (!request) return null;

  const pieceCount =
    typeof request.pieceCount === "number"
      ? request.pieceCount
      : (request.lineItems || []).reduce(
          (sum, item) =>
            sum + (item.quantity || pieceCountFromSizes(item.sizes || {})),
          0
        );

  const canCancel =
    request.status === "submitted" || request.status === "in_review";
  const productionRun = request.productionRun;
  const runCompanions = (productionRun?.members || []).filter(
    (member) => member.requestId !== request.id
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href={paths.orderRequests()}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#e3e3e3] bg-white px-3 text-[13px] font-medium text-[#303030] transition-colors hover:bg-[#fafafa]"
        >
          <ArrowLeft className="size-3.5" />
          All requests
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className={dashboardSectionTitleClass}>
            {request.number}
            {request.customLabel ? (
              <span className="font-medium text-[#616161]">
                {" "}
                · {request.customLabel}
              </span>
            ) : null}
          </h1>
          <p className="mt-0.5 text-[13px] text-[#616161]">
            Submitted {formatDate(request.createdAt)}
            {request.subCustomerName
              ? ` · End business ${request.subCustomerName}`
              : ""}
            {request.inHandsDate
              ? ` · In-hands ${formatDate(request.inHandsDate)}`
              : ""}
            {request.rush ? " · Rush" : ""}
          </p>
          {productionRun && runCompanions.length > 0 ? (
            <p className="mt-1 text-[13px] text-[#245c3c]">
              Multi-job run with{" "}
              {runCompanions
                .map((member) => member.requestNumber)
                .join(", ")}{" "}
              · {productionRun.combinedQuantity.toLocaleString()} combined pcs
              for decoration pricing
            </p>
          ) : null}
        </div>
        <StatusBadge status={request.status} />
        <button
          type="button"
          onClick={() => void handleDownloadRecord()}
          disabled={savingRecord}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#e3e3e3] bg-white px-3 text-[13px] font-semibold text-[#303030] transition-colors hover:bg-[#fafafa] disabled:opacity-60"
        >
          {savingRecord ? (
            <Loader2 className="size-3.5 animate-spin" style={{ color: accent }} />
          ) : (
            <Download className="size-3.5" />
          )}
          Save for records
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-[#f5b5b5] bg-[#fff1f1] px-4 py-3 text-[13px] text-[#8f1f1f]">
          {error}
        </div>
      ) : null}

      {request.status === "declined" && request.declineReason ? (
        <div className="rounded-2xl border border-[#f5b5b5] bg-[#fff8f8] px-4 py-3 text-[13px] text-[#8f1f1f]">
          <p className="font-semibold">Declined</p>
          <p className="mt-1">{request.declineReason}</p>
        </div>
      ) : null}

      {request.convertedOrderId ? (
        <div className="rounded-2xl border border-[#d7e7dc] bg-[#f4faf6] px-4 py-3 text-[13px] text-[#245c3c]">
          Converted to order{" "}
          <span className="font-semibold">
            {request.convertedOrderNumber || request.convertedOrderId}
          </span>
        </div>
      ) : null}

      {request.currentEstimate ? (
        <PortalEstimateBreakdown
          estimate={{
            ...request.currentEstimate.totals,
            rateSheetName: request.currentEstimate.rateSheetName,
            usingShopPricing: request.currentEstimate.usingShopPricing,
            disclaimer: `Estimate v${request.currentEstimate.version} · saved ${formatDate(request.currentEstimate.createdAt)}`,
          }}
          accent={accent}
          onExport={() => void handleExportEstimate()}
          exporting={exporting}
          blankSource={request.blankSource}
          lineItems={request.lineItems}
        />
      ) : null}

      {(request.estimateDocuments || []).length > 1 ? (
        <section className="overflow-hidden rounded-2xl border border-[#ebebeb] bg-white shadow-sm">
          <div className="border-b border-[#ebebeb] px-4 py-3 sm:px-5">
            <h2 className="text-[15px] font-semibold text-[#303030]">
              Estimate versions
            </h2>
            <p className="mt-0.5 text-[12px] text-[#616161]">
              Every pricing change keeps a paper trail.
            </p>
          </div>
          <ul className="divide-y divide-[#f1f1f1]">
            {(request.estimateDocuments || []).map((doc) => (
              <li
                key={doc.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5"
              >
                <div>
                  <p className="text-[13px] font-semibold text-[#303030]">
                    v{doc.version} · {formatCurrency(doc.totals.total)}
                  </p>
                  <p className="text-[12px] text-[#8a8a8a]">
                    {formatDate(doc.createdAt)}
                    {doc.reason ? ` · ${doc.reason.replace(/_/g, " ")}` : ""}
                    {doc.createdBy ? ` · ${doc.createdBy}` : ""}
                  </p>
                </div>
                {doc.pdf?.downloadUrl ? (
                  <a
                    href={doc.pdf.downloadUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[12px] font-semibold underline"
                    style={{ color: accent }}
                  >
                    Download PDF
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="overflow-hidden rounded-2xl border border-[#ebebeb] bg-white shadow-sm">
        <div className="border-b border-[#ebebeb] px-4 py-3 sm:px-5">
          <h2 className="text-[15px] font-semibold text-[#303030]">
            Blanks ({request.lineItems.length})
          </h2>
          <p className="text-[12px] text-[#8a8a8a]">
            {request.blankSource === "customer_supplies"
              ? "Customer supplies blanks"
              : "Shop orders blanks"}{" "}
            · {pieceCount.toLocaleString()} pieces
            {request.vendorPurchaseOrder?.poNumber
              ? ` · Vendor PO ${request.vendorPurchaseOrder.poNumber}`
              : ""}
          </p>
          {request.vendorPurchaseOrder?.fileUrl ? (
            <p className="mt-1">
              <a
                href={request.vendorPurchaseOrder.fileUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[12px] font-medium underline"
                style={{ color: accent }}
              >
                View uploaded PO
                {request.vendorPurchaseOrder.fileName
                  ? ` (${request.vendorPurchaseOrder.fileName})`
                  : ""}
              </a>
            </p>
          ) : null}
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-[13px]">
            <thead className="bg-[#fafafa] text-[12px] text-[#8a8a8a]">
              <tr>
                <th className="px-4 py-2.5 font-medium sm:px-5">Garment</th>
                <th className="px-4 py-2.5 font-medium">Style</th>
                <th className="px-4 py-2.5 font-medium">Color</th>
                <th className="px-4 py-2.5 font-medium">Sizes</th>
                <th className="px-4 py-2.5 font-medium text-right sm:px-5">
                  Qty
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f1f1]">
              {request.lineItems.map((item) => {
                const sizeParts = Object.entries(item.sizes || {})
                  .filter(([, qty]) => Number(qty) > 0)
                  .map(([size, qty]) => `${size}: ${qty}`);
                return (
                  <tr key={item.id}>
                    <td className="px-4 py-3 sm:px-5">
                      <p className="font-medium text-[#303030]">
                        {[item.brand, item.productName]
                          .filter(Boolean)
                          .join(" · ") || "Blank"}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-[#616161]">
                      {item.styleNumber || "—"}
                    </td>
                    <td className="px-4 py-3 text-[#616161]">
                      {item.color || "—"}
                    </td>
                    <td className="px-4 py-3 text-[#616161]">
                      {sizeParts.length ? sizeParts.join(", ") : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums text-[#303030] sm:px-5">
                      {(
                        item.quantity || pieceCountFromSizes(item.sizes || {})
                      ).toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-[#ebebeb] bg-white p-4 shadow-sm sm:p-5">
        <h2 className="text-[15px] font-semibold text-[#303030]">
          Events ({request.events.length})
        </h2>
        <ul className="mt-4 space-y-3">
          {request.events.map((event) => (
            <li
              key={event.id}
              className="flex flex-wrap items-start gap-3 rounded-xl border border-[#ebebeb] p-3"
            >
              {event.mockup?.previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={event.mockup.previewUrl}
                  alt={event.mockup.name || event.name}
                  className="size-16 rounded-lg border border-[#ebebeb] object-cover"
                />
              ) : (
                <div className="flex size-16 items-center justify-center rounded-lg border border-[#ebebeb] bg-[#fafafa] text-[#b5b5b5]">
                  <ImageIcon className="size-5" strokeWidth={1.5} />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-medium text-[#303030]">{event.name}</p>
                <p className="text-[12px] text-[#616161]">
                  {decorationLabel(event.decorationType)} ·{" "}
                  {event.locationLabel || event.locationKey.replace(/_/g, " ")}
                </p>
                {event.notes ? (
                  <p className="mt-1 text-[12px] text-[#8a8a8a]">{event.notes}</p>
                ) : null}
                {(event.inkColors || []).length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {event.inkColors!.map((row) => (
                      <span
                        key={row.id}
                        className="inline-flex rounded-md border border-[#ebebeb] bg-[#f6f6f7] px-2 py-0.5 text-[11px] font-medium text-[#303030]"
                      >
                        {row.pmsCode?.trim() || row.name?.trim() || "Color"}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </section>

      {request.notes ? (
        <section className="overflow-hidden rounded-2xl border border-[#ebebeb] bg-white p-4 shadow-sm sm:p-5">
          <h2 className="text-[15px] font-semibold text-[#303030]">Notes</h2>
          <p className="mt-2 whitespace-pre-wrap text-[13px] text-[#616161]">
            {request.notes}
          </p>
        </section>
      ) : null}

      {canCancel ? (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => void handleCancel()}
            disabled={cancelling}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-[#f5b5b5] bg-white px-4 text-[13px] font-medium text-[#8f1f1f] transition-colors hover:bg-[#fff1f1] disabled:opacity-60"
          >
            {cancelling ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <XCircle className="size-3.5" />
            )}
            Cancel request
          </button>
        </div>
      ) : null}
    </div>
  );
}
