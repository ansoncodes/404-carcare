"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { listChatRooms } from "@/services/chat.service";

interface ChatRoomListProps {
  basePath?: string;
  viewerRole?: "customer" | "supervisor";
}

export function ChatRoomList({ basePath = "/supervisor/chat", viewerRole = "supervisor" }: ChatRoomListProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["chat-rooms"],
    queryFn: listChatRooms,
  });

  const rooms = data ?? [];

  if (isLoading) {
    return (
      <div className="h-40 animate-pulseSoft rounded-xl bg-[var(--bg-elevated)]" />
    );
  }

  if (rooms.length === 0) {
    return (
      <div className="panel p-6 text-center">
        <p className="text-sm text-[var(--text-secondary)]">
          No chat rooms yet.
        </p>
      </div>
    );
  }

  return (
    <div className="panel divide-y divide-[var(--bg-border)]">
      {rooms.map((room) => {
        const booking = typeof room.booking === "string" ? null : room.booking;
        const bookingRef = booking?.booking_reference ?? room.id.slice(0, 8);
        const participantName =
          viewerRole === "customer"
            ? room.assigned_staff?.full_name ?? "Supervisor"
            : room.customer?.full_name ?? "Customer";
        const vehicleLabel = booking
          ? `${booking.vehicle.brand ?? "Vehicle"}${booking.vehicle.model ? ` ${booking.vehicle.model}` : ""}`
          : "Vehicle";
        const plateNumber = booking?.vehicle.plate_number ?? "-";
        return (
          <Link
            key={room.id}
            href={`${basePath}/${room.id}`}
            className="flex items-center justify-between px-4 py-3 hover:bg-[var(--bg-elevated)] transition-colors"
          >
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">
                {participantName}
              </p>
              <p className="text-xs text-[var(--text-secondary)]">
                {vehicleLabel} - {plateNumber}
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                Booking {bookingRef}
              </p>
            </div>
            <div className="text-right">
              <span
                className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${room.status === "active"
                    ? "bg-emerald-500/10 text-emerald-400"
                    : "bg-[var(--bg-border)] text-[var(--text-muted)]"
                  }`}
              >
                {room.status}
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
