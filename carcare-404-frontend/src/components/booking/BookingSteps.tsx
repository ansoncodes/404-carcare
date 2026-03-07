import clsx from "clsx";

interface BookingStepsProps {
  current: number;
}

const labels = ["Vehicle", "Airport", "Services", "Slot", "Parking", "Confirm"];

export function BookingSteps({ current }: BookingStepsProps) {
  return (
    <div className="panel p-3">
      <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
        {labels.map((label, index) => {
          const step = index + 1;
          const active = step === current;
          const complete = step < current;

          return (
            <li
              key={label}
              className={clsx(
                "flex items-center gap-3 rounded-lg border px-3 py-2.5 transition duration-150",
                complete && "border-[var(--accent)]/35 bg-[var(--accent)]/10 text-[var(--text-primary)]",
                active && "border-[var(--accent)] bg-[var(--bg-elevated)] text-[var(--text-primary)]",
                !active && !complete && "border-[var(--bg-border)] bg-[var(--bg-surface)] text-[var(--text-muted)]"
              )}
            >
              <span
                className={clsx(
                  "inline-flex size-6 items-center justify-center rounded-full border text-[11px] font-semibold",
                  complete && "border-[var(--accent)]/60 bg-[var(--accent)]/20 text-[var(--accent)]",
                  active && "border-[var(--accent)] text-[var(--accent)]",
                  !active && !complete && "border-[var(--bg-border)] text-[var(--text-muted)]"
                )}
              >
                {step}
              </span>
              <span className="text-xs font-semibold tracking-wide">{label}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
