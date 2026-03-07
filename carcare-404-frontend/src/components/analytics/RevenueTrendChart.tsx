"use client";

import type { RevenueTrendPoint } from "@/types/analytics.types";
import { currencyINR } from "@/lib/formatters";

interface RevenueTrendChartProps {
  points: RevenueTrendPoint[];
}

function toNumber(value: string | number): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function buildPath(values: number[], width: number, height: number, padX: number, padY: number, maxValue: number): string {
  if (values.length === 0) return "";
  const plotWidth = width - padX * 2;
  const plotHeight = height - padY * 2;
  const stepX = values.length > 1 ? plotWidth / (values.length - 1) : 0;

  return values
    .map((value, index) => {
      const x = padX + index * stepX;
      const y = padY + (1 - value / maxValue) * plotHeight;
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");
}

export function RevenueTrendChart({ points }: RevenueTrendChartProps) {
  if (points.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-800/50 bg-[#0b1422] p-4">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Daily Revenue Trend</h3>
        <p className="mt-1 text-xs text-[var(--text-secondary)]">No revenue trend data available yet.</p>
      </div>
    );
  }

  const width = 980;
  const height = 360;
  const padX = 56;
  const padY = 32;
  const currentValues = points.map((point) => toNumber(point.current_value));
  const previousValues = points.map((point) => toNumber(point.previous_value));
  const allValues = [...currentValues, ...previousValues];
  const maxValue = Math.max(...allValues, 1);

  const currentPath = buildPath(currentValues, width, height, padX, padY, maxValue);
  const previousPath = buildPath(previousValues, width, height, padX, padY, maxValue);

  const gridLines = 5;
  const plotHeight = height - padY * 2;
  const xTicks = [0, Math.floor((points.length - 1) / 2), points.length - 1].filter((idx, i, arr) => arr.indexOf(idx) === i);
  const plotWidth = width - padX * 2;
  const stepX = points.length > 1 ? plotWidth / (points.length - 1) : 0;

  return (
    <div className="rounded-2xl border border-slate-800/50 bg-[#0b1422] p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Daily Revenue Trend</h3>
          <p className="text-xs text-[var(--text-secondary)]">Current month vs last month (same day range)</p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="inline-flex items-center gap-1 text-cyan-300">
            <span className="size-2 rounded-full bg-cyan-300" />
            Current Month
          </span>
          <span className="inline-flex items-center gap-1 text-fuchsia-300">
            <span className="size-2 rounded-full bg-fuchsia-300" />
            Last Month
          </span>
        </div>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="h-[300px] w-full">
        <defs>
          <linearGradient id="currentFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(34,211,238,0.35)" />
            <stop offset="100%" stopColor="rgba(34,211,238,0)" />
          </linearGradient>
        </defs>

        {[...Array(gridLines + 1)].map((_, idx) => {
          const y = padY + (plotHeight / gridLines) * idx;
          const value = maxValue - (maxValue / gridLines) * idx;
          return (
            <g key={`grid-${idx}`}>
              <line x1={padX} y1={y} x2={width - padX} y2={y} stroke="rgba(148,163,184,0.16)" strokeWidth="1" />
              <text x={padX - 8} y={y + 4} textAnchor="end" className="fill-slate-400 text-[10px]">
                {currencyINR(value)}
              </text>
            </g>
          );
        })}

        {currentPath ? (
          <path
            d={`${currentPath} L ${padX + stepX * (currentValues.length - 1)} ${height - padY} L ${padX} ${height - padY} Z`}
            fill="url(#currentFill)"
          />
        ) : null}

        {previousPath ? (
          <path d={previousPath} fill="none" stroke="rgba(217,70,239,0.9)" strokeWidth="2.5" strokeLinecap="round" />
        ) : null}
        {currentPath ? (
          <path d={currentPath} fill="none" stroke="rgba(34,211,238,1)" strokeWidth="3" strokeLinecap="round" />
        ) : null}

        {xTicks.map((idx) => {
          const x = padX + stepX * idx;
          const point = points[idx];
          return (
            <text key={`x-${idx}`} x={x} y={height - 8} textAnchor="middle" className="fill-slate-400 text-[10px]">
              Day {point?.day ?? idx + 1}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
