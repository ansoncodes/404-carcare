"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getDashboardSummary } from "@/services/analytics.service";
import { useWebSocket } from "@/hooks/useWebSocket";
import type { DashboardSummary } from "@/types/analytics.types";

interface AnalyticsWsEvent {
  type?: string;
  total_bookings?: number;
  today_revenue?: string | number;
  total_revenue?: string | number;
}

export function useAnalytics() {
  const query = useQuery({
    queryKey: ["analytics-summary"],
    queryFn: getDashboardSummary,
  });
  const [liveData, setLiveData] = useState<DashboardSummary | undefined>(undefined);

  useEffect(() => {
    if (query.data) {
      setLiveData(query.data);
    }
  }, [query.data]);

  const socket = useWebSocket({
    path: "/ws/analytics/dashboard/",
    onMessage: (payload) => {
      const event = payload as AnalyticsWsEvent;
      if (event.type !== "dashboard_update") {
        return;
      }
      setLiveData((prev) => {
        if (!prev) {
          return prev;
        }
        return {
          ...prev,
          bookings: {
            ...prev.bookings,
            total: typeof event.total_bookings === "number" ? event.total_bookings : prev.bookings.total,
          },
          revenue: {
            ...prev.revenue,
            today_revenue: event.today_revenue ?? prev.revenue.today_revenue,
            total_revenue: event.total_revenue ?? prev.revenue.total_revenue,
          },
        };
      });
    },
    enabled: true,
  });

  return { ...query, data: liveData, connected: socket.connected };
}