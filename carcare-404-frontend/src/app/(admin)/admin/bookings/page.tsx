"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/shared/PageHeader";
import { currencyINR, formatDate } from "@/lib/formatters";
import { useToast } from "@/providers/ToastProvider";
import { listUsers } from "@/services/auth.service";
import { cancelBooking, getBooking, listBookings } from "@/services/bookings.service";
import { listJobCards } from "@/services/operations.service";
import { listPayments } from "@/services/payments.service";
import type { BookingListRow } from "@/types/booking.types";

const PAGE_SIZE = 20;

interface EnrichedBooking {
  booking: BookingListRow;
  type: "parking" | "service";
  services: string[];
  amount: number;
  supervisorId: string | null;
  supervisorName: string;
}

function money(value: string | number | null | undefined): number {
  if (value === null || value === undefined) {
    return 0;
  }
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isOverdue(booking: BookingListRow): boolean {
  if (!booking.scheduled_end) {
    return false;
  }
  if (["completed", "cancelled", "no_show"].includes(booking.status)) {
    return false;
  }
  return new Date(booking.scheduled_end).getTime() < Date.now();
}

function isNewBooking(booking: BookingListRow): boolean {
  return Date.now() - new Date(booking.created_at).getTime() <= 2 * 60 * 60 * 1000;
}

export default function AdminBookingsPage() {
  const toast = useToast();
  const [airportFilter, setAirportFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [supervisorFilter, setSupervisorFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [infiniteMode, setInfiniteMode] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const bookingsQuery = useQuery({ queryKey: ["admin-bookings-list"], queryFn: listBookings, refetchInterval: 30000 });
  const jobsQuery = useQuery({ queryKey: ["admin-bookings-jobs"], queryFn: listJobCards, refetchInterval: 30000 });
  const paymentsQuery = useQuery({ queryKey: ["admin-bookings-payments"], queryFn: listPayments, refetchInterval: 30000 });
  const supervisorsQuery = useQuery({ queryKey: ["admin-booking-supervisors"], queryFn: () => listUsers("supervisor") });

  const detailQuery = useQuery({
    queryKey: ["admin-booking-detail", selectedBookingId],
    queryFn: () => getBooking(selectedBookingId as string),
    enabled: Boolean(selectedBookingId),
  });

  const supervisors = supervisorsQuery.data ?? [];
  const bookings = bookingsQuery.data ?? [];
  const jobs = jobsQuery.data ?? [];
  const payments = paymentsQuery.data ?? [];

  const jobByBookingId = useMemo(() => {
    const map = new Map<string, (typeof jobs)[number]>();
    jobs.forEach((job) => {
      const bookingId = typeof job.booking === "string" ? job.booking : job.booking.id;
      map.set(bookingId, job);
    });
    return map;
  }, [jobs]);

  const paymentByBookingId = useMemo(() => {
    const map = new Map<string, number>();
    payments.forEach((payment) => {
      map.set(payment.booking.id, money(payment.total_amount));
    });
    return map;
  }, [payments]);

  const enrichedRows = useMemo<EnrichedBooking[]>(() => {
    return bookings.map((booking) => {
      const job = jobByBookingId.get(booking.id);
      const services = job?.services ?? [];
      const type: "parking" | "service" = services.length > 0 ? "service" : "parking";
      return {
        booking,
        type,
        services,
        amount: paymentByBookingId.get(booking.id) ?? 0,
        supervisorId: job?.supervisor?.id ?? null,
        supervisorName: job?.supervisor?.full_name ?? "Unassigned",
      };
    });
  }, [bookings, jobByBookingId, paymentByBookingId]);

  const filtered = useMemo(() => {
    return enrichedRows.filter((row) => {
      const booking = row.booking;
      const date = booking.created_at.slice(0, 10);

      if (airportFilter !== "all" && booking.airport.id !== airportFilter) {
        return false;
      }
      if (statusFilter !== "all" && booking.status !== statusFilter) {
        return false;
      }
      if (typeFilter !== "all" && row.type !== typeFilter) {
        return false;
      }
      if (supervisorFilter !== "all" && row.supervisorId !== supervisorFilter) {
        return false;
      }
      if (fromDate && date < fromDate) {
        return false;
      }
      if (toDate && date > toDate) {
        return false;
      }
      return true;
    });
  }, [airportFilter, enrichedRows, fromDate, statusFilter, supervisorFilter, toDate, typeFilter]);

  const pagedRows = useMemo(() => {
    if (infiniteMode) {
      return filtered.slice(0, visibleCount);
    }
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, infiniteMode, page, visibleCount]);

  const totalPages = Math.max(Math.ceil(filtered.length / PAGE_SIZE), 1);

  const uniqueAirports = useMemo(() => {
    const map = new Map<string, { id: string; label: string }>();
    bookings.forEach((booking) => {
      map.set(booking.airport.id, {
        id: booking.airport.id,
        label: `${booking.airport.name} (${booking.airport.code})`,
      });
    });
    return [...map.values()];
  }, [bookings]);

  const cancelMutation = useMutation({
    mutationFn: (id: string) => cancelBooking(id),
    onSuccess: () => {
      toast.push("Booking cancelled", "Booking status changed to cancelled", "success");
      bookingsQuery.refetch();
      detailQuery.refetch();
    },
    onError: () => {
      toast.push("Action failed", "Could not cancel booking", "error");
    },
  });

  return (
    <section className="space-y-6 app-fade-in">
      <PageHeader title="Bookings" subtitle="Filter, inspect, and manage bookings across all airports" />

      <div className="grid gap-3 rounded-xl border border-slate-800/50 bg-[#0b1422] p-4 md:grid-cols-6">
        <label className="block space-y-1.5">
          <span className="text-xs text-[var(--text-secondary)]">Airport</span>
          <select
            value={airportFilter}
            onChange={(event) => {
              setAirportFilter(event.target.value);
              setPage(1);
            }}
            className="h-10 w-full rounded-lg border border-[var(--bg-border)] bg-[var(--bg-elevated)] px-3 text-sm text-[var(--text-primary)]"
          >
            <option value="all">All</option>
            {uniqueAirports.map((airport) => (
              <option key={airport.id} value={airport.id}>
                {airport.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1.5">
          <span className="text-xs text-[var(--text-secondary)]">Status</span>
          <select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value);
              setPage(1);
            }}
            className="h-10 w-full rounded-lg border border-[var(--bg-border)] bg-[var(--bg-elevated)] px-3 text-sm text-[var(--text-primary)]"
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>

        <label className="block space-y-1.5">
          <span className="text-xs text-[var(--text-secondary)]">Type</span>
          <select
            value={typeFilter}
            onChange={(event) => {
              setTypeFilter(event.target.value);
              setPage(1);
            }}
            className="h-10 w-full rounded-lg border border-[var(--bg-border)] bg-[var(--bg-elevated)] px-3 text-sm text-[var(--text-primary)]"
          >
            <option value="all">All</option>
            <option value="parking">Parking</option>
            <option value="service">Service</option>
          </select>
        </label>

        <label className="block space-y-1.5">
          <span className="text-xs text-[var(--text-secondary)]">Supervisor</span>
          <select
            value={supervisorFilter}
            onChange={(event) => {
              setSupervisorFilter(event.target.value);
              setPage(1);
            }}
            className="h-10 w-full rounded-lg border border-[var(--bg-border)] bg-[var(--bg-elevated)] px-3 text-sm text-[var(--text-primary)]"
          >
            <option value="all">All</option>
            {supervisors.map((supervisor) => (
              <option key={supervisor.id} value={supervisor.id}>
                {supervisor.full_name}
              </option>
            ))}
          </select>
        </label>

        <Input label="From" type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
        <Input label="To" type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
      </div>

      <DataTable
        rows={pagedRows}
        rowKey={(row) => row.booking.id}
        columns={[
          {
            key: "booking",
            header: "Booking ID",
            render: (row) => (
              <div className="space-y-1">
                <p className="font-medium text-[var(--text-primary)]">{row.booking.booking_reference}</p>
                <div className="flex flex-wrap gap-1">
                  <span className="inline-flex rounded-full border border-slate-700/60 px-2 py-0.5 text-[10px] text-slate-300">
                    {row.booking.airport.code}
                  </span>
                  <Badge status={row.booking.status} />
                  <span className="inline-flex rounded-full border border-blue-400/30 bg-blue-400/10 px-2 py-0.5 text-[10px] text-blue-200">
                    {row.type.toUpperCase()}
                  </span>
                  {isOverdue(row.booking) ? (
                    <span className="inline-flex rounded-full border border-rose-400/40 bg-rose-500/15 px-2 py-0.5 text-[10px] text-rose-200">
                      OVERDUE
                    </span>
                  ) : null}
                  {isNewBooking(row.booking) ? (
                    <span className="inline-flex rounded-full border border-emerald-400/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] text-emerald-200">
                      NEW
                    </span>
                  ) : null}
                </div>
              </div>
            ),
          },
          { key: "customer", header: "Customer", render: (row) => row.booking.customer?.full_name ?? "-" },
          { key: "airport", header: "Airport", render: (row) => `${row.booking.airport.name} (${row.booking.airport.code})` },
          { key: "type", header: "Type", render: (row) => row.type },
          {
            key: "services",
            header: "Services",
            render: (row) => (row.services.length > 0 ? row.services.slice(0, 2).join(", ") : "Parking only"),
          },
          { key: "amount", header: "Amount", render: (row) => currencyINR(row.amount) },
          { key: "status", header: "Status", render: (row) => <Badge status={row.booking.status} pulse={row.booking.status === "in_progress"} /> },
          { key: "time", header: "Time", render: (row) => formatDate(row.booking.scheduled_start) },
          { key: "supervisor", header: "Supervisor", render: (row) => row.supervisorName },
          {
            key: "actions",
            header: "Actions",
            render: (row) => (
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" onClick={() => setSelectedBookingId(row.booking.id)}>
                  View
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => cancelMutation.mutate(row.booking.id)}
                  disabled={cancelMutation.isPending || ["cancelled", "completed", "no_show"].includes(row.booking.status)}
                >
                  Cancel
                </Button>
              </div>
            ),
          },
        ]}
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-[var(--text-secondary)]">
          Showing {pagedRows.length} of {filtered.length} bookings
        </p>

        <div className="flex items-center gap-2">
          <label className="inline-flex items-center gap-2 text-xs text-[var(--text-secondary)]">
            <input
              type="checkbox"
              checked={infiniteMode}
              onChange={(event) => {
                setInfiniteMode(event.target.checked);
                setVisibleCount(PAGE_SIZE);
                setPage(1);
              }}
            />
            Infinite scroll mode
          </label>

          {infiniteMode ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, filtered.length))}
              disabled={visibleCount >= filtered.length}
            >
              Load more
            </Button>
          ) : (
            <>
              <Button variant="secondary" size="sm" onClick={() => setPage((prev) => Math.max(prev - 1, 1))} disabled={page <= 1}>
                Prev
              </Button>
              <span className="text-xs text-[var(--text-secondary)]">
                Page {page} / {totalPages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={page >= totalPages}
              >
                Next
              </Button>
            </>
          )}
        </div>
      </div>

      {selectedBookingId ? (
        <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setSelectedBookingId(null)}>
          <aside
            className="absolute right-0 top-0 h-full w-full max-w-xl overflow-y-auto border-l border-slate-800/60 bg-[#0b1422] p-4"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">Booking Detail</h3>
              <Button size="sm" variant="secondary" onClick={() => setSelectedBookingId(null)}>
                Close
              </Button>
            </div>

            {!detailQuery.data ? (
              <div className="h-32 animate-pulseSoft rounded-xl bg-[var(--bg-elevated)]" />
            ) : (
              <div className="space-y-4">
                <div className="rounded-xl border border-slate-800/60 bg-slate-900/40 p-3">
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{detailQuery.data.booking_reference}</p>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">{detailQuery.data.customer.full_name}</p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">{detailQuery.data.airport.name} ({detailQuery.data.airport.code})</p>
                </div>

                <div className="rounded-xl border border-slate-800/60 bg-slate-900/40 p-3">
                  <h4 className="text-sm font-semibold text-[var(--text-primary)]">Timeline</h4>
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">Created: {formatDate(detailQuery.data.created_at)}</p>
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">Current Stage: {detailQuery.data.current_stage ?? "-"}</p>
                </div>

                <div className="rounded-xl border border-slate-800/60 bg-slate-900/40 p-3">
                  <h4 className="text-sm font-semibold text-[var(--text-primary)]">Services</h4>
                  {detailQuery.data.items.length === 0 ? (
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">No service items.</p>
                  ) : (
                    <ul className="mt-1 space-y-1 text-sm text-[var(--text-secondary)]">
                      {detailQuery.data.items.map((item) => (
                        <li key={item.id}>
                          {item.service.name} × {item.quantity}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="rounded-xl border border-slate-800/60 bg-slate-900/40 p-3">
                  <h4 className="text-sm font-semibold text-[var(--text-primary)]">Assigned Slot</h4>
                  {detailQuery.data.parking_booking ? (
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">
                      Slot {detailQuery.data.parking_booking.parking_slot.slot_code} ({detailQuery.data.parking_booking.parking_slot.zone_label})
                    </p>
                  ) : (
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">No parking slot linked.</p>
                  )}
                </div>

                <div className="rounded-xl border border-slate-800/60 bg-slate-900/40 p-3">
                  <h4 className="text-sm font-semibold text-[var(--text-primary)]">Customer Info</h4>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">{detailQuery.data.customer.full_name}</p>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">{detailQuery.data.customer.email}</p>
                </div>

                <div className="rounded-xl border border-slate-800/60 bg-slate-900/40 p-3">
                  <h4 className="text-sm font-semibold text-[var(--text-primary)]">Status</h4>
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">
                    Manual status transitions are restricted by backend workflow. Use Cancel where allowed.
                  </p>
                </div>
              </div>
            )}
          </aside>
        </div>
      ) : null}
    </section>
  );
}
