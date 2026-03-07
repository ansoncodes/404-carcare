"use client";

import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { BookingCard } from "@/components/booking/BookingCard";
import { listBookings } from "@/services/bookings.service";

export default function BookingsPage() {
  const query = useQuery({ queryKey: ["bookings"], queryFn: listBookings });

  return (
    <section className="space-y-6 app-fade-in">
      <PageHeader title="Bookings" subtitle="All your service bookings" />
      {query.data && query.data.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {query.data.map((booking) => (
            <BookingCard key={booking.id} booking={booking} />
          ))}
        </div>
      ) : (
        <EmptyState title="No bookings found" description="Booked services will appear here." />
      )}
    </section>
  );
}
