import Link from "next/link";
import { Layers3 } from "lucide-react";
import {
  productionRunMemberLabel,
  productionRunCompanions,
} from "@/lib/order-production-run";
import type { Order } from "@/types";

export function OrderProductionRunSummary({ order }: { order: Order }) {
  const run = order.productionRun;
  if (!run || productionRunCompanions(order).length === 0) return null;

  return (
    <section className="overflow-hidden rounded-xl border border-[#cfe3d6] bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-[#deebe2] bg-[#f4faf6] px-4 py-3">
        <div className="flex items-center gap-2">
          <Layers3 className="size-4 text-[#2d6a4f]" />
          <div>
            <p className="text-[13px] font-semibold text-[#245c3c]">
              Multi-job run
            </p>
            <p className="text-[11px] text-[#52705d]">
              Combined quantity sets the decoration pricing tier
            </p>
          </div>
        </div>
        <p className="text-[14px] font-semibold tabular-nums text-[#245c3c]">
          {run.combinedQuantity.toLocaleString()} pcs
        </p>
      </div>
      <div className="divide-y divide-[#f0f0f0]">
        {run.members.map((member) => (
          <div
            key={member.orderId}
            className="flex items-center justify-between gap-3 px-4 py-2.5 text-[12px]"
          >
            <Link
              href={`/app/orders/${member.orderId}`}
              className="min-w-0 truncate font-medium text-[#2c6ecb] hover:underline"
            >
              {productionRunMemberLabel(member)}
              {member.orderId === order.id ? " (this order)" : ""}
            </Link>
            <span className="shrink-0 tabular-nums text-[#616161]">
              {member.quantity.toLocaleString()} pcs
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
