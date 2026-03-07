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
import { createAirport, listAirports } from "@/services/airports.service";
import { useToast } from "@/providers/ToastProvider";

const schema = z.object({
  name: z.string().min(2),
  code: z.string().min(3).max(10),
  city: z.string().min(2),
  address: z.string().optional(),
});

type Values = z.infer<typeof schema>;

export default function AdminAirportsPage() {
  const toast = useToast();
  const query = useQuery({ queryKey: ["airports"], queryFn: listAirports });

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", code: "", city: "", address: "" },
  });

  const createMutation = useMutation({
    mutationFn: createAirport,
    onSuccess: () => {
      toast.push("Airport added", "New airport created", "success");
      form.reset();
      query.refetch();
    },
    onError: () => toast.push("Create failed", "Could not create airport", "error"),
  });

  return (
    <section className="space-y-6">
      <PageHeader title="Airports" subtitle="Manage airport records" />

      <form className="panel grid gap-3 p-4 md:grid-cols-5" onSubmit={form.handleSubmit((values) => createMutation.mutate(values))}>
        <Input label="Name" {...form.register("name")} error={form.formState.errors.name?.message} />
        <Input label="Code" {...form.register("code")} error={form.formState.errors.code?.message} />
        <Input label="City" {...form.register("city")} error={form.formState.errors.city?.message} />
        <Input label="Address" {...form.register("address")} error={form.formState.errors.address?.message} />
        <div className="flex items-end">
          <Button type="submit" className="w-full" disabled={createMutation.isPending}>
            {createMutation.isPending ? "Creating..." : "Add Airport"}
          </Button>
        </div>
      </form>

      {query.data ? (
        <DataTable
          rows={query.data}
          rowKey={(row) => row.id}
          columns={[
            { key: "name", header: "Name", render: (row) => row.name },
            { key: "code", header: "Code", render: (row) => row.code },
            { key: "city", header: "City", render: (row) => row.city },
            {
              key: "active",
              header: "Status",
              render: (row) => (row.is_active ? "active" : "inactive"),
            },
            {
              key: "open",
              header: "",
              render: (row) => (
                <Link href={`/admin/airports/${row.id}`} className="text-xs text-[var(--accent)]">
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