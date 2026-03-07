import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { currencyINR, formatDate } from "@/lib/formatters";
import type { Payment } from "@/types/payment.types";

interface InvoiceCardProps {
  payment: Payment;
}

export function InvoiceCard({ payment }: InvoiceCardProps) {
  return (
    <Card>
      <div className="space-y-2">
        <p className="mono text-xs text-[var(--text-muted)]">{payment.invoice_number}</p>
        <p className="text-lg font-semibold text-[var(--text-primary)]">{currencyINR(payment.total_amount)}</p>
        <Badge status={payment.status} />
        <p className="text-xs text-[var(--text-secondary)]">Paid at: {formatDate(payment.paid_at)}</p>
      </div>
    </Card>
  );
}
