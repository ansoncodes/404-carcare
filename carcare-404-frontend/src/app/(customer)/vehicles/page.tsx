"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { listVehicles } from "@/services/vehicles.service";

export default function VehiclesPage() {
  const query = useQuery({ queryKey: ["vehicles"], queryFn: listVehicles });

  return (
    <section className="space-y-6">
      <PageHeader
        title="Vehicles"
        subtitle="Manage your registered cars"
        action={
          <Link href="/vehicles/new">
            <Button>Add vehicle</Button>
          </Link>
        }
      />
      {query.data && query.data.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {query.data.map((vehicle) => (
            <Card key={vehicle.id}>
              <p className="mono text-xs text-[var(--text-muted)]">{vehicle.plate_number}</p>
              <p className="mt-1 text-sm text-[var(--text-primary)]">
                {vehicle.brand ?? "Unknown"} {vehicle.model ?? ""}
              </p>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState title="No vehicles" description="Add a vehicle to start booking." />
      )}
    </section>
  );
}