"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listMessages } from "@/services/chat.service";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useAuthStore } from "@/store/authStore";
import type { ChatWsEvent, Message } from "@/types/chat.types";

export function useChat(roomId: string) {
  const user = useAuthStore((state) => state.user);
  const [liveMessages, setLiveMessages] = useState<Message[]>([]);
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["messages", roomId],
    queryFn: () => listMessages(roomId),
    enabled: Boolean(roomId),
  });

  useEffect(() => {
    if (data) {
      setLiveMessages(data);
    }
  }, [data]);

  const socket = useWebSocket({
    path: `/ws/chat/${roomId}/`,
    enabled: Boolean(roomId),
    onMessage: (payload) => {
      const event = payload as ChatWsEvent;
      if (event.type !== "chat_message" || !event.message_id || !event.sender_id) {
        return;
      }
      const newMessage: Message = {
        id: event.message_id,
        room: roomId,
        sender: {
          id: event.sender_id,
          full_name: event.sender_name ?? "Unknown",
          email: "",
          role: (event.sender_role as "customer" | "supervisor" | "admin") ?? "customer",
        },
        message_type: event.message_type ?? "text",
        content: event.content ?? "",
        file_url: null,
        is_read: event.sender_id === user?.id,
        read_at: event.sender_id === user?.id ? new Date().toISOString() : null,
        created_at: event.created_at ?? new Date().toISOString(),
      };

      setLiveMessages((prev) => {
        if (prev.some((message) => message.id === newMessage.id)) {
          return prev;
        }
        return [...prev, newMessage];
      });
    },
  });

  return { messages: liveMessages, isLoading, refetch, connected: socket.connected, send: socket.send };
}