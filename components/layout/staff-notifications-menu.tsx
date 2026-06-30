"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { NotificationListItem } from "@/components/notifications/notification-list-item";
import { useNotifications } from "@/components/providers/notifications-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { sortNotifications } from "@/lib/notifications-ui";
import { staffNav } from "@/lib/staff-nav-theme";
import { cn } from "@/lib/utils";
import type { StaffNotification } from "@/types";

const DROPDOWN_PREVIEW_LIMIT = 8;

export function StaffNotificationsMenu({
  triggerClassName,
}: {
  triggerClassName?: string;
}) {
  const router = useRouter();
  const { notifications, unreadCount, loading, markRead, markAllRead, refresh } =
    useNotifications();

  const unreadNotifications = useMemo(
    () => sortNotifications(notifications.filter((item) => !item.read)),
    [notifications]
  );

  const previewNotifications = unreadNotifications.slice(
    0,
    DROPDOWN_PREVIEW_LIMIT
  );
  const hasMoreUnread = unreadNotifications.length > previewNotifications.length;

  const handleSelect = async (notification: StaffNotification) => {
    if (!notification.read) {
      await markRead(notification.id);
    }
    if (notification.href) {
      router.push(notification.href);
    }
  };

  return (
    <DropdownMenu
      onOpenChange={(open) => {
        if (open) void refresh();
      }}
    >
      <DropdownMenuTrigger
        className={cn(
          "relative flex size-8 items-center justify-center rounded-md outline-none transition-colors",
          staffNav.topBarIcon,
          triggerClassName
        )}
        aria-label={
          unreadCount > 0
            ? `${unreadCount} unread notifications`
            : "Notifications"
        }
      >
        <Bell className="size-[18px]" strokeWidth={1.75} />
        {unreadCount > 0 && (
          <span className="pointer-events-none absolute right-1 top-1 flex min-w-[16px] items-center justify-center rounded-full bg-[#e51c00] px-1 text-[10px] font-semibold leading-none text-white ring-2 ring-black">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-[min(100vw-2rem,380px)] p-0"
      >
        <div className="flex items-center justify-between border-b border-[#e3e3e3] px-4 py-3">
          <p className="text-sm font-semibold text-[#303030]">Notifications</p>
          {unreadCount > 0 ? (
            <button
              type="button"
              onClick={() => void markAllRead()}
              className="text-xs font-medium text-[#2c6ecb] hover:underline"
            >
              Mark all read
            </button>
          ) : null}
        </div>

        <div className="max-h-[min(60vh,420px)] overflow-y-auto p-1">
          {loading && notifications.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-[#616161]">
              Loading notifications…
            </p>
          ) : previewNotifications.length === 0 ? (
            <div className="flex flex-col items-center px-4 py-10 text-center">
              <div className="flex size-10 items-center justify-center rounded-xl bg-[#f4f7fd] text-[#2c6ecb]">
                <Bell className="size-4" strokeWidth={1.75} />
              </div>
              <p className="mt-3 text-sm font-medium text-[#303030]">
                You&apos;re all caught up
              </p>
              <p className="mt-1 text-xs text-[#616161]">
                {notifications.some((item) => item.read)
                  ? "Read notifications live on the Notifications page."
                  : "New alerts will appear here when something needs attention."}
              </p>
            </div>
          ) : (
            <DropdownMenuGroup className="space-y-0.5">
              {previewNotifications.map((notification) => (
                <DropdownMenuItem
                  key={notification.id}
                  className="cursor-pointer p-0 focus:bg-transparent"
                  onClick={() => void handleSelect(notification)}
                >
                  <NotificationListItem
                    notification={notification}
                    compact
                    className="w-full border-0 hover:bg-[#fafafa]"
                  />
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          )}
        </div>

        <DropdownMenuSeparator className="m-0" />
        <DropdownMenuGroup className="p-2">
          <DropdownMenuItem
            className="justify-center text-xs font-medium text-[#616161]"
            onClick={() => router.push("/app/notifications")}
          >
            {hasMoreUnread
              ? `View all ${unreadNotifications.length} unread`
              : "View all notifications"}
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function StaffNotificationsNavBadge() {
  const { unreadCount } = useNotifications();
  if (unreadCount <= 0) return null;

  return (
    <span className="ml-auto inline-flex min-w-[18px] items-center justify-center rounded-full bg-[#e51c00] px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
      {unreadCount > 99 ? "99+" : unreadCount}
    </span>
  );
}
