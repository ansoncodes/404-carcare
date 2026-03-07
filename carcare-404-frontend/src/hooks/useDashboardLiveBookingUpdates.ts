"use client";

import { useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { WS_URL } from "@/lib/constants";
import { useAuthStore } from "@/store/authStore";
import type { Booking, BookingListRow, BookingStatus } from "@/types/booking.types";

interface BookingProgressEvent {
  type?: string;
  booking_id?: string;
  current_stage?: string | null;
  progress_percentage?: number;
  status?: BookingStatus;
}

function patchBookingRow<T extends { id: string; current_stage: string | null; progress_percentage: number; status: string }>(
  row: T,
  event: BookingProgressEvent
): T {
  if (row.id !== event.booking_id) {
    return row;
  }
  return {
    ...row,
    current_stage: typeof event.current_stage === "string" ? event.current_stage : row.current_stage,
    progress_percentage:
      typeof event.progress_percentage === "number" ? event.progress_percentage : row.progress_percentage,
    status: typeof event.status === "string" ? event.status : row.status,
  };
}

export function useDashboardLiveBookingUpdates(bookingIds: string[]) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  const stableBookingIds = useMemo(() => [...new Set(bookingIds)].sort(), [bookingIds]);
  const bookingIdsKey = stableBookingIds.join("|");

  useEffect(() => {
    if (!accessToken || stableBookingIds.length === 0) {
      return;
    }

    const sockets = new Map<string, WebSocket>();
    const reconnectTimers = new Map<string, ReturnType<typeof setTimeout>>();
    let alive = true;

    const applyProgressUpdate = (event: BookingProgressEvent) => {
      if (!event.booking_id) {
        return;
      }

      queryClient.setQueryData<BookingListRow[]>(["bookings"], (rows) => {
        if (!rows) {
          return rows;
        }
        return rows.map((row) => patchBookingRow(row, event));
      });

      queryClient.setQueryData<Booking>(["booking", event.booking_id], (booking) => {
        if (!booking) {
          return booking;
        }
        return patchBookingRow(booking, event);
      });

      queryClient.setQueryData<Booking>(["booking-detail", event.booking_id], (booking) => {
        if (!booking) {
          return booking;
        }
        return patchBookingRow(booking, event);
      });
    };

    const connect = (bookingId: string, attempt = 0) => {
      if (!alive) {
        return;
      }
      const url = `${WS_URL}/ws/bookings/${bookingId}/?token=${accessToken}`;
      const socket = new WebSocket(url);
      sockets.set(bookingId, socket);

      socket.onmessage = (rawEvent) => {
        try {
          const payload = JSON.parse(rawEvent.data) as BookingProgressEvent;
          if (payload.type === "progress_update") {
            applyProgressUpdate(payload);
          }
        } catch {
          // Ignore malformed payloads
        }
      };

      socket.onclose = () => {
        if (!alive) {
          return;
        }
        const nextAttempt = attempt + 1;
        const waitMs = Math.min(1000 * nextAttempt, 5000);
        const timer = setTimeout(() => connect(bookingId, nextAttempt), waitMs);
        reconnectTimers.set(bookingId, timer);
      };
    };

    stableBookingIds.forEach((bookingId) => connect(bookingId));

    return () => {
      alive = false;
      reconnectTimers.forEach((timer) => clearTimeout(timer));
      sockets.forEach((socket) => socket.close());
    };
  }, [accessToken, bookingIdsKey, queryClient, stableBookingIds]);
}
