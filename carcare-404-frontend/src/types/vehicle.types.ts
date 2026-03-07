import type { UserMini } from "@/types/auth.types";

export type VehicleType = "sedan" | "suv" | "hatchback" | "truck" | "van";
export type VehicleSize = "small" | "medium" | "large" | "xl";

export interface Vehicle {
  id: string;
  owner: UserMini;
  plate_number: string;
  brand: string | null;
  model: string | null;
  color: string | null;
  year: number | null;
  vehicle_type: VehicleType | null;
  vehicle_size: VehicleSize | null;
  created_at: string;
}

export interface VehiclePayload {
  plate_number: string;
  brand?: string;
  model?: string;
  color?: string;
  year?: number;
  vehicle_type?: VehicleType;
  vehicle_size?: VehicleSize;
}