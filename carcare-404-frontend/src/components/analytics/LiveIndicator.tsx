interface LiveIndicatorProps {
  active: boolean;
}

export function LiveIndicator({ active }: LiveIndicatorProps) {
  return (
    <span className="inline-flex items-center gap-2 text-xs text-[var(--text-secondary)]">
      <span className={`size-2 rounded-full ${active ? "animate-pulseSoft bg-[var(--success)]" : "bg-[var(--danger)]"}`} />
      {active ? "Live" : "Offline"}
    </span>
  );
}
