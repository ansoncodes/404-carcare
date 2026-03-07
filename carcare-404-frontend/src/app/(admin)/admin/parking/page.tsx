"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { DataTable } from "@/components/ui/table";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/shared/PageHeader";
import { useToast } from "@/providers/ToastProvider";
import { listAirports } from "@/services/airports.service";
import {
  createParkingSlot,
  deleteParkingSlot,
  listParkingSlots,
  updateParkingSlot,
  type ParkingSlotPayload,
} from "@/services/parking.service";
import type { ParkingSlot, ParkingSlotStatus } from "@/types/parking.types";

const statusChoices: ParkingSlotStatus[] = ["available", "occupied", "reserved", "maintenance"];

const defaultForm: ParkingSlotPayload = {
  airport_id: "",
  slot_code: "",
  zone_label: "Zone A",
  floor: 0,
  status: "available",
  price_per_hour: 0,
};

export default function AdminParkingPage() {
  const toast = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [airportFilter, setAirportFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [bulkStatus, setBulkStatus] = useState<ParkingSlotStatus>("maintenance");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [formState, setFormState] = useState<ParkingSlotPayload>(defaultForm);
  const [editingSlot, setEditingSlot] = useState<ParkingSlot | null>(null);

  const airportsQuery = useQuery({ queryKey: ["parking-airports"], queryFn: listAirports });
  const slotsQuery = useQuery({ queryKey: ["parking-slots-admin"], queryFn: () => listParkingSlots() });

  const airports = airportsQuery.data ?? [];
  const slots = slotsQuery.data ?? [];

  const filteredSlots = useMemo(() => {
    return slots.filter((slot) => {
      if (airportFilter !== "all" && slot.airport.id !== airportFilter) {
        return false;
      }
      if (statusFilter !== "all" && slot.status !== statusFilter) {
        return false;
      }
      return true;
    });
  }, [airportFilter, slots, statusFilter]);

  const refresh = () => {
    slotsQuery.refetch();
    airportsQuery.refetch();
    setSelectedIds([]);
  };

  const createMutation = useMutation({
    mutationFn: () => createParkingSlot(formState),
    onSuccess: () => {
      toast.push("Slot created", "Parking slot added", "success");
      setFormOpen(false);
      setFormState(defaultForm);
      refresh();
    },
    onError: () => {
      toast.push("Create failed", "Could not create parking slot", "error");
    },
  });

  const editMutation = useMutation({
    mutationFn: () => {
      if (!editingSlot) {
        throw new Error("No slot selected");
      }
      return updateParkingSlot(editingSlot.id, {
        slot_code: formState.slot_code,
        zone_label: formState.zone_label,
        floor: Number(formState.floor),
        status: formState.status,
        price_per_hour: formState.price_per_hour,
      });
    },
    onSuccess: () => {
      toast.push("Slot updated", "Parking slot updated", "success");
      setEditOpen(false);
      setEditingSlot(null);
      refresh();
    },
    onError: () => {
      toast.push("Update failed", "Could not update parking slot", "error");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteParkingSlot(id),
    onSuccess: () => {
      toast.push("Slot deleted", "Parking slot removed", "success");
      refresh();
    },
    onError: () => {
      toast.push("Delete failed", "Could not delete parking slot", "error");
    },
  });

  const bulkMutation = useMutation({
    mutationFn: async () => {
      await Promise.all(
        selectedIds.map((id) =>
          updateParkingSlot(id, {
            status: bulkStatus,
          })
        )
      );
    },
    onSuccess: () => {
      toast.push("Bulk update complete", `Updated ${selectedIds.length} slots`, "success");
      refresh();
    },
    onError: () => {
      toast.push("Bulk update failed", "Could not update selected slots", "error");
    },
  });

  return (
    <section className="space-y-6 app-fade-in">
      <PageHeader
        title="Parking Slots"
        subtitle="CRUD and bulk updates for parking capacity"
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setViewMode((prev) => (prev === "table" ? "grid" : "table"))}>
              {viewMode === "table" ? "Grid view" : "Table view"}
            </Button>
            <Button onClick={() => setFormOpen(true)}>Add Slot</Button>
          </div>
        }
      />

      <div className="grid gap-3 rounded-xl border border-slate-800/50 bg-[#0b1422] p-4 md:grid-cols-5">
        <label className="block space-y-1.5">
          <span className="text-xs text-[var(--text-secondary)]">Airport</span>
          <select
            value={airportFilter}
            onChange={(event) => setAirportFilter(event.target.value)}
            className="h-10 w-full rounded-lg border border-[var(--bg-border)] bg-[var(--bg-elevated)] px-3 text-sm text-[var(--text-primary)]"
          >
            <option value="all">All</option>
            {airports.map((airport) => (
              <option key={airport.id} value={airport.id}>
                {airport.name} ({airport.code})
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1.5">
          <span className="text-xs text-[var(--text-secondary)]">Status</span>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="h-10 w-full rounded-lg border border-[var(--bg-border)] bg-[var(--bg-elevated)] px-3 text-sm text-[var(--text-primary)]"
          >
            <option value="all">All</option>
            {statusChoices.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1.5">
          <span className="text-xs text-[var(--text-secondary)]">Bulk Status</span>
          <select
            value={bulkStatus}
            onChange={(event) => setBulkStatus(event.target.value as ParkingSlotStatus)}
            className="h-10 w-full rounded-lg border border-[var(--bg-border)] bg-[var(--bg-elevated)] px-3 text-sm text-[var(--text-primary)]"
          >
            {statusChoices.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-end">
          <Button
            className="w-full"
            variant="secondary"
            onClick={() => bulkMutation.mutate()}
            disabled={selectedIds.length === 0 || bulkMutation.isPending}
          >
            {bulkMutation.isPending ? "Updating..." : `Bulk Update (${selectedIds.length})`}
          </Button>
        </div>

        <div className="flex items-end">
          <Button variant="secondary" className="w-full" onClick={refresh}>
            Refresh
          </Button>
        </div>
      </div>

      <p className="text-xs text-[var(--text-muted)]">
        Note: parking slot list API currently returns available slots only. Slots moved to non-available states may disappear from this list.
      </p>

      {viewMode === "table" ? (
        <DataTable
          rows={filteredSlots}
          rowKey={(row) => row.id}
          columns={[
            {
              key: "select",
              header: "",
              render: (row) => (
                <input
                  type="checkbox"
                  checked={selectedIds.includes(row.id)}
                  onChange={(event) => {
                    if (event.target.checked) {
                      setSelectedIds((prev) => [...prev, row.id]);
                    } else {
                      setSelectedIds((prev) => prev.filter((id) => id !== row.id));
                    }
                  }}
                />
              ),
            },
            { key: "airport", header: "Airport", render: (row) => `${row.airport.name} (${row.airport.code})` },
            { key: "slot", header: "Slot", render: (row) => row.slot_code },
            { key: "zone", header: "Zone", render: (row) => row.zone_label },
            { key: "floor", header: "Floor", render: (row) => row.floor },
            { key: "price", header: "Price/Hour", render: (row) => row.price_per_hour },
            { key: "status", header: "Status", render: (row) => row.status },
            {
              key: "actions",
              header: "Actions",
              render: (row) => (
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setEditingSlot(row);
                      setFormState({
                        airport_id: row.airport.id,
                        slot_code: row.slot_code,
                        zone_label: row.zone_label,
                        floor: row.floor,
                        status: row.status,
                        price_per_hour: Number(row.price_per_hour),
                      });
                      setEditOpen(true);
                    }}
                  >
                    Edit
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => updateParkingSlot(row.id, { status: "maintenance" }).then(refresh)}>
                    Mark Maintenance
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate(row.id)}>
                    Delete
                  </Button>
                </div>
              ),
            },
          ]}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {filteredSlots.map((slot) => (
            <article key={slot.id} className="rounded-xl border border-slate-800/50 bg-[#0b1422] p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-[var(--text-primary)]">{slot.slot_code}</p>
                <input
                  type="checkbox"
                  checked={selectedIds.includes(slot.id)}
                  onChange={(event) => {
                    if (event.target.checked) {
                      setSelectedIds((prev) => [...prev, slot.id]);
                    } else {
                      setSelectedIds((prev) => prev.filter((id) => id !== slot.id));
                    }
                  }}
                />
              </div>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">{slot.airport.code} · {slot.zone_label} · Floor {slot.floor}</p>
              <p className="mt-2 text-xs text-[var(--text-muted)]">{slot.status}</p>
              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setEditingSlot(slot);
                    setFormState({
                      airport_id: slot.airport.id,
                      slot_code: slot.slot_code,
                      zone_label: slot.zone_label,
                      floor: slot.floor,
                      status: slot.status,
                      price_per_hour: Number(slot.price_per_hour),
                    });
                    setEditOpen(true);
                  }}
                >
                  Edit
                </Button>
                <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate(slot.id)}>
                  Delete
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal open={formOpen} title="Add Parking Slot" onClose={() => setFormOpen(false)}>
        <div className="space-y-3">
          <label className="block space-y-1.5">
            <span className="text-xs text-[var(--text-secondary)]">Airport</span>
            <select
              value={formState.airport_id}
              onChange={(event) => setFormState((prev) => ({ ...prev, airport_id: event.target.value }))}
              className="h-10 w-full rounded-lg border border-[var(--bg-border)] bg-[var(--bg-elevated)] px-3 text-sm text-[var(--text-primary)]"
            >
              <option value="">Select airport</option>
              {airports.map((airport) => (
                <option key={airport.id} value={airport.id}>
                  {airport.name} ({airport.code})
                </option>
              ))}
            </select>
          </label>
          <Input label="Slot code" value={formState.slot_code} onChange={(event) => setFormState((prev) => ({ ...prev, slot_code: event.target.value }))} />
          <Input label="Zone" value={formState.zone_label} onChange={(event) => setFormState((prev) => ({ ...prev, zone_label: event.target.value }))} />
          <Input
            label="Floor"
            type="number"
            value={String(formState.floor)}
            onChange={(event) => setFormState((prev) => ({ ...prev, floor: Number(event.target.value) }))}
          />
          <Input
            label="Price / Hour"
            type="number"
            value={String(formState.price_per_hour ?? 0)}
            onChange={(event) => setFormState((prev) => ({ ...prev, price_per_hour: Number(event.target.value) }))}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!formState.airport_id || !formState.slot_code.trim()) {
                  toast.push("Invalid form", "Airport and slot code are required", "error");
                  return;
                }
                createMutation.mutate();
              }}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "Saving..." : "Create"}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={editOpen} title="Edit Parking Slot" onClose={() => setEditOpen(false)}>
        <div className="space-y-3">
          <Input label="Slot code" value={formState.slot_code} onChange={(event) => setFormState((prev) => ({ ...prev, slot_code: event.target.value }))} />
          <Input label="Zone" value={formState.zone_label} onChange={(event) => setFormState((prev) => ({ ...prev, zone_label: event.target.value }))} />
          <Input
            label="Floor"
            type="number"
            value={String(formState.floor)}
            onChange={(event) => setFormState((prev) => ({ ...prev, floor: Number(event.target.value) }))}
          />
          <Input
            label="Price / Hour"
            type="number"
            value={String(formState.price_per_hour ?? 0)}
            onChange={(event) => setFormState((prev) => ({ ...prev, price_per_hour: Number(event.target.value) }))}
          />
          <label className="block space-y-1.5">
            <span className="text-xs text-[var(--text-secondary)]">Status</span>
            <select
              value={formState.status}
              onChange={(event) => setFormState((prev) => ({ ...prev, status: event.target.value as ParkingSlotStatus }))}
              className="h-10 w-full rounded-lg border border-[var(--bg-border)] bg-[var(--bg-elevated)] px-3 text-sm text-[var(--text-primary)]"
            >
              {statusChoices.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => editMutation.mutate()} disabled={editMutation.isPending}>
              {editMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </Modal>
    </section>
  );
}
