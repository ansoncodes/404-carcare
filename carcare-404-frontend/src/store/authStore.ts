"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { AuthTokens, User } from "@/types/auth.types";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  hydrated: boolean;
  setAuth: (payload: { user: User; tokens: AuthTokens }) => void;
  setTokens: (tokens: AuthTokens) => void;
  setUser: (user: User) => void;
  clearAuth: () => void;
  setHydrated: (value: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      hydrated: false,
      setAuth: ({ user, tokens }) =>
        set({ user, accessToken: tokens.access, refreshToken: tokens.refresh }),
      setTokens: (tokens) => set({ accessToken: tokens.access, refreshToken: tokens.refresh }),
      setUser: (user) => set({ user }),
      clearAuth: () => set({ user: null, accessToken: null, refreshToken: null }),
      setHydrated: (value) => set({ hydrated: value }),
    }),
    {
      name: "carcare-auth",
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    }
  )
);