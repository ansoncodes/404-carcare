"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/PageHeader";
import { InvoiceCard } from "@/components/payment/InvoiceCard";
import { getPayment } from "@/services/payments.service";

export default function PaymentDetailPage() {
  const params = useParams<{ id: string }>();
  const query = useQuery({ queryKey: ["payment", params.id], queryFn: () => getPayment(params.id) });

  return (
    <section className="space-y-6">
      <PageHeader title="Invoice Detail" subtitle="Payment breakdown" />
      {query.data ? <InvoiceCard payment={query.data} /> : <div className="h-40 animate-pulseSoft rounded-xl bg-[var(--bg-elevated)]" />}
    </section>
  );
}