import type { ReactNode } from "react";
interface AuthLayoutProps {
  children: ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <main className="grid min-h-screen place-items-center bg-[var(--bg-base)] p-6">
      <div className="w-full max-w-md rounded-xl border border-[var(--bg-border)] bg-[var(--bg-surface)] p-6">{children}</div>
    </main>
  );
}
