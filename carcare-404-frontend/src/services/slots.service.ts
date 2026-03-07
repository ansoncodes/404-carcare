import api from "@/services/api";
import type {
  CheckAvailabilityResponse,
  DayAvailabilityResponse,
} from "@/types/booking.types";

export async function getDayAvailability(
  date: string,
  serviceIds: string[]
): Promise<DayAvailabilityResponse> {
  const { data } = await api.get<DayAvailabilityResponse>(
    "/bookings/day-availability/",
    {
      params: {
        date,
        service_ids: serviceIds.join(","),
      },
    }
  );
  return data;
}

export async function checkAvailability(
  scheduledStart: string,
  serviceIds: string[]
): Promise<CheckAvailabilityResponse> {
  const { data } = await api.post<CheckAvailabilityResponse>(
    "/bookings/check-availability/",
    {
      scheduled_start: scheduledStart,
      service_ids: serviceIds,
    }
  );
  return data;
}