import type { ReactNode } from "react";
import { Navbar } from "@/components/shared/Navbar";
import { Sidebar } from "@/components/shared/Sidebar";
import { ProtectedRoute } from "@/components/shared/ProtectedRoute";

interface AdminLayoutProps {
  children: ReactNode;
}

const items = [
  { label: "Dashboard", href: "/admin/dashboard" },
  { label: "Airports", href: "/admin/airports" },
  { label: "Services", href: "/admin/services" },
  { label: "Slots", href: "/admin/slots" },
  { label: "Parking", href: "/admin/parking" },
  { label: "Users", href: "/admin/users" },
  { label: "Bookings", href: "/admin/bookings" },
  { label: "Payments", href: "/admin/payments" },
];

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <ProtectedRoute roles={["admin"]}>
      <div className="min-h-screen bg-[var(--bg-base)]">
        <Navbar />
        <div className="flex">
          <Sidebar title="Admin" items={items} />
          <main className="w-full p-6">{children}</main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
