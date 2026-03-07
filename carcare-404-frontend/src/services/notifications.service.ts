import api from "@/services/api";
import type { Notification } from "@/types/notification.types";

export async function listNotifications(): Promise<Notification[]> {
  const { data } = await api.get<Notification[]>("/notifications/");
  return data;
}

export async function markNotificationRead(id: string): Promise<{ detail: string }> {
  const { data } = await api.post<{ detail: string }>(`/notifications/${id}/mark-read/`);
  return data;
}

export async function markAllNotificationsRead(): Promise<{ detail: string }> {
  const { data } = await api.post<{ detail: string }>("/notifications/mark-all-read/");
  return data;
}
