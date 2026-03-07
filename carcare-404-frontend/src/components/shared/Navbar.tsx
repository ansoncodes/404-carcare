"use client";

import Link from "next/link";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { NotificationBell } from "@/components/shared/NotificationBell";
import { Avatar } from "@/components/ui/avatar";
import { useAuthStore } from "@/store/authStore";

export function Navbar() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const homeHref = user?.role === "admin" ? "/admin/dashboard" : user?.role === "supervisor" ? "/supervisor/dashboard" : "/dashboard";

  
  const onLogout = () => {
    clearAuth();
    router.replace("/login");
  };

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--bg-border)] bg-[var(--bg-base)]/90 px-6 py-3 backdrop-blur sm:px-8 lg:px-12">
      <div className="flex items-center justify-between">
        <Link href={homeHref} className="text-sm font-semibold tracking-[0.05em] text-[var(--text-primary)]">
          404 CARCARE
        </Link>
        <div className="flex items-center gap-3">
          <NotificationBell />
          {user ? <Avatar name={user.full_name} /> : null}
          <button className="rounded-lg p-2 text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]" onClick={onLogout}>
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
