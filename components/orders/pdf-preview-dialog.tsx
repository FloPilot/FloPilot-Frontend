"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, Download, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  dashboardControlClass,
  dashboardTaskDetailClass,
  dashboardTaskTitleClass,
} from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";

function base64ToBlobUrl(base64: string): string {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: "application/pdf" });
  return URL.createObjectURL(blob);
}

/**
 * Renders a server-generated PDF inline (estimate / proofs preview). The PDF is
 * loaded on open via `load`, turned into a blob URL, and shown in an iframe so
 * nothing leaves the app.
 */
export function PdfPreviewDialog({
  open,
  onOpenChange,
  title,
  subtitle,
  load,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: string;
  load: () => Promise<{ pdfBase64: string; filename: string }>;
}) {
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">(
    "idle"
  );
  const [error, setError] = useState<string | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [filename, setFilename] = useState("document.pdf");
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setStatus("loading");
    setError(null);

    load()
      .then(({ pdfBase64, filename: name }) => {
        if (cancelled) return;
        const url = base64ToBlobUrl(pdfBase64);
        if (urlRef.current) URL.revokeObjectURL(urlRef.current);
        urlRef.current = url;
        setBlobUrl(url);
        setFilename(name || "document.pdf");
        setStatus("ready");
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err instanceof Error ? err.message : "Could not generate the preview."
        );
        setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [open, load]);

  useEffect(() => {
    return () => {
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }
    };
  }, []);

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
          ) : null}
        </DialogHeader>

        <div className="relative flex-1 overflow-hidden bg-[#f6f6f7]">
          {status === "ready" && blobUrl ? (
            <iframe
              src={blobUrl}
              title={title}
              className="h-full w-full border-0"
            />
          ) : status === "error" ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 px-8 text-center">
              <AlertCircle className="size-6 text-[#d72c0d]" />
              <p className="text-[13px] font-medium text-[#303030]">
                Couldn&apos;t build the preview
              </p>
              <p className="text-[12px] text-[#8a8a8a]">{error}</p>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
              <Loader2 className="size-5 animate-spin text-[#2c6ecb]" />
              <p className="text-[12px] text-[#8a8a8a]">Generating preview…</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-[#ebebeb] bg-[#fafafa] px-5 py-3">
          <p className="truncate text-[12px] text-[#8a8a8a]">{filename}</p>
          {status === "ready" && blobUrl ? (
            <a
              href={blobUrl}
              download={filename}
              className={cn(
                dashboardControlClass,
                "inline-flex h-9 items-center gap-1.5 rounded-lg px-4 text-[13px] font-medium text-[#303030] hover:bg-white"
              )}
            >
              <Download className="size-3.5" />
              Download PDF
            </a>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
