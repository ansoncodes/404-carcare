/**
 * Phase 1 finding applied:
 * - Chat threads are modeled per booking room.
 * - This route pins the left-pane selection to a supervisor id.
 */
"use client";

import { useParams } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { AdminChatConsole } from "@/components/admin/AdminChatConsole";

export default function AdminChatSupervisorPage() {
  const params = useParams<{ supervisorId: string }>();

  return (
    <section className="space-y-6 app-fade-in">
      <PageHeader
        title="Admin Chat Console"
        subtitle="Focused supervisor thread view"
      />
      <AdminChatConsole initialSupervisorId={params.supervisorId} />
    </section>
  );
}
