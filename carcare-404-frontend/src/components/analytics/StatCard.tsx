import { Card } from "@/components/ui/card";

interface StatCardProps {
  label: string;
  value: string | number;
}

export function StatCard({ label, value }: StatCardProps) {
  return (
    <Card>
      <p className="text-xs uppercase tracking-[0.05em] text-[var(--text-muted)]">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">{value}</p>
    </Card>
  );
}
