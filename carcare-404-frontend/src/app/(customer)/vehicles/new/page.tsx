"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/PageHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createVehicle } from "@/services/vehicles.service";
import { vehicleSchema, type VehicleValues } from "@/lib/validators";
import { useToast } from "@/providers/ToastProvider";

export default function NewVehiclePage() {
  const router = useRouter();
  const toast = useToast();

  const form = useForm<VehicleValues>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      plate_number: "",
      brand: "",
      model: "",
      color: "",
    },
  });

  const mutation = useMutation({
    mutationFn: createVehicle,
    onSuccess: () => {
      toast.push("Vehicle added", "Saved successfully", "success");
      router.replace("/vehicles");
    },
    onError: () => toast.push("Failed", "Could not add vehicle", "error"),
  });

  return (
    <section className="space-y-6">
      <PageHeader title="Add Vehicle" subtitle="Register a new car" />
      <form className="panel space-y-4 p-4" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
        <Input label="Plate number" {...form.register("plate_number")} error={form.formState.errors.plate_number?.message} />
        <Input label="Brand" {...form.register("brand")} error={form.formState.errors.brand?.message} />
        <Input label="Model" {...form.register("model")} error={form.formState.errors.model?.message} />
        <Input label="Color" {...form.register("color")} error={form.formState.errors.color?.message} />
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Saving..." : "Save vehicle"}
        </Button>
      </form>
    </section>
  );
}