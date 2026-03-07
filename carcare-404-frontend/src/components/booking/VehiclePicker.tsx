"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listVehicles, createVehicle } from "@/services/vehicles.service";
import { useBookingStore } from "@/store/bookingStore";
import { Button } from "@/components/ui/button";

export function VehiclePicker() {
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ["vehicles"], queryFn: listVehicles });
  const selected = useBookingStore((state) => state.vehicleId);
  const setField = useBookingStore((state) => state.setField);

  const [showForm, setShowForm] = useState(false);
  const [plate, setPlate] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [color, setColor] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      createVehicle({ plate_number: plate, brand, model, color }),
    onSuccess: (vehicle) => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      setField("vehicleId", vehicle.id);
      setShowForm(false);
      setPlate("");
      setBrand("");
      setModel("");
      setColor("");
    },
  });

  const vehicles = data ?? [];

  return (
    <div className="space-y-4">
      {vehicles.length === 0 && !showForm && (
        <p className="text-sm text-[var(--text-secondary)]">
          No vehicles registered yet. Add one below to continue.
        </p>
      )}

      <div className="grid gap-2">
        {vehicles.map((vehicle) => (
          <button
            key={vehicle.id}
            className={`rounded-lg border px-4 py-3 text-left text-sm transition-colors ${
              selected === vehicle.id
                ? "border-[var(--accent)] bg-[var(--bg-elevated)] text-[var(--text-primary)]"
                : "border-[var(--bg-border)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:border-[var(--text-muted)]"
            }`}
            onClick={() => setField("vehicleId", vehicle.id)}
          >
            <span className="font-medium">{vehicle.plate_number}</span>
            {vehicle.brand && (
              <span className="ml-2 text-[var(--text-muted)]">
                {vehicle.brand} {vehicle.model ?? ""}
              </span>
            )}
          </button>
        ))}
      </div>

      {!showForm ? (
        <button
          className="w-full rounded-lg border border-dashed border-[var(--bg-border)] px-4 py-3 text-sm text-[var(--accent)] hover:bg-[var(--bg-elevated)] transition-colors"
          onClick={() => setShowForm(true)}
        >
          + Add a new vehicle
        </button>
      ) : (
        <div className="panel space-y-3 p-4">
          <p className="text-sm font-medium text-[var(--text-primary)]">
            Register Vehicle
          </p>
          <input
            className="h-10 w-full rounded-lg border border-[var(--bg-border)] bg-[var(--bg-elevated)] px-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
            placeholder="Plate number *"
            value={plate}
            onChange={(e) => setPlate(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              className="h-10 rounded-lg border border-[var(--bg-border)] bg-[var(--bg-elevated)] px-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
              placeholder="Brand"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
            />
            <input
              className="h-10 rounded-lg border border-[var(--bg-border)] bg-[var(--bg-elevated)] px-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
              placeholder="Model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
            />
          </div>
          <input
            className="h-10 w-full rounded-lg border border-[var(--bg-border)] bg-[var(--bg-elevated)] px-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
            placeholder="Color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
          />
          <div className="flex gap-2">
            <Button
              disabled={!plate.trim() || mutation.isPending}
              onClick={() => mutation.mutate()}
              className="flex-1"
            >
              {mutation.isPending ? "Saving..." : "Save & Select"}
            </Button>
            <Button
              variant="secondary"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
