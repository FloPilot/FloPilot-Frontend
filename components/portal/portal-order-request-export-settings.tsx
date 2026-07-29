"use client";

import { useRef, useState } from "react";
import {
  FileUp,
  Loader2,
  Sparkles,
  Trash2,
  ExternalLink,
} from "lucide-react";
import {
  analyzePortalOrderRequestExportTemplate,
} from "@/lib/customer-portal-api";
import {
  ORDER_REQUEST_EXPORT_SECTION_DEFS,
  createDefaultOrderRequestExport,
  type OrderRequestExportSectionId,
  type OrderRequestExportSettings,
} from "@/lib/order-request-export";
import { cn } from "@/lib/utils";

const inputClass =
  "h-11 w-full rounded-lg border border-[#ebebeb] bg-white px-3 text-[14px] text-[#303030] outline-none transition-shadow placeholder:text-[#b5b5b5] focus:border-[#2c6ecb] focus:ring-2 focus:ring-[#2c6ecb]/15";

const labelClass = "mb-1.5 block text-[13px] font-medium text-[#616161]";

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Could not read that file."));
    reader.readAsDataURL(file);
  });
}

export function PortalOrderRequestExportSettings({
  accent,
  value,
  pendingDataUrl,
  pendingFileName,
  pendingContentType,
  onChange,
  onPendingUpload,
  onClearPendingUpload,
  getAccessToken,
  mode,
}: {
  accent: string;
  value: OrderRequestExportSettings;
  pendingDataUrl: string | null;
  pendingFileName: string | null;
  pendingContentType: string | null;
  onChange: (next: OrderRequestExportSettings) => void;
  onPendingUpload: (payload: {
    dataUrl: string;
    fileName: string;
    contentType: string;
  }) => void;
  onClearPendingUpload: () => void;
  getAccessToken: () => Promise<string>;
  mode: "auth" | "invite";
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [analyzeNote, setAnalyzeNote] = useState<string | null>(null);

  const toggleSection = (id: OrderRequestExportSectionId) => {
    const has = value.sections.includes(id);
    onChange({
      ...value,
      sections: has
        ? value.sections.filter((entry) => entry !== id)
        : [...value.sections, id],
    });
  };

  const handleFile = async (file: File | null) => {
    if (!file) return;
    setAnalyzeError(null);
    setAnalyzeNote(null);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      onPendingUpload({
        dataUrl,
        fileName: file.name,
        contentType: file.type || "application/pdf",
      });
      setAnalyzing(true);
      const accessToken = await getAccessToken();
      const result = await analyzePortalOrderRequestExportTemplate(
        accessToken,
        {
          fileName: file.name,
          contentType: file.type || "application/pdf",
          base64: dataUrl,
        },
        { mode: mode === "auth" ? "auth" : "invite" }
      );
      if (result.suggested) {
        onChange({
          ...result.suggested,
          referencePdf: value.referencePdf,
        });
        setAnalyzeNote(
          result.mapNotes ||
            "We mapped sections from your sample. Review and save when it looks right."
        );
      }
    } catch (err) {
      setAnalyzeError(
        err instanceof Error
          ? err.message
          : "Could not analyze that template. You can still set sections manually."
      );
    } finally {
      setAnalyzing(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const clearReference = () => {
    onClearPendingUpload();
    onChange({
      ...value,
      referencePdf: null,
      mapNotes: "",
    });
    setAnalyzeNote(null);
    setAnalyzeError(null);
  };

  return (
    <div className="space-y-5 px-4 py-4 sm:px-5">
      <div>
        <label className={labelClass}>Document title</label>
        <input
          className={inputClass}
          value={value.title}
          onChange={(e) => onChange({ ...value, title: e.target.value })}
          placeholder="Order request"
        />
      </div>

      <div>
        <p className={labelClass}>What to include</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {ORDER_REQUEST_EXPORT_SECTION_DEFS.map((section) => {
            const checked = value.sections.includes(section.id);
            return (
              <label
                key={section.id}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 transition-colors",
                  checked
                    ? "border-[#c9cccf] bg-[#fafafa]"
                    : "border-[#ebebeb] bg-white hover:bg-[#fafafa]"
                )}
              >
                <input
                  type="checkbox"
                  className="mt-1 size-4 rounded border-[#c9cccf]"
                  style={checked ? { accentColor: accent } : undefined}
                  checked={checked}
                  onChange={() => toggleSection(section.id)}
                />
                <span className="min-w-0">
                  <span className="block text-[13px] font-semibold text-[#303030]">
                    {section.label}
                  </span>
                  <span className="mt-0.5 block text-[12px] text-[#8a8a8a]">
                    {section.description}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </div>

      <div>
        <label className={labelClass}>Footer text</label>
        <textarea
          className={cn(inputClass, "h-24 resize-y py-2.5")}
          value={value.footerText}
          onChange={(e) => onChange({ ...value, footerText: e.target.value })}
          placeholder="Saved for your records…"
        />
      </div>

      <label className="flex cursor-pointer items-center gap-2.5 text-[13px] text-[#303030]">
        <input
          type="checkbox"
          className="size-4 rounded border-[#c9cccf]"
          style={value.includeShopName ? { accentColor: accent } : undefined}
          checked={value.includeShopName}
          onChange={(e) =>
            onChange({ ...value, includeShopName: e.target.checked })
          }
        />
        Show the shop name in the header
      </label>

      <div className="rounded-xl border border-dashed border-[#d4d4d4] bg-[#fafafa] px-4 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-[#303030]">
              Upload your current PDF map
            </p>
            <p className="mt-1 text-[12px] leading-relaxed text-[#616161]">
              Drop in a tech pack or artwork sheet you already use. We&apos;ll
              match branding cues so portal downloads pull mockups, Pantones,
              sizing, and order qty in that style.
            </p>
          </div>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={analyzing}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#ebebeb] bg-white px-3 text-[13px] font-semibold text-[#303030] hover:bg-white disabled:opacity-60"
          >
            {analyzing ? (
              <Loader2 className="size-3.5 animate-spin" style={{ color: accent }} />
            ) : (
              <FileUp className="size-3.5" />
            )}
            {analyzing ? "Reading…" : "Upload PDF"}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,image/*"
            className="hidden"
            onChange={(e) => void handleFile(e.target.files?.[0] || null)}
          />
        </div>

        {pendingDataUrl || value.referencePdf ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-[#ebebeb] bg-white px-3 py-2.5">
            <Sparkles className="size-3.5 shrink-0" style={{ color: accent }} />
            <p className="min-w-0 flex-1 text-[12px] text-[#303030]">
              {pendingFileName || value.referencePdf?.fileName || "template.pdf"}
              {pendingDataUrl ? " · ready to save" : ""}
            </p>
            {value.referencePdf?.fileUrl && !pendingDataUrl ? (
              <a
                href={value.referencePdf.fileUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[12px] font-medium"
                style={{ color: accent }}
              >
                View
                <ExternalLink className="size-3" />
              </a>
            ) : null}
            <button
              type="button"
              onClick={clearReference}
              className="inline-flex size-8 items-center justify-center rounded-md text-[#8f1f1f] hover:bg-[#fff1f1]"
              aria-label="Remove template"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        ) : null}

        {analyzeNote ? (
          <p className="mt-3 text-[12px] leading-relaxed text-[#245c3c]">
            {analyzeNote}
          </p>
        ) : null}
        {value.mapNotes && !analyzeNote ? (
          <p className="mt-3 text-[12px] leading-relaxed text-[#616161]">
            {value.mapNotes}
          </p>
        ) : null}
        {analyzeError ? (
          <p className="mt-3 text-[12px] text-[#8f1f1f]">{analyzeError}</p>
        ) : null}
      </div>

      <button
        type="button"
        onClick={() => onChange(createDefaultOrderRequestExport())}
        className="text-[12px] font-medium text-[#616161] underline-offset-2 hover:underline"
      >
        Reset to default sections
      </button>
    </div>
  );
}
