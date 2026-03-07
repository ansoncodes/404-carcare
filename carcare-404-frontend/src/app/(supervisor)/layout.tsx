import type { ReactNode } from "react";
import { Navbar } from "@/components/shared/Navbar";
import { ProtectedRoute } from "@/components/shared/ProtectedRoute";

interface SupervisorLayoutProps {
  children: ReactNode;
}

export default function SupervisorLayout({ children }: SupervisorLayoutProps) {
  return (
    <ProtectedRoute roles={["supervisor"]}>
      <div className="theme-customer min-h-screen bg-[var(--bg-base)]">
        <Navbar />
        <main className="relative z-10 mx-auto max-w-7xl px-4 pb-10 pt-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </ProtectedRoute>
  );
}
