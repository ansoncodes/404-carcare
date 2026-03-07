"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { DataTable } from "@/components/ui/table";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/shared/PageHeader";
import { useToast } from "@/providers/ToastProvider";
import { listUsers, updateUser } from "@/services/auth.service";
import { createAirport, deleteAirport, listAirports, updateAirport } from "@/services/airports.service";
import { listBookings } from "@/services/bookings.service";
import { listParkingSlots } from "@/services/parking.service";
import type { Airport } from "@/types/airport.types";
import type { User } from "@/types/auth.types";

interface AirportFormState {
  name: string;
  code: string;
  city: string;
  address: string;
  timezone: string;
  is_active: boolean;
  supervisorId: string;
}

const defaultForm: AirportFormState = {
  name: "",
  code: "",
  city: "",
  address: "",
  timezone: "Asia/Kolkata",
  is_active: true,
  supervisorId: "",
};

export default function AdminAirportsPage() {
  const toast = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [reassignOpen, setReassignOpen] = useState(false);
  const [editingAirport, setEditingAirport] = useState<Airport | null>(null);
  const [targetAirport, setTargetAirport] = useState<Airport | null>(null);
  const [formState, setFormState] = useState<AirportFormState>(defaultForm);
  const [reassignSupervisorId, setReassignSupervisorId] = useState("");

  const airportsQuery = useQuery({ queryKey: ["airports"], queryFn: listAirports });
  const supervisorsQuery = useQuery({ queryKey: ["airport-supervisors"], queryFn: () => listUsers("supervisor") });
  const slotsQuery = useQuery({ queryKey: ["airport-slots"], queryFn: () => listParkingSlots() });
  const bookingsQuery = useQuery({ queryKey: ["airport-bookings"], queryFn: listBookings });

  const airports = airportsQuery.data ?? [];
  const supervisors = supervisorsQuery.data ?? [];
  const slots = slotsQuery.data ?? [];
  const bookings = bookingsQuery.data ?? [];
  const activeSupervisors = supervisors.filter((supervisor) => supervisor.is_active);

  const supervisorsByAirport = useMemo(() => {
    const map = new Map<string, User[]>();
    supervisors.forEach((supervisor) => {
      if (!supervisor.airport) {
        return;
      }
      const current = map.get(supervisor.airport) ?? [];
      current.push(supervisor);
      map.set(supervisor.airport, current);
    });
    return map;
  }, [supervisors]);

  const availableSlotCountByAirport = useMemo(() => {
    const map = new Map<string, number>();
    slots.forEach((slot) => {
      map.set(slot.airport.id, (map.get(slot.airport.id) ?? 0) + 1);
    });
    return map;
  }, [slots]);

  const activeBookingCountByAirport = useMemo(() => {
    const map = new Map<string, number>();
    bookings.forEach((booking) => {
      if (!["pending", "confirmed", "in_progress"].includes(booking.status)) {
        return;
      }
      map.set(booking.airport.id, (map.get(booking.airport.id) ?? 0) + 1);
    });
    return map;
  }, [bookings]);

  const unassignedSupervisors = useMemo(() => activeSupervisors.filter((supervisor) => !supervisor.airport), [activeSupervisors]);

  const supervisorOptionsForAirport = useMemo(() => {
    if (!editingAirport) {
      return unassignedSupervisors;
    }
    return activeSupervisors.filter((supervisor) => !supervisor.airport || supervisor.airport === editingAirport.id);
  }, [activeSupervisors, editingAirport, unassignedSupervisors]);

  const refresh = () => {
    airportsQuery.refetch();
    supervisorsQuery.refetch();
    slotsQuery.refetch();
    bookingsQuery.refetch();
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: formState.name.trim(),
        code: formState.code.trim().toUpperCase(),
        city: formState.city.trim(),
        address: formState.address.trim() || null,
        timezone: formState.timezone.trim() || "Asia/Kolkata",
        is_active: formState.is_active,
      };

      let airport: Airport;
      if (editingAirport) {
        airport = await updateAirport(editingAirport.id, payload);
      } else {
        airport = await createAirport(payload);
      }

      if (formState.supervisorId) {
        const selectedSupervisor = supervisors.find((supervisor) => supervisor.id === formState.supervisorId);
        if (!selectedSupervisor) {
          throw new Error("supervisor-not-found");
        }
        if (selectedSupervisor.airport !== airport.id) {
          const currentAssigned = supervisors.filter(
            (supervisor) => supervisor.airport === airport.id && supervisor.id !== selectedSupervisor.id && supervisor.is_active
          );
          if (currentAssigned.length > 0) {
            if (selectedSupervisor.airport && selectedSupervisor.airport !== airport.id) {
              // Backend does not allow airport=null for supervisors, so replacement uses airport swap.
              for (const supervisor of currentAssigned) {
                await updateUser(supervisor.id, { airport: selectedSupervisor.airport });
              }
            } else {
              // If selected supervisor has no source airport, replaced supervisors are soft-deactivated.
              for (const supervisor of currentAssigned) {
                await updateUser(supervisor.id, { is_active: false });
              }
            }
          }
          await updateUser(formState.supervisorId, { airport: airport.id, is_active: true });
        }
      } else if (editingAirport && supervisors.some((supervisor) => supervisor.airport === editingAirport.id && supervisor.is_active)) {
        throw new Error("supervisor-unassign-not-supported");
      }

      return airport;
    },
    onSuccess: () => {
      toast.push("Airport saved", "Airport data updated successfully", "success");
      setFormOpen(false);
      setEditingAirport(null);
      setFormState(defaultForm);
      refresh();
    },
    onError: (error) => {
      if (error instanceof Error && error.message === "supervisor-unassign-not-supported") {
        toast.push("Assignment required", "Backend does not allow unassigning a supervisor from an airport", "error");
        return;
      }
      toast.push("Save failed", "Could not persist airport changes", "error");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!targetAirport) {
        throw new Error("No target airport");
      }
      await deleteAirport(targetAirport.id);
    },
    onSuccess: () => {
      toast.push("Airport deactivated", "Airport marked inactive", "success");
      setDeleteOpen(false);
      setTargetAirport(null);
      refresh();
    },
    onError: () => {
      toast.push("Delete failed", "Could not deactivate airport", "error");
    },
  });

  const reassignMutation = useMutation({
    mutationFn: async () => {
      if (!targetAirport || !reassignSupervisorId) {
        throw new Error("Missing data");
      }
      const selectedSupervisor = supervisors.find((supervisor) => supervisor.id === reassignSupervisorId);
      if (!selectedSupervisor) {
        throw new Error("supervisor-not-found");
      }
      if (selectedSupervisor.airport === targetAirport.id) {
        return;
      }

      const currentAssigned = supervisors.filter(
        (supervisor) => supervisor.airport === targetAirport.id && supervisor.id !== reassignSupervisorId && supervisor.is_active
      );

      if (currentAssigned.length > 0) {
        if (selectedSupervisor.airport && selectedSupervisor.airport !== targetAirport.id) {
          for (const supervisor of currentAssigned) {
            await updateUser(supervisor.id, { airport: selectedSupervisor.airport });
          }
        } else {
          for (const supervisor of currentAssigned) {
            await updateUser(supervisor.id, { is_active: false });
          }
        }
      }
      await updateUser(reassignSupervisorId, { airport: targetAirport.id, is_active: true });
    },
    onSuccess: () => {
      toast.push("Supervisor reassigned", "Airport supervisor assignment updated", "success");
      setReassignOpen(false);
      setReassignSupervisorId("");
      setTargetAirport(null);
      refresh();
    },
    onError: () => {
      toast.push("Reassignment failed", "Could not reassign supervisor", "error");
    },
  });

  const openCreateModal = () => {
    setEditingAirport(null);
    setFormState(defaultForm);
    setFormOpen(true);
  };

  const openEditModal = (airport: Airport) => {
    const airportSupervisor = supervisors.find((supervisor) => supervisor.airport === airport.id);
    setEditingAirport(airport);
    setFormState({
      name: airport.name,
      code: airport.code,
      city: airport.city,
      address: airport.address ?? "",
      timezone: airport.timezone,
      is_active: airport.is_active,
      supervisorId: airportSupervisor?.id ?? "",
    });
    setFormOpen(true);
  };

  return (
    <section className="space-y-6 app-fade-in">
      <PageHeader
        title="Airports"
        subtitle="Manage airport branches and supervisor assignments"
        action={<Button onClick={openCreateModal}>Create Airport</Button>}
      />

      <DataTable
        rows={airports}
        rowKey={(row) => row.id}
        columns={[
          { key: "name", header: "Airport Name", render: (row) => <span className="font-medium text-[var(--text-primary)]">{row.name}</span> },
          { key: "code", header: "Code", render: (row) => row.code },
          {
            key: "location",
            header: "Location",
            render: (row) => `${row.city}${row.address ? ` · ${row.address}` : ""}`,
          },
          {
            key: "supervisor",
            header: "Supervisor",
            render: (row) => {
              const assigned = supervisorsByAirport.get(row.id) ?? [];
              if (assigned.length === 0) {
                return <span className="text-amber-300">Unassigned</span>;
              }
              return (
                <span className="text-[var(--text-primary)]">
                  {assigned.map((user) => user.full_name).join(", ")}
                </span>
              );
            },
          },
          {
            key: "slots",
            header: "Active Slots",
            render: (row) => availableSlotCountByAirport.get(row.id) ?? 0,
          },
          {
            key: "status",
            header: "Status",
            render: (row) => (
              <span
                className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${
                  row.is_active
                    ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-300"
                    : "border-rose-400/40 bg-rose-500/10 text-rose-300"
                }`}
              >
                {row.is_active ? "Active" : "Inactive"}
              </span>
            ),
          },
          {
            key: "actions",
            header: "Actions",
            render: (row) => (
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" onClick={() => openEditModal(row)}>
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setTargetAirport(row);
                    setReassignSupervisorId("");
                    setReassignOpen(true);
                  }}
                >
                  Reassign Supervisor
                </Button>
                <Link
                  href={`/admin/airports/${row.id}`}
                  className="inline-flex h-8 items-center rounded-lg border border-slate-700/70 px-3 text-xs text-slate-200 transition hover:border-cyan-400/50"
                >
                  View Details
                </Link>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setTargetAirport(row);
                    setDeleteOpen(true);
                  }}
                >
                  Delete
                </Button>
              </div>
            ),
          },
        ]}
      />

      <Modal open={formOpen} title={editingAirport ? "Edit Airport" : "Create Airport"} onClose={() => setFormOpen(false)}>
        <div className="space-y-3">
          <Input
            label="Name"
            value={formState.name}
            onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))}
          />
          <Input
            label="Code"
            value={formState.code}
            onChange={(event) => setFormState((prev) => ({ ...prev, code: event.target.value }))}
          />
          <Input
            label="City"
            value={formState.city}
            onChange={(event) => setFormState((prev) => ({ ...prev, city: event.target.value }))}
          />
          <Input
            label="Address"
            value={formState.address}
            onChange={(event) => setFormState((prev) => ({ ...prev, address: event.target.value }))}
          />
          <Input
            label="Timezone"
            value={formState.timezone}
            onChange={(event) => setFormState((prev) => ({ ...prev, timezone: event.target.value }))}
          />

          <label className="block space-y-1.5">
            <span className="text-xs text-[var(--text-secondary)]">Assign Supervisor</span>
            <select
              value={formState.supervisorId}
              onChange={(event) => setFormState((prev) => ({ ...prev, supervisorId: event.target.value }))}
              className="h-10 w-full rounded-lg border border-[var(--bg-border)] bg-[var(--bg-elevated)] px-3 text-sm text-[var(--text-primary)]"
            >
              <option value="">Unassigned</option>
              {supervisorOptionsForAirport.map((supervisor) => (
                <option key={supervisor.id} value={supervisor.id}>
                  {supervisor.full_name} ({supervisor.email})
                </option>
              ))}
            </select>
          </label>

          <label className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)]">
            <input
              type="checkbox"
              checked={formState.is_active}
              onChange={(event) => setFormState((prev) => ({ ...prev, is_active: event.target.checked }))}
            />
            Active
          </label>

          <p className="text-xs text-[var(--text-muted)]">Max concurrent slot count is not configurable via current airport API.</p>

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!formState.name.trim() || !formState.code.trim() || !formState.city.trim()) {
                  toast.push("Invalid form", "Name, code, and city are required", "error");
                  return;
                }
                saveMutation.mutate();
              }}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={deleteOpen} title="Delete Airport" onClose={() => setDeleteOpen(false)}>
        <div className="space-y-3">
          <p className="text-sm text-[var(--text-secondary)]">
            This will soft-delete the airport by marking it inactive.
          </p>
          {(targetAirport ? activeBookingCountByAirport.get(targetAirport.id) ?? 0 : 0) > 0 ? (
            <p className="rounded-lg border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
              Warning: this airport currently has active bookings.
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? "Deleting..." : "Confirm"}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={reassignOpen} title="Reassign Supervisor" onClose={() => setReassignOpen(false)}>
        <div className="space-y-3">
          <p className="text-sm text-[var(--text-secondary)]">Airport: {targetAirport?.name ?? "-"}</p>
          <label className="block space-y-1.5">
            <span className="text-xs text-[var(--text-secondary)]">Supervisor</span>
            <select
              value={reassignSupervisorId}
              onChange={(event) => setReassignSupervisorId(event.target.value)}
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

          {targetAirport &&
          supervisors.some(
            (supervisor) => supervisor.airport === targetAirport.id && supervisor.id !== reassignSupervisorId && supervisor.is_active
          ) ? (
            <p className="rounded-lg border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
              This will replace the currently assigned supervisor.
            </p>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setReassignOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!reassignSupervisorId) {
                  toast.push("Missing selection", "Choose a supervisor", "error");
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
