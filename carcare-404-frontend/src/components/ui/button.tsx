import { forwardRef, type ButtonHTMLAttributes } from "react";
import clsx from "clsx";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "border border-transparent bg-[linear-gradient(180deg,var(--accent)_0%,var(--accent-hover)_100%)] text-white shadow-[0_12px_28px_-18px_var(--accent)] hover:brightness-110",
  secondary:
    "border border-[var(--bg-border)] bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:border-[var(--accent)] hover:bg-[#1f2d4a]",
  ghost: "text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-11 px-5 text-sm",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "primary", size = "md", ...props },
  ref
) {
  return (
    <button
      ref={ref}
      className={clsx(
        "inline-flex items-center justify-center rounded-lg font-medium transition duration-150 focus:outline-none focus:shadow-focus active:translate-y-px disabled:pointer-events-none disabled:opacity-60",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    />
  );
});
