"use client";

import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { listBookings } from "@/services/bookings.service";

export default function AdminBookingsPage() {
  const query = useQuery({ queryKey: ["bookings"], queryFn: listBookings });

  return (
    <section className="space-y-6">
      <PageHeader title="All Bookings" subtitle="Cross-airport booking visibility" />
      {query.data ? (
        <DataTable
          rows={query.data}
          rowKey={(row) => row.id}
          columns={[
            { key: "ref", header: "Reference", render: (row) => <span className="mono">{row.booking_reference}</span> },
            { key: "status", header: "Status", render: (row) => <Badge status={row.status} pulse={row.status === "in_progress"} /> },
            { key: "progress", header: "Progress", render: (row) => `${row.progress_percentage}%` },
          ]}
        />
      ) : null}
    </section>
  );
}