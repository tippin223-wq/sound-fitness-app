"use client";

import { useState } from "react";

// Extracted from the member dashboard's floating snapshot header (where it
// overlapped the Dashboards-row cards at narrow widths) so the workout
// dashboard can host it instead. The constellation CSS
// (.dashboard-constellation-orbit / -metric and their pseudo layers) lives in
// globals.css and is route-global.

type DashboardConstellationTone = "cyan" | "amber" | "emerald" | "violet";

export type DashboardConstellationStatsMetric = {
  label: string;
  value: string;
};

const metricIconToneStyles: Record<
  DashboardConstellationTone,
  { active: string; idle: string }
> = {
  amber: {
    active:
      "border-amber-100/45 bg-amber-300/18 text-amber-100 shadow-[0_0_24px_rgba(250,204,21,0.22)]",
    idle: "border-amber-200/24 bg-amber-300/10 text-amber-100/80 shadow-[0_0_14px_rgba(250,204,21,0.12)]",
  },
  cyan: {
    active:
      "border-cyan-100/45 bg-cyan-300/18 text-cyan-100 shadow-[0_0_24px_rgba(34,211,238,0.22)]",
    idle: "border-cyan-200/24 bg-cyan-300/10 text-cyan-100/80 shadow-[0_0_14px_rgba(34,211,238,0.12)]",
  },
  emerald: {
    active:
      "border-emerald-100/42 bg-emerald-300/16 text-emerald-100 shadow-[0_0_24px_rgba(16,185,129,0.20)]",
    idle: "border-emerald-200/24 bg-emerald-300/10 text-emerald-100/80 shadow-[0_0_14px_rgba(16,185,129,0.12)]",
  },
  violet: {
    active:
      "border-violet-100/42 bg-violet-300/16 text-violet-100 shadow-[0_0_24px_rgba(139,92,246,0.20)]",
    idle: "border-violet-200/24 bg-violet-300/10 text-violet-100/80 shadow-[0_0_14px_rgba(139,92,246,0.12)]",
  },
};

const metricLineToneStyles: Record<DashboardConstellationTone, string> = {
  amber: "bg-amber-300/60",
  cyan: "bg-cyan-300/70",
  emerald: "bg-emerald-300/60",
  violet: "bg-violet-300/50",
};

const metricTones: DashboardConstellationTone[] = [
  "cyan",
  "amber",
  "emerald",
  "violet",
];

const getOrbitDistance = (
  index: number,
  activeIndex: number,
  total: number,
) => {
  const rawDistance = index - activeIndex;
  if (rawDistance > total / 2) return rawDistance - total;
  if (rawDistance < -total / 2) return rawDistance + total;
  return rawDistance;
};

const getMetricCompletion = (metric: DashboardConstellationStatsMetric) => {
  const label = metric.label.toLowerCase();
  const value = metric.value.toLowerCase();
  const numericMatch = value.match(/-?\d+(?:\.\d+)?/);
  const numericValue = numericMatch ? Number(numericMatch[0]) : null;

  if (value.includes("%") && numericValue !== null) {
    return Math.max(0, Math.min(100, Math.round(numericValue)));
  }
  if (value.includes("ready")) return 90;
  if (value.includes("active")) return 68;
  if (value.includes("manage") || value.includes("watch")) return 28;
  if (
    value.includes("choose") ||
    value.includes("start") ||
    value.includes("build") ||
    value.includes("submit")
  ) {
    return 34;
  }
  if (
    numericValue === 0 &&
    (label.includes("weekly") ||
      label.includes("workout") ||
      label.includes("set") ||
      label.includes("template") ||
      label.includes("exercise") ||
      label.includes("logged") ||
      label.includes("saved"))
  ) {
    return 18;
  }
  if (numericValue !== null && numericValue > 0) return 72;
  return 56;
};

const getMetricUrgencyTone = (completion: number) =>
  completion >= 85
    ? {
        dot: "bg-emerald-200 shadow-[0_0_14px_rgba(110,231,183,0.56)]",
        icon: "+",
        label: "Low urgency",
        ring: "border-emerald-200/35 bg-emerald-300/10",
        text: "text-emerald-100",
      }
    : completion >= 50
      ? {
          dot: "bg-cyan-200 shadow-[0_0_14px_rgba(103,232,249,0.56)]",
          icon: ">",
          label: "Active",
          ring: "border-cyan-200/35 bg-cyan-300/10",
          text: "text-cyan-100",
        }
      : {
          dot: "bg-amber-200 shadow-[0_0_14px_rgba(250,204,21,0.56)]",
          icon: "!",
          label: "Needs attention",
          ring: "border-amber-200/35 bg-amber-300/10",
          text: "text-amber-100",
        };

export default function DashboardConstellationStats({
  ariaTitle,
  className = "",
  metrics,
}: {
  ariaTitle: string;
  className?: string;
  metrics: DashboardConstellationStatsMetric[];
}) {
  const [activeMetricIndex, setActiveMetricIndex] = useState(0);
  const activeMetric =
    metrics[activeMetricIndex % Math.max(1, metrics.length)] || metrics[0];

  return (
    <div
      className={`dashboard-constellation-orbit relative min-h-[108px] min-w-0 overflow-visible [perspective:780px] ${className}`}
    >
      <span aria-hidden="true" className="dashboard-constellation-orbit__field" />
      <div aria-live="polite" className="sr-only">
        {activeMetric
          ? `${activeMetric.label}: ${activeMetric.value}`
          : "Dashboard metric orbit"}
      </div>
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[94px] w-px -translate-x-1/2 -translate-y-1/2 bg-gradient-to-b from-transparent via-cyan-200/24 to-transparent shadow-[0_0_18px_rgba(34,211,238,0.20)]" />
      <div
        aria-label={`${ariaTitle} metric orbit`}
        className="absolute inset-0 [transform-style:preserve-3d]"
      >
        {metrics.map((metric, metricIndex) => {
          const activeIndex = activeMetricIndex % Math.max(1, metrics.length);
          const distance = getOrbitDistance(
            metricIndex,
            activeIndex,
            metrics.length,
          );
          const clampedDistance = Math.max(-2, Math.min(2, distance));
          const absDistance = Math.abs(clampedDistance);
          const isActive = distance === 0;
          const direction = Math.sign(clampedDistance);
          const metricTone = metricTones[metricIndex % metricTones.length];
          const metricUrgencyTone = getMetricUrgencyTone(
            getMetricCompletion(metric),
          );
          const ySlots = [0, 35, 66];
          const y = direction * ySlots[absDistance];
          const x = isActive ? 0 : absDistance * 7;
          const scale = isActive ? 1 : absDistance === 1 ? 0.84 : 0.68;
          const opacity = isActive ? 1 : absDistance === 1 ? 0.72 : 0.34;
          const rotateX = direction * -18;

          return (
            <button
              aria-label={`Show ${metric.label} metric, ${metric.value}, ${metricUrgencyTone.label}`}
              aria-pressed={isActive}
              className={`dashboard-constellation-metric group absolute left-1/2 top-1/2 isolate flex h-10 items-center justify-between gap-3 overflow-visible rounded-2xl border px-3 text-left shadow-[0_16px_42px_rgba(0,0,0,0.30),inset_0_1px_0_rgba(255,255,255,0.10)] backdrop-blur-xl transition-[width,border-color,background-color,box-shadow,filter] duration-300 ${
                isActive
                  ? `dashboard-constellation-metric--active ${metricIconToneStyles[metricTone].active} w-[208px]`
                  : `${metricIconToneStyles[metricTone].idle} w-[174px] hover:brightness-125`
              }`}
              key={`${ariaTitle}-${metric.label}`}
              onClick={() => setActiveMetricIndex(metricIndex)}
              style={{
                opacity,
                transform: `translate(-50%, -50%) translateX(${x}px) translateY(${y}px) translateZ(${
                  isActive ? 62 : 18 - absDistance * 8
                }px) rotateX(${rotateX}deg) scale(${scale})`,
                transition:
                  "transform 560ms cubic-bezier(0.2, 0.82, 0.2, 1), opacity 320ms ease, width 260ms ease, border-color 220ms ease, background-color 220ms ease, box-shadow 220ms ease",
                zIndex: 30 - absDistance,
              }}
              type="button"
            >
              <span
                aria-hidden="true"
                className="dashboard-constellation-metric__zoom"
              />
              <span
                aria-hidden="true"
                className="dashboard-constellation-metric__lines"
              />
              <span
                aria-hidden="true"
                className="dashboard-constellation-metric__stars"
              />
              <span
                aria-hidden="true"
                className={`absolute inset-x-5 top-0 z-10 h-px rounded-full ${metricLineToneStyles[metricTone]}`}
              />
              <span className="relative z-10 min-w-0">
                <span className="block truncate text-[7px] font-black uppercase tracking-[0.14em] text-slate-300/80">
                  {metric.label}
                </span>
                <span className="block truncate text-sm font-black tracking-tight text-white">
                  {metric.value}
                </span>
              </span>
              <span
                aria-hidden="true"
                className={`relative z-10 grid h-4 w-4 shrink-0 place-items-center rounded-full border bg-slate-950/72 text-[7px] font-black leading-none text-slate-950 ring-1 ring-white/10 ${
                  isActive
                    ? `${metricUrgencyTone.ring} ${metricUrgencyTone.text}`
                    : "border-white/10 text-slate-500"
                }`}
              >
                <span
                  className={`grid h-3 w-3 place-items-center rounded-full text-slate-950 ${
                    isActive
                      ? metricUrgencyTone.dot
                      : `${metricUrgencyTone.dot} opacity-45 grayscale`
                  }`}
                >
                  {isActive ? metricUrgencyTone.icon : ""}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
