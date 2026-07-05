import type { StaffNotification, StaffNotificationType } from "@/types";

export type NotificationScope = "unread" | "read" | "all";

export const NOTIFICATION_TYPE_LABELS: Record<StaffNotificationType, string> = {
  order_message: "Customer message",
  order_status: "Order update",
  artwork: "Artwork",
  payment: "Payment",
  machine_issue: "Machine issue",
  support_ticket: "Support ticket",
  task_assigned: "Task assigned",
  general: "General",
};

export function getNotificationCompany(
  notification: StaffNotification
): string {
  return (
    notification.metadata?.company?.trim() ||
    notification.metadata?.orderNumber?.trim() ||
    ""
  );
}

export function sortNotifications(
  notifications: StaffNotification[]
): StaffNotification[] {
  return [...notifications].sort((a, b) => {
    if (a.read !== b.read) return a.read ? 1 : -1;
    return (
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  });
}

export function filterNotificationsByScope(
  notifications: StaffNotification[],
  scope: NotificationScope
): StaffNotification[] {
  if (scope === "unread") {
    return notifications.filter((item) => !item.read);
  }
  if (scope === "read") {
    return notifications.filter((item) => item.read);
  }
  return notifications;
}

export function searchNotifications(
  notifications: StaffNotification[],
  query: string
): StaffNotification[] {
  const q = query.trim().toLowerCase();
  if (!q) return notifications;

  return notifications.filter((item) => {
    const company = getNotificationCompany(item).toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      item.body.toLowerCase().includes(q) ||
      item.actorName.toLowerCase().includes(q) ||
      company.includes(q) ||
      NOTIFICATION_TYPE_LABELS[item.type].toLowerCase().includes(q)
    );
  });
}

export function filterNotificationsByType(
  notifications: StaffNotification[],
  type: StaffNotificationType | "all"
): StaffNotification[] {
  if (type === "all") return notifications;
  return notifications.filter((item) => item.type === type);
}

export function filterNotificationsByCompany(
  notifications: StaffNotification[],
  company: string
): StaffNotification[] {
  if (company === "all") return notifications;
  return notifications.filter(
    (item) => getNotificationCompany(item) === company
  );
}

export function getNotificationCompanyOptions(
  notifications: StaffNotification[]
): string[] {
  const companies = new Set<string>();
  for (const item of notifications) {
    const company = getNotificationCompany(item);
    if (company) companies.add(company);
  }
  return [...companies].sort((a, b) => a.localeCompare(b));
}

export function countNotificationScopes(notifications: StaffNotification[]) {
  const unread = notifications.filter((item) => !item.read).length;
  return {
    all: notifications.length,
    unread,
    read: notifications.length - unread,
  };
}
