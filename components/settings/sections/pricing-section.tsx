"use client";

import { useRef, useState } from "react";
import { Info, Plus, Trash2, Upload } from "lucide-react";
import {
  AdminLockNotice,
  SaveButton,
  SettingsError,
  SettingsHeader,
  SettingsMain,
  SettingsPanel,
  useSectionDraft,
} from "@/components/settings/settings-kit";
import { useShopSettings } from "@/components/providers/shop-settings-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { parsePricingCsv, type ParsedPricingGrid } from "@/lib/pricing-csv";
import {
  type PricingMatrix,
  type PricingMethod,
} from "@/lib/shop-settings";
import { CustomerContractFeesEditor } from "@/components/pricing/customer-contract-fees-editor";
import type { CustomerNegotiatedRateSheet } from "@/types";
import { cn } from "@/lib/utils";

function newId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `method-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function methodNameFromFile(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, "").replace(/[_]+/g, " ").trim();
}

const STARTER_METHODS = ["Screen Print", "Embroidery", "DTF", "DTG"];

export function PricingSection() {
  const { settings, isAdmin, updateSettings } = useShopSettings();
  const currency = settings.companyProfile.currency || "USD";
  const { draft, setDraft, dirty } = useSectionDraft<PricingMatrix>(
    settings.pricingMatrix
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [csvError, setCsvError] = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const importTargetRef = useRef<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await updateSettings({
        pricingMatrix: {
          ...draft,
          blankMarkupPercent:
            settings.pricingMatrix.blankMarkupPercent ?? draft.blankMarkupPercent ?? 0,
        },
      });
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save pricing");
    } finally {
      setSaving(false);
    }
  };

  const updateMethod = (id: string, patch: Partial<PricingMethod>) =>
    setDraft((current) => ({
      ...current,
      methods: current.methods.map((m) =>
        m.id === id ? { ...m, ...patch } : m
      ),
    }));

  const addMethod = (name = "", grid?: ParsedPricingGrid) =>
    setDraft((current) => ({
      ...current,
      methods: [
        ...current.methods,
        {
          id: newId(),
          name,
          unit: "per piece",
          notes: "",
          columns: grid?.columns ?? ["Price"],
          rows: grid?.rows ?? [{ minQty: 1, prices: [0] }],
        },
      ],
    }));

  const removeMethod = (id: string) =>
    setDraft((current) => ({
      ...current,
      methods: current.methods.filter((m) => m.id !== id),
    }));

  const addRow = (id: string) =>
    setDraft((current) => ({
      ...current,
      methods: current.methods.map((m) =>
        m.id === id
          ? {
              ...m,
              rows: [
                ...m.rows,
                { minQty: 1, prices: m.columns.map(() => 0) },
              ],
            }
          : m
      ),
    }));

  const removeRow = (id: string, index: number) =>
    setDraft((current) => ({
      ...current,
      methods: current.methods.map((m) =>
        m.id === id
          ? { ...m, rows: m.rows.filter((_, i) => i !== index) }
          : m
      ),
    }));

  const updateRowQty = (id: string, index: number, minQty: number) =>
    setDraft((current) => ({
      ...current,
      methods: current.methods.map((m) =>
        m.id === id
          ? {
              ...m,
              rows: m.rows.map((r, i) =>
                i === index ? { ...r, minQty } : r
              ),
            }
          : m
      ),
    }));

  const updateCell = (
    id: string,
    rowIndex: number,
    colIndex: number,
    value: number
  ) =>
    setDraft((current) => ({
      ...current,
      methods: current.methods.map((m) =>
        m.id === id
          ? {
              ...m,
              rows: m.rows.map((r, i) =>
                i === rowIndex
                  ? {
                      ...r,
                      prices: r.prices.map((p, c) =>
                        c === colIndex ? value : p
                      ),
                    }
                  : r
              ),
            }
          : m
      ),
    }));

  const updateColumnName = (id: string, colIndex: number, name: string) =>
    setDraft((current) => ({
      ...current,
      methods: current.methods.map((m) =>
        m.id === id
          ? {
              ...m,
              columns: m.columns.map((c, i) => (i === colIndex ? name : c)),
            }
          : m
      ),
    }));

  const addColumn = (id: string) =>
    setDraft((current) => ({
      ...current,
      methods: current.methods.map((m) =>
        m.id === id
          ? {
              ...m,
              columns: [...m.columns, `Column ${m.columns.length + 1}`],
              rows: m.rows.map((r) => ({ ...r, prices: [...r.prices, 0] })),
            }
          : m
      ),
    }));

  const removeColumn = (id: string, colIndex: number) =>
    setDraft((current) => ({
      ...current,
      methods: current.methods.map((m) =>
        m.id === id && m.columns.length > 1
          ? {
              ...m,
              columns: m.columns.filter((_, i) => i !== colIndex),
              rows: m.rows.map((r) => ({
                ...r,
                prices: r.prices.filter((_, i) => i !== colIndex),
              })),
            }
          : m
      ),
    }));

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
    <SettingsMain>
      <SettingsHeader
        title="Pricing matrix"
        description="Define decoration pricing by quantity so quotes and orders price themselves."
      >
        <SaveButton
          dirty={dirty}
          saving={saving}
          saved={saved}
          disabled={!isAdmin}
          onSave={() => void handleSave()}
        />
      </SettingsHeader>

      {!isAdmin && <AdminLockNotice />}
      {error && <SettingsError message={error} />}

      <input
        ref={fileRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => {
          void handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      <SettingsPanel
        title="Auto-apply to orders"
        description="When on, matching pricing tiers are suggested as you build line items."
        action={
          <button
            type="button"
            role="switch"
            aria-checked={draft.enabled}
            disabled={!isAdmin}
            onClick={() => setDraft((c) => ({ ...c, enabled: !c.enabled }))}
            className={cn(
              "relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors",
              draft.enabled ? "bg-brand-primary" : "bg-[#d4d4d4]",
              !isAdmin && "cursor-not-allowed opacity-50"
            )}
          >
            <span
              className={cn(
                "pointer-events-none absolute top-0.5 inline-block size-5 rounded-full bg-white shadow transition-transform",
                draft.enabled ? "translate-x-5" : "translate-x-0.5"
              )}
            />
          </button>
        }
      >
        <div className="flex items-start gap-2.5 rounded-lg border border-[#dbe6ff] bg-[#f4f7ff] px-4 py-3 text-[13px] text-[#3a4a6b]">
          <Info className="mt-0.5 size-4 shrink-0 text-brand-primary" />
          <p>
            Prices are per unit at each quantity break. Upload a CSV where the
            first column is the quantity and each remaining column is a price
            option (for example, number of print colors). The highest tier whose
            minimum quantity is met is used.
          </p>
        </div>
      </SettingsPanel>

      {draft.methods.length === 0 ? (
        <SettingsPanel title="Decoration methods">
          <div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
            <p className="max-w-sm text-[13px] text-[#616161]">
              Upload a pricing CSV to load your matrix in seconds, or add a
              method to build one by hand.
            </p>
            <Button size="sm" disabled={!isAdmin} onClick={() => triggerImport(null)}>
              <Upload className="size-4" />
              Import CSV
            </Button>
            {csvError && (
              <p className="text-xs text-[#b42318]">{csvError}</p>
            )}
            <div className="flex flex-wrap justify-center gap-2 pt-2">
              {STARTER_METHODS.map((name) => (
                <Button
                  key={name}
                  variant="outline"
                  size="sm"
                  disabled={!isAdmin}
                  onClick={() => addMethod(name)}
                >
                  <Plus className="size-4" />
                  {name}
                </Button>
              ))}
            </div>
          </div>
        </SettingsPanel>
      ) : (
        <div className="space-y-4">
          {csvError && <SettingsError message={csvError} />}

          {draft.methods.map((method) => (
            <SettingsPanel
              key={method.id}
              title={method.name || "Untitled method"}
              action={
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!isAdmin}
                    onClick={() => triggerImport(method.id)}
                  >
                    <Upload className="size-4" />
                    Replace via CSV
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    disabled={!isAdmin}
                    onClick={() => removeMethod(method.id)}
                    className="text-[#8a8a8a] hover:text-[#b42318]"
                    aria-label="Remove method"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </>
              }
            >
              <div className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Method name</Label>
                    <Input
                      value={method.name}
                      disabled={!isAdmin}
                      onChange={(e) =>
                        updateMethod(method.id, { name: e.target.value })
                      }
                      placeholder="e.g. Screen Print"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Unit label</Label>
                    <Input
                      value={method.unit}
                      disabled={!isAdmin}
                      onChange={(e) =>
                        updateMethod(method.id, { unit: e.target.value })
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
                      disabled={!isAdmin}
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
                          {method.columns.map((col, colIndex) => (
                            <th
                              key={colIndex}
                              className="border-l border-[#ebebeb] px-2 py-1.5"
                            >
                              <div className="flex items-center gap-1">
                                <Input
                                  value={col}
                                  disabled={!isAdmin}
                                  onChange={(e) =>
                                    updateColumnName(
                                      method.id,
                                      colIndex,
                                      e.target.value
                                    )
                                  }
                                  className="h-8 w-24 text-xs"
                                />
                                {method.columns.length > 1 && (
                                  <button
                                    type="button"
                                    disabled={!isAdmin}
                                    onClick={() =>
                                      removeColumn(method.id, colIndex)
                                    }
                                    className="text-[#b0b0b0] hover:text-[#b42318] disabled:opacity-40"
                                    aria-label="Remove column"
                                  >
                                    <Trash2 className="size-3.5" />
                                  </button>
                                )}
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
                                disabled={!isAdmin}
                                value={row.minQty}
                                onChange={(e) =>
                                  updateRowQty(
                                    method.id,
                                    rowIndex,
                                    Math.max(
                                      1,
                                      Math.floor(Number(e.target.value) || 1)
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
                                  disabled={!isAdmin}
                                  value={price}
                                  onChange={(e) =>
                                    updateCell(
                                      method.id,
                                      rowIndex,
                                      colIndex,
                                      Math.max(0, Number(e.target.value) || 0)
                                    )
                                  }
                                  className="h-8 w-20 text-xs"
                                />
                              </td>
                            ))}
                            <td className="border-l border-[#ebebeb] px-2 py-1.5 text-center">
                              <button
                                type="button"
                                disabled={!isAdmin || method.rows.length <= 1}
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
                    disabled={!isAdmin}
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
                    disabled={!isAdmin}
                    onChange={(e) =>
                      updateMethod(method.id, { notes: e.target.value })
                    }
                    placeholder="e.g. white base / underbase counts as a color"
                  />
                </div>
              </div>
            </SettingsPanel>
          ))}

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              disabled={!isAdmin}
              onClick={() => triggerImport(null)}
            >
              <Upload className="size-4" />
              Import CSV
            </Button>
            <Button
              variant="outline"
              disabled={!isAdmin}
              onClick={() => addMethod()}
            >
              <Plus className="size-4" />
              Add decoration method
            </Button>
          </div>

          <SettingsPanel
            title="Order fee presets"
            description="Saved setup, finishing, and other fees staff can pick when building an estimate."
          >
            <CustomerContractFeesEditor
              sheet={
                {
                  id: "shop",
                  name: "Shop standard",
                  enabled: true,
                  methods: [],
                  contractFees: draft.contractFees ?? [],
                } satisfies CustomerNegotiatedRateSheet
              }
              onChange={(sheet) =>
                setDraft((current) => ({
                  ...current,
                  contractFees: sheet.contractFees ?? [],
                }))
              }
              currency={currency}
            />
          </SettingsPanel>
        </div>
      )}
    </SettingsMain>
  );
}
