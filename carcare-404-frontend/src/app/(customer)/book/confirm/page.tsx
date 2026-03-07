"use client";

import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/PageHeader";
import { BookingSteps } from "@/components/booking/BookingSteps";
import { BookingSummary } from "@/components/booking/BookingSummary";
import { Button } from "@/components/ui/button";
import { createBooking } from "@/services/bookings.service";
import { cancelParkingBooking, createParkingBooking } from "@/services/parking.service";
import { useBookingStore } from "@/store/bookingStore";
import { useToast } from "@/providers/ToastProvider";

export default function BookConfirmPage() {
  const router = useRouter();
  const toast = useToast();
  const state = useBookingStore();
  const setField = useBookingStore((store) => store.setField);
  const reset = useBookingStore((store) => store.reset);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!state.vehicleId || !state.airportId || !state.scheduledStart) {
        throw new Error("Missing required booking fields.");
      }
      if (state.serviceIds.length === 0 && !state.parkingSlotId) {
        throw new Error("Select at least one service or parking before checkout.");
      }

      let parkingBookingId: string | undefined;
      let createdParkingBookingId: string | undefined;
      if (state.parkingSlotId) {
        const checkIn = new Date(state.scheduledStart);
        const expectedCheckout = new Date(checkIn.getTime() + state.parkingHours * 60 * 60 * 1000).toISOString();
        const parking = await createParkingBooking({
          parking_slot_id: state.parkingSlotId,
          vehicle_id: state.vehicleId,
          initial_hours: state.parkingHours,
          check_in_time: state.scheduledStart,
          expected_checkout: expectedCheckout,
          notes: "Created from booking flow",
        });
        parkingBookingId = parking.id;
        createdParkingBookingId = parking.id;
      }

      let booking;
      try {
        booking = await createBooking({
          vehicle_id: state.vehicleId,
          airport_id: state.airportId,
          scheduled_start: state.scheduledStart,
          parking_booking_id: parkingBookingId,
          special_instructions: state.notes || undefined,
          create_items:
            state.serviceIds.length > 0
              ? state.serviceIds.map((serviceId) => ({
                service_id: serviceId,
                quantity: 1,
              }))
              : undefined,
        });
      } catch (error) {
        if (createdParkingBookingId) {
          try {
            await cancelParkingBooking(createdParkingBookingId);
          } catch {
            // Best effort cleanup to avoid orphan reserved parking slots.
          }
        }
        throw error;
      }

      return booking;
    },
    onSuccess: (booking) => {
      toast.push("Booking confirmed", "Your slot has been reserved", "success");
      reset();
      router.replace(`/bookings/${booking.id}`);
    },
    onError: (error) => {
      const maybeError = error as { response?: { data?: { detail?: string } } };
      toast.push("Booking failed", maybeError.response?.data?.detail ?? "Please check your selections", "error");
    },
  });

  const canSubmit = Boolean(
    state.vehicleId &&
    state.airportId &&
    state.scheduledStart &&
    new Date(state.scheduledStart).getTime() > Date.now() &&
    (state.serviceIds.length > 0 || state.parkingSlotId)
  );

  return (
    <section className="space-y-6">
      <PageHeader title="New Booking" subtitle="Step 6: Review and confirm" />
      <BookingSteps current={6} />

      <BookingSummary />

      {/* Special instructions */}
      <div className="panel space-y-2 p-4">
        <label className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
          Special Instructions (optional)
        </label>
        <textarea
          className="w-full rounded-lg border border-[var(--bg-border)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
          rows={3}
          placeholder="Any special requests or notes for the team..."
          value={state.notes}
          onChange={(e) => setField("notes", e.target.value)}
        />
      </div>

      <div className="flex justify-between">
        <Button
          variant="secondary"
          onClick={() => router.push("/book/parking")}
        >
          Back
        </Button>
        <Button
          disabled={!canSubmit || mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending ? "Confirming..." : "Confirm & Book"}
        </Button>
      </div>
    </section>
  );
}
