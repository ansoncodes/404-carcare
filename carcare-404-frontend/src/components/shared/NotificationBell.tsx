"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import clsx from "clsx";
import { useNotifications } from "@/hooks/useNotifications";
import { useNotificationStore } from "@/store/notificationStore";
import { useAuthStore } from "@/store/authStore";

export function NotificationBell() {
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const role = useAuthStore((state) => state.user?.role);
  useNotifications();
  const href = role === "supervisor" ? "/supervisor/notifications" : role === "customer" ? "/notifications" : "/admin/dashboard";

  return (
    <Link
      href={href}
      aria-label="Open notifications"
      className="relative rounded-lg border border-[var(--bg-border)] bg-[var(--bg-elevated)] p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
    >
      <Bell className={clsx("size-4", unreadCount > 0 ? "animate-bell" : "")} />
      {unreadCount > 0 ? (
        <span className="absolute -right-1 -top-1 inline-flex min-h-4 min-w-4 items-center justify-center rounded-full bg-[var(--accent)] px-1 text-[10px] font-semibold text-white">
          {unreadCount > 10 ? "10+" : unreadCount}
        </span>
      ) : null}
    </Link>
  );
}
