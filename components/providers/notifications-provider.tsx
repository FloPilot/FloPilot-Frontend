"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/components/providers/auth-provider";
import {
  listNotifications,
  listTasks,
  markAllNotificationsRead,
  markNotificationRead,
  type ManualTask,
} from "@/lib/api";
import type { StaffNotification } from "@/types";

type NotificationsContextValue = {
  notifications: StaffNotification[];
  assignedTasks: ManualTask[];
  unreadCount: number;
  loading: boolean;
  refresh: () => Promise<void>;
  markRead: (notificationId: string) => Promise<void>;
  markAllRead: () => Promise<void>;
};

const NotificationsContext = createContext<NotificationsContextValue | null>(
  null
);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { profile, getIdToken } = useAuth();
  const [notifications, setNotifications] = useState<StaffNotification[]>([]);
  const [assignedTasks, setAssignedTasks] = useState<ManualTask[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const isStaff = profile?.type === "staff";
  const tenantId = profile?.type === "staff" ? profile.tenant.id : null;
  const userId = profile?.type === "staff" ? profile.user.id : null;

  const refresh = useCallback(async () => {
    if (!isStaff) {
      setNotifications([]);
      setAssignedTasks([]);
      setUnreadCount(0);
      return;
    }

    setLoading(true);
    try {
      const token = await getIdToken();
      if (!token) return;

      const [notifRes, taskRes] = await Promise.all([
        listNotifications(token, 100),
        listTasks(token).catch(() => ({ tasks: [] as ManualTask[] })),
      ]);

      setNotifications(notifRes.notifications);
      setUnreadCount(notifRes.unreadCount);

      const openAssigned = taskRes.tasks.filter(
        (task) =>
          task.assigneeId === userId &&
          task.status !== "done"
      );
      setAssignedTasks(openAssigned);
    } catch {
      // Keep last known notifications on transient errors.
    } finally {
      setLoading(false);
    }
  }, [getIdToken, isStaff, tenantId, userId]);

  const markRead = useCallback(
    async (notificationId: string) => {
      if (!isStaff) return;

      setNotifications((current) =>
        current.map((item) =>
          item.id === notificationId
            ? { ...item, read: true, readAt: new Date().toISOString() }
            : item
        )
      );
      setUnreadCount((count) => Math.max(0, count - 1));

      try {
        const token = await getIdToken();
        if (!token) return;
        await markNotificationRead(token, notificationId);
      } catch {
        void refresh();
      }
    },
    [getIdToken, isStaff, refresh]
  );

  const markAllRead = useCallback(async () => {
    if (!isStaff) return;

    setNotifications((current) =>
      current.map((item) => ({
        ...item,
        read: true,
        readAt: item.readAt || new Date().toISOString(),
      }))
    );
    setUnreadCount(0);

    try {
      const token = await getIdToken();
      if (!token) return;
      await markAllNotificationsRead(token);
    } catch {
      void refresh();
    }
  }, [getIdToken, isStaff, refresh]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!isStaff) return;

    const interval = window.setInterval(() => {
      void refresh();
    }, 60_000);

    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [isStaff, refresh]);

  const value = useMemo(
    () => ({
      notifications,
      assignedTasks,
      unreadCount,
      loading,
      refresh,
      markRead,
      markAllRead,
    }),
    [notifications, assignedTasks, unreadCount, loading, refresh, markRead, markAllRead]
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error(
      "useNotifications must be used within NotificationsProvider"
    );
  }
  return context;
}
