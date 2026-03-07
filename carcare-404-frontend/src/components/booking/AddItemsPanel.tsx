"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { listServices } from "@/services/services.service";
import { addBookingItems } from "@/services/bookings.service";
import { Button } from "@/components/ui/button";

interface AddItemsPanelProps {
  bookingId: string;
}

export function AddItemsPanel({ bookingId }: AddItemsPanelProps) {
  const [serviceId, setServiceId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const services = useQuery({ queryKey: ["services"], queryFn: () => listServices() });

  const mutation = useMutation({
    mutationFn: () => addBookingItems(bookingId, [{ service_id: serviceId, quantity }]),
  });

  return (
    <div className="panel space-y-3 p-4">
      <p className="text-sm font-medium text-[var(--text-primary)]">Add Services</p>
      <select
        className="h-10 w-full rounded-lg border border-[var(--bg-border)] bg-[var(--bg-elevated)] px-3 text-sm text-[var(--text-primary)]"
        value={serviceId}
        onChange={(event) => setServiceId(event.target.value)}
      >
        <option value="">Select a service</option>
        {(services.data ?? []).map((service) => (
          <option key={service.id} value={service.id}>
            {service.name}
          </option>
        ))}
      </select>
      <input
        type="number"
        min={1}
        className="h-10 w-full rounded-lg border border-[var(--bg-border)] bg-[var(--bg-elevated)] px-3 text-sm text-[var(--text-primary)]"
        value={quantity}
        onChange={(event) => setQuantity(Number(event.target.value))}
      />
      <Button
        disabled={!serviceId || mutation.isPending}
        onClick={() => mutation.mutate()}
        className="w-full"
      >
        {mutation.isPending ? "Adding..." : "Add Item"}
      </Button>
    </div>
  );
}
