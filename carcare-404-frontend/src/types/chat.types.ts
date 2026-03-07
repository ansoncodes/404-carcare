import type { BookingListRow } from "@/types/booking.types";
import type { UserMini } from "@/types/auth.types";

export interface ChatRoom {
  id: string;
  booking: string | BookingListRow;
  customer: UserMini;
  assigned_staff: UserMini | null;
  airport?: {
    id: string;
    name: string;
    code: string;
    city: string;
  } | null;
  status: "active" | "closed" | "archived";
  last_message_at: string | null;
}

export interface Message {
  id: string;
  room: string;
  sender: UserMini;
  message_type: "text" | "image" | "file" | "system";
  content: string | null;
  file_url: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface ChatWsEvent {
  type: "chat_message" | "error";
  message_id?: string;
  sender_id?: string;
  sender_name?: string;
  sender_role?: string;
  content?: string;
  message_type?: "text" | "image" | "file" | "system";
  created_at?: string;
  detail?: string;
}
