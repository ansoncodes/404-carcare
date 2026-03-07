import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { JobCard } from "@/types/operations.types";

interface JobCardDetailProps {
  card: JobCard;
  chatHref: string;
  busyAction: "start" | "next" | "pause" | "complete" | null;
  onStart: () => void;
  onNext: () => void;
  onPause: () => void;
  onComplete: () => void;
  errorMessage?: string | null;
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function JobCardDetail({
  card,
  chatHref,
  busyAction,
  onStart,
  onNext,
  onPause,
  onComplete,
  errorMessage,
}: JobCardDetailProps) {
  const booking = typeof card.booking === "string" ? null : card.booking;
  const stages = [...card.stages].sort((a, b) => a.stage_order - b.stage_order);
  const currentStage = stages.find((stage) => stage.status === "in_progress")?.stage_name ?? booking?.current_stage ?? "-";
  const hasInProgress = stages.some((stage) => stage.status === "in_progress");
  const allStagesDone = stages.length > 0 && stages.every((stage) => stage.status === "completed" || stage.status === "skipped");

  // Check if the last stage is a QC stage
  const lastStageName = stages.length > 0 ? stages[stages.length - 1].stage_name.trim().toLowerCase().replace(/_/g, " ") : "";
  const lastStageIsQc = lastStageName === "quality check" || lastStageName === "qc";
  const needsQc = allStagesDone && !lastStageIsQc;

  const vehicleLabel = booking
    ? `${booking.vehicle.brand ?? "Vehicle"}${booking.vehicle.model ? ` ${booking.vehicle.model}` : ""}`
    : "Vehicle";
  const customerName = booking?.customer?.full_name ?? "Customer";
  const plateNumber = booking?.vehicle.plate_number ?? "-";
  const airportName = booking?.airport.name ?? "-";
  const bookingAllowsStart = !booking || booking.status === "confirmed" || booking.status === "in_progress";

  const canStart = card.status !== "completed" && bookingAllowsStart && (card.status === "pending" || card.status === "paused");
  const canNext = card.status === "active" && (hasInProgress || needsQc);
  const canPause = card.status === "active";
  const canComplete = card.status !== "completed" && allStagesDone && !needsQc;
  const totalHours = (card.total_estimated_duration_minutes / 60).toFixed(1);

  return (
    <div className="panel space-y-5 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mono text-xs text-[var(--text-muted)]">{card.job_number}</p>
          <h2 className="mt-1 text-xl font-semibold text-[var(--text-primary)]">{vehicleLabel}</h2>
          <p className="text-sm text-[var(--text-secondary)]">
            Customer: {customerName}
          </p>
          <p className="text-sm text-[var(--text-secondary)]">
            {plateNumber} - {airportName}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge status={card.status} pulse={card.status === "active"} />
          <Link
            href={chatHref}
            className="inline-flex h-9 items-center justify-center rounded-lg border border-[var(--bg-border)] bg-[var(--bg-elevated)] px-3 text-xs font-medium text-[var(--text-primary)] transition hover:border-[var(--accent)] hover:bg-[#1f2d4a]"
          >
            Open Chat
          </Link>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2 rounded-xl border border-[var(--bg-border)] bg-[var(--bg-elevated)]/40 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.05em] text-[var(--text-muted)]">Service Package</p>
          {card.services.length > 0 ? (
            <ul className="space-y-1 text-sm text-[var(--text-primary)]">
              {card.services.map((service) => (
                <li key={service}>- {service}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[var(--text-secondary)]">No services mapped.</p>
          )}
        </div>

        <div className="space-y-2 rounded-xl border border-[var(--bg-border)] bg-[var(--bg-elevated)]/40 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.05em] text-[var(--text-muted)]">Job Summary</p>
          <p className="text-sm text-[var(--text-secondary)]">
            Current stage: <span className="text-[var(--text-primary)]">{currentStage.replaceAll("_", " ")}</span>
          </p>
          <p className="text-sm text-[var(--text-secondary)]">
            Estimated work time: {card.total_estimated_duration_minutes} min ({totalHours} hrs)
          </p>
          <p className="text-sm text-[var(--text-secondary)]">Estimated completion: {formatDateTime(card.booking_estimated_completion)}</p>
          <p className="text-sm text-[var(--text-secondary)]">Notes: {card.notes ?? "-"}</p>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Button variant="primary" disabled={!canStart || busyAction !== null} onClick={onStart}>
          {busyAction === "start" ? "Starting..." : "Start Service"}
        </Button>
        <Button variant="secondary" disabled={!canNext || busyAction !== null} onClick={onNext}>
          {busyAction === "next" ? "Updating..." : needsQc ? "Add QC Stage" : "Next Stage"}
        </Button>
        <Button variant="secondary" disabled={!canPause || busyAction !== null} onClick={onPause}>
          {busyAction === "pause" ? "Pausing..." : "Pause"}
        </Button>
        <Button variant="secondary" disabled={!canComplete || busyAction !== null} onClick={onComplete}>
          {busyAction === "complete" ? "Completing..." : "Complete Job"}
        </Button>
      </div>

      {needsQc && (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-300">
          Quality Check is required before completing this job. Click &quot;Add QC Stage&quot; to proceed.
        </p>
      )}

      {errorMessage ? <p className="text-sm text-[var(--danger)]">{errorMessage}</p> : null}
    </div>
  );
}
