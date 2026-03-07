"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { PageHeader } from "@/components/shared/PageHeader";
import { getChatRoom } from "@/services/chat.service";

export default function SupervisorChatRoomPage() {
  const params = useParams<{ roomId: string }>();
  const roomQuery = useQuery({
    queryKey: ["chat-room", params.roomId],
    queryFn: () => getChatRoom(params.roomId),
    enabled: Boolean(params.roomId),
  });

  const booking = roomQuery.data && typeof roomQuery.data.booking !== "string" ? roomQuery.data.booking : null;
  const vehicleLabel = booking
    ? `${booking.vehicle.brand ?? "Vehicle"}${booking.vehicle.model ? ` ${booking.vehicle.model}` : ""}`
    : "Vehicle";
  const plate = booking?.vehicle.plate_number ?? "-";
  const subtitle = roomQuery.data
    ? `${roomQuery.data.customer.full_name} · ${vehicleLabel} · ${plate}`
    : "Direct customer conversation";

  return (
    <section className="space-y-6 app-fade-in">
      <PageHeader title="Customer Chat" subtitle={subtitle} />
      <ChatWindow roomId={params.roomId} />
    </section>
  );
}
