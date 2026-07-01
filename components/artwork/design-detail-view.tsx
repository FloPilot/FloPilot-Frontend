"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Archive,
  ArchiveRestore,
  ChevronRight,
  ExternalLink,
  History,
  Loader2,
  Pencil,
  X,
} from "lucide-react";
import { DesignActivityFeed } from "@/components/artwork/design-activity-feed";
import { DesignVersionModal } from "@/components/artwork/design-version-modal";
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
  dashboardCardClass,
  dashboardControlClass,
  dashboardElevatedShadow,
  dashboardGhostButtonClass,
  dashboardInsetSurfaceClass,
  dashboardPrimaryButtonClass,
  dashboardSectionTitleClass,
  dashboardTaskDetailClass,
  dashboardTaskTitleClass,
} from "@/lib/dashboard-styles";
import { useArchivedDesigns } from "@/lib/design-archive";
import { useImageBackgroundColor } from "@/lib/use-image-background-color";
import { INK_TYPE_OPTIONS } from "@/lib/imprint-design";
import {
  getDesign,
  listDesigns,
  restoreDesignVersion as apiRestoreDesignVersion,
  updateDesign as apiUpdateDesign,
} from "@/lib/api";
import { decorationLabel, formatDate, formatDateTime } from "@/lib/format";
import type {
  DesignVersionSnapshot,
  ImprintInkColor,
  ImprintProductionNotes,
  SavedDesign,
} from "@/types";
import { cn } from "@/lib/utils";

type DesignDetailTab = "overview" | "activity" | "versions";

const editFieldClass = cn(
  dashboardControlClass,
  "h-9 w-full justify-start px-3 text-[13px] shadow-none"
);

const TABS: { id: DesignDetailTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "activity", label: "Activity" },
  { id: "versions", label: "Versions" },
];

function DesignSpecsContent({
  design,
  inkColors,
}: {
  design: SavedDesign;
  inkColors: ImprintInkColor[];
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-2">
        <MetaField
          label="Decoration"
          value={decorationLabel(design.decoration)}
        />
        <MetaField label="Location" value={design.locationLabel} />
        {design.notes?.dimensions ? (
          <MetaField label="Print size" value={design.notes.dimensions} />
        ) : null}
        {design.notes?.placement ? (
          <MetaField label="Placement" value={design.notes.placement} />
        ) : null}
        {design.notes?.inkType ? (
          <MetaField label="Ink type" value={design.notes.inkType} />
        ) : null}
        {typeof design.notes?.colorCount === "number" ? (
          <MetaField label="Color count" value={`${design.notes.colorCount}`} />
        ) : null}
      </div>

      {inkColors.length > 0 ? (
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
            Colors &amp; Pantones
          </p>
          <ul
            className={cn(
              dashboardInsetSurfaceClass,
              "divide-y divide-[#ebebeb] overflow-hidden"
            )}
          >
            {inkColors.map((color) => (
              <InkColorRow
                key={color.id}
                name={color.name}
                pmsCode={color.pmsCode}
                mesh={color.mesh}
              />
            ))}
          </ul>
        </div>
      ) : null}

      {design.notes?.instructions ? (
        <div className={cn(dashboardInsetSurfaceClass, "px-3 py-3")}>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
            Production notes
          </p>
          <p className="mt-1.5 text-[13px] leading-relaxed text-[#303030]">
            {design.notes.instructions}
          </p>
        </div>
      ) : null}

      {(design.tags ?? []).length > 0 ? (
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
            Tags
          </p>
          <div className="flex flex-wrap gap-1.5">
            {(design.tags ?? []).map((tag) => (
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

      <p className="text-[12px] text-[#8a8a8a]">
        Saved {formatDate(design.createdAt)}
        {design.updatedAt && design.updatedAt !== design.createdAt
          ? ` · Updated ${formatDate(design.updatedAt)}`
          : ""}
      </p>
    </div>
  );
}

function DesignDetailSidebar({
  design,
  inkColors,
  archived,
  onEdit,
  onArchiveToggle,
}: {
  design: SavedDesign;
  inkColors: ImprintInkColor[];
  archived: boolean;
  onEdit: () => void;
  onArchiveToggle: () => void;
}) {
  return (
    <aside className="space-y-4">
      <section className={cn(dashboardCardClass, "overflow-visible")}>
        <div className="border-b border-[#ebebeb] px-4 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
            Proof status
          </p>
          <div className="mt-2">
            <ArtworkStatusBadge status={design.artwork.status} />
          </div>
        </div>
        <div className="space-y-3 px-4 py-4">
          {design.sourceOrderNumber ? (
            <Button
              className={cn(dashboardControlClass, "h-9 w-full justify-center gap-1.5")}
              nativeButton={false}
              render={
                <Link href={`/app/orders/${design.sourceOrderId}`} />
              }
            >
              <ExternalLink className="size-3.5" />
              View order {design.sourceOrderNumber}
            </Button>
          ) : null}
          <Button
            type="button"
            className={cn(dashboardControlClass, "h-9 w-full justify-center gap-1.5")}
            onClick={onEdit}
          >
            <Pencil className="size-3.5" />
            Edit design
          </Button>
          <Button
            type="button"
            className={cn(dashboardControlClass, "h-9 w-full justify-center gap-1.5")}
            onClick={onArchiveToggle}
          >
            {archived ? (
              <>
                <ArchiveRestore className="size-3.5" />
                Restore design
              </>
            ) : (
              <>
                <Archive className="size-3.5" />
                Archive design
              </>
            )}
          </Button>
        </div>
      </section>

      <section className={dashboardCardClass}>
        <div className="border-b border-[#ebebeb] px-4 py-3.5 sm:px-5">
          <h2 className={dashboardTaskTitleClass}>Specifications</h2>
          <p className={cn("mt-0.5", dashboardTaskDetailClass)}>
            v{design.artwork.version} · {formatDateTime(design.artwork.uploadedAt)}
          </p>
        </div>
        <div className="p-4 sm:p-5">
          <DesignSpecsContent design={design} inkColors={inkColors} />
        </div>
      </section>
    </aside>
  );
}

function DesignPanel({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={dashboardCardClass}>
      <div className="border-b border-[#ebebeb] px-4 py-3.5 sm:px-5">
        <h2 className={dashboardTaskTitleClass}>{title}</h2>
        {description ? (
          <p className={cn("mt-0.5", dashboardTaskDetailClass)}>{description}</p>
        ) : null}
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
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
    <div className={cn(dashboardInsetSurfaceClass, "px-3 py-2.5")}>
      <p className="text-[11px] font-medium uppercase tracking-wide text-[#8a8a8a]">
        {label}
      </p>
      <p className="mt-1 text-[13px] font-semibold text-[#303030]">{value}</p>
    </div>
  );
}

function InkColorRow({
  name,
  pmsCode,
  mesh,
}: {
  name: string;
  pmsCode?: string;
  mesh?: number;
}) {
  return (
    <li className="flex items-center justify-between gap-3 px-3 py-2.5">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-md border border-[#e3e3e3] bg-[#f6f6f7] text-[10px] font-bold uppercase text-[#616161]">
          {(name || "C").slice(0, 1)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-[13px] font-medium text-[#303030]">
            {name || "Color"}
          </p>
          {mesh ? (
            <p className="text-[11px] text-[#8a8a8a]">{mesh} mesh</p>
          ) : null}
        </div>
      </div>
      <span className="shrink-0 rounded-md border border-[#e3e3e3] bg-white px-2 py-0.5 font-mono text-[11px] font-medium text-[#616161]">
        {pmsCode || "—"}
      </span>
    </li>
  );
}

function DesignThumb({
  design,
  className,
}: {
  design: Pick<SavedDesign, "artwork" | "name" | "decoration">;
  className?: string;
}) {
  const previewUrl = design.artwork.previewUrl;
  if (previewUrl) {
    return (
      <img
        src={previewUrl}
        alt={design.name}
        crossOrigin="anonymous"
        className={cn("h-full w-full object-contain", className)}
      />
    );
  }
  return (
    <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
      {decorationLabel(design.decoration)}
    </div>
  );
}

function VersionRow({
  label,
  sublabel,
  previewUrl,
  active,
  onClick,
}: {
  label: string;
  sublabel: string;
  previewUrl?: string;
  active?: boolean;
  onClick?: () => void;
}) {
  const bgColor = useImageBackgroundColor(previewUrl);
  const Wrapper = onClick ? "button" : "div";
  return (
    <Wrapper
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg border px-3 py-3 text-left transition-[border-color,box-shadow,background-color]",
        active
          ? "border-[#c4d7f2] bg-[#f4f7fd] shadow-[inset_0_0_0_1px_rgba(44,110,203,0.08)]"
          : "border-[#e3e3e3] bg-white hover:border-[#c9cccf] hover:bg-[#fafafa]",
        onClick && dashboardElevatedShadow
      )}
    >
      <span
        className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md border border-[#ebebeb] bg-[#f6f6f7]"
        style={bgColor ? { backgroundColor: bgColor } : undefined}
      >
        {previewUrl ? (
          <img
            src={previewUrl}
            alt=""
            crossOrigin="anonymous"
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <History className="size-4 text-[#8a8a8a]" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-[13px] font-medium text-[#303030]">
            {label}
          </span>
          {active ? (
            <span className="shrink-0 rounded-md bg-[#e8f5ee] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#0d5c2e]">
              Active
            </span>
          ) : null}
        </span>
        <span className="block truncate text-[11px] text-[#616161]">
          {sublabel}
        </span>
      </span>
      {!active && onClick ? (
        <ChevronRight className="size-4 shrink-0 text-[#8a8a8a]" />
      ) : null}
    </Wrapper>
  );
}

export function DesignDetailView({ designId }: { designId: string }) {
  const router = useRouter();
  const { getIdToken } = useAuth();
  const { refreshShopData } = useSchedule();
  const { archive, restore, isArchived } = useArchivedDesigns();

  const [design, setDesign] = useState<SavedDesign | null>(null);
  const [siblings, setSiblings] = useState<SavedDesign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<DesignDetailTab>("overview");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [selectedVersion, setSelectedVersion] =
    useState<DesignVersionSnapshot | null>(null);
  const [versionModalOpen, setVersionModalOpen] = useState(false);

  const [name, setName] = useState("");
  const [tagsText, setTagsText] = useState("");
  const [dimensions, setDimensions] = useState("");
  const [placement, setPlacement] = useState("");
  const [inkTypeDraft, setInkTypeDraft] = useState("");
  const [colorCountDraft, setColorCountDraft] = useState("");
  const [flashCountDraft, setFlashCountDraft] = useState("");
  const [instructions, setInstructions] = useState("");
  const [draftInks, setDraftInks] = useState<ImprintInkColor[]>([]);

  const load = useCallback(async () => {
    const token = await getIdToken();
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const { design: next } = await getDesign(token, designId);
      setDesign(next);
      if (next.sourceOrderId) {
        const { designs } = await listDesigns(token);
        setSiblings(
          designs.filter(
            (entry) =>
              entry.id !== next.id && entry.sourceOrderId === next.sourceOrderId
          )
        );
      } else {
        setSiblings([]);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load this design."
      );
    } finally {
      setLoading(false);
    }
  }, [designId, getIdToken]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!design) return;
    setEditing(false);
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

  const archived = design ? isArchived(design.id) : false;
  const activity = design?.activity ?? [];
  const versions = design?.versions ?? [];

  const handleSave = async () => {
    if (!design) return;
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
    const isScreenPrint = design.decoration === "screen_print";

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
    if (JSON.stringify(nextNotes) !== JSON.stringify(design.notes ?? {}))
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
      setDesign(updated);
      setEditing(false);
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

  const handleRestoreVersion = async (versionId: string) => {
    if (!design) return;
    const token = await getIdToken();
    if (!token) return;
    setRestoring(true);
    setError(null);
    try {
      const { design: updated } = await apiRestoreDesignVersion(token, {
        designId: design.id,
        versionId,
      });
      setDesign(updated);
      setTab("overview");
      void refreshShopData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not restore that version."
      );
    } finally {
      setRestoring(false);
    }
  };

  const openVersion = (version: DesignVersionSnapshot) => {
    setSelectedVersion(version);
    setVersionModalOpen(true);
  };

  const inkColors = useMemo(
    () => (design?.inkColors ?? []).filter((color) => !color.isFlash),
    [design?.inkColors]
  );

  if (loading) {
    return (
      <main className="flex flex-1 items-center justify-center p-8">
        <Loader2 className="size-6 animate-spin text-[#8a8a8a]" />
      </main>
    );
  }

  if (!design) {
    return (
      <main className="flex w-full flex-1 flex-col gap-5 p-4 sm:p-6 lg:p-8">
        <div className={cn(dashboardCardClass, "px-6 py-14 text-center")}>
          <p className="text-sm font-medium text-[#303030]">Design not found</p>
          <p className={cn("mt-2", dashboardTaskDetailClass)}>{error}</p>
          <Button
            className={cn(dashboardControlClass, "mt-4 h-9")}
            nativeButton={false}
            render={<Link href="/app/artwork" />}
          >
            Back to design library
          </Button>
        </div>
      </main>
    );
  }

  const isDtf = design.decoration === "dtf";
  const isScreenPrint = design.decoration === "screen_print";
  const subtitleParts = [
    design.company || design.customerName || "Unassigned",
    decorationLabel(design.decoration),
    design.locationLabel,
  ];

  return (
    <main className="flex w-full flex-1 flex-col gap-5 p-4 sm:p-6 lg:p-8">
      <header className="space-y-4">
        <nav
          aria-label="Breadcrumb"
          className="flex flex-wrap items-center gap-1.5 text-[13px]"
        >
          <Link
            href="/app/artwork"
            className="rounded-md px-1 py-0.5 text-[#616161] transition-colors hover:bg-[#f6f6f7] hover:text-[#303030]"
          >
            Design library
          </Link>
          <span className="text-[#c9c9c9]" aria-hidden>
            /
          </span>
          <span className="px-1 font-medium text-[#303030]">{design.name}</span>
        </nav>

        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className={dashboardSectionTitleClass}>{design.name}</h1>
            {archived ? (
              <span className="inline-flex items-center gap-1 rounded-md border border-[#e3e3e3] bg-[#f1f1f1] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[#616161]">
                <Archive className="size-3" />
                Archived
              </span>
            ) : null}
          </div>
          <p className={dashboardTaskDetailClass}>
            {subtitleParts.join(" · ")}
            {design.sourceOrderNumber ? (
              <>
                {" · "}
                <Link
                  href={`/app/orders/${design.sourceOrderId}`}
                  className="font-medium text-[#2c6ecb] hover:underline"
                >
                  {design.sourceOrderNumber}
                </Link>
              </>
            ) : null}
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5 border-b border-[#ebebeb] pb-3">
          {TABS.map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => setTab(entry.id)}
              className={cn(
                dashboardControlClass,
                "h-9 px-3 text-[13px]",
                tab === entry.id &&
                  "border-[#2c6ecb]/40 bg-[#f4f7fd] text-[#2c6ecb]"
              )}
            >
              {entry.label}
              {entry.id === "activity" && activity.length > 0 ? (
                <span className="ml-1 tabular-nums text-[11px] opacity-70">
                  ({activity.length})
                </span>
              ) : null}
              {entry.id === "versions" && versions.length > 0 ? (
                <span className="ml-1 tabular-nums text-[11px] opacity-70">
                  ({versions.length})
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </header>

      {error ? (
        <div className="rounded-lg border border-[#f5b5b5] bg-[#fff1f1] px-3.5 py-2.5 text-[13px] text-[#8f1f1f]">
          {error}
        </div>
      ) : null}

      <div
        className={cn(
          "grid gap-5",
          editing ? undefined : "xl:grid-cols-[minmax(0,1fr)_300px] xl:items-start"
        )}
      >
        <div className="min-w-0 space-y-5">
          {tab === "overview" && editing ? (
            <section className={dashboardCardClass}>
              <div className="border-b border-[#ebebeb] px-4 py-3.5 sm:px-5">
                <h2 className={dashboardTaskTitleClass}>Edit design</h2>
                <p className={cn("mt-0.5", dashboardTaskDetailClass)}>
                  Changes sync to linked active orders.
                </p>
              </div>
              <div className="space-y-4 p-4 sm:p-5">
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
                    buttonClassName={cn(dashboardControlClass, "h-8 text-[12px]")}
                  />
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-[#ebebeb] pt-4">
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
                </div>
              </div>
            </section>
          ) : null}

          {tab === "overview" && !editing ? (
            <>
              <section className={cn(dashboardCardClass, "overflow-hidden")}>
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
                />
              </section>

              {siblings.length > 0 ? (
                <section className={dashboardCardClass}>
                  <div className="border-b border-[#ebebeb] px-4 py-3.5 sm:px-5">
                    <h2 className={dashboardTaskTitleClass}>
                      Also from {design.sourceOrderNumber || "this order"}
                    </h2>
                    <p className={cn("mt-0.5", dashboardTaskDetailClass)}>
                      Other decoration spots saved from the same order.
                    </p>
                  </div>
                  <div className="grid gap-2 p-4 sm:grid-cols-2 sm:p-5">
                    {siblings.map((sibling) => (
                      <button
                        key={sibling.id}
                        type="button"
                        onClick={() => router.push(`/app/designs/${sibling.id}`)}
                        className={cn(
                          dashboardInsetSurfaceClass,
                          "flex items-center gap-2.5 px-2.5 py-2.5 text-left transition-colors hover:border-[#c9cccf] hover:bg-[#f6f6f7]"
                        )}
                      >
                        <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md border border-[#ebebeb] bg-[#f6f6f7]">
                          <DesignThumb design={sibling} className="max-h-9" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-medium text-[#303030]">
                            {sibling.name}
                          </span>
                          <span className="block truncate text-[11px] text-[#616161]">
                            {sibling.locationLabel}
                          </span>
                        </span>
                        <ChevronRight className="size-3.5 shrink-0 text-[#8a8a8a]" />
                      </button>
                    ))}
                  </div>
                </section>
              ) : null}
            </>
          ) : null}

          {tab === "activity" ? (
            <DesignPanel
              title="Activity"
              description="Ink, spec, and artwork changes tracked automatically."
            >
              <DesignActivityFeed activity={activity} />
            </DesignPanel>
          ) : null}

          {tab === "versions" ? (
            <DesignPanel
              title="Version history"
              description="Browse past variations and set any version as active."
            >
              <div className="space-y-3">
                <VersionRow
                  label={`Current · v${design.artwork.version}`}
                  sublabel={`${design.artwork.name} · ${formatDateTime(design.artwork.uploadedAt)}`}
                  previewUrl={design.artwork.previewUrl}
                  active
                />

                {versions.length === 0 ? (
                  <p className="py-8 text-center text-sm text-[#8a8a8a]">
                    No previous versions yet. Upload new artwork or edit specs on
                    an order to start building history.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {versions.map((version) => (
                      <VersionRow
                        key={version.id}
                        label={version.label || `Version ${version.version}`}
                        sublabel={`${formatDateTime(version.createdAt)}${
                          version.createdBy ? ` · ${version.createdBy}` : ""
                        }`}
                        previewUrl={version.snapshot.artwork?.previewUrl}
                        onClick={() => openVersion(version)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </DesignPanel>
          ) : null}
        </div>

        {!editing ? (
          <DesignDetailSidebar
            design={design}
            inkColors={inkColors}
            archived={archived}
            onEdit={() => setEditing(true)}
            onArchiveToggle={() => {
              if (archived) restore(design.id);
              else archive(design.id);
            }}
          />
        ) : null}
      </div>

      <DesignVersionModal
        design={design}
        version={selectedVersion}
        open={versionModalOpen}
        onOpenChange={setVersionModalOpen}
        onRestore={handleRestoreVersion}
        restoring={restoring}
      />
    </main>
  );
}
