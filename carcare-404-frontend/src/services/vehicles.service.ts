import api from "@/services/api";
import type { Vehicle, VehiclePayload } from "@/types/vehicle.types";

export async function listVehicles(): Promise<Vehicle[]> {
  const { data } = await api.get<Vehicle[]>("/vehicles/");
  return data;
}

export async function createVehicle(payload: VehiclePayload): Promise<Vehicle> {
  const { data } = await api.post<Vehicle>("/vehicles/", payload);
  return data;
}
