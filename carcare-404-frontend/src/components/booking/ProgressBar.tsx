import clsx from "clsx";

interface ProgressBarProps {
  value: number;
  showValue?: boolean;
  className?: string;
}

export function ProgressBar({ value, showValue = false, className }: ProgressBarProps) {
  const safeValue = Math.max(0, Math.min(100, value));

  return (
    <div className={clsx("space-y-2", className)}>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-elevated)] ring-1 ring-inset ring-[var(--bg-border)]">
        <div
          className="h-1.5 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 shadow-[0_0_22px_rgba(56,189,248,0.5)] transition-[width] duration-[600ms] ease-in-out"
          style={{ width: `${safeValue}%` }}
        />
      </div>
      {showValue ? <p className="text-xs font-medium text-[var(--text-secondary)]">{safeValue}% complete</p> : null}
    </div>
  );
}
