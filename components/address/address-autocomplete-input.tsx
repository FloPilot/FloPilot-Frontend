"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { Loader2, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  fetchAddressPredictions,
  fetchPlaceAddress,
  type AddressPrediction,
  type ParsedStreetAddress,
} from "@/lib/google-maps";
import { cn } from "@/lib/utils";

type AddressAutocompleteInputProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  onAddressSelect: (address: ParsedStreetAddress) => void;
  className?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  /** Visual variant for staff dashboard forms */
  tone?: "brand" | "dashboard";
};

type MenuPosition = {
  top: number;
  left: number;
  width: number;
};

export function AddressAutocompleteInput({
  id,
  value,
  onChange,
  onAddressSelect,
  className,
  disabled,
  autoFocus,
  tone = "brand",
}: AddressAutocompleteInputProps) {
  const listboxId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const skipNextSearch = useRef(false);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [predictions, setPredictions] = useState<AddressPrediction[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
  const [lookupError, setLookupError] = useState(false);

  const updateMenuPosition = useCallback(() => {
    const node = wrapRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    setMenuPosition({
      top: rect.bottom + 6,
      left: rect.left,
      width: rect.width,
    });
  }, []);

  useEffect(() => {
    if (skipNextSearch.current) {
      skipNextSearch.current = false;
      return;
    }

    const query = value.trim();
    if (query.length < 2) {
      setPredictions([]);
      setOpen(false);
      setActiveIndex(-1);
      setLookupError(false);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const next = await fetchAddressPredictions(query);
        if (cancelled) return;
        setLookupError(false);
        setPredictions(next);
        setActiveIndex(next.length > 0 ? 0 : -1);
        if (next.length > 0) {
          updateMenuPosition();
          setOpen(true);
        } else {
          setOpen(false);
        }
      } catch {
        if (!cancelled) {
          setPredictions([]);
          setOpen(false);
          setLookupError(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 180);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [value, updateMenuPosition]);

  useEffect(() => {
    if (!open) return;

    const onReposition = () => updateMenuPosition();
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (wrapRef.current?.contains(target)) return;
      const menu = document.getElementById(listboxId);
      if (menu?.contains(target)) return;
      setOpen(false);
    };

    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    document.addEventListener("mousedown", onPointerDown);
    return () => {
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [open, listboxId, updateMenuPosition]);

  const selectPrediction = async (prediction: AddressPrediction) => {
    setLoading(true);
    setOpen(false);
    try {
      const address = await fetchPlaceAddress(prediction.place_id);
      if (address) {
        skipNextSearch.current = true;
        onChange(address.line1);
        onAddressSelect(address);
        setPredictions([]);
        setActiveIndex(-1);
        return;
      }
      skipNextSearch.current = true;
      onChange(
        prediction.structured_formatting?.main_text || prediction.description
      );
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!open || predictions.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) =>
        current < predictions.length - 1 ? current + 1 : 0
      );
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) =>
        current > 0 ? current - 1 : predictions.length - 1
      );
      return;
    }
    if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      const selected = predictions[activeIndex];
      if (selected) void selectPrediction(selected);
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
    }
  };

  const showMenu = open && predictions.length > 0 && menuPosition;

  return (
    <div ref={wrapRef} className="relative">
      <div className="relative">
        <Input
          id={id}
          value={value}
          disabled={disabled}
          autoFocus={autoFocus}
          autoComplete="street-address"
          role="combobox"
          aria-expanded={Boolean(showMenu)}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={
            activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined
          }
          onChange={(event) => onChange(event.target.value)}
          onFocus={() => {
            if (predictions.length > 0) {
              updateMenuPosition();
              setOpen(true);
            }
          }}
          onKeyDown={onKeyDown}
          className={cn(loading ? "pr-9" : undefined, className)}
        />
        {loading ? (
          <Loader2
            className={cn(
              "pointer-events-none absolute top-1/2 right-3 size-3.5 -translate-y-1/2 animate-spin",
              tone === "dashboard" ? "text-[#8a8a8a]" : "text-brand-muted"
            )}
            aria-hidden
          />
        ) : null}
      </div>

      {lookupError ? (
        <p
          className={cn(
            "mt-1.5 text-[11px]",
            tone === "dashboard" ? "text-[#8a8a8a]" : "text-brand-muted"
          )}
        >
          Address suggestions unavailable — you can still enter the address
          manually.
        </p>
      ) : null}

      {showMenu && typeof document !== "undefined"
        ? createPortal(
            <div
              id={listboxId}
              role="listbox"
              style={{
                position: "fixed",
                top: menuPosition.top,
                left: menuPosition.left,
                width: menuPosition.width,
                zIndex: 200,
              }}
              className={cn(
                "overflow-hidden rounded-xl border bg-white shadow-[0_16px_40px_rgba(18,26,46,0.14)]",
                tone === "dashboard"
                  ? "border-[#e3e3e3]"
                  : "border-[color-mix(in_srgb,var(--brand-primary)_16%,transparent)]"
              )}
            >
              <ul className="max-h-64 overflow-y-auto py-1">
                {predictions.map((prediction, index) => {
                  const active = index === activeIndex;
                  return (
                    <li key={prediction.place_id} role="presentation">
                      <button
                        id={`${listboxId}-option-${index}`}
                        type="button"
                        role="option"
                        aria-selected={active}
                        className={cn(
                          "flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition-colors",
                          active
                            ? tone === "dashboard"
                              ? "bg-[#f4f4f4]"
                              : "bg-[color-mix(in_srgb,var(--brand-primary)_8%,transparent)]"
                            : "hover:bg-[#fafafa]"
                        )}
                        onMouseEnter={() => setActiveIndex(index)}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => void selectPrediction(prediction)}
                      >
                        <span
                          className={cn(
                            "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full",
                            tone === "dashboard"
                              ? "bg-[#f1f1f1] text-[#616161]"
                              : "bg-[color-mix(in_srgb,var(--brand-primary)_10%,transparent)] text-brand-primary"
                          )}
                        >
                          <MapPin className="size-3.5" aria-hidden />
                        </span>
                        <span className="min-w-0">
                          <span
                            className={cn(
                              "block truncate text-sm font-medium",
                              tone === "dashboard"
                                ? "text-[#303030]"
                                : "text-brand-ink"
                            )}
                          >
                            {prediction.structured_formatting?.main_text ||
                              prediction.description}
                          </span>
                          {prediction.structured_formatting?.secondary_text ? (
                            <span
                              className={cn(
                                "mt-0.5 block truncate text-xs",
                                tone === "dashboard"
                                  ? "text-[#8a8a8a]"
                                  : "text-brand-muted"
                              )}
                            >
                              {prediction.structured_formatting.secondary_text}
                            </span>
                          ) : null}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              <div
                className={cn(
                  "border-t px-3 py-1.5 text-[10px] font-medium tracking-wide uppercase",
                  tone === "dashboard"
                    ? "border-[#ebebeb] text-[#a0a0a0]"
                    : "border-[color-mix(in_srgb,var(--brand-primary)_12%,transparent)] text-brand-muted"
                )}
              >
                Powered by Google
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
