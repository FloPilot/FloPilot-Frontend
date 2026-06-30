"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createPurchaseOrder,
  type InventoryItem,
  type PurchaseOrder,
  type PurchaseOrderStatus,
} from "@/lib/api";
import {
  dashboardControlClass,
  dashboardInsetSurfaceClass,
  dashboardPrimaryButtonClass,
  dashboardGhostButtonClass,
  dashboardTaskDetailClass,
  dashboardTaskTitleClass,
} from "@/lib/dashboard-styles";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

type Row = {
  key: string;
  name: string;
  quantity: string;
  unitCost: string;
};

let rowCounter = 0;
function newRow(partial?: Partial<Row>): Row {
  rowCounter += 1;
  return {
    key: `row-${rowCounter}`,
    name: "",
    quantity: "",
    unitCost: "",
    ...partial,
  };
}

function suggestedQty(item: InventoryItem): number {
  return Math.max(item.reorderAt * 2 - item.onHand, item.reorderAt, 1);
}

export function PurchaseOrderDialog({
  open,
  onOpenChange,
  items,
  warehouses,
  prefillItems,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: InventoryItem[];
  warehouses: string[];
  prefillItems?: InventoryItem[];
  onCreated: (po: PurchaseOrder) => void;
}) {
  const { getIdToken } = useAuth();
  const datalistId = useId();
  const [supplier, setSupplier] = useState("");
  const [warehouse, setWarehouse] = useState("");
  const [notes, setNotes] = useState("");
  const [rows, setRows] = useState<Row[]>([newRow()]);
  const [saving, setSaving] = useState<PurchaseOrderStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (prefillItems && prefillItems.length > 0) {
      setRows(
        prefillItems.map((item) =>
          newRow({
            name: item.name,
            quantity: String(suggestedQty(item)),
          })
        )
      );
    } else {
      setRows([newRow()]);
    }
    setSupplier("");
    setWarehouse("");
    setNotes("");
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const matchInventory = useMemo(() => {
    const byName = new Map<string, InventoryItem>();
    const bySku = new Map<string, InventoryItem>();
    for (const item of items) {
      if (item.name) byName.set(item.name.toLowerCase(), item);
      if (item.sku) bySku.set(item.sku.toLowerCase(), item);
    }
    return (value: string): InventoryItem | undefined => {
      const q = value.trim().toLowerCase();
      if (!q) return undefined;
      return byName.get(q) ?? bySku.get(q);
    };
  }, [items]);

  const total = rows.reduce((sum, row) => {
    const qty = Math.max(0, parseInt(row.quantity, 10) || 0);
    const cost = Math.max(0, Number(row.unitCost) || 0);
    return sum + qty * cost;
  }, 0);

  const totalUnits = rows.reduce(
    (sum, row) => sum + Math.max(0, parseInt(row.quantity, 10) || 0),
    0
  );

  const updateRow = (key: string, patch: Partial<Row>) => {
    setRows((current) =>
      current.map((row) => (row.key === key ? { ...row, ...patch } : row))
    );
  };

  const removeRow = (key: string) => {
    setRows((current) =>
      current.length === 1 ? [newRow()] : current.filter((row) => row.key !== key)
    );
  };

  const handleOpenChange = (next: boolean) => {
    if (saving) return;
    onOpenChange(next);
  };

  const submit = async (status: PurchaseOrderStatus) => {
    const lineItems = rows
      .map((row) => {
        const name = row.name.trim();
        if (!name) return null;
        const match = matchInventory(name);
        return {
          inventoryItemId: match?.id ?? null,
          name: match?.name ?? name,
          sku: match?.sku ?? "",
          quantity: Math.max(0, parseInt(row.quantity, 10) || 0),
          unitCost: Math.max(0, Number(row.unitCost) || 0),
        };
      })
      .filter(
        (li): li is NonNullable<typeof li> => li !== null && li.quantity > 0
      );

    if (lineItems.length === 0) {
      setError("Add at least one item with a name and quantity.");
      return;
    }

    setSaving(status);
    setError(null);
    try {
      const token = await getIdToken();
      if (!token) throw new Error("Not signed in");
      const { purchaseOrder } = await createPurchaseOrder(token, {
        supplier,
        warehouse,
        notes,
        status,
        lineItems,
      });
      onCreated(purchaseOrder);
      onOpenChange(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not create purchase order"
      );
    } finally {
      setSaving(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton
        className="gap-0 overflow-hidden p-0 sm:max-w-3xl"
      >
        <DialogHeader className="border-b border-[#ebebeb] px-5 py-4">
          <DialogTitle className={dashboardTaskTitleClass}>
            New purchase order
          </DialogTitle>
          <p className={dashboardTaskDetailClass}>
            Order stock from a supplier. When it arrives, mark the order received
            to add the quantities to your on-hand counts.
          </p>
        </DialogHeader>

        <div className="space-y-5 px-5 py-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                Supplier
              </Label>
              <Input
                value={supplier}
                onChange={(event) => setSupplier(event.target.value)}
                placeholder="e.g. SanMar, S&S Activewear"
                className="h-10 rounded-lg border-[#e3e3e3] text-[13px]"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                Deliver to warehouse
              </Label>
              {warehouses.length > 0 ? (
                <Select
                  value={warehouse || "none"}
                  onValueChange={(value) =>
                    setWarehouse(value === "none" || !value ? "" : value)
                  }
                >
                  <SelectTrigger
                    className={cn(
                      dashboardControlClass,
                      "h-10 w-full justify-between"
                    )}
                  >
                    <SelectValue placeholder="Select a warehouse" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No specific warehouse</SelectItem>
                    {warehouses.map((name) => (
                      <SelectItem key={name} value={name}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={warehouse}
                  onChange={(event) => setWarehouse(event.target.value)}
                  placeholder="e.g. Main warehouse"
                  className="h-10 rounded-lg border-[#e3e3e3] text-[13px]"
                />
              )}
            </div>
          </div>

          <div className={cn(dashboardInsetSurfaceClass, "overflow-hidden")}>
            <div className="flex items-center justify-between gap-3 border-b border-[#ebebeb] bg-[#fafafa] px-4 py-3">
              <p className="text-[13px] font-semibold text-[#303030]">Items</p>
              <p className="text-[12px] text-[#616161]">
                {totalUnits} unit{totalUnits !== 1 ? "s" : ""} ·{" "}
                {formatCurrency(total)}
              </p>
            </div>

            {items.length > 0 ? (
              <datalist id={datalistId}>
                {items.map((item) => (
                  <option key={item.id} value={item.name}>
                    {item.sku
                      ? `${item.sku} · on hand ${item.onHand}`
                      : `on hand ${item.onHand}`}
                  </option>
                ))}
              </datalist>
            ) : null}

            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-[13px]">
                <thead>
                  <tr className="border-b border-[#ebebeb] bg-[#fafafa]">
                    <th className="px-4 py-2.5 text-left font-medium text-[#616161]">
                      Item
                    </th>
                    <th className="px-3 py-2.5 text-right font-medium text-[#616161]">
                      Qty
                    </th>
                    <th className="px-3 py-2.5 text-right font-medium text-[#616161]">
                      Unit cost
                    </th>
                    <th className="px-3 py-2.5 text-right font-medium text-[#616161]">
                      Line total
                    </th>
                    <th className="w-10 px-2 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const qty = Math.max(0, parseInt(row.quantity, 10) || 0);
                    const cost = Math.max(0, Number(row.unitCost) || 0);
                    const lineTotal = qty * cost;
                    const match = matchInventory(row.name);
                    const typed = row.name.trim().length > 0;

                    return (
                      <tr
                        key={row.key}
                        className="border-b border-[#ebebeb] last:border-0"
                      >
                        <td className="px-4 py-2.5 align-top">
                          <Input
                            value={row.name}
                            list={items.length > 0 ? datalistId : undefined}
                            onChange={(event) =>
                              updateRow(row.key, { name: event.target.value })
                            }
                            placeholder={
                              items.length > 0
                                ? "Search or type an item"
                                : "Type an item name"
                            }
                            className="h-9 w-full min-w-[200px] rounded-lg border-[#e3e3e3] text-[13px]"
                          />
                          {typed ? (
                            <p className="mt-1 pl-1 text-[11px]">
                              {match ? (
                                <span className="text-[#0d5c2e]">
                                  Linked to inventory · on hand {match.onHand}
                                </span>
                              ) : (
                                <span className="text-[#8a8a8a]">
                                  New item — won&apos;t adjust stock on receive
                                </span>
                              )}
                            </p>
                          ) : null}
                        </td>
                        <td className="px-3 py-2.5 align-top">
                          <Input
                            type="number"
                            min={0}
                            value={row.quantity}
                            placeholder="0"
                            onChange={(event) =>
                              updateRow(row.key, { quantity: event.target.value })
                            }
                            className="ml-auto h-9 w-20 rounded-lg border-[#e3e3e3] text-right text-[13px] tabular-nums"
                          />
                        </td>
                        <td className="px-3 py-2.5 align-top">
                          <div className="relative ml-auto w-24">
                            <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[12px] text-[#8a8a8a]">
                              $
                            </span>
                            <Input
                              type="number"
                              min={0}
                              step="0.01"
                              value={row.unitCost}
                              placeholder="0.00"
                              onChange={(event) =>
                                updateRow(row.key, {
                                  unitCost: event.target.value,
                                })
                              }
                              className="h-9 w-24 rounded-lg border-[#e3e3e3] pl-6 text-right text-[13px] tabular-nums"
                            />
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-right align-middle font-medium tabular-nums text-[#303030]">
                          {lineTotal > 0 ? formatCurrency(lineTotal) : "—"}
                        </td>
                        <td className="px-2 py-2.5 text-right align-middle">
                          <button
                            type="button"
                            onClick={() => removeRow(row.key)}
                            className="rounded-md p-1.5 text-[#8a8a8a] transition-colors hover:bg-[#f1f1f1] hover:text-[#8f1f1f]"
                            aria-label="Remove item"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="border-t border-[#ebebeb] px-4 py-2.5">
              <button
                type="button"
                onClick={() => setRows((current) => [...current, newRow()])}
                className={cn(dashboardControlClass, "h-8 gap-1.5 px-2.5 text-[12px]")}
              >
                <Plus className="size-3.5" strokeWidth={2} />
                Add item
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
              Notes
            </Label>
            <Textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="PO number, terms, or anything the supplier needs."
              rows={2}
              className="rounded-lg border-[#e3e3e3] text-[13px]"
            />
          </div>

          {error ? (
            <p className="rounded-lg border border-[#f5b5b5] bg-[#fff1f1] px-3 py-2 text-[13px] text-[#8f1f1f]">
              {error}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[#ebebeb] bg-[#fafafa] px-5 py-4">
          <button
            type="button"
            disabled={saving !== null}
            onClick={() => submit("draft")}
            className={cn(dashboardGhostButtonClass, "h-9 disabled:opacity-60")}
          >
            {saving === "draft" ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Saving…
              </>
            ) : (
              "Save as draft"
            )}
          </button>
          <button
            type="button"
            disabled={saving !== null}
            onClick={() => submit("ordered")}
            className={cn(dashboardPrimaryButtonClass, "h-9 disabled:opacity-60")}
          >
            {saving === "ordered" ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Placing…
              </>
            ) : (
              "Place order"
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
