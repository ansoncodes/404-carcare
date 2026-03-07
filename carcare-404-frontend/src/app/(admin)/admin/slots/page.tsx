"use client";

import { PageHeader } from "@/components/shared/PageHeader";

export default function AdminSlotsPage() {
  return (
    <section className="space-y-6">
      <PageHeader
        title="Booking Capacity"
        subtitle="Availability is now managed dynamically"
      />
      <div className="panel space-y-4 p-6">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
            <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 12l2 2 4-4" />
              <circle cx="12" cy="12" r="10" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Dynamic Overlap Detection Active
            </h3>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              The system now uses real-time overlap detection instead of
              pre-created time slots. Up to <strong>7 cars</strong> can be
              serviced concurrently at any given moment.
            </p>
          </div>
        </div>
        <div className="rounded-lg bg-[var(--bg-elevated)] p-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            How it works
          </h4>
          <ul className="mt-2 space-y-2 text-sm text-[var(--text-secondary)]">
            <li>• When a customer books, the total duration is computed from their selected services.</li>
            <li>• The system checks every minute of the requested time window for concurrent bookings.</li>
            <li>• If all 7 slots are occupied at any point during the window, the time is marked unavailable.</li>
            <li>• The system then suggests the next available time in 15-minute increments.</li>
          </ul>
        </div>
      </div>
    </section>
  );
}