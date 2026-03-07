/**
 * Phase 1 finding applied:
 * - Supervisor is represented by CustomUser(role="supervisor").
 * - Reassignment is supported through PATCH /users/{id}/ with airport update.
 * - Backend blocks admin hard-delete and supervisor airport=null updates.
 *   This page adapts with soft-remove (is_active=false) and swap/deactivate logic on replace.
 */
"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { DataTable } from "@/components/ui/table";
import { formatDate } from "@/lib/formatters";
import { useToast } from "@/providers/ToastProvider";
import { createSupervisor, listUsers, updateUser } from "@/services/auth.service";
import { listAirports } from "@/services/airports.service";

interface CreateSupervisorFormState {
  full_name: string;
  email: string;
  phone: string;
  password: string;
  airport: string;
}

const defaultCreateForm: CreateSupervisorFormState = {
  full_name: "",
  email: "",
  phone: "",
  password: "",
  airport: "",
};

function generatePassword(length = 12) {
  const charset = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*";
  let out = "";
  for (let index = 0; index < length; index += 1) {
    out += charset[Math.floor(Math.random() * charset.length)];
  }
  return out;
}

export default function AdminSupervisorsPage() {
  const toast = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [reassignOpen, setReassignOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateSupervisorFormState>(defaultCreateForm);
  const [selectedSupervisorId, setSelectedSupervisorId] = useState<string>("");
  const [targetAirportId, setTargetAirportId] = useState<string>("");
  const [editFullName, setEditFullName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);

  const supervisorsQuery = useQuery({
    queryKey: ["admin-supervisors"],
    queryFn: () => listUsers("supervisor"),
  });
  const airportsQuery = useQuery({
    queryKey: ["admin-airports"],
    queryFn: listAirports,
  });

  const supervisors = supervisorsQuery.data ?? [];
  const airports = airportsQuery.data ?? [];

  const airportNameById = useMemo(() => {
    const map = new Map<string, string>();
    airports.forEach((airport) => {
      map.set(airport.id, `${airport.name} (${airport.code})`);
    });
    return map;
  }, [airports]);

  const selectedSupervisor = supervisors.find((supervisor) => supervisor.id === selectedSupervisorId) ?? null;
  const replacingSupervisor =
    targetAirportId && selectedSupervisorId
      ? supervisors.find((supervisor) => supervisor.airport === targetAirportId && supervisor.id !== selectedSupervisorId) ?? null
      : null;
  const replacementRequiresDeactivate =
    Boolean(replacingSupervisor) && !(selectedSupervisor?.airport && selectedSupervisor.airport !== targetAirportId);

  const refresh = () => {
    supervisorsQuery.refetch();
    airportsQuery.refetch();
  };

  const createMutation = useMutation({
    mutationFn: () =>
      createSupervisor({
        email: createForm.email.trim(),
        full_name: createForm.full_name.trim(),
        phone: createForm.phone.trim() || undefined,
        password: createForm.password,
        airport: createForm.airport,
      }),
    onSuccess: () => {
      toast.push("Supervisor created", "New supervisor account is ready", "success");
      setCreateOpen(false);
      setCreateForm(defaultCreateForm);
      refresh();
    },
    onError: () => {
      toast.push("Create failed", "Could not create supervisor", "error");
    },
  });

  const saveEditMutation = useMutation({
    mutationFn: (payload: { id: string; full_name: string; phone: string | null; is_active: boolean }) =>
      updateUser(payload.id, {
        full_name: payload.full_name,
        phone: payload.phone,
        is_active: payload.is_active,
      }),
    onSuccess: () => {
      toast.push("Supervisor updated", "Profile changes saved", "success");
      setEditOpen(false);
      refresh();
    },
    onError: () => {
      toast.push("Save failed", "Could not update supervisor", "error");
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => updateUser(id, { is_active: false }),
    onSuccess: () => {
      toast.push("Supervisor removed", "Supervisor marked inactive", "success");
      refresh();
    },
    onError: () => {
      toast.push("Action failed", "Could not remove supervisor", "error");
    },
  });

  const reassignMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSupervisorId || !targetAirportId) {
        throw new Error("Missing reassignment data");
      }
      const selected = supervisors.find((supervisor) => supervisor.id === selectedSupervisorId);
      if (!selected) {
        throw new Error("Supervisor not found");
      }
      if (selected.airport === targetAirportId) {
        return;
      }

      if (replacingSupervisor) {
        if (selected.airport && selected.airport !== targetAirportId) {
          // Backend rejects airport=null for supervisors, so replace via airport swap.
          await updateUser(replacingSupervisor.id, { airport: selected.airport });
        } else {
          // If no swap source airport exists, deactivate replaced supervisor.
          await updateUser(replacingSupervisor.id, { is_active: false });
        }
      }

      await updateUser(selectedSupervisorId, { airport: targetAirportId, is_active: true });
    },
    onSuccess: () => {
      toast.push("Reassignment complete", "Supervisor assignment updated", "success");
      setReassignOpen(false);
      setTargetAirportId("");
      refresh();
    },
    onError: () => {
      toast.push("Reassignment failed", "Could not update assignment", "error");
    },
  });

  return (
    <section className="space-y-6 app-fade-in">
      <PageHeader
        title="Supervisors"
        subtitle="Assign, reassign, and maintain supervisor coverage"
        action={<Button onClick={() => setCreateOpen(true)}>Create Supervisor</Button>}
      />

      <DataTable
        rows={supervisors}
        rowKey={(row) => row.id}
        columns={[
          { key: "name", header: "Name", render: (row) => <span className="font-medium text-[var(--text-primary)]">{row.full_name}</span> },
          { key: "email", header: "Email", render: (row) => row.email },
          {
            key: "airport",
            header: "Assigned Airport",
            render: (row) => (row.airport ? airportNameById.get(row.airport) ?? row.airport : "Unassigned"),
          },
          {
            key: "status",
            header: "Status",
            render: (row) => (
              <span
                className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${
                  row.airport ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-300" : "border-amber-400/40 bg-amber-500/10 text-amber-300"
                }`}
              >
                {row.airport ? "Assigned" : "Unassigned"}
              </span>
            ),
          },
          {
            key: "active",
            header: "Active",
            render: (row) => (
              <span className={row.is_active ? "text-emerald-300" : "text-rose-300"}>{row.is_active ? "Active" : "Inactive"}</span>
            ),
          },
          {
            key: "last_active",
            header: "Last Active",
            render: (row) => <span className="text-xs text-[var(--text-muted)]">{row.updated_at ? formatDate(row.updated_at) : "N/A"}</span>,
          },
          {
            key: "actions",
            header: "Actions",
            render: (row) => (
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setSelectedSupervisorId(row.id);
                    setEditFullName(row.full_name);
                    setEditPhone(row.phone ?? "");
                    setEditIsActive(row.is_active);
                    setEditOpen(true);
                  }}
                >
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setSelectedSupervisorId(row.id);
                    setTargetAirportId(row.airport ?? "");
                    setReassignOpen(true);
                  }}
                >
                  Reassign
                </Button>
                <Button size="sm" variant="ghost" onClick={() => deactivateMutation.mutate(row.id)} disabled={deactivateMutation.isPending}>
                  Remove
                </Button>
              </div>
            ),
          },
        ]}
      />

      <Modal open={createOpen} title="Create Supervisor" onClose={() => setCreateOpen(false)}>
        <div className="space-y-3">
          <Input
            label="Name"
            value={createForm.full_name}
            onChange={(event) => setCreateForm((prev) => ({ ...prev, full_name: event.target.value }))}
          />
          <Input
            label="Email"
            type="email"
            value={createForm.email}
            onChange={(event) => setCreateForm((prev) => ({ ...prev, email: event.target.value }))}
          />
          <Input
            label="Phone"
            value={createForm.phone}
            onChange={(event) => setCreateForm((prev) => ({ ...prev, phone: event.target.value }))}
          />
          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <Input
              label="Password"
              value={createForm.password}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, password: event.target.value }))}
            />
            <Button
              type="button"
              variant="secondary"
              className="mt-0 sm:mt-6"
              onClick={() => setCreateForm((prev) => ({ ...prev, password: generatePassword() }))}
            >
              Auto-generate
            </Button>
          </div>
          <label className="block space-y-1.5">
            <span className="text-xs text-[var(--text-secondary)]">Assign Airport</span>
            <select
              value={createForm.airport}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, airport: event.target.value }))}
              className="h-10 w-full rounded-lg border border-[var(--bg-border)] bg-[var(--bg-elevated)] px-3 text-sm text-[var(--text-primary)]"
            >
              <option value="">Select airport</option>
              {airports
                .filter((airport) => airport.is_active)
                .map((airport) => (
                  <option key={airport.id} value={airport.id}>
                    {airport.name} ({airport.code})
                  </option>
                ))}
            </select>
          </label>

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!createForm.full_name.trim() || !createForm.email.trim() || !createForm.password || !createForm.airport) {
                  toast.push("Invalid form", "Name, email, password and airport are required", "error");
                  return;
                }
                createMutation.mutate();
              }}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "Creating..." : "Create"}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={editOpen} title="Edit Supervisor" onClose={() => setEditOpen(false)}>
        <div className="space-y-3">
          <Input label="Name" value={editFullName} onChange={(event) => setEditFullName(event.target.value)} />
          <Input label="Phone" value={editPhone} onChange={(event) => setEditPhone(event.target.value)} />
          <label className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)]">
            <input type="checkbox" checked={editIsActive} onChange={(event) => setEditIsActive(event.target.checked)} />
            Active
          </label>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!selectedSupervisorId || !editFullName.trim()) {
                  toast.push("Invalid form", "Name is required", "error");
                  return;
                }
                saveEditMutation.mutate({
                  id: selectedSupervisorId,
                  full_name: editFullName.trim(),
                  phone: editPhone.trim() ? editPhone.trim() : null,
                  is_active: editIsActive,
                });
              }}
              disabled={saveEditMutation.isPending}
            >
              {saveEditMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={reassignOpen} title="Reassign Supervisor" onClose={() => setReassignOpen(false)}>
        <div className="space-y-3">
          <p className="text-sm text-[var(--text-secondary)]">Supervisor: {selectedSupervisor?.full_name ?? "-"}</p>
          <label className="block space-y-1.5">
            <span className="text-xs text-[var(--text-secondary)]">Airport</span>
            <select
              value={targetAirportId}
              onChange={(event) => setTargetAirportId(event.target.value)}
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

          {replacingSupervisor ? (
            <div className="rounded-lg border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
              This will replace {replacingSupervisor.full_name}
              {replacementRequiresDeactivate ? " by deactivating them." : " via airport swap."}
            </div>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setReassignOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!selectedSupervisorId || !targetAirportId) {
                  toast.push("Missing data", "Select a supervisor and airport", "error");
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
