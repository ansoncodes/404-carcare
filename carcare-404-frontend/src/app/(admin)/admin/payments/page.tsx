"use client";

import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/ui/table";
import { listPayments } from "@/services/payments.service";

export default function AdminPaymentsPage() {
  const query = useQuery({ queryKey: ["payments"], queryFn: listPayments });

  return (
    <section className="space-y-6">
      <PageHeader title="Payments" subtitle="All payment records" />
      {query.data ? (
        <DataTable
          rows={query.data}
          rowKey={(row) => row.id}
          columns={[
            { key: "invoice", header: "Invoice", render: (row) => <span className="mono">{row.invoice_number}</span> },
            { key: "amount", header: "Amount", render: (row) => row.total_amount },
            { key: "status", header: "Status", render: (row) => row.status },
          ]}
        />
      ) : null}
    </section>
  );
}