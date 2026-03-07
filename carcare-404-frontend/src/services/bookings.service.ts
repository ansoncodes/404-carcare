import api from "@/services/api";
import type {
  Booking,
  BookingCreatePayload,
  BookingItem,
  BookingItemCreatePayload,
  BookingListRow,
} from "@/types/booking.types";

export async function listBookings(): Promise<BookingListRow[]> {
  const { data } = await api.get<BookingListRow[]>("/bookings/");
  return data;
}

export async function getBooking(id: string): Promise<Booking> {
  const { data } = await api.get<Booking>(`/bookings/${id}/`);
  return data;
}

export async function createBooking(payload: BookingCreatePayload): Promise<Booking> {
  const { data } = await api.post<Booking>("/bookings/", payload);
  return data;
}

export async function cancelBooking(id: string): Promise<{ detail: string }> {
  const { data } = await api.post<{ detail: string }>(`/bookings/${id}/cancel/`);
  return data;
}

export async function addBookingItems(
  bookingId: string,
  payload: BookingItemCreatePayload[]
): Promise<{ detail: string }> {
  const { data } = await api.post<{ detail: string }>(`/bookings/${bookingId}/add-items/`, payload);
  return data;
}

export async function listBookingItems(bookingId: string): Promise<BookingItem[]> {
  const booking = await getBooking(bookingId);
  return booking.items;
}