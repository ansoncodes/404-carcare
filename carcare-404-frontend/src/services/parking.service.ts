import api from "@/services/api";
import type { ParkingBooking, ParkingBookingCreatePayload, ParkingSlot } from "@/types/parking.types";

export type ParkingSlotPayload = {
  airport_id: string;
  slot_code: string;
  zone_label: string;
  floor: number;
  status?: "available" | "occupied" | "reserved" | "maintenance";
  price_per_hour?: string | number;
};

export async function listParkingSlots(params?: { airport?: string }): Promise<ParkingSlot[]> {
  const { data } = await api.get<ParkingSlot[]>("/parking-slots/", { params });
  return data;
}

export async function createParkingSlot(payload: ParkingSlotPayload): Promise<ParkingSlot> {
  const { data } = await api.post<ParkingSlot>("/parking-slots/", payload);
  return data;
}

export async function updateParkingSlot(id: string, payload: Partial<ParkingSlotPayload>): Promise<ParkingSlot> {
  const { data } = await api.patch<ParkingSlot>(`/parking-slots/${id}/`, payload);
  return data;
}

export async function deleteParkingSlot(id: string): Promise<void> {
  await api.delete(`/parking-slots/${id}/`);
}

export async function listParkingBookings(): Promise<ParkingBooking[]> {
  const { data } = await api.get<ParkingBooking[]>("/parking-bookings/");
  return data;
}

export async function createParkingBooking(payload: ParkingBookingCreatePayload): Promise<ParkingBooking> {
  const { data } = await api.post<ParkingBooking>("/parking-bookings/", payload);
  return data;
}

export async function cancelParkingBooking(id: string): Promise<{ detail: string }> {
  const { data } = await api.post<{ detail: string }>(`/parking-bookings/${id}/cancel/`);
  return data;
}

export async function extendParkingBookingHours(id: string, additional_hours: number): Promise<ParkingBooking> {
  const { data } = await api.post<ParkingBooking>(`/parking-bookings/${id}/extend-hours/`, { additional_hours });
  return data;
}

export async function checkoutParkingBooking(
  id: string
): Promise<{ detail: string; overstay_fee: string; parking_booking: ParkingBooking }> {
  const { data } = await api.post<{ detail: string; overstay_fee: string; parking_booking: ParkingBooking }>(
    `/parking-bookings/${id}/checkout/`
  );
  return data;
}
