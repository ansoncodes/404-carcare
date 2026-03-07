interface EmptyStateProps {
  title: string;
  description: string;
}

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="panel p-8 text-center">
      <p className="text-base font-medium text-[var(--text-primary)]">{title}</p>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">{description}</p>
    </div>
  );
}
