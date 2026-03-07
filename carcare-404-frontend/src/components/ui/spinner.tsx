import clsx from "clsx";

interface SpinnerProps {
  className?: string;
}

export function Spinner({ className }: SpinnerProps) {
  return (
    <span
      className={clsx(
        "inline-block size-4 animate-spin rounded-full border-2 border-[var(--text-muted)] border-t-[var(--accent)]",
        className
      )}
    />
  );
}
