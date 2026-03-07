import clsx from "clsx";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";

export interface ToastItem {
  id: string;
  title: string;
  message: string;
  type: "info" | "success" | "error";
}

const styleByType: Record<
  ToastItem["type"],
  { frame: string; iconWrap: string; icon: typeof Info }
> = {
  info: {
    frame: "border-cyan-400/35 bg-slate-950/90",
    iconWrap: "bg-cyan-500/15 text-cyan-300",
    icon: Info,
  },
  success: {
    frame: "border-emerald-400/35 bg-slate-950/90",
    iconWrap: "bg-emerald-500/15 text-emerald-300",
    icon: CheckCircle2,
  },
  error: {
    frame: "border-rose-400/35 bg-slate-950/90",
    iconWrap: "bg-rose-500/15 text-rose-300",
    icon: AlertCircle,
  },
};

interface ToastHostProps {
  items: ToastItem[];
}

export function ToastHost({ items }: ToastHostProps) {
  return (
    <div className="fixed right-4 top-20 z-[70] flex w-[min(92vw,22rem)] flex-col gap-2">
      {items.map((item) => {
        const style = styleByType[item.type];
        const Icon = style.icon;

        return (
          <div
            key={item.id}
            className={clsx(
              "app-fade-in rounded-xl border p-3 shadow-[0_16px_40px_-22px_rgba(0,0,0,0.9)] backdrop-blur-md",
              style.frame
            )}
          >
            <div className="flex items-start gap-2.5">
              <span className={clsx("mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full", style.iconWrap)}>
                <Icon className="size-3.5" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-5 text-[var(--text-primary)]">{item.title}</p>
                {item.message ? <p className="mt-0.5 text-xs leading-5 text-[var(--text-secondary)]">{item.message}</p> : null}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
