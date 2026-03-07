"use client";

import { useEffect } from "react";
import { z } from "zod";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { deleteAirport, getAirport, updateAirport } from "@/services/airports.service";
import { useToast } from "@/providers/ToastProvider";

const schema = z.object({
  name: z.string().min(2),
  code: z.string().min(3).max(10),
  city: z.string().min(2),
  address: z.string().optional(),
  is_active: z.boolean(),
});

type Values = z.infer<typeof schema>;

export default function AdminAirportDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();

  const query = useQuery({ queryKey: ["airport", params.id], queryFn: () => getAirport(params.id) });

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      code: "",
      city: "",
      address: "",
      is_active: true,
    },
  });

  useEffect(() => {
    if (!query.data) {
      return;
    }
    form.reset({
      name: query.data.name,
      code: query.data.code,
      city: query.data.city,
      address: query.data.address ?? "",
      is_active: query.data.is_active,
    });
  }, [form, query.data]);

  const updateMutation = useMutation({
    mutationFn: (values: Values) => updateAirport(params.id, values),
    onSuccess: () => {
      toast.push("Saved", "Airport updated", "success");
      query.refetch();
    },
    onError: () => toast.push("Save failed", "Could not update airport", "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteAirport(params.id),
    onSuccess: () => {
      toast.push("Airport deactivated", "Airport removed from active list", "success");
      router.replace("/admin/airports");
    },
    onError: () => toast.push("Delete failed", "Could not delete airport", "error"),
  });

  return (
    <section className="space-y-6">
      <PageHeader title="Airport Detail" subtitle="Edit airport information" />
      <Card>
        <p className="mono text-xs text-[var(--text-muted)]">Airport ID: {params.id}</p>
      </Card>
      <form className="panel space-y-4 p-4" onSubmit={form.handleSubmit((values) => updateMutation.mutate(values))}>
        <Input label="Name" {...form.register("name")} error={form.formState.errors.name?.message} />
        <Input label="Code" {...form.register("code")} error={form.formState.errors.code?.message} />
        <Input label="City" {...form.register("city")} error={form.formState.errors.city?.message} />
        <Input label="Address" {...form.register("address")} error={form.formState.errors.address?.message} />
        <label className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <input type="checkbox" {...form.register("is_active")} />
          Active
        </label>
        <div className="flex gap-2">
          <Button type="submit" disabled={updateMutation.isPending}>
            Save changes
          </Button>
          <Button type="button" variant="secondary" onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending}>
            Deactivate
          </Button>
        </div>
      </form>
    </section>
  );
}