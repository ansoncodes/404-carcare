import type { ReactNode } from "react";
import Image from "next/image";

interface AuthLayoutProps {
  children: ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <main className="min-h-screen grid lg:grid-cols-2 bg-[var(--bg-base)]">
      {/* Left side: hero image with 404 branding */}
      <div className="relative hidden lg:flex flex-col justify-between p-12 overflow-hidden bg-[#020617] border-r border-slate-800/50">
        {/* Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-40 transition-transform duration-10000 hover:scale-105"
          style={{ backgroundImage: "url('/images/supervisor-hero.jpeg')" }}
        />
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-[#020617]/80 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-[linear-gradient(180deg,transparent,rgba(7,11,20,0.95))]" />
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#020617] to-transparent" />

        {/* Top Logo */}
        <div className="relative z-10 flex items-center gap-3 text-white">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-[#0b1422] border border-slate-800/50 font-black text-xl text-white shadow-xl">
            404
          </div>
          <span className="text-xl font-bold tracking-tight">CarCare</span>
        </div>

        {/* Bottom Text */}
        <div className="relative z-10 space-y-6 pb-8">
          <h1 className="text-6xl font-black text-white tracking-tighter sm:text-8xl flex flex-col gap-2">
            <span className="text-cyan-400 drop-shadow-lg">404</span>
            <span className="text-slate-100">CarCare.</span>
          </h1>
          <p className="text-lg text-slate-300 max-w-md font-medium leading-relaxed">
            The premium automotive service platform for managing operations, scheduling, and live tracking across airport branches.
          </p>
        </div>
      </div>

      {/* Right side: Login/Register form */}
      <div className="flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-24 xl:px-32 relative">
        {/* Ambient background glow for the right panel */}
        <div className="absolute top-0 right-0 -z-10 h-full w-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-cyan-900/10 via-[var(--bg-base)] to-[var(--bg-base)]" />

        <div className="mx-auto w-full max-w-sm lg:max-w-md space-y-8">
          {/* Mobile logo only */}
          <div className="flex items-center gap-3 lg:hidden mb-8">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-[#0b1422] border border-slate-800/50 font-black text-xl text-white shadow-xl">
              404
            </div>
            <span className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">CarCare</span>
          </div>

          <div className="rounded-2xl border border-[var(--bg-border)] bg-[#0b1422]/70 backdrop-blur-xl p-8 sm:p-10 shadow-2xl shadow-black/50">
            {children}
          </div>
        </div>
      </div>
    </main>
  );
}
