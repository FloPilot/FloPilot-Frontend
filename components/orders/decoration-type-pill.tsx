import type { BuiltInDecorationType, DecorationType } from "@/types";
import { decorationLabel } from "@/lib/format";
import { cn } from "@/lib/utils";

const DECORATION_STYLES: Record<BuiltInDecorationType, string> = {
  screen_print: "bg-[#f4f7fd] text-[#2c6ecb] border-[#c9d7ef]",
  dtf: "bg-[#f3f0ff] text-[#5c3bbf] border-[#ddd6fe]",
  embroidery: "bg-[#fdf4ff] text-[#7c3aed] border-[#e9d5ff]",
  vinyl: "bg-[#f0fdf4] text-[#0d5c2e] border-[#bbf7d0]",
  finishing: "bg-[#f6f6f7] text-[#616161] border-[#e3e3e3]",
};

function styleForDecoration(decoration: string): string {
  return (
    DECORATION_STYLES[decoration as BuiltInDecorationType] ??
    DECORATION_STYLES.finishing
  );
}

export function DecorationTypePill({
  decoration,
  className,
  label,
}: {
  decoration: DecorationType;
  className?: string;
  label?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold",
        styleForDecoration(decoration),
        className
      )}
    >
      {label ?? decorationLabel(decoration)}
    </span>
  );
}
