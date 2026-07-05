"use client";

import {
  Bell,
  CreditCard,
  ImageIcon,
  ListChecks,
  MessageSquare,
  Ticket,
  Wrench,
} from "lucide-react";
import {
  NOTIFICATION_TYPE_LABELS,
  getNotificationCompany,
} from "@/lib/notifications-ui";
import type { StaffNotification, StaffNotificationType } from "@/types";
import { cn } from "@/lib/utils";
import { formatDistanceToNow, parseISO } from "date-fns";

function NotificationIcon({ type }: { type: StaffNotificationType }) {
  const className = "size-4 shrink-0 text-[#616161]";
  switch (type) {
    case "order_message":
      return <MessageSquare className={className} strokeWidth={1.75} />;
    case "payment":
      return <CreditCard className={className} strokeWidth={1.75} />;
    case "artwork":
      return <ImageIcon className={className} strokeWidth={1.75} />;
    case "machine_issue":
      return <Wrench className={className} strokeWidth={1.75} />;
    case "support_ticket":
      return <Ticket className={className} strokeWidth={1.75} />;
    case "task_assigned":
      return <ListChecks className={className} strokeWidth={1.75} />;
    default:
      return <Bell className={className} strokeWidth={1.75} />;
  }
}

function formatTimeAgo(value: string): string {
  try {
    const date = parseISO(value);
    if (Number.isNaN(date.getTime())) return "";
    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return "";
  }
}

export function NotificationListItem({
  notification,
  onSelect,
  compact = false,
  className,
}: {
  notification: StaffNotification;
  onSelect?: () => void;
  compact?: boolean;
  className?: string;
}) {
  const company = getNotificationCompany(notification);
  const timeAgo = formatTimeAgo(notification.createdAt);
  const Wrapper = onSelect ? "button" : "div";

  return (
    <Wrapper
      type={onSelect ? "button" : undefined}
      onClick={onSelect}
      className={cn(
        "flex w-full items-start gap-3 rounded-lg border border-transparent text-left transition-colors",
        compact ? "px-3 py-2.5" : "px-4 py-3.5",
        !notification.read && "bg-[#f6f6f7]",
        onSelect && "cursor-pointer hover:border-[#e3e3e3] hover:bg-[#fafafa]",
        className
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex shrink-0 items-center justify-center rounded-md bg-[#f1f1f1]",
          compact ? "size-8" : "size-9"
        )}
      >
        <NotificationIcon type={notification.type} />
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "truncate font-medium text-[#303030]",
              compact ? "text-[13px]" : "text-[14px]"
            )}
          >
            {notification.title}
          </span>
          {!compact ? (
            <span className="inline-flex items-center rounded-md border border-[#e3e3e3] bg-white px-1.5 py-0.5 text-[10px] font-medium text-[#616161]">
              {NOTIFICATION_TYPE_LABELS[notification.type]}
            </span>
          ) : null}
        </span>

        {notification.body ? (
          <span
            className={cn(
              "mt-0.5 block text-[#616161]",
              compact
                ? "line-clamp-2 text-xs"
                : "line-clamp-2 text-[13px] leading-relaxed"
            )}
          >
            {notification.body}
          </span>
        ) : null}

        <span className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-[#8a8a8a]">
          {timeAgo ? <span>{timeAgo}</span> : null}
          {company ? (
            <>
              {timeAgo ? <span aria-hidden>·</span> : null}
              <span className="truncate">{company}</span>
            </>
          ) : null}
          {notification.actorName ? (
            <>
              <span aria-hidden>·</span>
              <span className="truncate">{notification.actorName}</span>
            </>
          ) : null}
        </span>
      </span>

      {!notification.read ? (
        <span
          className="mt-2 size-2 shrink-0 rounded-full bg-[#2c6ecb]"
          aria-label="Unread"
        />
      ) : (
        <span className="mt-2 size-2 shrink-0" aria-hidden />
      )}
    </Wrapper>
  );
}
