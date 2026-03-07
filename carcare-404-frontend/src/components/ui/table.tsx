import type { ReactNode } from "react";
import clsx from "clsx";

interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
}

interface DataTableProps<T> {
  columns: Array<Column<T>>;
  rows: T[];
  rowKey: (row: T) => string;
  className?: string;
}

export function DataTable<T>({ columns, rows, rowKey, className }: DataTableProps<T>) {
  return (
    <div className={clsx("overflow-hidden rounded-xl border border-[var(--bg-border)]", className)}>
      <table className="min-w-full bg-[var(--bg-surface)] text-sm">
        <thead>
          <tr className="border-b border-[var(--bg-border)] bg-[var(--bg-elevated)] text-left text-xs uppercase tracking-[0.05em] text-[var(--text-muted)]">
            {columns.map((column) => (
              <th key={column.key} className="px-4 py-3 font-medium">
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)} className="h-12 border-b border-[var(--bg-border)] hover:bg-[var(--bg-elevated)]">
              {columns.map((column) => (
                <td key={column.key} className="px-4 py-3 text-[var(--text-secondary)]">
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
