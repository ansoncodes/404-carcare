"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { BookingStatsGrid } from "@/components/analytics/BookingStatsGrid";
import { AirportRevenueTable } from "@/components/analytics/AirportRevenueTable";
import { LiveIndicator } from "@/components/analytics/LiveIndicator";
import { useAnalytics } from "@/hooks/useAnalytics";

export default function AdminDashboardPage() {
  const analytics = useAnalytics();

  if (!analytics.data) {
    return <div className="h-56 animate-pulseSoft rounded-xl bg-[var(--bg-elevated)]" />;
  }

  return (
    <section className="space-y-6">
      <PageHeader
        title="Admin Dashboard"
        subtitle="Live booking and revenue analytics"
        action={<LiveIndicator active={analytics.connected} />}
      />
      <BookingStatsGrid stats={analytics.data.bookings} />
      <AirportRevenueTable rows={analytics.data.airports_ranked} />
    </section>
  );
}