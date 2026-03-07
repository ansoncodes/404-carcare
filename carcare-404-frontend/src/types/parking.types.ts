import type { UserMini } from "@/types/auth.types";
import type { BookingVehicleMini } from "@/types/booking.types";
import type { Airport } from "@/types/airport.types";

export type ParkingSlotStatus = "available" | "occupied" | "reserved" | "maintenance";
export type ParkingBookingStatus = "pending" | "active" | "completed" | "cancelled";

export interface ParkingSlot {
  id: string;
  airport: Pick<Airport, "id" | "name" | "code" | "city">;
  slot_code: string;
  zone_label: string;
  floor: number;
  status: ParkingSlotStatus;
  price_per_hour: string;
  is_available: boolean;
}

export interface ParkingBooking {
  id: string;
  customer: UserMini;
  parking_slot: ParkingSlot;
  vehicle: BookingVehicleMini;
  booking_reference: string;
  check_in_time: string | null;
  check_out_time: string | null;
  expected_checkout: string | null;
  total_cost: string | null;
  status: ParkingBookingStatus;
  notes: string | null;
}

export interface ParkingBookingCreatePayload {
  parking_slot_id: string;
  vehicle_id: string;
  initial_hours?: number;
  check_in_time?: string;
  expected_checkout?: string;
  notes?: string;
}
