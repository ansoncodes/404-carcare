/**
 * Phase 1 finding applied:
 * - Reports can be composed from existing analytics/payments/bookings/job-cards APIs.
 * TODO(API): PDF export and true slot utilization endpoints are not currently available.
 */
"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DataTable } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/shared/PageHeader";
import { currencyINR } from "@/lib/formatters";
import { listAirports } from "@/services/airports.service";
import { listBookings } from "@/services/bookings.service";
import { listJobCards } from "@/services/operations.service";
import { listParkingSlots } from "@/services/parking.service";
import { listPayments } from "@/services/payments.service";
import type { BookingListRow } from "@/types/booking.types";
import type { JobCard } from "@/types/operations.types";
import type { Payment } from "@/types/payment.types";

interface IncomeRow {
  airport: string;
  code: string;
  revenue: number;
  bookings: number;
}

interface VolumeRow {
  day: string;
  bookings: number;
}

interface ServiceRow {
  service: string;
  count: number;
}

interface SupervisorRow {
  supervisor: string;
  jobsCompleted: number;
  avgMinutes: number;
}

interface SlotSnapshotRow {
  airport: string;
  code: string;
  availableSlots: number;
}

function toYmd(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function parseMoney(value: string | number): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function inRange(value: string | null, from: string, to: string): boolean {
  if (!value) {
    return false;
  }
  const day = value.slice(0, 10);
  return day >= from && day <= to;
}

function downloadCsv(filename: string, rows: Array<Record<string, string | number>>) {
  if (rows.length === 0) {
    return;
  }
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];

  rows.forEach((row) => {
    const line = headers
      .map((header) => {
        const raw = String(row[header] ?? "");
        const escaped = raw.replaceAll('"', '""');
        return `"${escaped}"`;
      })
      .join(",");
    lines.push(line);
  });

  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function AdminReportsPage() {
  const now = new Date();
  const initialStart = new Date(now);
  initialStart.setDate(initialStart.getDate() - 29);

  const [fromDate, setFromDate] = useState(toYmd(initialStart));
  const [toDate, setToDate] = useState(toYmd(now));

  const airportsQuery = useQuery({ queryKey: ["report-airports"], queryFn: listAirports });
  const bookingsQuery = useQuery({ queryKey: ["report-bookings"], queryFn: listBookings });
  const paymentsQuery = useQuery({ queryKey: ["report-payments"], queryFn: listPayments });
  const jobsQuery = useQuery({ queryKey: ["report-job-cards"], queryFn: listJobCards });
  const slotsQuery = useQuery({ queryKey: ["report-parking-slots"], queryFn: () => listParkingSlots() });

  const airports = airportsQuery.data ?? [];
  const bookings = bookingsQuery.data ?? [];
  const payments = paymentsQuery.data ?? [];
  const jobs = jobsQuery.data ?? [];
  const slots = slotsQuery.data ?? [];

  const bookingById = useMemo(() => {
    const map = new Map<string, BookingListRow>();
    bookings.forEach((booking) => {
      map.set(booking.id, booking);
    });
    return map;
  }, [bookings]);

  const incomeRows = useMemo<IncomeRow[]>(() => {
    const byAirport = new Map<string, IncomeRow>();

    payments.forEach((payment: Payment) => {
      if (payment.status !== "paid" || !inRange(payment.paid_at, fromDate, toDate)) {
        return;
      }
      const airport = payment.booking.airport;
      const key = airport.id;
      const current = byAirport.get(key) ?? {
        airport: airport.name,
        code: airport.code,
        revenue: 0,
        bookings: 0,
      };
      current.revenue += parseMoney(payment.total_amount);
      current.bookings += 1;
      byAirport.set(key, current);
    });

    return [...byAirport.values()].sort((a, b) => b.revenue - a.revenue);
  }, [fromDate, payments, toDate]);

  const bookingVolumeRows = useMemo<VolumeRow[]>(() => {
    const counts = new Map<string, number>();
    bookings.forEach((booking) => {
      if (!inRange(booking.created_at, fromDate, toDate)) {
        return;
      }
      const day = booking.created_at.slice(0, 10);
      counts.set(day, (counts.get(day) ?? 0) + 1);
    });

    return [...counts.entries()]
      .map(([day, count]) => ({ day, bookings: count }))
      .sort((a, b) => a.day.localeCompare(b.day));
  }, [bookings, fromDate, toDate]);

  const servicePopularityRows = useMemo<ServiceRow[]>(() => {
    const counts = new Map<string, number>();
    jobs.forEach((job: JobCard) => {
      const booking = typeof job.booking === "string" ? bookingById.get(job.booking) : job.booking;
      const bookingDate = booking?.created_at ?? null;
      if (!inRange(bookingDate, fromDate, toDate)) {
        return;
      }
      job.services.forEach((service) => {
        counts.set(service, (counts.get(service) ?? 0) + 1);
      });
    });

    return [...counts.entries()]
      .map(([service, count]) => ({ service, count }))
      .sort((a, b) => b.count - a.count);
  }, [bookingById, fromDate, jobs, toDate]);

  const supervisorPerformanceRows = useMemo<SupervisorRow[]>(() => {
    const bySupervisor = new Map<string, { completed: number; totalMinutes: number; counted: number }>();

    jobs.forEach((job: JobCard) => {
      const booking = typeof job.booking === "string" ? bookingById.get(job.booking) : job.booking;
      const bookingDate = booking?.created_at ?? null;
      if (!inRange(bookingDate, fromDate, toDate) || !job.supervisor) {
        return;
      }

      const key = job.supervisor.full_name;
      const current = bySupervisor.get(key) ?? { completed: 0, totalMinutes: 0, counted: 0 };
      if (job.status === "completed") {
        current.completed += 1;
      }
      if (job.started_at && job.completed_at) {
        const started = new Date(job.started_at).getTime();
        const ended = new Date(job.completed_at).getTime();
        if (ended > started) {
          current.totalMinutes += Math.round((ended - started) / 60000);
          current.counted += 1;
        }
      }
      bySupervisor.set(key, current);
    });

    return [...bySupervisor.entries()]
      .map(([supervisor, stats]) => ({
        supervisor,
        jobsCompleted: stats.completed,
        avgMinutes: stats.counted > 0 ? Math.round(stats.totalMinutes / stats.counted) : 0,
      }))
      .sort((a, b) => b.jobsCompleted - a.jobsCompleted);
  }, [bookingById, fromDate, jobs, toDate]);

  const slotSnapshotRows = useMemo<SlotSnapshotRow[]>(() => {
    const countByAirport = new Map<string, SlotSnapshotRow>();

    airports.forEach((airport) => {
      countByAirport.set(airport.id, {
        airport: airport.name,
        code: airport.code,
        availableSlots: 0,
      });
    });

    slots.forEach((slot) => {
      const key = slot.airport.id;
      const row = countByAirport.get(key);
      if (!row) {
        return;
      }
      row.availableSlots += 1;
      countByAirport.set(key, row);
    });

    return [...countByAirport.values()].sort((a, b) => b.availableSlots - a.availableSlots);
  }, [airports, slots]);

  const loading =
    airportsQuery.isLoading || bookingsQuery.isLoading || paymentsQuery.isLoading || jobsQuery.isLoading || slotsQuery.isLoading;

  return (
    <section className="space-y-6 app-fade-in">
      <PageHeader title="Reports" subtitle="Operational reports built from live backend data" />

      <div className="grid gap-3 rounded-xl border border-slate-800/50 bg-[#0b1422] p-4 md:grid-cols-3">
        <Input label="From" type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
        <Input label="To" type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
        <div className="flex items-end">
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => {
              setFromDate(toYmd(initialStart));
              setToDate(toYmd(now));
            }}
          >
            Reset to 30 days
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="h-48 animate-pulseSoft rounded-xl bg-[var(--bg-elevated)]" />
      ) : (
        <>
          <div className="space-y-3 rounded-xl border border-slate-800/50 bg-[#0b1422] p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Income by Airport</h3>
              <Button
                size="sm"
                variant="secondary"
                onClick={() =>
                  downloadCsv(
                    `income_by_airport_${fromDate}_${toDate}.csv`,
                    incomeRows.map((row) => ({
                      airport: row.airport,
                      code: row.code,
                      revenue: row.revenue,
                      bookings: row.bookings,
                    }))
                  )
                }
              >
                Export CSV
              </Button>
            </div>
            <DataTable
              rows={incomeRows}
              rowKey={(row) => `${row.code}-${row.airport}`}
              columns={[
                { key: "airport", header: "Airport", render: (row) => `${row.airport} (${row.code})` },
                { key: "bookings", header: "Paid Bookings", render: (row) => row.bookings },
                { key: "revenue", header: "Revenue", render: (row) => currencyINR(row.revenue) },
              ]}
            />
          </div>

          <div className="space-y-3 rounded-xl border border-slate-800/50 bg-[#0b1422] p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Booking Volume</h3>
              <Button
                size="sm"
                variant="secondary"
                onClick={() =>
                  downloadCsv(
                    `booking_volume_${fromDate}_${toDate}.csv`,
                    bookingVolumeRows.map((row) => ({ day: row.day, bookings: row.bookings }))
                  )
                }
              >
                Export CSV
              </Button>
            </div>
            <DataTable
              rows={bookingVolumeRows}
              rowKey={(row) => row.day}
              columns={[
                { key: "day", header: "Date", render: (row) => row.day },
                { key: "count", header: "Bookings", render: (row) => row.bookings },
              ]}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-3 rounded-xl border border-slate-800/50 bg-[#0b1422] p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Service Popularity</h3>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    downloadCsv(
                      `service_popularity_${fromDate}_${toDate}.csv`,
                      servicePopularityRows.map((row) => ({ service: row.service, count: row.count }))
                    )
                  }
                >
                  Export CSV
                </Button>
              </div>
              <DataTable
                rows={servicePopularityRows}
                rowKey={(row) => row.service}
                columns={[
                  { key: "service", header: "Service", render: (row) => row.service },
                  { key: "count", header: "Booked", render: (row) => row.count },
                ]}
              />
            </div>

            <div className="space-y-3 rounded-xl border border-slate-800/50 bg-[#0b1422] p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Supervisor Performance</h3>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    downloadCsv(
                      `supervisor_performance_${fromDate}_${toDate}.csv`,
                      supervisorPerformanceRows.map((row) => ({
                        supervisor: row.supervisor,
                        jobs_completed: row.jobsCompleted,
                        avg_minutes: row.avgMinutes,
                      }))
                    )
                  }
                >
                  Export CSV
                </Button>
              </div>
              <DataTable
                rows={supervisorPerformanceRows}
                rowKey={(row) => row.supervisor}
                columns={[
                  { key: "name", header: "Supervisor", render: (row) => row.supervisor },
                  { key: "jobs", header: "Completed Jobs", render: (row) => row.jobsCompleted },
                  { key: "avg", header: "Avg Time", render: (row) => `${row.avgMinutes} mins` },
                ]}
              />
            </div>
          </div>

          <div className="space-y-3 rounded-xl border border-slate-800/50 bg-[#0b1422] p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Slot Snapshot (Available Slots)</h3>
              <Button
                size="sm"
                variant="secondary"
                onClick={() =>
                  downloadCsv(
                    `slot_snapshot_${fromDate}_${toDate}.csv`,
                    slotSnapshotRows.map((row) => ({
                      airport: row.airport,
                      code: row.code,
                      available_slots: row.availableSlots,
                    }))
                  )
                }
              >
                Export CSV
              </Button>
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              True utilization requires occupied/reserved slot visibility. Current API list endpoint returns available slots only.
            </p>
            <DataTable
              rows={slotSnapshotRows}
              rowKey={(row) => `${row.code}-${row.airport}`}
              columns={[
                { key: "airport", header: "Airport", render: (row) => `${row.airport} (${row.code})` },
                { key: "available", header: "Available Slots", render: (row) => row.availableSlots },
              ]}
            />
          </div>

          <div className="rounded-xl border border-amber-400/40 bg-amber-500/10 p-4 text-sm text-amber-200">
            PDF export is not implemented because backend report/PDF endpoints are unavailable. CSV exports above use live API data.
          </div>
        </>
      )}
    </section>
  );
}
