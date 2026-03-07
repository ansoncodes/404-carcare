import type { ReactNode } from "react";
import clsx from "clsx";

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}

export function Modal({ open, title, onClose, children, className }: ModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        className={clsx("w-full max-w-lg rounded-xl border border-[var(--bg-border)] bg-[var(--bg-surface)] p-6", className)}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">{title}</h3>
          <button className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]" onClick={onClose}>
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
