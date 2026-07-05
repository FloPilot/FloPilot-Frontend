"use client";

import {
  Archive,
  ArchiveRestore,
  MapPin,
  Pencil,
  RefreshCw,
  StickyNote,
  Tag,
  UserPlus,
} from "lucide-react";
import {
  buildCustomerActivityFeed,
  customerActivityActorLabel,
  formatCustomerActivityActorName,
  formatCustomerActivityTime,
  groupCustomerActivityByDate,
  inferCustomerActivityActorKind,
  shouldShowCustomerActivityActorName,
} from "@/lib/customer-activity";
import type { Customer, CustomerActivityEvent } from "@/types";
import { dashboardInsetSurfaceClass } from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";

const ICON_MAP: Record<
  CustomerActivityEvent["type"],
  React.ComponentType<{ className?: string }>
> = {
  created: UserPlus,
  updated: Pencil,
  archived: Archive,
  restored: ArchiveRestore,
  note: StickyNote,
  branding_updated: RefreshCw,
  portal_updated: RefreshCw,
  shipping_location_added: MapPin,
  shipping_location_updated: MapPin,
  shipping_location_removed: MapPin,
  pricing_note_updated: Tag,
  pricing_sheet_added: Tag,
  pricing_sheet_updated: Tag,
  pricing_sheet_removed: Tag,
};

const ICON_STYLES: Record<CustomerActivityEvent["type"], string> = {
  created: "bg-[#e8f5ee] text-[#0d5c2e]",
  updated: "bg-[#eef1ff] text-brand-primary",
  archived: "bg-[#f3f3f3] text-[#616161]",
  restored: "bg-[#e8f5ee] text-[#0d5c2e]",
  note: "bg-[#f8f4ff] text-[#6b4c9a]",
  branding_updated: "bg-[#eef1ff] text-brand-primary",
  portal_updated: "bg-[#fff5ea] text-[#8a6116]",
  shipping_location_added: "bg-[#eef1ff] text-brand-primary",
  shipping_location_updated: "bg-[#eef1ff] text-brand-primary",
  shipping_location_removed: "bg-[#fdf2f2] text-[#b42318]",
  pricing_note_updated: "bg-[#eef1ff] text-brand-primary",
  pricing_sheet_added: "bg-[#e8f5ee] text-[#0d5c2e]",
  pricing_sheet_updated: "bg-[#eef1ff] text-brand-primary",
  pricing_sheet_removed: "bg-[#fdf2f2] text-[#b42318]",
};

const ACTOR_STYLES: Record<
  ReturnType<typeof inferCustomerActivityActorKind>,
  string
> = {
  customer: "bg-[#fff5ea] text-[#8a6116]",
  shop: "bg-[#eef1ff] text-brand-primary",
  system: "bg-[#f3f3f3] text-[#616161]",
};

function ActivityIcon({ type }: { type: CustomerActivityEvent["type"] }) {
  const Icon = ICON_MAP[type] ?? RefreshCw;
  return (
    <div
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-full",
        ICON_STYLES[type] ?? ICON_STYLES.updated
      )}
    >
      <Icon className="size-3.5" />
    </div>
  );
}

function ActivityRow({
  customer,
  event,
  isLast,
}: {
  customer: Customer;
  event: CustomerActivityEvent;
  isLast: boolean;
}) {
  const actorKind = inferCustomerActivityActorKind(customer, event);
  const actorName = formatCustomerActivityActorName(customer, event);
  const showActorName = shouldShowCustomerActivityActorName(customer, event);

  return (
    <li className="relative flex gap-3 pb-5">
      {!isLast ? (
        <span
          aria-hidden
          className="absolute left-4 top-9 bottom-0 w-px -translate-x-1/2 bg-[#ebebeb]"
        />
      ) : null}
      <ActivityIcon type={event.type} />
      <div className="min-w-0 flex-1 pt-0.5">
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
          <p className="text-[13px] font-semibold text-[#303030]">
            {event.title}
          </p>
          <time className="shrink-0 text-[11px] text-[#8a8a8a]">
            {formatCustomerActivityTime(event.timestamp)}
          </time>
        </div>
        {event.detail ? (
          <p className="mt-1 text-[12px] leading-relaxed text-[#616161]">
            {event.detail}
          </p>
        ) : null}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
              ACTOR_STYLES[actorKind]
            )}
          >
            {customerActivityActorLabel(actorKind)}
          </span>
          {showActorName ? (
            <span className="text-[11px] font-medium text-[#303030]">
              {actorName}
            </span>
          ) : null}
        </div>
      </div>
    </li>
  );
}

export function CustomerActivityFeed({
  customer,
  limit,
  compact,
  variant = compact ? "compact" : "card",
}: {
  customer: Customer;
  limit?: number;
  compact?: boolean;
  variant?: "card" | "compact" | "timeline";
}) {
  const resolvedVariant = variant ?? (compact ? "compact" : "card");
  const events = buildCustomerActivityFeed(customer).slice(0, limit ?? undefined);

  if (events.length === 0) {
    return (
      <div className={cn(dashboardInsetSurfaceClass, "px-4 py-8 text-center")}>
        <p className="text-[13px] text-[#616161]">
          Activity will appear here as you update this customer — contact
          changes, shipping locations, negotiated pricing, and more.
        </p>
      </div>
    );
  }

  if (resolvedVariant === "timeline") {
    const groups = groupCustomerActivityByDate(events);

    return (
      <div className="space-y-6">
        {groups.map((group) => (
          <section key={group.label}>
            <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
              {group.label}
            </h3>
            <ul>
              {group.events.map((event, index) => (
                <ActivityRow
                  key={event.id}
                  customer={customer}
                  event={event}
                  isLast={index === group.events.length - 1}
                />
              ))}
            </ul>
          </section>
        ))}
      </div>
    );
  }

  const content = (
    <ul
      className={cn(
        "space-y-0",
        resolvedVariant === "compact" && "max-h-64 overflow-y-auto"
      )}
    >
      {events.map((event, index) => (
        <li
          key={event.id}
          className={cn(
            "flex gap-3 py-3",
            index < events.length - 1 && "border-b border-[#ebebeb]"
          )}
        >
          <ActivityIcon type={event.type} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-[13px] font-medium text-[#303030]">
                {event.title}
              </p>
              <time className="shrink-0 text-[11px] text-[#8a8a8a]">
                {formatCustomerActivityTime(event.timestamp)}
              </time>
            </div>
            {event.detail ? (
              <p className="mt-0.5 line-clamp-2 text-[12px] text-[#616161]">
                {event.detail}
              </p>
            ) : null}
            {shouldShowCustomerActivityActorName(customer, event) ? (
              <p className="mt-0.5 text-[11px] font-medium text-[#303030]">
                {formatCustomerActivityActorName(customer, event)}
              </p>
            ) : (
              <p className="mt-0.5 text-[11px] text-[#8a8a8a]">Team</p>
            )}
          </div>
        </li>
      ))}
    </ul>
  );

  if (resolvedVariant === "compact") return content;

  return (
    <div className={cn(dashboardInsetSurfaceClass, "p-4")}>{content}</div>
  );
}
