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
    <aside className="sticky top-[57px] hidden h-[calc(100vh-57px)] w-64 shrink-0 border-r border-[var(--bg-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0))] px-4 py-5 md:block">
      <h2 className="mb-4 px-2 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">{title}</h2>
      <nav className="space-y-1.5">
        {items.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "group flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all duration-150",
                active
                  ? "border-[var(--accent)] bg-[var(--accent-glow)] text-[var(--text-primary)] shadow-[inset_2px_0_0_var(--accent)]"
                  : "border-transparent text-[var(--text-secondary)] hover:border-[var(--bg-border)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
              )}
            >
              <span
                className={clsx(
                  "size-1.5 rounded-full transition",
                  active ? "bg-[var(--accent)]" : "bg-slate-600 group-hover:bg-slate-400"
                )}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
