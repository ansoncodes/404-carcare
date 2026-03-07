"use client";

import { useMemo } from "react";
import { useAuthStore } from "@/store/authStore";

export function useAuth() {
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  return useMemo(
    () => ({
      user,
      accessToken,
      isAuthenticated: Boolean(user && accessToken),
      isCustomer: user?.role === "customer",
      isSupervisor: user?.role === "supervisor",
      isAdmin: user?.role === "admin",
      logout: clearAuth,
    }),
    [accessToken, clearAuth, user]
  );
}
