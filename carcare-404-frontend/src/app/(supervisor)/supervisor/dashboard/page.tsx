"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CarFront,
  CheckCircle2,
  ClipboardList,
  Clock3,
  BarChart3,
  MessageCircle,
  Wrench,
  Bell,
  IndianRupee,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/booking/ProgressBar";
import { getDashboardSummary } from "@/services/analytics.service";
import {
  listJobCards,
} from "@/services/operations.service";
import { listNotifications } from "@/services/notifications.service";
import type { JobCard, WorkStage } from "@/types/operations.types";
import { useAuthStore } from "@/store/authStore";
import { currencyINR } from "@/lib/formatters";

/* ======================================================================== */
/*  HELPERS                                                                  */
/* ======================================================================== */

type QueueAction = "start" | "next" | "complete" | null;

function isStageDone(status: WorkStage["status"]): boolean {
  return status === "completed" || status === "skipped";
}

function isQcStage(stageName: string): boolean {
  const normalized = stageName.trim().toLowerCase().replaceAll("_", " ");
  return normalized === "qc" || normalized === "quality check";
}

function getSortedStages(card: JobCard): WorkStage[] {
  return [...card.stages].sort((a, b) => a.stage_order - b.stage_order);
}

function getQueueAction(card: JobCard): QueueAction {
  const stages = getSortedStages(card);
  const hasInProgress = stages.some((stage) => stage.status === "in_progress");
  const allDone =
    stages.length > 0 && stages.every((stage) => isStageDone(stage.status));

  // Check booking status — cannot start if booking is still pending
  const booking = typeof card.booking === "string" ? null : card.booking;
  const bookingAllowsStart = !booking || booking.status === "confirmed" || booking.status === "in_progress";

  if ((card.status === "pending" || card.status === "paused") && bookingAllowsStart) return "start";
  if (card.status === "active" && hasInProgress) return "next";
  if (card.status !== "completed" && allDone) return "complete";
  return null;
}

function getStageLabel(card: JobCard): string {
  const stages = getSortedStages(card);
  const inProgress = stages.find((stage) => stage.status === "in_progress");
  if (inProgress) return inProgress.stage_name.replaceAll("_", " ");
  if (card.status === "pending") return "Waiting to start";
  const nextPending = stages.find((stage) => stage.status === "pending");
  if (nextPending)
    return `${nextPending.stage_name.replaceAll("_", " ")} (next)`;
  if (stages.length > 0) return "Ready for completion";
  return "Timeline unavailable";
}

function getProgressPercentage(card: JobCard): number {
  const stages = getSortedStages(card);
  if (stages.length === 0) return 0;
  const completed = stages.filter((s) => isStageDone(s.status)).length;
  return Math.round((completed / stages.length) * 100);
}

type Trend = "up" | "down" | "flat";

function toNumber(value: string | number | null | undefined): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

/* ======================================================================== */
/*  DASHBOARD PAGE                                                           */
/* ======================================================================== */

export default function SupervisorDashboardPage() {
  const user = useAuthStore((state) => state.user);

  const analyticsQuery = useQuery({
    queryKey: ["supervisor-analytics-summary"],
    queryFn: getDashboardSummary,
  });

  const query = useQuery({ queryKey: ["job-cards"], queryFn: listJobCards });
  const rows = query.data ?? [];

  // --- Stats ---
  const activeCards = rows.filter((c) => c.status === "active");
  const pendingCards = rows.filter((c) => c.status === "pending");
  const completedTodayCount = rows.filter((card) => {
    if (!card.completed_at) return false;
    const completed = new Date(card.completed_at);
    const today = new Date();
    return (
      completed.getFullYear() === today.getFullYear() &&
      completed.getMonth() === today.getMonth() &&
      completed.getDate() === today.getDate()
    );
  }).length;

  // Fetch recent notifications
  const notificationsQuery = useQuery({
    queryKey: ["notifications"],
    queryFn: listNotifications,
  });
  const recentNotifications = (notificationsQuery.data ?? []).slice(0, 5);
  const revenue = analyticsQuery.data?.revenue;
  const todayRevenue = toNumber(revenue?.today_revenue);
  const todayChangeAmount = toNumber(revenue?.today_change_amount);
  const todayTrend: Trend = revenue?.today_trend ?? "flat";

  return (
    <section className="space-y-8 app-fade-in">
      {/* ────────────────────── HERO ────────────────────── */}
      <div className="-mt-6 relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen">
        <div
          className="relative flex min-h-[36vh] max-h-[560px] overflow-hidden bg-cover bg-[center_right] px-6 py-10 sm:min-h-[40vh] sm:px-8 sm:py-12 lg:px-12"
          style={{
            backgroundImage:
              "linear-gradient(90deg, rgba(2,6,23,0.95) 0%, rgba(2,6,23,0.8) 35%, rgba(2,6,23,0.4) 55%, rgba(2,6,23,0) 75%), url('/images/supervisor-hero.jpeg')",
          }}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_36%,rgba(34,211,238,0.12),transparent_52%)]" />
          <div className="absolute inset-x-0 bottom-0 h-28 bg-[linear-gradient(180deg,transparent,rgba(7,11,20,0.95))]" />

          <div className="relative z-10 flex w-full max-w-3xl flex-col justify-between">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-cyan-300">
                Welcome back
              </p>
              <h1 className="text-4xl font-bold leading-tight text-[var(--text-primary)] sm:text-5xl">
                {user?.full_name ?? "Supervisor"},
              </h1>
              <h2 className="text-2xl font-semibold leading-tight text-slate-100 sm:text-3xl">
                Keep the bay running smooth.
              </h2>
              <p className="max-w-2xl text-base text-slate-300 sm:text-lg">
                Manage job cards, track work stages, and ensure every car leaves
                showroom-ready.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ────────────────────── QUICK ACTIONS ────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Link href="/supervisor/job-cards">
          <QuickAction
            icon={<ClipboardList className="size-5" />}
            label="Job Cards"
          />
        </Link>
        <Link href="/supervisor/chat">
          <QuickAction
            icon={<MessageCircle className="size-5" />}
            label="Messages"
          />
        </Link>
        <Link href="/supervisor/profile">
          <QuickAction
            icon={<Wrench className="size-5" />}
            label="Profile"
          />
        </Link>
        <Link href="/supervisor/revenue-insights">
          <QuickAction
            icon={<BarChart3 className="size-5" />}
            label="Revenue"
          />
        </Link>
      </div>

      {/* ────────────────────── ACTIVE JOBS ────────────────────── */}
      {activeCards.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            Active Jobs{" "}
            <span className="text-sm font-normal text-[var(--text-secondary)]">
              ({activeCards.length})
            </span>
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {activeCards.map((card) => {
              const booking = typeof card.booking === "string" ? null : card.booking;
              const vehicle = booking
                ? `${booking.vehicle.brand ?? "Vehicle"}${booking.vehicle.model ? ` ${booking.vehicle.model}` : ""}`
                : "Vehicle";
              const plate = booking?.vehicle.plate_number ?? "-";
              const stages = getSortedStages(card);
              const progressPct = getProgressPercentage(card);
              const stageLabel = getStageLabel(card);

              return (
                <Link key={card.id} href={`/supervisor/job-cards/${card.id}`}>
                  <div className="rounded-xl border border-slate-800/50 bg-gradient-to-b from-[#0d1829] to-[#0b1422] p-4 shadow-sm transition hover:border-cyan-400/30 hover:shadow-cyan-900/10 cursor-pointer">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 space-y-0.5">
                        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-[var(--text-primary)] truncate">
                          <CarFront className="size-4 shrink-0 text-cyan-400" />
                          {vehicle}
                        </h3>
                        <p className="text-xs text-[var(--text-secondary)]">{plate}</p>
                      </div>
                      <Badge status={card.status} pulse />
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-xs font-medium text-cyan-300">
                        <span className="size-1.5 rounded-full bg-cyan-400 animate-pulseSoft" />
                        {stageLabel}
                      </span>
                      <span className="text-sm font-bold text-[var(--accent)]">{progressPct}%</span>
                    </div>
                    <div className="mt-1.5">
                      <ProgressBar value={progressPct} />
                    </div>

                    {stages.length > 0 && (
                      <div className="mt-2 flex items-center gap-1">
                        {stages.map((stage) => (
                          <span
                            key={stage.id}
                            className={`size-2 rounded-full transition ${isStageDone(stage.status)
                              ? "bg-emerald-400"
                              : stage.status === "in_progress"
                                ? "bg-cyan-400 animate-pulseSoft"
                                : "bg-slate-600"
                              }`}
                            title={stage.stage_name.replaceAll("_", " ")}
                          />
                        ))}
                      </div>
                    )}

                    <div className="mt-4 w-full rounded-lg border border-cyan-500/20 bg-cyan-400/5 py-2 text-center text-xs font-semibold text-cyan-400 transition hover:bg-cyan-400/10">
                      View Job &rarr;
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* ────────────────────── STATS ────────────────────── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Active Jobs"
          value={activeCards.length}
          colorClass="text-cyan-400"
          icon={<CarFront className="size-4 text-cyan-300" />}
          subtitle={
            activeCards.length === 1
              ? "1 car being serviced"
              : `${activeCards.length} cars being serviced`
          }
        />
        <StatsCard
          title="Pending"
          value={pendingCards.length}
          colorClass="text-amber-400"
          icon={<Clock3 className="size-4 text-amber-300" />}
          subtitle={
            pendingCards.length > 0
              ? "Awaiting start"
              : "No pending jobs"
          }
        />
        <StatsCard
          title="Completed"
          value={completedTodayCount}
          colorClass="text-emerald-400"
          icon={<CheckCircle2 className="size-4 text-emerald-300" />}
          subtitle="Finished today"
        />
        <RevenueCard
          title="Revenue Today"
          value={currencyINR(todayRevenue)}
          subtitle={analyticsQuery.isLoading ? "Loading..." : `${currencyINR(Math.abs(todayChangeAmount))} vs yesterday`}
          trend={todayTrend}
          icon={<IndianRupee className="size-4 text-fuchsia-300" />}
          href="/supervisor/revenue-insights"
        />
      </div>

      {/* ────────────────────── WORK QUEUE ────────────────────── */}
      {pendingCards.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-end justify-between gap-3">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              Pending Queue{" "}
              <span className="text-sm font-normal text-[var(--text-secondary)]">
                ({pendingCards.length})
              </span>
            </h2>
            <Link
              href="/supervisor/job-cards"
              className="text-sm font-medium text-[var(--accent)] hover:text-[var(--accent-hover)]"
            >
              View all →
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {pendingCards.map((card) => {
              const booking = typeof card.booking === "string" ? null : card.booking;
              const vehicle = booking
                ? `${booking.vehicle.brand ?? "Vehicle"}${booking.vehicle.model ? ` ${booking.vehicle.model}` : ""}`
                : "Vehicle";
              const plate = booking?.vehicle.plate_number ?? "-";

              return (
                <Link key={card.id} href={`/supervisor/job-cards/${card.id}`}>
                  <div className="rounded-xl border border-slate-800/50 bg-[#0b1422] p-4 shadow-sm transition hover:border-amber-400/30 cursor-pointer">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 space-y-0.5">
                        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-[var(--text-primary)] truncate">
                          <Clock3 className="size-4 shrink-0 text-amber-400" />
                          {vehicle}
                        </h3>
                        <p className="text-xs text-[var(--text-secondary)]">{plate}</p>
                      </div>
                      <Badge status={card.status} />
                    </div>
                    <p className="mt-2 text-xs text-[var(--text-muted)]">
                      {card.services.length > 0 ? card.services.join(" + ") : "-"}
                    </p>
                    <div className="mt-4 w-full rounded-lg border border-cyan-500/20 bg-cyan-400/5 py-2 text-center text-xs font-semibold text-cyan-400 transition hover:bg-cyan-400/10">
                      View Job &rarr;
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      ) : query.isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="h-32 animate-pulseSoft rounded-xl bg-[var(--bg-elevated)]" />
          <div className="h-32 animate-pulseSoft rounded-xl bg-[var(--bg-elevated)]" />
          <div className="h-32 animate-pulseSoft rounded-xl bg-[var(--bg-elevated)]" />
        </div>
      ) : null}

      {/* ────────────────────── RECENT NOTIFICATIONS ────────────────────── */}
      {recentNotifications.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-end justify-between gap-3">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              Recent Updates
            </h2>
            <Link
              href="/supervisor/notifications"
              className="text-sm font-medium text-[var(--accent)] hover:text-[var(--accent-hover)]"
            >
              View all →
            </Link>
          </div>
          <div className="space-y-2">
            {recentNotifications.map((notif) => (
              <div
                key={notif.id}
                className={`flex items-start gap-3 rounded-xl border px-4 py-3 transition ${notif.is_read
                  ? "border-slate-800/40 bg-[var(--bg-surface)]"
                  : "border-cyan-500/20 bg-cyan-500/5"
                  }`}
              >
                <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-cyan-400/10 text-cyan-400">
                  <Bell className="size-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    {notif.title}
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--text-secondary)] line-clamp-2">
                    {notif.body}
                  </p>
                </div>
                {!notif.is_read && (
                  <span className="mt-1 size-2 shrink-0 rounded-full bg-cyan-400" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

    </section>
  );
}

/* ======================================================================== */
/*  CURRENT JOB PROGRESS (mirrors customer's CurrentServiceProgress)        */
/* ======================================================================== */

/* CurrentJobProgress and JobQueueCard are no longer used — dashboard shows
   view-only compact cards. All stage actions happen on the detail page. */


/* ======================================================================== */
/*  TIMELINE STEP — ✔ / ● / ○ with colors (same as customer)               */
/* ======================================================================== */

function TimelineStep({
  name,
  status,
  isLast,
}: {
  name: string;
  status: string;
  isLast: boolean;
}) {
  const isCompleted = status === "completed" || status === "skipped";
  const isCurrent = status === "in_progress";

  return (
    <div className="flex items-stretch gap-3">
      {/* Vertical line + icon */}
      <div className="flex flex-col items-center">
        {/* Icon */}
        <div
          className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${isCompleted
            ? "bg-emerald-400/15 text-emerald-400"
            : isCurrent
              ? "bg-cyan-400/15 text-cyan-300 ring-2 ring-cyan-400/30"
              : "bg-slate-700/40 text-slate-500"
            }`}
        >
          {isCompleted ? "✓" : isCurrent ? "●" : "○"}
        </div>
        {/* Connector line */}
        {!isLast && (
          <div
            className={`w-[2px] flex-1 min-h-[16px] ${isCompleted ? "bg-emerald-400/30" : "bg-slate-700/50"
              }`}
          />
        )}
      </div>

      {/* Label */}
      <div className="pb-3">
        <p
          className={`text-sm font-medium ${isCompleted
            ? "text-emerald-400"
            : isCurrent
              ? "text-cyan-300"
              : "text-[var(--text-muted)]"
            }`}
        >
          {name}
        </p>
      </div>
    </div>
  );
}

/* ======================================================================== */
/*  JOB QUEUE CARD (mirrors customer's BookingCard style)                   */
/* ======================================================================== */



/* ======================================================================== */
/*  QUICK ACTION BUTTON (identical to customer)                             */
/* ======================================================================== */

function QuickAction({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-slate-800/50 bg-[#0b1422] px-3 py-4 text-center transition hover:border-cyan-400/20 hover:bg-cyan-400/5 cursor-pointer">
      <div className="text-cyan-400">{icon}</div>
      <span className="text-xs font-medium text-[var(--text-secondary)]">
        {label}
      </span>
    </div>
  );
}

/* ======================================================================== */
/*  STATS CARD (identical to customer)                                      */
/* ======================================================================== */

function StatsCard({
  title,
  value,
  colorClass,
  icon,
  subtitle,
}: {
  title: string;
  value: number;
  colorClass: string;
  icon: ReactNode;
  subtitle: string;
}) {
  return (
    <div className="rounded-xl border border-slate-800/40 bg-[#0b1422] p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.05em] text-[var(--text-muted)]">
          {title}
        </p>
        {icon}
      </div>
      <p className={`mt-2 text-2xl font-bold ${colorClass}`}>{value}</p>
      <p className="mt-1 text-xs text-[var(--text-muted)]">{subtitle}</p>
    </div>
  );
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

function RevenueCard({
  title,
  value,
  subtitle,
  trend,
  icon,
  href,
}: {
  title: string;
  value: string;
  subtitle: string;
  trend: Trend;
  icon: ReactNode;
  href?: string;
}) {
  const content = (
    <div className="rounded-xl border border-slate-800/40 bg-[#0b1422] p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.05em] text-[var(--text-muted)]">
          {title}
        </p>
        {icon}
      </div>
      <p className="mt-2 text-2xl font-bold text-fuchsia-300">{value}</p>
      <div className="mt-1 flex items-center justify-between gap-2">
        <p className="text-xs text-[var(--text-muted)]">{subtitle}</p>
        <TrendBadge trend={trend} />
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block transition hover:-translate-y-0.5">
        {content}
      </Link>
    );
  }
  return content;
}
