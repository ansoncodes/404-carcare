"use client";

import { useQuery } from "@tanstack/react-query";
import { currencyINR } from "@/lib/formatters";
import { getServiceCoverImagePath } from "@/lib/service-images";
import { listServices } from "@/services/services.service";

export default function CustomerServicesCataloguePage() {
  const query = useQuery({ queryKey: ["services"], queryFn: () => listServices() });
  const services = query.data ?? [];

  if (query.isLoading) {
    return (
      <section className="grid gap-4 app-fade-in sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-64 animate-pulseSoft rounded-xl bg-[var(--bg-elevated)]" />
        ))}
      </section>
    );
  }

  return (
    <section className="grid gap-4 app-fade-in sm:grid-cols-2 lg:grid-cols-3">
      {services.map((service) => (
        <article key={service.id} className="overflow-hidden rounded-xl border border-slate-800/50 bg-[#0b1422]">
          <div
            className="h-44 bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: `linear-gradient(to top, rgba(3, 8, 26, 0.58), rgba(3, 8, 26, 0.12)), url("${getServiceCoverImagePath(
                service.name
              )}")`,
            }}
          />
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <p className="text-sm font-semibold text-[var(--text-primary)]">{service.name}</p>
            <p className="text-sm font-semibold text-cyan-300">{currencyINR(service.base_price)}</p>
          </div>
        </article>
      ))}
    </section>
  );
}
