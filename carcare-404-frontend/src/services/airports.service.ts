import api from "@/services/api";
import type { Airport } from "@/types/airport.types";

export type AirportPayload = Pick<Airport, "name" | "code" | "city"> & {
  address?: string | null;
  timezone?: string;
  is_active?: boolean;
};

export async function listAirports(): Promise<Airport[]> {
  const { data } = await api.get<Airport[]>("/airports/");
  return data;
}

export async function getAirport(id: string): Promise<Airport> {
  const { data } = await api.get<Airport>(`/airports/${id}/`);
  return data;
}

export async function createAirport(payload: AirportPayload): Promise<Airport> {
  const { data } = await api.post<Airport>("/airports/", payload);
  return data;
}

export async function updateAirport(id: string, payload: Partial<AirportPayload>): Promise<Airport> {
  const { data } = await api.patch<Airport>(`/airports/${id}/`, payload);
  return data;
}

export async function deleteAirport(id: string): Promise<void> {
  await api.delete(`/airports/${id}/`);
}
