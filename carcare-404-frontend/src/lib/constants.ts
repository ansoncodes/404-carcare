export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";
export const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8000";

export const ROLES = {
  CUSTOMER: "customer",
  SUPERVISOR: "supervisor",
  ADMIN: "admin",
} as const;

export const STAGE_LABELS: Record<string, string> = {
  received: "Received",
  pre_inspection: "Pre Inspection",
  washing: "Washing",
  drying: "Drying",
  detailing: "Detailing",
  quality_check: "Quality Check",
  ready: "Ready",
};

export const STAGE_PROGRESS: Record<string, number> = {
  received: 10,
  pre_inspection: 20,
  washing: 40,
  drying: 55,
  detailing: 70,
  quality_check: 90,
  ready: 100,
};
