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
import { deleteService, getService, listServiceCategories, updateService } from "@/services/services.service";
import { useToast } from "@/providers/ToastProvider";

const schema = z.object({
  category: z.string().min(1),
  name: z.string().min(2),
  description: z.string().optional(),
  duration_minutes: z.coerce.number().min(1),
  base_price: z.coerce.number().min(0),
  is_active: z.boolean(),
});

type Values = z.infer<typeof schema>;

export default function AdminServiceDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();

  const serviceQuery = useQuery({ queryKey: ["service", params.id], queryFn: () => getService(params.id) });
  const categoriesQuery = useQuery({ queryKey: ["service-categories"], queryFn: listServiceCategories });

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      category: "",
      name: "",
      description: "",
      duration_minutes: 60,
      base_price: 0,
      is_active: true,
    },
  });

  useEffect(() => {
    if (!serviceQuery.data) {
      return;
    }
    form.reset({
      category: serviceQuery.data.category,
      name: serviceQuery.data.name,
      description: serviceQuery.data.description ?? "",
      duration_minutes: serviceQuery.data.duration_minutes,
      base_price: Number(serviceQuery.data.base_price),
      is_active: serviceQuery.data.is_active,
    });
  }, [form, serviceQuery.data]);

  const updateMutation = useMutation({
    mutationFn: (values: Values) => updateService(params.id, values),
    onSuccess: () => {
      toast.push("Saved", "Service updated", "success");
      serviceQuery.refetch();
    },
    onError: () => toast.push("Save failed", "Could not update service", "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteService(params.id),
    onSuccess: () => {
      toast.push("Service deactivated", "Service removed from active list", "success");
      router.replace("/admin/services");
    },
    onError: () => toast.push("Delete failed", "Could not delete service", "error"),
  });

  return (
    <section className="space-y-6">
      <PageHeader title="Service Detail" subtitle="Edit service details" />
      <Card>
        <p className="mono text-xs text-[var(--text-muted)]">Service ID: {params.id}</p>
      </Card>
      <form className="panel space-y-4 p-4" onSubmit={form.handleSubmit((values) => updateMutation.mutate(values))}>
        <label className="block space-y-1.5">
          <span className="text-xs text-[var(--text-secondary)]">Category</span>
          <select
            className="h-10 w-full rounded-lg border border-[var(--bg-border)] bg-[var(--bg-elevated)] px-3 text-sm text-[var(--text-primary)]"
            {...form.register("category")}
          >
            <option value="">Select category</option>
            {(categoriesQuery.data ?? []).map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <Input label="Name" {...form.register("name")} error={form.formState.errors.name?.message} />
        <Input label="Description" {...form.register("description")} error={form.formState.errors.description?.message} />
        <Input
          label="Duration (mins)"
          type="number"
          {...form.register("duration_minutes")}
          error={form.formState.errors.duration_minutes?.message}
        />
        <Input label="Base price" type="number" {...form.register("base_price")} error={form.formState.errors.base_price?.message} />
        <label className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <input type="checkbox" {...form.register("is_active")} />
          Active
        </label>
        <div className="flex gap-2">
          <Button type="submit" disabled={updateMutation.isPending}>Save changes</Button>
          <Button type="button" variant="secondary" onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending}>
            Deactivate
          </Button>
        </div>
      </form>
    </section>
  );
}