"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Download,
  EyeOff,
  FileText,
  Loader2,
  Printer,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  dashboardControlClass,
  dashboardPrimaryButtonClass,
  dashboardTaskDetailClass,
  dashboardTaskTitleClass,
} from "@/lib/dashboard-styles";
import {
  resolveFilePreviewKind,
  type FilePreviewKind,
} from "@/lib/file-preview";
import { cn } from "@/lib/utils";

/**
 * Same modal shell as estimate / invoice PDF preview: full-height iframe for
 * PDFs (browser PDF viewer with pages + print), image canvas for images, and
 * Download / Print actions in the footer.
 */
export function FilePreviewDialog({
  open,
  onOpenChange,
  title,
  subtitle,
  url,
  filename,
  contentType,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: string;
  /** Remote, blob, or data URL for the file */
  url: string | null;
  filename?: string;
  contentType?: string | null;
}) {
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">(
    "idle"
  );
  const [error, setError] = useState<string | null>(null);
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [resolvedType, setResolvedType] = useState<string | null>(null);
  const [kind, setKind] = useState<FilePreviewKind>("other");
  const objectUrlRef = useRef<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const displayName = filename?.trim() || title || "file";

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setStatus("loading");
    setError(null);
    setResolvedUrl(null);
    setResolvedType(contentType ?? null);

    const initialKind = resolveFilePreviewKind({
      name: displayName,
      url,
      contentType,
    });
    setKind(initialKind);

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }

    if (!url?.trim()) {
      setStatus("error");
      setError("This file has no preview or download URL.");
      return;
    }

    const source = url.trim();

    const applyReady = (nextUrl: string, nextType?: string | null) => {
      if (cancelled) return;
      const nextKind = resolveFilePreviewKind({
        name: displayName,
        url: nextUrl,
        contentType: nextType || contentType,
      });
      setResolvedUrl(nextUrl);
      setResolvedType(nextType || contentType || null);
      setKind(nextKind);
      setStatus("ready");
    };

    // Local sources can render directly (estimate-style PDF blobs already have the right type).
    if (source.startsWith("data:") || source.startsWith("blob:")) {
      applyReady(source, contentType);
      return;
    }

    // Fetch into a typed blob so Chrome mounts its full PDF viewer (pages, zoom, print).
    (async () => {
      try {
        const response = await fetch(source);
        if (!response.ok) {
          throw new Error(`Could not load file (${response.status}).`);
        }
        const rawBlob = await response.blob();
        if (cancelled) return;

        const detected = resolveFilePreviewKind({
          name: displayName,
          url: source,
          contentType: rawBlob.type || contentType,
        });
        const mime =
          detected === "pdf"
            ? "application/pdf"
            : detected === "image"
              ? rawBlob.type || contentType || "image/png"
              : rawBlob.type || contentType || "application/octet-stream";
        const typedBlob =
          rawBlob.type === mime ? rawBlob : new Blob([rawBlob], { type: mime });
        const objectUrl = URL.createObjectURL(typedBlob);
        objectUrlRef.current = objectUrl;
        applyReady(objectUrl, mime);
      } catch {
        if (cancelled) return;
        // CORS fallback — still embed the original URL (PDF viewer may still appear).
        applyReady(source, contentType);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, url, displayName, contentType]);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, []);

  const handlePrint = () => {
    if (!resolvedUrl) return;

    if (kind === "pdf") {
      // Match estimate preview: print from the embedded PDF iframe when possible.
      try {
        const frame = iframeRef.current;
        if (frame?.contentWindow) {
          frame.contentWindow.focus();
          frame.contentWindow.print();
          return;
        }
      } catch {
        /* fall through */
      }
      // Some browsers block iframe print on PDF plugins — open the blob and print there.
      const printWindow = window.open(resolvedUrl, "_blank", "noopener,noreferrer");
      if (printWindow) {
        const tryPrint = () => {
          try {
            printWindow.focus();
            printWindow.print();
          } catch {
            /* user can use the PDF viewer print control */
          }
        };
        // Give the PDF viewer a moment to mount.
        window.setTimeout(tryPrint, 600);
      }
      return;
    }

    if (kind === "image") {
      const printWindow = window.open("", "_blank", "noopener,noreferrer");
      if (!printWindow) return;
      const safeTitle = displayName
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
      printWindow.document.write(`<!doctype html>
<html>
  <head>
    <title>${safeTitle}</title>
    <style>
      html, body { margin: 0; height: 100%; background: #fff; }
      body { display: flex; align-items: center; justify-content: center; }
      img { max-width: 100%; max-height: 100vh; object-fit: contain; }
      @media print {
        body { margin: 0; }
        img { max-width: 100%; max-height: 100%; }
      }
    </style>
  </head>
  <body>
    <img src="${resolvedUrl}" alt="${safeTitle}" onload="window.focus(); window.print();" />
  </body>
</html>`);
      printWindow.document.close();
      return;
    }

    window.open(resolvedUrl, "_blank", "noopener,noreferrer");
  };

  const ready = status === "ready" && Boolean(resolvedUrl);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="flex h-[88vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl"
      >
        <DialogHeader className="border-b border-[#ebebeb] px-5 py-4 pr-12">
          <DialogTitle className={cn(dashboardTaskTitleClass, "truncate")}>
            {title}
          </DialogTitle>
          {subtitle ? (
            <p className={dashboardTaskDetailClass}>{subtitle}</p>
          ) : (
            <p className={dashboardTaskDetailClass}>
              Preview and print without leaving the app.
            </p>
          )}
        </DialogHeader>

        <div className="relative min-h-0 flex-1 overflow-hidden bg-[#525659]">
          {ready && kind === "pdf" ? (
            <iframe
              ref={iframeRef}
              src={resolvedUrl!}
              title={title}
              className="h-full w-full border-0 bg-[#525659]"
            />
          ) : ready && kind === "image" ? (
            <div className="flex h-full items-center justify-center overflow-auto bg-[#f6f6f7] p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={resolvedUrl!}
                alt={displayName}
                className="max-h-full max-w-full object-contain shadow-sm"
              />
            </div>
          ) : ready ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 bg-[#f6f6f7] px-8 text-center">
              <EyeOff className="size-6 text-[#c9c9c9]" />
              <p className="text-[13px] font-medium text-[#303030]">
                Preview isn’t available for this file type
              </p>
              <p className="max-w-sm text-[12px] text-[#8a8a8a]">
                Download the file, or open it in a new tab to print from another
                app.
              </p>
              <FileText className="size-10 text-[#d4d4d4]" />
              <p className="text-[12px] text-[#8a8a8a]">
                {resolvedType || displayName}
              </p>
            </div>
          ) : status === "error" ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 bg-[#f6f6f7] px-8 text-center">
              <AlertCircle className="size-6 text-[#d72c0d]" />
              <p className="text-[13px] font-medium text-[#303030]">
                Couldn’t open the preview
              </p>
              <p className="text-[12px] text-[#8a8a8a]">{error}</p>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 bg-[#f6f6f7] text-center">
              <Loader2 className="size-5 animate-spin text-[#2c6ecb]" />
              <p className="text-[12px] text-[#8a8a8a]">Loading preview…</p>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#ebebeb] bg-[#fafafa] px-5 py-3">
          <p className="min-w-0 truncate text-[12px] text-[#8a8a8a]">
            {displayName}
          </p>
          {ready ? (
            <div className="flex flex-wrap items-center gap-2">
              <a
                href={resolvedUrl!}
                download={displayName}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  dashboardControlClass,
                  "inline-flex h-9 items-center gap-1.5 rounded-lg px-4 text-[13px] font-medium text-[#303030] hover:bg-white"
                )}
              >
                <Download className="size-3.5" />
                {kind === "pdf" ? "Download PDF" : "Download"}
              </a>
              <button
                type="button"
                onClick={handlePrint}
                className={cn(
                  dashboardPrimaryButtonClass,
                  "inline-flex h-9 items-center gap-1.5 rounded-lg px-4 text-[13px]"
                )}
              >
                <Printer className="size-3.5" />
                Print
              </button>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
