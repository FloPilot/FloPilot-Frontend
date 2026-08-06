"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  Loader2,
  Plus,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createEmptyInkColor,
  createFlashInkColor,
  createInkColorId,
  inkColorStableId,
  normalizeInkColorsForSave,
} from "@/lib/imprint-design";
import {
  computeInkPrepProgress,
  computeInkPrepLineStatus,
  inkColorsForPrep,
} from "@/lib/ink-prep";
import { decorationLabel } from "@/lib/format";
import { imprintInkConfigured } from "@/lib/order-receiving-checkpoints";
import { useDebouncedCallback } from "@/lib/use-debounced-callback";
import {
  dashboardControlClass,
  dashboardInsetSurfaceClass,
  dashboardPrimaryButtonClass,
  dashboardTaskDetailClass,
} from "@/lib/dashboard-styles";
import type {
  ImprintInkColor,
  Job,
  JobImprint,
  OrderMaterialLine,
} from "@/types";
import { cn } from "@/lib/utils";

const compactFieldClass =
  "h-8 min-h-8 rounded-lg border-[#e3e3e3] bg-white px-2.5 text-[12px] shadow-none";

function ReceivingStatusPill({ status }: { status: OrderMaterialLine["status"] }) {
  const styles: Record<OrderMaterialLine["status"], string> = {
    waiting: "bg-[#f3f3f3] text-[#616161]",
    partial: "bg-[#fff5ea] text-[#8a6116]",
    received: "bg-[#e8f5ee] text-[#0d5c2e]",
  };
  const labels: Record<OrderMaterialLine["status"], string> = {
    waiting: "Not started",
    partial: "In progress",
    received: "Ready",
  };

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-md px-2 py-0.5 text-[11px] font-semibold",
        styles[status]
      )}
    >
      {labels[status]}
    </span>
  );
}

function inkColorLabel(row: ImprintInkColor): string {
  return row.pmsCode?.trim() || row.name?.trim() || "";
}

function InkPrepColorRow({
  row,
  index,
  prepped,
  disabled,
  onTogglePrep,
  onPatch,
}: {
  row: ImprintInkColor;
  index: number;
  prepped: boolean;
  disabled?: boolean;
  onTogglePrep: (prepped: boolean) => Promise<void>;
  onPatch: (
    patch: Partial<ImprintInkColor>,
    options?: { immediate?: boolean }
  ) => void;
}) {
  const [pmsDraft, setPmsDraft] = useState(inkColorLabel(row));
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setPmsDraft(inkColorLabel(row));
  }, [row.id, row.pmsCode, row.name]);

  const commitPms = () => {
    const next = pmsDraft.trim();
    if (inkColorLabel(row) === next) return;
    onPatch(
      {
        pmsCode: next,
        name: row.isFlash ? row.name : next,
      },
      { immediate: true }
    );
  };

  const handleToggle = async () => {
    if (disabled || pending) return;
    const label = pmsDraft.trim() || inkColorLabel(row);
    if (!row.isFlash && !label) return;

    setPending(true);
    try {
      if (!row.isFlash && label && label !== inkColorLabel(row)) {
        onPatch({ pmsCode: label, name: label }, { immediate: true });
      }
      await onTogglePrep(!prepped);
    } finally {
      setPending(false);
    }
  };

  return (
    <div
      className={cn(
        "grid gap-2 border-t border-[#f0f0f0] px-3 py-2.5",
        "grid-cols-1 sm:grid-cols-[28px_28px_minmax(0,1fr)] sm:items-center sm:gap-2",
        row.isFlash ? "bg-amber-50/40" : prepped ? "bg-[#f6fbf5]/60" : "bg-white"
      )}
    >
      <span className="hidden size-6 items-center justify-center rounded-md bg-[#f6f6f7] text-[11px] font-semibold tabular-nums text-[#8a8a8a] sm:flex">
        {index + 1}
      </span>
      <div className="flex items-center gap-2 sm:contents">
        <button
          type="button"
          disabled={disabled || pending}
          onClick={() => void handleToggle()}
          aria-pressed={prepped}
          aria-label={prepped ? "Mark color not prepped" : "Mark color prepped"}
          className={cn(
            "flex size-5 shrink-0 items-center justify-center rounded border transition-colors",
            prepped
              ? "border-brand-primary bg-brand-primary text-white"
              : "border-[#cfcfcf] bg-white text-transparent hover:border-[#9a9a9a]",
            (disabled || pending) && "opacity-60"
          )}
        >
          {pending ? (
            <Loader2 className="size-2.5 animate-spin text-[#616161]" />
          ) : (
            <Check className="size-2.5" strokeWidth={3} />
          )}
        </button>
        <span className="text-[12px] font-medium text-[#303030] sm:hidden">
          {row.isFlash ? "Flash stroke" : "Ink color"}
        </span>
      </div>

      <div className="min-w-0 sm:col-start-3">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[#8a8a8a] sm:sr-only">
          Pantone
        </p>
        {row.isFlash ? (
          <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-amber-800">
            <Zap className="size-3.5 shrink-0" />
            Flash stroke
          </span>
        ) : (
          <Input
            value={pmsDraft}
            onChange={(event) => setPmsDraft(event.target.value)}
            onBlur={commitPms}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
            }}
            disabled={disabled}
            placeholder="289 C"
            className={compactFieldClass}
          />
        )}
      </div>
    </div>
  );
}

export function InkPrepLocationCard({
  line,
  job,
  imprint,
  saving,
  onToggleColorPrep,
  onMarkAllPrep,
  onPersistInkColors,
  defaultExpanded,
}: {
  line: OrderMaterialLine;
  job: Job;
  imprint: JobImprint;
  saving: boolean;
  onToggleColorPrep: (colorId: string, prepped: boolean) => void | Promise<void>;
  onMarkAllPrep: (prepped: boolean) => void | Promise<void>;
  onPersistInkColors: (inkColors: ImprintInkColor[]) => void | Promise<void>;
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(
    defaultExpanded ?? line.status !== "received"
  );
  const [addingColor, setAddingColor] = useState(false);
  const [persisting, setPersisting] = useState(false);
  const [draftColors, setDraftColors] = useState(() => inkColorsForPrep(imprint));
  const [localPreppedIds, setLocalPreppedIds] = useState<string[]>(
    () => line.preppedInkColorIds ?? []
  );
  const dirtyRef = useRef(false);
  const saveGeneration = useRef(0);
  const togglingPrepRef = useRef(false);

  const preppedIdSet = useMemo(() => new Set(localPreppedIds), [localPreppedIds]);
  const { prepped, total } = computeInkPrepProgress(imprint, localPreppedIds);
  const prepStatus = computeInkPrepLineStatus(imprint, localPreppedIds);
  const needsProofColors = !imprintInkConfigured(imprint);
  const inkType = imprint.notes?.inkType?.trim();

  useEffect(() => {
    if (!dirtyRef.current) {
      setDraftColors(inkColorsForPrep(imprint));
    }
  }, [imprint]);

  useEffect(() => {
    if (togglingPrepRef.current) return;
    setLocalPreppedIds(line.preppedInkColorIds ?? []);
  }, [line.preppedInkColorIds, line.updatedAt]);

  const runPersist = useCallback(
    async (next: ImprintInkColor[]) => {
      const normalized = normalizeInkColorsForSave(next, imprint.decoration);
      const generation = ++saveGeneration.current;
      setPersisting(true);
      try {
        await onPersistInkColors(normalized);
        if (generation === saveGeneration.current) {
          dirtyRef.current = false;
          setDraftColors(normalized);
        }
      } finally {
        if (generation === saveGeneration.current) {
          setPersisting(false);
        }
      }
    },
    [imprint.decoration, onPersistInkColors]
  );

  const { debounced: debouncedPersist, flush: flushPersist } =
    useDebouncedCallback((rows: ImprintInkColor[]) => {
      void runPersist(rows);
    }, 500);

  useEffect(() => () => flushPersist(), [flushPersist]);

  const patchColor = (
    colorId: string,
    patch: Partial<ImprintInkColor>,
    options?: { immediate?: boolean }
  ) => {
    const next = normalizeInkColorsForSave(
      draftColors.map((row) => (row.id === colorId ? { ...row, ...patch } : row)),
      imprint.decoration
    );
    dirtyRef.current = true;
    setDraftColors(next);
    if (options?.immediate) {
      flushPersist();
      void runPersist(next);
    } else {
      debouncedPersist(next);
    }
  };

  const handleToggleColorPrep = async (colorId: string, prepped: boolean) => {
    const previous = localPreppedIds;
    const next = prepped
      ? previous.includes(colorId)
        ? previous
        : [...previous, colorId]
      : previous.filter((id) => id !== colorId);
    setLocalPreppedIds(next);
    togglingPrepRef.current = true;
    try {
      await onToggleColorPrep(colorId, prepped);
    } catch {
      setLocalPreppedIds(previous);
    } finally {
      togglingPrepRef.current = false;
    }
  };

  const handleMarkAllPrep = async (prepped: boolean) => {
    const previous = localPreppedIds;
    const next = prepped
      ? draftColors.map((row, index) => inkColorStableId(row, index))
      : [];
    setLocalPreppedIds(next);
    togglingPrepRef.current = true;
    try {
      await onMarkAllPrep(prepped);
    } catch {
      setLocalPreppedIds(previous);
    } finally {
      togglingPrepRef.current = false;
    }
  };

  const addColor = async () => {
    setAddingColor(true);
    try {
      const next = normalizeInkColorsForSave(
        [...draftColors, createEmptyInkColor({ id: createInkColorId() })],
        imprint.decoration
      );
      setDraftColors(next);
      await runPersist(next);
    } finally {
      setAddingColor(false);
    }
  };

  const addFlash = async () => {
    setAddingColor(true);
    try {
      const next = normalizeInkColorsForSave(
        [...draftColors, { ...createFlashInkColor(), id: createInkColorId() }],
        imprint.decoration
      );
      setDraftColors(next);
      await runPersist(next);
    } finally {
      setAddingColor(false);
    }
  };

  return (
    <article
      className={cn(
        dashboardInsetSurfaceClass,
        "overflow-hidden",
        prepStatus === "received" && "border-[#b7d8b7]"
      )}
    >
      <button
        type="button"
        onClick={() => setExpanded((open) => !open)}
        className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-[#fafafa]"
      >
        <ChevronDown
          className={cn(
            "mt-0.5 size-4 shrink-0 text-[#8a8a8a] transition-transform",
            expanded && "rotate-180"
          )}
        />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-[#303030]">
              {line.label}
            </span>
            <span className="rounded-md bg-[#f3f3f3] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#616161]">
              {decorationLabel(imprint.decoration)}
            </span>
          </span>
          <span className={cn("mt-0.5 block", dashboardTaskDetailClass)}>
            {[job.name, inkType].filter(Boolean).join(" · ")}
            {total > 0 ? ` · ${prepped}/${total} colors prepped` : ""}
          </span>
        </span>
        <ReceivingStatusPill status={prepStatus} />
      </button>

      {expanded ? (
        <div className="border-t border-[#ebebeb] bg-[#fcfcfc]">
          {needsProofColors && draftColors.length === 0 ? (
            <div className="space-y-3 px-4 py-4">
              <p className="text-[13px] text-[#616161]">
                Add Pantone codes for this location. Changes save to the order
                artwork and proofs.
              </p>
              <Button
                type="button"
                className={cn(dashboardPrimaryButtonClass, "h-8 text-[12px]")}
                disabled={addingColor || saving}
                onClick={() => void addColor()}
              >
                {addingColor ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Plus className="size-3.5" />
                )}
                Add first color
              </Button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <div className="min-w-0">
                  <div className="hidden border-b border-[#ebebeb] bg-[#fafafa] px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-[#8a8a8a] sm:grid sm:grid-cols-[28px_28px_minmax(0,1fr)] sm:gap-2">
                    <span>#</span>
                    <span className="sr-only">Prepped</span>
                    <span className="sm:col-start-3">Pantone</span>
                  </div>
                  {draftColors.map((row, index) => {
                    const colorId = inkColorStableId(row, index);
                    return (
                      <InkPrepColorRow
                        key={colorId}
                        row={{ ...row, id: colorId }}
                        index={index}
                        prepped={preppedIdSet.has(colorId)}
                        disabled={saving}
                        onTogglePrep={(prepped) =>
                          handleToggleColorPrep(colorId, prepped)
                        }
                        onPatch={(patch, options) =>
                          patchColor(colorId, patch, options)
                        }
                      />
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#ebebeb] px-4 py-3">
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    className={cn(dashboardControlClass, "h-8 text-[12px]")}
                    disabled={addingColor || saving || persisting}
                    onClick={() => void addColor()}
                  >
                    <Plus className="size-3.5" />
                    Add color
                  </Button>
                  <Button
                    type="button"
                    className={cn(dashboardControlClass, "h-8 text-[12px]")}
                    disabled={addingColor || saving || persisting}
                    onClick={() => void addFlash()}
                  >
                    <Zap className="size-3.5" />
                    Add flash
                  </Button>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {persisting ? (
                    <span className="inline-flex items-center gap-1.5 text-[11px] text-[#8a8a8a]">
                      <Loader2 className="size-3 animate-spin" />
                      Saving…
                    </span>
                  ) : (
                    <span className="text-[11px] text-[#8a8a8a]">
                      Edits sync to proofs &amp; artwork
                    </span>
                  )}
                  {total > 0 && prepped < total ? (
                    <Button
                      type="button"
                      className={cn(dashboardPrimaryButtonClass, "h-8 text-[12px]")}
                      disabled={saving}
                      onClick={() => void handleMarkAllPrep(true)}
                    >
                      Mark all prepped
                    </Button>
                  ) : null}
                  {prepped > 0 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-8 text-[12px] text-[#616161]"
                      disabled={saving}
                      onClick={() => void handleMarkAllPrep(false)}
                    >
                      Clear prep
                    </Button>
                  ) : null}
                </div>
              </div>
            </>
          )}
        </div>
      ) : null}
    </article>
  );
}
