import type { ReactNode } from "react";
import clsx from "clsx";

interface CardProps {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Card({ title, action, children, className }: CardProps) {
  return (
    <section className={clsx("panel p-5", className)}>
      {title ? (
        <header className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h3>
          {action}
        </header>
      ) : null}
      {children}
    </section>
  );
}
