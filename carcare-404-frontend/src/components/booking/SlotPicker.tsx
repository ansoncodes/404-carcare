"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getDayAvailability } from "@/services/slots.service";
import { useBookingStore } from "@/store/bookingStore";

type SlotWindowKey = "all" | "night" | "morning" | "afternoon" | "evening";

type SlotOption = {
  time: string;
  datetime: string;
  available: boolean;
  peak_concurrent: number;
};

type DecoratedSlot = SlotOption & {
  displayTime: string;
  minutesFromMidnight: number;
  window: Exclude<SlotWindowKey, "all">;
};

const SLOT_WINDOW_OPTIONS: Array<{ key: SlotWindowKey; label: string }> = [
  { key: "all", label: "All day" },
  { key: "morning", label: "Morning" },
  { key: "afternoon", label: "Afternoon" },
  { key: "evening", label: "Evening" },
  { key: "night", label: "Night" },
];

const slotTimeFormatter = new Intl.DateTimeFormat("en-IN", {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

function formatDuration(minutes: number): string {
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;
    return remainder > 0 ? `${hours}h ${remainder}m` : `${hours}h`;
  }
  return `${minutes}m`;
}

function getTodayLocalDateIso(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getMinutesFromSlot(slot: SlotOption): number {
  const date = new Date(slot.datetime);
  if (!Number.isNaN(date.getTime())) {
    return date.getHours() * 60 + date.getMinutes();
  }

  const [hours, minutes] = slot.time.split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return 0;
  }
  return hours * 60 + minutes;
}

function getWindowForMinutes(minutes: number): Exclude<SlotWindowKey, "all"> {
  if (minutes >= 360 && minutes < 720) {
    return "morning";
  }
  if (minutes >= 720 && minutes < 1020) {
    return "afternoon";
  }
  if (minutes >= 1020 && minutes < 1320) {
    return "evening";
  }
  return "night";
}

function formatSlotDisplayTime(slot: SlotOption): string {
  const date = new Date(slot.datetime);
  if (!Number.isNaN(date.getTime())) {
    return slotTimeFormatter.format(date);
  }

  const [hours, minutes] = slot.time.split(":").map(Number);
  if (!Number.isNaN(hours) && !Number.isNaN(minutes)) {
    const fallback = new Date();
    fallback.setHours(hours, minutes, 0, 0);
    return slotTimeFormatter.format(fallback);
  }
  return slot.time;
}

export function SlotPicker() {
  const airportId = useBookingStore((state) => state.airportId);
  const date = useBookingStore((state) => state.date);
  const serviceIds = useBookingStore((state) => state.serviceIds);
  const selected = useBookingStore((state) => state.scheduledStart);
  const setField = useBookingStore((state) => state.setField);
  const [activeWindow, setActiveWindow] = useState<SlotWindowKey>("all");

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
  const decoratedSlots = useMemo<DecoratedSlot[]>(
    () => {
      const mappedSlots = slots.map((slot) => {
        const minutesFromMidnight = getMinutesFromSlot(slot);
        return {
          ...slot,
          displayTime: formatSlotDisplayTime(slot),
          minutesFromMidnight,
          window: getWindowForMinutes(minutesFromMidnight),
        };
      });
      return mappedSlots.sort(
        (slotA, slotB) => slotA.minutesFromMidnight - slotB.minutesFromMidnight
      );
    },
    [slots]
  );
  const slotCountsByWindow = useMemo<Record<SlotWindowKey, number>>(() => {
    const counts: Record<SlotWindowKey, number> = {
      all: 0,
      morning: 0,
      afternoon: 0,
      evening: 0,
      night: 0,
    };
    for (const slot of decoratedSlots) {
      counts.all += 1;
      counts[slot.window] += 1;
    }
    return counts;
  }, [decoratedSlots]);
  const visibleSlots = useMemo(
    () =>
      activeWindow === "all"
        ? decoratedSlots
        : decoratedSlots.filter((slot) => slot.window === activeWindow),
    [activeWindow, decoratedSlots]
  );
  const selectedSlot = useMemo(
    () => decoratedSlots.find((slot) => slot.datetime === selected) ?? null,
    [decoratedSlots, selected]
  );
  const nextAvailableSlot = decoratedSlots[0] ?? null;
  const selectedHiddenByFilter =
    selectedSlot !== null && activeWindow !== "all" && selectedSlot.window !== activeWindow;
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
          min={getTodayLocalDateIso()}
          onChange={(e) => {
            setField("date", e.target.value || null);
            setField("scheduledStart", null);
            setActiveWindow("all");
          }}
        />
        {date && totalDuration > 0 && (
          <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-[var(--bg-elevated)] px-3 py-1 text-xs font-medium text-[var(--accent)]">
            <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            Total duration: {formatDuration(totalDuration)}
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
        <div className="space-y-3">
          <div className="panel space-y-3 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
                Choose a time window
              </p>
              {selectedSlot && (
                <p className="text-xs text-[var(--text-secondary)]">
                  Selected: <span className="font-semibold text-[var(--text-primary)]">{selectedSlot.displayTime}</span>
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {SLOT_WINDOW_OPTIONS.map((windowOption) => {
                const isActive = activeWindow === windowOption.key;
                return (
                  <button
                    key={windowOption.key}
                    type="button"
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                      isActive
                        ? "border-[var(--accent)] bg-[rgba(34,211,238,0.12)] text-[var(--accent)]"
                        : "border-[var(--bg-border)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:border-[var(--text-muted)]"
                    }`}
                    onClick={() => setActiveWindow(windowOption.key)}
                  >
                    {windowOption.label} ({slotCountsByWindow[windowOption.key]})
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--bg-border)] bg-[var(--bg-surface)] px-3 py-2">
              <p className="text-xs text-[var(--text-secondary)]">
                Earliest available:{" "}
                <span className="font-semibold text-[var(--text-primary)]">
                  {nextAvailableSlot ? nextAvailableSlot.displayTime : "N/A"}
                </span>
              </p>
              {nextAvailableSlot && selected !== nextAvailableSlot.datetime && (
                <button
                  type="button"
                  className="rounded-md border border-[var(--bg-border)] px-2 py-1 text-xs font-medium text-[var(--text-primary)] hover:border-[var(--text-muted)]"
                  onClick={() => setField("scheduledStart", nextAvailableSlot.datetime)}
                >
                  Pick earliest
                </button>
              )}
            </div>

            {selectedHiddenByFilter && (
              <p className="text-xs text-amber-400">
                Your selected slot is hidden by this filter. Switch to All day to see it.
              </p>
            )}
          </div>

          {visibleSlots.length === 0 ? (
            <div className="panel p-6 text-center">
              <p className="text-sm font-medium text-[var(--text-primary)]">No slots in this time window</p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                Try another time window or select a different date.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {visibleSlots.map((slot) => {
                const isSelected = selected === slot.datetime;
                return (
                  <button
                    key={slot.datetime}
                    type="button"
                    className={`rounded-xl border px-3 py-3 text-left transition-all duration-150 ${
                      isSelected
                        ? "border-[var(--accent)] bg-[linear-gradient(180deg,rgba(34,211,238,0.15),rgba(34,211,238,0.04))] shadow-[0_0_0_1px_var(--accent)]"
                        : "border-[var(--bg-border)] bg-[var(--bg-surface)] hover:border-[var(--text-muted)] hover:bg-[var(--bg-elevated)]"
                    }`}
                    onClick={() => setField("scheduledStart", slot.datetime)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`text-sm font-semibold ${
                          isSelected ? "text-[var(--accent)]" : "text-[var(--text-primary)]"
                        }`}
                      >
                        {slot.displayTime}
                      </span>
                      {nextAvailableSlot?.datetime === slot.datetime && (
                        <span className="rounded-full bg-[rgba(34,211,238,0.16)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--accent)]">
                          Earliest
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-[11px] text-[var(--text-muted)]">24h: {slot.time}</p>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
