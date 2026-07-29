"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { addDays, format } from "date-fns";
import { DecorationTypePill } from "@/components/orders/decoration-type-pill";
import { PortalAddBlankDialog } from "@/components/portal/portal-add-blank-dialog";
import { PortalApplyDesignLibraryDialog } from "@/components/portal/portal-apply-design-library-dialog";
import { PortalDraftLeaveDialog } from "@/components/portal/portal-draft-leave-dialog";
import { PortalOrderRequestDesignStudioDialog } from "@/components/portal/portal-order-request-design-studio-dialog";
import { PortalPrintSizeFields } from "@/components/portal/portal-print-size-fields";
import { PortalVendorPoPanel } from "@/components/portal/portal-vendor-po-panel";
import { usePortalAccess } from "@/components/portal/use-portal-access";
import { usePortalPaths } from "@/components/portal/portal-paths";
import type { DecorationType } from "@/types";
import {
  createPortalOrderRequest,
  fetchPortalOrderRequestMeta,
  getPortalOrderRequest,
  listPortalOrderRequests,
  previewPortalOrderRequestEstimate,
  savePortalOrderRequestDraft,
  type CustomerPortalArtworkItem,
} from "@/lib/customer-portal-api";
import { PortalEstimateBreakdown } from "@/components/portal/portal-estimate-breakdown";
import {
  PortalOrderRequestPricingStep,
  type PortalAutoFee,
  type PortalAvailableFee,
} from "@/components/portal/portal-order-request-pricing-step";
import {
  createDraftEventFromLocation,
  createDraftId,
  createEmptyDraftEvent,
  createEmptyDraftInkColor,
  createEmptyOrderRequestDraft,
  ORDER_REQUEST_DECORATION_OPTIONS,
  ORDER_REQUEST_LOCATION_OPTIONS,
  pieceCountFromSizes,
  type OrderRequestDraft,
  type OrderRequestDraftEvent,
  type OrderRequestDraftLineItem,
  type OrderRequestEstimateTotals,
  type OrderRequestSummary,
} from "@/lib/order-requests";
import {
  clearPortalWizardLocalDraft,
  draftHasMeaningfulContent,
  readPortalWizardLocalDraft,
  writePortalWizardLocalDraft,
} from "@/lib/portal-order-request-draft-storage";
import { dashboardSectionTitleClass } from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  ArrowRight,
  BookMarked,
  Check,
  ChevronDown,
  ImageIcon,
  Loader2,
  Package,
  Plus,
  Save,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";

const STEPS = [
  { id: "garments", label: "Garments" },
  { id: "events", label: "Events" },
  { id: "details", label: "Details & mockups" },
  { id: "pricing", label: "Pricing" },
  { id: "review", label: "Review" },
] as const;

type StepId = (typeof STEPS)[number]["id"];

type MetaState = {
  providers: { id: string; label: string; connected: boolean }[];
  printLocations: {
    value: string;
    label: string;
    decorationType?: string;
  }[];
  decorationTypes: { value: string; label: string }[];
  designPlacementPresets: {
    id: string;
    locationKey: string;
    label: string;
    x: number;
    y: number;
    width: number;
    height: number;
    maxPrintWidthIn?: number;
    maxPrintHeightIn?: number;
    enabled?: boolean;
  }[];
  endBusinesses: { id: string; name: string; contactName?: string }[];
};

type ShopEventOption = {
  value: string;
  label: string;
  decorationType: string;
};

const inputClass =
  "h-10 w-full rounded-lg border border-[#ebebeb] bg-white px-3 text-[13px] text-[#303030] outline-none transition-colors placeholder:text-[#b5b5b5] focus:border-[#c9cccf]";
const labelClass = "mb-1.5 block text-[12px] font-medium text-[#616161]";
const sectionClass =
  "overflow-hidden rounded-2xl border border-[#ebebeb] bg-white shadow-sm";

function defaultInHandsDate() {
  return format(addDays(new Date(), 21), "yyyy-MM-dd");
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

function locationOptions(meta: MetaState | null) {
  if (meta?.printLocations?.length) return meta.printLocations;
  return [...ORDER_REQUEST_LOCATION_OPTIONS];
}

function shopEventOptions(meta: MetaState | null): ShopEventOption[] {
  return locationOptions(meta).map((location) => ({
    value: location.value,
    label: location.label,
    decorationType:
      ("decorationType" in location && location.decorationType?.trim()) ||
      "screen_print",
  }));
}

function decorationTypeOptions(meta: MetaState | null) {
  if (meta?.decorationTypes?.length) return meta.decorationTypes;
  return [...ORDER_REQUEST_DECORATION_OPTIONS];
}

function locationLabel(
  locationKey: string,
  meta: MetaState | null
): string {
  return (
    locationOptions(meta).find((o) => o.value === locationKey)?.label ||
    locationKey.replace(/_/g, " ")
  );
}

function decorationLabel(value: string, meta: MetaState | null = null) {
  return (
    decorationTypeOptions(meta).find((o) => o.value === value)?.label ||
    ORDER_REQUEST_DECORATION_OPTIONS.find((o) => o.value === value)?.label ||
    value.replace(/_/g, " ")
  );
}

function blankLineLabel(item: OrderRequestDraftLineItem, index: number) {
  const parts = [item.brand, item.productName, item.color]
    .map((v) => v.trim())
    .filter(Boolean);
  return parts.length ? parts.join(" · ") : `Blank ${index + 1}`;
}

function buildPayload(
  draft: OrderRequestDraft,
  meta: MetaState | null,
  options?: { includeMockups?: boolean }
) {
  const creatingNew =
    draft.subCustomerId === "__new__" &&
    Boolean(draft.newEndBusinessName.trim());
  const includeMockups = options?.includeMockups !== false;
  return {
    blankSource: draft.blankSource,
    subCustomerId: creatingNew ? undefined : draft.subCustomerId || undefined,
    newEndBusinessName: creatingNew
      ? draft.newEndBusinessName.trim()
      : undefined,
    inHandsDate: draft.inHandsDate,
    rush: draft.rush,
    customLabel: draft.customLabel.trim(),
    notes: draft.notes.trim(),
    estimateAdjustments: draft.estimateAdjustments,
    excludedContractFeeIds: draft.excludedContractFeeIds,
    linkedRequestIds: draft.linkedRequestIds || [],
    vendorPurchaseOrder:
      draft.blankSource === "customer_supplies" && draft.vendorPurchaseOrder
        ? {
            fileName: draft.vendorPurchaseOrder.fileName,
            contentType: draft.vendorPurchaseOrder.contentType,
            fileUrl: includeMockups
              ? draft.vendorPurchaseOrder.fileUrl
              : "",
            vendorName: draft.vendorPurchaseOrder.vendorName.trim(),
            poNumber: draft.vendorPurchaseOrder.poNumber.trim(),
            parseStatus:
              draft.vendorPurchaseOrder.parseStatus === "parsed"
                ? "parsed"
                : draft.vendorPurchaseOrder.parseStatus === "failed"
                  ? "failed"
                  : "manual",
            notes: draft.vendorPurchaseOrder.parseNotes || "",
          }
        : null,
    lineItems: draft.lineItems.map((item) => ({
      id: item.id,
      source: item.source,
      brand: item.brand.trim(),
      productName: item.productName.trim(),
      styleNumber: item.styleNumber.trim() || undefined,
      color: item.color.trim(),
      colorCode: item.colorCode.trim() || undefined,
      sizes: item.sizes,
      unitCost: item.unitCost,
      supplierProvider: item.supplierProvider,
      supplierSku: item.supplierSku,
      previewUrl: includeMockups ? item.previewUrl : undefined,
      notes: item.notes.trim() || undefined,
    })),
    events: draft.events.map((event) => ({
      id: event.id,
      name: event.name.trim(),
      decorationType: event.decorationType,
      locationKey: event.locationKey,
      locationLabel: event.isCustom
        ? event.name.trim() ||
          locationLabel(event.locationKey, meta) ||
          "Custom event"
        : locationLabel(event.locationKey, meta),
      notes: event.notes.trim(),
      printSize: event.printSize.trim(),
      placement: event.placement.trim(),
      lineItemIds: event.lineItemIds,
      inkColors: (event.inkColors || [])
        .map((row) => {
          const pmsCode = row.pmsCode.trim();
          if (!pmsCode) return null;
          return {
            id: row.id,
            name: pmsCode,
            pmsCode,
          };
        })
        .filter((row): row is NonNullable<typeof row> => row != null),
      mockup:
        includeMockups && event.mockupFile
          ? {
              id: event.mockupFile.id,
              name: event.mockupFile.name,
              previewUrl: event.mockupFile.previewUrl,
            }
          : null,
    })),
  };
}

function validateDraft(draft: OrderRequestDraft): string | null {
  const blanksWithQty = draft.lineItems.filter(
    (item) => pieceCountFromSizes(item.sizes) > 0
  );
  if (blanksWithQty.length === 0) {
    return draft.blankSource === "customer_supplies"
      ? "Upload your vendor purchase order (or enter garments) and confirm the blanks."
      : "Add at least one blank with a size quantity greater than zero.";
  }
  if (
    draft.blankSource === "customer_supplies" &&
    !draft.vendorPurchaseOrder?.confirmed
  ) {
    return "Review and confirm the vendor blanks before submitting.";
  }
  if (
    draft.blankSource === "customer_supplies" &&
    !(draft.vendorPurchaseOrder?.poNumber || "").trim()
  ) {
    return "Add the vendor purchase order number.";
  }
  if (
    draft.subCustomerId === "__new__" &&
    !draft.newEndBusinessName.trim()
  ) {
    return "Enter the new end business name, or pick an existing one.";
  }
  if (draft.events.length === 0) {
    return "Add at least one decoration event.";
  }
  const unnamedCustom = draft.events.find(
    (event) => event.isCustom && !event.name.trim()
  );
  if (unnamedCustom) {
    return "Name each one-time event before submitting.";
  }
  return null;
}

export function PortalOrderRequestWizard() {
  const { mode, accent, getAccessToken } = usePortalAccess();
  const paths = usePortalPaths();
  const router = useRouter();
  const searchParams = useSearchParams();
  const draftIdParam = searchParams.get("draftId");

  const [step, setStep] = useState<StepId>("garments");
  const [draft, setDraft] = useState<OrderRequestDraft>(() =>
    createEmptyOrderRequestDraft(defaultInHandsDate())
  );
  const [draftId, setDraftId] = useState<string | null>(draftIdParam);
  const [meta, setMeta] = useState<MetaState | null>(null);
  const [metaLoading, setMetaLoading] = useState(true);
  const [addBlankOpen, setAddBlankOpen] = useState(false);
  const [designStudioEventId, setDesignStudioEventId] = useState<string | null>(
    null
  );
  const [libraryPickerEventId, setLibraryPickerEventId] = useState<string | null>(
    null
  );
  const [selectedProofEventId, setSelectedProofEventId] = useState<string | null>(
    null
  );
  const [eventFilter, setEventFilter] = useState<string>("all");
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [leaveError, setLeaveError] = useState<string | null>(null);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [resumeBanner, setResumeBanner] = useState<string | null>(null);
  const allowLeaveRef = useRef(false);
  const [estimate, setEstimate] = useState<OrderRequestEstimateTotals | null>(
    null
  );
  const [estimateLoading, setEstimateLoading] = useState(false);
  const [estimateError, setEstimateError] = useState<string | null>(null);
  const [pricingMessage, setPricingMessage] = useState<string | null>(null);
  const [pricingReady, setPricingReady] = useState(false);
  const [runCandidates, setRunCandidates] = useState<OrderRequestSummary[]>(
    []
  );
  const [runCandidatesLoading, setRunCandidatesLoading] = useState(false);
  const [autoFees, setAutoFees] = useState<PortalAutoFee[]>([]);
  const [availableFees, setAvailableFees] = useState<PortalAvailableFee[]>([]);

  const portalMode = mode === "auth" ? "auth" : "invite";
  const storageScope = mode === "auth" ? "auth" : "invite";
  const isDirty = draftHasMeaningfulContent(draft);

  const stepIndex = STEPS.findIndex((s) => s.id === step);
  const totalPieces = useMemo(
    () =>
      draft.lineItems.reduce(
        (sum, item) => sum + pieceCountFromSizes(item.sizes),
        0
      ),
    [draft.lineItems]
  );

  const applyRestoredDraft = useCallback(
    (nextDraft: OrderRequestDraft, nextStep?: string | null) => {
      const base = createEmptyOrderRequestDraft(defaultInHandsDate());
      setDraft({
        ...base,
        ...nextDraft,
        linkedRequestIds: nextDraft.linkedRequestIds || [],
        estimateAdjustments: nextDraft.estimateAdjustments || [],
        excludedContractFeeIds: nextDraft.excludedContractFeeIds || [],
      });
      if (nextStep && STEPS.some((entry) => entry.id === nextStep)) {
        setStep(nextStep as StepId);
      }
    },
    []
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setMetaLoading(true);
      try {
        const accessToken = await getAccessToken();
        const data = await fetchPortalOrderRequestMeta(accessToken, {
          mode: portalMode,
        });
        if (!cancelled) {
          setMeta({
            providers: data.providers || [],
            printLocations: data.printLocations || [],
            decorationTypes: data.decorationTypes || [],
            designPlacementPresets: data.designPlacementPresets || [],
            endBusinesses: data.endBusinesses || [],
          });
        }
      } catch {
        if (!cancelled) {
          setMeta({
            providers: [],
            printLocations: [],
            decorationTypes: [],
            designPlacementPresets: [],
            endBusinesses: [],
          });
        }
      } finally {
        if (!cancelled) setMetaLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [getAccessToken, portalMode]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        if (draftIdParam) {
          const accessToken = await getAccessToken();
          const data = await getPortalOrderRequest(accessToken, draftIdParam, {
            mode: portalMode,
          });
          if (cancelled) return;
          if (data.request?.status !== "draft") {
            setError("That draft is no longer available.");
            setHydrated(true);
            return;
          }
          setDraftId(data.request.id);
          const state = data.request.draftState;
          if (state?.draft) {
            applyRestoredDraft(
              {
                ...createEmptyOrderRequestDraft(defaultInHandsDate()),
                ...state.draft,
                linkedRequestIds:
                  state.draft.linkedRequestIds ||
                  data.request.draftLinkedRequestIds ||
                  [],
              },
              state.step
            );
          }
          setResumeBanner(`Resumed draft ${data.request.number}`);
          setHydrated(true);
          return;
        }

        const local = readPortalWizardLocalDraft(storageScope);
        if (local?.draft && draftHasMeaningfulContent(local.draft)) {
          setDraftId(local.draftId || null);
          applyRestoredDraft(local.draft, local.step);
          setResumeBanner("Restored your unsaved work from this browser.");
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Could not restore your draft."
          );
        }
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    applyRestoredDraft,
    draftIdParam,
    getAccessToken,
    portalMode,
    storageScope,
  ]);

  useEffect(() => {
    if (!hydrated) return;
    writePortalWizardLocalDraft(storageScope, {
      draftId,
      step,
      draft,
    });
  }, [draft, draftId, hydrated, step, storageScope]);

  useEffect(() => {
    if (!hydrated || !isDirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (allowLeaveRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [hydrated, isDirty]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  useEffect(() => {
    if (step !== "pricing") return;
    let cancelled = false;
    setRunCandidatesLoading(true);
    void (async () => {
      try {
        const accessToken = await getAccessToken();
        const data = await listPortalOrderRequests(accessToken, {
          mode: mode === "auth" ? "auth" : "invite",
        });
        if (cancelled) return;
        const rows = (data.requests || []).filter(
          (row) =>
            (row.status === "submitted" || row.status === "in_review") &&
            !(row.productionRun && row.productionRun.memberCount > 1)
        );
        setRunCandidates(rows);
        setDraft((prev) => ({
          ...prev,
          linkedRequestIds: prev.linkedRequestIds.filter((id) =>
            rows.some((row) => row.id === id)
          ),
        }));
      } catch {
        if (!cancelled) setRunCandidates([]);
      } finally {
        if (!cancelled) setRunCandidatesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [step, getAccessToken, mode]);

  useEffect(() => {
    if (step !== "pricing" && step !== "review") return;

    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        setEstimateLoading(true);
        setEstimateError(null);
        try {
          const accessToken = await getAccessToken();
          const result = await previewPortalOrderRequestEstimate(
            accessToken,
            buildPayload(draft, meta, { includeMockups: false }),
            { mode: mode === "auth" ? "auth" : "invite" }
          );
          if (cancelled) return;
          setEstimate(result.estimate || null);
          setAutoFees(result.autoFees || []);
          setAvailableFees(result.availableFees || []);
          setPricingReady(result.pricingReady !== false);
          setPricingMessage(result.message || null);
        } catch (err) {
          if (!cancelled) {
            setEstimate(null);
            setAutoFees([]);
            setAvailableFees([]);
            setPricingReady(false);
            setPricingMessage(
              err instanceof Error
                ? err.message
                : "We couldn’t calculate pricing for this request yet."
            );
            setEstimateError(null);
          }
        } finally {
          if (!cancelled) setEstimateLoading(false);
        }
      })();
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [
    step,
    draft.lineItems,
    draft.events,
    draft.blankSource,
    draft.estimateAdjustments,
    draft.excludedContractFeeIds,
    draft.linkedRequestIds,
    draft.subCustomerId,
    getAccessToken,
    mode,
    meta,
  ]);

  const updateEvent = useCallback(
    (
      id: string,
      patch: Partial<OrderRequestDraftEvent> | ((event: OrderRequestDraftEvent) => OrderRequestDraftEvent)
    ) => {
      setDraft((prev) => ({
        ...prev,
        events: prev.events.map((event) => {
          if (event.id !== id) return event;
          return typeof patch === "function" ? patch(event) : { ...event, ...patch };
        }),
      }));
    },
    []
  );

  const addBlankFromDialog = (blank: OrderRequestDraftLineItem) => {
    setDraft((prev) => ({
      ...prev,
      lineItems: [...prev.lineItems, blank],
      events: prev.events.map((event) => ({
        ...event,
        lineItemIds: event.lineItemIds.includes(blank.id)
          ? event.lineItemIds
          : [...event.lineItemIds, blank.id],
      })),
    }));
  };

  const removeBlank = (id: string) => {
    setDraft((prev) => ({
      ...prev,
      lineItems: prev.lineItems.filter((item) => item.id !== id),
      events: prev.events.map((event) => ({
        ...event,
        lineItemIds: event.lineItemIds.filter((lineId) => lineId !== id),
      })),
    }));
  };

  const availableEvents = useMemo(
    () => shopEventOptions(meta),
    [meta]
  );

  const filteredEvents = useMemo(() => {
    if (eventFilter === "all") return availableEvents;
    return availableEvents.filter(
      (event) => event.decorationType === eventFilter
    );
  }, [availableEvents, eventFilter]);

  const eventFilterOptions = useMemo(() => {
    const present = new Set(
      availableEvents.map((event) => event.decorationType)
    );
    return decorationTypeOptions(meta).filter((option) =>
      present.has(option.value)
    );
  }, [availableEvents, meta]);

  const addEventFromShop = (option: ShopEventOption) => {
    setError(null);
    setDraft((prev) => ({
      ...prev,
      events: [
        ...prev.events,
        createDraftEventFromLocation(
          option,
          prev.lineItems.map((item) => item.id)
        ),
      ],
    }));
  };

  const addCustomEvent = () => {
    setError(null);
    const next = createEmptyDraftEvent(draft.lineItems.map((item) => item.id));
    setDraft((prev) => ({
      ...prev,
      events: [...prev.events, next],
    }));
    requestAnimationFrame(() => {
      const input = document.getElementById(
        `event-name-${next.id}`
      ) as HTMLInputElement | null;
      input?.focus();
      input?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  };

  const removeEvent = (id: string) => {
    setDraft((prev) => ({
      ...prev,
      events: prev.events.filter((event) => event.id !== id),
    }));
  };

  const handleMockupUpload = async (
    eventId: string,
    fileList: FileList | null
  ) => {
    const file = fileList?.[0];
    if (!file) return;
    try {
      const previewUrl = await readFileAsDataUrl(file);
      updateEvent(eventId, {
        mockupFile: {
          id: createDraftId("mockup"),
          name: file.name,
          previewUrl,
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not upload mockup.");
    }
  };

  const applyLibraryDesign = (
    eventId: string,
    design: CustomerPortalArtworkItem
  ) => {
    if (!design.previewUrl) {
      setError("That design doesn’t have a preview image to attach.");
      return;
    }
    setError(null);
    const inkFromDesign =
      (design.inkColors || [])
        .filter((row) => row.pmsCode.trim())
        .map((row) => ({
          id: createDraftId("ink"),
          name: row.pmsCode.trim(),
          pmsCode: row.pmsCode.trim(),
        })) || [];
    const pmsFallback =
      inkFromDesign.length === 0
        ? (design.pmsCodes || [])
            .filter(Boolean)
            .map((code) => ({
              id: createDraftId("ink"),
              name: code,
              pmsCode: code,
            }))
        : inkFromDesign;

    updateEvent(eventId, (event) => ({
      ...event,
      mockupFile: {
        id: design.id,
        name: design.name || "Library design",
        previewUrl: design.previewUrl,
      },
      printSize: design.printSize?.trim() || event.printSize,
      placement: design.placement?.trim() || event.placement,
      inkColors:
        pmsFallback.length > 0
          ? pmsFallback
          : event.inkColors?.length
            ? event.inkColors
            : [],
    }));
  };

  const addInkColor = (eventId: string) => {
    updateEvent(eventId, (event) => ({
      ...event,
      inkColors: [...(event.inkColors || []), createEmptyDraftInkColor()],
    }));
  };

  const updateInkColor = (
    eventId: string,
    inkId: string,
    pmsCode: string
  ) => {
    updateEvent(eventId, (event) => ({
      ...event,
      inkColors: (event.inkColors || []).map((row) =>
        row.id === inkId
          ? { ...row, pmsCode, name: pmsCode.trim() }
          : row
      ),
    }));
  };

  const removeInkColor = (eventId: string, inkId: string) => {
    updateEvent(eventId, (event) => ({
      ...event,
      inkColors: (event.inkColors || []).filter((row) => row.id !== inkId),
    }));
  };

  const goNext = () => {
    setError(null);
    if (step === "garments") {
      const hasQty = draft.lineItems.some(
        (item) => pieceCountFromSizes(item.sizes) > 0
      );
      if (!hasQty) {
        setError(
          draft.blankSource === "customer_supplies"
            ? "Upload your vendor purchase order (or enter garments) and confirm the blanks."
            : "Add at least one blank with a size quantity greater than zero."
        );
        return;
      }
      if (
        draft.blankSource === "customer_supplies" &&
        !draft.vendorPurchaseOrder?.confirmed
      ) {
        setError(
          "Review the garments and click Confirm blanks before continuing."
        );
        return;
      }
      if (
        draft.blankSource === "customer_supplies" &&
        !(draft.vendorPurchaseOrder?.poNumber || "").trim()
      ) {
        setError("Add the vendor purchase order number.");
        return;
      }
    }
    if (step === "events" && draft.events.length === 0) {
      setError("Add at least one decoration event.");
      return;
    }
    if (step === "events") {
      const unnamed = draft.events.find(
        (event) => event.isCustom && !event.name.trim()
      );
      if (unnamed) {
        setError("Give each one-time event a name before continuing.");
        return;
      }
    }
    const next = STEPS[stepIndex + 1];
    if (next) setStep(next.id);
  };

  const goBack = () => {
    setError(null);
    const prev = STEPS[stepIndex - 1];
    if (prev) setStep(prev.id);
  };

  const persistDraft = useCallback(async () => {
    const accessToken = await getAccessToken();
    const result = await savePortalOrderRequestDraft(
      accessToken,
      {
        ...buildPayload(draft, meta),
        draftId: draftId || undefined,
        draftState: {
          step,
          draft,
        },
      },
      { mode: portalMode }
    );
    const id = result.detail?.id || result.request?.id || null;
    if (id) setDraftId(id);
    writePortalWizardLocalDraft(storageScope, {
      draftId: id,
      step,
      draft,
    });
    return result;
  }, [
    draft,
    draftId,
    getAccessToken,
    meta,
    portalMode,
    step,
    storageScope,
  ]);

  const handleSaveDraft = async () => {
    if (!isDirty) {
      setError("Add something to this request before saving a draft.");
      return;
    }
    setSavingDraft(true);
    setError(null);
    try {
      const result = await persistDraft();
      setResumeBanner(
        `Draft saved as ${result.request?.number || "draft"}. You can leave anytime and continue later.`
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not save draft."
      );
    } finally {
      setSavingDraft(false);
    }
  };

  const requestLeave = (href: string) => {
    if (!isDirty || allowLeaveRef.current) {
      allowLeaveRef.current = true;
      router.push(href);
      return;
    }
    setPendingHref(href);
    setLeaveError(null);
    setLeaveOpen(true);
  };

  const handleLeaveSave = async () => {
    setSavingDraft(true);
    setLeaveError(null);
    try {
      await persistDraft();
      clearPortalWizardLocalDraft(storageScope);
      allowLeaveRef.current = true;
      setLeaveOpen(false);
      router.push(pendingHref || paths.orderRequests());
    } catch (err) {
      setLeaveError(
        err instanceof Error ? err.message : "Could not save draft."
      );
    } finally {
      setSavingDraft(false);
    }
  };

  const handleLeaveDiscard = () => {
    clearPortalWizardLocalDraft(storageScope);
    allowLeaveRef.current = true;
    setLeaveOpen(false);
    router.push(pendingHref || paths.orderRequests());
  };

  const handleSubmit = async () => {
    const validationError = validateDraft(draft);
    if (validationError) {
      setError(validationError);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const accessToken = await getAccessToken();
      const result = await createPortalOrderRequest(
        accessToken,
        {
          ...buildPayload(draft, meta),
          draftId: draftId || undefined,
        },
        { mode: portalMode }
      );
      const id = result.detail?.id || result.request?.id;
      if (!id) throw new Error("Request created but no id returned.");
      clearPortalWizardLocalDraft(storageScope);
      allowLeaveRef.current = true;
      router.push(paths.orderRequest(id));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not submit order request."
      );
      setSubmitting(false);
    }
  };

  const designStudioEvent = useMemo(
    () =>
      draft.events.find((event) => event.id === designStudioEventId) || null,
    [draft.events, designStudioEventId]
  );

  const designStudioEventTitle = designStudioEvent
    ? designStudioEvent.name.trim() ||
      locationLabel(designStudioEvent.locationKey, meta)
    : "";

  const activeProofEventId =
    draft.events.some((event) => event.id === selectedProofEventId)
      ? selectedProofEventId
      : draft.events[0]?.id || null;

  const activeProofEvent = useMemo(
    () =>
      draft.events.find((event) => event.id === activeProofEventId) || null,
    [draft.events, activeProofEventId]
  );

  const activeProofTitle = activeProofEvent
    ? activeProofEvent.name.trim() ||
      locationLabel(activeProofEvent.locationKey, meta) ||
      "Location"
    : "";

  const activeProofSuggested = activeProofEvent
    ? (meta?.designPlacementPresets || []).find(
        (preset) =>
          preset.locationKey === activeProofEvent.locationKey &&
          preset.enabled !== false
      )
    : undefined;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => requestLeave(paths.orderRequests())}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#e3e3e3] bg-white px-3 text-[13px] font-medium text-[#303030] transition-colors hover:bg-[#fafafa]"
        >
          <ArrowLeft className="size-3.5" />
          All requests
        </button>
        <div className="min-w-0 flex-1">
          <h1 className={dashboardSectionTitleClass}>
            {draftId ? "Continue draft request" : "New order request"}
          </h1>
          <p className="mt-0.5 text-[13px] text-[#616161]">
            {totalPieces.toLocaleString()} pieces · {draft.lineItems.length}{" "}
            blank{draft.lineItems.length === 1 ? "" : "s"} ·{" "}
            {draft.events.length} event{draft.events.length === 1 ? "" : "s"}
            {draftId ? " · Draft" : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void handleSaveDraft()}
          disabled={savingDraft || !isDirty}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#e3e3e3] bg-white px-3 text-[13px] font-semibold text-[#303030] transition-colors hover:bg-[#fafafa] disabled:opacity-50"
        >
          {savingDraft ? (
            <Loader2 className="size-3.5 animate-spin" style={{ color: accent }} />
          ) : (
            <Save className="size-3.5" />
          )}
          Save draft
        </button>
      </div>

      {resumeBanner ? (
        <div className="rounded-xl border border-[#d7e7dc] bg-[#f4faf6] px-4 py-3 text-[13px] text-[#245c3c]">
          {resumeBanner}
        </div>
      ) : null}

      <nav className={cn(sectionClass, "px-4 py-3 sm:px-5")}>
        <ol className="flex w-full items-center">
          {STEPS.map((s, index) => {
            const active = s.id === step;
            const done = index < stepIndex;
            const isLast = index === STEPS.length - 1;
            return (
              <li
                key={s.id}
                className={cn(
                  "flex min-w-0 items-center",
                  !isLast && "flex-1"
                )}
              >
                <button
                  type="button"
                  onClick={() => {
                    if (index <= stepIndex) {
                      setError(null);
                      setStep(s.id);
                    }
                  }}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-2 rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition-colors",
                    active && "bg-[#f6f6f7] text-[#303030]",
                    !active && done && "text-[#303030] hover:bg-[#fafafa]",
                    !active && !done && "cursor-default text-[#8a8a8a]"
                  )}
                >
                  <span
                    className={cn(
                      "inline-flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
                      active || done
                        ? "text-white"
                        : "bg-[#f1f1f1] text-[#8a8a8a]"
                    )}
                    style={
                      active || done ? { backgroundColor: accent } : undefined
                    }
                  >
                    {done ? (
                      <Check className="size-3" strokeWidth={3} />
                    ) : (
                      index + 1
                    )}
                  </span>
                  <span className="whitespace-nowrap">{s.label}</span>
                </button>
                {!isLast ? (
                  <span
                    className={cn(
                      "mx-2 h-px min-w-4 flex-1 sm:mx-3",
                      done ? "bg-[#c9cccf]" : "bg-[#ebebeb]"
                    )}
                    aria-hidden
                  />
                ) : null}
              </li>
            );
          })}
        </ol>
      </nav>

      {error ? (
        <div className="rounded-xl border border-[#f5b5b5] bg-[#fff1f1] px-4 py-3 text-[13px] text-[#8f1f1f]">
          {error}
        </div>
      ) : null}

      {step === "garments" ? (
        <div className="space-y-4">
          <section className={cn(sectionClass, "p-4 sm:p-5")}>
            <p className={labelClass}>Who supplies the blanks?</p>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { value: "shop_orders", label: "Shop orders blanks" },
                  {
                    value: "customer_supplies",
                    label: "Customer supplies blanks",
                  },
                ] as const
              ).map((option) => {
                const selected = draft.blankSource === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() =>
                      setDraft((prev) => {
                        if (prev.blankSource === option.value) return prev;
                        return {
                          ...prev,
                          blankSource: option.value,
                          lineItems: [],
                          vendorPurchaseOrder: null,
                        };
                      })
                    }
                    className={cn(
                      "h-10 rounded-lg border px-3.5 text-[13px] font-medium transition-colors",
                      selected
                        ? "border-transparent text-white"
                        : "border-[#ebebeb] bg-white text-[#303030] hover:bg-[#fafafa]"
                    )}
                    style={
                      selected ? { backgroundColor: accent } : undefined
                    }
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </section>

          <section className={cn(sectionClass, "p-4 sm:p-5")}>
            {draft.blankSource === "customer_supplies" ? (
              <>
                <div className="mb-4">
                  <h2 className="text-[15px] font-semibold text-[#303030]">
                    Vendor purchase order
                  </h2>
                  <p className="text-[12px] text-[#8a8a8a]">
                    Upload the PO for the blanks you&apos;re sending in — we&apos;ll
                    draft the garments so you can confirm counts and the order
                    number.
                  </p>
                </div>
                <PortalVendorPoPanel
                  accent={accent}
                  vendorPo={draft.vendorPurchaseOrder}
                  lineItems={draft.lineItems}
                  onVendorPoChange={(next) =>
                    setDraft((prev) => ({
                      ...prev,
                      vendorPurchaseOrder: next,
                    }))
                  }
                  onLineItemsChange={(next) =>
                    setDraft((prev) => ({
                      ...prev,
                      lineItems: next,
                    }))
                  }
                />
              </>
            ) : (
              <>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-[15px] font-semibold text-[#303030]">
                      Blanks
                    </h2>
                    <p className="text-[12px] text-[#8a8a8a]">
                      {draft.lineItems.length === 0
                        ? "Add garments from catalog or enter details manually."
                        : `${draft.lineItems.length} blank${
                            draft.lineItems.length === 1 ? "" : "s"
                          } · ${totalPieces.toLocaleString()} pieces`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAddBlankOpen(true)}
                    className="inline-flex h-10 items-center gap-1.5 rounded-lg px-4 text-[13px] font-semibold text-white"
                    style={{ backgroundColor: accent }}
                  >
                    <Plus className="size-4" />
                    Add blank
                  </button>
                </div>

                {draft.lineItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#d4d4d4] px-4 py-10 text-center">
                    <Package
                      className="size-8 text-[#c9cccf]"
                      strokeWidth={1.5}
                    />
                    <p className="mt-3 text-[14px] font-semibold text-[#303030]">
                      No blanks yet
                    </p>
                    <p className="mt-1 max-w-sm text-[13px] text-[#616161]">
                      Search S&amp;S or SanMar, or add a garment manually with
                      size quantities.
                    </p>
                    <button
                      type="button"
                      onClick={() => setAddBlankOpen(true)}
                      className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#ebebeb] bg-white px-3.5 text-[13px] font-medium text-[#303030] hover:bg-[#fafafa]"
                    >
                      <Plus className="size-3.5" />
                      Add blank
                    </button>
                  </div>
                ) : (
                  <ul className="space-y-3">
                    {draft.lineItems.map((item, index) => {
                      const pieces = pieceCountFromSizes(item.sizes);
                      const sizeSummary = Object.entries(item.sizes)
                        .filter(([, qty]) => (qty || 0) > 0)
                        .map(([size, qty]) => `${size} ${qty}`)
                        .join(" · ");
                      return (
                        <li
                          key={item.id}
                          className="flex flex-wrap items-start gap-3 rounded-xl border border-[#ebebeb] bg-[#fafafa] p-3 sm:p-4"
                        >
                          <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#ebebeb] bg-white">
                            {item.previewUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={item.previewUrl}
                                alt=""
                                className="size-full object-contain"
                              />
                            ) : (
                              <Package className="size-5 text-[#8a8a8a]" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[14px] font-semibold text-[#303030]">
                              {blankLineLabel(item, index)}
                            </p>
                            <p className="mt-0.5 text-[12px] text-[#616161]">
                              {item.styleNumber
                                ? `Style ${item.styleNumber}`
                                : "No style #"}
                              {item.source === "supplier"
                                ? " · Catalog"
                                : " · Manual"}
                              {" · "}
                              {pieces.toLocaleString()} piece
                              {pieces === 1 ? "" : "s"}
                            </p>
                            {sizeSummary ? (
                              <p className="mt-1 text-[12px] tabular-nums text-[#8a8a8a]">
                                {sizeSummary}
                              </p>
                            ) : null}
                          </div>
                          <button
                            type="button"
                            onClick={() => removeBlank(item.id)}
                            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#ebebeb] bg-white px-3 text-[12px] font-medium text-[#8f1f1f] hover:bg-[#fff1f1]"
                          >
                            <Trash2 className="size-3.5" />
                            Remove
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </>
            )}
          </section>

          <PortalAddBlankDialog
            open={addBlankOpen}
            onOpenChange={setAddBlankOpen}
            providers={meta?.providers || []}
            accent={accent}
            onAdd={addBlankFromDialog}
          />
        </div>
      ) : null}

      {step === "events" ? (
        <div className="space-y-4">
          <section className={cn(sectionClass, "p-4 sm:p-5")}>
            <div className="mb-4">
              <h2 className="text-[15px] font-semibold text-[#303030]">
                Choose decoration locations
              </h2>
              <p className="mt-0.5 text-[12px] text-[#8a8a8a]">
                Pick a shop standard, or add a one-time event if what you need
                isn&apos;t listed.
              </p>
            </div>

            {eventFilterOptions.length > 1 ? (
              <div className="mb-3 flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setEventFilter("all")}
                  className={cn(
                    "inline-flex h-8 items-center rounded-full border px-3 text-[12px] font-semibold transition-colors",
                    eventFilter === "all"
                      ? "border-transparent text-white"
                      : "border-[#ebebeb] bg-white text-[#616161] hover:bg-[#fafafa]"
                  )}
                  style={
                    eventFilter === "all"
                      ? { backgroundColor: accent }
                      : undefined
                  }
                >
                  All
                </button>
                {eventFilterOptions.map((option) => {
                  const active = eventFilter === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setEventFilter(option.value)}
                      className={cn(
                        "inline-flex h-8 items-center rounded-full border px-3 text-[12px] font-semibold transition-colors",
                        active
                          ? "border-transparent text-white"
                          : "border-[#ebebeb] bg-white text-[#616161] hover:bg-[#fafafa]"
                      )}
                      style={
                        active ? { backgroundColor: accent } : undefined
                      }
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            ) : null}

            {metaLoading ? (
              <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-[#d4d4d4] px-4 py-10 text-[13px] text-[#8a8a8a]">
                <Loader2 className="size-4 animate-spin" />
                Loading shop events…
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#d4d4d4] px-4 py-8 text-center">
                <p className="text-[14px] font-semibold text-[#303030]">
                  No standard events listed
                </p>
                <p className="mt-1 text-[13px] text-[#616161]">
                  Add a one-time event below with the name and decoration
                  details you need.
                </p>
              </div>
            ) : (
              <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {filteredEvents.map((option) => {
                  const selectedCount = draft.events.filter(
                    (event) =>
                      !event.isCustom && event.locationKey === option.value
                  ).length;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => addEventFromShop(option)}
                      className={cn(
                        "rounded-xl border bg-white p-3.5 text-left transition-colors",
                        selectedCount > 0
                          ? "border-[#c9cccf] bg-[#fafafa]"
                          : "border-[#ebebeb] hover:border-[#c9cccf] hover:bg-[#fafafa]"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[13px] font-semibold text-[#303030]">
                          {option.label}
                        </p>
                        {selectedCount > 0 ? (
                          <span
                            className="inline-flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
                            style={{ backgroundColor: accent }}
                          >
                            {selectedCount}
                          </span>
                        ) : (
                          <Plus className="size-4 shrink-0 text-[#c9cccf]" />
                        )}
                      </div>
                      <p className="mt-1 text-[12px] text-[#8a8a8a]">
                        {decorationLabel(option.decorationType, meta)}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}

            <button
              type="button"
              onClick={addCustomEvent}
              className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#c9cccf] bg-[#fafafa] px-4 text-[13px] font-semibold text-[#303030] transition-colors hover:border-[#aeb0b3] hover:bg-white"
            >
              <Plus className="size-4" style={{ color: accent }} />
              Add one-time / custom event
            </button>
          </section>

          {draft.events.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-baseline justify-between gap-3 px-0.5">
                <h2 className="text-[15px] font-semibold text-[#303030]">
                  Selected events
                </h2>
                <p className="text-[12px] text-[#8a8a8a]">
                  {draft.events.length} selected · add proofs on the next step
                </p>
              </div>

              {draft.events.map((event, index) => (
                <section
                  key={event.id}
                  className={cn(sectionClass, "p-4 sm:p-5")}
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-[14px] font-semibold text-[#303030]">
                          {event.isCustom
                            ? event.name.trim() || "One-time event"
                            : event.name ||
                              locationLabel(event.locationKey, meta)}
                        </h3>
                        {event.isCustom ? (
                          <span
                            className="rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white"
                            style={{ backgroundColor: accent }}
                          >
                            Custom
                          </span>
                        ) : (
                          <span className="rounded-md border border-[#ebebeb] bg-[#f6f6f7] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#616161]">
                            {decorationLabel(event.decorationType, meta)}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-[12px] text-[#8a8a8a]">
                        Event {index + 1}
                        {event.isCustom
                          ? " · name it and set decoration details"
                          : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeEvent(event.id)}
                      className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-[#ebebeb] px-3 text-[12px] font-medium text-[#8f1f1f] hover:bg-[#fff1f1]"
                    >
                      <Trash2 className="size-3.5" />
                      Remove
                    </button>
                  </div>

                  {event.isCustom ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <label className={labelClass} htmlFor={`event-name-${event.id}`}>
                          Event name
                        </label>
                        <input
                          id={`event-name-${event.id}`}
                          className={inputClass}
                          value={event.name}
                          placeholder="e.g. Left sleeve special, Hang tag, Cap front"
                          onChange={(e) =>
                            updateEvent(event.id, { name: e.target.value })
                          }
                          onFocus={(e) => e.currentTarget.select()}
                        />
                      </div>
                      <div>
                        <label
                          className={labelClass}
                          htmlFor={`event-deco-${event.id}`}
                        >
                          Decoration
                        </label>
                        <div className="relative">
                          <select
                            id={`event-deco-${event.id}`}
                            className={cn(inputClass, "appearance-none pr-9")}
                            value={event.decorationType}
                            onChange={(e) =>
                              updateEvent(event.id, {
                                decorationType: e.target.value,
                              })
                            }
                          >
                            {decorationTypeOptions(meta).map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[#8a8a8a]" />
                        </div>
                      </div>
                      <div>
                        <label
                          className={labelClass}
                          htmlFor={`event-loc-${event.id}`}
                        >
                          Closest location
                        </label>
                        <div className="relative">
                          <select
                            id={`event-loc-${event.id}`}
                            className={cn(inputClass, "appearance-none pr-9")}
                            value={event.locationKey}
                            onChange={(e) =>
                              updateEvent(event.id, {
                                locationKey: e.target.value,
                              })
                            }
                          >
                            {locationOptions(meta).map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                            {!locationOptions(meta).some(
                              (option) => option.value === "other"
                            ) ? (
                              <option value="other">Other</option>
                            ) : null}
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[#8a8a8a]" />
                        </div>
                      </div>
                      <div className="sm:col-span-2">
                        <label
                          className={labelClass}
                          htmlFor={`event-notes-${event.id}`}
                        >
                          Notes{" "}
                          <span className="font-normal text-[#8a8a8a]">
                            (optional)
                          </span>
                        </label>
                        <input
                          id={`event-notes-${event.id}`}
                          className={inputClass}
                          value={event.notes}
                          placeholder="Placement details, special instructions…"
                          onChange={(e) =>
                            updateEvent(event.id, { notes: e.target.value })
                          }
                        />
                      </div>
                    </div>
                  ) : null}
                </section>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-[#d4d4d4] bg-white px-4 py-8 text-center">
              <p className="text-[14px] font-semibold text-[#303030]">
                No events selected yet
              </p>
              <p className="mx-auto mt-1 max-w-sm text-[13px] text-[#616161]">
                Tap a location above, or add a one-time event if you need
                something custom.
              </p>
            </div>
          )}
        </div>
      ) : null}

      {step === "details" ? (
        <div className="space-y-4">
          <section className={cn(sectionClass, "p-4 sm:p-5")}>
            <div className="mb-4">
              <h2 className="text-[15px] font-semibold text-[#303030]">
                End business
              </h2>
              <p className="mt-0.5 text-[12px] text-[#8a8a8a]">
                Brokers and contractors — pick which brand or end client this
                request is for. The shop will review against that account.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className={labelClass}>Who is this order for?</label>
                <select
                  className={inputClass}
                  value={draft.subCustomerId}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      subCustomerId: e.target.value,
                      newEndBusinessName:
                        e.target.value === "__new__"
                          ? prev.newEndBusinessName
                          : "",
                    }))
                  }
                >
                  <option value="">General account order</option>
                  {(meta?.endBusinesses || []).map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.name}
                      {entry.contactName ? ` · ${entry.contactName}` : ""}
                    </option>
                  ))}
                  <option value="__new__">Add a new end business…</option>
                </select>
              </div>

              {draft.subCustomerId === "__new__" ? (
                <div>
                  <label className={labelClass}>New end business name</label>
                  <input
                    className={inputClass}
                    value={draft.newEndBusinessName}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        newEndBusinessName: e.target.value,
                      }))
                    }
                    placeholder="e.g. Northside Athletics"
                  />
                  <p className="mt-1 text-[11px] text-[#8a8a8a]">
                    We’ll save this under your account for next time.
                  </p>
                </div>
              ) : null}
            </div>
          </section>

          <section className={cn(sectionClass, "p-4 sm:p-5")}>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Custom order name</label>
                <input
                  className={inputClass}
                  value={draft.customLabel}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      customLabel: e.target.value,
                    }))
                  }
                  placeholder="e.g. Summer staff tees"
                />
              </div>
              <div>
                <label className={labelClass}>In-hands date</label>
                <input
                  type="date"
                  className={inputClass}
                  value={draft.inHandsDate}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      inHandsDate: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <label className="mt-4 flex cursor-pointer items-center gap-2.5 text-[13px] text-[#303030]">
              <input
                type="checkbox"
                checked={draft.rush}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, rush: e.target.checked }))
                }
                className="size-4 rounded border-[#c9cccf]"
                style={{ accentColor: accent }}
              />
              Rush request
            </label>

            <div className="mt-4">
              <label className={labelClass}>Notes for the shop</label>
              <textarea
                className="min-h-[100px] w-full rounded-lg border border-[#ebebeb] bg-white px-3 py-2 text-[13px] text-[#303030] outline-none placeholder:text-[#b5b5b5] focus:border-[#c9cccf]"
                value={draft.notes}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, notes: e.target.value }))
                }
                placeholder="Anything else the shop should know…"
              />
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-[15px] font-semibold text-[#303030]">
                  Proof by location
                </h2>
                <p className="mt-0.5 text-[12px] text-[#8a8a8a]">
                  Upload mockups, pull from your design library, set print size
                  and placement — one location at a time.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {draft.events.length > 0 ? (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        setLibraryPickerEventId(
                          activeProofEventId || draft.events[0]?.id || null
                        )
                      }
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#ebebeb] bg-white px-3 text-[12px] font-medium text-[#303030] hover:bg-[#f6f6f7]"
                    >
                      <BookMarked className="size-3.5" />
                      Apply from library
                    </button>
                    <p className="text-[12px] text-[#8a8a8a]">
                      {draft.events.filter((e) => e.mockupFile).length} of{" "}
                      {draft.events.length} with mockups
                    </p>
                  </>
                ) : null}
              </div>
            </div>

            {draft.events.length === 0 ? (
              <div
                className={cn(
                  sectionClass,
                  "flex flex-col items-center justify-center px-4 py-12 text-center"
                )}
              >
                <ImageIcon
                  className="size-8 text-[#c9cccf]"
                  strokeWidth={1.5}
                />
                <p className="mt-3 text-[14px] font-semibold text-[#303030]">
                  No locations yet
                </p>
                <p className="mt-1 max-w-sm text-[13px] text-[#616161]">
                  Go back to Events and pick decoration locations first, then
                  you can attach proofs here.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
                <nav
                  className={cn(
                    sectionClass,
                    "h-fit space-y-1 p-2 lg:sticky lg:top-4"
                  )}
                >
                  <p className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                    Locations
                  </p>
                  {draft.events.map((event, index) => {
                    const title =
                      event.name.trim() ||
                      locationLabel(event.locationKey, meta) ||
                      `Event ${index + 1}`;
                    const selected = activeProofEventId === event.id;
                    const hasMockup = Boolean(event.mockupFile);
                    return (
                      <button
                        key={event.id}
                        type="button"
                        onClick={() => setSelectedProofEventId(event.id)}
                        className={cn(
                          "w-full rounded-lg px-2.5 py-2.5 text-left transition-colors",
                          selected
                            ? "bg-[#f4f7fd] ring-1 ring-[#2c6ecb]/25"
                            : "hover:bg-[#fafafa]"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p
                            className={cn(
                              "text-[13px] font-semibold leading-snug",
                              selected ? "text-[#2c6ecb]" : "text-[#303030]"
                            )}
                          >
                            {title}
                          </p>
                          <span
                            className={cn(
                              "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                              hasMockup
                                ? "bg-[#eaf6ee] text-[#0d5c2e]"
                                : "bg-[#fff4d6] text-[#8a6116]"
                            )}
                          >
                            <span
                              className={cn(
                                "size-1.5 rounded-full",
                                hasMockup ? "bg-[#0d5c2e]" : "bg-[#c9891a]"
                              )}
                            />
                            {hasMockup ? "Ready" : "Pending"}
                          </span>
                        </div>
                        <div className="mt-1.5">
                          <DecorationTypePill
                            decoration={
                              (event.decorationType ||
                                "screen_print") as DecorationType
                            }
                            label={decorationLabel(event.decorationType, meta)}
                          />
                        </div>
                      </button>
                    );
                  })}
                </nav>

                <div className="min-w-0">
                  {activeProofEvent ? (
                    <div
                      className={cn(
                        sectionClass,
                        "overflow-hidden bg-[#fafafa]"
                      )}
                    >
                      <div className="border-b border-[#ebebeb] bg-white px-4 py-3 sm:px-5">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate text-[14px] font-semibold text-[#303030]">
                                {activeProofTitle}
                              </p>
                              <DecorationTypePill
                                decoration={
                                  (activeProofEvent.decorationType ||
                                    "screen_print") as DecorationType
                                }
                                label={decorationLabel(
                                  activeProofEvent.decorationType,
                                  meta
                                )}
                              />
                            </div>
                            <p className="mt-0.5 text-[12px] text-[#8a8a8a]">
                              {activeProofSuggested?.maxPrintWidthIn &&
                              activeProofSuggested?.maxPrintHeightIn
                                ? `Suggested max ${activeProofSuggested.maxPrintWidthIn}" × ${activeProofSuggested.maxPrintHeightIn}"`
                                : activeProofSuggested?.maxPrintWidthIn
                                  ? `Suggested max ${activeProofSuggested.maxPrintWidthIn}"`
                                  : "Set print size, placement, and colors for this location"}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-0 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
                        <div className="border-b border-[#ebebeb] p-3 sm:p-4 lg:border-b-0 lg:border-r">
                          {activeProofEvent.mockupFile ? (
                            <div className="space-y-3">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={activeProofEvent.mockupFile.previewUrl}
                                alt={activeProofEvent.mockupFile.name}
                                className="aspect-square w-full rounded-xl border border-[#ebebeb] bg-white object-contain p-2"
                              />
                              <p className="truncate text-[12px] text-[#616161]">
                                {activeProofEvent.mockupFile.name}
                              </p>
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setLibraryPickerEventId(activeProofEvent.id)
                                  }
                                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#ebebeb] bg-white px-3 text-[12px] font-medium text-[#303030] hover:bg-[#f6f6f7]"
                                >
                                  <BookMarked className="size-3.5" />
                                  From library
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setDesignStudioEventId(activeProofEvent.id)
                                  }
                                  className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-[12px] font-semibold text-white"
                                  style={{ backgroundColor: accent }}
                                >
                                  <Sparkles className="size-3.5" />
                                  Design studio
                                </button>
                                <label className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-[#ebebeb] bg-white px-3 text-[12px] font-medium text-[#303030] hover:bg-[#f6f6f7]">
                                  <Upload className="size-3.5" />
                                  Replace
                                  <input
                                    type="file"
                                    accept="image/*,.pdf"
                                    className="hidden"
                                    onChange={(e) => {
                                      void handleMockupUpload(
                                        activeProofEvent.id,
                                        e.target.files
                                      );
                                      e.target.value = "";
                                    }}
                                  />
                                </label>
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateEvent(activeProofEvent.id, {
                                      mockupFile: null,
                                    })
                                  }
                                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#ebebeb] bg-white px-3 text-[12px] font-medium text-[#8f1f1f] hover:bg-[#fff1f1]"
                                >
                                  <Trash2 className="size-3.5" />
                                  Remove
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-[#d4d4d4] bg-white px-4 py-8 text-center">
                              <span className="inline-flex size-10 items-center justify-center rounded-full border border-dashed border-[#c9cccf] bg-[#fafafa]">
                                <ImageIcon
                                  className="size-4 text-[#8a8a8a]"
                                  strokeWidth={1.5}
                                />
                              </span>
                              <div>
                                <p className="text-[13px] font-semibold text-[#303030]">
                                  No proof yet
                                </p>
                                <p className="mt-0.5 text-[12px] text-[#8a8a8a]">
                                  Reuse a saved design, open Design studio, or
                                  upload a mockup
                                </p>
                              </div>
                              <div className="flex flex-wrap justify-center gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setLibraryPickerEventId(activeProofEvent.id)
                                  }
                                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#ebebeb] bg-white px-3.5 text-[12px] font-medium text-[#303030] hover:bg-[#f6f6f7]"
                                >
                                  <BookMarked className="size-3.5" />
                                  From library
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setDesignStudioEventId(activeProofEvent.id)
                                  }
                                  className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3.5 text-[12px] font-semibold text-white"
                                  style={{ backgroundColor: accent }}
                                >
                                  <Sparkles className="size-3.5" />
                                  Design studio
                                </button>
                                <label className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-[#ebebeb] bg-white px-3.5 text-[12px] font-medium text-[#303030] hover:bg-[#f6f6f7]">
                                  <Upload className="size-3.5" />
                                  Upload
                                  <input
                                    type="file"
                                    accept="image/*,.pdf"
                                    className="hidden"
                                    onChange={(e) => {
                                      void handleMockupUpload(
                                        activeProofEvent.id,
                                        e.target.files
                                      );
                                      e.target.value = "";
                                    }}
                                  />
                                </label>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="space-y-4 bg-white p-3 sm:p-4">
                          <div className="space-y-1.5">
                            <label className={labelClass}>Print size</label>
                            <PortalPrintSizeFields
                              dimensions={activeProofEvent.printSize}
                              onChange={(value) =>
                                updateEvent(activeProofEvent.id, {
                                  printSize: value,
                                })
                              }
                            />
                            <p className="text-[11px] text-[#8a8a8a]">
                              Width × height in inches
                            </p>
                          </div>

                          <div className="space-y-1.5">
                            <label className={labelClass}>Placement</label>
                            <input
                              className={inputClass}
                              value={activeProofEvent.placement}
                              onChange={(e) =>
                                updateEvent(activeProofEvent.id, {
                                  placement: e.target.value,
                                })
                              }
                              placeholder={'e.g. 3" below collar'}
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className={labelClass}>
                              Notes for this location
                            </label>
                            <textarea
                              className="min-h-[72px] w-full rounded-lg border border-[#ebebeb] bg-white px-3 py-2 text-[13px] text-[#303030] outline-none placeholder:text-[#b5b5b5] focus:border-[#c9cccf]"
                              value={activeProofEvent.notes}
                              onChange={(e) =>
                                updateEvent(activeProofEvent.id, {
                                  notes: e.target.value,
                                })
                              }
                              placeholder="Special instructions for production…"
                            />
                          </div>

                          <div className="space-y-2 border-t border-[#ebebeb] pt-4">
                            <div className="flex items-center justify-between gap-2">
                              <label className={cn(labelClass, "mb-0")}>
                                PMS colors
                              </label>
                              <button
                                type="button"
                                onClick={() =>
                                  addInkColor(activeProofEvent.id)
                                }
                                className="inline-flex h-7 items-center gap-1 rounded-md border border-[#ebebeb] bg-white px-2 text-[11px] font-medium text-[#303030] hover:bg-[#f6f6f7]"
                              >
                                <Plus className="size-3" />
                                Add color
                              </button>
                            </div>
                            {(activeProofEvent.inkColors || []).length === 0 ? (
                              <p className="rounded-lg border border-dashed border-[#d4d4d4] bg-[#fafafa] px-3 py-4 text-center text-[12px] text-[#8a8a8a]">
                                Add Pantone / PMS codes for this location.
                              </p>
                            ) : (
                              <div className="space-y-2">
                                {(activeProofEvent.inkColors || []).map(
                                  (row) => (
                                    <div
                                      key={row.id}
                                      className="flex items-center gap-2"
                                    >
                                      <input
                                        className={cn(inputClass, "bg-white")}
                                        value={row.pmsCode}
                                        onChange={(e) =>
                                          updateInkColor(
                                            activeProofEvent.id,
                                            row.id,
                                            e.target.value
                                          )
                                        }
                                        placeholder="e.g. 289 C"
                                        aria-label={`PMS for ${activeProofTitle}`}
                                      />
                                      <button
                                        type="button"
                                        onClick={() =>
                                          removeInkColor(
                                            activeProofEvent.id,
                                            row.id
                                          )
                                        }
                                        className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg border border-[#ebebeb] bg-white text-[#8f1f1f] hover:bg-[#fff1f1]"
                                        aria-label="Remove PMS color"
                                      >
                                        <Trash2 className="size-3.5" />
                                      </button>
                                    </div>
                                  )
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            )}
          </section>
        </div>
      ) : null}

      {step === "pricing" ? (
        <PortalOrderRequestPricingStep
          accent={accent}
          estimate={estimate}
          loading={estimateLoading}
          error={estimateError}
          message={pricingMessage}
          pricingReady={pricingReady}
          autoFees={autoFees}
          availableFees={availableFees}
          manualFees={draft.estimateAdjustments || []}
          excludedContractFeeIds={draft.excludedContractFeeIds || []}
          blankSource={draft.blankSource}
          lineItems={draft.lineItems}
          runCandidates={runCandidates}
          runCandidatesLoading={runCandidatesLoading}
          linkedRequestIds={draft.linkedRequestIds || []}
          onLinkedRequestIdsChange={(next) =>
            setDraft((prev) => ({ ...prev, linkedRequestIds: next }))
          }
          onManualFeesChange={(next) =>
            setDraft((prev) => ({ ...prev, estimateAdjustments: next }))
          }
          onExcludedChange={(next) =>
            setDraft((prev) => ({ ...prev, excludedContractFeeIds: next }))
          }
        />
      ) : null}

      {step === "review" ? (
        <div className="space-y-4">
          <PortalEstimateBreakdown
            estimate={estimate}
            accent={accent}
            loading={estimateLoading}
            error={
              estimateError ||
              (!pricingReady && pricingMessage ? pricingMessage : null)
            }
            blankSource={draft.blankSource}
            lineItems={draft.lineItems}
          />

          <section className={cn(sectionClass, "p-4 sm:p-5")}>
            <h2 className="text-[15px] font-semibold text-[#303030]">Details</h2>
            <dl className="mt-3 grid gap-3 text-[13px] sm:grid-cols-2">
              <div>
                <dt className="text-[#8a8a8a]">Blank source</dt>
                <dd className="mt-0.5 font-medium text-[#303030]">
                  {draft.blankSource === "customer_supplies"
                    ? "Customer supplies blanks"
                    : "Shop orders blanks"}
                </dd>
              </div>
              <div>
                <dt className="text-[#8a8a8a]">End business</dt>
                <dd className="mt-0.5 font-medium text-[#303030]">
                  {draft.subCustomerId === "__new__"
                    ? draft.newEndBusinessName.trim() || "New end business"
                    : (meta?.endBusinesses || []).find(
                        (entry) => entry.id === draft.subCustomerId
                      )?.name || "General account"}
                </dd>
              </div>
              {draft.blankSource === "customer_supplies" &&
              draft.vendorPurchaseOrder?.poNumber ? (
                <div>
                  <dt className="text-[#8a8a8a]">Vendor PO #</dt>
                  <dd className="mt-0.5 font-medium text-[#303030]">
                    {draft.vendorPurchaseOrder.poNumber}
                    {draft.vendorPurchaseOrder.vendorName
                      ? ` · ${draft.vendorPurchaseOrder.vendorName}`
                      : ""}
                  </dd>
                </div>
              ) : null}
              <div>
                <dt className="text-[#8a8a8a]">In-hands</dt>
                <dd className="mt-0.5 font-medium text-[#303030]">
                  {draft.inHandsDate || "—"}
                  {draft.rush ? " · Rush" : ""}
                </dd>
              </div>
              {draft.linkedRequestIds?.length ? (
                <div className="sm:col-span-2">
                  <dt className="text-[#8a8a8a]">Runs with</dt>
                  <dd className="mt-0.5 font-medium text-[#303030]">
                    {runCandidates
                      .filter((row) => draft.linkedRequestIds.includes(row.id))
                      .map((row) =>
                        row.customLabel
                          ? `${row.number} · ${row.customLabel}`
                          : row.number
                      )
                      .join(", ") ||
                      `${draft.linkedRequestIds.length} linked request${
                        draft.linkedRequestIds.length === 1 ? "" : "s"
                      }`}
                  </dd>
                </div>
              ) : null}
              <div>
                <dt className="text-[#8a8a8a]">Order name</dt>
                <dd className="mt-0.5 font-medium text-[#303030]">
                  {draft.customLabel.trim() || "—"}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-[#8a8a8a]">Notes</dt>
                <dd className="mt-0.5 whitespace-pre-wrap text-[#303030]">
                  {draft.notes.trim() || "—"}
                </dd>
              </div>
            </dl>
          </section>

          <section className={cn(sectionClass, "overflow-x-auto")}>
            <div className="border-b border-[#ebebeb] px-4 py-3 sm:px-5">
              <h2 className="text-[15px] font-semibold text-[#303030]">
                Blanks ({draft.lineItems.length})
              </h2>
            </div>
            <table className="min-w-full text-left text-[13px]">
              <thead className="bg-[#fafafa] text-[12px] text-[#8a8a8a]">
                <tr>
                  <th className="px-4 py-2.5 font-medium sm:px-5">Garment</th>
                  <th className="px-4 py-2.5 font-medium">Style</th>
                  <th className="px-4 py-2.5 font-medium">Color</th>
                  <th className="px-4 py-2.5 font-medium text-right sm:px-5">
                    Qty
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1f1f1]">
                {draft.lineItems.map((item, index) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3 sm:px-5">
                      <p className="font-medium text-[#303030]">
                        {blankLineLabel(item, index)}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-[#616161]">
                      {item.styleNumber || "—"}
                    </td>
                    <td className="px-4 py-3 text-[#616161]">
                      {item.color || "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums text-[#303030] sm:px-5">
                      {pieceCountFromSizes(item.sizes).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className={cn(sectionClass, "p-4 sm:p-5")}>
            <h2 className="text-[15px] font-semibold text-[#303030]">
              Events ({draft.events.length})
            </h2>
            <ul className="mt-3 space-y-3">
              {draft.events.map((event, index) => (
                <li
                  key={event.id}
                  className="flex flex-wrap items-start gap-3 rounded-xl border border-[#ebebeb] p-3"
                >
                  {event.mockupFile ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={event.mockupFile.previewUrl}
                      alt=""
                      className="size-14 rounded-lg border border-[#ebebeb] object-cover"
                    />
                  ) : (
                    <div className="flex size-14 items-center justify-center rounded-lg border border-[#ebebeb] bg-[#fafafa] text-[#b5b5b5]">
                      <ImageIcon className="size-5" strokeWidth={1.5} />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-[#303030]">
                        {event.name.trim() || `Event ${index + 1}`}
                      </p>
                      {event.isCustom ? (
                        <span
                          className="rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white"
                          style={{ backgroundColor: accent }}
                        >
                          Custom
                        </span>
                      ) : null}
                    </div>
                    <p className="text-[12px] text-[#616161]">
                      {decorationLabel(event.decorationType)} ·{" "}
                      {event.isCustom
                        ? event.name.trim() ||
                          locationLabel(event.locationKey, meta)
                        : locationLabel(event.locationKey, meta)}
                      {event.printSize.trim()
                        ? ` · ${event.printSize.trim()}`
                        : ""}
                    </p>
                    {event.placement.trim() ? (
                      <p className="mt-1 text-[12px] text-[#8a8a8a]">
                        Placement: {event.placement.trim()}
                      </p>
                    ) : null}
                    {(event.inkColors || []).filter((row) =>
                      row.pmsCode.trim()
                    ).length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {(event.inkColors || [])
                          .filter((row) => row.pmsCode.trim())
                          .map((row) => (
                            <span
                              key={row.id}
                              className="inline-flex rounded-md border border-[#ebebeb] bg-[#f6f6f7] px-2 py-0.5 text-[11px] font-medium text-[#303030]"
                            >
                              {row.pmsCode.trim()}
                            </span>
                          ))}
                      </div>
                    ) : null}
                    {event.notes.trim() ? (
                      <p className="mt-1 text-[12px] text-[#8a8a8a]">
                        {event.notes.trim()}
                      </p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#ebebeb] pt-4">
        <div>
          {stepIndex > 0 ? (
            <button
              type="button"
              onClick={goBack}
              className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-[#ebebeb] bg-white px-4 text-[13px] font-medium text-[#303030] hover:bg-[#fafafa]"
            >
              <ArrowLeft className="size-3.5" />
              Back
            </button>
          ) : (
            <button
              type="button"
              onClick={() => requestLeave(paths.orderRequests())}
              className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-[#ebebeb] bg-white px-4 text-[13px] font-medium text-[#303030] hover:bg-[#fafafa]"
            >
              Cancel
            </button>
          )}
        </div>
        <div>
          {step === "review" ? (
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={submitting}
              className="inline-flex h-10 items-center gap-1.5 rounded-lg px-5 text-[13px] font-semibold text-white disabled:opacity-60"
              style={{ backgroundColor: accent }}
            >
              {submitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Check className="size-4" />
              )}
              Submit request
            </button>
          ) : (
            <button
              type="button"
              onClick={goNext}
              className="inline-flex h-10 items-center gap-1.5 rounded-lg px-5 text-[13px] font-semibold text-white"
              style={{ backgroundColor: accent }}
            >
              Continue
              <ArrowRight className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      <PortalOrderRequestDesignStudioDialog
        open={Boolean(designStudioEvent)}
        onOpenChange={(next) => {
          if (!next) setDesignStudioEventId(null);
        }}
        event={designStudioEvent}
        eventTitle={designStudioEventTitle}
        lineItems={draft.lineItems}
        accent={accent}
        placementPresets={
          meta?.designPlacementPresets?.length
            ? meta.designPlacementPresets
            : null
        }
        onRequestAddBlank={() => {
          setDesignStudioEventId(null);
          setAddBlankOpen(true);
        }}
        onSave={(mockup) => {
          if (!designStudioEvent) return;
          updateEvent(designStudioEvent.id, (event) => ({
            ...event,
            mockupFile: {
              id: mockup.id,
              name: mockup.name,
              previewUrl: mockup.previewUrl,
            },
            printSize:
              event.printSize.trim() || mockup.suggestedPrintSize || "",
          }));
          setDesignStudioEventId(null);
        }}
      />

      <PortalApplyDesignLibraryDialog
        open={Boolean(libraryPickerEventId)}
        onOpenChange={(next) => {
          if (!next) setLibraryPickerEventId(null);
        }}
        accent={accent}
        locationKey={
          draft.events.find((event) => event.id === libraryPickerEventId)
            ?.locationKey
        }
        locationLabel={
          libraryPickerEventId
            ? locationLabel(
                draft.events.find((event) => event.id === libraryPickerEventId)
                  ?.locationKey || "",
                meta
              ) ||
              draft.events.find((event) => event.id === libraryPickerEventId)
                ?.name
            : undefined
        }
        onApply={(design) => {
          if (!libraryPickerEventId) return;
          applyLibraryDesign(libraryPickerEventId, design);
          setLibraryPickerEventId(null);
        }}
      />

      <PortalDraftLeaveDialog
        open={leaveOpen}
        accent={accent}
        saving={savingDraft}
        error={leaveError}
        onStay={() => {
          setLeaveOpen(false);
          setPendingHref(null);
          setLeaveError(null);
        }}
        onDiscard={handleLeaveDiscard}
        onSave={() => void handleLeaveSave()}
      />
    </div>
  );
}
