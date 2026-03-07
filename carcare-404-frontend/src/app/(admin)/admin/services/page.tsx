"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import {
  createService,
  createServiceCategory,
  deleteServiceCategory,
  listServiceCategories,
  listServices,
  updateServiceCategory,
} from "@/services/services.service";
import { useToast } from "@/providers/ToastProvider";
import type { ServiceCategory, ServiceCategoryPayload } from "@/types/service.types";

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

interface CategoryEditState {
  id: string;
  name: string;
  description: string;
  icon: string;
  is_active: boolean;
}

const emptyCategoryEdit: CategoryEditState = {
  id: "",
  name: "",
  description: "",
  icon: "",
  is_active: true,
};

export default function AdminServicesPage() {
  const toast = useToast();
  const [categoryEditOpen, setCategoryEditOpen] = useState(false);
  const [categoryEditState, setCategoryEditState] = useState<CategoryEditState>(emptyCategoryEdit);

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

  const categoryLabelById = useMemo(() => {
    const map = new Map<string, string>();
    (categoriesQuery.data ?? []).forEach((category) => {
      map.set(category.id, category.name);
    });
    return map;
  }, [categoriesQuery.data]);

  const createCategoryMutation = useMutation({
    mutationFn: createServiceCategory,
    onSuccess: () => {
      toast.push("Category added", "Service category created", "success");
      categoryForm.reset({ name: "", description: "", icon: "" });
      categoriesQuery.refetch();
    },
    onError: () => toast.push("Create failed", "Could not create category", "error"),
  });

  const updateCategoryMutation = useMutation({
    mutationFn: (payload: { id: string; data: Partial<ServiceCategoryPayload> }) =>
      updateServiceCategory(payload.id, payload.data),
    onSuccess: () => {
      toast.push("Category updated", "Service category updated", "success");
      setCategoryEditOpen(false);
      setCategoryEditState(emptyCategoryEdit);
      categoriesQuery.refetch();
      servicesQuery.refetch();
    },
    onError: () => toast.push("Save failed", "Could not update category", "error"),
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id: string) => deleteServiceCategory(id),
    onSuccess: () => {
      toast.push("Category deactivated", "Category marked inactive", "success");
      categoriesQuery.refetch();
      servicesQuery.refetch();
    },
    onError: () => toast.push("Delete failed", "Could not deactivate category", "error"),
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

      {(categoriesQuery.data ?? []).length > 0 ? (
        <DataTable
          rows={categoriesQuery.data ?? []}
          rowKey={(row) => row.id}
          columns={[
            {
              key: "name",
              header: "Category",
              render: (row) => <span className="font-medium text-[var(--text-primary)]">{row.name}</span>,
            },
            {
              key: "description",
              header: "Description",
              render: (row) => row.description || "-",
            },
            {
              key: "status",
              header: "Status",
              render: (row) => (
                <span className={row.is_active ? "text-emerald-300" : "text-rose-300"}>{row.is_active ? "Active" : "Inactive"}</span>
              ),
            },
            {
              key: "services",
              header: "Services",
              render: (row) => row.services?.length ?? 0,
            },
            {
              key: "actions",
              header: "Actions",
              render: (row) => (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setCategoryEditState({
                        id: row.id,
                        name: row.name,
                        description: row.description ?? "",
                        icon: row.icon ?? "",
                        is_active: row.is_active,
                      });
                      setCategoryEditOpen(true);
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteCategoryMutation.mutate(row.id)}
                    disabled={deleteCategoryMutation.isPending}
                  >
                    Deactivate
                  </Button>
                </div>
              ),
            },
          ]}
        />
      ) : null}

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
            {(categoriesQuery.data ?? [])
              .filter((category) => category.is_active)
              .map((category) => (
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
            { key: "category", header: "Category", render: (row) => categoryLabelById.get(row.category) ?? row.category },
            { key: "price", header: "Base Price", render: (row) => row.base_price },
            { key: "duration", header: "Duration", render: (row) => `${row.duration_minutes}m` },
            { key: "status", header: "Status", render: (row) => (row.is_active ? "Active" : "Inactive") },
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

      <p className="text-xs text-[var(--text-muted)]">
        Service stage CRUD is unavailable with current backend. Stages are exposed read-only under each service detail.
      </p>

      <Modal open={categoryEditOpen} title="Edit Category" onClose={() => setCategoryEditOpen(false)}>
        <div className="space-y-3">
          <Input
            label="Category name"
            value={categoryEditState.name}
            onChange={(event) => setCategoryEditState((prev) => ({ ...prev, name: event.target.value }))}
          />
          <Input
            label="Description"
            value={categoryEditState.description}
            onChange={(event) => setCategoryEditState((prev) => ({ ...prev, description: event.target.value }))}
          />
          <Input
            label="Icon"
            value={categoryEditState.icon}
            onChange={(event) => setCategoryEditState((prev) => ({ ...prev, icon: event.target.value }))}
          />
          <label className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)]">
            <input
              type="checkbox"
              checked={categoryEditState.is_active}
              onChange={(event) => setCategoryEditState((prev) => ({ ...prev, is_active: event.target.checked }))}
            />
            Active
          </label>

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setCategoryEditOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!categoryEditState.id || !categoryEditState.name.trim()) {
                  toast.push("Invalid form", "Category name is required", "error");
                  return;
                }
                updateCategoryMutation.mutate({
                  id: categoryEditState.id,
                  data: {
                    name: categoryEditState.name.trim(),
                    description: categoryEditState.description.trim() || "",
                    icon: categoryEditState.icon.trim() || "",
                    is_active: categoryEditState.is_active,
                  },
                });
              }}
              disabled={updateCategoryMutation.isPending}
            >
              {updateCategoryMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </Modal>
    </section>
  );
}
