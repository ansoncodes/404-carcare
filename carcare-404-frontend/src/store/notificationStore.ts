"use client";

import { create } from "zustand";
import type { Notification } from "@/types/notification.types";

interface NotificationState {
  unreadCount: number;
  list: Notification[];
  setUnreadCount: (count: number) => void;
  setList: (items: Notification[]) => void;
  pushNotification: (item: Notification) => void;
  reset: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  unreadCount: 0,
  list: [],
  setUnreadCount: (count) => set({ unreadCount: count }),
  setList: (items) =>
    set({
      list: items,
      unreadCount: items.filter((item) => !item.is_read).length,
    }),
  pushNotification: (item) => {
    const current = get().list;
    const next = [item, ...current];
    set({
      list: next,
      unreadCount: next.filter((row) => !row.is_read).length,
    });
  },
  reset: () => set({ unreadCount: 0, list: [] }),
}));
