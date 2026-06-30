"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Archive,
  ArchiveRestore,
  BookMarked,
  ExternalLink,
  Layers,
  Pencil,
  Search,
  Shirt,
  X,
} from "lucide-react";
import { MockupPreview } from "@/components/orders/artwork/mockup-preview";
import { ArtworkStatusBadge } from "@/components/orders/artwork/artwork-status-badge";
import { ImprintInkColorsEditor } from "@/components/orders/imprint-ink-colors-editor";
import { useAuth } from "@/components/providers/auth-provider";
import { useSchedule } from "@/components/providers/schedule-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  dashboardCardClass,
  dashboardControlClass,
  dashboardElevatedShadow,
  dashboardGhostButtonClass,
  dashboardInsetSurfaceClass,
  dashboardPrimaryButtonClass,
  dashboardTaskDetailClass,
} from "@/lib/dashboard-styles";
import { useArchivedDesigns } from "@/lib/design-archive";
import { useImageBackgroundColor } from "@/lib/use-image-background-color";
import { INK_TYPE_OPTIONS } from "@/lib/imprint-design";
import { listDesigns, updateDesign as apiUpdateDesign } from "@/lib/api";
import { decorationLabel, formatDate, formatDateTime } from "@/lib/format";
import type { ImprintInkColor, ImprintProductionNotes, SavedDesign } from "@/types";
import { cn } from "@/lib/utils";

const editFieldClass = cn(
  dashboardControlClass,
  "h-9 w-full justify-start px-3 text-[13px] shadow-none"
);

type LibraryScope = "active" | "archived";

function DesignThumb({
  design,
  className,
}: {
  design: SavedDesign;
  className?: string;
}) {
  const previewUrl = design.artwork.previewUrl;

  if (previewUrl) {
    return (
      <img
        src={previewUrl}
        alt={design.name}
        // Match the crossOrigin mode used by useImageBackgroundColor so the
        // browser caches a CORS-clean response and the canvas isn't tainted.
        crossOrigin="anonymous"
        className={cn("h-full w-full object-contain", className)}
      />
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-2 text-[#8a8a8a]">
      <Shirt className="size-7" strokeWidth={1.5} />
      <span className="text-[11px] font-semibold uppercase tracking-wide">
        {decorationLabel(design.decoration)}
      </span>
    </div>
  );
}

function MetaField({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-[#e3e3e3] bg-white px-3 py-2.5">
      <p className="text-[11px] uppercase tracking-wide text-[#8a8a8a]">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-medium text-[#303030]">{value}</p>
    </div>
  );
}

function DesignCard({
  design,
  archived,
  groupCount,
  onOpen,
  onArchiveToggle,
}: {
  design: SavedDesign;
  archived: boolean;
  groupCount: number;
  onOpen: () => void;
  onArchiveToggle: () => void;
}) {
  const pms = design.pmsCodes ?? [];
  const bgColor = useImageBackgroundColor(design.artwork.previewUrl);

  return (
    <div
      className={cn(
        dashboardCardClass,
        "group flex flex-col transition-[border-color,box-shadow] hover:border-[#c9cccf]",
        archived && "opacity-75"
      )}
    >
      <button
        type="button"
        onClick={onOpen}
        className="flex flex-1 flex-col text-left"
      >
        <div
          className="relative flex aspect-[5/4] w-full items-center justify-center overflow-hidden border-b border-[#ebebeb] bg-[#f6f6f7] p-3 transition-colors"
          style={bgColor ? { backgroundColor: bgColor } : undefined}
        >
          <DesignThumb design={design} className="max-h-[230px]" />
          <div className="absolute left-2.5 top-2.5 flex flex-wrap gap-1.5">
            {archived ? (
              <span className="inline-flex items-center gap-1 rounded-md border border-[#e3e3e3] bg-white/90 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#616161] backdrop-blur">
                <Archive className="size-2.5" />
                Archived
              </span>
            ) : null}
            {groupCount > 1 ? (
              <span
                className="inline-flex items-center gap-1 rounded-md border border-[#c4d7f2] bg-[#f4f7fd]/90 px-1.5 py-0.5 text-[10px] font-semibold text-[#2c6ecb] backdrop-blur"
                title={`${groupCount} designs saved from this order`}
              >
                <Layers className="size-2.5" />
                {groupCount} from order
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex flex-1 flex-col gap-1 p-3">
          <p className="truncate text-[14px] font-semibold text-[#303030] group-hover:text-[#2c6ecb]">
            {design.name}
          </p>
          <p className="truncate text-[12px] text-[#616161]">
            {design.company || design.customerName || "Unassigned"} ·{" "}
            {decorationLabel(design.decoration)}
          </p>
          {pms.length > 0 ? (
            <div className="mt-1 flex flex-wrap gap-1">
              {pms.slice(0, 3).map((code) => (
                <span
                  key={code}
                  className="inline-flex items-center rounded-md border border-[#e3e3e3] bg-white px-1.5 py-0.5 font-mono text-[10px] text-[#616161]"
                >
                  {code}
                </span>
              ))}
              {pms.length > 3 ? (
                <span className="inline-flex items-center text-[10px] text-[#8a8a8a]">
                  +{pms.length - 3}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      </button>

      <div className="flex items-center justify-between gap-2 border-t border-[#ebebeb] px-3 py-2">
        {design.sourceOrderNumber ? (
          <Link
            href={`/app/orders/${design.sourceOrderId}`}
            className="truncate text-[12px] font-medium text-[#616161] hover:text-[#2c6ecb] hover:underline"
            onClick={(event) => event.stopPropagation()}
          >
            {design.sourceOrderNumber}
          </Link>
        ) : (
          <span className="text-[12px] text-[#8a8a8a]">Saved design</span>
        )}
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onArchiveToggle();
          }}
          className={cn(
            dashboardControlClass,
            "h-7 shrink-0 gap-1.5 px-2 text-[12px]"
          )}
        >
          {archived ? (
            <>
              <ArchiveRestore className="size-3.5" />
              Restore
            </>
          ) : (
            <>
              <Archive className="size-3.5" />
              Archive
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function DesignDetailDialog({
  design,
  archived,
  siblings,
  open,
  onOpenChange,
  onArchiveToggle,
  onSelectSibling,
  onSaved,
}: {
  design: SavedDesign | null;
  archived: boolean;
  siblings: SavedDesign[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onArchiveToggle: () => void;
  onSelectSibling: (id: string) => void;
  onSaved: (design: SavedDesign) => void;
}) {
  const { getIdToken } = useAuth();
  const { refreshShopData } = useSchedule();

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [tagsText, setTagsText] = useState("");
  const [dimensions, setDimensions] = useState("");
  const [placement, setPlacement] = useState("");
  const [inkTypeDraft, setInkTypeDraft] = useState("");
  const [colorCountDraft, setColorCountDraft] = useState("");
  const [flashCountDraft, setFlashCountDraft] = useState("");
  const [instructions, setInstructions] = useState("");
  const [draftInks, setDraftInks] = useState<ImprintInkColor[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset the editor whenever the open design changes.
  useEffect(() => {
    if (!design) return;
    setEditing(false);
    setError(null);
    setName(design.name);
    setTagsText((design.tags ?? []).join(", "));
    setDimensions(design.notes?.dimensions ?? "");
    setPlacement(design.notes?.placement ?? "");
    setInkTypeDraft(design.notes?.inkType ?? "");
    setColorCountDraft(
      design.notes?.colorCount != null ? String(design.notes.colorCount) : ""
    );
    setFlashCountDraft(
      design.notes?.flashCount != null ? String(design.notes.flashCount) : ""
    );
    setInstructions(design.notes?.instructions ?? "");
    setDraftInks(design.inkColors ?? []);
  }, [design]);

  if (!design) return null;

  const isDtf = design.decoration === "dtf";
  const isScreenPrint = design.decoration === "screen_print";
  const inkColors = (design.inkColors ?? []).filter((color) => !color.isFlash);
  const dimensionsValue = design.notes?.dimensions;
  const placementValue = design.notes?.placement;
  const colorCountValue = design.notes?.colorCount;
  const inkTypeValue = design.notes?.inkType;
  const tags = design.tags ?? [];

  const handleSave = async () => {
    const token = await getIdToken();
    if (!token) {
      setError("You need to be signed in to edit designs.");
      return;
    }

    const nextTags = tagsText
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
    const nextName = name.trim() || design.name;

    const nextNotes: ImprintProductionNotes = {
      ...design.notes,
      dimensions: dimensions.trim() || undefined,
      placement: placement.trim() || undefined,
      instructions: instructions.trim() || undefined,
      inkType: isScreenPrint ? inkTypeDraft || undefined : design.notes?.inkType,
      colorCount: isScreenPrint
        ? colorCountDraft
          ? Number(colorCountDraft)
          : undefined
        : design.notes?.colorCount,
      flashCount: isScreenPrint
        ? flashCountDraft
          ? Number(flashCountDraft)
          : undefined
        : design.notes?.flashCount,
    };

    const changed: string[] = [];
    if (nextName !== design.name) changed.push("name");
    if (nextTags.join("|") !== (design.tags ?? []).join("|"))
      changed.push("tags");
    if (
      JSON.stringify(nextNotes) !== JSON.stringify(design.notes ?? {})
    )
      changed.push("specs");
    if (JSON.stringify(draftInks) !== JSON.stringify(design.inkColors ?? []))
      changed.push("colors");

    if (changed.length === 0) {
      setEditing(false);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const { design: updated } = await apiUpdateDesign(token, {
        designId: design.id,
        patch: {
          name: nextName,
          tags: nextTags,
          notes: nextNotes,
          inkColors: draftInks,
        },
        changeSummary: changed.join(", ") + " updated",
      });
      onSaved(updated);
      setEditing(false);
      // Surface the order-history breadcrumb written server-side.
      void refreshShopData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not save changes. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className={cn(
          "flex h-[min(94vh,820px)] w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] flex-col gap-0 overflow-hidden rounded-lg p-0",
          "sm:h-auto sm:max-h-[90vh] sm:max-w-[min(94vw,58rem)] sm:w-[min(94vw,58rem)]"
        )}
      >
        <DialogHeader className="shrink-0 border-b border-[#ebebeb] bg-[#fafafa] px-5 py-4 sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-3 pr-8">
            <div className="min-w-0">
              <DialogTitle className="truncate text-lg font-semibold text-[#303030]">
                {design.name}
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm text-[#616161]">
                {design.company || design.customerName || "Unassigned"} ·{" "}
                {decorationLabel(design.decoration)} · {design.locationLabel}
              </DialogDescription>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {archived ? (
                <span className="inline-flex items-center gap-1 rounded-md border border-[#e3e3e3] bg-[#f1f1f1] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[#616161]">
                  <Archive className="size-3" />
                  Archived
                </span>
              ) : null}
              {!editing ? (
                <Button
                  type="button"
                  className={cn(dashboardControlClass, "h-8 px-2.5 text-[12px]")}
                  onClick={() => setEditing(true)}
                >
                  <Pencil className="size-3.5" />
                  Edit
                </Button>
              ) : null}
            </div>
          </div>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
          <div className="border-b border-[#ebebeb] bg-[#fafafa] p-4 sm:p-5 lg:border-b-0 lg:border-r">
            <MockupPreview
              entry={{
                job: {
                  id: design.sourceJobId || "library",
                  name: design.locationLabel,
                  imprints: [],
                  tasks: [],
                },
                imprint: {
                  id: design.sourceImprintId || design.id,
                  locationKey: design.locationKey,
                  label: design.locationLabel,
                  decoration: design.decoration,
                  artwork: design.artwork,
                  inkColors: design.inkColors,
                  notes: design.notes,
                },
              }}
              compact
            />

            {siblings.length > 0 ? (
              <div className="mt-4">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#616161]">
                  <Layers className="size-3" />
                  Also from {design.sourceOrderNumber || "this order"}
                </p>
                <div className="mt-2 flex flex-col gap-1.5">
                  {siblings.map((sibling) => (
                    <button
                      key={sibling.id}
                      type="button"
                      onClick={() => onSelectSibling(sibling.id)}
                      className="flex items-center gap-2.5 rounded-lg border border-[#e3e3e3] bg-white px-2.5 py-2 text-left transition-colors hover:border-[#c9cccf] hover:bg-[#f6f6f7]"
                    >
                      <span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-md border border-[#ebebeb] bg-[#f6f6f7]">
                        <DesignThumb design={sibling} className="max-h-7" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium text-[#303030]">
                          {sibling.name}
                        </span>
                        <span className="block truncate text-[11px] text-[#616161]">
                          {sibling.locationLabel} ·{" "}
                          {decorationLabel(sibling.decoration)}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="space-y-5 p-4 sm:p-5">
            {error ? (
              <div className="rounded-lg border border-[#f5b5b5] bg-[#fff1f1] px-3 py-2 text-[13px] text-[#8f1f1f]">
                {error}
              </div>
            ) : null}

            {editing ? (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-[11px] font-medium text-[#8a8a8a]">
                      Design name
                    </Label>
                    <Input
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      className={editFieldClass}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-medium text-[#8a8a8a]">
                      Print size
                    </Label>
                    <Input
                      value={dimensions}
                      onChange={(event) => setDimensions(event.target.value)}
                      placeholder={'3" W × 2.7" T'}
                      className={editFieldClass}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-medium text-[#8a8a8a]">
                      Placement
                    </Label>
                    <Input
                      value={placement}
                      onChange={(event) => setPlacement(event.target.value)}
                      placeholder={'3" below collar'}
                      className={editFieldClass}
                    />
                  </div>

                  {isDtf ? (
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label className="text-[11px] font-medium text-[#8a8a8a]">
                        Print method
                      </Label>
                      <div className={cn(dashboardInsetSurfaceClass, "px-3 py-2")}>
                        <p className="text-sm font-medium text-[#303030]">DTF</p>
                        <p className={cn("mt-0.5", dashboardTaskDetailClass)}>
                          Film transfer — set transfer specs below, not screen
                          ink.
                        </p>
                      </div>
                    </div>
                  ) : isScreenPrint ? (
                    <>
                      <div className="space-y-1.5">
                        <Label className="text-[11px] font-medium text-[#8a8a8a]">
                          Ink type
                        </Label>
                        <Select
                          value={inkTypeDraft}
                          onValueChange={(value) => setInkTypeDraft(value || "")}
                        >
                          <SelectTrigger className={editFieldClass}>
                            <SelectValue placeholder="Select ink" />
                          </SelectTrigger>
                          <SelectContent>
                            {INK_TYPE_OPTIONS.map((option) => (
                              <SelectItem key={option} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-[11px] font-medium text-[#8a8a8a]">
                            Colors
                          </Label>
                          <Input
                            type="number"
                            min={0}
                            value={colorCountDraft}
                            onChange={(event) =>
                              setColorCountDraft(event.target.value)
                            }
                            className={editFieldClass}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[11px] font-medium text-[#8a8a8a]">
                            Flashes
                          </Label>
                          <Input
                            type="number"
                            min={0}
                            value={flashCountDraft}
                            onChange={(event) =>
                              setFlashCountDraft(event.target.value)
                            }
                            className={editFieldClass}
                          />
                        </div>
                      </div>
                    </>
                  ) : null}

                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-[11px] font-medium text-[#8a8a8a]">
                      Proof notes
                    </Label>
                    <Textarea
                      value={instructions}
                      onChange={(event) => setInstructions(event.target.value)}
                      rows={3}
                      placeholder="Notes for the customer proof or production team"
                      className="w-full rounded-lg border-[#e3e3e3] text-sm"
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-[11px] font-medium text-[#8a8a8a]">
                      Tags
                    </Label>
                    <Input
                      value={tagsText}
                      onChange={(event) => setTagsText(event.target.value)}
                      placeholder="e.g. left chest, holiday, reorder"
                      className={editFieldClass}
                    />
                    <p className="text-[11px] text-[#8a8a8a]">
                      Separate tags with commas.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                    {isDtf
                      ? "Transfer specs"
                      : isScreenPrint
                        ? "Ink colors & Pantones"
                        : "Colors & Pantones"}
                  </p>
                  <ImprintInkColorsEditor
                    inkColors={draftInks}
                    decoration={design.decoration}
                    onChange={setDraftInks}
                    inputClassName={editFieldClass}
                    buttonClassName={cn(
                      dashboardControlClass,
                      "h-8 text-[12px]"
                    )}
                  />
                </div>
              </div>
            ) : (
              <>
                {design.sourceOrderNumber ? (
                  <Link
                    href={`/app/orders/${design.sourceOrderId}`}
                    className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#2c6ecb] hover:underline"
                    onClick={() => onOpenChange(false)}
                  >
                    <ExternalLink className="size-3.5" />
                    From order {design.sourceOrderNumber}
                  </Link>
                ) : null}

                <div className="grid gap-2 sm:grid-cols-2">
                  <MetaField
                    label="Decoration"
                    value={decorationLabel(design.decoration)}
                  />
                  <MetaField label="Location" value={design.locationLabel} />
                  {dimensionsValue ? (
                    <MetaField label="Print size" value={dimensionsValue} />
                  ) : null}
                  {placementValue ? (
                    <MetaField label="Placement" value={placementValue} />
                  ) : null}
                  {inkTypeValue ? (
                    <MetaField label="Ink type" value={inkTypeValue} />
                  ) : null}
                  {typeof colorCountValue === "number" ? (
                    <MetaField label="Colors" value={`${colorCountValue}`} />
                  ) : null}
                </div>

                <div className="flex items-center justify-between gap-2 rounded-lg border border-[#e3e3e3] bg-white px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[#303030]">
                      {design.artwork.name}
                    </p>
                    <p className="text-xs text-[#8a8a8a]">
                      v{design.artwork.version} ·{" "}
                      {formatDateTime(design.artwork.uploadedAt)}
                    </p>
                  </div>
                  <ArtworkStatusBadge status={design.artwork.status} />
                </div>

                {inkColors.length > 0 ? (
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-[#616161]">
                      Colors &amp; Pantones
                    </p>
                    <ul className="mt-2 divide-y divide-[#ebebeb] overflow-hidden rounded-lg border border-[#e3e3e3]">
                      {inkColors.map((color) => (
                        <li
                          key={color.id}
                          className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                        >
                          <span className="text-[#303030]">
                            {color.name || "Color"}
                            {color.mesh ? (
                              <span className="ml-2 text-xs text-[#8a8a8a]">
                                {color.mesh} mesh
                              </span>
                            ) : null}
                          </span>
                          <span className="font-mono text-xs text-[#616161]">
                            {color.pmsCode || "—"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {design.notes?.instructions ? (
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-[#616161]">
                      Production notes
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-[#303030]">
                      {design.notes.instructions}
                    </p>
                  </div>
                ) : null}

                {tags.length > 0 ? (
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-[#616161]">
                      Tags
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center rounded-md border border-[#e3e3e3] bg-[#f6f6f7] px-2 py-0.5 text-[11px] font-medium text-[#616161]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-[#ebebeb] bg-[#fafafa] px-4 py-3 sm:px-6">
          <span className="text-[12px] text-[#8a8a8a]">
            Saved {formatDate(design.createdAt)}
            {design.updatedAt && design.updatedAt !== design.createdAt
              ? ` · Updated ${formatDate(design.updatedAt)}`
              : ""}
          </span>
          <div className="flex items-center gap-2">
            {editing ? (
              <>
                <Button
                  type="button"
                  className={cn(dashboardGhostButtonClass, "h-9")}
                  onClick={() => {
                    setEditing(false);
                    setError(null);
                  }}
                  disabled={saving}
                >
                  <X className="size-3.5" />
                  Cancel
                </Button>
                <Button
                  type="button"
                  className={cn(dashboardPrimaryButtonClass, "h-9")}
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? "Saving…" : "Save changes"}
                </Button>
              </>
            ) : (
              <>
                <Button
                  type="button"
                  className={cn(dashboardControlClass, "h-9")}
                  onClick={onArchiveToggle}
                >
                  {archived ? (
                    <>
                      <ArchiveRestore className="size-3.5" />
                      Restore
                    </>
                  ) : (
                    <>
                      <Archive className="size-3.5" />
                      Archive
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  className={cn(dashboardGhostButtonClass, "h-9")}
                  onClick={() => onOpenChange(false)}
                >
                  Close
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function DesignLibraryView() {
  const { getIdToken } = useAuth();
  const [designs, setDesigns] = useState<SavedDesign[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [scope, setScope] = useState<LibraryScope>("active");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { hydrated, archive, restore, isArchived } = useArchivedDesigns();

  const load = useCallback(async () => {
    const token = await getIdToken();
    if (!token) return;
    setLoading(true);
    try {
      const { designs: next } = await listDesigns(token, {
        search: search.trim() || undefined,
      });
      setDesigns(next);
    } finally {
      setLoading(false);
    }
  }, [getIdToken, search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void load();
    }, 200);
    return () => clearTimeout(timer);
  }, [load]);

  const activeCount = useMemo(
    () => designs.filter((design) => !isArchived(design.id)).length,
    [designs, isArchived]
  );
  const archivedCount = designs.length - activeCount;

  const scopedDesigns = useMemo(
    () =>
      designs.filter((design) =>
        scope === "archived" ? isArchived(design.id) : !isArchived(design.id)
      ),
    [designs, scope, isArchived]
  );

  // Count of designs per source order (across the whole library) for grouping.
  const orderGroupCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const design of designs) {
      if (!design.sourceOrderId) continue;
      counts.set(
        design.sourceOrderId,
        (counts.get(design.sourceOrderId) ?? 0) + 1
      );
    }
    return counts;
  }, [designs]);

  const selected = useMemo(
    () => designs.find((design) => design.id === selectedId) ?? null,
    [designs, selectedId]
  );

  const siblings = useMemo(() => {
    if (!selected?.sourceOrderId) return [];
    return designs.filter(
      (design) =>
        design.id !== selected.id &&
        design.sourceOrderId === selected.sourceOrderId
    );
  }, [designs, selected]);

  const toggleArchive = useCallback(
    (id: string) => {
      if (isArchived(id)) restore(id);
      else archive(id);
    },
    [isArchived, archive, restore]
  );

  const handleSaved = useCallback((updated: SavedDesign) => {
    setDesigns((current) =>
      current.map((design) => (design.id === updated.id ? updated : design))
    );
  }, []);

  const showLoading = loading && designs.length === 0 && !search.trim();
  const hasSearch = Boolean(search.trim());

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div
          className={cn(
            "flex w-fit gap-1.5 rounded-lg border border-[#e3e3e3] bg-white p-1",
            dashboardElevatedShadow
          )}
        >
          {(
            [
              { value: "active" as const, label: "Active", count: activeCount },
              {
                value: "archived" as const,
                label: "Archived",
                count: archivedCount,
              },
            ]
          ).map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setScope(option.value)}
              className={cn(
                "rounded-md px-2.5 py-1 text-[12px] font-medium transition-colors",
                scope === option.value
                  ? "bg-[#f4f7fd] text-[#2c6ecb]"
                  : "text-[#616161] hover:text-[#303030]"
              )}
            >
              {option.label}
              <span className="ml-1.5 tabular-nums text-[10px] opacity-70">
                {hydrated ? option.count : ""}
              </span>
            </button>
          ))}
        </div>

        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8a8a8a]" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name, customer, PMS…"
            className={cn(dashboardControlClass, "h-9 w-full pl-9")}
          />
        </div>
      </div>

      {showLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className={cn(dashboardCardClass, "animate-pulse")}
            >
              <div className="aspect-[4/3] w-full border-b border-[#ebebeb] bg-[#f1f1f1]" />
              <div className="space-y-2 p-3">
                <div className="h-3.5 w-3/4 rounded bg-[#f1f1f1]" />
                <div className="h-3 w-1/2 rounded bg-[#f1f1f1]" />
              </div>
            </div>
          ))}
        </div>
      ) : scopedDesigns.length === 0 ? (
        <section className={cn(dashboardCardClass, "px-6 py-14 text-center")}>
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-[#f4f7fd] text-[#2c6ecb]">
            {scope === "archived" ? (
              <Archive className="size-6" />
            ) : (
              <BookMarked className="size-6" />
            )}
          </div>
          <p className="text-sm font-medium text-[#303030]">
            {hasSearch
              ? "No designs match your search"
              : scope === "archived"
                ? "No archived designs"
                : "No saved designs yet"}
          </p>
          <p className={cn("mx-auto mt-2 max-w-md", dashboardTaskDetailClass)}>
            {hasSearch
              ? "Try a different name, customer, or PMS code."
              : scope === "archived"
                ? "Archive a design to tuck it away here without deleting it."
                : "Open an order, go to Design, and save an approved imprint to the library. Next time the same customer orders, apply it in one click."}
          </p>
          {!hasSearch && scope === "active" ? (
            <Button
              className={cn(dashboardControlClass, "mt-4 h-9")}
              nativeButton={false}
              render={<Link href="/app/orders" />}
            >
              View orders
            </Button>
          ) : null}
        </section>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {scopedDesigns.map((design) => (
            <DesignCard
              key={design.id}
              design={design}
              archived={isArchived(design.id)}
              groupCount={
                design.sourceOrderId
                  ? orderGroupCounts.get(design.sourceOrderId) ?? 1
                  : 1
              }
              onOpen={() => setSelectedId(design.id)}
              onArchiveToggle={() => toggleArchive(design.id)}
            />
          ))}
        </div>
      )}

      <DesignDetailDialog
        design={selected}
        archived={selected ? isArchived(selected.id) : false}
        siblings={siblings}
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null);
        }}
        onArchiveToggle={() => {
          if (selected) toggleArchive(selected.id);
        }}
        onSelectSibling={(id) => setSelectedId(id)}
        onSaved={handleSaved}
      />
    </div>
  );
}
