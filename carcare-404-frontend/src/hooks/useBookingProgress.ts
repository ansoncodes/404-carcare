"use client";

import { useState } from "react";
import { useWebSocket } from "@/hooks/useWebSocket";

interface ProgressEvent {
  booking_id: string;
  progress_percentage: number;
  current_stage: string;
}

export function useBookingProgress(bookingId: string, initialProgress: number, initialStage: string | null) {
  const [progress, setProgress] = useState(initialProgress);
  const [stage, setStage] = useState<string | null>(initialStage);

  useWebSocket({
    path: `/ws/bookings/${bookingId}/`,
    onMessage: (payload) => {
      const event = payload as Partial<ProgressEvent>;
      if (typeof event.progress_percentage === "number") {
        setProgress(event.progress_percentage);
      }
      if (typeof event.current_stage === "string") {
        setStage(event.current_stage);
      }
    },
    enabled: Boolean(bookingId),
  });

  return { progress, stage };
}
