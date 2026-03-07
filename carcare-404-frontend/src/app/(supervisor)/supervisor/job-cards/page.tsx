"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/PageHeader";
import { listJobCards } from "@/services/operations.service";
import type { JobCard } from "@/types/operations.types";

function getCurrentStage(stages: Array<{ stage_name: string; status: string }>): string {
  const inProgress = stages.find((stage) => stage.status === "in_progress");
  if (inProgress) {
    return inProgress.stage_name.replaceAll("_", " ");
  }
  const nextPending = stages.find((stage) => stage.status === "pending");
  if (nextPending) {
    return `${nextPending.stage_name.replaceAll("_", " ")} (next)`;
  }
  return "Completed";
}

type StatusFilter = "all" | "pending" | "active" | "paused" | "completed";

export default function SupervisorJobCardsPage() {
  const query = useQuery({ queryKey: ["job-cards"], queryFn: listJobCards });
  const rows = query.data ?? [];
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const filteredRows = useMemo(() => {
    if (statusFilter === "all") {
      return rows;
    }
    return rows.filter((row) => row.status === statusFilter);
  }, [rows, statusFilter]);

  const statusCounts = useMemo(() => {
    const countByStatus: Record<JobCard["status"], number> = {
      pending: 0,
      active: 0,
      paused: 0,
      completed: 0,
    };
    rows.forEach((row) => {
      countByStatus[row.status] += 1;
    });
    return {
      all: rows.length,
      pending: countByStatus.pending,
      active: countByStatus.active,
      paused: countByStatus.paused,
      completed: countByStatus.completed,
    };
  }, [rows]);

  const filterTags: Array<{ value: StatusFilter; label: string }> = [
    { value: "all", label: "All" },
    { value: "active", label: "Active" },
    { value: "pending", label: "Pending" },
    { value: "paused", label: "Paused" },
    { value: "completed", label: "Completed" },
  ];

  return (
    <section className="space-y-6 app-fade-in">
      <PageHeader title="Job Cards" subtitle="Operational list with status filters" />
      <div className="flex flex-wrap items-center gap-2">
        {filterTags.map((tag) => {
          const active = statusFilter === tag.value;
          return (
            <button
              key={tag.value}
              type="button"
              onClick={() => setStatusFilter(tag.value)}
              className={[
                "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition",
                active
                  ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-200"
                  : "border-slate-700/50 bg-slate-900/30 text-slate-300 hover:border-slate-500/70",
              ].join(" ")}
            >
              <span>{tag.label}</span>
              <span className="rounded-full bg-slate-800/70 px-2 py-0.5 text-[11px] text-slate-200">
                {statusCounts[tag.value]}
              </span>
            </button>
          );
        })}
      </div>
      {query.isLoading ? (
        <div className="h-40 animate-pulseSoft rounded-xl bg-[var(--bg-elevated)]" />
      ) : (
        <div className="panel divide-y divide-[var(--bg-border)]">
          {filteredRows.length === 0 ? (
            <div className="px-4 py-6 text-sm text-[var(--text-secondary)]">No job cards found for this filter.</div>
          ) : (
            filteredRows.map((row) => {
              const booking = typeof row.booking === "string" ? null : row.booking;
              const vehicle = booking
                ? `${booking.vehicle.brand ?? "Vehicle"}${booking.vehicle.model ? ` ${booking.vehicle.model}` : ""}`
                : "Vehicle";
              return (
                <Link key={row.id} href={`/supervisor/job-cards/${row.id}`} className="block px-4 py-3 hover:bg-[var(--bg-elevated)]">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[var(--text-primary)]">{vehicle}</p>
                      <p className="text-xs text-[var(--text-secondary)]">{booking?.vehicle.plate_number ?? "-"}</p>
                      <p className="mt-1 text-xs text-cyan-300">Stage: {getCurrentStage(row.stages)}</p>
                      <p className="mt-1 text-xs text-[var(--text-muted)]">Services: {row.services.join(" + ") || "-"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge status={row.status} pulse={row.status === "active"} />
                      <span className="mono text-xs text-[var(--text-muted)]">{row.job_number}</span>
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      )}
    </section>
  );
}
