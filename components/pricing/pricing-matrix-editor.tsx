"use client";

import { useRef, useState } from "react";
import { Info, Plus, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { parsePricingCsv, type ParsedPricingGrid } from "@/lib/pricing-csv";
import { type PricingMatrix, type PricingMethod } from "@/lib/shop-settings";
import { cn } from "@/lib/utils";

function newMethodId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `method-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function methodNameFromFile(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, "").replace(/[_]+/g, " ").trim();
}

const STARTER_METHODS = ["Screen Print", "Embroidery", "DTF", "DTG"];

export function PricingMatrixEditor({
  value,
  onChange,
  disabled = false,
  currency = "USD",
  showEnabledToggle = false,
  className,
}: {
  value: PricingMatrix;
  onChange: (next: PricingMatrix) => void;
  disabled?: boolean;
  currency?: string;
  showEnabledToggle?: boolean;
  className?: string;
}) {
  const [csvError, setCsvError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const importTargetRef = useRef<string | null>(null);

  const updateMethod = (id: string, patch: Partial<PricingMethod>) =>
    onChange({
      ...value,
      methods: value.methods.map((method) =>
        method.id === id ? { ...method, ...patch } : method
      ),
    });

  const addMethod = (name = "", grid?: ParsedPricingGrid) =>
    onChange({
      ...value,
      methods: [
        ...value.methods,
        {
          id: newMethodId(),
          name,
          unit: "per piece",
          notes: "",
          columns: grid?.columns ?? ["Price"],
          rows: grid?.rows ?? [{ minQty: 1, prices: [0] }],
        },
      ],
    });

  const removeMethod = (id: string) =>
    onChange({
      ...value,
      methods: value.methods.filter((method) => method.id !== id),
    });

  const addRow = (id: string) =>
    onChange({
      ...value,
      methods: value.methods.map((method) =>
        method.id === id
          ? {
              ...method,
              rows: [
                ...method.rows,
                { minQty: 1, prices: method.columns.map(() => 0) },
              ],
            }
          : method
      ),
    });

  const removeRow = (id: string, index: number) =>
    onChange({
      ...value,
      methods: value.methods.map((method) =>
        method.id === id
          ? { ...method, rows: method.rows.filter((_, rowIndex) => rowIndex !== index) }
          : method
      ),
    });

  const updateRowQty = (id: string, index: number, minQty: number) =>
    onChange({
      ...value,
      methods: value.methods.map((method) =>
        method.id === id
          ? {
              ...method,
              rows: method.rows.map((row, rowIndex) =>
                rowIndex === index ? { ...row, minQty } : row
              ),
            }
          : method
      ),
    });

  const updateCell = (
    id: string,
    rowIndex: number,
    colIndex: number,
    price: number
  ) =>
    onChange({
      ...value,
      methods: value.methods.map((method) =>
        method.id === id
          ? {
              ...method,
              rows: method.rows.map((row, currentRowIndex) =>
                currentRowIndex === rowIndex
                  ? {
                      ...row,
                      prices: row.prices.map((currentPrice, currentColIndex) =>
                        currentColIndex === colIndex ? price : currentPrice
                      ),
                    }
                  : row
              ),
            }
          : method
      ),
    });

  const updateColumnName = (id: string, colIndex: number, name: string) =>
    onChange({
      ...value,
      methods: value.methods.map((method) =>
        method.id === id
          ? {
              ...method,
              columns: method.columns.map((column, index) =>
                index === colIndex ? name : column
              ),
            }
          : method
      ),
    });

  const addColumn = (id: string) =>
    onChange({
      ...value,
      methods: value.methods.map((method) =>
        method.id === id
          ? {
              ...method,
              columns: [...method.columns, `Column ${method.columns.length + 1}`],
              rows: method.rows.map((row) => ({
                ...row,
                prices: [...row.prices, 0],
              })),
            }
          : method
      ),
    });

  const removeColumn = (id: string, colIndex: number) =>
    onChange({
      ...value,
      methods: value.methods.map((method) =>
        method.id === id && method.columns.length > 1
          ? {
              ...method,
              columns: method.columns.filter((_, index) => index !== colIndex),
              rows: method.rows.map((row) => ({
                ...row,
                prices: row.prices.filter((_, index) => index !== colIndex),
              })),
            }
          : method
      ),
    });

  const triggerImport = (targetId: string | null) => {
    importTargetRef.current = targetId;
    setCsvError(null);
    fileRef.current?.click();
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setCsvError(null);
    try {
      const text = await file.text();
      const { grid, error: parseError } = parsePricingCsv(text);
      if (parseError || !grid) {
        setCsvError(parseError ?? "Could not read that CSV.");
        return;
      }
      const targetId = importTargetRef.current;
      if (targetId) {
        updateMethod(targetId, { columns: grid.columns, rows: grid.rows });
      } else {
        addMethod(methodNameFromFile(file.name), grid);
      }
    } catch {
      setCsvError("Could not read that file.");
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      <input
        ref={fileRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(event) => {
          void handleFile(event.target.files?.[0]);
          event.target.value = "";
        }}
      />

      {showEnabledToggle ? (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-[#e3e3e3] bg-[#fafafa] px-4 py-3">
          <div>
            <p className="text-[13px] font-medium text-[#303030]">
              Auto-apply to orders
            </p>
            <p className="text-[12px] text-[#616161]">
              Suggest matching tiers when building line items.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={value.enabled}
            disabled={disabled}
            onClick={() => onChange({ ...value, enabled: !value.enabled })}
            className={cn(
              "relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors",
              value.enabled ? "bg-brand-primary" : "bg-[#d4d4d4]",
              disabled && "cursor-not-allowed opacity-50"
            )}
          >
            <span
              className={cn(
                "pointer-events-none absolute top-0.5 inline-block size-5 rounded-full bg-white shadow transition-transform",
                value.enabled ? "translate-x-5" : "translate-x-0.5"
              )}
            />
          </button>
        </div>
      ) : null}

      <div className="flex items-start gap-2.5 rounded-lg border border-[#dbe6ff] bg-[#f4f7ff] px-4 py-3 text-[13px] text-[#3a4a6b]">
        <Info className="mt-0.5 size-4 shrink-0 text-brand-primary" />
        <p>
          Upload a CSV where the first column is quantity and each remaining
          column is a price option (for example, number of print colors). The
          highest tier whose minimum quantity is met is used.
        </p>
      </div>

      {csvError ? (
        <p className="rounded-lg border border-[#f5b5b5] bg-[#fff1f1] px-3 py-2 text-[13px] text-[#8f1f1f]">
          {csvError}
        </p>
      ) : null}

      {value.methods.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-[#e3e3e3] bg-[#fafafa] px-6 py-10 text-center">
          <p className="max-w-sm text-[13px] text-[#616161]">
            Upload a pricing CSV to load your matrix in seconds, or add a method
            to build one by hand.
          </p>
          <Button
            size="sm"
            disabled={disabled}
            onClick={() => triggerImport(null)}
          >
            <Upload className="size-4" />
            Import CSV
          </Button>
          <div className="flex flex-wrap justify-center gap-2 pt-1">
            {STARTER_METHODS.map((name) => (
              <Button
                key={name}
                variant="outline"
                size="sm"
                disabled={disabled}
                onClick={() => addMethod(name)}
              >
                <Plus className="size-4" />
                {name}
              </Button>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {value.methods.map((method) => (
            <section
              key={method.id}
              className="overflow-hidden rounded-xl border border-[#e3e3e3] bg-white"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#ebebeb] bg-[#fafafa] px-4 py-3">
                <p className="text-[14px] font-semibold text-[#303030]">
                  {method.name || "Untitled method"}
                </p>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={disabled}
                    onClick={() => triggerImport(method.id)}
                  >
                    <Upload className="size-4" />
                    Replace via CSV
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    disabled={disabled}
                    onClick={() => removeMethod(method.id)}
                    className="text-[#8a8a8a] hover:text-[#b42318]"
                    aria-label="Remove method"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-5 p-4 sm:p-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Method name</Label>
                    <Input
                      value={method.name}
                      disabled={disabled}
                      onChange={(event) =>
                        updateMethod(method.id, { name: event.target.value })
                      }
                      placeholder="e.g. Screen Print"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Unit label</Label>
                    <Input
                      value={method.unit}
                      disabled={disabled}
                      onChange={(event) =>
                        updateMethod(method.id, { unit: event.target.value })
                      }
                      placeholder="per piece"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Label>Pricing grid ({currency})</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={disabled}
                      onClick={() => addColumn(method.id)}
                    >
                      <Plus className="size-4" />
                      Add column
                    </Button>
                  </div>

                  <div className="overflow-x-auto rounded-lg border border-[#e3e3e3]">
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr className="bg-[#fafafa]">
                          <th className="sticky left-0 z-10 bg-[#fafafa] px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-[#8a8a8a]">
                            Min qty
                          </th>
                          {method.columns.map((column, colIndex) => (
                            <th
                              key={colIndex}
                              className="border-l border-[#ebebeb] px-2 py-1.5"
                            >
                              <div className="flex items-center gap-1">
                                <Input
                                  value={column}
                                  disabled={disabled}
                                  onChange={(event) =>
                                    updateColumnName(
                                      method.id,
                                      colIndex,
                                      event.target.value
                                    )
                                  }
                                  className="h-8 w-24 text-xs"
                                />
                                {method.columns.length > 1 ? (
                                  <button
                                    type="button"
                                    disabled={disabled}
                                    onClick={() =>
                                      removeColumn(method.id, colIndex)
                                    }
                                    className="text-[#b0b0b0] hover:text-[#b42318] disabled:opacity-40"
                                    aria-label="Remove column"
                                  >
                                    <Trash2 className="size-3.5" />
                                  </button>
                                ) : null}
                              </div>
                            </th>
                          ))}
                          <th className="w-10 border-l border-[#ebebeb]" />
                        </tr>
                      </thead>
                      <tbody>
                        {method.rows.map((row, rowIndex) => (
                          <tr
                            key={rowIndex}
                            className="border-t border-[#ebebeb]"
                          >
                            <td className="sticky left-0 z-10 bg-white px-2 py-1.5">
                              <Input
                                type="number"
                                min={1}
                                step={1}
                                disabled={disabled}
                                value={row.minQty}
                                onFocus={(event) => event.currentTarget.select()}
                                onChange={(event) =>
                                  updateRowQty(
                                    method.id,
                                    rowIndex,
                                    Math.max(
                                      1,
                                      Math.floor(Number(event.target.value) || 1)
                                    )
                                  )
                                }
                                className="h-8 w-20 text-xs"
                              />
                            </td>
                            {row.prices.map((price, colIndex) => (
                              <td
                                key={colIndex}
                                className="border-l border-[#ebebeb] px-2 py-1.5"
                              >
                                <Input
                                  type="number"
                                  min={0}
                                  step={0.01}
                                  disabled={disabled}
                                  value={price}
                                  onFocus={(event) => event.currentTarget.select()}
                                  onChange={(event) =>
                                    updateCell(
                                      method.id,
                                      rowIndex,
                                      colIndex,
                                      Math.max(0, Number(event.target.value) || 0)
                                    )
                                  }
                                  className="h-8 w-20 text-xs"
                                />
                              </td>
                            ))}
                            <td className="border-l border-[#ebebeb] px-2 py-1.5 text-center">
                              <button
                                type="button"
                                disabled={disabled || method.rows.length <= 1}
                                onClick={() => removeRow(method.id, rowIndex)}
                                className="text-[#b0b0b0] hover:text-[#b42318] disabled:opacity-40"
                                aria-label="Remove row"
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    disabled={disabled}
                    onClick={() => addRow(method.id)}
                  >
                    <Plus className="size-4" />
                    Add quantity row
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label>Notes (optional)</Label>
                  <Input
                    value={method.notes}
                    disabled={disabled}
                    onChange={(event) =>
                      updateMethod(method.id, { notes: event.target.value })
                    }
                    placeholder="e.g. white base / underbase counts as a color"
                  />
                </div>
              </div>
            </section>
          ))}

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              disabled={disabled}
              onClick={() => triggerImport(null)}
            >
              <Upload className="size-4" />
              Import CSV
            </Button>
            <Button
              variant="outline"
              disabled={disabled}
              onClick={() => addMethod()}
            >
              <Plus className="size-4" />
              Add decoration method
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
