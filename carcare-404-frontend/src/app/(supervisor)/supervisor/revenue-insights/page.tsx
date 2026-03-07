"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, IndianRupee, TrendingDown, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { RevenueTrendChart } from "@/components/analytics/RevenueTrendChart";
import { getRevenueInsights } from "@/services/analytics.service";
import { currencyINR } from "@/lib/formatters";

type Trend = "up" | "down" | "flat";

function toNumber(value: string | number | null | undefined): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function formatPercent(value: number): string {
  return `${Math.abs(value).toFixed(1)}%`;
}

function TrendBadge({ trend }: { trend: Trend }) {
  if (trend === "up") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-xs font-medium text-emerald-300">
        <TrendingUp className="size-3" />
        Growth
      </span>
    );
  }
  if (trend === "down") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-rose-400/30 bg-rose-400/10 px-2 py-0.5 text-xs font-medium text-rose-300">
        <TrendingDown className="size-3" />
        Downhill
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-slate-500/40 bg-slate-500/10 px-2 py-0.5 text-xs font-medium text-slate-300">
      <IndianRupee className="size-3" />
      Flat
    </span>
  );
}

interface RevenueInsightCardProps {
  title: string;
  mainValue: string;
  compareLabel: string;
  trend: Trend;
  deltaLabel: string;
  cancellationLabel: string;
}

function RevenueInsightCard({
  title,
  mainValue,
  compareLabel,
  trend,
  deltaLabel,
  cancellationLabel,
}: RevenueInsightCardProps) {
  return (
    <div className="rounded-xl border border-slate-800/40 bg-[#0b1422] p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.05em] text-[var(--text-muted)]">{title}</p>
          <p className="mt-2 text-2xl font-bold text-[var(--text-primary)]">{mainValue}</p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">{compareLabel}</p>
        </div>
        <TrendBadge trend={trend} />
      </div>
      <div className="mt-3 rounded-lg border border-slate-700/40 bg-slate-900/40 px-3 py-2">
        <p className="text-xs font-medium text-[var(--text-secondary)]">Change: {deltaLabel}</p>
        <p className="mt-1 text-xs text-rose-300">{cancellationLabel}</p>
      </div>
    </div>
  );
}

export default function SupervisorRevenueInsightsPage() {
  const query = useQuery({
    queryKey: ["supervisor-revenue-insights"],
    queryFn: getRevenueInsights,
  });

  if (query.isLoading || !query.data) {
    return <div className="h-64 animate-pulseSoft rounded-xl bg-[var(--bg-elevated)]" />;
  }

  const metrics = query.data.metrics;
  const todayRevenue = toNumber(metrics.today_revenue);
  const yesterdayRevenue = toNumber(metrics.yesterday_revenue);
  const monthRevenue = toNumber(metrics.month_revenue);
  const lastMonthRevenue = toNumber(metrics.last_month_revenue);
  const todayChangeAmount = toNumber(metrics.today_change_amount);
  const monthChangeAmount = toNumber(metrics.month_change_amount);
  const cancelledToday = toNumber(metrics.cancelled_deduction_today);
  const cancelledMonth = toNumber(metrics.cancelled_deduction_month);
  const netRevenue = toNumber(metrics.total_revenue);

  return (
    <section className="space-y-6 app-fade-in">
      <PageHeader
        title="Revenue Insights"
        subtitle="Detailed revenue comparisons and trend analytics"
        action={
          <Link
            href="/supervisor/dashboard"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700/60 bg-slate-900/40 px-3 py-2 text-sm text-slate-200 transition hover:border-cyan-400/40 hover:text-cyan-300"
          >
            <ArrowLeft className="size-4" />
            Back to Dashboard
          </Link>
        }
      />

      <div className="grid gap-3 lg:grid-cols-2">
        <RevenueInsightCard
          title="Today vs Yesterday"
          mainValue={currencyINR(todayRevenue)}
          compareLabel={`Yesterday: ${currencyINR(yesterdayRevenue)}`}
          trend={metrics.today_trend}
          deltaLabel={`${currencyINR(Math.abs(todayChangeAmount))} (${formatPercent(metrics.today_change_percent)})`}
          cancellationLabel={`Cancelled deduction today: ${currencyINR(cancelledToday)}`}
        />
        <RevenueInsightCard
          title="This Month vs Last Month"
          mainValue={currencyINR(monthRevenue)}
          compareLabel={`Last month: ${currencyINR(lastMonthRevenue)}`}
          trend={metrics.month_trend}
          deltaLabel={`${currencyINR(Math.abs(monthChangeAmount))} (${formatPercent(metrics.month_change_percent)})`}
          cancellationLabel={`Cancelled deduction this month: ${currencyINR(cancelledMonth)}`}
        />
      </div>

      <div className="rounded-xl border border-slate-800/40 bg-[#0b1422] p-4 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.05em] text-[var(--text-muted)]">Net Revenue</p>
            <p className="mt-1 text-2xl font-bold text-[var(--text-primary)]">{currencyINR(netRevenue)}</p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">Cancelled bookings are excluded from revenue totals.</p>
          </div>
          <IndianRupee className="size-8 text-fuchsia-300" />
        </div>
      </div>

      <RevenueTrendChart points={query.data.trend_points} />
    </section>
  );
}
