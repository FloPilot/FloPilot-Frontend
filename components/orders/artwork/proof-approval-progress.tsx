import { cn } from "@/lib/utils";

export function ProofApprovalProgressBar({
  approved,
  total,
  className,
  size = "md",
}: {
  approved: number;
  total: number;
  className?: string;
  size?: "sm" | "md";
}) {
  const percent = total > 0 ? Math.min(100, (approved / total) * 100) : 0;
  const complete = total > 0 && approved >= total;

  return (
    <div
      className={cn(
        "w-full overflow-hidden rounded-full bg-[#ebebeb]",
        size === "sm" ? "h-1.5" : "h-2",
        className
      )}
      role="progressbar"
      aria-valuenow={Math.round(percent)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-500 ease-out",
          complete ? "bg-emerald-600" : "bg-[#2c6ecb]"
        )}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
