"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { InvoiceCard } from "@/components/payment/InvoiceCard";
import { listPayments } from "@/services/payments.service";

export default function PaymentsPage() {
  const query = useQuery({ queryKey: ["payments"], queryFn: listPayments });

  return (
    <section className="space-y-6">
      <PageHeader title="Payments" subtitle="Invoice history" />
      {query.data && query.data.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {query.data.map((payment) => (
            <Link key={payment.id} href={`/payments/${payment.id}`}>
              <InvoiceCard payment={payment} />
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState title="No payments" description="Paid invoices will appear here." />
      )}
    </section>
  );
}