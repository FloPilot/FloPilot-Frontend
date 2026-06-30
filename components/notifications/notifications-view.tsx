"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, Search } from "lucide-react";
import { NotificationListItem } from "@/components/notifications/notification-list-item";
import { useNotifications } from "@/components/providers/notifications-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  dashboardCardClass,
  dashboardControlClass,
  dashboardInsetSurfaceClass,
  dashboardKpiCardClass,
  dashboardKpiTitleClass,
  dashboardPrimaryButtonClass,
  dashboardSectionTitleClass,
  dashboardTaskDetailClass,
  dashboardValueClass,
} from "@/lib/dashboard-styles";
import {
  NOTIFICATION_TYPE_LABELS,
  countNotificationScopes,
  filterNotificationsByCompany,
  filterNotificationsByScope,
  filterNotificationsByType,
  getNotificationCompanyOptions,
  searchNotifications,
  sortNotifications,
  type NotificationScope,
} from "@/lib/notifications-ui";
import type { StaffNotificationType } from "@/types";
import { cn } from "@/lib/utils";

const SCOPE_TABS: { value: NotificationScope; label: string }[] = [
  { value: "unread", label: "Unread" },
  { value: "read", label: "Read" },
  { value: "all", label: "All" },
];

function ScopeChip({
  active,
  count,
  onClick,
  children,
}: {
  active: boolean;
  count: number;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        dashboardControlClass,
        "h-8 px-2.5 text-[12px]",
        active && "border-[#2c6ecb] bg-[#f4f7fd] text-[#2c6ecb]"
      )}
    >
      {children}
      <span className="tabular-nums text-[#8a8a8a]">{count}</span>
    </button>
  );
}

export function NotificationsView() {
  const router = useRouter();
  const { notifications, unreadCount, loading, markRead, markAllRead, refresh } =
    useNotifications();

  const [scope, setScope] = useState<NotificationScope>("unread");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<StaffNotificationType | "all">(
    "all"
  );
  const [companyFilter, setCompanyFilter] = useState("all");

  const sorted = useMemo(() => sortNotifications(notifications), [notifications]);
  const scopeCounts = useMemo(
    () => countNotificationScopes(notifications),
    [notifications]
  );
  const companyOptions = useMemo(
    () => getNotificationCompanyOptions(notifications),
    [notifications]
  );

  const filteredNotifications = useMemo(() => {
    let items = filterNotificationsByScope(sorted, scope);
    items = filterNotificationsByType(items, typeFilter);
    items = filterNotificationsByCompany(items, companyFilter);
    items = searchNotifications(items, search);
    return items;
  }, [sorted, scope, typeFilter, companyFilter, search]);

  const handleSelect = async (notification: {
    id: string;
    read: boolean;
    href?: string;
  }) => {
    if (!notification.read) {
      await markRead(notification.id);
    }
    if (notification.href) {
      router.push(notification.href);
    }
  };

  return (
    <main className="flex w-full flex-1 flex-col gap-4 p-4 sm:gap-5 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className={dashboardSectionTitleClass}>Notifications</h1>
          <p className={cn("mt-1 max-w-2xl", dashboardTaskDetailClass)}>
            Customer messages, order updates, payments, and shop alerts in one
            place.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {unreadCount > 0 ? (
            <button
              type="button"
              className={dashboardControlClass}
              onClick={() => void markAllRead()}
            >
              <CheckCheck className="size-3.5" />
              Mark all read
            </button>
          ) : null}
          <Button
            type="button"
            className={dashboardPrimaryButtonClass}
            onClick={() => void refresh()}
          >
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div
          className={cn(
            dashboardKpiCardClass,
            "min-h-[112px] border border-[#c4d7f2] bg-[#f4f7fd]"
          )}
        >
          <p className={dashboardKpiTitleClass}>Unread</p>
          <p className={cn(dashboardValueClass, "mt-2.5 text-[#2c6ecb]")}>
            {scopeCounts.unread}
          </p>
          <p className="mt-1.5 text-xs leading-snug text-[#616161]">
            Needs your attention
          </p>
        </div>
        <div
          className={cn(
            dashboardKpiCardClass,
            "min-h-[112px] border border-[#e3e3e3] bg-white"
          )}
        >
          <p className={dashboardKpiTitleClass}>Read</p>
          <p className={cn(dashboardValueClass, "mt-2.5")}>{scopeCounts.read}</p>
          <p className="mt-1.5 text-xs leading-snug text-[#616161]">
            Already reviewed
          </p>
        </div>
        <div
          className={cn(
            dashboardKpiCardClass,
            "min-h-[112px] border border-[#e3e3e3] bg-white"
          )}
        >
          <p className={dashboardKpiTitleClass}>All notifications</p>
          <p className={cn(dashboardValueClass, "mt-2.5")}>{scopeCounts.all}</p>
          <p className="mt-1.5 text-xs leading-snug text-[#616161]">
            Loaded in this view
          </p>
        </div>
      </div>

      <section className={dashboardCardClass}>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#ebebeb] px-4 py-3 sm:px-5">
          <div>
            <h2 className="text-[15px] font-semibold text-[#303030]">Inbox</h2>
            <p className="mt-0.5 text-[13px] text-[#616161]">
              {filteredNotifications.length} result
              {filteredNotifications.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        <div className={cn(dashboardInsetSurfaceClass, "m-4 overflow-visible sm:m-5")}>
          <div className="flex flex-wrap items-center gap-2 border-b border-[#ebebeb] px-3 py-2.5">
            {SCOPE_TABS.map((tab) => (
              <ScopeChip
                key={tab.value}
                active={scope === tab.value}
                count={scopeCounts[tab.value]}
                onClick={() => setScope(tab.value)}
              >
                {tab.label}
              </ScopeChip>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#ebebeb] bg-[#fafafa] px-3 py-2.5">
            <div className="relative min-w-[220px] flex-1 sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8a8a8a]" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search title, client, person, or type…"
                className={cn(dashboardControlClass, "h-9 w-full pl-9")}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {companyOptions.length > 0 ? (
                <Select
                  value={companyFilter}
                  onValueChange={(value) => setCompanyFilter(value ?? "all")}
                >
                  <SelectTrigger
                    className={cn(dashboardControlClass, "h-9 w-[170px]")}
                  >
                    <SelectValue placeholder="All clients" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All clients</SelectItem>
                    {companyOptions.map((company) => (
                      <SelectItem key={company} value={company}>
                        {company}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : null}

              <Select
                value={typeFilter}
                onValueChange={(value) =>
                  setTypeFilter((value ?? "all") as StaffNotificationType | "all")
                }
              >
                <SelectTrigger
                  className={cn(dashboardControlClass, "h-9 w-[170px]")}
                >
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  {(
                    Object.entries(NOTIFICATION_TYPE_LABELS) as [
                      StaffNotificationType,
                      string,
                    ][]
                  ).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="divide-y divide-[#ebebeb]">
            {loading && notifications.length === 0 ? (
              <div className="px-4 py-16 text-center text-sm text-[#616161]">
                Loading notifications…
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="flex flex-col items-center px-4 py-16 text-center">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-[#f4f7fd] text-[#2c6ecb]">
                  <Bell className="size-5" strokeWidth={1.75} />
                </div>
                <p className="mt-4 text-sm font-medium text-[#303030]">
                  {scope === "unread" && notifications.length > 0
                    ? "You're all caught up"
                    : notifications.length === 0
                      ? "You're all caught up"
                      : "No notifications match your filters"}
                </p>
                <p className="mt-1 max-w-sm text-sm text-[#616161]">
                  {scope === "unread" && notifications.length > 0
                    ? "No unread notifications right now. Switch to Read or All to review earlier alerts."
                    : notifications.length === 0
                      ? "New customer messages, order updates, and shop alerts will show up here."
                      : "Try a different search term or filter."}
                </p>
              </div>
            ) : (
              filteredNotifications.map((notification) => (
                <NotificationListItem
                  key={notification.id}
                  notification={notification}
                  onSelect={() => void handleSelect(notification)}
                />
              ))
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
