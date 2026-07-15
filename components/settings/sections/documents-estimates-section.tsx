"use client";

import { useState } from "react";
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
  Check,
  Eye,
  GripVertical,
  Lock,
  Plus,
  RotateCcw,
  X,
} from "lucide-react";
import { EstimateDocumentPreview } from "@/components/settings/estimate-document-preview";
import {
  AdminLockNotice,
  SaveButton,
  SettingsError,
  SettingsHeader,
  SettingsPanel,
  useSectionDraft,
} from "@/components/settings/settings-kit";
import { useShopSettings } from "@/components/providers/shop-settings-provider";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  ESTIMATE_DOCUMENT_TEMPLATES,
  ESTIMATE_HEADER_STYLE_DEFS,
  applyEstimateDocumentTemplate,
  getEstimateDocumentBlockDef,
  getEstimateLineItemSectionDef,
  isBlockAbsorbedByHeader,
  missingEstimateDocumentBlocks,
  missingEstimateLineItemSections,
  normalizeEstimateDocument,
  type EstimateDocumentBlockId,
  type EstimateDocumentSettings,
  type EstimateHeaderStyle,
  type EstimateLineItemSectionId,
} from "@/lib/estimate-document";
import {
  dashboardControlClass,
  dashboardGhostButtonClass,
  dashboardInsetSurfaceClass,
  dashboardTaskDetailClass,
} from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";

function SortableRow({
  id,
  label,
  description,
  locked,
  disabled,
  onRemove,
}: {
  id: string;
  label: string;
  description: string;
  locked?: boolean;
  disabled?: boolean;
  onRemove?: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: Boolean(disabled || locked) });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(
        dashboardInsetSurfaceClass,
        "flex items-start gap-2.5 bg-white px-3.5 py-3",
        isDragging && "z-10 shadow-md"
      )}
    >
      <button
        type="button"
        className={cn(
          "mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-md text-[#8a8a8a]",
          locked || disabled
            ? "cursor-default opacity-40"
            : "cursor-grab hover:bg-[#f1f1f1] hover:text-[#303030] active:cursor-grabbing"
        )}
        aria-label={`Drag ${label}`}
        disabled={locked || disabled}
        {...attributes}
        {...listeners}
      >
        {locked ? (
          <Lock className="size-3.5" />
        ) : (
          <GripVertical className="size-3.5" />
        )}
      </button>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-[#303030]">{label}</p>
        <p className={cn("mt-0.5", dashboardTaskDetailClass)}>{description}</p>
      </div>
      {onRemove && !locked ? (
        <button
          type="button"
          onClick={onRemove}
          disabled={disabled}
          className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-[#8a8a8a] hover:bg-[#fff1f1] hover:text-[#b42318] disabled:opacity-40"
          aria-label={`Remove ${label}`}
        >
          <X className="size-3.5" />
        </button>
      ) : null}
    </div>
  );
}

function scrubAbsorbedBlocks(
  blocks: EstimateDocumentBlockId[],
  headerStyle: EstimateHeaderStyle
): EstimateDocumentBlockId[] {
  return blocks.filter(
    (blockId) => !isBlockAbsorbedByHeader(blockId, headerStyle)
  );
}

export function DocumentsEstimatesSection() {
  const { settings, isAdmin, updateSettings } = useShopSettings();
  const { draft, setDraft, dirty } = useSectionDraft<EstimateDocumentSettings>(
    normalizeEstimateDocument(settings.estimateDocument)
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const missingBlocks = missingEstimateDocumentBlocks(
    draft.blocks,
    draft.headerStyle
  );
  const missingLineSections = missingEstimateLineItemSections(
    draft.lineItemSections
  );
  const visibleBlocks = draft.blocks.filter(
    (blockId) => !isBlockAbsorbedByHeader(blockId, draft.headerStyle)
  );

  const address = settings.companyProfile?.address;
  const addressLines = [
    address?.line1,
    address?.line2,
    [address?.city, address?.state, address?.postalCode]
      .filter(Boolean)
      .join(", "),
    address?.country,
  ].filter(Boolean) as string[];

  const updateDraft = (patch: Partial<EstimateDocumentSettings>) => {
    const next = normalizeEstimateDocument({ ...draft, ...patch });
    if (patch.headerStyle && patch.headerStyle !== draft.headerStyle) {
      next.blocks = scrubAbsorbedBlocks(next.blocks, next.headerStyle);
      next.templateId = "custom";
    } else if (
      patch.blocks ||
      patch.lineItemSections ||
      patch.termsText !== undefined ||
      patch.showPaidBalance !== undefined
    ) {
      next.templateId = "custom";
    }
    setDraft(next);
  };

  const applyTemplate = (templateId: string) => {
    if (!isAdmin) return;
    setDraft(applyEstimateDocumentTemplate(templateId));
  };

  const handleBlockDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = draft.blocks.indexOf(active.id as EstimateDocumentBlockId);
    const newIndex = draft.blocks.indexOf(over.id as EstimateDocumentBlockId);
    if (oldIndex < 0 || newIndex < 0) return;
    if (active.id === "header" || over.id === "header") return;
    updateDraft({ blocks: arrayMove(draft.blocks, oldIndex, newIndex) });
  };

  const handleLineDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = draft.lineItemSections.indexOf(
      active.id as EstimateLineItemSectionId
    );
    const newIndex = draft.lineItemSections.indexOf(
      over.id as EstimateLineItemSectionId
    );
    if (oldIndex < 0 || newIndex < 0) return;
    updateDraft({
      lineItemSections: arrayMove(draft.lineItemSections, oldIndex, newIndex),
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await updateSettings({
        estimateDocument: normalizeEstimateDocument(draft),
      });
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not save estimate layout"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-7xl space-y-8 p-4 sm:p-6 lg:p-8">
      <SettingsHeader
        title="Estimate documents"
        description="Start from a proven layout, then fine-tune header composition, sections, and terms. Changes apply to every estimate PDF your shop sends."
      >
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            className={cn(dashboardGhostButtonClass, "h-9")}
            disabled={!isAdmin || saving}
            onClick={() => applyTemplate("classic")}
          >
            <RotateCcw className="size-3.5" />
            Reset classic
          </Button>
          <SaveButton
            dirty={dirty}
            saving={saving}
            saved={saved}
            disabled={!isAdmin}
            onSave={() => void handleSave()}
          />
        </div>
      </SettingsHeader>

      {!isAdmin && <AdminLockNotice />}
      {error && <SettingsError message={error} />}

      <SettingsPanel
        title="Start from a template"
        description="Layouts inspired by common professional estimates — branded headers, from/to columns, and print-shop detail."
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {ESTIMATE_DOCUMENT_TEMPLATES.map((template) => {
            const selected = draft.templateId === template.id;
            return (
              <button
                key={template.id}
                type="button"
                disabled={!isAdmin}
                onClick={() => applyTemplate(template.id)}
                className={cn(
                  "rounded-xl border px-4 py-4 text-left transition-colors",
                  selected
                    ? "border-brand-primary/30 bg-[#eef1ff]"
                    : "border-[#e3e3e3] bg-white hover:border-[#c9cccf] hover:bg-[#fafafa]",
                  !isAdmin && "opacity-60"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[14px] font-semibold text-[#303030]">
                    {template.name}
                  </p>
                  {selected ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-primary">
                      <Check className="size-3" />
                      Active
                    </span>
                  ) : null}
                </div>
                <p className={cn("mt-1.5", dashboardTaskDetailClass)}>
                  {template.description}
                </p>
              </button>
            );
          })}
        </div>
        {draft.templateId === "custom" ? (
          <p className={cn("mt-3", dashboardTaskDetailClass)}>
            You&apos;re on a custom layout. Pick a template above anytime to
            start fresh, or keep editing below.
          </p>
        ) : null}
      </SettingsPanel>

      <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(380px,0.95fr)]">
        <div className="space-y-6">
          <SettingsPanel
            title="Header composition"
            description="Control where company information lives — under the logo, beside the estimate number, or in side-by-side From / To columns."
          >
            <div className="grid gap-2 sm:grid-cols-2">
              {ESTIMATE_HEADER_STYLE_DEFS.map((style) => {
                const selected = draft.headerStyle === style.id;
                return (
                  <button
                    key={style.id}
                    type="button"
                    disabled={!isAdmin}
                    onClick={() => updateDraft({ headerStyle: style.id })}
                    className={cn(
                      "rounded-xl border px-3.5 py-3 text-left transition-colors",
                      selected
                        ? "border-brand-primary/30 bg-[#eef1ff]"
                        : "border-[#e3e3e3] bg-white hover:bg-[#fafafa]",
                      !isAdmin && "opacity-60"
                    )}
                  >
                    <p className="text-[13px] font-semibold text-[#303030]">
                      {style.label}
                    </p>
                    <p className={cn("mt-0.5", dashboardTaskDetailClass)}>
                      {style.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </SettingsPanel>

          <SettingsPanel
            title="Document sections"
            description="Drag to reorder what appears after the header. Sections already included in the header style are omitted automatically."
          >
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              modifiers={[restrictToVerticalAxis]}
              onDragEnd={handleBlockDragEnd}
            >
              <SortableContext
                items={visibleBlocks}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2.5">
                  {visibleBlocks.map((blockId) => {
                    const def = getEstimateDocumentBlockDef(blockId);
                    if (!def) return null;
                    return (
                      <SortableRow
                        key={blockId}
                        id={blockId}
                        label={def.label}
                        description={def.description}
                        locked={!def.removable || blockId === "header"}
                        disabled={!isAdmin}
                        onRemove={
                          def.removable
                            ? () =>
                                updateDraft({
                                  blocks: draft.blocks.filter(
                                    (id) => id !== blockId
                                  ),
                                })
                            : undefined
                        }
                      />
                    );
                  })}
                </div>
              </SortableContext>
            </DndContext>

            {missingBlocks.length > 0 ? (
              <div className="mt-5 space-y-2 border-t border-[#ebebeb] pt-5">
                <p className="text-[12px] font-medium text-[#616161]">
                  Add section
                </p>
                <div className="flex flex-wrap gap-2">
                  {missingBlocks.map((block) => (
                    <button
                      key={block.id}
                      type="button"
                      disabled={!isAdmin}
                      onClick={() =>
                        updateDraft({
                          blocks: [...draft.blocks, block.id],
                        })
                      }
                      className={cn(
                        dashboardControlClass,
                        "h-8 border-dashed px-2.5 text-[12px] disabled:opacity-50"
                      )}
                    >
                      <Plus className="size-3" />
                      {block.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </SettingsPanel>

          <SettingsPanel
            title="Line item groups"
            description="Choose which pricing groups appear in the table, and in what order."
          >
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              modifiers={[restrictToVerticalAxis]}
              onDragEnd={handleLineDragEnd}
            >
              <SortableContext
                items={draft.lineItemSections}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2.5">
                  {draft.lineItemSections.map((sectionId) => {
                    const def = getEstimateLineItemSectionDef(sectionId);
                    if (!def) return null;
                    return (
                      <SortableRow
                        key={sectionId}
                        id={sectionId}
                        label={def.label}
                        description={def.description}
                        disabled={!isAdmin}
                        onRemove={
                          draft.lineItemSections.length > 1
                            ? () =>
                                updateDraft({
                                  lineItemSections:
                                    draft.lineItemSections.filter(
                                      (id) => id !== sectionId
                                    ),
                                })
                            : undefined
                        }
                      />
                    );
                  })}
                </div>
              </SortableContext>
            </DndContext>

            {missingLineSections.length > 0 ? (
              <div className="mt-5 space-y-2 border-t border-[#ebebeb] pt-5">
                <p className="text-[12px] font-medium text-[#616161]">
                  Add group
                </p>
                <div className="flex flex-wrap gap-2">
                  {missingLineSections.map((section) => (
                    <button
                      key={section.id}
                      type="button"
                      disabled={!isAdmin}
                      onClick={() =>
                        updateDraft({
                          lineItemSections: [
                            ...draft.lineItemSections,
                            section.id,
                          ],
                        })
                      }
                      className={cn(
                        dashboardControlClass,
                        "h-8 border-dashed px-2.5 text-[12px] disabled:opacity-50"
                      )}
                    >
                      <Plus className="size-3" />
                      {section.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </SettingsPanel>

          <SettingsPanel
            title="Terms & payment"
            description="Footer copy on every estimate PDF. Logo and brand color still come from Appearance."
          >
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="estimate-terms" className="text-[#303030]">
                  Terms & notes
                </Label>
                <textarea
                  id="estimate-terms"
                  value={draft.termsText}
                  disabled={!isAdmin}
                  onChange={(event) =>
                    updateDraft({ termsText: event.target.value })
                  }
                  rows={5}
                  className={cn(
                    dashboardControlClass,
                    "h-auto min-h-[112px] w-full resize-y px-3 py-2.5 font-normal leading-relaxed disabled:opacity-60"
                  )}
                  placeholder="Pricing validity, payment terms, revision policy…"
                />
                <p className={dashboardTaskDetailClass}>
                  If the customer has a portal link, that link is included above
                  your terms automatically.
                </p>
              </div>

              <label
                className={cn(
                  dashboardInsetSurfaceClass,
                  "flex cursor-pointer items-start gap-3 bg-[#fafafa] p-3.5",
                  !isAdmin && "cursor-default opacity-70"
                )}
              >
                <input
                  type="checkbox"
                  checked={draft.showPaidBalance}
                  disabled={!isAdmin}
                  onChange={(event) =>
                    updateDraft({ showPaidBalance: event.target.checked })
                  }
                  className="mt-0.5 size-4 rounded border-[#c9cccf]"
                />
                <span>
                  <span className="block text-[13px] font-medium text-[#303030]">
                    Show paid & balance due
                  </span>
                  <span className={cn("mt-0.5 block", dashboardTaskDetailClass)}>
                    When an order has payments recorded, include Paid and
                    Balance due under the total.
                  </span>
                </span>
              </label>
            </div>
          </SettingsPanel>
        </div>

        <div className="xl:sticky xl:top-6">
          <SettingsPanel
            title="Live preview"
            description="Updates as you edit. Sample order for layout only."
            action={
              <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#616161]">
                <Eye className="size-3.5" />
                Estimate PDF
              </span>
            }
            bodyClassName="px-0 py-0 sm:px-0 sm:py-0"
          >
            <EstimateDocumentPreview
              document={draft}
              shopName={settings.shopName || settings.companyProfile.legalName}
              email={settings.email}
              phone={settings.phone}
              addressLines={addressLines}
              primaryColor={settings.branding.primaryColor}
              logoUrl={settings.branding.logoUrl}
            />
          </SettingsPanel>
        </div>
      </div>
    </main>
  );
}
