"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { CSS } from "@dnd-kit/utilities";
import {
  Columns3,
  Eye,
  GripVertical,
  Loader2,
  Lock,
  Plus,
  Share2,
  Trash2,
  X,
} from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { CheckpointStatusBadge } from "@/components/orders/order-checkpoint-pills";
import { EstimateStatusBadge, OrderStatusBadge, RushBadge } from "@/components/status-badges";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  deleteOrderListView,
  fetchOrderListViews,
  saveOrderListView,
  setActiveOrderListView,
} from "@/lib/api";
import {
  dashboardControlClass,
  dashboardGhostButtonClass,
  dashboardInsetSurfaceClass,
  dashboardPrimaryButtonClass,
} from "@/lib/dashboard-styles";
import {
  DEFAULT_ORDERS_LIST_COLUMNS,
  getOrdersListColumnDef,
  MAX_ORDERS_LIST_COLUMN_LABEL_LENGTH,
  normalizeOrdersListColumnLabels,
  normalizeOrdersListColumns,
  resolveActiveOrdersListColumns,
  resolveOrdersListColumnLabel,
  ORDERS_LIST_COLUMN_DEFS,
  ORDERS_LIST_COLUMN_GROUP_LABELS,
  type OrderListViewRecord,
  type OrdersListColumnGroup,
  type OrdersListColumnId,
} from "@/lib/order-list-columns";
import type { OrderCheckpoint } from "@/lib/order-list-summary";
import { cn } from "@/lib/utils";

const GROUP_ORDER: OrdersListColumnGroup[] = [
  "order",
  "financial",
  "production",
  "status",
];

const PREVIEW_CHECKPOINTS: Partial<Record<OrdersListColumnId, OrderCheckpoint>> =
  {
    proofs: {
      key: "artwork",
      label: "Proofs",
      shortLabel: "Proofs",
      status: "done",
      detail: "2/2",
      title: "Approved",
    },
    ink: {
      key: "ink",
      label: "Ink",
      shortLabel: "Ink",
      status: "done",
      detail: "Ready",
      title: "Ready",
    },
    screen_files: {
      key: "screen_files",
      label: "Screen files",
      shortLabel: "Files",
      status: "pending",
      detail: "Not uploaded",
      title: "Not uploaded",
    },
    screens: {
      key: "screens",
      label: "Screens",
      shortLabel: "Screens",
      status: "in_progress",
      detail: "Partial",
      title: "Partial",
    },
    blanks: {
      key: "blanks",
      label: "Blanks",
      shortLabel: "Blanks",
      status: "pending",
      detail: "Waiting",
      title: "Waiting",
    },
    dtf: {
      key: "dtf_transfers",
      label: "DTF",
      shortLabel: "DTF",
      status: "not_applicable",
      detail: "",
      title: "",
    },
    goods_source: {
      key: "blank_source",
      label: "Goods source",
      shortLabel: "Source",
      status: "done",
      detail: "Shop stock",
      title: "Set",
    },
    scheduled: {
      key: "scheduled",
      label: "Scheduled",
      shortLabel: "Sched",
      status: "done",
      detail: "Scheduled",
      title: "Scheduled",
    },
    production: {
      key: "floor",
      label: "Production",
      shortLabel: "Floor",
      status: "in_progress",
      detail: "Running",
      title: "Running",
    },
  };

const PREVIEW_ROWS: Partial<Record<OrdersListColumnId, [ReactNode, ReactNode]>> =
  {
  order: [
    <span key="a" className="font-semibold text-[#303030]">
      #1042 · Hoodies
    </span>,
    <span key="b" className="font-semibold text-[#303030]">
      #1038 · Tees
    </span>,
  ],
  customer: [
    <div key="a" className="min-w-[120px]">
      <p className="truncate font-medium text-[#303030]">Acme Corp</p>
      <p className="truncate text-[12px] text-[#616161]">Jane Doe</p>
    </div>,
    <div key="b" className="min-w-[120px]">
      <p className="truncate font-medium text-[#303030]">Northline Print</p>
      <p className="truncate text-[12px] text-[#616161]">Sam Rivera</p>
    </div>,
  ],
  sales_rep: ["Alex Morgan", "Jordan Lee"],
  in_hands: ["Jul 18, 2026", "Jul 22, 2026"],
  created: ["Jun 12, 2026", "Jun 8, 2026"],
  total: [
    <div key="a">
      <p className="font-medium tabular-nums">$1,240.00</p>
      <p className="text-[11px] tabular-nums text-[#8a8a8a]">$620.00 due</p>
    </div>,
    <p key="b" className="font-medium tabular-nums">
      $486.50
    </p>,
  ],
  balance: ["$620.00", "—"],
  paid: ["$620.00", "$486.50"],
  subtotal: ["$1,148.15", "$450.00"],
  tax: ["$91.85", "$36.50"],
  piece_count: ["144", "72"],
  rush: [
    <RushBadge key="a" />,
    <span key="b" className="text-[#8a8a8a]">
      —
    </span>,
  ],
  decoration: ["Screen print", "DTF"],
  contact_email: ["jane@acme.com", "sam@northline.com"],
  order_status: [
    <OrderStatusBadge key="a" status="in_production" className="text-[11px]" />,
    <OrderStatusBadge key="b" status="approved" className="text-[11px]" />,
  ],
  estimate_status: [
    <EstimateStatusBadge key="a" status="approved" className="text-[11px]" />,
    <EstimateStatusBadge key="b" status="sent" className="text-[11px]" />,
  ],
  job_type: [
    <div key="a" className="flex flex-wrap gap-1">
      <span className="rounded-md border border-[#e3e3e3] px-2 py-0.5 text-[11px] font-medium">
        Screen
      </span>
    </div>,
    <div key="b" className="flex flex-wrap gap-1">
      <span className="rounded-md border border-[#e3e3e3] px-2 py-0.5 text-[11px] font-medium">
        DTF
      </span>
    </div>,
  ],
};

function previewCell(columnId: OrdersListColumnId, rowIndex: 0 | 1): ReactNode {
  const checkpoint = PREVIEW_CHECKPOINTS[columnId];
  if (checkpoint) {
    return <CheckpointStatusBadge checkpoint={checkpoint} compact />;
  }

  const sample = PREVIEW_ROWS[columnId]?.[rowIndex];
  if (sample != null) {
    if (typeof sample === "string" || typeof sample === "number") {
      return (
        <span className="text-[13px] text-[#303030]">{sample}</span>
      );
    }
    return sample;
  }

  return <span className="text-[13px] text-[#8a8a8a]">—</span>;
}

function OrdersListViewPreview({
  columns,
  columnLabels,
}: {
  columns: OrdersListColumnId[];
  columnLabels?: Partial<Record<OrdersListColumnId, string>>;
}) {
  const minWidth = Math.max(640, columns.length * 104);

  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2">
        <Eye className="size-4 text-[#616161]" />
        <div>
          <p className="text-[13px] font-semibold text-[#303030]">Preview</p>
          <p className="text-[12px] text-[#616161]">
            Sample rows update as you add, remove, reorder, or rename columns.
          </p>
        </div>
      </div>

      <div
        className={cn(
          dashboardInsetSurfaceClass,
          "overflow-hidden bg-white"
        )}
      >
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left" style={{ minWidth }}>
            <thead>
              <tr className="border-b border-[#ebebeb] bg-[#fafafa]">
                {columns.map((columnId) => {
                  const def = getOrdersListColumnDef(columnId);
                  return (
                    <th
                      key={columnId}
                      className="px-3 py-2.5 text-[12px] font-medium whitespace-nowrap text-[#616161]"
                      style={{ minWidth: def?.minWidth }}
                    >
                      {resolveOrdersListColumnLabel(columnId, columnLabels)}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {[0, 1].map((rowIndex) => (
                <tr
                  key={rowIndex}
                  className={cn(
                    "border-b border-[#ebebeb] last:border-b-0",
                    rowIndex === 0 && "bg-[#fffdf5]"
                  )}
                >
                  {columns.map((columnId) => (
                    <td
                      key={columnId}
                      className="px-3 py-2.5 align-middle"
                    >
                      {previewCell(columnId, rowIndex as 0 | 1)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function ColumnOrderRowContent({
  columnId,
  index,
  locked,
  label,
  onLabelChange,
  onRemove,
  dragHandleProps,
  isDragging,
}: {
  columnId: OrdersListColumnId;
  index: number;
  locked: boolean;
  label: string;
  onLabelChange: (columnId: OrdersListColumnId, label: string) => void;
  onRemove: (columnId: OrdersListColumnId) => void;
  dragHandleProps?: Record<string, unknown>;
  isDragging?: boolean;
}) {
  const def = getOrdersListColumnDef(columnId);
  if (!def) return null;
  const isRenamed =
    Boolean(label.trim()) &&
    label.trim().toLowerCase() !== def.label.trim().toLowerCase();

  return (
    <>
      <button
        type="button"
        disabled={locked}
        className={cn(
          dashboardControlClass,
          "h-7 w-7 shrink-0 justify-center p-0 text-[#616161]",
          locked
            ? "cursor-not-allowed opacity-40"
            : "cursor-grab touch-none active:cursor-grabbing hover:text-[#303030]",
          isDragging && "cursor-grabbing"
        )}
        aria-label={locked ? "Order column is pinned" : `Drag ${def.label}`}
        {...(locked ? {} : dragHandleProps)}
      >
        <GripVertical className="size-3.5" strokeWidth={1.75} />
      </button>
      <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-[#f6f6f7] text-[11px] font-semibold tabular-nums text-[#8a8a8a]">
        {index + 1}
      </span>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-1.5">
          <Input
            value={label}
            onChange={(event) => onLabelChange(columnId, event.target.value)}
            placeholder={def.label}
            maxLength={MAX_ORDERS_LIST_COLUMN_LABEL_LENGTH}
            className={cn(
              dashboardControlClass,
              "h-8 rounded-md text-[13px] font-medium"
            )}
            aria-label={`Column name for ${def.label}`}
          />
          {locked ? <Lock className="size-3 shrink-0 text-[#b5b5b5]" /> : null}
        </div>
        <p className="text-[11px] text-[#8a8a8a]">
          {ORDERS_LIST_COLUMN_GROUP_LABELS[def.group]}
          {isRenamed ? ` · Default: ${def.label}` : ""}
        </p>
      </div>
      {!locked ? (
        <button
          type="button"
          onClick={() => onRemove(columnId)}
          className="rounded-md p-1.5 text-[#616161] transition-colors hover:bg-[#fff1f1] hover:text-[#b42318]"
          aria-label={`Remove ${def.label}`}
        >
          <X className="size-3.5" />
        </button>
      ) : null}
    </>
  );
}

function PinnedColumnRow({
  columnId,
  index,
  label,
  onLabelChange,
  onRemove,
}: {
  columnId: OrdersListColumnId;
  index: number;
  label: string;
  onLabelChange: (columnId: OrdersListColumnId, label: string) => void;
  onRemove: (columnId: OrdersListColumnId) => void;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-dashed border-[#e3e3e3] bg-[#fafafa] px-2 py-2">
      <ColumnOrderRowContent
        columnId={columnId}
        index={index}
        locked
        label={label}
        onLabelChange={onLabelChange}
        onRemove={onRemove}
      />
    </div>
  );
}

function SortableColumnRow({
  columnId,
  index,
  label,
  onLabelChange,
  onRemove,
}: {
  columnId: OrdersListColumnId;
  index: number;
  label: string;
  onLabelChange: (columnId: OrdersListColumnId, label: string) => void;
  onRemove: (columnId: OrdersListColumnId) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: columnId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 rounded-lg px-2 py-2",
        isDragging
          ? "relative z-10 bg-white shadow-[0_10px_28px_rgba(26,26,26,0.12)] ring-1 ring-[#c9d7ef]"
          : "hover:bg-[#fafafa]"
      )}
    >
      <ColumnOrderRowContent
        columnId={columnId}
        index={index}
        locked={false}
        label={label}
        onLabelChange={onLabelChange}
        onRemove={onRemove}
        dragHandleProps={{ ...listeners, ...attributes }}
        isDragging={isDragging}
      />
    </div>
  );
}

type OrdersListViewConfigProps = {
  columns: OrdersListColumnId[];
  onColumnsChange: (columns: OrdersListColumnId[]) => void;
  columnLabels: Partial<Record<OrdersListColumnId, string>>;
  onColumnLabelsChange: (
    labels: Partial<Record<OrdersListColumnId, string>>
  ) => void;
  activeViewId: string | null;
  onActiveViewChange: (viewId: string | null) => void;
};

export function OrdersListViewConfig({
  columns,
  onColumnsChange,
  columnLabels,
  onColumnLabelsChange,
  activeViewId,
  onActiveViewChange,
}: OrdersListViewConfigProps) {
  const { getIdToken } = useAuth();
  const [views, setViews] = useState<OrderListViewRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [draftColumns, setDraftColumns] = useState<OrdersListColumnId[]>(columns);
  const [draftColumnLabels, setDraftColumnLabels] = useState<
    Partial<Record<OrdersListColumnId, string>>
  >({});
  const [viewName, setViewName] = useState("");
  const [shareWithTeam, setShareWithTeam] = useState(false);
  const [editingViewId, setEditingViewId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [switchingView, setSwitchingView] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sortableColumnIds = useMemo(
    () => draftColumns.filter((columnId) => columnId !== "order"),
    [draftColumns]
  );

  const columnSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const loadViews = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getIdToken();
      if (!token) return;
      const data = await fetchOrderListViews(token);
      setViews(data.views);
      onActiveViewChange(data.activeViewId);
      onColumnsChange(
        resolveActiveOrdersListColumns(data.activeViewId, data.activeColumns)
      );
      onColumnLabelsChange(
        data.activeViewId
          ? normalizeOrdersListColumnLabels(
              data.activeColumnLabels,
              data.activeColumns
            )
          : {}
      );
    } catch {
      onColumnsChange(normalizeOrdersListColumns(DEFAULT_ORDERS_LIST_COLUMNS));
      onColumnLabelsChange({});
    } finally {
      setLoading(false);
    }
  }, [getIdToken]);

  useEffect(() => {
    void loadViews();
  }, [loadViews]);

  const activeView = useMemo(
    () => views.find((view) => view.id === activeViewId) ?? null,
    [views, activeViewId]
  );

  const myViews = useMemo(
    () => views.filter((view) => view.isOwner),
    [views]
  );
  const teamViews = useMemo(
    () => views.filter((view) => view.shared && !view.isOwner),
    [views]
  );

  const availableColumns = useMemo(() => {
    const visible = new Set(draftColumns);
    return ORDERS_LIST_COLUMN_DEFS.filter(
      (def) => def.id !== "order" && !visible.has(def.id)
    );
  }, [draftColumns]);

  const openEditor = (view?: OrderListViewRecord | null) => {
    setError(null);
    if (view?.isOwner) {
      const nextColumns = normalizeOrdersListColumns(view.columns);
      setDraftColumns(nextColumns);
      setDraftColumnLabels(
        normalizeOrdersListColumnLabels(view.columnLabels, nextColumns)
      );
      setViewName(view.name);
      setShareWithTeam(view.shared);
      setEditingViewId(view.id);
    } else {
      const nextColumns = normalizeOrdersListColumns(columns);
      setDraftColumns(nextColumns);
      setDraftColumnLabels(
        normalizeOrdersListColumnLabels(columnLabels, nextColumns)
      );
      setViewName(view ? `${view.name} copy` : "");
      setShareWithTeam(false);
      setEditingViewId(null);
    }
    setEditorOpen(true);
  };

  const handleColumnDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeId = active.id as OrdersListColumnId;
    const overId = over.id as OrdersListColumnId;
    if (activeId === "order" || overId === "order") return;

    setDraftColumns((current) => {
      const sortable = current.filter(
        (columnId): columnId is Exclude<OrdersListColumnId, "order"> =>
          columnId !== "order"
      );
      const oldIndex = sortable.indexOf(activeId);
      const newIndex = sortable.indexOf(overId);
      if (oldIndex < 0 || newIndex < 0) return current;
      return ["order", ...arrayMove(sortable, oldIndex, newIndex)];
    });
  };

  const addColumn = (columnId: OrdersListColumnId) => {
    setDraftColumns((current) => normalizeOrdersListColumns([...current, columnId]));
  };

  const removeColumn = (columnId: OrdersListColumnId) => {
    if (columnId === "order") return;
    setDraftColumns((current) => current.filter((id) => id !== columnId));
    setDraftColumnLabels((current) => {
      if (!(columnId in current)) return current;
      const next = { ...current };
      delete next[columnId];
      return next;
    });
  };

  const setColumnLabel = (columnId: OrdersListColumnId, label: string) => {
    setDraftColumnLabels((current) => {
      const next = { ...current };
      const trimmed = label.slice(0, MAX_ORDERS_LIST_COLUMN_LABEL_LENGTH);
      if (!trimmed.trim()) {
        delete next[columnId];
      } else {
        next[columnId] = trimmed;
      }
      return next;
    });
  };

  const draftLabelFor = (columnId: OrdersListColumnId) => {
    const custom = draftColumnLabels[columnId];
    if (custom !== undefined) return custom;
    return getOrdersListColumnDef(columnId)?.label ?? columnId;
  };

  const handleSelectView = async (value: string) => {
    if (switchingView) return;

    const previousViewId = activeViewId;
    const previousColumns = columns;
    const previousLabels = columnLabels;

    const applyDefault = () => {
      onActiveViewChange(null);
      onColumnsChange(resolveActiveOrdersListColumns(null));
      onColumnLabelsChange({});
    };

    const applyView = (view: OrderListViewRecord) => {
      const nextColumns = normalizeOrdersListColumns(view.columns);
      onActiveViewChange(view.id);
      onColumnsChange(nextColumns);
      onColumnLabelsChange(
        normalizeOrdersListColumnLabels(view.columnLabels, nextColumns)
      );
    };

    setError(null);

    if (value === "default") {
      if (activeViewId === null) return;
      applyDefault();
      setSwitchingView(true);
      try {
        const token = await getIdToken();
        if (!token) throw new Error("You must be signed in to switch views.");
        await setActiveOrderListView(token, null);
      } catch (err) {
        onActiveViewChange(previousViewId);
        onColumnsChange(previousColumns);
        onColumnLabelsChange(previousLabels);
        setError(
          err instanceof Error ? err.message : "Could not switch to Default view"
        );
      } finally {
        setSwitchingView(false);
      }
      return;
    }

    const view = views.find((entry) => entry.id === value);
    if (!view || view.id === activeViewId) return;

    applyView(view);
    setSwitchingView(true);
    try {
      const token = await getIdToken();
      if (!token) throw new Error("You must be signed in to switch views.");
      const result = await setActiveOrderListView(token, view.id);
      onActiveViewChange(result.activeViewId);
      const nextColumns = normalizeOrdersListColumns(result.activeColumns);
      onColumnsChange(nextColumns);
      onColumnLabelsChange(
        normalizeOrdersListColumnLabels(
          result.activeColumnLabels ?? view.columnLabels,
          nextColumns
        )
      );
    } catch (err) {
      onActiveViewChange(previousViewId);
      onColumnsChange(previousColumns);
      onColumnLabelsChange(previousLabels);
      setError(err instanceof Error ? err.message : "Could not switch views");
    } finally {
      setSwitchingView(false);
    }
  };

  const handleApplyWithoutSaving = () => {
    const next = normalizeOrdersListColumns(draftColumns);
    onColumnsChange(next);
    onColumnLabelsChange(
      normalizeOrdersListColumnLabels(draftColumnLabels, next)
    );
    onActiveViewChange(null);
    setEditorOpen(false);
  };

  const handleSaveView = async () => {
    setSaving(true);
    setError(null);
    try {
      const token = await getIdToken();
      if (!token) return;

      const nextColumns = normalizeOrdersListColumns(draftColumns);
      const nextLabels = normalizeOrdersListColumnLabels(
        draftColumnLabels,
        nextColumns
      );

      const { view } = await saveOrderListView(token, {
        id: editingViewId || undefined,
        name: viewName.trim() || "My view",
        columns: nextColumns,
        columnLabels: nextLabels,
        shared: shareWithTeam,
      });

      setViews((current) => {
        const others = current.filter((entry) => entry.id !== view.id);
        return [...others, view].sort((a, b) => a.name.localeCompare(b.name));
      });

      const active = await setActiveOrderListView(token, view.id);
      onActiveViewChange(active.activeViewId);
      onColumnsChange(normalizeOrdersListColumns(active.activeColumns));
      onColumnLabelsChange(
        normalizeOrdersListColumnLabels(
          active.activeColumnLabels ?? view.columnLabels,
          active.activeColumns
        )
      );
      setEditorOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save view");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteView = async () => {
    if (!editingViewId) return;
    setSaving(true);
    setError(null);
    try {
      const token = await getIdToken();
      if (!token) return;
      await deleteOrderListView(token, editingViewId);
      setViews((current) => current.filter((entry) => entry.id !== editingViewId));
      if (activeViewId === editingViewId) {
        const reset = await setActiveOrderListView(token, null);
        onActiveViewChange(null);
        onColumnsChange(resolveActiveOrdersListColumns(null, reset.activeColumns));
        onColumnLabelsChange({});
      }
      setEditorOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete view");
    } finally {
      setSaving(false);
    }
  };

  const selectValue = activeViewId ?? "default";
  const selectLabel = activeView?.name ?? "Default view";

  return (
    <>
      <div className="flex flex-col items-end gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={selectValue}
            onValueChange={(value) => {
              if (value) void handleSelectView(value);
            }}
            disabled={loading || switchingView || saving}
          >
            <SelectTrigger
              className={cn(
                dashboardControlClass,
                "h-9 min-w-[180px] justify-between"
              )}
            >
              <span className="flex items-center gap-2 truncate">
                {switchingView ? (
                  <Loader2 className="size-3.5 shrink-0 animate-spin text-[#2c6ecb]" />
                ) : (
                  <Columns3 className="size-3.5 shrink-0 text-[#616161]" />
                )}
                <SelectValue placeholder="Select view">
                  {switchingView ? `Switching to ${selectLabel}…` : selectLabel}
                </SelectValue>
              </span>
            </SelectTrigger>
            <SelectContent
              alignItemWithTrigger={false}
              side="bottom"
              sideOffset={4}
            >
              <SelectItem value="default">Default view</SelectItem>
              {myViews.length > 0 ? (
                <SelectGroup>
                  <SelectLabel>My views</SelectLabel>
                  {myViews.map((view) => (
                    <SelectItem key={view.id} value={view.id}>
                      {view.name}
                      {view.shared ? " · Shared" : ""}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ) : null}
              {teamViews.length > 0 ? (
                <SelectGroup>
                  <SelectLabel>Team views</SelectLabel>
                  {teamViews.map((view) => (
                    <SelectItem key={view.id} value={view.id}>
                      {view.name}
                      {view.ownerName ? ` · ${view.ownerName}` : ""}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ) : null}
            </SelectContent>
          </Select>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn(dashboardControlClass, "h-9")}
            disabled={loading || switchingView}
            onClick={() => openEditor(activeView?.isOwner ? activeView : null)}
          >
            <Columns3 className="size-3.5" />
            Customize view
          </Button>
        </div>
        {error && !editorOpen ? (
          <p className="max-w-[280px] text-right text-[12px] text-[#b42318]">
            {error}
          </p>
        ) : null}
      </div>

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="flex max-h-[min(92vh,900px)] w-[calc(100%-1.5rem)] flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-6xl">
          <DialogHeader className="border-b border-[#ebebeb] px-6 py-5 sm:px-8">
            <DialogTitle className="text-[18px] font-semibold text-[#303030]">
              Customize view
            </DialogTitle>
            <DialogDescription className="max-w-2xl text-[13px] leading-relaxed text-[#616161]">
              Choose columns, drag to reorder, and rename headers for this view
              — for example Screen files → PROD FILES.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6 sm:px-8">
            <OrdersListViewPreview
              columns={draftColumns}
              columnLabels={draftColumnLabels}
            />

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
              <section className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-[13px] font-semibold text-[#303030]">
                      Column order & names
                    </p>
                    <p className="text-[12px] text-[#616161]">
                      Drag to reorder. Edit the name field to rename a header.
                    </p>
                  </div>
                  <span className="rounded-full bg-[#f1f1f1] px-2.5 py-1 text-[11px] font-medium text-[#616161]">
                    {draftColumns.length} visible
                  </span>
                </div>

                <DndContext
                  sensors={columnSensors}
                  collisionDetection={closestCenter}
                  modifiers={[restrictToVerticalAxis]}
                  onDragEnd={handleColumnDragEnd}
                >
                  <div
                    className={cn(
                      dashboardInsetSurfaceClass,
                      "space-y-1 bg-white p-1.5"
                    )}
                  >
                    {draftColumns[0] === "order" ? (
                      <PinnedColumnRow
                        columnId="order"
                        index={0}
                        label={draftLabelFor("order")}
                        onLabelChange={setColumnLabel}
                        onRemove={removeColumn}
                      />
                    ) : null}

                    <SortableContext
                      items={sortableColumnIds}
                      strategy={verticalListSortingStrategy}
                    >
                      {sortableColumnIds.map((columnId, index) => (
                        <SortableColumnRow
                          key={columnId}
                          columnId={columnId}
                          index={index + 1}
                          label={draftLabelFor(columnId)}
                          onLabelChange={setColumnLabel}
                          onRemove={removeColumn}
                        />
                      ))}
                    </SortableContext>
                  </div>
                </DndContext>
              </section>

              <div className="space-y-5">
                <section className="space-y-3">
                  <div>
                    <p className="text-[13px] font-semibold text-[#303030]">
                      Add columns
                    </p>
                    <p className="text-[12px] text-[#616161]">
                      Click a column to add it to the end of your view.
                    </p>
                  </div>

                  <div
                    className={cn(
                      dashboardInsetSurfaceClass,
                      "max-h-64 space-y-4 overflow-y-auto bg-white p-4"
                    )}
                  >
                    {GROUP_ORDER.map((group) => {
                      const items = availableColumns.filter(
                        (def) => def.group === group
                      );
                      if (items.length === 0) return null;
                      return (
                        <div key={group}>
                          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                            {ORDERS_LIST_COLUMN_GROUP_LABELS[group]}
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {items.map((def) => (
                              <button
                                key={def.id}
                                type="button"
                                onClick={() => addColumn(def.id)}
                                className="inline-flex items-center gap-1 rounded-lg border border-[#e3e3e3] bg-white px-2.5 py-1.5 text-[12px] font-medium text-[#303030] transition-colors hover:border-[#c9d7ef] hover:bg-[#f8faff]"
                              >
                                <Plus className="size-3" />
                                {def.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                    {availableColumns.length === 0 ? (
                      <p className="text-[13px] text-[#616161]">
                        All available columns are already in this view.
                      </p>
                    ) : null}
                  </div>
                </section>

                <section
                  className={cn(
                    dashboardInsetSurfaceClass,
                    "space-y-4 bg-white p-4"
                  )}
                >
                  <div>
                    <p className="text-[13px] font-semibold text-[#303030]">
                      Save this view
                    </p>
                    <p className="text-[12px] text-[#616161]">
                      Name your layout and optionally share it with your team.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="view-name" className="text-[#303030]">
                      View name
                    </Label>
                    <Input
                      id="view-name"
                      value={viewName}
                      onChange={(event) => setViewName(event.target.value)}
                      placeholder="e.g. Production focus"
                      className={dashboardControlClass}
                    />
                  </div>

                  <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-[#ebebeb] bg-[#fafafa] p-3">
                    <input
                      type="checkbox"
                      checked={shareWithTeam}
                      onChange={(event) =>
                        setShareWithTeam(event.target.checked)
                      }
                      className="mt-0.5 size-4 rounded border-[#c9cccf]"
                    />
                    <span>
                      <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#303030]">
                        <Share2 className="size-3.5" />
                        Share with team
                      </span>
                      <span className="mt-1 block text-[12px] leading-relaxed text-[#616161]">
                        Other users in your shop can select this layout from
                        their view dropdown.
                      </span>
                    </span>
                  </label>
                </section>
              </div>
            </div>
          </div>

          {error ? (
            <p className="px-6 pb-2 text-[13px] text-[#b42318] sm:px-8">{error}</p>
          ) : null}

          <div className="flex flex-col-reverse gap-3 border-t border-[#ebebeb] bg-[#fafafa] px-6 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
            <div className="min-h-9">
              {editingViewId && activeView?.isOwner ? (
                <Button
                  type="button"
                  className={cn(
                    dashboardGhostButtonClass,
                    "h-9 text-[#b42318] hover:bg-[#fff1f1] hover:text-[#b42318]"
                  )}
                  disabled={saving}
                  onClick={() => void handleDeleteView()}
                >
                  <Trash2 className="size-3.5" />
                  Delete view
                </Button>
              ) : null}
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
              <Button
                type="button"
                className={cn(dashboardControlClass, "h-9 w-full sm:w-auto")}
                disabled={saving}
                onClick={handleApplyWithoutSaving}
              >
                Apply without saving
              </Button>
              <Button
                type="button"
                className={cn(dashboardPrimaryButtonClass, "h-9 w-full sm:w-auto")}
                disabled={saving}
                onClick={() => void handleSaveView()}
              >
                {saving ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    Saving…
                  </>
                ) : editingViewId ? (
                  "Save view"
                ) : (
                  "Save new view"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
