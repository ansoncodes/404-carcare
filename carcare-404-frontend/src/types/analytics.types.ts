export interface BookingStats {
  total: number;
  pending: number;
  confirmed: number;
  in_progress: number;
  completed: number;
  cancelled: number;
}

export interface RevenueStats {
  total_revenue: string | number;
  today_revenue: string | number;
  pending_revenue: string | number;
  yesterday_revenue: string | number;
  today_change_amount: string | number;
  today_change_percent: number;
  today_trend: "up" | "down" | "flat";
  month_revenue: string | number;
  last_month_revenue: string | number;
  month_change_amount: string | number;
  month_change_percent: number;
  month_trend: "up" | "down" | "flat";
  cancelled_deduction_today: string | number;
  cancelled_deduction_month: string | number;
}

export interface RankedAirport {
  airport_id: string;
  airport_name: string;
  airport_code: string;
  total_bookings: number;
  total_revenue: string | number;
  rank: number;
}

export interface DashboardSummary {
  bookings: BookingStats;
  revenue: RevenueStats;
  total_customers: number;
  total_supervisors: number;
  best_airport: RankedAirport | null;
  worst_airport: RankedAirport | null;
  airports_ranked: RankedAirport[];
}

export interface RevenueTrendPoint {
  day: number;
  current_date: string;
  previous_date: string | null;
  current_value: string | number;
  previous_value: string | number;
}

export interface RevenueInsights {
  metrics: RevenueStats;
  trend_points: RevenueTrendPoint[];
}
