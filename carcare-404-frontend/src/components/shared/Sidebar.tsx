"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

interface SidebarItem {
  label: string;
  href: string;
}

interface SidebarProps {
  title: string;
  items: SidebarItem[];
}

export function Sidebar({ title, items }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="hidden h-screen w-60 shrink-0 border-r border-[var(--bg-border)] bg-[var(--bg-surface)] p-4 md:block">
      <h2 className="mb-6 text-xs font-semibold tracking-[0.05em] text-[var(--text-muted)]">{title}</h2>
      <nav className="space-y-1">
        {items.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "block rounded-lg border-l-2 px-3 py-2 text-sm transition duration-100",
                active
                  ? "border-l-[var(--accent)] bg-[var(--bg-elevated)] text-[var(--text-primary)]"
                  : "border-l-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
