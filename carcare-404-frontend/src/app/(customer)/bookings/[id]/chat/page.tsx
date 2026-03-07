"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/PageHeader";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { EmptyState } from "@/components/shared/EmptyState";
import { listChatRooms } from "@/services/chat.service";

export default function BookingChatPage() {
  const params = useParams<{ id: string }>();
  const bookingId = params.id;
  const roomsQuery = useQuery({ queryKey: ["chat-rooms"], queryFn: listChatRooms });

  const roomId = useMemo(() => {
    const rooms = roomsQuery.data ?? [];
    const room = rooms.find((item) => {
      if (typeof item.booking === "string") {
        return item.booking === bookingId;
      }
      return item.booking.id === bookingId;
    });
    return room?.id;
  }, [bookingId, roomsQuery.data]);

  return (
    <section className="space-y-6">
      <PageHeader title="Booking Chat" subtitle="Talk to your assigned supervisor" />
      {roomId ? (
        <ChatWindow roomId={roomId} />
      ) : (
        <EmptyState title="Chat room not assigned" description="A supervisor will be assigned soon." />
      )}
    </section>
  );
}