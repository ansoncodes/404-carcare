/**
 * Phase 1 finding applied:
 * - Admin chat is available for cross-airport visibility.
 * - Backend enforces admin read-only posting behavior.
 */
"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { AdminChatConsole } from "@/components/admin/AdminChatConsole";

export default function AdminChatPage() {
  return (
    <section className="space-y-6 app-fade-in">
      <PageHeader
        title="Admin Chat Console"
        subtitle="All supervisor threads with search and unread tracking"
      />
      <AdminChatConsole />
    </section>
  );
}
