"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AddItemsPanel } from "@/components/booking/AddItemsPanel";
import { ProgressBar } from "@/components/booking/ProgressBar";
import { PageHeader } from "@/components/shared/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { titleCase, currencyINR } from "@/lib/formatters";
import { cancelBooking, getBooking } from "@/services/bookings.service";
import { mockPay } from "@/services/payments.service";
import { useBookingProgress } from "@/hooks/useBookingProgress";
import { useToast } from "@/providers/ToastProvider";

export default function BookingDetailPage() {
  const params = useParams<{ id: string }>();
  const bookingId = params.id;
  const toast = useToast();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["booking", bookingId],
    queryFn: () => getBooking(bookingId),
  });

  const progress = useBookingProgress(
    bookingId,
    query.data?.progress_percentage ?? 0,
    query.data?.current_stage ?? null
  );

  const payMutation = useMutation({
    mutationFn: () => mockPay({ booking_id: bookingId, payment_method: "card" }),
    onSuccess: (data) => {
      toast.push(
        "Payment successful",
        `Invoice ${data.invoice_number} - ${currencyINR(data.amount_paid)}.`,
        "success"
      );
      queryClient.invalidateQueries({ queryKey: ["booking", bookingId] });
      queryClient.invalidateQueries({ queryKey: ["chat-rooms"] });
    },
    onError: () => {
      toast.push("Payment failed", "Please try again", "error");
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => cancelBooking(bookingId),
    onSuccess: () => {
      toast.push("Booking cancelled", "", "success");
      queryClient.invalidateQueries({ queryKey: ["booking", bookingId] });
    },
    onError: () => {
      toast.push("Cancel failed", "Unable to cancel this booking", "error");
    },
  });

  if (!query.data) {
    return <div className="h-40 animate-pulseSoft rounded-xl bg-[var(--bg-elevated)]" />;
  }

  const booking = query.data;
  const canPay = booking.status === "pending";
  const isPaid = booking.status === "confirmed" || booking.status === "in_progress" || booking.status === "completed";
  const canChat = isPaid;
  const canCancel = booking.status === "pending" || booking.status === "confirmed";

  return (
    <section className="space-y-6 app-fade-in">
      <PageHeader title={`Booking ${booking.booking_reference}`} subtitle="Track progress and manage your booking" />

      <Card className="panel-hover">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Badge status={booking.status} pulse={booking.status === "in_progress"} />
            <span className="text-xs font-medium text-[var(--text-secondary)]">{progress.connected ? "Live" : "Offline"}</span>
          </div>
          <p className="text-sm text-[var(--text-primary)]">
            Current stage: <span className="font-semibold">{progress.stage ? titleCase(progress.stage) : "Pending"}</span>
          </p>
          <ProgressBar value={progress.progress} showValue />
        </div>
      </Card>

      {canPay ? (
        <Card className="panel-hover">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-400/30 bg-amber-400/10 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-amber-300">Payment required</p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                Complete payment to confirm your booking and unlock chat.
              </p>
            </div>
            <Button disabled={payMutation.isPending} onClick={() => payMutation.mutate()}>
              {payMutation.isPending
                ? "Processing..."
                : `Pay ${booking.total_estimated_cost ? currencyINR(booking.total_estimated_cost) : ""}`}
            </Button>
          </div>
        </Card>
      ) : null}

      {isPaid ? (
        <Card className="panel-hover">
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
            <div className="flex-1">
              <p className="text-sm font-semibold text-emerald-300">Payment confirmed</p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                Booking is confirmed. You can now chat with your supervisor.
              </p>
            </div>
            <Link href={`/bookings/${bookingId}/chat`}>
              <Button>Open Chat</Button>
            </Link>
          </div>
        </Card>
      ) : null}

      <Card className="panel-hover">
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Details</h3>
          <InfoRow
            label="Vehicle"
            value={`${booking.vehicle.plate_number}${booking.vehicle.brand ? ` - ${booking.vehicle.brand} ${booking.vehicle.model ?? ""}` : ""}`}
          />
          <InfoRow label="Airport" value={`${booking.airport.name} (${booking.airport.code})`} />
          <InfoRow label="Status" value={titleCase(booking.status)} />
          {booking.special_instructions ? <InfoRow label="Notes" value={booking.special_instructions} /> : null}
        </div>
      </Card>

      {booking.items.length > 0 ? (
        <Card className="panel-hover">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Services</h3>
            {booking.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between text-sm">
                <span className="text-[var(--text-primary)]">
                  {item.service.name}
                  {item.quantity > 1 ? <span className="text-[var(--text-muted)]"> x {item.quantity}</span> : null}
                </span>
                <span className="font-medium text-[var(--text-secondary)]">{currencyINR(item.total_price)}</span>
              </div>
            ))}
            <div className="border-t border-[var(--bg-border)] pt-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-[var(--text-primary)]">Total</span>
                <span className="text-base font-bold text-[var(--accent)]">
                  {booking.total_estimated_cost
                    ? currencyINR(booking.total_estimated_cost)
                    : booking.total_final_cost
                      ? currencyINR(booking.total_final_cost)
                      : "-"}
                </span>
              </div>
            </div>
          </div>
        </Card>
      ) : null}

      {canPay ? <AddItemsPanel bookingId={bookingId} /> : null}

      <div className="flex flex-wrap gap-3">
        {canChat ? (
          <Link href={`/bookings/${bookingId}/chat`}>
            <Button variant="secondary">Chat with Supervisor</Button>
          </Link>
        ) : null}
        {canCancel ? (
          <Button
            variant="secondary"
            disabled={cancelMutation.isPending}
            onClick={() => {
              if (confirm("Are you sure you want to cancel this booking?")) {
                cancelMutation.mutate();
              }
            }}
          >
            {cancelMutation.isPending ? "Cancelling..." : "Cancel Booking"}
          </Button>
        ) : null}
      </div>
    </section>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="shrink-0 text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">{label}</span>
      <span className="text-right text-sm text-[var(--text-primary)]">{value}</span>
    </div>
  );
}
