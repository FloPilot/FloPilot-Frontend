"use client";

import { Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  orderedManualSizeKeys,
  type ManualSizeQtyRecord,
} from "@/lib/create-order";
import {
  dashboardControlClass,
  dashboardTaskDetailClass,
} from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";

export function ManualSizeQtyEditor({
  sizes,
  onChange,
  existingBySize,
  showPricingColumns = false,
  unitCost = 0,
  customerUnitPrice = 0,
  formatCurrency,
  disabled = false,
}: {
  sizes: ManualSizeQtyRecord;
  onChange: (next: ManualSizeQtyRecord) => void;
  existingBySize?: ManualSizeQtyRecord;
  showPricingColumns?: boolean;
  unitCost?: number;
  customerUnitPrice?: number;
  formatCurrency?: (value: number) => string;
  disabled?: boolean;
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [draftSize, setDraftSize] = useState("");
  const [draftQty, setDraftQty] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const draftInputRef = useRef<HTMLInputElement>(null);

  const sizeKeys = useMemo(() => orderedManualSizeKeys(sizes), [sizes]);
  const pieceCount = sizeKeys.reduce((sum, size) => sum + (sizes[size] || 0), 0);
  const colSpan =
    (existingBySize ? 3 : 2) + (showPricingColumns ? 2 : 0) + 1;

  useEffect(() => {
    if (!isAdding) return;
    draftInputRef.current?.focus();
  }, [isAdding]);

  const resetDraft = () => {
    setIsAdding(false);
    setDraftSize("");
    setDraftQty("");
    setAddError(null);
  };

  const commitDraft = () => {
    const label = draftSize.trim();
    if (!label) {
      setAddError("Enter a size label.");
      return;
    }
    const existingKey = Object.keys(sizes).find(
      (key) => key.toLowerCase() === label.toLowerCase()
    );
    if (existingKey) {
      setAddError(`“${existingKey}” is already listed.`);
      return;
    }
    const qty = Math.max(0, parseInt(draftQty, 10) || 0);
    onChange({ ...sizes, [label]: qty });
    resetDraft();
  };

  const removeSize = (size: string) => {
    if (sizeKeys.length <= 1) {
      setAddError("Keep at least one size row (use One Size for towels).");
      return;
    }
    const next = { ...sizes };
    delete next[size];
    onChange(next);
    setAddError(null);
  };

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-[13px]">
          <thead>
            <tr className="border-b border-[#ebebeb] bg-[#fafafa]">
              <th className="px-4 py-2.5 text-left font-medium text-[#616161]">
                Size
              </th>
              {existingBySize ? (
                <th className="px-3 py-2.5 text-right font-medium text-[#616161]">
                  On order
                </th>
              ) : null}
              <th className="px-3 py-2.5 text-right font-medium text-[#616161]">
                Qty
              </th>
              {showPricingColumns && formatCurrency ? (
                <>
                  <th className="px-3 py-2.5 text-right font-medium text-[#616161]">
                    Blank cost
                  </th>
                  <th className="px-3 py-2.5 text-right font-medium text-[#616161]">
                    Customer cost
                  </th>
                </>
              ) : null}
              <th className="px-3 py-2.5 text-right font-medium text-[#616161]">
                <span className="sr-only">Remove</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {sizeKeys.map((size) => {
              const qty = sizes[size] || 0;
              const onOrder = existingBySize?.[size] || 0;
              return (
                <tr key={size} className="border-b border-[#ebebeb]">
                  <td className="px-4 py-3 font-semibold text-[#303030]">
                    {size}
                  </td>
                  {existingBySize ? (
                    <td className="px-3 py-3 text-right tabular-nums text-[#616161]">
                      {onOrder > 0 ? (
                        <span className="font-medium text-[#303030]">
                          {onOrder}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                  ) : null}
                  <td className="px-3 py-3">
                    <Input
                      type="number"
                      min={0}
                      value={qty || ""}
                      placeholder="0"
                      disabled={disabled}
                      onChange={(event) => {
                        const next = Math.max(
                          0,
                          parseInt(event.target.value, 10) || 0
                        );
                        onChange({ ...sizes, [size]: next });
                      }}
                      className="ml-auto h-8 w-20 rounded-lg border-[#e3e3e3] text-right text-sm tabular-nums"
                    />
                  </td>
                  {showPricingColumns && formatCurrency ? (
                    <>
                      <td className="px-3 py-3 text-right tabular-nums text-[#616161]">
                        {qty > 0 ? formatCurrency(qty * unitCost) : "—"}
                      </td>
                      <td className="px-3 py-3 text-right font-medium tabular-nums text-[#303030]">
                        {qty > 0
                          ? formatCurrency(qty * customerUnitPrice)
                          : "—"}
                      </td>
                    </>
                  ) : null}
                  <td className="px-3 py-3 text-right">
                    <button
                      type="button"
                      disabled={disabled || sizeKeys.length <= 1}
                      onClick={() => removeSize(size)}
                      className={cn(
                        dashboardControlClass,
                        "h-8 px-2 text-[#b42318] hover:bg-[#fdf2f2] disabled:opacity-40"
                      )}
                      aria-label={`Remove ${size}`}
                      title="Remove size"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}

            {isAdding ? (
              <tr
                data-draft-row
                className="border-b border-[#ebebeb] bg-[#fcfcfc]"
              >
                <td className="px-4 py-2.5">
                  <Input
                    ref={draftInputRef}
                    value={draftSize}
                    disabled={disabled}
                    placeholder="e.g. 4XL"
                    onChange={(event) => {
                      setDraftSize(event.target.value);
                      setAddError(null);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        commitDraft();
                      }
                      if (event.key === "Escape") {
                        event.preventDefault();
                        resetDraft();
                      }
                    }}
                    onBlur={(event) => {
                      const related = event.relatedTarget as HTMLElement | null;
                      if (related?.closest("[data-draft-row]")) return;
                      if (draftSize.trim()) commitDraft();
                    }}
                    className="h-8 w-full max-w-[140px] rounded-lg border-[#e3e3e3] text-sm font-semibold"
                  />
                </td>
                {existingBySize ? (
                  <td className="px-3 py-2.5 text-right tabular-nums text-[#616161]">
                    —
                  </td>
                ) : null}
                <td className="px-3 py-2.5">
                  <Input
                    type="number"
                    min={0}
                    value={draftQty}
                    placeholder="0"
                    disabled={disabled}
                    onChange={(event) => setDraftQty(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        commitDraft();
                      }
                      if (event.key === "Escape") {
                        event.preventDefault();
                        resetDraft();
                      }
                    }}
                    onBlur={(event) => {
                      const related = event.relatedTarget as HTMLElement | null;
                      if (related?.closest("[data-draft-row]")) return;
                      if (draftSize.trim()) commitDraft();
                    }}
                    className="ml-auto h-8 w-20 rounded-lg border-[#e3e3e3] text-right text-sm tabular-nums"
                  />
                </td>
                {showPricingColumns && formatCurrency ? (
                  <>
                    <td className="px-3 py-2.5 text-right tabular-nums text-[#616161]">
                      —
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-[#616161]">
                      —
                    </td>
                  </>
                ) : null}
                <td className="px-3 py-2.5 text-right">
                  <button
                    type="button"
                    data-cancel-draft
                    disabled={disabled}
                    onClick={resetDraft}
                    className={cn(
                      dashboardControlClass,
                      "h-8 px-2 text-[#b42318] hover:bg-[#fdf2f2]"
                    )}
                    aria-label="Cancel new size"
                    title="Cancel"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </td>
              </tr>
            ) : null}

            <tr className="border-b border-[#ebebeb]">
              <td colSpan={colSpan} className="px-2 py-1.5">
                <button
                  type="button"
                  disabled={disabled || isAdding}
                  onClick={() => {
                    setIsAdding(true);
                    setAddError(null);
                  }}
                  className={cn(
                    "inline-flex h-9 items-center gap-1.5 rounded-md px-2 text-[13px] font-medium text-[#303030]",
                    "hover:bg-[#f4f4f4] disabled:opacity-50"
                  )}
                >
                  <Plus className="size-3.5 text-[#616161]" />
                  Add additional size
                </button>
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr className="bg-[#fafafa]">
              <td
                colSpan={colSpan}
                className="px-4 py-3 text-right text-[12px] font-medium text-[#616161]"
              >
                {pieceCount} piece{pieceCount !== 1 ? "s" : ""}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {addError ? (
        <p className="text-[12px] text-[#b42318]">{addError}</p>
      ) : (
        <p className={dashboardTaskDetailClass}>
          Add sizes like 4XL or One Size for towels and other single-size goods.
        </p>
      )}
    </div>
  );
}
