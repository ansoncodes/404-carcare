"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { useNotifications } from "@/hooks/useNotifications";
import { markAllNotificationsRead, markNotificationRead } from "@/services/notifications.service";
import { useNotificationStore } from "@/store/notificationStore";

export default function SupervisorNotificationsPage() {
  const router = useRouter();
  const query = useNotifications();
  const list = useNotificationStore((state) => state.list);

  const markAll = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => query.refetch(),
  });

  const markOne = useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: () => query.refetch(),
  });

  const handleOpen = (id: string, targetUrl: string) => {
    markOne.mutate(id, {
      onSuccess: async () => {
        await query.refetch();
        if (targetUrl) {
          router.push(targetUrl);
        }
      },
    });
  };

  return (
    <section className="space-y-6">
      <PageHeader
        title="Notifications"
        subtitle="Jobs, customer messages, and booking updates"
        action={
          <Button variant="secondary" onClick={() => markAll.mutate()} disabled={markAll.isPending}>
            Mark all read
          </Button>
        }
      />
      <div className="panel divide-y divide-[var(--bg-border)]">
        {list.map((item) => (
          <button
            key={item.id}
            className="w-full px-4 py-3 text-left hover:bg-[var(--bg-elevated)]"
            onClick={() => handleOpen(item.id, item.target_url)}
          >
            <p className="text-sm font-medium text-[var(--text-primary)]">{item.title}</p>
            <p className="text-xs text-[var(--text-secondary)]">{item.body}</p>
          </button>
        ))}
      </div>
    </section>
  );
}
