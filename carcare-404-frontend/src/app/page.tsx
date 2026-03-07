"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";

export default function HomePage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    if (!user) {
      router.replace("/login");
      return;
    }

    if (user.role === "customer") {
      router.replace("/dashboard");
      return;
    }

    if (user.role === "supervisor") {
      router.replace("/supervisor/dashboard");
      return;
    }

    router.replace("/admin/dashboard");
  }, [router, user]);

  return <div className="min-h-screen animate-pulseSoft bg-[var(--bg-base)]" />;
}
