"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { ReactNode } from "react";
import {
  CalendarPlus,
  CarFront,
  CheckCircle2,
  Clock3,
  MessageCircle,
  List,
  Bell,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { EmptyState } from "@/components/shared/EmptyState";
import { BookingCard } from "@/components/booking/BookingCard";
import { ProgressBar } from "@/components/booking/ProgressBar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getBooking, listBookings } from "@/services/bookings.service";
import { listWorkStages } from "@/services/operations.service";
import { listNotifications } from "@/services/notifications.service";
import { useAuthStore } from "@/store/authStore";
import { titleCase } from "@/lib/formatters";
import { useDashboardLiveBookingUpdates } from "@/hooks/useDashboardLiveBookingUpdates";
import type { BookingStatus, Booking } from "@/types/booking.types";
import type { WorkStage } from "@/types/operations.types";

/* ======================================================================== */
/*  DASHBOARD PAGE                                                          */
/* ======================================================================== */

export default function CustomerDashboardPage() {
  const user = useAuthStore((state) => state.user);
  const query = useQuery({ queryKey: ["bookings"], queryFn: listBookings });

  const bookings = query.data ?? [];
  const activeBookings = bookings.filter(
    (b) => b.status === "confirmed" || b.status === "in_progress"
  );
  const pendingBookings = bookings.filter((b) => b.status === "pending");
  const completedCount = bookings.filter((b) => b.status === "completed").length;

  // The primary in-progress booking (the one the customer cares about most)
  const primaryBooking = activeBookings.find((b) => b.status === "in_progress") ?? activeBookings[0];
  const primaryBookingId = primaryBooking?.id;

  // Fetch full booking detail for timeline
  const primaryDetailQuery = useQuery({
    queryKey: ["booking-detail", primaryBookingId],
    queryFn: () => getBooking(primaryBookingId as string),
    enabled: Boolean(primaryBookingId),
  });

  // Fetch work stages for the primary booking's job card
  const jobCardId =
    primaryDetailQuery.data &&
      "items" in primaryDetailQuery.data
      ? primaryDetailQuery.data.id
      : null;

  const stagesQuery = useQuery({
    queryKey: ["work-stages", jobCardId],
    queryFn: () => listWorkStages({ job_card: jobCardId as string }),
    enabled: Boolean(jobCardId),
    // The work stages API may return empty if not indexed by booking,
    // so we fall back to the booking's own stage info
  });

  // Fetch recent notifications
  const notificationsQuery = useQuery({
    queryKey: ["notifications"],
    queryFn: listNotifications,
  });
  const recentNotifications = (notificationsQuery.data ?? []).slice(0, 5);
  const liveBookingIds = useMemo(() => activeBookings.map((booking) => booking.id), [activeBookings]);
  useDashboardLiveBookingUpdates(liveBookingIds);

  return (
    <section className="space-y-8 app-fade-in">
      {/* ────────────────────── HERO ────────────────────── */}
      <div className="-mt-6 relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen">
        <div
          className="relative flex min-h-[36vh] max-h-[560px] overflow-hidden bg-cover bg-[center_right] px-6 py-10 sm:min-h-[40vh] sm:px-8 sm:py-12 lg:px-12"
          style={{
            backgroundImage:
              "linear-gradient(90deg, rgba(2,6,23,0.95) 0%, rgba(2,6,23,0.8) 35%, rgba(2,6,23,0.4) 55%, rgba(2,6,23,0) 75%), url('/images/customer-hero.png')",
          }}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_36%,rgba(34,211,238,0.12),transparent_52%)]" />
          <div className="absolute inset-x-0 bottom-0 h-28 bg-[linear-gradient(180deg,transparent,rgba(7,11,20,0.95))]" />

          <div className="relative z-10 flex w-full max-w-3xl flex-col justify-between">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-cyan-300">Welcome</p>
              <h1 className="text-4xl font-bold leading-tight text-[var(--text-primary)] sm:text-5xl">
                {user?.full_name ?? "Customer"},
              </h1>
              <h2 className="text-2xl font-semibold leading-tight text-slate-100 sm:text-3xl">
                Keep your car showroom-ready.
              </h2>
              <p className="max-w-2xl text-base text-slate-300 sm:text-lg">
                Book premium wash and coating services, track progress live, and manage everything from one place.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ────────────────────── QUICK ACTIONS ────────────────────── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Link href="/services">
          <QuickAction icon={<CarFront className="size-5" />} label="Our Services" />
        </Link>
        <Link href="/book">
          <QuickAction icon={<CalendarPlus className="size-5" />} label="New Booking" />
        </Link>
        <Link href="/bookings">
          <QuickAction icon={<List className="size-5" />} label="All Bookings" />
        </Link>
        <Link href="/messages">
          <QuickAction icon={<MessageCircle className="size-5" />} label="Messages" />
        </Link>
      </div>

      {/* ────────────────────── CURRENT SERVICE PROGRESS ────────────────────── */}
      {primaryBooking && primaryDetailQuery.data && (
        <CurrentServiceProgress
          booking={primaryDetailQuery.data}
          stages={stagesQuery.data ?? []}
        />
      )}

      {/* ────────────────────── STATS ────────────────────── */}
      <div className="grid gap-3 sm:grid-cols-3">
        <StatsCard
          title="Active Services"
          value={activeBookings.length}
          colorClass="text-cyan-400"
          icon={<CarFront className="size-4 text-cyan-300" />}
          subtitle={activeBookings.length === 1 ? "1 car being serviced" : `${activeBookings.length} cars being serviced`}
        />
        <StatsCard
          title="Pending"
          value={pendingBookings.length}
          colorClass="text-amber-400"
          icon={<Clock3 className="size-4 text-amber-300" />}
          subtitle={pendingBookings.length > 0 ? "Awaiting confirmation" : "No pending bookings"}
        />
        <StatsCard
          title="Completed"
          value={completedCount}
          colorClass="text-emerald-400"
          icon={<CheckCircle2 className="size-4 text-emerald-300" />}
          subtitle="Total services completed"
        />
      </div>

      {/* ────────────────────── ACTIVE BOOKINGS ────────────────────── */}
      {activeBookings.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-end justify-between gap-3">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Active Bookings</h2>
            <Link href="/bookings" className="text-sm font-medium text-[var(--accent)] hover:text-[var(--accent-hover)]">
              View all →
            </Link>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {activeBookings.map((booking) => (
              <BookingCard key={booking.id} booking={booking} />
            ))}
          </div>
        </div>
      ) : query.isLoading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="h-48 animate-pulseSoft rounded-xl bg-[var(--bg-elevated)]" />
          <div className="h-48 animate-pulseSoft rounded-xl bg-[var(--bg-elevated)]" />
        </div>
      ) : bookings.length > 0 ? (
        <EmptyState title="No active bookings" description="Your current bookings are either pending or completed." />
      ) : (
        <EmptyState title="No bookings yet" description="Create your first booking to get started." />
      )}

      {/* ────────────────────── RECENT NOTIFICATIONS ────────────────────── */}
      {recentNotifications.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-end justify-between gap-3">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Recent Updates</h2>
            <Link href="/notifications" className="text-sm font-medium text-[var(--accent)] hover:text-[var(--accent-hover)]">
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
                  <p className="text-sm font-medium text-[var(--text-primary)]">{notif.title}</p>
                  <p className="mt-0.5 text-xs text-[var(--text-secondary)] line-clamp-2">{notif.body}</p>
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
/*  CURRENT SERVICE PROGRESS (the #1 thing the customer wants to see)       */
/* ======================================================================== */

function CurrentServiceProgress({
  booking,
  stages,
}: {
  booking: Booking;
  stages: WorkStage[];
}) {
  const vehicleName = booking.vehicle.brand
    ? `${booking.vehicle.brand}${booking.vehicle.model ? ` ${booking.vehicle.model}` : ""}`
    : booking.vehicle.plate_number;

  const stageLabel = booking.current_stage
    ? titleCase(booking.current_stage)
    : "Pending";

  // Format ETA
  const eta = booking.estimated_completion
    ? new Date(booking.estimated_completion).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })
    : null;

  const timeRemaining = booking.estimated_completion
    ? (() => {
      const diff = new Date(booking.estimated_completion).getTime() - Date.now();
      if (diff <= 0) return "Ready soon";
      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      return h > 0 ? `${h}h ${m}m remaining` : `${m}m remaining`;
    })()
    : null;

  // Sort stages by order
  const sortedStages = [...stages].sort((a, b) => a.stage_order - b.stage_order);
  const hasStages = sortedStages.length > 0;

  return (
    <div className="rounded-2xl border border-slate-800/50 bg-gradient-to-b from-[#0d1829] to-[#0b1422] p-6 shadow-lg shadow-black/20">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-cyan-300">
            Current Service
          </p>
          <h3 className="flex items-center gap-2 text-xl font-bold text-[var(--text-primary)]">
            <CarFront className="size-5 text-cyan-400" />
            {vehicleName}
          </h3>
          <p className="text-sm text-[var(--text-secondary)]">
            {booking.vehicle.plate_number} · {booking.airport.name}
          </p>
        </div>
        <Badge status={booking.status} pulse={booking.status === "in_progress"} />
      </div>

      {/* Stage + Progress Bar */}
      <div className="mt-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-flex size-7 items-center justify-center rounded-full bg-cyan-400/10 text-cyan-400">
            <span className="size-2 rounded-full bg-current animate-pulseSoft" />
          </span>
          <span className="text-sm font-semibold text-[var(--text-primary)]">
            Stage: {stageLabel}
          </span>
        </div>
        <span className="text-lg font-bold text-[var(--accent)]">
          {booking.progress_percentage}%
        </span>
      </div>
      <div className="mt-2">
        <ProgressBar value={booking.progress_percentage} />
      </div>

      {/* Detailed Timeline */}
      {hasStages && (
        <div className="mt-6 space-y-0">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.05em] text-[var(--text-muted)]">
            Progress Timeline
          </p>
          <div className="space-y-0">
            {sortedStages.map((stage, idx) => (
              <TimelineStep
                key={stage.id}
                name={titleCase(stage.stage_name)}
                status={stage.status}
                isLast={idx === sortedStages.length - 1}
              />
            ))}
          </div>
        </div>
      )}

      {/* ETA */}
      {(eta || timeRemaining) && (
        <div className="mt-5 flex items-center justify-between rounded-xl border border-slate-800/50 bg-[var(--bg-elevated)]/30 px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
            <Clock3 className="size-4 text-cyan-400" />
            Estimated completion
          </div>
          <div className="text-right">
            {eta && <p className="text-base font-bold text-[var(--text-primary)]">{eta}</p>}
            {timeRemaining && (
              <p className="text-xs text-[var(--text-muted)]">{timeRemaining}</p>
            )}
          </div>
        </div>
      )}

      {/* CTA */}
      <div className="mt-4">
        <Link
          href={`/bookings/${booking.id}`}
          className="flex items-center justify-center gap-2 rounded-xl border border-cyan-500/20 bg-cyan-400/5 py-2.5 text-sm font-medium text-[var(--accent)] transition hover:bg-cyan-400/10"
        >
          View Full Details
        </Link>
      </div>
    </div>
  );
}

/* ======================================================================== */
/*  TIMELINE STEP — ✔ / ● / ○ with colors                                  */
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
  const isPending = status === "pending";

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
/*  QUICK ACTION BUTTON                                                     */
/* ======================================================================== */

function QuickAction({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-slate-800/50 bg-[#0b1422] px-3 py-4 text-center transition hover:border-cyan-400/20 hover:bg-cyan-400/5 cursor-pointer">
      <div className="text-cyan-400">{icon}</div>
      <span className="text-xs font-medium text-[var(--text-secondary)]">{label}</span>
    </div>
  );
}

/* ======================================================================== */
/*  STATS CARD                                                              */
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
        <p className="text-xs font-semibold uppercase tracking-[0.05em] text-[var(--text-muted)]">{title}</p>
        {icon}
      </div>
      <p className={`mt-2 text-2xl font-bold ${colorClass}`}>{value}</p>
      <p className="mt-1 text-xs text-[var(--text-muted)]">{subtitle}</p>
    </div>
  );
}
