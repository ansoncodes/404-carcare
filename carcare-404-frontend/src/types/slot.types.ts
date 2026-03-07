import type { Airport } from "@/types/airport.types";

export interface TimeSlot {
  id: string;
  airport: Pick<Airport, "id" | "name" | "code" | "city">;
  date: string;
  start_time: string;
  end_time: string;
  slot_duration_mins: number;
  total_capacity: number;
  booked_count: number;
  is_available: boolean;
  available_spots: number;
}

export interface TimeSlotPayload {
  airport_id: string;
  date: string;
  start_time: string;
  end_time: string;
  slot_duration_mins: number;
  total_capacity: number;
}