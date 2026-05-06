import { api } from "../client";
import { endpoints } from "../endpoints";

export type MyNotification = {
  id: string;
  title?: string;
  body?: string;
  createdAt?: string;
  readAt?: string | null;
  status?: string;
  data?: Record<string, any>;
  screen?: string;
  type?: string;
};

function asItems<T>(value: any): T[] {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.data?.items)) return value.data.items;
  return [];
}

export async function listMyNotifications(): Promise<MyNotification[]> {
  const res = await api.get(endpoints.notifications.me);
  return asItems<MyNotification>(res.data);
}

export async function getUnreadNotificationsCount(): Promise<number> {
  const res = await api.get(endpoints.notifications.unreadCount);
  const n = Number(res?.data?.count ?? res?.data?.unreadCount ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export async function markNotificationRead(id: string) {
  if (!id) return;
  await api.post(endpoints.notifications.readOne(id));
}

export async function markAllNotificationsRead() {
  await api.post(endpoints.notifications.readAll);
}
