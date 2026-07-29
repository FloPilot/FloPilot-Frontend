"use client";

import { useEffect, useState } from "react";
import {
  formatPrintDimensions,
  parsePrintDimensions,
} from "@/lib/imprint-design";
import { cn } from "@/lib/utils";

const fieldClass =
  "h-10 w-full rounded-lg border border-[#ebebeb] bg-white px-3 text-[13px] text-[#303030] outline-none transition-colors placeholder:text-[#b5b5b5] focus:border-[#c9cccf]";

export function PortalPrintSizeFields({
  dimensions,
  onChange,
  className,
}: {
  dimensions?: string;
  onChange: (next: string) => void;
  className?: string;
}) {
  const [widthInput, setWidthInput] = useState("");
  const [heightInput, setHeightInput] = useState("");

  useEffect(() => {
    const next = parsePrintDimensions(dimensions);
    setWidthInput(next.width != null ? String(next.width) : "");
    setHeightInput(next.height != null ? String(next.height) : "");
  }, [dimensions]);

  const commitDimensions = (widthStr: string, heightStr: string) => {
    const widthTrim = widthStr.trim();
    const heightTrim = heightStr.trim();

    if (!widthTrim && !heightTrim) {
      onChange("");
      return;
    }

    const width = widthTrim ? Number(widthTrim) : NaN;
    const height = heightTrim ? Number(heightTrim) : NaN;

    if (
      Number.isFinite(width) &&
      Number.isFinite(height) &&
      width > 0 &&
      height > 0
    ) {
      onChange(formatPrintDimensions(width, height) || "");
    }
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <input
        type="number"
        min={0}
        step={0.1}
        inputMode="decimal"
        value={widthInput}
        onChange={(event) => {
          const nextWidth = event.target.value;
          setWidthInput(nextWidth);
          commitDimensions(nextWidth, heightInput);
        }}
        onBlur={() => commitDimensions(widthInput, heightInput)}
        placeholder="Width"
        className={fieldClass}
        aria-label="Print width in inches"
      />
      <span className="shrink-0 text-[12px] text-[#8a8a8a]">in</span>
      <span className="shrink-0 text-[12px] text-[#8a8a8a]">×</span>
      <input
        type="number"
        min={0}
        step={0.1}
        inputMode="decimal"
        value={heightInput}
        onChange={(event) => {
          const nextHeight = event.target.value;
          setHeightInput(nextHeight);
          commitDimensions(widthInput, nextHeight);
        }}
        onBlur={() => commitDimensions(widthInput, heightInput)}
        placeholder="Height"
        className={fieldClass}
        aria-label="Print height in inches"
      />
      <span className="shrink-0 text-[12px] text-[#8a8a8a]">in</span>
    </div>
  );
}
