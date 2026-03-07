import clsx from "clsx";

export interface ToastItem {
  id: string;
  title: string;
  message: string;
  type: "info" | "success" | "error";
}

const borderByType: Record<ToastItem["type"], string> = {
  info: "border-l-[var(--accent)]",
  success: "border-l-[var(--success)]",
  error: "border-l-[var(--danger)]",
};

interface ToastHostProps {
  items: ToastItem[];
}

export function ToastHost({ items }: ToastHostProps) {
  return (
    <div className="fixed bottom-4 right-4 z-[60] flex w-80 flex-col gap-2">
      {items.map((item) => (
        <div
          key={item.id}
          className={clsx(
            "rounded-lg border border-[var(--bg-border)] border-l-4 bg-[var(--bg-elevated)] p-3 shadow",
            borderByType[item.type]
          )}
        >
          <p className="text-sm font-medium text-[var(--text-primary)]">{item.title}</p>
          <p className="text-xs text-[var(--text-secondary)]">{item.message}</p>
        </div>
      ))}
    </div>
  );
}
