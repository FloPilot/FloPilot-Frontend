import type { OrderRequestDetail } from "@/lib/order-requests";

/** Same tab ids as orders so convert feels continuous. */
export type OrderRequestDetailTab =
  | "events"
  | "blanks"
  | "design"
  | "proof"
  | "estimate"
  | "dtf_sheets"
  | "screens"
  | "inks"
  | "files"
  | "customer"
  | "produced_goods"
  | "shipping"
  | "invoice"
  | "activity";

export type OrderRequestDetailTabConfig = {
  id: OrderRequestDetailTab;
  label: string;
  /** Tabs that work pre-convert vs locked placeholders. */
  locked?: boolean;
  /**
   * Available to open, but content is intentionally unavailable
   * (e.g. Design when the customer already uploaded proofs).
   */
  unavailable?: boolean;
};

function requestHasDecoration(
  request: Pick<OrderRequestDetail, "events">,
  type: string
) {
  return (request.events || []).some(
    (event) => (event.decorationType || "").toLowerCase() === type
  );
}

/**
 * Design studio isn't needed when every event already has a customer-uploaded
 * proof/mockup and the shop hasn't started studio work on this request.
 */
export function isOrderRequestDesignUnavailable(
  request: Pick<OrderRequestDetail, "events">
) {
  const events = request.events || [];
  if (events.length === 0) return false;

  const allHaveProofs = events.every((event) =>
    Boolean(event.mockup?.previewUrl?.trim())
  );
  if (!allHaveProofs) return false;

  const shopStartedStudio = events.some((event) => {
    const mockup = event.designMockup;
    if (!mockup || typeof mockup !== "object") return false;
    return Boolean(
      (Array.isArray(mockup.artLayers) && mockup.artLayers.length > 0) ||
        mockup.artworkUrl?.trim() ||
        mockup.blankImageUrl?.trim() ||
        mockup.artworkCleanUrl?.trim()
    );
  });

  return !shopStartedStudio;
}

export function buildOrderRequestDetailTabs(
  request: Pick<OrderRequestDetail, "events" | "blankSource">
): OrderRequestDetailTabConfig[] {
  const blanksLabel =
    request.blankSource === "customer_supplies"
      ? "Garments"
      : "Blanks / Garments";
  const designUnavailable = isOrderRequestDesignUnavailable(request);

  const tabs: OrderRequestDetailTabConfig[] = [
    { id: "events", label: "Events" },
    { id: "blanks", label: blanksLabel },
    {
      id: "design",
      label: "Design",
      unavailable: designUnavailable,
    },
    { id: "proof", label: "Proofs" },
    { id: "estimate", label: "Estimate" },
  ];

  if (requestHasDecoration(request, "dtf")) {
    tabs.push({ id: "dtf_sheets", label: "DTF sheets", locked: true });
  }

  if (requestHasDecoration(request, "screen_print")) {
    tabs.push({ id: "screens", label: "Screens", locked: true });
    tabs.push({ id: "inks", label: "Inks", locked: true });
  }

  tabs.push(
    { id: "files", label: "Files", locked: true },
    { id: "customer", label: "Customer" },
    { id: "produced_goods", label: "Produced goods", locked: true },
    { id: "shipping", label: "Shipping / Handling", locked: true },
    { id: "invoice", label: "Invoice", locked: true },
    { id: "activity", label: "Activity" }
  );

  return tabs;
}

export function parseOrderRequestDetailTab(
  tab: string | null
): OrderRequestDetailTab {
  if (tab === "events" || tab === "production") return "events";
  if (
    tab === "blanks" ||
    tab === "garments" ||
    tab === "apparel" ||
    tab === "materials"
  ) {
    return "blanks";
  }
  if (tab === "design" || tab === "mockup" || tab === "mockups") return "design";
  if (tab === "proof" || tab === "proofs") return "proof";
  if (tab === "estimate" || tab === "pricing" || tab === "quote") {
    return "estimate";
  }
  if (tab === "dtf" || tab === "dtf_sheets") return "dtf_sheets";
  if (tab === "screens" || tab === "screen") return "screens";
  if (tab === "inks" || tab === "ink") return "inks";
  if (tab === "files") return "files";
  if (
    tab === "customer" ||
    tab === "details" ||
    tab === "summary" ||
    tab === "messages" ||
    tab === "payments"
  ) {
    return "customer";
  }
  if (tab === "produced_goods" || tab === "produced") return "produced_goods";
  if (tab === "shipping" || tab === "handling") return "shipping";
  if (tab === "invoice" || tab === "billing") return "invoice";
  if (tab === "activity") return "activity";
  return "events";
}

export function isOrderRequestTabLocked(
  tabs: OrderRequestDetailTabConfig[],
  tab: OrderRequestDetailTab
) {
  return Boolean(tabs.find((entry) => entry.id === tab)?.locked);
}

export function isOrderRequestTabUnavailable(
  tabs: OrderRequestDetailTabConfig[],
  tab: OrderRequestDetailTab
) {
  return Boolean(tabs.find((entry) => entry.id === tab)?.unavailable);
}
