"use client";

import { useCallback, useMemo } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { OrderDesignTab } from "@/components/orders/order-design-tab";
import type { ImprintDesignCardAdapters } from "@/components/orders/imprint-design-card";
import { updateOrderRequest } from "@/lib/api";
import {
  dashboardCardClass,
  dashboardTaskDetailClass,
  dashboardTaskTitleClass,
} from "@/lib/dashboard-styles";
import { clearOrderRequestsListCache } from "@/lib/order-requests-cache";
import {
  applyImprintEditsToEvent,
  buildOrderFromRequest,
} from "@/lib/order-request-design-studio";
import type { OrderRequestDetail } from "@/lib/order-requests";
import {
  getProofSlides,
  MAX_PROOF_SLIDES,
  reorderProofSlides,
  syncArtworkPrimaryPreview,
} from "@/lib/proof-slides";
import type {
  ArtworkFile,
  ImprintInkColor,
} from "@/types";
import { cn } from "@/lib/utils";

function createSlideId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `slide-${crypto.randomUUID()}`;
  }
  return `slide-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function OrderRequestProofsTab({
  request,
  editable = true,
  onRequestChange,
}: {
  request: OrderRequestDetail;
  editable?: boolean;
  onRequestChange: (next: OrderRequestDetail) => void;
}) {
  const { getIdToken } = useAuth();
  const order = useMemo(() => buildOrderFromRequest(request), [request]);

  const persistEvents = useCallback(
    async (nextEvents: OrderRequestDetail["events"]) => {
      if (!editable) {
        throw new Error("This request can’t be edited right now.");
      }
      const token = await getIdToken();
      if (!token) throw new Error("Not signed in");

      const { request: updated } = await updateOrderRequest(token, request.id, {
        blankSource: request.blankSource,
        subCustomerId: request.subCustomerId || null,
        lineItems: request.lineItems,
        events: nextEvents,
        inHandsDate: request.inHandsDate,
        rush: request.rush,
        customLabel: request.customLabel || "",
        notes: request.notes || "",
        vendorPurchaseOrder: request.vendorPurchaseOrder || null,
        estimateAdjustments: request.estimateAdjustments || [],
        excludedContractFeeIds: request.excludedContractFeeIds || [],
      });

      onRequestChange(updated);
      clearOrderRequestsListCache();
      return updated;
    },
    [editable, getIdToken, onRequestChange, request]
  );

  const patchEvent = useCallback(
    async (
      eventId: string,
      patch: Parameters<typeof applyImprintEditsToEvent>[1]
    ) => {
      const nextEvents = (request.events || []).map((event) =>
        event.id === eventId ? applyImprintEditsToEvent(event, patch) : event
      );
      await persistEvents(nextEvents);
    },
    [persistEvents, request.events]
  );

  const findArtwork = useCallback(
    (eventId: string): ArtworkFile => {
      const built = buildOrderFromRequest(request);
      const job = built.jobs.find((entry) => entry.id === eventId);
      const imprint = job?.imprints[0];
      if (!imprint) {
        throw new Error("Event not found");
      }
      return imprint.artwork;
    },
    [request]
  );

  const adapters = useMemo<ImprintDesignCardAdapters>(
    () => ({
      updateNotes: async (_orderId, _jobId, imprintId, notes) => {
        await patchEvent(imprintId, { notes });
      },
      updateCustomLabel: async (_orderId, _jobId, imprintId, customLabel) => {
        await patchEvent(imprintId, { customLabel });
      },
      updateInkColors: async (_orderId, _jobId, imprintId, inkColors) => {
        await patchEvent(imprintId, {
          inkColors: inkColors as ImprintInkColor[],
        });
      },
      addProofSlide: async (_orderId, _jobId, imprintId, payload) => {
        const current = findArtwork(imprintId);
        const slides = getProofSlides(current);
        if (slides.length >= MAX_PROOF_SLIDES) {
          throw new Error(
            `A proof can include up to ${MAX_PROOF_SLIDES} images`
          );
        }
        const now = new Date().toISOString();
        const slide = {
          id: createSlideId(),
          previewUrl: payload.previewUrl?.trim() || undefined,
          label: (
            payload.label ||
            payload.fileName ||
            `Image ${slides.length + 1}`
          )
            .trim()
            .slice(0, 120),
          sortOrder: slides.length,
          uploadedAt: now,
          uploadedBy: "Shop",
        };
        const artwork = syncArtworkPrimaryPreview({
          ...current,
          name:
            current.name === "No mockup attached" && payload.fileName
              ? payload.fileName
              : current.name,
          status: "pending",
          proofSlides: [...slides, slide],
        });
        await patchEvent(imprintId, { artwork });
      },
      updateProofSlides: async (_orderId, _jobId, imprintId, payload) => {
        const current = findArtwork(imprintId);
        let slides = getProofSlides(current);

        if (payload.removeIds?.length) {
          const remove = new Set(payload.removeIds);
          slides = slides.filter((slide) => !remove.has(slide.id));
        }

        if (payload.slides?.length) {
          const byId = new Map(
            payload.slides.map((slide) => [slide.id, slide])
          );
          slides = slides.map((slide) => {
            const patch = byId.get(slide.id);
            if (!patch) return slide;
            return {
              ...slide,
              label:
                patch.label !== undefined
                  ? patch.label.trim().slice(0, 120)
                  : slide.label,
            };
          });
        }

        if (payload.orderedIds?.length) {
          slides = reorderProofSlides(slides, payload.orderedIds);
        } else {
          slides = slides.map((slide, index) => ({
            ...slide,
            sortOrder: index,
          }));
        }

        const artwork = syncArtworkPrimaryPreview({
          ...current,
          status: "pending",
          proofSlides: slides,
        });
        await patchEvent(imprintId, { artwork });
      },
    }),
    [findArtwork, patchEvent]
  );

  return (
    <section className={dashboardCardClass}>
      <div className="border-b border-[#ebebeb] px-4 py-3.5 sm:px-5">
        <h2 className={dashboardTaskTitleClass}>Proof</h2>
        <p className={cn("mt-0.5", dashboardTaskDetailClass)}>
          Adjust mockups and specs before convert. Approval stays pending on
          requests — customer sign-off starts on the order.
        </p>
      </div>
      <div className="p-4 sm:p-5">
        <OrderDesignTab
          order={order}
          readOnly={!editable}
          forceArtworkStatus="pending"
          hideApprovalActions
          hideApplyFromLibrary
          hideLinkFromFiles
          imprintAdapters={editable ? adapters : undefined}
          subtitle="Upload mockups and set specs per location — all proofs stay pending until this becomes an order."
        />
      </div>
    </section>
  );
}
