"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Copy,
  ExternalLink,
  History,
  Loader2,
  Shirt,
} from "lucide-react";
import { DesignVersionModal } from "@/components/artwork/design-version-modal";
import { DESIGN_STUDIO_BASE } from "@/components/layout/nav-config";
import { useRegisterUnsavedChanges } from "@/components/layout/staff-unsaved-changes-provider";
import { StandaloneDesignStudio, type DesignArtInsights } from "@/components/design-studio/standalone-design-studio";
import { OrderDesignStudioTab } from "@/components/orders/order-design-studio-tab";
import { useAuth } from "@/components/providers/auth-provider";
import { useSchedule } from "@/components/providers/schedule-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  dashboardCardClass,
  dashboardControlClass,
  dashboardPrimaryButtonClass,
  dashboardSectionTitleClass,
  dashboardTaskDetailClass,
  dashboardTaskTitleClass,
} from "@/lib/dashboard-styles";
import {
  duplicateDesign as apiDuplicateDesign,
  getDesign,
  restoreDesignVersion as apiRestoreDesignVersion,
  updateDesign as apiUpdateDesign,
} from "@/lib/api";
import { upsertDesignStudioCache } from "@/lib/design-studio-cache";
import { parseDesignStudioEntryId } from "@/lib/design-studio-library";
import { decorationLabel, formatDateTime } from "@/lib/format";
import { formatOrderNumberWithLabel } from "@/lib/order-display";
import type {
  DesignVersionSnapshot,
  Order,
  OrderDesignMockup,
  SavedDesign,
} from "@/types";
import { cn } from "@/lib/utils";

function orderHref(orderId: string): string {
  return `/app/orders/${orderId}?tab=design`;
}

function imprintKey(jobId: string, imprintId: string): string {
  return `${jobId}:${imprintId}`;
}

/** Editable design name — drafts stay local until Save/Discard in the header bar. */
function DesignNameEditor({
  designId,
  value,
  onChange,
}: {
  designId: string;
  value: string;
  onChange: (next: string) => void;
}) {
  const [focused, setFocused] = useState(false);
  const hasValue = Boolean(value.trim());

  return (
    <div className="w-full min-w-0 max-w-3xl lg:max-w-4xl">
      <Label htmlFor={`design-name-${designId}`} className="sr-only">
        Design name
      </Label>
      <Input
        id={`design-name-${designId}`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="Design name"
        maxLength={120}
        className={cn(
          "h-11 w-full rounded-lg border bg-transparent px-3.5 text-[20px] font-semibold tracking-tight outline-none transition-colors sm:h-12 sm:text-[22px]",
          "placeholder:font-normal placeholder:text-[#b0b0b0]",
          focused || hasValue
            ? "border-[#d8d8d8] text-[#121a2e]"
            : "border-[#ebebeb] text-[#303030] hover:border-[#d8d8d8]",
          "focus:border-[#c4d7f2] focus:bg-white focus:ring-2 focus:ring-[#2c6ecb]/10"
        )}
      />
      <p className="mt-1 text-[11px] text-[#8a8a8a]">
        Custom name · use Save in the top bar to keep changes
      </p>
    </div>
  );
}

export function DesignStudioWorkspace({ entryId }: { entryId: string }) {
  const router = useRouter();
  const { getIdToken } = useAuth();
  const { orders, updateImprintDesignMockup, createDesignFromImprint } =
    useSchedule();
  const parsed = useMemo(() => parseDesignStudioEntryId(entryId), [entryId]);

  const [design, setDesign] = useState<SavedDesign | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [duplicating, setDuplicating] = useState(false);
  const [versionModal, setVersionModal] = useState<DesignVersionSnapshot | null>(
    null
  );
  const [savingVersion, setSavingVersion] = useState(false);
  const [artInsights, setArtInsights] = useState<DesignArtInsights>(null);
  const [nameDraft, setNameDraft] = useState("");
  const [nameSaving, setNameSaving] = useState(false);
  const nameBaselineRef = useRef("");

  useEffect(() => {
    if (!design) {
      nameBaselineRef.current = "";
      setNameDraft("");
      return;
    }
    const next = design.name || "";
    nameBaselineRef.current = next;
    setNameDraft(next);
  }, [design?.id, design?.name]);

  const nameDirty =
    Boolean(design) &&
    nameDraft.trim() !== (nameBaselineRef.current.trim() || "");

  const saveNameDraft = useCallback(async () => {
    if (!design || !nameDirty) return;
    const trimmed = nameDraft.trim().slice(0, 120);
    if (!trimmed) {
      setNameDraft(nameBaselineRef.current);
      return;
    }
    setNameSaving(true);
    setError(null);
    try {
      const token = await getIdToken();
      if (!token) throw new Error("Not signed in");
      const { design: next } = await apiUpdateDesign(token, {
        designId: design.id,
        patch: { name: trimmed },
        changeSummary: "Renamed design",
        author: "Shop",
      });
      nameBaselineRef.current = next.name || trimmed;
      setNameDraft(next.name || trimmed);
      upsertDesignStudioCache(next);
      setDesign(next);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not save the design name."
      );
    } finally {
      setNameSaving(false);
    }
  }, [design, nameDirty, nameDraft, getIdToken]);

  const discardNameDraft = useCallback(() => {
    setNameDraft(nameBaselineRef.current);
  }, []);

  const findOrder = useCallback(
    (orderId: string) => orders.find((order) => order.id === orderId) ?? null,
    [orders]
  );

  const linkedOrder: Order | null = useMemo(() => {
    if (parsed.kind === "line" && parsed.lineKind === "order" && parsed.orderId) {
      return findOrder(parsed.orderId);
    }
    if (parsed.kind === "order" && parsed.orderId) {
      return findOrder(parsed.orderId);
    }
    if (design?.sourceOrderId) {
      return findOrder(design.sourceOrderId);
    }
    return null;
  }, [parsed, design, findOrder]);

  useRegisterUnsavedChanges(
    design && !linkedOrder && (nameDirty || nameSaving)
      ? {
          dirty: nameDirty,
          saving: nameSaving,
          label: "Unsaved design name",
          onSave: () => saveNameDraft(),
          onDiscard: discardNameDraft,
        }
      : null,
    design ? `design-name-${design.id}` : "design-name"
  );

  const initialImprintKey = useMemo(() => {
    // Opening a whole Design Line starts on the first location; file links pass
    // a specific imprint key.
    if (parsed.kind === "line" && parsed.lineKind === "order") {
      return undefined;
    }
    if (parsed.kind === "order" && parsed.jobId && parsed.imprintId) {
      return imprintKey(parsed.jobId, parsed.imprintId);
    }
    if (design?.sourceJobId && design?.sourceImprintId) {
      return imprintKey(design.sourceJobId, design.sourceImprintId);
    }
    return undefined;
  }, [parsed, design]);

  const loadDesign = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (parsed.kind === "line" && parsed.lineKind === "order" && parsed.orderId) {
        // Line opens the full order studio — no single SavedDesign required.
        const order = findOrder(parsed.orderId);
        if (!order) {
          setError("Order for this design line was not found");
          setDesign(null);
          return;
        }
        setDesign(null);
        return;
      }

      if (parsed.kind === "line" && parsed.lineKind === "solo" && parsed.soloFileId) {
        const token = await getIdToken();
        if (!token) throw new Error("Not signed in");
        // Solo lines are usually a SavedDesign id; order: mockups fall through.
        if (!parsed.soloFileId.startsWith("order:")) {
          const { design: next } = await getDesign(token, parsed.soloFileId);
          setDesign(next);
          return;
        }
        setDesign(null);
        return;
      }

      if (parsed.kind === "design" && parsed.designId) {
        const token = await getIdToken();
        if (!token) throw new Error("Not signed in");
        const { design: next } = await getDesign(token, parsed.designId);
        setDesign(next);
        return;
      }

      // Order-only mockup: try to promote into the library when possible,
      // otherwise show studio from the live order.
      if (parsed.kind === "order" && parsed.orderId && parsed.jobId && parsed.imprintId) {
        const order = findOrder(parsed.orderId);
        const imprint = order?.jobs
          ?.find((job) => job.id === parsed.jobId)
          ?.imprints?.find((row) => row.id === parsed.imprintId);

        if (imprint?.libraryDesignId) {
          const token = await getIdToken();
          if (token) {
            const { design: next } = await getDesign(token, imprint.libraryDesignId);
            setDesign(next);
            return;
          }
        }
        setDesign(null);
        return;
      }

      setError("Design not found");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load design");
      setDesign(null);
    } finally {
      setLoading(false);
    }
  }, [parsed, getIdToken, findOrder]);

  useEffect(() => {
    void loadDesign();
  }, [loadDesign]);

  const previewUrl =
    design?.designMockup?.composedPreviewUrl ||
    linkedOrder?.jobs
      ?.flatMap((job) => job.imprints || [])
      .find(
        (imprint) =>
          imprint.id === (parsed.imprintId || design?.sourceImprintId)
      )?.designMockup?.composedPreviewUrl ||
    design?.artwork?.previewUrl;

  const title =
    (parsed.kind === "line" &&
      linkedOrder &&
      (linkedOrder.customLabel?.trim() ||
        `Order ${linkedOrder.number}`)) ||
    design?.name ||
    linkedOrder?.jobs
      ?.find((job) => job.id === (parsed.jobId || design?.sourceJobId))
      ?.imprints?.find(
        (imprint) => imprint.id === (parsed.imprintId || design?.sourceImprintId)
      )?.label ||
    "Design Studio";

  const handleSaveMockup = useCallback(
    async (
      orderId: string,
      jobId: string,
      imprintId: string,
      designMockup: OrderDesignMockup,
      options?: { attachToProof?: boolean; proofLabel?: string; proofPreviewUrl?: string }
    ) => {
      const updated = await updateImprintDesignMockup(
        orderId,
        jobId,
        imprintId,
        designMockup,
        options
      );

      // Keep the library design in sync and create a versioned snapshot.
      try {
        const token = await getIdToken();
        if (!token) return updated;

        let designId = design?.id;
        if (!designId) {
          const created = await createDesignFromImprint(
            orderId,
            jobId,
            imprintId
          );
          designId = created?.id;
          if (created) {
            setDesign(created);
            upsertDesignStudioCache(created);
          }
        }

        if (designId) {
          const { design: next } = await apiUpdateDesign(token, {
            designId,
            patch: { designMockup },
            changeSummary: "Studio mockup saved",
            author: "Shop",
          });
          setDesign(next);
          upsertDesignStudioCache(next);
        }
      } catch {
        // Order save already succeeded; library sync can retry on next open.
      }

      return updated;
    },
    [
      updateImprintDesignMockup,
      getIdToken,
      design?.id,
      createDesignFromImprint,
    ]
  );

  const handleRestoreVersion = useCallback(
    async (version: DesignVersionSnapshot) => {
      if (!design) return;
      setSavingVersion(true);
      try {
        const token = await getIdToken();
        if (!token) return;
        const { design: next } = await apiRestoreDesignVersion(token, {
          designId: design.id,
          versionId: version.id,
          author: "Shop",
        });
        setDesign(next);
        upsertDesignStudioCache(next);
        setVersionModal(null);
      } finally {
        setSavingVersion(false);
      }
    },
    [design, getIdToken]
  );

  const handleDuplicate = useCallback(async () => {
    if (!design) return;
    setDuplicating(true);
    setError(null);
    try {
      const token = await getIdToken();
      if (!token) throw new Error("Not signed in");
      const { design: copy } = await apiDuplicateDesign(token, {
        designId: design.id,
        author: "Shop",
      });
      upsertDesignStudioCache(copy);
      router.push(`${DESIGN_STUDIO_BASE}/${encodeURIComponent(copy.id)}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not duplicate design"
      );
    } finally {
      setDuplicating(false);
    }
  }, [design, getIdToken, router]);

  useEffect(() => {
    if (linkedOrder) setArtInsights(null);
  }, [linkedOrder]);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 p-16 text-[13px] text-[#616161]">
        <Loader2 className="size-4 animate-spin" />
        Opening design…
      </div>
    );
  }

  if (error && !linkedOrder) {
    return (
      <div className="flex flex-col items-center gap-3 p-16 text-center">
        <p className="text-[14px] font-semibold text-[#303030]">{error}</p>
        <Button
          type="button"
          variant="outline"
          className={cn(dashboardControlClass, "h-9")}
          nativeButton={false}
          render={<Link href={DESIGN_STUDIO_BASE} />}
        >
          Back to Design Studio
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1 lg:pr-6">
          <Link
            href={DESIGN_STUDIO_BASE}
            className="mb-2 inline-flex items-center gap-1.5 text-[12px] font-medium text-[#616161] hover:text-[#2c6ecb]"
          >
            <ArrowLeft className="size-3.5" />
            Design Studio
          </Link>
          {design && !linkedOrder ? (
            <DesignNameEditor
              designId={design.id}
              value={nameDraft}
              onChange={setNameDraft}
            />
          ) : (
            <h1 className={cn(dashboardSectionTitleClass, "truncate")}>
              {title}
            </h1>
          )}
          <p className={cn("mt-1", dashboardTaskDetailClass)}>
            {design?.company || design?.customerName || linkedOrder?.company || "—"}
            {design?.decoration
              ? ` · ${decorationLabel(design.decoration)}`
              : null}
            {design?.locationLabel ? ` · ${design.locationLabel}` : null}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {design && !linkedOrder ? (
            <Button
              type="button"
              variant="outline"
              className={cn(dashboardControlClass, "h-9")}
              disabled={duplicating}
              title="Duplicate this design so you can change the blank color"
              onClick={() => void handleDuplicate()}
            >
              {duplicating ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Copy className="size-3.5" />
              )}
              Duplicate
            </Button>
          ) : null}
          {linkedOrder ? (
            <Button
              type="button"
              variant="outline"
              className={cn(dashboardControlClass, "h-9")}
              nativeButton={false}
              render={<Link href={orderHref(linkedOrder.id)} />}
            >
              <ExternalLink className="size-3.5" />
              Open order{" "}
              {formatOrderNumberWithLabel(
                linkedOrder.number,
                linkedOrder.customLabel
              )}
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-w-0 space-y-4">
          {linkedOrder ? (
            <OrderDesignStudioTab
              order={linkedOrder}
              initialImprintKey={initialImprintKey}
              onSave={handleSaveMockup}
              messages={{
                saved: "Mockup saved — new studio version recorded",
                attached: "Attached to proof and saved to Design Studio",
              }}
            />
          ) : design ? (
            <StandaloneDesignStudio
              key={`${design.id}:${parsed.locationId || "primary"}`}
              design={design}
              onDesignChange={setDesign}
              initialLocationId={parsed.locationId}
              onArtInsightsChange={setArtInsights}
            />
          ) : (
            <section className={cn(dashboardCardClass, "overflow-hidden")}>
              <div className="border-b border-[#ebebeb] px-4 py-3.5 sm:px-5">
                <h2 className={dashboardTaskTitleClass}>Preview</h2>
                <p className={cn("mt-0.5", dashboardTaskDetailClass)}>
                  This design isn&apos;t linked to an active order yet. Apply it
                  to an order to compose on a blank in Design Studio.
                </p>
              </div>
              <div className="flex min-h-[320px] items-center justify-center bg-[#f6f6f7] p-6">
                {previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewUrl}
                    alt={title}
                    className="max-h-[420px] w-full object-contain"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-[#8a8a8a]">
                    <Shirt className="size-8" strokeWidth={1.5} />
                    <p className="text-[13px]">No mockup preview yet</p>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2 border-t border-[#ebebeb] p-4">
                <Button
                  type="button"
                  className={cn(dashboardPrimaryButtonClass, "h-9")}
                  nativeButton={false}
                  render={<Link href="/app/orders" />}
                >
                  Find an order to apply this on
                </Button>
              </div>
            </section>
          )}
        </div>

        <aside className="space-y-4 xl:sticky xl:top-4 xl:self-start">
          <section className={dashboardCardClass}>
            <div className="border-b border-[#ebebeb] px-4 py-3">
              <p className="text-[13px] font-semibold text-[#303030]">Summary</p>
            </div>
            <div className="space-y-2 px-4 py-3 text-[12px] text-[#616161]">
              <p>
                <span className="text-[#8a8a8a]">Updated </span>
                {formatDateTime(
                  design?.updatedAt ||
                    design?.designMockup?.updatedAt ||
                    new Date().toISOString()
                )}
              </p>
              {design?.sourceOrderNumber ? (
                <p>
                  <span className="text-[#8a8a8a]">Source </span>
                  {formatOrderNumberWithLabel(design.sourceOrderNumber)}
                </p>
              ) : null}
              <p>
                <span className="text-[#8a8a8a]">Versions </span>
                {design?.versions?.length ?? 0}
              </p>
            </div>
          </section>

          <section className={dashboardCardClass}>
            <div className="flex items-center gap-2 border-b border-[#ebebeb] px-4 py-3">
              <History className="size-3.5 text-[#8a8a8a]" />
              <p className="text-[13px] font-semibold text-[#303030]">
                Version history
              </p>
            </div>
            {!design || (design.versions?.length ?? 0) === 0 ? (
              <p className={cn("px-4 py-4", dashboardTaskDetailClass)}>
                Save a mockup from the studio to start version history for this
                design.
              </p>
            ) : (
              <ul className="max-h-[280px] divide-y divide-[#ebebeb] overflow-y-auto">
                {design.versions!.map((version) => (
                  <li key={version.id}>
                    <button
                      type="button"
                      onClick={() => setVersionModal(version)}
                      className="flex w-full flex-col gap-0.5 px-4 py-3 text-left transition-colors hover:bg-[#fafafa]"
                    >
                      <span className="text-[13px] font-medium text-[#303030]">
                        {version.label || `Version ${version.version}`}
                      </span>
                      <span className="text-[11px] text-[#8a8a8a]">
                        {formatDateTime(version.createdAt)}
                        {version.createdBy ? ` · ${version.createdBy}` : ""}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className={dashboardCardClass}>
            <div className="border-b border-[#ebebeb] px-4 py-3">
              <p className="text-[13px] font-semibold text-[#303030]">
                Art information
              </p>
              <p className={cn("mt-0.5", dashboardTaskDetailClass)}>
                PMS and insights for the selected artwork
              </p>
            </div>
            {!artInsights ? (
              <p className={cn("px-4 py-4", dashboardTaskDetailClass)}>
                Select or upload artwork to see color and PMS details here.
              </p>
            ) : (
              <div className="space-y-3 px-4 py-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                    Layer
                  </p>
                  <p className="mt-1 truncate text-[13px] font-medium text-[#303030]">
                    {artInsights.layerLabel}
                  </p>
                  <p className="mt-0.5 text-[12px] text-[#616161]">
                    {artInsights.backgroundRemoved
                      ? "Background cleaned"
                      : "Original artwork"}
                  </p>
                </div>

                {artInsights.pmsCodes.length > 0 ? (
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                      PMS selected
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {artInsights.pmsCodes.map((code) => (
                        <span
                          key={code}
                          className="rounded-full border border-[#ebebeb] bg-[#fafafa] px-2 py-1 text-[11px] font-medium text-[#303030]"
                        >
                          PMS {code}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-[12px] text-[#8a8a8a]">
                    No PMS marked yet — open Edit image and select Pantone
                    estimates.
                  </p>
                )}

                {artInsights.colors.length > 0 ? (
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                      Detected colors
                    </p>
                    <div className="mt-1.5 flex flex-col gap-1.5">
                      {artInsights.colors.slice(0, 6).map((color, index) => (
                        <div
                          key={`${color.hex}-${index}`}
                          className="flex items-center gap-2"
                        >
                          <span
                            className="size-4 shrink-0 rounded-full border border-[#d4d4d4]"
                            style={{ backgroundColor: color.hex }}
                          />
                          <span className="min-w-0 flex-1 truncate text-[12px] text-[#303030]">
                            {color.pantoneCode
                              ? `PMS ${color.pantoneCode}`
                              : color.hex}
                          </span>
                          {typeof color.share === "number" ? (
                            <span className="text-[11px] tabular-nums text-[#8a8a8a]">
                              {Math.round(color.share * 100)}%
                            </span>
                          ) : null}
                        </div>
                      ))}
                    </div>
                    <p className="mt-2 text-[11px] leading-snug text-[#8a8a8a]">
                      Digital Pantone matches are estimates — confirm with a
                      physical guide before mixing.
                    </p>
                  </div>
                ) : null}
              </div>
            )}
          </section>
        </aside>
      </div>

      {versionModal && design ? (
        <DesignVersionModal
          design={design}
          version={versionModal}
          open={Boolean(versionModal)}
          onOpenChange={(open) => {
            if (!open) setVersionModal(null);
          }}
          onRestore={async (versionId) => {
            const version = design.versions?.find((row) => row.id === versionId);
            if (version) await handleRestoreVersion(version);
          }}
          restoring={savingVersion}
        />
      ) : null}
    </div>
  );
}
