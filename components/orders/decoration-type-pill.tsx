import type { DecorationType } from "@/types";
import { decorationLabel } from "@/lib/format";
import { cn } from "@/lib/utils";

const DECORATION_STYLES: Record<DecorationType, string> = {
  screen_print: "bg-[#f4f7fd] text-[#2c6ecb] border-[#c9d7ef]",
  dtf: "bg-[#f3f0ff] text-[#5c3bbf] border-[#ddd6fe]",
  embroidery: "bg-[#fdf4ff] text-[#7c3aed] border-[#e9d5ff]",
  vinyl: "bg-[#f0fdf4] text-[#0d5c2e] border-[#bbf7d0]",
  finishing: "bg-[#f6f6f7] text-[#616161] border-[#e3e3e3]",
};

export function DecorationTypePill({
  decoration,
  className,
}: {
  decoration: DecorationType;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold",
        DECORATION_STYLES[decoration] ?? DECORATION_STYLES.finishing,
        className
      )}
    >
      {decorationLabel(decoration)}
    </span>
  );
}
