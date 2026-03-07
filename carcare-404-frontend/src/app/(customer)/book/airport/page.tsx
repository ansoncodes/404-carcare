"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/PageHeader";
import { BookingSteps } from "@/components/booking/BookingSteps";
import { Button } from "@/components/ui/button";
import { listAirports } from "@/services/airports.service";
import { useBookingStore } from "@/store/bookingStore";

export default function BookAirportPage() {
  const { data } = useQuery({ queryKey: ["airports"], queryFn: listAirports });
  const airportId = useBookingStore((state) => state.airportId);
  const date = useBookingStore((state) => state.date);
  const setField = useBookingStore((state) => state.setField);

  return (
    <section className="space-y-6">
      <PageHeader title="New Booking" subtitle="Step 2: Select airport and date" />
      <BookingSteps current={2} />
      <div className="space-y-2">
        {(data ?? []).map((airport) => (
          <button
            key={airport.id}
            className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${airportId === airport.id
                ? "border-[var(--accent)] bg-[var(--bg-elevated)] text-[var(--text-primary)]"
                : "border-[var(--bg-border)] bg-[var(--bg-surface)] text-[var(--text-secondary)]"
              }`}
            onClick={() => setField("airportId", airport.id)}
          >
            {airport.name} ({airport.code})
          </button>
        ))}
      </div>
      <div className="space-y-2">
        <label className="block text-sm font-medium text-[var(--text-primary)]">
          Service Date
        </label>
        <input
          type="date"
          className="h-10 w-full max-w-xs rounded-lg border border-[var(--bg-border)] bg-[var(--bg-elevated)] px-3 text-sm text-[var(--text-primary)]"
          value={date ?? ""}
          min={new Date().toISOString().split("T")[0]}
          onChange={(event) => setField("date", event.target.value || null)}
        />
        {!date && (
          <p className="text-xs text-amber-400">Please select a date to continue</p>
        )}
      </div>
      <div className="flex justify-between">
        <Link href="/book">
          <Button variant="secondary">Back</Button>
        </Link>
        <Link href="/book/services">
          <Button>Next</Button>
        </Link>
      </div>
    </section>
  );
}
