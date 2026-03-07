"use client";

import { CheckCircle2, Clock3 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { listServices } from "@/services/services.service";
import { useBookingStore } from "@/store/bookingStore";
import { currencyINR } from "@/lib/formatters";
import { getServiceCoverImagePath } from "@/lib/service-images";

export function ServicePicker() {
  const { data } = useQuery({ queryKey: ["services"], queryFn: () => listServices() });
  const selected = useBookingStore((state) => state.serviceIds);
  const setField = useBookingStore((state) => state.setField);

  const services = data ?? [];
  const selectedServices = services.filter((service) => selected.includes(service.id));
  const selectedTotal = selectedServices.reduce((sum, service) => sum + Number(service.base_price), 0);

  const toggle = (id: string) => {
    if (selected.includes(id)) {
      setField(
        "serviceIds",
        selected.filter((item) => item !== id)
      );
      return;
    }
    setField("serviceIds", [...selected, id]);
  };

  return (
    <div className="space-y-4">
      <div className="panel p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.05em] text-[var(--text-muted)]">Selected services</p>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              {selected.length} service{selected.length === 1 ? "" : "s"} selected
            </p>
          </div>
          <p className="text-lg font-semibold text-[var(--text-primary)]">{selectedTotal > 0 ? currencyINR(selectedTotal) : "INR 0.00"}</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {services.map((service) => {
          const isSelected = selected.includes(service.id);
          const coverImage = getServiceCoverImagePath(service.name);
          return (
            <button
              key={service.id}
              className={`group panel-hover relative overflow-hidden rounded-xl border text-left transition duration-200 ${
                isSelected
                  ? "border-[var(--accent)] bg-[linear-gradient(180deg,rgba(34,211,238,0.12),rgba(34,211,238,0.03))]"
                  : "border-[var(--bg-border)] bg-[var(--bg-surface)]"
              }`}
              onClick={() => toggle(service.id)}
            >
              <div
                className="relative h-40 bg-cover bg-center bg-no-repeat transition duration-300 group-hover:scale-[1.02]"
                style={{
                  backgroundImage: `linear-gradient(to top, rgba(3, 8, 26, 0.85), rgba(3, 8, 26, 0.18)), url("${coverImage}")`,
                }}
              >
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 px-4 py-3">
                  <p className="text-base font-semibold text-white drop-shadow">{service.name}</p>
                  <CheckCircle2 className={`size-5 transition ${isSelected ? "text-[var(--accent)]" : "text-white/70"}`} />
                </div>
              </div>

              <div className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-3">
                  {service.description ? (
                    <p className="line-clamp-2 text-xs text-[var(--text-secondary)]">{service.description}</p>
                  ) : (
                    <p className="text-xs text-[var(--text-muted)]">Professional treatment for premium finish.</p>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 text-xs text-[var(--text-secondary)]">
                    <Clock3 className="size-3.5" />
                    {service.duration_minutes} min
                  </span>
                  <span className="text-sm font-semibold text-[var(--text-primary)]">{currencyINR(service.base_price)}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
