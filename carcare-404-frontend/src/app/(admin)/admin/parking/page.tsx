"use client";

import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { listAirports } from "@/services/airports.service";
import { createParkingSlot, listParkingSlots } from "@/services/parking.service";
import { useToast } from "@/providers/ToastProvider";

const schema = z.object({
  airport_id: z.string().min(1),
  slot_code: z.string().min(1),
  zone_label: z.string().min(1),
  floor: z.coerce.number(),
  price_per_hour: z.coerce.number().min(0),
});

type Values = z.infer<typeof schema>;

export default function AdminParkingPage() {
  const toast = useToast();
  const airportsQuery = useQuery({ queryKey: ["airports"], queryFn: listAirports });
  const slotsQuery = useQuery({ queryKey: ["parking-slots"], queryFn: () => listParkingSlots() });

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      airport_id: "",
      slot_code: "",
      zone_label: "Zone A",
      floor: 0,
      price_per_hour: 0,
    },
  });

  const createMutation = useMutation({
    mutationFn: createParkingSlot,
    onSuccess: () => {
      toast.push("Parking slot added", "Slot created", "success");
      slotsQuery.refetch();
      form.reset({ airport_id: "", slot_code: "", zone_label: "Zone A", floor: 0, price_per_hour: 0 });
    },
    onError: () => toast.push("Create failed", "Could not create parking slot", "error"),
  });

  return (
    <section className="space-y-6">
      <PageHeader title="Parking Slots" subtitle="Manage parking inventory" />

      <form className="panel grid gap-3 p-4 md:grid-cols-6" onSubmit={form.handleSubmit((values) => createMutation.mutate(values))}>
        <label className="block space-y-1.5">
          <span className="text-xs text-[var(--text-secondary)]">Airport</span>
          <select
            className="h-10 w-full rounded-lg border border-[var(--bg-border)] bg-[var(--bg-elevated)] px-3 text-sm text-[var(--text-primary)]"
            {...form.register("airport_id")}
          >
            <option value="">Select airport</option>
            {(airportsQuery.data ?? []).map((airport) => (
              <option key={airport.id} value={airport.id}>
                {airport.code}
              </option>
            ))}
          </select>
        </label>
        <Input label="Slot code" {...form.register("slot_code")} error={form.formState.errors.slot_code?.message} />
        <Input label="Zone" {...form.register("zone_label")} error={form.formState.errors.zone_label?.message} />
        <Input label="Floor" type="number" {...form.register("floor")} error={form.formState.errors.floor?.message} />
        <Input
          label="Price/hour"
          type="number"
          {...form.register("price_per_hour")}
          error={form.formState.errors.price_per_hour?.message}
        />
        <div className="flex items-end">
          <Button type="submit" className="w-full" disabled={createMutation.isPending}>
            Add Slot
          </Button>
        </div>
      </form>

      {slotsQuery.data ? (
        <DataTable
          rows={slotsQuery.data}
          rowKey={(row) => row.id}
          columns={[
            { key: "airport", header: "Airport", render: (row) => row.airport.code },
            { key: "code", header: "Slot", render: (row) => row.slot_code },
            { key: "zone", header: "Zone", render: (row) => row.zone_label },
            { key: "status", header: "Status", render: (row) => row.status },
          ]}
        />
      ) : null}
    </section>
  );
}