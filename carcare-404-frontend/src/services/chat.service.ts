import api from "@/services/api";
import type { ChatRoom, Message } from "@/types/chat.types";

export async function listChatRooms(): Promise<ChatRoom[]> {
  const { data } = await api.get<ChatRoom[]>("/chat-rooms/");
  return data;
}

export async function getChatRoom(id: string): Promise<ChatRoom> {
  const { data } = await api.get<ChatRoom>(`/chat-rooms/${id}/`);
  return data;
}

export async function assignChatRoomStaff(roomId: string, staff_id: string): Promise<ChatRoom> {
  const { data } = await api.post<ChatRoom>(`/chat-rooms/${roomId}/assign-staff/`, { staff_id });
  return data;
}

export async function listMessages(room?: string): Promise<Message[]> {
  const { data } = await api.get<Message[]>("/messages/", {
    params: room ? { room } : undefined,
  });
  return data;
}

export async function sendMessage(payload: {
  room: string;
  content: string;
  message_type?: "text" | "image" | "file" | "system";
}): Promise<Message> {
  const { data } = await api.post<Message>("/messages/", payload);
  return data;
}

export async function markMessagesRead(room_id: string): Promise<{ marked_read: number }> {
  const { data } = await api.post<{ marked_read: number }>("/messages/mark-read/", { room_id });
  return data;
}
