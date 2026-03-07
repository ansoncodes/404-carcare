"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { listNotifications } from "@/services/notifications.service";
import { useNotificationStore } from "@/store/notificationStore";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useAuthStore } from "@/store/authStore";
import type { NotificationWsEvent } from "@/types/notification.types";

export function useNotifications() {
  const userId = useAuthStore((state) => state.user?.id);
  const setList = useNotificationStore((state) => state.setList);
  const setUnreadCount = useNotificationStore((state) => state.setUnreadCount);
  const pushNotification = useNotificationStore((state) => state.pushNotification);
  const reset = useNotificationStore((state) => state.reset);

  const query = useQuery({
    queryKey: ["notifications", userId],
    queryFn: listNotifications,
    enabled: Boolean(userId),
  });

  useEffect(() => {
    reset();
  }, [reset, userId]);

  useEffect(() => {
    if (!userId) {
      return;
    }
    if (query.data) {
      setList(query.data);
    }
  }, [query.data, reset, setList, userId]);

  useWebSocket({
    path: "/ws/notifications/",
    enabled: Boolean(userId),
    onMessage: (payload) => {
      const event = payload as NotificationWsEvent;
      if (event.type === "unread_count" && typeof event.unread_count === "number") {
        setUnreadCount(event.unread_count);
        return;
      }

      if (event.type === "new_notification") {
        if (typeof event.unread_count === "number") {
          setUnreadCount(event.unread_count);
        }
        if (event.notification_id && event.title && event.body && event.notification_type) {
          pushNotification({
            id: event.notification_id,
            booking: event.booking_id ?? null,
            chat_room: event.chat_room_id ?? null,
            notification_type: event.notification_type,
            title: event.title,
            body: event.body,
            event_data: event.event_data ?? {},
            target_url: event.target_url ?? "/notifications",
            is_read: false,
            read_at: null,
            created_at: event.created_at ?? new Date().toISOString(),
          });
        }
      }
    },
  });

  return query;
}
