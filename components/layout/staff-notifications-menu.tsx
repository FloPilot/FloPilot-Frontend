"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Bell, CalendarClock, ListChecks } from "lucide-react";
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
import { formatDate } from "@/lib/format";
import { sortNotifications } from "@/lib/notifications-ui";
import { staffNav } from "@/lib/staff-nav-theme";
import type { ManualTask } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { StaffNotification } from "@/types";

const DROPDOWN_PREVIEW_LIMIT = 6;

function TaskDropdownItem({ task }: { task: ManualTask }) {
  const dueLabel = task.dueDate ? formatDate(task.dueDate) : null;
  const overdue =
    task.dueDate &&
    task.status !== "done" &&
    new Date(task.dueDate) < new Date(new Date().toDateString());

  return (
    <div className="flex w-full items-start gap-3 px-3 py-2.5 text-left">
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-[#f4f7fd] text-[#2c6ecb]">
        <ListChecks className="size-4" strokeWidth={1.75} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-medium text-[#303030]">
          {task.title}
        </span>
        {task.description ? (
          <span className="mt-0.5 block line-clamp-1 text-xs text-[#616161]">
            {task.description}
          </span>
        ) : null}
        <span className="mt-1.5 flex flex-wrap items-center gap-x-2 text-[11px] text-[#8a8a8a]">
          {dueLabel ? (
            <span
              className={cn(
                "inline-flex items-center gap-1",
                overdue && "font-medium text-[#8f1f1f]"
              )}
            >
              {overdue ? <CalendarClock className="size-3" /> : null}
              Due {dueLabel}
            </span>
          ) : (
            <span>No due date</span>
          )}
          {task.createdByName ? (
            <>
              <span aria-hidden>·</span>
              <span className="truncate">From {task.createdByName}</span>
            </>
          ) : null}
        </span>
      </span>
      <span className="mt-2 size-2 shrink-0 rounded-full bg-[#2c6ecb]" />
    </div>
  );
}

export function StaffNotificationsMenu({
  triggerClassName,
}: {
  triggerClassName?: string;
}) {
  const router = useRouter();
  const {
    notifications,
    assignedTasks,
    unreadCount,
    loading,
    markRead,
    markAllRead,
    refresh,
  } = useNotifications();

  const generalNotifications = useMemo(
    () =>
      sortNotifications(
        notifications.filter((item) => item.type !== "task_assigned")
      ),
    [notifications]
  );

  const unreadGeneral = useMemo(
    () => generalNotifications.filter((item) => !item.read),
    [generalNotifications]
  );

  const previewTasks = assignedTasks.slice(0, DROPDOWN_PREVIEW_LIMIT);
  const previewGeneral = unreadGeneral.slice(0, DROPDOWN_PREVIEW_LIMIT);

  const hasMoreTasks = assignedTasks.length > previewTasks.length;
  const hasMoreGeneral = unreadGeneral.length > previewGeneral.length;
  const isEmpty =
    !loading &&
    previewTasks.length === 0 &&
    previewGeneral.length === 0;

  const badgeCount = unreadGeneral.length + assignedTasks.length;

  const handleNotificationSelect = async (notification: StaffNotification) => {
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
          badgeCount > 0
            ? `${badgeCount} unread notifications and tasks`
            : "Notifications"
        }
      >
        <Bell className="size-[18px]" strokeWidth={1.75} />
        {badgeCount > 0 && (
          <span className="pointer-events-none absolute right-1 top-1 flex min-w-[16px] items-center justify-center rounded-full bg-[#e51c00] px-1 text-[10px] font-semibold leading-none text-white ring-2 ring-black">
            {badgeCount > 9 ? "9+" : badgeCount}
          </span>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-[min(100vw-2rem,400px)] p-0"
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

        <div className="max-h-[min(70vh,520px)] overflow-y-auto">
          {loading && notifications.length === 0 && assignedTasks.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-[#616161]">
              Loading…
            </p>
          ) : isEmpty ? (
            <div className="flex flex-col items-center px-4 py-10 text-center">
              <div className="flex size-10 items-center justify-center rounded-xl bg-[#f4f7fd] text-[#2c6ecb]">
                <Bell className="size-4" strokeWidth={1.75} />
              </div>
              <p className="mt-3 text-sm font-medium text-[#303030]">
                You&apos;re all caught up
              </p>
              <p className="mt-1 text-xs text-[#616161]">
                Assigned tasks and shop alerts will appear here.
              </p>
            </div>
          ) : (
            <>
              {previewTasks.length > 0 ? (
                <div className="border-b border-[#ebebeb] p-1">
                  <div className="flex items-center justify-between px-3 py-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-[#616161]">
                      Tasks
                    </p>
                    <span className="text-[11px] tabular-nums text-[#8a8a8a]">
                      {assignedTasks.length}
                    </span>
                  </div>
                  <DropdownMenuGroup className="space-y-0.5">
                    {previewTasks.map((task) => (
                      <DropdownMenuItem
                        key={task.id}
                        className="cursor-pointer p-0 focus:bg-transparent"
                        onClick={() => router.push("/app/tasks?assignee=me")}
                      >
                        <TaskDropdownItem task={task} />
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuGroup>
                  {hasMoreTasks ? (
                    <button
                      type="button"
                      onClick={() => router.push("/app/tasks?assignee=me")}
                      className="mx-2 mb-2 mt-1 block w-[calc(100%-1rem)] rounded-md py-1.5 text-center text-xs font-medium text-[#2c6ecb] hover:bg-[#f4f7fd]"
                    >
                      View all {assignedTasks.length} assigned tasks
                    </button>
                  ) : null}
                </div>
              ) : null}

              {previewGeneral.length > 0 ? (
                <div className="p-1">
                  <div className="flex items-center justify-between px-3 py-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-[#616161]">
                      General
                    </p>
                    <span className="text-[11px] tabular-nums text-[#8a8a8a]">
                      {unreadGeneral.length} unread
                    </span>
                  </div>
                  <DropdownMenuGroup className="space-y-0.5">
                    {previewGeneral.map((notification) => (
                      <DropdownMenuItem
                        key={notification.id}
                        className="cursor-pointer p-0 focus:bg-transparent"
                        onClick={() => void handleNotificationSelect(notification)}
                      >
                        <NotificationListItem
                          notification={notification}
                          compact
                          className="w-full border-0 hover:bg-[#fafafa]"
                        />
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuGroup>
                </div>
              ) : null}
            </>
          )}
        </div>

        <DropdownMenuSeparator className="m-0" />
        <DropdownMenuGroup className="p-2">
          <DropdownMenuItem
            className="justify-center text-xs font-medium text-[#616161]"
            onClick={() => router.push("/app/notifications")}
          >
            {hasMoreGeneral
              ? `View all ${unreadGeneral.length} unread notifications`
              : "View all notifications"}
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function StaffNotificationsNavBadge() {
  const { notifications, assignedTasks } = useNotifications();
  const unreadGeneral = notifications.filter(
    (item) => !item.read && item.type !== "task_assigned"
  ).length;
  const badgeCount = unreadGeneral + assignedTasks.length;
  if (badgeCount <= 0) return null;

  return (
    <span className="ml-auto inline-flex min-w-[18px] items-center justify-center rounded-full bg-[#e51c00] px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
      {badgeCount > 99 ? "99+" : badgeCount}
    </span>
  );
}
