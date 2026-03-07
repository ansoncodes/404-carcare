import api from "@/services/api";
import type { Service, ServiceCategory, ServiceCategoryPayload, ServicePayload } from "@/types/service.types";

export async function listServiceCategories(): Promise<ServiceCategory[]> {
  const { data } = await api.get<ServiceCategory[]>("/service-categories/");
  return data;
}

export async function getServiceCategory(id: string): Promise<ServiceCategory> {
  const { data } = await api.get<ServiceCategory>(`/service-categories/${id}/`);
  return data;
}

export async function createServiceCategory(payload: ServiceCategoryPayload): Promise<ServiceCategory> {
  const { data } = await api.post<ServiceCategory>("/service-categories/", payload);
  return data;
}

export async function updateServiceCategory(id: string, payload: Partial<ServiceCategoryPayload>): Promise<ServiceCategory> {
  const { data } = await api.patch<ServiceCategory>(`/service-categories/${id}/`, payload);
  return data;
}

export async function deleteServiceCategory(id: string): Promise<void> {
  await api.delete(`/service-categories/${id}/`);
}

export async function listServices(params?: { category?: string }): Promise<Service[]> {
  const { data } = await api.get<Service[]>("/services/", { params });
  return data;
}

export async function getService(id: string): Promise<Service> {
  const { data } = await api.get<Service>(`/services/${id}/`);
  return data;
}

export async function createService(payload: ServicePayload): Promise<Service> {
  const { data } = await api.post<Service>("/services/", payload);
  return data;
}

export async function updateService(id: string, payload: Partial<ServicePayload>): Promise<Service> {
  const { data } = await api.patch<Service>(`/services/${id}/`, payload);
  return data;
}

export async function deleteService(id: string): Promise<void> {
  await api.delete(`/services/${id}/`);
}