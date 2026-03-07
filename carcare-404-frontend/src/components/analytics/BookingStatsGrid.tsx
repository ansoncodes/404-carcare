import type { BookingStats } from "@/types/analytics.types";
import { StatCard } from "@/components/analytics/StatCard";

interface BookingStatsGridProps {
  stats: BookingStats;
}

export function BookingStatsGrid({ stats }: BookingStatsGridProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <StatCard label="Total" value={stats.total} />
      <StatCard label="Pending" value={stats.pending} />
      <StatCard label="Confirmed" value={stats.confirmed} />
      <StatCard label="In Progress" value={stats.in_progress} />
      <StatCard label="Completed" value={stats.completed} />
      <StatCard label="Cancelled" value={stats.cancelled} />
    </div>
  );
}
