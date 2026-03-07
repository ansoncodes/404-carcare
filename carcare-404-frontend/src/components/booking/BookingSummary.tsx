"use client";

import { useQuery } from "@tanstack/react-query";
import { useBookingStore } from "@/store/bookingStore";
import { listVehicles } from "@/services/vehicles.service";
import { listServices } from "@/services/services.service";
import { listParkingSlots } from "@/services/parking.service";
import { currencyINR } from "@/lib/formatters";

export function BookingSummary() {
  const state = useBookingStore();

  const vehicles = useQuery({ queryKey: ["vehicles"], queryFn: listVehicles });
  const airports = useQuery({
    queryKey: ["airports"],
    queryFn: () =>
      import("@/services/airports.service").then((m) => m.listAirports()),
  });
  const services = useQuery({
    queryKey: ["services"],
    queryFn: () => listServices(),
  });
  const parkingSlots = useQuery({
    queryKey: ["parking-slots", state.airportId],
    queryFn: () =>
      listParkingSlots({ airport: state.airportId ?? undefined }),
    enabled: Boolean(state.airportId),
  });

  const vehicle = (vehicles.data ?? []).find((v) => v.id === state.vehicleId);
  const airport = (airports.data ?? []).find((a) => a.id === state.airportId);
  const selectedServices = (services.data ?? []).filter((s) =>
    state.serviceIds.includes(s.id)
  );
  const parkingSlot = state.parkingSlotId
    ? (parkingSlots.data ?? []).find((p) => p.id === state.parkingSlotId)
    : null;

  const servicesTotal = selectedServices.reduce(
    (sum, s) => sum + Number(s.base_price),
    0
  );
  const parkingInitialTotal = parkingSlot ? Number(parkingSlot.price_per_hour) * state.parkingHours : 0;
  const estimatedTotal = servicesTotal + parkingInitialTotal;
  const totalDuration = selectedServices.reduce(
    (sum, s) => sum + s.duration_minutes,
    0
  );

  // Format scheduled time for display
  const scheduledTimeDisplay = state.scheduledStart
    ? (() => {
      const dt = new Date(state.scheduledStart);
      const endDt = new Date(dt.getTime() + totalDuration * 60 * 1000);
      const fmt = (d: Date) =>
        d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      return `${fmt(dt)} – ${fmt(endDt)} (${totalDuration >= 60 ? `${Math.floor(totalDuration / 60)}h ${totalDuration % 60 > 0 ? `${totalDuration % 60}m` : ""}` : `${totalDuration}m`})`;
    })()
    : "Not selected";

  return (
    <div className="panel space-y-4 p-5">
      <h3 className="text-sm font-semibold text-[var(--text-primary)]">
        Booking Summary
      </h3>

      {/* Vehicle */}
      <Row
        label="Vehicle"
        value={
          vehicle
            ? `${vehicle.plate_number}${vehicle.brand ? ` — ${vehicle.brand} ${vehicle.model ?? ""}` : ""}`
            : "Not selected"
        }
      />

      {/* Airport */}
      <Row
        label="Airport"
        value={
          airport ? `${airport.name} (${airport.code})` : "Not selected"
        }
      />

      {/* Date */}
      <Row label="Date" value={state.date ?? "Not selected"} />

      {/* Scheduled Time */}
      <Row label="Time Slot" value={scheduledTimeDisplay} />

      {/* Services */}
      <div className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
          Services
        </p>
        {selectedServices.length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)]">None selected</p>
        ) : (
          selectedServices.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between text-sm"
            >
              <span className="text-[var(--text-primary)]">
                {s.name}
                <span className="ml-2 text-xs text-[var(--text-muted)]">
                  ({s.duration_minutes}min)
                </span>
              </span>
              <span className="text-[var(--text-secondary)]">
                {currencyINR(s.base_price)}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Parking */}
      <Row
        label="Parking"
        value={
          parkingSlot
            ? `${parkingSlot.zone_label} ${parkingSlot.slot_code} — ${currencyINR(parkingSlot.price_per_hour)}/hr × ${state.parkingHours}h`
            : "Skipped"
        }
      />

      {/* Special Instructions */}
      {state.notes && (
        <Row label="Instructions" value={state.notes} />
      )}

      {/* Total */}
      <div className="border-t border-[var(--bg-border)] pt-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-[var(--text-primary)]">
            Estimated Total
          </span>
          <span className="text-base font-bold text-[var(--accent)]">
            {estimatedTotal > 0 ? currencyINR(estimatedTotal) : "—"}
          </span>
        </div>
        {parkingSlot && (
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Includes parking initial charge ({state.parkingHours}h): {currencyINR(parkingInitialTotal)}
          </p>
        )}
        {parkingSlot && (
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Overstay after expected checkout will add INR 200.
          </p>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="shrink-0 text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
        {label}
      </span>
      <span className="text-right text-sm text-[var(--text-primary)]">
        {value}
      </span>
    </div>
  );
}
