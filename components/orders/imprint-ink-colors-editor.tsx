"use client";

import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
} from "react";
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
import { GripVertical, Loader2, Plus, Trash2, Zap } from "lucide-react";
import { useShopSettings } from "@/components/providers/shop-settings-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShopPresetSelect, slugifyPresetValue } from "@/components/orders/shop-preset-select";
import {
  createFlashInkColor,
  createInkColorId,
  inkColorsEqual,
  normalizeInkColorsForSave,
} from "@/lib/imprint-design";
import {
  DEFAULT_DTF_TRANSFER_TYPES,
  getDtfTransferTypeOptions,
  getMeshPresetOptions,
  getSqueegeeOptions,
  type ShopProductionDefaults,
  type SqueegeeOption,
} from "@/lib/shop-settings";
import { useDebouncedCallback } from "@/lib/use-debounced-callback";
import type { DecorationType, ImprintInkColor } from "@/types";
import { dashboardControlClass } from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";

const defaultInputClassName =
  "h-9 w-full min-w-0 rounded-lg border-border/80 bg-white text-sm shadow-none";

/** Static class literals so Tailwind emits the grid templates (dynamic strings break layout). */
function inkRowGridClass(
  isScreenPrint: boolean,
  isDtf: boolean,
  sortable: boolean
): string {
  if (isScreenPrint) {
    return sortable
      ? "grid-cols-[32px_24px_minmax(0,1.35fr)_minmax(0,0.9fr)_minmax(0,1fr)_36px]"
      : "grid-cols-[24px_minmax(0,1.35fr)_minmax(0,0.9fr)_minmax(0,1fr)]";
  }
  if (isDtf) {
    return sortable
      ? "grid-cols-[32px_24px_minmax(0,1fr)_minmax(0,1.15fr)_36px]"
      : "grid-cols-[24px_minmax(0,1fr)_minmax(0,1.15fr)]";
  }
  return sortable
    ? "grid-cols-[32px_24px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.9fr)_minmax(0,1fr)_36px]"
    : "grid-cols-[24px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.9fr)_minmax(0,1fr)]";
}

const inkRowBaseClass =
  "grid w-full min-w-[520px] items-center gap-x-3 gap-y-0 px-3 py-2.5";

const InkColorRowEditor = memo(function InkColorRowEditor({
  row,
  index,
  isScreenPrint,
  isDtf,
  fieldClassName,
  meshOptions,
  squeegeeOptions,
  transferTypeOptions,
  canAddCustomMesh,
  canAddCustomSqueegee,
  canAddCustomTransferType,
  onAddCustomMesh,
  onAddCustomSqueegee,
  onAddCustomTransferType,
  addingCustomMesh,
  addingCustomSqueegee,
  addingCustomTransferType,
  onPatch,
  onRemove,
  isNew,
  sortable = false,
  dragHandleProps,
  isDragging = false,
}: {
  row: ImprintInkColor;
  index: number;
  isScreenPrint: boolean;
  isDtf: boolean;
  fieldClassName: string;
  meshOptions: { value: string; label: string }[];
  squeegeeOptions: SqueegeeOption[];
  transferTypeOptions: { value: string; label: string }[];
  canAddCustomMesh: boolean;
  canAddCustomSqueegee: boolean;
  canAddCustomTransferType: boolean;
  onAddCustomMesh?: (label: string) => Promise<string | null>;
  onAddCustomSqueegee?: (label: string) => Promise<string | null>;
  onAddCustomTransferType?: (label: string) => Promise<string | null>;
  addingCustomMesh?: boolean;
  addingCustomSqueegee?: boolean;
  addingCustomTransferType?: boolean;
  onPatch: (patch: Partial<ImprintInkColor>, immediate?: boolean) => void;
  onRemove: () => void;
  isNew?: boolean;
  sortable?: boolean;
  dragHandleProps?: Record<string, unknown>;
  isDragging?: boolean;
}) {
  const [pmsDraft, setPmsDraft] = useState(row.pmsCode ?? "");
  const [nameDraft, setNameDraft] = useState(row.name ?? "");

  useEffect(() => {
    setPmsDraft(row.pmsCode ?? "");
    setNameDraft(row.name ?? "");
  }, [row.id, row.pmsCode, row.name]);

  const commitPms = () => {
    const next = pmsDraft.trim();
    if ((row.pmsCode ?? "") === next && (!isScreenPrint || row.name === next)) {
      return;
    }
    onPatch(
      {
        pmsCode: next,
        ...(isScreenPrint ? { name: next } : {}),
      },
      false
    );
  };

  const transferTypeValue = row.transferType ?? "";

  const showMeshSqueegee = !isDtf;

  return (
    <div
      className={cn(
        inkRowBaseClass,
        inkRowGridClass(isScreenPrint, isDtf, sortable),
        row.isFlash && "bg-amber-50/50",
        isNew && "animate-in fade-in slide-in-from-top-1 bg-[#f4f7fd]/60 duration-200",
        isDragging &&
          "relative z-10 bg-white shadow-[0_10px_28px_rgba(26,26,26,0.12)] ring-1 ring-[#c9d7ef]"
      )}
    >
      {sortable ? (
        <button
          type="button"
          className={cn(
            dashboardControlClass,
            "h-8 w-8 shrink-0 justify-center self-center p-0 text-[#616161] cursor-grab touch-none active:cursor-grabbing hover:text-[#303030]",
            isDragging && "cursor-grabbing"
          )}
          aria-label={`Drag stroke ${index + 1}`}
          {...dragHandleProps}
        >
          <GripVertical className="size-3.5" strokeWidth={1.75} />
        </button>
      ) : null}

      <span className="flex size-6 shrink-0 items-center justify-center self-center rounded-md bg-[#f6f6f7] text-[11px] font-semibold tabular-nums text-[#8a8a8a]">
        {index + 1}
      </span>

      <div className="min-w-0">
        {row.isFlash && isScreenPrint ? (
          <div className="flex h-9 items-center gap-1.5 rounded-lg border border-amber-200/80 bg-amber-50/80 px-2.5 text-[12px] font-medium text-amber-800">
            <Zap className="size-3.5 shrink-0" />
            Flash
          </div>
        ) : (
          <Input
            value={row.isFlash ? "" : pmsDraft}
            onChange={(event) => setPmsDraft(event.target.value)}
            onBlur={commitPms}
            placeholder={row.isFlash ? "—" : "289 C or WHITE"}
            disabled={row.isFlash}
            className={fieldClassName}
            autoFocus={isNew && !row.isFlash}
          />
        )}
      </div>

      {!isScreenPrint ? (
        <div className="min-w-0">
          {isDtf ? (
            <ShopPresetSelect
              value={transferTypeValue}
              options={transferTypeOptions}
              onChange={(value) => {
                const label =
                  transferTypeOptions.find((option) => option.value === value)
                    ?.label ?? "";
                onPatch(
                  {
                    transferType: value || undefined,
                    name: label,
                  },
                  false
                );
              }}
              className={fieldClassName}
              placeholder="Select transfer type"
              canAddCustom={canAddCustomTransferType}
              onAddCustom={onAddCustomTransferType}
              addingCustom={addingCustomTransferType}
              addLabel="Add transfer type"
              addPlaceholder="e.g. Warm peel"
            />
          ) : (
            <Input
              value={nameDraft}
              onChange={(event) => setNameDraft(event.target.value)}
              onBlur={() => {
                const next = nameDraft.trim();
                if (row.name === next) return;
                onPatch({ name: next }, false);
              }}
              placeholder={row.isFlash ? "Flash" : "White"}
              className={fieldClassName}
            />
          )}
        </div>
      ) : null}

      {showMeshSqueegee ? (
        <div className="min-w-0">
          {row.isFlash ? (
            <div className="flex h-9 items-center px-2 text-[12px] text-[#8a8a8a]">
              —
            </div>
          ) : (
            <ShopPresetSelect
              value={row.mesh != null ? String(row.mesh) : ""}
              options={meshOptions}
              onChange={(value) => {
                const parsed = Number(value);
                onPatch(
                  {
                    mesh:
                      Number.isFinite(parsed) && parsed > 0
                        ? Math.round(parsed)
                        : undefined,
                  },
                  false
                );
              }}
              className={fieldClassName}
              placeholder="Mesh"
              canAddCustom={canAddCustomMesh}
              onAddCustom={onAddCustomMesh}
              addingCustom={addingCustomMesh}
              addLabel="Add mesh count"
              addPlaceholder="e.g. 230 — Fine detail"
            />
          )}
        </div>
      ) : null}

      {showMeshSqueegee ? (
        <div className="min-w-0">
          {row.isFlash ? (
            <div className="flex h-9 items-center px-2 text-[12px] text-[#8a8a8a]">
              —
            </div>
          ) : (
            <ShopPresetSelect
              value={row.squeegee ?? "medium"}
              options={squeegeeOptions}
              onChange={(value) => onPatch({ squeegee: value }, false)}
              className={fieldClassName}
              placeholder="Squeegee"
              canAddCustom={canAddCustomSqueegee}
              onAddCustom={onAddCustomSqueegee}
              addingCustom={addingCustomSqueegee}
              addLabel="Add squeegee type"
              addPlaceholder="e.g. 70 durometer"
            />
          )}
        </div>
      ) : null}

      <div className="flex justify-end">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground hover:text-destructive"
          onClick={onRemove}
          aria-label="Remove ink row"
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}, (prev, next) => {
  return (
    prev.row.id === next.row.id &&
    prev.index === next.index &&
    prev.row.pmsCode === next.row.pmsCode &&
    prev.row.name === next.row.name &&
    prev.row.mesh === next.row.mesh &&
    prev.row.squeegee === next.row.squeegee &&
    prev.row.transferType === next.row.transferType &&
    prev.row.isFlash === next.row.isFlash &&
    prev.isScreenPrint === next.isScreenPrint &&
    prev.isDtf === next.isDtf &&
    prev.fieldClassName === next.fieldClassName &&
    prev.meshOptions === next.meshOptions &&
    prev.squeegeeOptions === next.squeegeeOptions &&
    prev.transferTypeOptions === next.transferTypeOptions &&
    prev.canAddCustomMesh === next.canAddCustomMesh &&
    prev.canAddCustomSqueegee === next.canAddCustomSqueegee &&
    prev.canAddCustomTransferType === next.canAddCustomTransferType &&
    prev.addingCustomMesh === next.addingCustomMesh &&
    prev.addingCustomSqueegee === next.addingCustomSqueegee &&
    prev.addingCustomTransferType === next.addingCustomTransferType &&
    prev.isNew === next.isNew &&
    prev.sortable === next.sortable &&
    prev.isDragging === next.isDragging
  );
});

function SortableInkColorRow({
  row,
  index,
  ...editorProps
}: {
  row: ImprintInkColor;
  index: number;
} & Omit<
  ComponentProps<typeof InkColorRowEditor>,
  "row" | "index" | "sortable" | "dragHandleProps" | "isDragging"
>) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: row.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <InkColorRowEditor
        row={row}
        index={index}
        sortable
        dragHandleProps={{ ...listeners, ...attributes }}
        isDragging={isDragging}
        {...editorProps}
      />
    </div>
  );
}

function buildMeshOptions(
  productionDefaults: ShopProductionDefaults | undefined,
  rows: ImprintInkColor[]
) {
  const presets = getMeshPresetOptions(productionDefaults);
  const seen = new Set(presets.map((option) => option.value));
  const extras: { value: string; label: string }[] = [];
  for (const row of rows) {
    if (row.mesh == null || row.isFlash) continue;
    const value = String(row.mesh);
    if (seen.has(value)) continue;
    seen.add(value);
    extras.push({ value, label: `${row.mesh} mesh` });
  }
  return [...presets, ...extras];
}

export function ImprintInkColorsEditor({
  inkColors,
  onChange,
  onPersist,
  readOnly = false,
  compact = false,
  decoration = "screen_print",
  inputClassName,
  buttonClassName,
}: {
  inkColors: ImprintInkColor[];
  onChange?: (inkColors: ImprintInkColor[]) => void;
  onPersist?: (inkColors: ImprintInkColor[]) => void | Promise<void>;
  readOnly?: boolean;
  compact?: boolean;
  decoration?: DecorationType;
  inputClassName?: string;
  buttonClassName?: string;
}) {
  const { settings, isAdmin, updateSettings } = useShopSettings();
  const fieldClassName = inputClassName ?? defaultInputClassName;
  const isDtf = decoration === "dtf";
  const isScreenPrint = decoration === "screen_print";

  const [draft, setDraft] = useState(inkColors);
  const [dirty, setDirty] = useState(false);
  const [persisting, setPersisting] = useState(false);
  const [addingAction, setAddingAction] = useState<"color" | "flash" | null>(
    null
  );
  const [addingCustomSqueegee, setAddingCustomSqueegee] = useState(false);
  const [addingCustomMesh, setAddingCustomMesh] = useState(false);
  const [addingCustomTransferType, setAddingCustomTransferType] =
    useState(false);
  const [newRowId, setNewRowId] = useState<string | null>(null);
  const saveGeneration = useRef(0);
  const draftRef = useRef(draft);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  useEffect(() => {
    if (dirty) return;
    setDraft((current) =>
      inkColorsEqual(current, inkColors) ? current : inkColors
    );
  }, [inkColors, dirty]);

  const squeegeeOptions = useMemo(
    () => getSqueegeeOptions(settings.productionDefaults),
    [settings.productionDefaults]
  );

  const meshOptions = useMemo(
    () => buildMeshOptions(settings.productionDefaults, draft),
    [settings.productionDefaults, draft]
  );

  const transferTypeOptions = useMemo(() => {
    const options = getDtfTransferTypeOptions(settings.productionDefaults);
    const seen = new Set(options.map((option) => option.value));
    const extras: { value: string; label: string }[] = [];
    for (const row of draft) {
      if (!row.transferType || row.isFlash || seen.has(row.transferType)) {
        continue;
      }
      seen.add(row.transferType);
      extras.push({
        value: row.transferType,
        label: row.name?.trim() || row.transferType,
      });
    }
    return [...options, ...extras];
  }, [settings.productionDefaults, draft]);

  const normalizedDraft = useCallback(
    (rows: ImprintInkColor[]) => normalizeInkColorsForSave(rows, decoration),
    [decoration]
  );

  const emitChange = useCallback(
    (next: ImprintInkColor[]) => {
      const normalized = normalizedDraft(next);
      setDraft(normalized);
      onChange?.(normalized);
      return normalized;
    },
    [normalizedDraft, onChange]
  );

  const runPersist = useCallback(
    async (next: ImprintInkColor[]) => {
      if (!onPersist) return;
      const normalized = normalizedDraft(next);
      const generation = ++saveGeneration.current;
      setPersisting(true);
      try {
        await onPersist(normalized);
        if (generation === saveGeneration.current) {
          setDirty(false);
        }
      } finally {
        if (generation === saveGeneration.current) {
          setPersisting(false);
        }
      }
    },
    [normalizedDraft, onPersist]
  );

  const { debounced: debouncedPersist, flush: flushPersist } =
    useDebouncedCallback((rows: ImprintInkColor[]) => {
      void runPersist(rows);
    }, 600);

  useEffect(() => () => flushPersist(), [flushPersist]);

  const applyDraft = useCallback(
    (next: ImprintInkColor[], { immediate = false } = {}) => {
      const normalized = emitChange(next);
      if (!onPersist) return;
      setDirty(true);
      if (immediate) {
        flushPersist();
        void runPersist(normalized);
      } else {
        debouncedPersist(normalized);
      }
    },
    [debouncedPersist, emitChange, flushPersist, onPersist, runPersist]
  );

  const commitRow = useCallback(
    (id: string, patch: Partial<ImprintInkColor>, immediate = false) => {
      const next = normalizedDraft(
        draftRef.current.map((row) =>
          row.id === id ? { ...row, ...patch } : row
        )
      );
      emitChange(next);
      if (!onPersist) return;
      setDirty(true);
      if (immediate) {
        flushPersist();
        void runPersist(next);
      } else {
        debouncedPersist(next);
      }
    },
    [
      debouncedPersist,
      emitChange,
      flushPersist,
      normalizedDraft,
      onPersist,
      runPersist,
    ]
  );

  const handlePatchRow = useCallback(
    (id: string, patch: Partial<ImprintInkColor>, immediate = false) => {
      commitRow(id, patch, immediate);
    },
    [commitRow]
  );

  const handleRemoveRow = useCallback(
    (id: string) => {
      setNewRowId(null);
      applyDraft(
        draftRef.current.filter((row) => row.id !== id),
        { immediate: true }
      );
    },
    [applyDraft]
  );

  const sortableRowIds = useMemo(() => draft.map((row) => row.id), [draft]);

  const inkSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleInkDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const ids = draftRef.current.map((row) => row.id);
      const oldIndex = ids.indexOf(String(active.id));
      const newIndex = ids.indexOf(String(over.id));
      if (oldIndex < 0 || newIndex < 0) return;

      applyDraft(arrayMove(draftRef.current, oldIndex, newIndex), {
        immediate: true,
      });
    },
    [applyDraft]
  );

  const addColorRow = async () => {
    const id = createInkColorId();
    const next = [
      ...draftRef.current,
      {
        id,
        name: isDtf ? "Cold peel" : "",
        pmsCode: "",
        mesh: undefined,
        squeegee: "medium",
        transferType: isDtf ? "cold-peel" : undefined,
        isFlash: false,
      },
    ];
    setNewRowId(id);
    setAddingAction("color");
    try {
      const normalized = emitChange(next);
      if (onPersist) {
        setDirty(true);
        await runPersist(normalized);
      }
    } finally {
      setAddingAction(null);
    }
  };

  const addFlashRow = async () => {
    const id = createInkColorId();
    const flash = { ...createFlashInkColor(), id };
    setNewRowId(id);
    setAddingAction("flash");
    try {
      const normalized = emitChange([...draftRef.current, flash]);
      if (onPersist) {
        setDirty(true);
        await runPersist(normalized);
      }
    } finally {
      setAddingAction(null);
    }
  };

  const handleAddCustomSqueegee = useCallback(
    async (label: string) => {
      if (!isAdmin) return null;
      const trimmed = label.trim();
      if (!trimmed) return null;

      const existing = getSqueegeeOptions(settings.productionDefaults);
      const match = existing.find(
        (option) => option.label.toLowerCase() === trimmed.toLowerCase()
      );
      if (match) return match.value;

      const value = slugifyPresetValue(trimmed);
      const nextCustom = [
        ...(settings.productionDefaults.squeegeeOptions ?? []),
        { value, label: trimmed },
      ];

      setAddingCustomSqueegee(true);
      try {
        await updateSettings({
          productionDefaults: { squeegeeOptions: nextCustom },
        });
        return value;
      } finally {
        setAddingCustomSqueegee(false);
      }
    },
    [isAdmin, settings.productionDefaults, updateSettings]
  );

  const handleAddCustomMesh = useCallback(
    async (label: string) => {
      if (!isAdmin) return null;
      const trimmed = label.trim();
      if (!trimmed) return null;

      const meshMatch = trimmed.match(/\d+/);
      const mesh = meshMatch ? Number(meshMatch[0]) : Number(trimmed);
      if (!Number.isFinite(mesh) || mesh < 20 || mesh > 500) return null;

      const rounded = Math.round(mesh);
      const existing = getMeshPresetOptions(settings.productionDefaults);
      const match = existing.find((option) => option.mesh === rounded);
      if (match) return match.value;

      const nextCustom = [
        ...(settings.productionDefaults.meshPresets ?? []),
        {
          mesh: rounded,
          label: trimmed.includes(String(rounded))
            ? trimmed
            : `${rounded} — ${trimmed}`,
          notes: "",
        },
      ];

      setAddingCustomMesh(true);
      try {
        await updateSettings({
          productionDefaults: { meshPresets: nextCustom },
        });
        return String(rounded);
      } finally {
        setAddingCustomMesh(false);
      }
    },
    [isAdmin, settings.productionDefaults, updateSettings]
  );

  const handleAddCustomTransferType = useCallback(
    async (label: string) => {
      if (!isAdmin) return null;
      const trimmed = label.trim();
      if (!trimmed) return null;

      const existing = getDtfTransferTypeOptions(settings.productionDefaults);
      const match = existing.find(
        (option) => option.label.toLowerCase() === trimmed.toLowerCase()
      );
      if (match) return match.value;

      const value = slugifyPresetValue(trimmed);
      const nextCustom = [
        ...(settings.productionDefaults.dtfTransferTypes ?? []),
        { value, label: trimmed },
      ];

      setAddingCustomTransferType(true);
      try {
        await updateSettings({
          productionDefaults: { dtfTransferTypes: nextCustom },
        });
        return value;
      } finally {
        setAddingCustomTransferType(false);
      }
    },
    [isAdmin, settings.productionDefaults, updateSettings]
  );

  if (readOnly && inkColors.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No ink colors assigned yet.
      </p>
    );
  }

  const headerCols = inkRowGridClass(isScreenPrint, isDtf, !readOnly);

  return (
    <div className="space-y-3">
      {!readOnly && draft.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-2 px-0.5">
          <div>
            <p className="text-[13px] font-semibold text-[#303030]">
              Production order
            </p>
            <p className="text-[12px] text-muted-foreground">
              Drag strokes to match press order — colors and flashes run top to
              bottom.
            </p>
          </div>
          <span className="rounded-full bg-[#f1f1f1] px-2.5 py-1 text-[11px] font-medium text-[#616161]">
            {draft.length} stroke{draft.length !== 1 ? "s" : ""}
          </span>
        </div>
      ) : null}

      <div
        className={cn(
          "overflow-hidden rounded-xl border border-[#ebebeb] bg-white",
          compact && "text-sm"
        )}
      >
        <div className="overflow-x-auto">
          <div
            className={cn(
              inkRowBaseClass,
              headerCols,
              "border-b border-[#ebebeb] bg-[#fafafa] py-2 text-[10px] font-semibold uppercase tracking-wide text-[#8a8a8a]"
            )}
          >
            {!readOnly ? <span aria-hidden /> : null}
            <span>#</span>
            <span>PMS</span>
            {!isScreenPrint ? (
              <span>{isDtf ? "Transfer type" : "Ink / stroke"}</span>
            ) : null}
            {!isDtf ? <span>Mesh</span> : null}
            {!isDtf ? <span>Squeegee</span> : null}
            {!readOnly ? <span className="sr-only">Remove</span> : null}
          </div>

        {draft.length === 0 ? (
          <div className="px-3 py-6 text-center text-sm text-muted-foreground">
            {isScreenPrint
              ? "Add Pantone codes, mesh counts, and squeegee types for this screen print."
              : isDtf
                ? "Add Pantone codes and transfer type for each color on this DTF location."
                : "Add ink colors and flash strokes for this location."}
          </div>
        ) : readOnly ? (
          <div className="divide-y divide-[#f0f0f0]">
            {draft.map((row, index) => (
              <div
                key={row.id}
                className={cn(
                  inkRowBaseClass,
                  headerCols,
                  "text-[13px]",
                  row.isFlash && "bg-amber-50/50"
                )}
              >
                <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-[#f6f6f7] text-[11px] font-semibold tabular-nums text-[#8a8a8a]">
                  {index + 1}
                </span>
                <span className="min-w-0 font-mono text-xs">
                  {row.isFlash ? (
                    <span className="inline-flex items-center gap-1 font-sans font-medium text-amber-800">
                      <Zap className="size-3.5" />
                      Flash
                    </span>
                  ) : (
                    row.pmsCode || "—"
                  )}
                </span>
                {!isScreenPrint ? (
                  <span className="min-w-0 font-medium">
                    {isDtf
                      ? (transferTypeOptions.find(
                          (option) => option.value === row.transferType
                        )?.label ??
                          row.name ??
                          "—")
                      : row.name || "—"}
                  </span>
                ) : null}
                {!isDtf ? (
                  <>
                    <span className="min-w-0">
                      {row.isFlash
                        ? "—"
                        : meshOptions.find((o) => o.value === String(row.mesh))
                            ?.label ??
                          row.mesh ??
                          "—"}
                    </span>
                    <span className="min-w-0">
                      {row.isFlash
                        ? "—"
                        : squeegeeOptions.find((o) => o.value === row.squeegee)
                            ?.label ??
                          row.squeegee ??
                          "—"}
                    </span>
                  </>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <DndContext
            sensors={inkSensors}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis]}
            onDragEnd={handleInkDragEnd}
          >
            <SortableContext
              items={sortableRowIds}
              strategy={verticalListSortingStrategy}
            >
              <div className="divide-y divide-[#f0f0f0] bg-white">
                {draft.map((row, index) => (
                  <SortableInkColorRow
                    key={row.id}
                    row={row}
                    index={index}
                    isScreenPrint={isScreenPrint}
                    isDtf={isDtf}
                    fieldClassName={fieldClassName}
                    meshOptions={meshOptions}
                    squeegeeOptions={squeegeeOptions}
                    transferTypeOptions={transferTypeOptions}
                    canAddCustomMesh={isAdmin}
                    canAddCustomSqueegee={isAdmin}
                    canAddCustomTransferType={isAdmin && isDtf}
                    onAddCustomMesh={handleAddCustomMesh}
                    onAddCustomSqueegee={handleAddCustomSqueegee}
                    onAddCustomTransferType={handleAddCustomTransferType}
                    addingCustomMesh={addingCustomMesh}
                    addingCustomSqueegee={addingCustomSqueegee}
                    addingCustomTransferType={addingCustomTransferType}
                    onPatch={(patch, immediate) =>
                      handlePatchRow(row.id, patch, immediate)
                    }
                    onRemove={() => handleRemoveRow(row.id)}
                    isNew={row.id === newRowId}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
        </div>
      </div>

      {!readOnly && (
        <div className="flex flex-wrap items-center gap-2">
          {buttonClassName ? (
            <>
              <Button
                type="button"
                className={buttonClassName}
                disabled={addingAction === "color" || persisting}
                onClick={() => void addColorRow()}
              >
                {addingAction === "color" ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Plus className="size-3.5" />
                )}
                {addingAction === "color" ? "Adding color…" : "Add color"}
              </Button>
              {!isDtf ? (
                <Button
                  type="button"
                  className={buttonClassName}
                  disabled={addingAction === "flash" || persisting}
                  onClick={() => void addFlashRow()}
                >
                  {addingAction === "flash" ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Zap className="size-3.5" />
                  )}
                  {addingAction === "flash" ? "Adding flash…" : "Add flash"}
                </Button>
              ) : null}
            </>
          ) : (
            <>
              <Button
                type="button"
                className={cn(dashboardControlClass, "h-8 text-[12px]")}
                disabled={addingAction === "color" || persisting}
                onClick={() => void addColorRow()}
              >
                {addingAction === "color" ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Plus className="size-3.5" />
                )}
                {addingAction === "color" ? "Adding color…" : "Add color"}
              </Button>
              {!isDtf ? (
                <Button
                  type="button"
                  className={cn(dashboardControlClass, "h-8 text-[12px]")}
                  disabled={addingAction === "flash" || persisting}
                  onClick={() => void addFlashRow()}
                >
                  {addingAction === "flash" ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Zap className="size-3.5" />
                  )}
                  {addingAction === "flash" ? "Adding flash…" : "Add flash"}
                </Button>
              ) : null}
            </>
          )}
          {onPersist && persisting ? (
            <span className="inline-flex items-center gap-1.5 text-[11px] text-[#8a8a8a]">
              <Loader2 className="size-3 animate-spin" />
              Saving…
            </span>
          ) : null}
        </div>
      )}
    </div>
  );
}
