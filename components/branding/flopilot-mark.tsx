import Image from "next/image";
import { cn } from "@/lib/utils";

/** Source-of-truth FloPilot app icon (white tile + blue mark). */
export const FLOPILOT_APP_ICON_SRC = "/branding/flopilot-app-icon.png";

/** FloPilot app icon at a given display size — uses the official PNG asset. */
export function FloPilotMarkBadge({
  className,
  boxClassName,
  size = "sm",
}: {
  className?: string;
  boxClassName?: string;
  size?: "sm" | "md" | "lg";
}) {
  const dimension =
    size === "lg" ? 40 : size === "md" ? 36 : 26;

  return (
    <span
      className={cn(
        "relative block shrink-0 overflow-hidden rounded-[7px] shadow-[0_0_0_1px_rgba(255,255,255,0.12),0_1px_2px_rgba(0,0,0,0.35)]",
        size === "lg" && "rounded-xl",
        className,
        boxClassName
      )}
      style={{ width: dimension, height: dimension }}
    >
      <Image
        src={FLOPILOT_APP_ICON_SRC}
        alt=""
        width={dimension}
        height={dimension}
        className="size-full object-cover"
        priority
        unoptimized
      />
    </span>
  );
}
