"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { DataTable } from "@/components/ui/table";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/PageHeader";
import { currencyINR, formatDate } from "@/lib/formatters";
import { useToast } from "@/providers/ToastProvider";
import { getAirport } from "@/services/airports.service";
import { listUsers, updateUser } from "@/services/auth.service";
import { listBookings } from "@/services/bookings.service";
import { listParkingSlots } from "@/services/parking.service";
import { listPayments } from "@/services/payments.service";

function money(value: string | number): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export default function AdminAirportDetailPage() {
  const params = useParams<{ id: string }>();
  const airportId = params.id;
  const toast = useToast();
  const [reassignOpen, setReassignOpen] = useState(false);
  const [selectedSupervisorId, setSelectedSupervisorId] = useState("");

  const airportQuery = useQuery({ queryKey: ["airport", airportId], queryFn: () => getAirport(airportId) });
  const bookingsQuery = useQuery({ queryKey: ["airport-detail-bookings", airportId], queryFn: listBookings });
  const slotsQuery = useQuery({
    queryKey: ["airport-detail-slots", airportId],
    queryFn: () => listParkingSlots({ airport: airportId }),
  });
  const paymentsQuery = useQuery({ queryKey: ["airport-detail-payments", airportId], queryFn: listPayments });
  const supervisorsQuery = useQuery({ queryKey: ["airport-detail-supervisors"], queryFn: () => listUsers("supervisor") });

  const airport = airportQuery.data;
  const bookings = (bookingsQuery.data ?? []).filter((booking) => booking.airport.id === airportId);
  const slots = slotsQuery.data ?? [];
  const payments = (paymentsQuery.data ?? []).filter((payment) => payment.booking.airport.id === airportId && payment.status === "paid");
  const supervisors = supervisorsQuery.data ?? [];
  const activeSupervisors = supervisors.filter((supervisor) => supervisor.is_active);

  const assignedSupervisors = activeSupervisors.filter((supervisor) => supervisor.airport === airportId);
  const selectedSupervisor = activeSupervisors.find((supervisor) => supervisor.id === selectedSupervisorId) ?? null;

  const totalIncome = useMemo(() => payments.reduce((sum, payment) => sum + money(payment.total_amount), 0), [payments]);

  const reassignMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSupervisorId) {
        throw new Error("No supervisor selected");
      }
      const selected = activeSupervisors.find((supervisor) => supervisor.id === selectedSupervisorId);
      if (!selected) {
        throw new Error("Supervisor not found");
      }
      if (selected.airport === airportId) {
        return;
      }

      for (const supervisor of assignedSupervisors) {
        if (supervisor.id === selectedSupervisorId) {
          continue;
        }
        if (selected.airport && selected.airport !== airportId) {
          await updateUser(supervisor.id, { airport: selected.airport });
        } else {
          await updateUser(supervisor.id, { is_active: false });
        }
      }
      await updateUser(selectedSupervisorId, { airport: airportId, is_active: true });
    },
    onSuccess: () => {
      toast.push("Supervisor updated", "Airport supervisor assignment saved", "success");
      setReassignOpen(false);
      setSelectedSupervisorId("");
      supervisorsQuery.refetch();
    },
    onError: () => {
      toast.push("Update failed", "Could not reassign supervisor", "error");
    },
  });

  if (!airport) {
    return <div className="h-56 animate-pulseSoft rounded-xl bg-[var(--bg-elevated)]" />;
  }

  return (
    <section className="space-y-6 app-fade-in">
      <PageHeader
        title={`${airport.name} (${airport.code})`}
        subtitle={`${airport.city}${airport.address ? ` · ${airport.address}` : ""}`}
        action={
          <Button variant="secondary" onClick={() => setReassignOpen(true)}>
            Reassign Supervisor
          </Button>
        }
      />

      <div className="grid gap-3 md:grid-cols-4">
        <article className="rounded-xl border border-slate-800/50 bg-[#0b1422] p-4">
          <p className="text-xs uppercase tracking-[0.05em] text-[var(--text-muted)]">Status</p>
          <p className="mt-2 text-lg font-semibold text-[var(--text-primary)]">{airport.is_active ? "Active" : "Inactive"}</p>
        </article>
        <article className="rounded-xl border border-slate-800/50 bg-[#0b1422] p-4">
          <p className="text-xs uppercase tracking-[0.05em] text-[var(--text-muted)]">Bookings</p>
          <p className="mt-2 text-lg font-semibold text-[var(--text-primary)]">{bookings.length}</p>
        </article>
        <article className="rounded-xl border border-slate-800/50 bg-[#0b1422] p-4">
          <p className="text-xs uppercase tracking-[0.05em] text-[var(--text-muted)]">Available Slots</p>
          <p className="mt-2 text-lg font-semibold text-[var(--text-primary)]">{slots.length}</p>
        </article>
        <article className="rounded-xl border border-slate-800/50 bg-[#0b1422] p-4">
          <p className="text-xs uppercase tracking-[0.05em] text-[var(--text-muted)]">Income</p>
          <p className="mt-2 text-lg font-semibold text-emerald-300">{currencyINR(totalIncome)}</p>
        </article>
      </div>

      <article className="space-y-3 rounded-xl border border-slate-800/50 bg-[#0b1422] p-4">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Current Supervisor</h3>
        {assignedSupervisors.length === 0 ? (
          <p className="text-sm text-amber-300">No supervisor assigned.</p>
        ) : (
          assignedSupervisors.map((supervisor) => (
            <div key={supervisor.id} className="rounded-lg border border-slate-800/60 bg-slate-900/40 p-3">
              <p className="text-sm font-medium text-[var(--text-primary)]">{supervisor.full_name}</p>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">{supervisor.email}</p>
            </div>
          ))
        )}
      </article>

      <article className="space-y-3 rounded-xl border border-slate-800/50 bg-[#0b1422] p-4">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">All Bookings for this Airport</h3>
        <DataTable
          rows={bookings}
          rowKey={(row) => row.id}
          columns={[
            { key: "id", header: "Booking ID", render: (row) => row.booking_reference },
            { key: "customer", header: "Customer", render: (row) => row.customer?.full_name ?? "-" },
            { key: "status", header: "Status", render: (row) => row.status },
            { key: "time", header: "Time", render: (row) => formatDate(row.scheduled_start) },
          ]}
        />
      </article>

      <article className="space-y-3 rounded-xl border border-slate-800/50 bg-[#0b1422] p-4">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Parking Slots (Available View)</h3>
        <p className="text-xs text-[var(--text-muted)]">
          Current parking slot list endpoint returns available slots only.
        </p>
        <DataTable
          rows={slots}
          rowKey={(row) => row.id}
          columns={[
            { key: "slot", header: "Slot", render: (row) => row.slot_code },
            { key: "zone", header: "Zone", render: (row) => row.zone_label },
            { key: "floor", header: "Floor", render: (row) => row.floor },
            { key: "status", header: "Status", render: (row) => row.status },
          ]}
        />
      </article>

      <article className="space-y-3 rounded-xl border border-slate-800/50 bg-[#0b1422] p-4">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Bay Assignment</h3>
        <p className="text-sm text-[var(--text-secondary)]">
          Bay model/API is not available in backend yet.
        </p>
      </article>

      <Modal open={reassignOpen} title="Reassign Supervisor" onClose={() => setReassignOpen(false)}>
        <div className="space-y-3">
          <label className="block space-y-1.5">
            <span className="text-xs text-[var(--text-secondary)]">Supervisor</span>
            <select
              value={selectedSupervisorId}
              onChange={(event) => setSelectedSupervisorId(event.target.value)}
              className="h-10 w-full rounded-lg border border-[var(--bg-border)] bg-[var(--bg-elevated)] px-3 text-sm text-[var(--text-primary)]"
            >
              <option value="">Select supervisor</option>
              {activeSupervisors.map((supervisor) => (
                <option key={supervisor.id} value={supervisor.id}>
                  {supervisor.full_name} ({supervisor.email})
                </option>
              ))}
            </select>
          </label>

          {assignedSupervisors.some((supervisor) => supervisor.id !== selectedSupervisorId) ? (
            <p className="rounded-lg border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
              This will replace currently assigned supervisor
              {selectedSupervisor?.airport && selectedSupervisor.airport !== airportId ? " via airport swap." : " by deactivating them."}
            </p>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setReassignOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!selectedSupervisorId) {
                  toast.push("Missing selection", "Select a supervisor", "error");
                  return;
                }
                reassignMutation.mutate();
              }}
              disabled={reassignMutation.isPending}
            >
              {reassignMutation.isPending ? "Updating..." : "Confirm"}
            </Button>
          </div>
        </div>
      </Modal>
    </section>
  );
}
