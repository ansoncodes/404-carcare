import type { WorkStage } from "@/types/operations.types";

interface WorkStageListProps {
  stages: WorkStage[];
}

function getStageStyles(status: WorkStage["status"]) {
  if (status === "completed" || status === "skipped") {
    return {
      icon: "C",
      iconClass: "bg-emerald-400/15 text-emerald-400",
      textClass: "text-emerald-300",
    };
  }
  if (status === "in_progress") {
    return {
      icon: "A",
      iconClass: "bg-cyan-400/15 text-cyan-300 ring-2 ring-cyan-400/30",
      textClass: "text-cyan-200",
    };
  }
  return {
    icon: "P",
    iconClass: "bg-slate-700/40 text-slate-500",
    textClass: "text-[var(--text-muted)]",
  };
}

export function WorkStageList({ stages }: WorkStageListProps) {
  const sorted = [...stages].sort((a, b) => a.stage_order - b.stage_order);

  if (sorted.length === 0) {
    return (
      <div className="panel p-4">
        <p className="text-sm text-[var(--text-secondary)]">No timeline stages available for this job.</p>
      </div>
    );
  }

  return (
    <div className="panel p-5">
      <p className="mb-4 text-xs font-semibold uppercase tracking-[0.05em] text-[var(--text-muted)]">Service Timeline</p>
      <div className="space-y-0">
        {sorted.map((stage, idx) => {
          const styles = getStageStyles(stage.status);
          const isLast = idx === sorted.length - 1;
          return (
            <div key={stage.id} className="flex items-stretch gap-3">
              <div className="flex flex-col items-center">
                <div className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${styles.iconClass}`}>
                  {styles.icon}
                </div>
                {!isLast ? <div className="min-h-[16px] w-[2px] flex-1 bg-slate-700/50" /> : null}
              </div>
              <div className="w-full pb-3">
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-sm font-medium ${styles.textClass}`}>{stage.stage_name.replaceAll("_", " ")}</p>
                  <p className="text-xs text-[var(--text-muted)]">{stage.estimated_duration_minutes} min</p>
                </div>
                <p className="mt-1 text-xs capitalize text-[var(--text-secondary)]">{stage.status.replaceAll("_", " ")}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
