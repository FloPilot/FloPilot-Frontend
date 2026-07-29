"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ImageIcon,
  Loader2,
  Pencil,
  Plus,
  Upload,
  X,
} from "lucide-react";
import { usePortalAccess } from "@/components/portal/use-portal-access";
import {
  createCustomerPortalDesign,
  fetchCustomerPortalArtwork,
  fetchCustomerPortalProfile,
  updateCustomerPortalDesign,
  type CustomerPortalArtworkItem,
  type CustomerPortalArtworkResponse,
  type CustomerPortalProfile,
} from "@/lib/customer-portal-api";
import { readImagePreviewDataUrl } from "@/lib/artwork-preview";
import {
  dashboardCardClass,
  dashboardSectionTitleClass,
} from "@/lib/dashboard-styles";
import { decorationLabel, formatDate } from "@/lib/format";
import {
  ORDER_REQUEST_DECORATION_OPTIONS,
  ORDER_REQUEST_LOCATION_OPTIONS,
} from "@/lib/order-requests";
import { cn } from "@/lib/utils";

type EndBusiness = NonNullable<
  CustomerPortalProfile["endBusinesses"]
>[number];

type ArtworkFormState = {
  name: string;
  decoration: string;
  locationKey: string;
  printSize: string;
  placement: string;
  instructions: string;
  tagsText: string;
  pmsText: string;
  subCustomerId: string;
  previewUrl: string;
  fileName: string;
};

const emptyForm = (): ArtworkFormState => ({
  name: "",
  decoration: "screen_print",
  locationKey: "front_left_chest",
  printSize: "",
  placement: "",
  instructions: "",
  tagsText: "",
  pmsText: "",
  subCustomerId: "",
  previewUrl: "",
  fileName: "",
});

function parseCommaList(value: string) {
  return value
    .split(/[,;\n]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function ArtworkStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold",
        status === "approved" && "bg-[#f1faf1] text-[#0d5c2e]",
        status === "revision_requested" && "bg-[#fff1d6] text-[#8a6116]",
        status === "pending" && "bg-[#ebf4ff] text-[#2c6ecb]"
      )}
    >
      {status === "approved"
        ? "Approved"
        : status === "revision_requested"
          ? "Revision requested"
          : "Pending review"}
    </span>
  );
}

function ArtworkCard({
  design,
  onEdit,
}: {
  design: CustomerPortalArtworkItem;
  onEdit: (design: CustomerPortalArtworkItem) => void;
}) {
  const tags = design.tags?.filter(Boolean) || [];
  const pms =
    design.pmsCodes?.filter(Boolean) ||
    design.inkColors?.map((ink) => ink.pmsCode).filter(Boolean) ||
    [];

  return (
    <article className="overflow-hidden rounded-xl border border-[#ebebeb] bg-white">
      <div className="relative aspect-[4/3] bg-[#f6f6f7]">
        {design.previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={design.previewUrl}
            alt={design.name}
            className="size-full object-contain p-3"
          />
        ) : (
          <div className="flex size-full flex-col items-center justify-center text-[#b5b5b5]">
            <ImageIcon className="size-10" strokeWidth={1.25} />
            <p className="mt-2 text-[12px]">No preview</p>
          </div>
        )}
        <button
          type="button"
          onClick={() => onEdit(design)}
          className="absolute right-2 top-2 inline-flex size-8 items-center justify-center rounded-lg border border-[#ebebeb] bg-white/95 text-[#616161] shadow-sm hover:bg-white"
          aria-label="Edit artwork tags"
        >
          <Pencil className="size-3.5" />
        </button>
      </div>
      <div className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-[15px] font-semibold leading-snug text-[#303030]">
            {design.name}
          </h3>
          <ArtworkStatusBadge status={design.status} />
        </div>
        {design.subCustomerName ? (
          <p className="text-[13px] font-medium text-[#303030]">
            {design.subCustomerName}
          </p>
        ) : null}
        {design.locationLabel ? (
          <p className="text-[13px] text-[#616161]">{design.locationLabel}</p>
        ) : null}
        {design.decoration ? (
          <p className="text-[12px] text-[#8a8a8a]">
            {decorationLabel(design.decoration)}
          </p>
        ) : null}
        {tags.length > 0 || pms.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {tags.map((tag) => (
              <span
                key={`tag-${tag}`}
                className="rounded-md bg-[#f6f6f7] px-2 py-0.5 text-[11px] font-medium text-[#616161]"
              >
                {tag}
              </span>
            ))}
            {pms.map((code) => (
              <span
                key={`pms-${code}`}
                className="rounded-md bg-[#ebf4ff] px-2 py-0.5 text-[11px] font-medium text-[#2c6ecb]"
              >
                PMS {code}
              </span>
            ))}
          </div>
        ) : null}
        <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1 text-[12px] text-[#8a8a8a]">
          {design.sourceOrderNumber ? (
            <span>Order {design.sourceOrderNumber}</span>
          ) : null}
          {design.lastUsedAt ? (
            <span>Updated {formatDate(design.lastUsedAt)}</span>
          ) : null}
        </div>
      </div>
    </article>
  );
}

const inputClass =
  "h-10 w-full rounded-lg border border-[#d4d4d4] bg-white px-3 text-[14px] text-[#303030] outline-none focus:border-[#8a8a8a]";
const labelClass = "mb-1.5 block text-[13px] font-medium text-[#616161]";

export function CustomerPortalArtworkView() {
  const { mode, accent, getAccessToken } = usePortalAccess();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [data, setData] = useState<CustomerPortalArtworkResponse | null>(null);
  const [endBusinesses, setEndBusinesses] = useState<EndBusiness[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ArtworkFormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [readingFile, setReadingFile] = useState(false);

  const portalMode = mode === "auth" ? "auth" : "invite";

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const accessToken = await getAccessToken();
      const [artwork, profile] = await Promise.all([
        fetchCustomerPortalArtwork(accessToken, { mode: portalMode }),
        fetchCustomerPortalProfile(accessToken, { mode: portalMode }),
      ]);
      setData(artwork);
      setEndBusinesses(profile.profile?.endBusinesses ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load artwork.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const accessToken = await getAccessToken();
        const [artwork, profile] = await Promise.all([
          fetchCustomerPortalArtwork(accessToken, { mode: portalMode }),
          fetchCustomerPortalProfile(accessToken, { mode: portalMode }),
        ]);
        if (!cancelled) {
          setData(artwork);
          setEndBusinesses(profile.profile?.endBusinesses ?? []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Could not load artwork."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [getAccessToken, portalMode]);

  const designs = data?.designs ?? [];
  const sortedEndBusinesses = useMemo(
    () =>
      [...endBusinesses].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
      ),
    [endBusinesses]
  );

  const locationLabelForKey = (key: string) =>
    ORDER_REQUEST_LOCATION_OPTIONS.find((opt) => opt.value === key)?.label ||
    key.replace(/_/g, " ");

  const openUpload = () => {
    setEditingId(null);
    setForm(emptyForm());
    setFormError(null);
    setDialogOpen(true);
  };

  const openEdit = (design: CustomerPortalArtworkItem) => {
    setEditingId(design.id);
    setForm({
      name: design.name || "",
      decoration: design.decoration || "other",
      locationKey: design.locationKey || "other",
      printSize: design.printSize || "",
      placement: design.placement || "",
      instructions: design.instructions || "",
      tagsText: (design.tags || []).join(", "),
      pmsText: (
        design.pmsCodes ||
        design.inkColors?.map((ink) => ink.pmsCode) ||
        []
      )
        .filter(Boolean)
        .join(", "),
      subCustomerId: design.subCustomerId || "",
      previewUrl: design.previewUrl || "",
      fileName: "",
    });
    setFormError(null);
    setDialogOpen(true);
  };

  const onPickFile = async (file: File | null) => {
    if (!file) return;
    setReadingFile(true);
    setFormError(null);
    try {
      const result = await readImagePreviewDataUrl(file);
      if (!result.previewUrl) {
        setFormError(
          result.error || "Use a PNG, JPG, WebP, or GIF image file."
        );
        return;
      }
      setForm((current) => ({
        ...current,
        previewUrl: result.previewUrl,
        fileName: file.name,
        name: current.name.trim() || file.name.replace(/\.[^.]+$/, ""),
      }));
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Could not read that image."
      );
    } finally {
      setReadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSave = async () => {
    const name = form.name.trim();
    if (!name) {
      setFormError("Give this artwork a name.");
      return;
    }
    if (!editingId && !form.previewUrl) {
      setFormError("Upload an artwork file.");
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      const accessToken = await getAccessToken();
      const tags = parseCommaList(form.tagsText);
      const inkColors = parseCommaList(form.pmsText).map((pmsCode) => ({
        pmsCode,
      }));
      const locationLabel = locationLabelForKey(form.locationKey);
      const payload = {
        name,
        decoration: form.decoration,
        locationKey: form.locationKey,
        locationLabel,
        printSize: form.printSize.trim(),
        placement: form.placement.trim(),
        instructions: form.instructions.trim(),
        tags,
        inkColors,
      };

      if (editingId) {
        await updateCustomerPortalDesign(
          accessToken,
          editingId,
          { ...payload, subCustomerId: form.subCustomerId },
          { mode: portalMode }
        );
      } else {
        await createCustomerPortalDesign(
          accessToken,
          {
            ...payload,
            previewUrl: form.previewUrl,
            fileName: form.fileName || undefined,
            ...(form.subCustomerId
              ? { subCustomerId: form.subCustomerId }
              : {}),
          },
          { mode: portalMode }
        );
      }
      setDialogOpen(false);
      await load();
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Could not save artwork."
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-[#616161]">
        <Loader2 className="size-6 animate-spin" style={{ color: accent }} />
        <p className="text-[14px]">Loading your artwork…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-[#f5b5b5] bg-[#fff1f1] px-4 py-6 text-center text-[14px] text-[#8f1f1f]">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className={dashboardSectionTitleClass}>Your artwork</h1>
          <p className="mt-1 max-w-2xl text-[14px] text-[#616161]">
            Upload designs, tag them with print details, and link them to an end
            business so they&apos;re ready for future order requests.
          </p>
        </div>
        <button
          type="button"
          onClick={openUpload}
          className="inline-flex h-11 items-center gap-2 rounded-lg px-5 text-[14px] font-semibold text-white"
          style={{ backgroundColor: accent }}
        >
          <Plus className="size-4" />
          Upload artwork
        </button>
      </div>

      {designs.length === 0 ? (
        <section className={cn(dashboardCardClass, "px-6 py-12 text-center")}>
          <div
            className="mx-auto flex size-12 items-center justify-center rounded-xl bg-[#f1f1f1]"
            style={{ color: accent }}
          >
            <ImageIcon className="size-5" strokeWidth={1.75} />
          </div>
          <h2 className="mt-4 text-[17px] font-semibold text-[#303030]">
            No artwork yet
          </h2>
          <p className="mx-auto mt-2 max-w-md text-[14px] leading-relaxed text-[#616161]">
            Upload logos and art files, then tag placement, decoration, PMS, and
            which end business they belong to.
          </p>
          <button
            type="button"
            onClick={openUpload}
            className="mt-5 inline-flex h-10 items-center gap-2 rounded-lg px-4 text-[13px] font-semibold text-white"
            style={{ backgroundColor: accent }}
          >
            <Upload className="size-3.5" />
            Upload your first file
          </button>
        </section>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {designs.map((design) => (
            <ArtworkCard key={design.id} design={design} onEdit={openEdit} />
          ))}
        </div>
      )}

      {dialogOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div
            className="absolute inset-0"
            onClick={() => !saving && setDialogOpen(false)}
            aria-hidden
          />
          <div className="relative flex max-h-[90vh] w-full max-w-xl flex-col rounded-2xl bg-white shadow-xl">
            <div className="flex items-start justify-between gap-3 border-b border-[#ebebeb] px-5 py-4">
              <div>
                <h3 className="text-[17px] font-semibold text-[#303030]">
                  {editingId ? "Edit artwork tags" : "Upload artwork"}
                </h3>
                <p className="mt-1 text-[13px] text-[#616161]">
                  {editingId
                    ? "Update metadata so this design is easy to find later."
                    : "Add a file and the details your shop needs."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => !saving && setDialogOpen(false)}
                className="flex size-8 items-center justify-center rounded-lg text-[#8a8a8a] hover:bg-[#f6f6f7]"
                aria-label="Close"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto px-5 py-4">
              {formError ? (
                <p className="rounded-lg bg-[#fff1f1] px-3 py-2 text-[13px] text-[#8f1f1f]">
                  {formError}
                </p>
              ) : null}

              {!editingId || form.previewUrl ? (
                <div>
                  <label className={labelClass}>Artwork file</label>
                  {form.previewUrl ? (
                    <div className="overflow-hidden rounded-xl border border-[#ebebeb] bg-[#f6f6f7]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={form.previewUrl}
                        alt="Artwork preview"
                        className="mx-auto max-h-48 object-contain p-3"
                      />
                      {!editingId ? (
                        <div className="border-t border-[#ebebeb] bg-white px-3 py-2">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={readingFile || saving}
                            className="text-[13px] font-medium text-[#616161] hover:text-[#303030]"
                          >
                            {readingFile ? "Reading…" : "Replace file"}
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={readingFile || saving}
                      className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[#d4d4d4] bg-[#fafafa] px-4 py-10 text-[#616161] hover:bg-[#f6f6f7]"
                    >
                      {readingFile ? (
                        <Loader2
                          className="size-5 animate-spin"
                          style={{ color: accent }}
                        />
                      ) : (
                        <Upload className="size-5" />
                      )}
                      <span className="text-[14px] font-medium text-[#303030]">
                        {readingFile ? "Reading file…" : "Choose PNG, JPG, or WebP"}
                      </span>
                    </button>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif,.png,.jpg,.jpeg,.webp,.gif"
                    className="hidden"
                    onChange={(e) =>
                      void onPickFile(e.target.files?.[0] || null)
                    }
                  />
                </div>
              ) : null}

              <div>
                <label className={labelClass}>Name</label>
                <input
                  className={inputClass}
                  value={form.name}
                  onChange={(e) =>
                    setForm((current) => ({ ...current, name: e.target.value }))
                  }
                  placeholder="Left chest logo"
                />
              </div>

              <div>
                <label className={labelClass}>End business (optional)</label>
                <select
                  className={inputClass}
                  value={form.subCustomerId}
                  onChange={(e) =>
                    setForm((current) => ({
                      ...current,
                      subCustomerId: e.target.value,
                    }))
                  }
                >
                  <option value="">General / not linked</option>
                  {sortedEndBusinesses.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.name}
                    </option>
                  ))}
                </select>
                {sortedEndBusinesses.length === 0 ? (
                  <p className="mt-1.5 text-[12px] text-[#8a8a8a]">
                    Add end businesses under Business information to tag artwork
                    to them.
                  </p>
                ) : null}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Decoration</label>
                  <select
                    className={inputClass}
                    value={form.decoration}
                    onChange={(e) =>
                      setForm((current) => ({
                        ...current,
                        decoration: e.target.value,
                      }))
                    }
                  >
                    {ORDER_REQUEST_DECORATION_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Print location</label>
                  <select
                    className={inputClass}
                    value={form.locationKey}
                    onChange={(e) =>
                      setForm((current) => ({
                        ...current,
                        locationKey: e.target.value,
                      }))
                    }
                  >
                    {ORDER_REQUEST_LOCATION_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Print size (optional)</label>
                  <input
                    className={inputClass}
                    value={form.printSize}
                    onChange={(e) =>
                      setForm((current) => ({
                        ...current,
                        printSize: e.target.value,
                      }))
                    }
                    placeholder='e.g. 3.5" wide'
                  />
                </div>
                <div>
                  <label className={labelClass}>Placement (optional)</label>
                  <input
                    className={inputClass}
                    value={form.placement}
                    onChange={(e) =>
                      setForm((current) => ({
                        ...current,
                        placement: e.target.value,
                      }))
                    }
                    placeholder="Centered on left chest"
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>PMS / ink colors (optional)</label>
                <input
                  className={inputClass}
                  value={form.pmsText}
                  onChange={(e) =>
                    setForm((current) => ({
                      ...current,
                      pmsText: e.target.value,
                    }))
                  }
                  placeholder="186 C, Black"
                />
              </div>

              <div>
                <label className={labelClass}>Tags (optional)</label>
                <input
                  className={inputClass}
                  value={form.tagsText}
                  onChange={(e) =>
                    setForm((current) => ({
                      ...current,
                      tagsText: e.target.value,
                    }))
                  }
                  placeholder="neck label, spring, client logo"
                />
              </div>

              <div>
                <label className={labelClass}>Notes (optional)</label>
                <textarea
                  className={`${inputClass} min-h-[80px] resize-y`}
                  value={form.instructions}
                  onChange={(e) =>
                    setForm((current) => ({
                      ...current,
                      instructions: e.target.value,
                    }))
                  }
                  placeholder="Anything important for production…"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-[#ebebeb] px-5 py-4">
              <button
                type="button"
                onClick={() => setDialogOpen(false)}
                disabled={saving}
                className="h-10 rounded-lg px-4 text-[14px] font-medium text-[#616161] hover:bg-[#f6f6f7] disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving || readingFile}
                className="inline-flex h-10 min-w-[110px] items-center justify-center gap-2 rounded-lg px-5 text-[14px] font-semibold text-white disabled:opacity-60"
                style={{ backgroundColor: accent }}
              >
                {saving ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Saving…
                  </>
                ) : editingId ? (
                  "Save tags"
                ) : (
                  "Upload"
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
