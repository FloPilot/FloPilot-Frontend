export type DashboardWidgetId =
  | "kpi_business"
  | "tasks"
  | "production"
  | "charts_business"
  | "recent_orders"
  | "scheduling_queue"
  | "collections"
  | "receiving"
  | "department_load"
  | "shipping"
  | "due_horizon"
  | "machine_load"
  | "top_customers";

export type DashboardWidgetDef = {
  id: DashboardWidgetId;
  label: string;
  description: string;
  removable: boolean;
};

export type DashboardViewRecord = {
  id: string;
  name: string;
  layout: DashboardWidgetId[];
  shared: boolean;
  ownerUserId: string;
  ownerName: string;
  createdAt?: string;
  updatedAt?: string;
  isOwner?: boolean;
};

export type DashboardViewsState = {
  views: DashboardViewRecord[];
  activeViewId: string | null;
  activeLayout: DashboardWidgetId[];
  defaultLayout: DashboardWidgetId[];
};

export const DASHBOARD_WIDGET_DEFS: DashboardWidgetDef[] = [
  {
    id: "kpi_business",
    label: "Business KPIs",
    description: "Revenue, orders, pipeline, and due-date health",
    removable: true,
  },
  {
    id: "tasks",
    label: "Tasks & attention",
    description: "Shop tasks and items that need follow-up",
    removable: true,
  },
  {
    id: "production",
    label: "Production floor",
    description: "Live floor, upcoming events, and production KPIs",
    removable: true,
  },
  {
    id: "charts_business",
    label: "Business snapshot",
    description: "Orders and revenue trend charts",
    removable: true,
  },
  {
    id: "recent_orders",
    label: "Recent orders",
    description: "Latest orders entering the shop",
    removable: true,
  },
  {
    id: "scheduling_queue",
    label: "To schedule",
    description: "Orders with production events still needing calendar time",
    removable: true,
  },
  {
    id: "collections",
    label: "Collections",
    description: "Open balances and invoices waiting on payment",
    removable: true,
  },
  {
    id: "receiving",
    label: "Receiving",
    description: "Blank goods and materials still checking in",
    removable: true,
  },
  {
    id: "department_load",
    label: "Department load",
    description: "Open work across artwork, screens, inks, finishing, and receiving",
    removable: true,
  },
  {
    id: "shipping",
    label: "Shipping",
    description: "Ready-to-ship orders and shipments missing labels or tracking",
    removable: true,
  },
  {
    id: "due_horizon",
    label: "Due this week",
    description: "Overdue and upcoming in-hands dates at a glance",
    removable: true,
  },
  {
    id: "machine_load",
    label: "Machine load",
    description: "Booked hours and utilization for the next seven days",
    removable: true,
  },
  {
    id: "top_customers",
    label: "Top customers",
    description: "Highest revenue accounts in the selected period",
    removable: true,
  },
];

/** Default layout stays lean — extra widgets are opt-in via Customize. */
export const DEFAULT_DASHBOARD_LAYOUT: DashboardWidgetId[] = [
  "kpi_business",
  "tasks",
  "production",
  "charts_business",
  "recent_orders",
];

const WIDGET_IDS = new Set(
  DASHBOARD_WIDGET_DEFS.map((def) => def.id)
);

export function getDashboardWidgetDef(
  id: DashboardWidgetId
): DashboardWidgetDef | undefined {
  return DASHBOARD_WIDGET_DEFS.find((def) => def.id === id);
}

export function normalizeDashboardLayout(
  input?: Array<DashboardWidgetId | { id: string } | string> | null
): DashboardWidgetId[] {
  if (!Array.isArray(input) || input.length === 0) {
    return [...DEFAULT_DASHBOARD_LAYOUT];
  }

  const seen = new Set<string>();
  const result: DashboardWidgetId[] = [];

  for (const entry of input) {
    const id =
      typeof entry === "string"
        ? entry
        : entry && typeof entry === "object"
          ? String(entry.id || "")
          : "";
    if (!WIDGET_IDS.has(id as DashboardWidgetId)) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    result.push(id as DashboardWidgetId);
  }

  return result.length > 0 ? result : [...DEFAULT_DASHBOARD_LAYOUT];
}

export function missingDashboardWidgets(
  layout: DashboardWidgetId[]
): DashboardWidgetDef[] {
  const present = new Set(
    (layout || []).filter((id): id is DashboardWidgetId =>
      WIDGET_IDS.has(id as DashboardWidgetId)
    )
  );
  return DASHBOARD_WIDGET_DEFS.filter((def) => !present.has(def.id));
}
