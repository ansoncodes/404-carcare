import api from "@/services/api";
import type { JobCard, WorkStage } from "@/types/operations.types";

export type JobCardActionResponse = JobCard | { detail: string; job_card: JobCard };

export async function listJobCards(): Promise<JobCard[]> {
  const { data } = await api.get<JobCard[]>("/job-cards/");
  return data;
}

export async function getJobCard(id: string): Promise<JobCard> {
  const { data } = await api.get<JobCard>(`/job-cards/${id}/`);
  return data;
}

export async function listWorkStages(params?: { job_card?: string }): Promise<WorkStage[]> {
  const { data } = await api.get<WorkStage[]>("/work-stages/", { params });
  return data;
}

export async function updateWorkStageStatus(
  id: string,
  payload: { status: "in_progress" | "completed" | "skipped"; notes?: string }
): Promise<WorkStage> {
  const { data } = await api.patch<WorkStage>(`/work-stages/${id}/update-status/`, payload);
  return data;
}

export async function startJobCard(id: string): Promise<JobCard> {
  const { data } = await api.post<JobCard>(`/job-cards/${id}/start-service/`);
  return data;
}

export async function pauseJobCard(id: string): Promise<JobCard> {
  const { data } = await api.post<JobCard>(`/job-cards/${id}/pause-service/`);
  return data;
}

export async function nextJobCardStage(id: string): Promise<JobCardActionResponse> {
  const { data } = await api.post<JobCardActionResponse>(`/job-cards/${id}/next-stage/`);
  return data;
}

export async function completeJobCard(id: string): Promise<JobCard> {
  const { data } = await api.post<JobCard>(`/job-cards/${id}/mark-complete/`);
  return data;
}
