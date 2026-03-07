import type { Airport } from "@/types/airport.types";
import type { UserMini } from "@/types/auth.types";

export type BookingStatus = "pending" | "confirmed" | "in_progress" | "completed" | "cancelled" | "no_show";

export interface BookingVehicleMini {
  id: string;
  plate_number: string;
  brand: string | null;
  model: string | null;
  vehicle_type: string | null;
}

export interface BookingListRow {
  id: string;
  booking_reference: string;
  customer?: UserMini;
  vehicle: BookingVehicleMini;
  airport: Pick<Airport, "id" | "name" | "code" | "city">;
  status: BookingStatus;
  current_stage: string | null;
  progress_percentage: number;
  scheduled_start: string | null;
  scheduled_end: string | null;
  total_duration_minutes: number;
  created_at: string;
}

export interface BookingItem {
  id: string;
  service: {
    id: string;
    name: string;
    base_price: string;
    duration_minutes: number;
  };
  quantity: number;
  unit_price: string;
  total_price: string;
}

export interface Booking {
  id: string;
  customer: UserMini;
  vehicle: BookingVehicleMini;
  airport: Pick<Airport, "id" | "name" | "code" | "city">;
  parking_booking: string | null;
  booking_reference: string;
  status: BookingStatus;
  progress_percentage: number;
  current_stage: string | null;
  scheduled_start: string | null;
  scheduled_end: string | null;
  total_duration_minutes: number;
  estimated_completion: string | null;
  special_instructions: string | null;
  total_estimated_cost: string | null;
  total_final_cost: string | null;
  items: BookingItem[];
  created_at: string;
}

export interface BookingCreatePayload {
  vehicle_id: string;
  airport_id: string;
  scheduled_start: string;
  parking_booking_id?: string;
  special_instructions?: string;
  create_items?: { service_id: string; quantity: number }[];
}

export interface BookingItemCreatePayload {
  service_id: string;
  quantity: number;
}

/* ---- Availability types ---- */

export interface AvailabilitySlot {
  time: string;
  datetime: string;
  available: boolean;
  peak_concurrent: number;
}

export interface DayAvailabilityResponse {
  date: string;
  total_duration_minutes: number;
  slots: AvailabilitySlot[];
}

export interface CheckAvailabilityResponse {
  available: boolean;
  peak_concurrent: number;
  next_available_at: string | null;
  total_duration_minutes: number;
}
