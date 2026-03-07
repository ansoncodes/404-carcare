"use client";

import { useEffect } from "react";
import { z } from "zod";
import { useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getUser, updateUser } from "@/services/auth.service";
import { listAirports } from "@/services/airports.service";
import { useToast } from "@/providers/ToastProvider";

const schema = z.object({
  full_name: z.string().min(2),
  phone: z.string().optional(),
  role: z.enum(["customer", "supervisor", "admin"]),
  is_active: z.boolean(),
  airport: z.string().optional(),
});

type Values = z.infer<typeof schema>;

export default function AdminUserDetailPage() {
  const params = useParams<{ id: string }>();
  const toast = useToast();

  const userQuery = useQuery({ queryKey: ["user", params.id], queryFn: () => getUser(params.id) });
  const airportsQuery = useQuery({ queryKey: ["airports"], queryFn: listAirports });

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: "",
      phone: "",
      role: "customer",
      is_active: true,
      airport: "",
    },
  });

  const selectedRole = form.watch("role");

  useEffect(() => {
    if (!userQuery.data) {
      return;
    }
    form.reset({
      full_name: userQuery.data.full_name,
      phone: userQuery.data.phone ?? "",
      role: userQuery.data.role,
      is_active: userQuery.data.is_active,
      airport: userQuery.data.airport ?? "",
    });
  }, [form, userQuery.data]);

  const updateMutation = useMutation({
    mutationFn: (values: Values) =>
      updateUser(params.id, {
        full_name: values.full_name,
        phone: values.phone || null,
        role: values.role,
        is_active: values.is_active,
        airport: values.role === "supervisor" ? values.airport || null : null,
      }),
    onSuccess: () => {
      toast.push("Saved", "User updated", "success");
      userQuery.refetch();
    },
    onError: () => toast.push("Save failed", "Could not update user", "error"),
  });

  return (
    <section className="space-y-6">
      <PageHeader title="User Detail" subtitle="Edit role, status, and airport" />
      <Card>
        <p className="mono text-xs text-[var(--text-muted)]">User ID: {params.id}</p>
      </Card>
      <form className="panel space-y-4 p-4" onSubmit={form.handleSubmit((values) => updateMutation.mutate(values))}>
        <Input label="Full name" {...form.register("full_name")} error={form.formState.errors.full_name?.message} />
        <Input label="Phone" {...form.register("phone")} error={form.formState.errors.phone?.message} />

        <label className="block space-y-1.5">
          <span className="text-xs text-[var(--text-secondary)]">Role</span>
          <select
            className="h-10 w-full rounded-lg border border-[var(--bg-border)] bg-[var(--bg-elevated)] px-3 text-sm text-[var(--text-primary)]"
            {...form.register("role")}
          >
            <option value="customer">Customer</option>
            <option value="supervisor">Supervisor</option>
            <option value="admin">Admin</option>
          </select>
        </label>

        {selectedRole === "supervisor" ? (
          <label className="block space-y-1.5">
            <span className="text-xs text-[var(--text-secondary)]">Assigned airport</span>
            <select
              className="h-10 w-full rounded-lg border border-[var(--bg-border)] bg-[var(--bg-elevated)] px-3 text-sm text-[var(--text-primary)]"
              {...form.register("airport")}
            >
              <option value="">Select airport</option>
              {(airportsQuery.data ?? []).map((airport) => (
                <option key={airport.id} value={airport.id}>
                  {airport.name} ({airport.code})
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <label className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <input type="checkbox" {...form.register("is_active")} />
          Active
        </label>

        <Button type="submit" disabled={updateMutation.isPending}>Save changes</Button>
      </form>
    </section>
  );
}