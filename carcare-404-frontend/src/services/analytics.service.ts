import api from "@/services/api";
import type { DashboardSummary, RevenueInsights } from "@/types/analytics.types";

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const { data } = await api.get<DashboardSummary>("/analytics/dashboard/");
  return data;
}

export async function getRevenueInsights(): Promise<RevenueInsights> {
  const { data } = await api.get<RevenueInsights>("/analytics/revenue-insights/");
  return data;
}
