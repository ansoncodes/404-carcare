"use client";

import type { ReactNode } from "react";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { ToastHost, type ToastItem } from "@/components/ui/toast";

type ToastType = "info" | "success" | "error";

interface ToastContextValue {
  push: (title: string, message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

interface Props {
  children: ReactNode;
}

export function ToastProvider({ children }: Props) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const push = useCallback((title: string, message: string, type: ToastType = "info") => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts((prev) => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 3000);
  }, []);

  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastHost items={toasts} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return ctx;
}
