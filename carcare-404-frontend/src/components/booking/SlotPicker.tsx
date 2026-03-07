"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getDayAvailability } from "@/services/slots.service";
import { useBookingStore } from "@/store/bookingStore";

type SlotOption = {
  time: string;
  datetime: string;
  available: boolean;
  peak_concurrent: number;
};

export function SlotPicker() {
  const airportId = useBookingStore((state) => state.airportId);
  const date = useBookingStore((state) => state.date);
  const serviceIds = useBookingStore((state) => state.serviceIds);
  const selected = useBookingStore((state) => state.scheduledStart);
  const setField = useBookingStore((state) => state.setField);

  const hasServices = serviceIds.length > 0;

  const availabilityQuery = useQuery({
    queryKey: ["day-availability", date, serviceIds],
    queryFn: () => getDayAvailability(date!, serviceIds),
    enabled: Boolean(date && hasServices),
  });

  const parkingOnlySlots = useMemo<SlotOption[]>(() => {
    if (!date || hasServices) {
      return [];
    }

    const startOfDay = new Date(`${date}T00:00:00`);
    const nowMs = Date.now();

    return Array.from({ length: 96 }, (_, index) => {
      const slotDate = new Date(startOfDay.getTime() + index * 15 * 60 * 1000);
      const hours = String(slotDate.getHours()).padStart(2, "0");
      const minutes = String(slotDate.getMinutes()).padStart(2, "0");
      return {
        time: `${hours}:${minutes}`,
        datetime: slotDate.toISOString(),
        available: slotDate.getTime() > nowMs,
        peak_concurrent: 0,
      };
    });
  }, [date, hasServices]);

  const allSlots = hasServices ? availabilityQuery.data?.slots ?? [] : parkingOnlySlots;
  const slots = allSlots.filter((slot) => slot.available);
  const totalDuration = hasServices ? availabilityQuery.data?.total_duration_minutes ?? 0 : 0;
  const errorMessage = hasServices && availabilityQuery.isError
    ? ((availabilityQuery.error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
      "Unable to load availability right now.")
    : null;
  const isLoading = hasServices ? availabilityQuery.isLoading : false;

  if (!airportId) {
    return (
      <div className="panel p-6 text-center">
        <p className="text-sm text-[var(--text-secondary)]">
          Please select an airport first (Step 2).
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Date picker */}
      <div className="panel flex flex-wrap items-center gap-4 p-4">
        <label className="shrink-0 text-sm font-medium text-[var(--text-primary)]">
          Select Date
        </label>
        <input
          type="date"
          className="h-10 rounded-lg border border-[var(--bg-border)] bg-[var(--bg-elevated)] px-3 text-sm text-[var(--text-primary)]"
          value={date ?? ""}
          min={new Date().toISOString().split("T")[0]}
          onChange={(e) => {
            setField("date", e.target.value || null);
            setField("scheduledStart", null);
          }}
        />
        {date && totalDuration > 0 && (
          <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-[var(--bg-elevated)] px-3 py-1 text-xs font-medium text-[var(--accent)]">
            <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            Total duration: {totalDuration >= 60 ? `${Math.floor(totalDuration / 60)}h ${totalDuration % 60 > 0 ? `${totalDuration % 60}m` : ""}` : `${totalDuration}m`}
          </span>
        )}
        {date && !hasServices && (
          <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-[var(--bg-elevated)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)]">
            Parking-only booking: pick a check-in time
          </span>
        )}
      </div>

      {!date && (
        <div className="panel p-6 text-center">
          <p className="text-sm text-[var(--text-secondary)]">
            Pick a date above to see available time slots.
          </p>
        </div>
      )}

      {date && isLoading && (
        <div className="grid gap-2 sm:grid-cols-4">
          {Array.from({ length: 16 }).map((_, i) => (
            <div
              key={i}
              className="h-16 animate-pulseSoft rounded-xl bg-[var(--bg-elevated)]"
            />
          ))}
        </div>
      )}

      {date && !isLoading && !errorMessage && slots.length === 0 && (
        <div className="panel p-6 text-center">
          <p className="text-sm font-medium text-[var(--text-primary)]">
            No available slots
          </p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            No available time windows for {date}. Try a different date.
          </p>
        </div>
      )}

      {date && errorMessage && (
        <div className="panel p-6 text-center">
          <p className="text-sm font-medium text-[var(--danger)]">Unable to fetch slots</p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">{errorMessage}</p>
        </div>
      )}

      {date && !errorMessage && slots.length > 0 && (
        <div className="grid gap-2 grid-cols-3 sm:grid-cols-4 md:grid-cols-6">
          {slots.map((slot) => {
            const isSelected = selected === slot.datetime;
            return (
              <button
                key={slot.datetime}
                className={`rounded-lg border px-3 py-3 text-center text-sm transition-all duration-150 ${
                  isSelected
                    ? "border-[var(--accent)] bg-[linear-gradient(180deg,rgba(34,211,238,0.15),rgba(34,211,238,0.04))] shadow-[0_0_0_1px_var(--accent)]"
                    : "border-[var(--bg-border)] bg-[var(--bg-surface)] hover:border-[var(--text-muted)] hover:bg-[var(--bg-elevated)]"
                }`}
                onClick={() => setField("scheduledStart", slot.datetime)}
              >
                <span
                  className={`text-sm font-semibold ${
                    isSelected ? "text-[var(--accent)]" : "text-[var(--text-primary)]"
                  }`}
                >
                  {slot.time}
                </span>
                <div className="mt-1">
                  <span
                    className={`text-[10px] font-medium ${
                      slot.peak_concurrent >= 5 ? "text-amber-400" : "text-emerald-400"
                    }`}
                  >
                    {7 - slot.peak_concurrent} spot
                    {7 - slot.peak_concurrent !== 1 ? "s" : ""} left
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
