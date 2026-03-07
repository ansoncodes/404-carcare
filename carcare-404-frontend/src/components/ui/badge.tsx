import clsx from "clsx";

const statusColorMap: Record<string, string> = {
  pending: "border-amber-400/30 bg-amber-400/15 text-amber-300",
  confirmed: "border-blue-400/30 bg-blue-400/15 text-blue-300",
  in_progress: "border-cyan-400/35 bg-cyan-400/15 text-cyan-200",
  completed: "border-emerald-400/30 bg-emerald-400/15 text-emerald-300",
  cancelled: "border-red-400/30 bg-red-400/15 text-red-300",
  no_show: "border-slate-400/30 bg-slate-400/15 text-slate-300",
  active: "border-cyan-400/35 bg-cyan-400/15 text-cyan-200",
  paused: "border-amber-400/30 bg-amber-400/15 text-amber-300",
};

interface BadgeProps {
  status: string;
  pulse?: boolean;
}

export function Badge({ status, pulse = false }: BadgeProps) {
  const color = statusColorMap[status] ?? "border-[var(--bg-border)] bg-[var(--bg-elevated)] text-[var(--text-secondary)]";
  const label = status.replaceAll("_", " ");

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-semibold capitalize tracking-wide",
        color
      )}
    >
      <span className={clsx("size-2 rounded-full bg-current", pulse ? "animate-pulseSoft" : "")} />
      {label}
    </span>
  );
}
