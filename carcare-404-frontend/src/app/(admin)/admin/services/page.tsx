"use client";

import Link from "next/link";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  createService,
  createServiceCategory,
  listServiceCategories,
  listServices,
} from "@/services/services.service";
import { useToast } from "@/providers/ToastProvider";

const categorySchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  icon: z.string().optional(),
});

const serviceSchema = z.object({
  category: z.string().min(1),
  name: z.string().min(2),
  description: z.string().optional(),
  duration_minutes: z.coerce.number().min(1),
  base_price: z.coerce.number().min(0),
});

type CategoryValues = z.infer<typeof categorySchema>;
type ServiceValues = z.infer<typeof serviceSchema>;

export default function AdminServicesPage() {
  const toast = useToast();
  const servicesQuery = useQuery({ queryKey: ["services"], queryFn: () => listServices() });
  const categoriesQuery = useQuery({ queryKey: ["service-categories"], queryFn: listServiceCategories });

  const categoryForm = useForm<CategoryValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: "", description: "", icon: "" },
  });

  const serviceForm = useForm<ServiceValues>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      category: "",
      name: "",
      description: "",
      duration_minutes: 60,
      base_price: 0,
    },
  });

  const createCategoryMutation = useMutation({
    mutationFn: createServiceCategory,
    onSuccess: () => {
      toast.push("Category added", "Service category created", "success");
      categoryForm.reset({ name: "", description: "", icon: "" });
      categoriesQuery.refetch();
    },
    onError: () => toast.push("Create failed", "Could not create category", "error"),
  });

  const createServiceMutation = useMutation({
    mutationFn: createService,
    onSuccess: () => {
      toast.push("Service added", "Service created", "success");
      serviceForm.reset({ category: "", name: "", description: "", duration_minutes: 60, base_price: 0 });
      servicesQuery.refetch();
    },
    onError: () => toast.push("Create failed", "Could not create service", "error"),
  });

  return (
    <section className="space-y-6">
      <PageHeader title="Services" subtitle="Manage categories and services" />

      <form
        className="panel grid gap-3 p-4 md:grid-cols-4"
        onSubmit={categoryForm.handleSubmit((values) => createCategoryMutation.mutate(values))}
      >
        <Input label="Category name" {...categoryForm.register("name")} error={categoryForm.formState.errors.name?.message} />
        <Input
          label="Description"
          {...categoryForm.register("description")}
          error={categoryForm.formState.errors.description?.message}
        />
        <Input label="Icon" {...categoryForm.register("icon")} error={categoryForm.formState.errors.icon?.message} />
        <div className="flex items-end">
          <Button type="submit" className="w-full" disabled={createCategoryMutation.isPending}>
            Add Category
          </Button>
        </div>
      </form>

      <form
        className="panel grid gap-3 p-4 md:grid-cols-6"
        onSubmit={serviceForm.handleSubmit((values) => createServiceMutation.mutate(values))}
      >
        <label className="block space-y-1.5">
          <span className="text-xs text-[var(--text-secondary)]">Category</span>
          <select
            className="h-10 w-full rounded-lg border border-[var(--bg-border)] bg-[var(--bg-elevated)] px-3 text-sm text-[var(--text-primary)]"
            {...serviceForm.register("category")}
          >
            <option value="">Select category</option>
            {(categoriesQuery.data ?? []).map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <Input label="Name" {...serviceForm.register("name")} error={serviceForm.formState.errors.name?.message} />
        <Input
          label="Description"
          {...serviceForm.register("description")}
          error={serviceForm.formState.errors.description?.message}
        />
        <Input
          label="Duration (mins)"
          type="number"
          {...serviceForm.register("duration_minutes")}
          error={serviceForm.formState.errors.duration_minutes?.message}
        />
        <Input
          label="Base price"
          type="number"
          {...serviceForm.register("base_price")}
          error={serviceForm.formState.errors.base_price?.message}
        />
        <div className="flex items-end">
          <Button type="submit" className="w-full" disabled={createServiceMutation.isPending}>
            Add Service
          </Button>
        </div>
      </form>

      {servicesQuery.data ? (
        <DataTable
          rows={servicesQuery.data}
          rowKey={(row) => row.id}
          columns={[
            { key: "name", header: "Name", render: (row) => row.name },
            { key: "price", header: "Base Price", render: (row) => row.base_price },
            { key: "duration", header: "Duration", render: (row) => `${row.duration_minutes}m` },
            {
              key: "open",
              header: "",
              render: (row) => (
                <Link href={`/admin/services/${row.id}`} className="text-xs text-[var(--accent)]">
                  Open
                </Link>
              ),
            },
          ]}
        />
      ) : null}
    </section>
  );
}