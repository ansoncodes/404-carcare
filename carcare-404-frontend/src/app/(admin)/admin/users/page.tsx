"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/ui/table";
import { listUsers } from "@/services/auth.service";

export default function AdminUsersPage() {
  const [role, setRole] = useState<"all" | "customer" | "supervisor" | "admin">("all");
  const query = useQuery({
    queryKey: ["users", role],
    queryFn: () => listUsers(role === "all" ? undefined : role),
  });

  return (
    <section className="space-y-6">
      <PageHeader
        title="Users"
        subtitle="Manage customers and supervisors"
        action={
          <select
            className="h-10 rounded-lg border border-[var(--bg-border)] bg-[var(--bg-elevated)] px-3 text-sm text-[var(--text-primary)]"
            value={role}
            onChange={(event) => setRole(event.target.value as "all" | "customer" | "supervisor" | "admin")}
          >
            <option value="all">All roles</option>
            <option value="customer">Customer</option>
            <option value="supervisor">Supervisor</option>
            <option value="admin">Admin</option>
          </select>
        }
      />
      {query.data ? (
        <DataTable
          rows={query.data}
          rowKey={(row) => row.id}
          columns={[
            { key: "name", header: "Name", render: (row) => row.full_name },
            { key: "email", header: "Email", render: (row) => row.email },
            { key: "role", header: "Role", render: (row) => row.role },
            { key: "active", header: "Status", render: (row) => (row.is_active ? "active" : "inactive") },
            {
              key: "open",
              header: "",
              render: (row) => (
                <Link href={`/admin/users/${row.id}`} className="text-xs text-[var(--accent)]">
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