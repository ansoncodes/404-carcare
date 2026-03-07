"use client";

import { useQuery } from "@tanstack/react-query";
import { listParkingSlots } from "@/services/parking.service";
import { useBookingStore } from "@/store/bookingStore";
import { currencyINR } from "@/lib/formatters";

export function ParkingPicker() {
  const airportId = useBookingStore((state) => state.airportId);
  const selected = useBookingStore((state) => state.parkingSlotId);
  const parkingHours = useBookingStore((state) => state.parkingHours);
  const setField = useBookingStore((state) => state.setField);

  const { data } = useQuery({
    queryKey: ["parking-slots", airportId],
    queryFn: () => listParkingSlots({ airport: airportId ?? undefined }),
    enabled: Boolean(airportId),
  });

  const slots = data ?? [];

  return (
    <div className="space-y-3">
      <button
        className={`w-full rounded-lg border px-4 py-3 text-left text-sm transition-colors ${selected === null
            ? "border-[var(--accent)] bg-[var(--bg-elevated)] text-[var(--text-primary)]"
            : "border-[var(--bg-border)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:border-[var(--text-muted)]"
          }`}
        onClick={() => {
          setField("parkingSlotId", null);
          setField("parkingHours", 1);
        }}
      >
        <span className="font-medium">Skip parking</span>
        <span className="ml-2 text-[var(--text-muted)]">— No parking needed</span>
      </button>

      {selected && (
        <div className="panel flex flex-wrap items-center gap-3 p-3">
          <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">Parking Duration</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="inline-flex size-8 items-center justify-center rounded-lg border border-[var(--bg-border)] bg-[var(--bg-elevated)] text-[var(--text-primary)] disabled:opacity-50"
              disabled={parkingHours <= 1}
              onClick={() => setField("parkingHours", Math.max(1, parkingHours - 1))}
            >
              -
            </button>
            <span className="min-w-12 text-center text-sm font-semibold text-[var(--text-primary)]">{parkingHours}h</span>
            <button
              type="button"
              className="inline-flex size-8 items-center justify-center rounded-lg border border-[var(--bg-border)] bg-[var(--bg-elevated)] text-[var(--text-primary)] disabled:opacity-50"
              disabled={parkingHours >= 24}
              onClick={() => setField("parkingHours", Math.min(24, parkingHours + 1))}
            >
              +
            </button>
          </div>
          <p className="ml-auto text-xs text-[var(--text-secondary)]">You can extend hours later; overstay incurs extra INR 200.</p>
        </div>
      )}

      {slots.length > 0 && (
        <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
          Available Parking Slots
        </p>
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        {slots.map((slot) => {
          const disabled = !slot.is_available;
          return (
            <button
              key={slot.id}
              disabled={disabled}
              className={`rounded-lg border px-4 py-3 text-left text-sm transition-colors ${disabled
                  ? "cursor-not-allowed border-[var(--bg-border)] bg-[var(--bg-surface)] opacity-50"
                  : selected === slot.id
                    ? "border-[var(--accent)] bg-[var(--bg-elevated)]"
                    : "border-[var(--bg-border)] bg-[var(--bg-surface)] hover:border-[var(--text-muted)]"
                }`}
              onClick={() => !disabled && setField("parkingSlotId", slot.id)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium text-[var(--text-primary)]">
                    {slot.zone_label}
                  </span>
                  <span className="ml-1.5 text-[var(--text-muted)]">
                    {slot.slot_code}
                  </span>
                </div>
                <span className="font-medium text-[var(--accent)]">
                  {currencyINR(slot.price_per_hour)}/hr
                </span>
              </div>
              {selected === slot.id && (
                <p className="mt-1 text-xs text-cyan-300">
                  Initial charge: {currencyINR(Number(slot.price_per_hour) * parkingHours)}
                </p>
              )}
              <div className="mt-1 flex items-center gap-3 text-xs text-[var(--text-muted)]">
                <span>Floor {slot.floor}</span>
                <span
                  className={
                    disabled ? "text-red-400" : "text-emerald-400"
                  }
                >
                  {disabled ? "Unavailable" : "Available"}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
