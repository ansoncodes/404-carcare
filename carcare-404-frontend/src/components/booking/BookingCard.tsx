import Link from "next/link";
import clsx from "clsx";
import { CarFront, Clock3, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/booking/ProgressBar";
import { titleCase } from "@/lib/formatters";
import type { Booking, BookingListRow } from "@/types/booking.types";

interface BookingCardProps {
  booking: Booking | BookingListRow;
}

function formatTimeRemaining(isoDate: string | null | undefined): string | null {
  if (!isoDate) return null;
  const target = new Date(isoDate).getTime();
  const now = Date.now();
  const diff = target - now;
  if (diff <= 0) return "Ready soon";
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return `${hours}h ${mins}m remaining`;
  return `${mins}m remaining`;
}

function formatETA(isoDate: string | null | undefined): string | null {
  if (!isoDate) return null;
  const d = new Date(isoDate);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function BookingCard({ booking }: BookingCardProps) {
  const isActive = booking.status === "confirmed" || booking.status === "in_progress";
  const stageLabel = booking.current_stage ? titleCase(booking.current_stage) : "Pending assignment";

  // Get estimated_completion if available on the full Booking type
  const estimatedCompletion = "estimated_completion" in booking ? (booking as Booking).estimated_completion : null;
  const eta = formatETA(estimatedCompletion);
  const timeRemaining = formatTimeRemaining(estimatedCompletion);

  return (
    <Card
      className={clsx(
        "panel-hover !p-0 overflow-hidden border-slate-800/60 bg-[#0b1422] shadow-lg shadow-black/20 hover:border-cyan-400/20 hover:shadow-cyan-500/5",
        isActive && "theme-customer-divider"
      )}
    >
      <div className="relative p-5">
        <div className="absolute inset-x-0 top-0 h-[1px] bg-[linear-gradient(90deg,transparent,var(--accent),transparent)] opacity-40" />
        <div className="space-y-4">
          {/* Header: Vehicle + Badge */}
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="inline-flex items-center gap-2 text-base font-semibold text-[var(--text-primary)]">
                <CarFront className="size-4 text-cyan-400" />
                <span>
                  {booking.vehicle.brand ? `${booking.vehicle.brand}${booking.vehicle.model ? ` ${booking.vehicle.model}` : ""}` : "Vehicle"}
                </span>
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                {booking.vehicle.plate_number} · {booking.airport.name}
              </p>
            </div>
            <Badge status={booking.status} pulse={booking.status === "in_progress"} />
          </div>

          {/* Stage + Progress */}
          <div className="rounded-lg bg-[var(--bg-elevated)]/40 p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="inline-flex size-6 items-center justify-center rounded-full bg-cyan-400/10 text-cyan-400">
                  <span className="size-1.5 rounded-full bg-current animate-pulseSoft" />
                </span>
                <span className="text-sm font-medium text-[var(--text-primary)]">
                  {stageLabel}
                </span>
              </div>
              <span className="text-sm font-bold text-[var(--accent)]">
                {booking.progress_percentage}%
              </span>
            </div>
            <ProgressBar value={booking.progress_percentage} />
          </div>

          {/* ETA */}
          {estimatedCompletion && (
            <div className="flex items-center justify-between rounded-lg border border-slate-800/60 px-3 py-2">
              <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                <Clock3 className="size-3.5 text-cyan-400" />
                <span>Estimated completion</span>
              </div>
              <div className="text-right">
                {eta && (
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{eta}</p>
                )}
                {timeRemaining && (
                  <p className="text-[10px] text-[var(--text-muted)]">{timeRemaining}</p>
                )}
              </div>
            </div>
          )}

          {/* Action */}
          <Link
            href={`/bookings/${booking.id}`}
            className="flex items-center justify-center gap-2 rounded-lg border border-slate-800/60 py-2 text-xs font-medium text-[var(--accent)] transition hover:border-cyan-400/30 hover:bg-cyan-400/5"
          >
            View Service Progress
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </div>
    </Card>
  );
}
