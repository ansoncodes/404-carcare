/**
 * Phase 1 finding applied:
 * - Backend currently has no Bay model or bay CRUD endpoints.
 * TODO(API): add bays endpoints to enable this admin module.
 */
"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";

export default function AdminBaysPage() {
  return (
    <section className="space-y-6">
      <PageHeader title="Service Bays" subtitle="Backend support pending" />
      <EmptyState
        title="Bay management unavailable"
        description="The current backend does not expose bay models or APIs. This section will be enabled once endpoints are available."
      />
    </section>
  );
}
