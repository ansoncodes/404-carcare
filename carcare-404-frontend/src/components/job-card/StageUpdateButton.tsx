"use client";

import { useMutation } from "@tanstack/react-query";
import { updateWorkStageStatus } from "@/services/operations.service";
import { Button } from "@/components/ui/button";

interface StageUpdateButtonProps {
  stageId: string;
  status: "in_progress" | "completed" | "skipped";
  onDone?: () => void;
}

export function StageUpdateButton({ stageId, status, onDone }: StageUpdateButtonProps) {
  const mutation = useMutation({
    mutationFn: () => updateWorkStageStatus(stageId, { status }),
    onSuccess: () => onDone?.(),
  });

  return (
    <Button size="sm" variant="secondary" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
      {mutation.isPending ? "Updating" : status.replace("_", " ")}
    </Button>
  );
}
