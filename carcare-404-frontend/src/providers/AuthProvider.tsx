"use client";

import type { ReactNode } from "react";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getProfile } from "@/services/auth.service";
import { useAuthStore } from "@/store/authStore";

interface Props {
  children: ReactNode;
}

export function AuthProvider({ children }: Props) {
  const access = useAuthStore((state) => state.accessToken);
  const setUser = useAuthStore((state) => state.setUser);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const hydrated = useAuthStore((state) => state.hydrated);

  const profileQuery = useQuery({
    queryKey: ["profile"],
    queryFn: getProfile,
    enabled: Boolean(access),
    retry: false,
  });

  useEffect(() => {
    if (profileQuery.data) {
      setUser(profileQuery.data);
    }
    if (profileQuery.isError) {
      clearAuth();
    }
  }, [clearAuth, profileQuery.data, profileQuery.isError, setUser]);

  if (!hydrated) {
    return <div className="min-h-screen animate-pulseSoft bg-[var(--bg-base)]" />;
  }

  return <>{children}</>;
}
