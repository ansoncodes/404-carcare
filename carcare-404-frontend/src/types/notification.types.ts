export interface Notification {
  id: string;
  booking: string | null;
  chat_room: string | null;
  notification_type: string;
  title: string;
  body: string;
  event_data: Record<string, unknown>;
  target_url: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface NotificationWsEvent {
  type: "unread_count" | "new_notification";
  unread_count?: number;
  notification_id?: string;
  booking_id?: string | null;
  chat_room_id?: string | null;
  notification_type?: string;
  title?: string;
  body?: string;
  event_data?: Record<string, unknown>;
  target_url?: string;
  created_at?: string;
}
