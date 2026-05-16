import Link from "next/link";
import type { ReactNode } from "react";
import { ROUTES } from "@/lib/routes";

type StageStatus = "Complete" | "Current" | "Next" | "Locked";

type PerformanceStage = {
  description: string;
  href: string;
  icon: string;
  nextAction: string;
  progress: number;
  status: StageStatus;
  title: string;
};

const performanceJourneyStages: PerformanceStage[] = [
  {
    description: "See power, conditioning, PRs, readiness, and trend signals.",
    href: "/performance",
    icon: "🧭",
    nextAction: "Review hub",
    progress: 100,
    status: "Complete",
    title: "Overview",
  },
  {
    description: "Aerobic base, heart-rate zones, repeatability, and recovery cost.",
    href: "/performance#cardio",
    icon: "🫀",
    nextAction: "Check zones",
    progress: 68,
    status: "Current",
    title: "Cardio",
  },
  {
    description: "Jumps, carries, throws, sprints, and explosive intent.",
    href: "/performance#power",
    icon: "⚡",
    nextAction: "Log power",
    progress: 52,
    status: "Next",
    title: "Speed / Power",
  },
  {
    description: "Main lift trends, estimated maxes, rep strength, and balance.",
    href: ROUTES.dashboard.stats,
    icon: "🏋️",
    nextAction: "Open metrics",
    progress: 48,
    status: "Next",
    title: "Strength Metrics",
  },
  {
    description: "Conditioning tolerance, intervals, zone 2, and work capacity.",
    href: "/performance#endurance",
    icon: "🏃",
    nextAction: "Build engine",
    progress: 36,
    status: "Next",
    title: "Endurance",
  },
  {
    description: "Benchmark tests for repeatable athletic progress checks.",
    href: "/performance#testing",
    icon: "🧪",
    nextAction: "Choose test",
    progress: 24,
    status: "Locked",
    title: "Athletic Testing",
  },
  {
    description: "PR tracking across lifts, performance markers, and capacity.",
    href: ROUTES.dashboard.stats,
    icon: "🏆",
    nextAction: "Review PRs",
    progress: 18,
    status: "Locked",
    title: "PRs",
  },
  {
    description: "Readiness trends connected to performance output.",
    href: ROUTES.dashboard.stats,
    icon: "📈",
    nextAction: "Open trends",
    progress: 12,
    status: "Locked",
    title: "Readiness Trends",
  },
  {
    description: "Coach intelligence for what to push, hold, or retest.",
    href: ROUTES.dashboard.insights,
    icon: "🧠",
    nextAction: "Open insights",
    progress: 0,
    status: "Locked",
    title: "Performance Insights",
  },
];

const statusStyles: Record<
  StageStatus,
  { badge: string; card: string; marker: string; progress: string }
> = {
  Complete: {
    badge: "border-emerald-300/25 bg-emerald-300/10 text-emerald-100",
    card: "border-emerald-300/30 bg-emerald-300/10 shadow-[0_0_24px_rgba(16,185,129,0.12)]",
    marker: "border-emerald-200/45 bg-emerald-300 text-slate-950",
    progress: "bg-emerald-300",
  },
  Current: {
    badge: "border-cyan-200/35 bg-cyan-300/14 text-cyan-50",
    card: "border-cyan-200/55 bg-cyan-300/14 shadow-[0_0_38px_rgba(34,211,238,0.24)] ring-1 ring-cyan-200/20",
    marker:
      "border-cyan-100/70 bg-cyan-300 text-slate-950 shadow-[0_0_24px_rgba(34,211,238,0.34)]",
    progress: "bg-cyan-300 shadow-[0_0_16px_rgba(34,211,238,0.38)]",
  },
  Next: {
    badge: "border-amber-300/28 bg-amber-300/12 text-amber-100",
    card: "border-amber-300/28 bg-amber-300/9 shadow-[0_0_22px_rgba(251,191,36,0.12)]",
    marker: "border-amber-200/45 bg-amber-300/18 text-amber-100",
    progress: "bg-amber-300",
  },
  Locked: {
    badge: "border-white/10 bg-white/[0.03] text-slate-500",
    card: "border-white/10 bg-white/[0.025] opacity-65 hover:opacity-85",
    marker: "border-white/10 bg-slate-950/70 text-slate-500",
    progress: "bg-white/20",
  },
};

const performanceSnapshot = [
  { label: "Power Score", value: "82", helper: "Explosive intent trending up" },
  { label: "Cardio Base", value: "68%", helper: "Zone 2 consistency building" },
  { label: "Strength Trend", value: "+4%", helper: "Main lifts moving well" },
  { label: "Readiness", value: "74%", helper: "Good, with volume guardrails" },
];

const strengthMetrics = [
  { lift: "Squat Pattern", value: "Stable", detail: "Volume tolerance balanced" },
  { lift: "Pressing", value: "+6%", detail: "Best recent strength trend" },
  { lift: "Pulling", value: "Hold", detail: "Manage soreness before retesting" },
];

const testCards = [
  {
    title: "5-minute engine test",
    detail: "Simple conditioning check for repeatable output.",
    href: "/performance#testing",
  },
  {
    title: "Broad jump baseline",
    detail: "Low-equipment power marker with clear retest value.",
    href: "/performance#power",
  },
  {
    title: "Rep max quality set",
    detail: "Strength metric without forcing a true max.",
    href: ROUTES.dashboard.sessionWorkout,
  },
];

const insightItems = [
  "Push aerobic base before adding more interval heat.",
  "Use power work early in the session while fresh.",
  "Retest pulling strength after soreness drops.",
  "Keep PR attempts tied to readiness and sleep quality.",
];

function Panel({
  children,
  className = "",
  subtitle,
  title,
}: {
  children: ReactNode;
  className?: string;
  subtitle?: string;
  title: string;
}) {
  return (
    <section
      className={`rounded-[28px] border border-white/10 bg-slate-950/54 p-5 shadow-[0_18px_58px_rgba(0,0,0,0.28)] backdrop-blur-xl ${className}`}
    >
      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200">
        {title}
      </div>
      {subtitle ? (
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-400">
          {subtitle}
        </p>
      ) : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default function PerformanceDashboardPage() {
  const completedCount = performanceJourneyStages.filter(
    (stage) => stage.status === "Complete",
  ).length;
  const overallProgress = Math.round(
    performanceJourneyStages.reduce((total, stage) => total + stage.progress, 0) /
      performanceJourneyStages.length,
  );

  return (
    <main className="min-h-screen bg-[#020713] text-white">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_18%_0%,rgba(34,211,238,0.16),transparent_30%),radial-gradient(circle_at_82%_8%,rgba(251,191,36,0.12),transparent_28%),linear-gradient(180deg,#020713_0%,#07111f_48%,#020713_100%)]" />

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-8 lg:py-8">
        <section className="mb-6 overflow-hidden rounded-[34px] border border-cyan-100/18 bg-[radial-gradient(circle_at_16%_0%,rgba(34,211,238,0.16),transparent_34%),radial-gradient(circle_at_88%_14%,rgba(251,191,36,0.12),transparent_30%),linear-gradient(135deg,rgba(15,23,42,0.78),rgba(2,6,23,0.62))] p-5 shadow-[0_28px_90px_rgba(0,0,0,0.34),0_0_46px_rgba(34,211,238,0.08)] backdrop-blur-xl sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex rounded-full border border-amber-200/24 bg-amber-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-amber-100">
                Performance Dashboard
              </div>
              <h1 className="mt-3 text-3xl font-black uppercase tracking-tight text-white sm:text-5xl">
                Athletic performance hub
              </h1>
              <p className="mt-3 text-sm font-semibold leading-6 text-slate-300 sm:text-base">
                Cardio, athletic testing, strength metrics, speed, power,
                endurance, PRs, readiness trends, and performance insights.
              </p>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-slate-950/54 p-4 lg:min-w-[270px]">
              <div className="flex items-center justify-between gap-4">
                <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                  Performance Journey
                </span>
                <span className="text-lg font-black text-cyan-100">
                  {overallProgress}%
                </span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-950/80">
                <span
                  className="block h-full rounded-full bg-gradient-to-r from-emerald-300 via-cyan-300 to-amber-300 shadow-[0_0_24px_rgba(34,211,238,0.28)]"
                  style={{ width: `${overallProgress}%` }}
                />
              </div>
              <p className="mt-3 text-xs font-bold text-slate-400">
                {completedCount}/{performanceJourneyStages.length} complete ·
                Current focus: <span className="text-cyan-100">Cardio</span>
              </p>
            </div>
          </div>

          <div className="mt-6 overflow-x-auto overscroll-x-contain pb-4 scroll-smooth [scrollbar-color:rgba(34,211,238,0.38)_rgba(15,23,42,0.72)] [scrollbar-width:thin] [touch-action:pan-x] [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-cyan-300/42 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-slate-950/70">
            <div className="flex min-w-max items-stretch">
              {performanceJourneyStages.map((stage, index) => {
                const styles = statusStyles[stage.status];
                const active = stage.status === "Current";
                const complete = stage.status === "Complete";

                return (
                  <div className="flex items-center" key={stage.title}>
                    <Link
                      aria-current={active ? "step" : undefined}
                      className={`group relative flex min-h-[174px] w-[228px] flex-col justify-between rounded-[28px] border p-4 text-left transition duration-300 hover:-translate-y-1 ${styles.card}`}
                      href={stage.href}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3">
                          <span
                            className={`grid h-11 w-11 place-items-center rounded-2xl border text-xl ${styles.marker}`}
                            aria-hidden="true"
                          >
                            {complete ? "✓" : stage.icon}
                          </span>
                          <span
                            className={`rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] ${styles.badge}`}
                          >
                            {active ? "Current" : stage.status}
                          </span>
                        </div>

                        <h2 className="mt-4 text-base font-black uppercase tracking-tight text-white">
                          {stage.title}
                        </h2>
                        <p className="mt-2 line-clamp-2 text-xs font-semibold leading-5 text-slate-400">
                          {stage.description}
                        </p>
                      </div>

                      <div className="mt-4">
                        <div className="flex items-center justify-between gap-3 text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">
                          <span>{stage.progress}%</span>
                          <span>{stage.nextAction}</span>
                        </div>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-950/80">
                          <span
                            className={`block h-full rounded-full ${styles.progress}`}
                            style={{ width: `${stage.progress}%` }}
                          />
                        </div>
                      </div>
                    </Link>

                    {index < performanceJourneyStages.length - 1 ? (
                      <span
                        className="mx-2 h-px w-10 shrink-0 rounded-full bg-gradient-to-r from-cyan-300/44 via-amber-200/28 to-cyan-300/12 shadow-[0_0_14px_rgba(34,211,238,0.14)]"
                        aria-hidden="true"
                      />
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
          <Panel
            className="border-cyan-200/18 bg-cyan-300/[0.055]"
            subtitle="The high-level state of athletic output and readiness."
            title="Performance Snapshot"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              {performanceSnapshot.map((stat) => (
                <div
                  className="rounded-2xl border border-white/10 bg-slate-950/54 p-4"
                  key={stat.label}
                >
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                    {stat.label}
                  </p>
                  <p className="mt-2 text-2xl font-black text-white">
                    {stat.value}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-slate-400">
                    {stat.helper}
                  </p>
                </div>
              ))}
            </div>
          </Panel>

          <Panel
            subtitle="Cardio, endurance, and conditioning markers."
            title="Cardio / Endurance"
          >
            <div id="cardio" className="space-y-3">
              {[
                ["Zone 2 Base", "68%", "Build repeatable aerobic work"],
                ["Interval Tolerance", "Moderate", "Add heat gradually"],
                ["Recovery Cost", "Low", "Conditioning is not burying readiness"],
              ].map(([label, value, helper]) => (
                <div
                  className="rounded-2xl border border-white/10 bg-white/[0.035] p-3"
                  key={label}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-black text-white">{label}</span>
                    <span className="rounded-full border border-cyan-200/20 bg-cyan-300/10 px-2.5 py-1 text-[10px] font-black text-cyan-100">
                      {value}
                    </span>
                  </div>
                  <p className="mt-2 text-xs font-semibold text-slate-400">
                    {helper}
                  </p>
                </div>
              ))}
            </div>
          </Panel>
        </section>

        <section className="mt-5 grid gap-5 lg:grid-cols-3">
          <Panel
            subtitle="Main strength markers and training balance."
            title="Strength Metrics"
          >
            <div className="grid gap-3">
              {strengthMetrics.map((metric) => (
                <div
                  className="rounded-2xl border border-white/10 bg-slate-950/50 p-4"
                  key={metric.lift}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-black text-white">{metric.lift}</p>
                    <p className="text-sm font-black text-amber-100">
                      {metric.value}
                    </p>
                  </div>
                  <p className="mt-2 text-xs font-semibold leading-5 text-slate-400">
                    {metric.detail}
                  </p>
                </div>
              ))}
            </div>
          </Panel>

          <Panel
            subtitle="Power and speed work should stay crisp and fresh."
            title="Speed / Power"
          >
            <div id="power" className="rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4">
              <p className="text-3xl font-black text-amber-100">Ready</p>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-300">
                Use jumps, carries, throws, or short sprints early in the
                session. Stop before quality drops.
              </p>
            </div>
            <Link
              className="mt-3 inline-flex w-full justify-center rounded-2xl border border-cyan-200/24 bg-cyan-300/10 px-4 py-3 text-xs font-black uppercase tracking-[0.13em] text-cyan-100 transition hover:bg-cyan-300/16"
              href={ROUTES.dashboard.sessionWorkout}
            >
              Start Performance Session
            </Link>
          </Panel>

          <Panel
            subtitle="Benchmarks that can be repeated safely."
            title="Athletic Testing"
          >
            <div id="testing" className="grid gap-3">
              {testCards.map((test) => (
                <Link
                  className="rounded-2xl border border-white/10 bg-white/[0.035] p-3 transition hover:-translate-y-0.5 hover:border-cyan-200/35 hover:bg-cyan-300/8"
                  href={test.href}
                  key={test.title}
                >
                  <p className="text-sm font-black text-white">{test.title}</p>
                  <p className="mt-1 text-xs font-semibold leading-5 text-slate-400">
                    {test.detail}
                  </p>
                </Link>
              ))}
            </div>
          </Panel>
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <Panel
            subtitle="Personal records and retest logic."
            title="PRs / Progress Markers"
          >
            <div className="grid gap-3">
              {[
                ["Best recent lift", "Pressing +6%"],
                ["Capacity marker", "5-min engine test pending"],
                ["Retest target", "Broad jump baseline"],
              ].map(([label, value]) => (
                <div
                  className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-3"
                  key={label}
                >
                  <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                    {label}
                  </span>
                  <span className="text-sm font-black text-white">{value}</span>
                </div>
              ))}
            </div>
          </Panel>

          <Panel
            subtitle="Coach intelligence for what to push, hold, or retest."
            title="Performance Insights"
          >
            <div className="grid gap-2">
              {insightItems.map((item) => (
                <div
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] px-3 py-3"
                  key={item}
                >
                  <span
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-cyan-300 text-xs font-black text-slate-950"
                    aria-hidden="true"
                  >
                    →
                  </span>
                  <span className="text-sm font-semibold text-slate-300">
                    {item}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                className="rounded-2xl bg-cyan-300 px-4 py-3 text-xs font-black uppercase tracking-[0.13em] text-slate-950 transition hover:bg-cyan-200"
                href={ROUTES.dashboard.stats}
              >
                Open Stats
              </Link>
              <Link
                className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-xs font-black uppercase tracking-[0.13em] text-white transition hover:border-amber-200/35 hover:bg-amber-300/10"
                href={ROUTES.dashboard.insights}
              >
                Open Insights
              </Link>
            </div>
          </Panel>
        </section>
      </div>
    </main>
  );
}
