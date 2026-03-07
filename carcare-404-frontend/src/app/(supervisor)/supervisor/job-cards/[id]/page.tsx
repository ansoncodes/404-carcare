"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { JobCardDetail } from "@/components/job-card/JobCardDetail";
import { WorkStageList } from "@/components/job-card/WorkStageList";
import { PageHeader } from "@/components/shared/PageHeader";
import { completeJobCard, getJobCard, nextJobCardStage, pauseJobCard, startJobCard } from "@/services/operations.service";

type BusyAction = "start" | "next" | "pause" | "complete" | null;

export default function SupervisorJobCardDetailPage() {
  const params = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [busyAction, setBusyAction] = useState<BusyAction>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const query = useQuery({ queryKey: ["job-card", params.id], queryFn: () => getJobCard(params.id) });
  const chatHref = query.data?.chat_room_id ? `/supervisor/chat/${query.data.chat_room_id}` : "/supervisor/chat";

  const startMutation = useMutation({
    mutationFn: (jobId: string) => startJobCard(jobId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["job-cards"] });
      await queryClient.invalidateQueries({ queryKey: ["job-card", params.id] });
      await queryClient.invalidateQueries({ queryKey: ["bookings"] });
    },
  });

  const pauseMutation = useMutation({
    mutationFn: (jobId: string) => pauseJobCard(jobId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["job-cards"] });
      await queryClient.invalidateQueries({ queryKey: ["job-card", params.id] });
    },
  });

  const nextMutation = useMutation({
    mutationFn: (jobId: string) => nextJobCardStage(jobId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["job-cards"] });
      await queryClient.invalidateQueries({ queryKey: ["job-card", params.id] });
      await queryClient.invalidateQueries({ queryKey: ["bookings"] });
    },
  });

  const completeMutation = useMutation({
    mutationFn: (jobId: string) => completeJobCard(jobId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["job-cards"] });
      await queryClient.invalidateQueries({ queryKey: ["job-card", params.id] });
      await queryClient.invalidateQueries({ queryKey: ["bookings"] });
    },
  });

  const runAction = async (action: Exclude<BusyAction, null>) => {
    setErrorMessage(null);
    setBusyAction(action);
    try {
      if (action === "start") {
        await startMutation.mutateAsync(params.id);
      } else if (action === "pause") {
        await pauseMutation.mutateAsync(params.id);
      } else if (action === "next") {
        await nextMutation.mutateAsync(params.id);
      } else if (action === "complete") {
        await completeMutation.mutateAsync(params.id);
      }
    } catch (error) {
      const maybeError = error as { response?: { data?: { detail?: string } } };
      setErrorMessage(maybeError.response?.data?.detail ?? "Unable to update this job now.");
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <section className="space-y-6 app-fade-in">
      <PageHeader title="Job Detail" subtitle="Control stage progression and complete after QC" />
      {query.data ? (
        <>
          <JobCardDetail
            card={query.data}
            chatHref={chatHref}
            busyAction={busyAction}
            onStart={() => runAction("start")}
            onPause={() => runAction("pause")}
            onNext={() => runAction("next")}
            onComplete={() => runAction("complete")}
            errorMessage={errorMessage}
          />
          <WorkStageList stages={query.data.stages} />
        </>
      ) : (
        <div className="h-32 animate-pulseSoft rounded-xl bg-[var(--bg-elevated)]" />
      )}
    </section>
  );
}
