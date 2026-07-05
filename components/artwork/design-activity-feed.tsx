"use client";

import {
  Droplets,
  FileText,
  History,
  RefreshCw,
  Upload,
} from "lucide-react";
import { formatDateTime } from "@/lib/format";
import { dashboardInsetSurfaceClass } from "@/lib/dashboard-styles";
import type { DesignActivityEvent } from "@/types";
import { cn } from "@/lib/utils";

const ICON_MAP: Record<
  DesignActivityEvent["type"],
  React.ComponentType<{ className?: string }>
> = {
  artwork_uploaded: Upload,
  ink_updated: Droplets,
  specs_updated: FileText,
  version_restored: History,
  note: RefreshCw,
};

const ICON_STYLES: Record<DesignActivityEvent["type"], string> = {
  artwork_uploaded: "bg-[#eef1ff] text-brand-primary",
  ink_updated: "bg-[#eef1ff] text-brand-primary",
  specs_updated: "bg-[#fff5ea] text-[#8a6116]",
  version_restored: "bg-[#e8f5ee] text-[#0d5c2e]",
  note: "bg-[#f3f3f3] text-[#616161]",
};

function groupByDate(events: DesignActivityEvent[]) {
  const groups = new Map<string, DesignActivityEvent[]>();
  for (const event of events) {
    const key = new Date(event.timestamp).toLocaleDateString(undefined, {
      weekday: "long",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const list = groups.get(key) ?? [];
    list.push(event);
    groups.set(key, list);
  }
  return [...groups.entries()];
}

export function DesignActivityFeed({
  activity,
}: {
  activity: DesignActivityEvent[];
}) {
  if (!activity.length) {
    return (
      <p className="py-10 text-center text-sm text-[#8a8a8a]">
        No activity yet. Changes to inks, specs, or artwork will show up here.
      </p>
    );
  }

  const groups = groupByDate(activity);

  return (
    <div className="space-y-6">
      {groups.map(([dateLabel, events]) => (
        <section key={dateLabel}>
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
            {dateLabel}
          </p>
          <ul className="space-y-2">
            {events.map((event) => {
              const Icon = ICON_MAP[event.type] ?? RefreshCw;
              return (
                <li
                  key={event.id}
                  className={cn(
                    dashboardInsetSurfaceClass,
                    "flex gap-3 px-3 py-3"
                  )}
                >
                  <div
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-lg",
                      ICON_STYLES[event.type]
                    )}
                  >
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="text-[13px] font-medium text-[#303030]">
                        {event.title}
                      </p>
                      <p className="shrink-0 text-[11px] text-[#8a8a8a]">
                        {formatDateTime(event.timestamp)}
                      </p>
                    </div>
                    {event.detail ? (
                      <p className="mt-0.5 text-[13px] leading-relaxed text-[#616161]">
                        {event.detail}
                      </p>
                    ) : null}
                    {event.author ? (
                      <p className="mt-1 text-[11px] text-[#8a8a8a]">
                        {event.author}
                        {event.source === "order"
                          ? " · from order"
                          : event.source === "system"
                            ? " · system"
                            : ""}
                      </p>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
