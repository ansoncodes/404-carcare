import type { BookingListRow } from "@/types/booking.types";
import type { UserMini } from "@/types/auth.types";

export type JobCardStatus = "pending" | "active" | "paused" | "completed";
export type WorkStageStatus = "pending" | "in_progress" | "completed" | "skipped";

export interface JobCard {
  id: string;
  booking: string | BookingListRow;
  airport: string;
  supervisor: UserMini | null;
  job_number: string;
  status: JobCardStatus;
  started_at: string | null;
  completed_at: string | null;
  total_estimated_duration_minutes: number;
  booking_estimated_completion: string | null;
  notes: string | null;
  quality_score: number | null;
  chat_room_id: string | null;
  services: string[];
  stages: WorkStage[];
}

export interface WorkStage {
  id: string;
  job_card?: string;
  stage_name: string;
  stage_order: number;
  estimated_duration_minutes: number;
  status: WorkStageStatus;
  started_at: string | null;
  completed_at: string | null;
  notes: string | null;
}
