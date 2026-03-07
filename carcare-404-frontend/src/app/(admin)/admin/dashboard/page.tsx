"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BookingStatsGrid } from "@/components/analytics/BookingStatsGrid";
import { RevenueTrendChart } from "@/components/analytics/RevenueTrendChart";
import { PageHeader } from "@/components/shared/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { currencyINR, formatDate } from "@/lib/formatters";
import { useAnalytics } from "@/hooks/useAnalytics";
import { getRevenueInsights } from "@/services/analytics.service";
import { listBookings } from "@/services/bookings.service";
import { listChatRooms, listMessages } from "@/services/chat.service";
import { listParkingBookings } from "@/services/parking.service";
import { listPayments } from "@/services/payments.service";
import type { RankedAirport } from "@/types/analytics.types";

interface RevenueBarRow {
  airportName: string;
  airportCode: string;
  revenue: number;
}

interface ActivityRow {
  id: string;
  type: "booking" | "message" | "payment";
  label: string;
  airportName: string;
  airportCode: string;
  timestamp: string;
}

function money(value: string | number): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function monthKey(dateIso: string | null): string | null {
  if (!dateIso) {
    return null;
  }
  return dateIso.slice(0, 7);
}

function buildBarRowsFromRanked(rows: RankedAirport[]): RevenueBarRow[] {
  return rows.map((row) => ({
    airportName: row.airport_name,
    airportCode: row.airport_code,
    revenue: money(row.total_revenue),
  }));
}

export default function AdminDashboardPage() {
  const analytics = useAnalytics();
  const [revenueMode, setRevenueMode] = useState<"month" | "all_time">("month");

  const revenueInsightsQuery = useQuery({
    queryKey: ["admin-revenue-insights"],
    queryFn: getRevenueInsights,
  });
  const bookingsQuery = useQuery({
    queryKey: ["admin-dashboard-bookings"],
    queryFn: listBookings,
    refetchInterval: 30000,
  });
  const parkingBookingsQuery = useQuery({
    queryKey: ["admin-dashboard-parking-bookings"],
    queryFn: listParkingBookings,
    refetchInterval: 30000,
  });
  const paymentsQuery = useQuery({
    queryKey: ["admin-dashboard-payments"],
    queryFn: listPayments,
    refetchInterval: 30000,
  });
  const chatRoomsQuery = useQuery({
    queryKey: ["admin-dashboard-chat-rooms"],
    queryFn: listChatRooms,
    refetchInterval: 30000,
  });
  const messagesQuery = useQuery({
    queryKey: ["admin-dashboard-messages"],
    queryFn: () => listMessages(),
    refetchInterval: 30000,
  });

  const analyticsData = analytics.data;
  const stats = analyticsData?.bookings ?? {
    total: 0,
    pending: 0,
    confirmed: 0,
    in_progress: 0,
    completed: 0,
    cancelled: 0,
  };
  const revenue = analyticsData?.revenue ?? {
    total_revenue: 0,
    today_revenue: 0,
    pending_revenue: 0,
    yesterday_revenue: 0,
    today_change_amount: 0,
    today_change_percent: 0,
    today_trend: "flat",
    month_revenue: 0,
    last_month_revenue: 0,
    month_change_amount: 0,
    month_change_percent: 0,
    month_trend: "flat",
    cancelled_deduction_today: 0,
    cancelled_deduction_month: 0,
  };
  const totalRevenue = money(revenue.total_revenue);
  const monthRevenue = money(revenue.month_revenue);
  const pendingRevenue = money(revenue.pending_revenue);

  const paidPayments = paymentsQuery.data?.filter((payment) => payment.status === "paid") ?? [];
  const currentMonth = new Date().toISOString().slice(0, 7);

  const monthRevenueByAirport = useMemo(() => {
    const map = new Map<string, RevenueBarRow>();
    paidPayments.forEach((payment) => {
      if (monthKey(payment.paid_at) !== currentMonth) {
        return;
      }
      if (payment.booking.status === "cancelled") {
        return;
      }
      const airport = payment.booking.airport;
      const current = map.get(airport.id) ?? {
        airportName: airport.name,
        airportCode: airport.code,
        revenue: 0,
      };
      current.revenue += money(payment.total_amount);
      map.set(airport.id, current);
    });
    return [...map.values()].sort((a, b) => b.revenue - a.revenue);
  }, [currentMonth, paidPayments]);

  const allTimeRevenueByAirport = useMemo(
    () => buildBarRowsFromRanked(analyticsData?.airports_ranked ?? []),
    [analyticsData?.airports_ranked]
  );

  const revenueBarRows = revenueMode === "month" ? monthRevenueByAirport : allTimeRevenueByAirport;
  const highestRevenue = revenueBarRows.length > 0 ? Math.max(...revenueBarRows.map((row) => row.revenue), 1) : 1;

  const bestAirport = revenueBarRows[0] ?? null;
  const worstAirport = revenueBarRows.length > 0 ? revenueBarRows[revenueBarRows.length - 1] : null;

  const trendPoints = revenueInsightsQuery.data?.trend_points.slice(-30) ?? [];

  const parkingCount = parkingBookingsQuery.data?.length ?? 0;
  const serviceCount = Math.max(stats.total - parkingCount, 0);

  const roomAirportById = useMemo(() => {
    const map = new Map<string, { code: string; name: string }>();
    (chatRoomsQuery.data ?? []).forEach((room) => {
      if (room.airport) {
        map.set(room.id, { code: room.airport.code, name: room.airport.name });
      }
    });
    return map;
  }, [chatRoomsQuery.data]);

  const recentActivity = useMemo<ActivityRow[]>(() => {
    const rows: ActivityRow[] = [];

    (bookingsQuery.data ?? []).forEach((booking) => {
      rows.push({
        id: `booking-${booking.id}`,
        type: "booking",
        label: `Booking ${booking.booking_reference} created`,
        airportName: booking.airport.name,
        airportCode: booking.airport.code,
        timestamp: booking.created_at,
      });

      if (booking.status === "completed") {
        rows.push({
          id: `booking-complete-${booking.id}`,
          type: "booking",
          label: `Booking ${booking.booking_reference} completed`,
          airportName: booking.airport.name,
          airportCode: booking.airport.code,
          timestamp: booking.scheduled_end ?? booking.created_at,
        });
      }
    });

    (messagesQuery.data ?? []).forEach((message) => {
      const airportMeta = roomAirportById.get(message.room);
      rows.push({
        id: `message-${message.id}`,
        type: "message",
        label: `New message from ${message.sender.full_name}`,
        airportName: airportMeta?.name ?? "Unknown Airport",
        airportCode: airportMeta?.code ?? "N/A",
        timestamp: message.created_at,
      });
    });

    paidPayments.forEach((payment) => {
      rows.push({
        id: `payment-${payment.id}`,
        type: "payment",
        label: `Payment ${payment.invoice_number} received`,
        airportName: payment.booking.airport.name,
        airportCode: payment.booking.airport.code,
        timestamp: payment.paid_at ?? payment.created_at,
      });
    });

    return rows
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10);
  }, [bookingsQuery.data, messagesQuery.data, paidPayments, roomAirportById]);

  if (!analyticsData) {
    return <div className="h-56 animate-pulseSoft rounded-xl bg-[var(--bg-elevated)]" />;
  }

  return (
    <section className="space-y-6 app-fade-in">
      <PageHeader
        title="Admin Dashboard"
        subtitle="Cross-airport operations and revenue overview"
        action={
          <div className="flex items-center gap-3">
            <div className="inline-flex overflow-hidden rounded-lg border border-slate-700/60">
              <button
                type="button"
                className={`px-3 py-1.5 text-xs ${revenueMode === "month" ? "bg-cyan-500/20 text-cyan-200" : "bg-slate-900/40 text-slate-300"}`}
                onClick={() => setRevenueMode("month")}
              >
                Current Month
              </button>
              <button
                type="button"
                className={`px-3 py-1.5 text-xs ${revenueMode === "all_time" ? "bg-cyan-500/20 text-cyan-200" : "bg-slate-900/40 text-slate-300"}`}
                onClick={() => setRevenueMode("all_time")}
              >
                All Time
              </button>
            </div>
          </div>
        }
      />

      <div className="grid gap-3 md:grid-cols-4">
        <article className="rounded-xl border border-slate-800/50 bg-[#0b1422] p-4">
          <p className="text-xs uppercase tracking-[0.05em] text-[var(--text-muted)]">Total Revenue</p>
          <p className="mt-2 text-2xl font-bold text-[var(--text-primary)]">{currencyINR(totalRevenue)}</p>
        </article>
        <article className="rounded-xl border border-slate-800/50 bg-[#0b1422] p-4">
          <p className="text-xs uppercase tracking-[0.05em] text-[var(--text-muted)]">
            {revenueMode === "month" ? "Month Revenue" : "All Time Revenue"}
          </p>
          <p className="mt-2 text-2xl font-bold text-cyan-300">
            {currencyINR(revenueMode === "month" ? monthRevenue : totalRevenue)}
          </p>
        </article>
        <article className="rounded-xl border border-slate-800/50 bg-[#0b1422] p-4">
          <p className="text-xs uppercase tracking-[0.05em] text-[var(--text-muted)]">Pending Revenue</p>
          <p className="mt-2 text-2xl font-bold text-amber-300">{currencyINR(pendingRevenue)}</p>
        </article>
        <article className="rounded-xl border border-slate-800/50 bg-[#0b1422] p-4">
          <p className="text-xs uppercase tracking-[0.05em] text-[var(--text-muted)]">Bookings</p>
          <p className="mt-2 text-2xl font-bold text-[var(--text-primary)]">{stats.total}</p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">{stats.in_progress} in progress</p>
        </article>
      </div>

      <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        <article className="rounded-xl border border-slate-800/50 bg-[#0b1422] p-4">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Revenue Breakdown by Airport</h3>
            <span className="text-xs text-[var(--text-muted)]">{revenueMode === "month" ? "This month" : "All time"}</span>
          </div>
          <div className="space-y-3">
            {revenueBarRows.length === 0 ? (
              <p className="text-sm text-[var(--text-secondary)]">No revenue data for selected range.</p>
            ) : (
              revenueBarRows.map((row) => (
                <div key={row.airportCode} className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
                    <span>
                      {row.airportName} ({row.airportCode})
                    </span>
                    <span>{currencyINR(row.revenue)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-800/70">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500"
                      style={{ width: `${Math.max((row.revenue / highestRevenue) * 100, 2)}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </article>

        <div className="space-y-4">
          <article className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4">
            <p className="text-xs uppercase tracking-[0.05em] text-emerald-200">Best Performing Airport</p>
            <p className="mt-2 text-lg font-semibold text-emerald-100">
              {bestAirport ? `${bestAirport.airportName} (${bestAirport.airportCode})` : "N/A"}
            </p>
            <p className="mt-1 text-sm text-emerald-200">{bestAirport ? currencyINR(bestAirport.revenue) : "-"}</p>
          </article>

          <article className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4">
            <p className="text-xs uppercase tracking-[0.05em] text-rose-200">Worst Performing Airport</p>
            <p className="mt-2 text-lg font-semibold text-rose-100">
              {worstAirport ? `${worstAirport.airportName} (${worstAirport.airportCode})` : "N/A"}
            </p>
            <p className="mt-1 text-sm text-rose-200">{worstAirport ? currencyINR(worstAirport.revenue) : "-"}</p>
          </article>
        </div>
      </div>

      <RevenueTrendChart points={trendPoints} />

      <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        <div className="space-y-4">
          <article className="rounded-xl border border-slate-800/50 bg-[#0b1422] p-4">
            <h3 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">Booking Summary Counters</h3>
            <BookingStatsGrid stats={stats} />
          </article>

          <article className="rounded-xl border border-slate-800/50 bg-[#0b1422] p-4">
            <h3 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">Parking vs Service Bookings</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-cyan-400/35 bg-cyan-500/10 p-4">
                <p className="text-xs uppercase tracking-[0.05em] text-cyan-200">Parking Bookings</p>
                <p className="mt-2 text-2xl font-bold text-cyan-100">{parkingCount}</p>
              </div>
              <div className="rounded-lg border border-blue-400/35 bg-blue-500/10 p-4">
                <p className="text-xs uppercase tracking-[0.05em] text-blue-200">Service Bookings</p>
                <p className="mt-2 text-2xl font-bold text-blue-100">{serviceCount}</p>
              </div>
            </div>
          </article>
        </div>

        <article className="rounded-xl border border-slate-800/50 bg-[#0b1422] p-4">
          <h3 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">Recent Activity Feed</h3>
          <div className="space-y-2">
            {recentActivity.length === 0 ? (
              <p className="text-sm text-[var(--text-secondary)]">No recent activity available.</p>
            ) : (
              recentActivity.map((item) => (
                <div key={item.id} className="rounded-lg border border-slate-800/60 bg-slate-900/40 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm text-[var(--text-primary)]">{item.label}</p>
                    <Badge status={item.type === "payment" ? "completed" : item.type === "message" ? "confirmed" : "in_progress"} />
                  </div>
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">
                    {item.airportName} ({item.airportCode})
                  </p>
                  <p className="mt-1 text-[11px] text-[var(--text-muted)]">{formatDate(item.timestamp)}</p>
                </div>
              ))
            )}
          </div>
        </article>
      </div>

      <div className="flex justify-end">
        <Button variant="secondary" onClick={() => analytics.refetch()}>
          Refresh Dashboard
        </Button>
      </div>
    </section>
  );
}
