"use client";

import type { ReactNode } from "react";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { UserRole } from "@/types/auth.types";
import { useAuthStore } from "@/store/authStore";

interface ProtectedRouteProps {
  roles: UserRole[];
  children: ReactNode;
}

export function ProtectedRoute({ roles, children }: ProtectedRouteProps) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const hydrated = useAuthStore((state) => state.hydrated);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    if (!user) {
      router.replace("/login");
      return;
    }
    if (!roles.includes(user.role)) {
      router.replace("/");
    }
  }, [hydrated, roles, router, user]);

  if (!hydrated || !user || !roles.includes(user.role)) {
    return <div className="min-h-screen animate-pulseSoft bg-[var(--bg-base)]" />;
  }

  return <>{children}</>;
}
