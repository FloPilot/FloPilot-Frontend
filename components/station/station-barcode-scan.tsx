"use client";

import { useRef, useState } from "react";
import { Barcode, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
    <section className="rounded-2xl border border-border/60 bg-white shadow-sm overflow-hidden">
      <div className="border-b border-border/60 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-primary/8 text-brand-primary">
            <Barcode className="size-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-brand-ink">
              Start an event
            </h2>
            <p className="text-xs text-brand-muted mt-0.5">
              Scan the barcode on the event bag to start the timer.
            </p>
          </div>
        </div>
      </div>

      <div className="p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
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
            className="h-10 rounded-xl flex-1"
            autoComplete="off"
          />
          <Button
            type="button"
            disabled={disabled || submitting || !value.trim()}
            className="h-10 rounded-full px-5 shrink-0"
            onClick={submit}
          >
            <ScanLine className="size-3.5" />
            Start
          </Button>
        </div>

        {hintBarcode && (
          <p className="mt-2.5 text-xs text-brand-muted">
            Example:{" "}
            <button
              type="button"
              className="font-mono text-brand-primary hover:underline"
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
          <p className="mt-3 text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
            {error}
          </p>
        )}
        {success && (
          <p
            className={cn(
              "mt-3 text-sm text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2"
            )}
          >
            Event started — timer is running.
          </p>
        )}
      </div>
    </section>
  );
}
