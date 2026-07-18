import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function ProductionRunGroup({
  orderCount,
  className,
  children,
}: {
  orderCount?: number;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn("space-y-1.5 rounded-xl bg-white p-1", className)}
      style={{ boxShadow: "inset 0 0 0 1.5px #2c6ecb" }}
      title={
        orderCount && orderCount > 1
          ? `${orderCount} orders running together`
          : "Multi-job run"
      }
    >
      {children}
    </div>
  );
}
