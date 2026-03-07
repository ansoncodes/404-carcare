import { forwardRef, type InputHTMLAttributes } from "react";
import clsx from "clsx";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, label, error, id, ...props },
  ref
) {
  return (
    <label className="block space-y-1.5">
      {label ? <span className="text-xs text-[var(--text-secondary)]">{label}</span> : null}
      <input
        ref={ref}
        id={id}
        className={clsx(
          "h-10 w-full rounded-lg border border-[var(--bg-border)] bg-[var(--bg-elevated)] px-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:shadow-focus",
          className
        )}
        {...props}
      />
      {error ? <span className="text-xs text-[var(--danger)]">{error}</span> : null}
    </label>
  );
});
