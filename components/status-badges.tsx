import type { OrderStatus, TaskStatus } from "@/types";
import type { OrderEstimateStatus } from "@/lib/order-estimate-status";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const orderStatusConfig: Record<
  OrderStatus,
  { label: string; className: string }
> = {
  draft: {
    label: "Draft",
    className: "bg-muted text-muted-foreground",
  },
  quote_sent: {
    label: "Quote Sent",
    className: "bg-brand-primary/10 text-brand-primary border-brand-primary/15",
  },
  awaiting_approval: {
    label: "Awaiting Approval",
    className: "bg-amber-50 text-amber-700 border-amber-100",
  },
  approved: {
    label: "Approved",
    className: "bg-emerald-50 text-emerald-700 border-emerald-100",
  },
  in_production: {
    label: "In Production",
    className: "bg-violet-50 text-violet-700 border-violet-100",
  },
  ready_to_ship: {
    label: "Ready to Ship",
    className: "bg-cyan-50 text-cyan-700 border-cyan-100",
  },
  shipped: {
    label: "Shipped",
    className: "bg-sky-50 text-sky-700 border-sky-100",
  },
  completed: {
    label: "Completed",
    className: "bg-muted text-muted-foreground",
  },
};

const taskStatusConfig: Record<
  TaskStatus,
  { label: string; className: string }
> = {
  pending: {
    label: "Pending",
    className: "bg-muted text-muted-foreground",
  },
  in_progress: {
    label: "In Progress",
    className: "bg-brand-primary/10 text-brand-primary border-brand-primary/15",
  },
  blocked: {
    label: "Blocked",
    className: "bg-red-50 text-red-700 border-red-100",
  },
  done: {
    label: "Done",
    className: "bg-emerald-50 text-emerald-700 border-emerald-100",
  },
};

export function OrderStatusBadge({
  status,
  className,
}: {
  status: OrderStatus;
  className?: string;
}) {
  const config = orderStatusConfig[status];
  return (
    <Badge
      variant="outline"
      className={cn("font-medium border", config.className, className)}
    >
      {config.label}
    </Badge>
  );
}

export function TaskStatusBadge({
  status,
  className,
}: {
  status: TaskStatus;
  className?: string;
}) {
  const config = taskStatusConfig[status];
  return (
    <Badge
      variant="outline"
      className={cn("font-medium border", config.className, className)}
    >
      {config.label}
    </Badge>
  );
}

export function RushBadge() {
  return (
    <Badge className="bg-orange-500 hover:bg-orange-500 text-white border-0">
      Rush
    </Badge>
  );
}

const estimateStatusConfig: Record<
  OrderEstimateStatus,
  { label: string; className: string }
> = {
  pending: {
    label: "Pending",
    className: "bg-muted text-muted-foreground",
  },
  sent: {
    label: "Sent to client",
    className: "bg-brand-primary/10 text-brand-primary border-brand-primary/15",
  },
  revision: {
    label: "Revision",
    className: "bg-amber-50 text-amber-700 border-amber-100",
  },
  approved: {
    label: "Approved",
    className: "bg-emerald-50 text-emerald-700 border-emerald-100",
  },
};

export function EstimateStatusBadge({
  status,
  className,
}: {
  status: OrderEstimateStatus;
  className?: string;
}) {
  const config = estimateStatusConfig[status];
  return (
    <Badge
      variant="outline"
      className={cn("font-medium border", config.className, className)}
    >
      {config.label}
    </Badge>
  );
}
