"use client";

import { useRef, useState } from "react";
import { Barcode, CheckCircle2, Loader2, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  dashboardCardClass,
  dashboardPrimaryButtonClass,
} from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";

export function StationBarcodeScan({
  onScan,
  disabled,
  hintBarcode,
}: {
  onScan: (
    value: string
  ) =>
    | { ok: boolean; error?: string }
    | Promise<{ ok: boolean; error?: string }>;
  disabled?: boolean;
  hintBarcode?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setError(null);
    setSuccess(false);
    setSubmitting(true);
    try {
      const result = await Promise.resolve(onScan(value));
      if (result.ok) {
        setValue("");
        setSuccess(true);
        setTimeout(() => setSuccess(false), 2500);
      } else {
        setError(result.error ?? "Could not start event.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section
      className={cn(
        dashboardCardClass,
        disabled ? "opacity-90" : "border-[#c4d7f2]"
      )}
    >
      <div
        className={cn(
          "flex items-center gap-3 border-b px-5 py-4",
          disabled ? "border-[#ebebeb] bg-[#fafafa]" : "border-[#c4d7f2] bg-[#f4f7fd]"
        )}
      >
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#e8f0fb] text-[#2c6ecb]">
          <Barcode className="size-5" strokeWidth={1.75} />
        </div>
        <div>
          <h2 className="text-[15px] font-semibold leading-snug text-[#303030]">
            Start an event
          </h2>
          <p className="mt-0.5 text-[13px] text-[#616161]">
            Scan the barcode on the event bag to start the timer.
          </p>
        </div>
      </div>

      <div className="p-5">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <Input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submit();
              }
            }}
            disabled={disabled || submitting}
            placeholder="Scan or type barcode…"
            className="h-12 flex-1 rounded-lg border-[#e3e3e3] text-base focus-visible:border-[#2c6ecb]"
            autoComplete="off"
          />
          <Button
            type="button"
            disabled={disabled || submitting || !value.trim()}
            className={cn(
              dashboardPrimaryButtonClass,
              "h-12 shrink-0 px-6 text-sm sm:w-auto"
            )}
            onClick={submit}
          >
            {submitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ScanLine className="size-4" />
            )}
            Start event
          </Button>
        </div>

        {hintBarcode && !disabled && (
          <p className="mt-2.5 text-xs text-[#616161]">
            Example:{" "}
            <button
              type="button"
              className="font-mono text-[#2c6ecb] hover:underline"
              onClick={() => {
                setValue(hintBarcode);
                inputRef.current?.focus();
              }}
            >
              {hintBarcode}
            </button>
          </p>
        )}

        {error && (
          <p className="mt-3 rounded-lg border border-[#f5b5b5] bg-[#fff1f1] px-3 py-2 text-sm text-[#8f1f1f]">
            {error}
          </p>
        )}
        {success && (
          <p className="mt-3 flex items-center gap-1.5 rounded-lg border border-[#86d4a8] bg-[#e8f5ee] px-3 py-2 text-sm text-[#0d5c2e]">
            <CheckCircle2 className="size-4" />
            Event started — timer is running.
          </p>
        )}
      </div>
    </section>
  );
}
