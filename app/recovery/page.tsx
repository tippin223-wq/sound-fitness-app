import Link from "next/link";
import type { ReactNode } from "react";
import { ROUTES } from "@/lib/routes";

type JourneyStatus = "Complete" | "Current" | "Next" | "Locked";

type RecoveryJourneyStage = {
  description: string;
  href: string;
  icon: string;
  nextAction: string;
  progress: number;
  status: JourneyStatus;
  title: string;
};

const recoveryJourneyStages: RecoveryJourneyStage[] = [
  {
    description: "Read today's recovery score, key risks, and next best action.",
    href: "/recovery",
    icon: "🧭",
    nextAction: "Review status",
    progress: 100,
    status: "Complete",
    title: "Overview",
  },
  {
    description: "Check sleep duration, quality, and disruption patterns.",
    href: "/stats/add/manual?type=sleep",
    icon: "😴",
    nextAction: "Log sleep",
    progress: 74,
    status: "Complete",
    title: "Sleep",
  },
  {
    description: "Pair hydration with soreness, readiness, and training heat.",
    href: "/stats/add/manual?type=water",
    icon: "💧",
    nextAction: "Add water",
    progress: 62,
    status: "Current",
    title: "Hydration",
  },
  {
    description: "Choose mobility resets that match today's body signals.",
    href: ROUTES.dashboard.mobilityLibrary,
    icon: "🧘",
    nextAction: "Pick mobility",
    progress: 48,
    status: "Next",
    title: "Mobility",
  },
  {
    description: "Map soreness and tissue heat before adding intensity.",
    href: ROUTES.dashboard.stats,
    icon: "🔥",
    nextAction: "Review soreness",
    progress: 36,
    status: "Next",
    title: "Soreness",
  },
  {
    description: "Capture pain, limitations, and movement red flags.",
    href: ROUTES.dashboard.painTracking,
    icon: "🦵",
    nextAction: "Check pain",
    progress: 24,
    status: "Locked",
    title: "Pain Check",
  },
  {
    description: "Cool down hot muscle groups and protect tomorrow's training.",
    href: ROUTES.dashboard.recovery,
    icon: "🧊",
    nextAction: "Start cooldown",
    progress: 18,
    status: "Locked",
    title: "Cooldown",
  },
  {
    description: "Track readiness changes across sleep, soreness, and load.",
    href: ROUTES.dashboard.stats,
    icon: "📈",
    nextAction: "Open trends",
    progress: 12,
    status: "Locked",
    title: "Readiness Trends",
  },
  {
    description: "Turn recovery signals into a clear, low-friction plan.",
    href: ROUTES.dashboard.insights,
    icon: "🧠",
    nextAction: "Open AI plan",
    progress: 0,
    status: "Locked",
    title: "AI Recovery Plan",
  },
  {
    description: "Decide whether to train, modify, or recover today.",
    href: ROUTES.dashboard.sessions,
    icon: "✅",
    nextAction: "Choose training",
    progress: 0,
    status: "Locked",
    title: "Return to Training",
  },
];

const statusStyles: Record<
  JourneyStatus,
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
    marker: "border-cyan-100/70 bg-cyan-300 text-slate-950 shadow-[0_0_24px_rgba(34,211,238,0.34)]",
    progress: "bg-cyan-300 shadow-[0_0_16px_rgba(34,211,238,0.38)]",
  },
  Next: {
    badge: "border-sky-300/28 bg-sky-300/12 text-sky-100",
    card: "border-sky-300/28 bg-sky-300/9 shadow-[0_0_22px_rgba(56,189,248,0.12)]",
    marker: "border-sky-200/45 bg-sky-300/18 text-sky-100",
    progress: "bg-sky-300",
  },
  Locked: {
    badge: "border-white/10 bg-white/[0.03] text-slate-500",
    card: "border-white/10 bg-white/[0.025] opacity-65 hover:opacity-85",
    marker: "border-white/10 bg-slate-950/70 text-slate-500",
    progress: "bg-white/20",
  },
};

const recoveryStats = [
  { label: "Readiness", value: "74%", helper: "Train, but control volume" },
  { label: "Soreness", value: "3/10", helper: "Upper pull is warm" },
  { label: "Sleep", value: "7h 20m", helper: "Good enough to progress" },
  { label: "Pain", value: "0/10", helper: "No hard stop logged" },
];

const sorenessMap = [
  { area: "Upper Pull", level: "Warm", width: "72%", tone: "bg-cyan-300" },
  { area: "Quads", level: "Moderate", width: "54%", tone: "bg-sky-300" },
  { area: "Shoulders", level: "Ready", width: "34%", tone: "bg-emerald-300" },
  { area: "Low Back", level: "Monitor", width: "46%", tone: "bg-violet-300" },
];

const mobilityRecommendations = [
  {
    title: "Thoracic opener",
    detail: "2 rounds before upper-body work.",
    href: ROUTES.dashboard.mobilityLibrary,
  },
  {
    title: "Hip capsule reset",
    detail: "Low-load prep for squats or running.",
    href: ROUTES.dashboard.mobilityLibrary,
  },
  {
    title: "Breathing cooldown",
    detail: "5 minutes after hard conditioning.",
    href: ROUTES.dashboard.recoveryRecommendations,
  },
];

const recoveryActions = [
  "Swap heavy pulling for technique volume",
  "Add 8-10 minutes of zone 2 walking",
  "Hydrate before the next session",
  "Keep pain check-in updated",
];

const libraryLinks = [
  {
    href: ROUTES.dashboard.recovery,
    label: "Recovery Library",
    text: "Cooldowns, breathing, tissue care, and low-load options.",
  },
  {
    href: ROUTES.dashboard.mobilityLibrary,
    label: "Mobility Library",
    text: "Hips, shoulders, spine, ankles, and movement prep.",
  },
  {
    href: ROUTES.dashboard.recoveryRecommendations,
    label: "Recommendations",
    text: "Suggested recovery moves based on readiness and soreness.",
  },
  {
    href: ROUTES.dashboard.painTracking,
    label: "Pain Tracking",
    text: "Log discomfort, limitations, and return-to-training notes.",
  },
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

export default function RecoveryPortalPage() {
  const completedCount = recoveryJourneyStages.filter(
    (stage) => stage.status === "Complete",
  ).length;
  const overallProgress = Math.round(
    recoveryJourneyStages.reduce((total, stage) => total + stage.progress, 0) /
      recoveryJourneyStages.length,
  );

  return (
    <main className="min-h-screen bg-[#020713] text-white">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_18%_0%,rgba(34,211,238,0.16),transparent_30%),radial-gradient(circle_at_82%_8%,rgba(139,92,246,0.12),transparent_28%),linear-gradient(180deg,#020713_0%,#07111f_48%,#020713_100%)]" />

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-8 lg:py-8">
        <section className="mb-6 overflow-hidden rounded-[34px] border border-cyan-100/18 bg-[radial-gradient(circle_at_16%_0%,rgba(34,211,238,0.16),transparent_34%),radial-gradient(circle_at_88%_14%,rgba(139,92,246,0.12),transparent_30%),linear-gradient(135deg,rgba(15,23,42,0.78),rgba(2,6,23,0.62))] p-5 shadow-[0_28px_90px_rgba(0,0,0,0.34),0_0_46px_rgba(34,211,238,0.08)] backdrop-blur-xl sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex rounded-full border border-cyan-200/20 bg-cyan-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100">
                Recovery Portal
              </div>
              <h1 className="mt-3 text-3xl font-black uppercase tracking-tight text-white sm:text-5xl">
                Recovery command center
              </h1>
              <p className="mt-3 text-sm font-semibold leading-6 text-slate-300 sm:text-base">
                Readiness, soreness, mobility, pain, sleep, cooldowns, and
                return-to-training decisions in one calm control room.
              </p>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-slate-950/54 p-4 lg:min-w-[270px]">
              <div className="flex items-center justify-between gap-4">
                <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                  Recovery Journey
                </span>
                <span className="text-lg font-black text-cyan-100">
                  {overallProgress}%
                </span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-950/80">
                <span
                  className="block h-full rounded-full bg-gradient-to-r from-emerald-300 via-cyan-300 to-violet-300 shadow-[0_0_24px_rgba(34,211,238,0.28)]"
                  style={{ width: `${overallProgress}%` }}
                />
              </div>
              <p className="mt-3 text-xs font-bold text-slate-400">
                {completedCount}/{recoveryJourneyStages.length} complete ·
                Current focus: <span className="text-cyan-100">Hydration</span>
              </p>
            </div>
          </div>

          <div className="mt-6 overflow-x-auto overscroll-x-contain pb-4 scroll-smooth [scrollbar-color:rgba(34,211,238,0.38)_rgba(15,23,42,0.72)] [scrollbar-width:thin] [touch-action:pan-x] [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-cyan-300/42 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-slate-950/70">
            <div className="flex min-w-max items-stretch">
              {recoveryJourneyStages.map((stage, index) => {
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

                    {index < recoveryJourneyStages.length - 1 ? (
                      <span
                        className="mx-2 h-px w-10 shrink-0 rounded-full bg-gradient-to-r from-cyan-300/44 via-violet-200/24 to-emerald-300/14 shadow-[0_0_14px_rgba(34,211,238,0.14)]"
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
            subtitle="A quick decision layer for today's training risk."
            title="Today's Recovery Status"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              {recoveryStats.map((stat) => (
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
            subtitle="Muscle heat and cooldown priorities before you train."
            title="Muscle Cooldown / Soreness Map"
          >
            <div className="space-y-3">
              {sorenessMap.map((item) => (
                <div
                  className="rounded-2xl border border-white/10 bg-white/[0.035] p-3"
                  key={item.area}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-black text-white">
                      {item.area}
                    </span>
                    <span className="rounded-full border border-white/10 bg-slate-950/55 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">
                      {item.level}
                    </span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-950/80">
                    <span
                      className={`block h-full rounded-full ${item.tone}`}
                      style={{ width: item.width }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </section>

        <section className="mt-5 grid gap-5 lg:grid-cols-3">
          <Panel
            subtitle="Short mobility choices tied to today's readiness."
            title="Mobility & Stretch Recommendations"
          >
            <div className="grid gap-3">
              {mobilityRecommendations.map((item) => (
                <Link
                  className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 transition hover:-translate-y-0.5 hover:border-cyan-200/35 hover:bg-cyan-300/8"
                  href={item.href}
                  key={item.title}
                >
                  <p className="text-sm font-black text-white">{item.title}</p>
                  <p className="mt-1 text-xs font-semibold leading-5 text-slate-400">
                    {item.detail}
                  </p>
                </Link>
              ))}
            </div>
          </Panel>

          <Panel
            subtitle="A focused gate before loading painful patterns."
            title="Pain / Limitation Check-In"
          >
            <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-4">
              <p className="text-3xl font-black text-emerald-100">0/10</p>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-300">
                No pain stop logged. Continue monitoring knees, hips, shoulders,
                and back before hard sets.
              </p>
            </div>
            <Link
              className="mt-3 inline-flex w-full justify-center rounded-2xl border border-cyan-200/24 bg-cyan-300/10 px-4 py-3 text-xs font-black uppercase tracking-[0.13em] text-cyan-100 transition hover:bg-cyan-300/16"
              href={ROUTES.dashboard.painTracking}
            >
              Open Pain Check-In
            </Link>
          </Panel>

          <Panel
            subtitle="Sleep and readiness signals that guide the session."
            title="Sleep & Readiness Snapshot"
          >
            <div className="grid gap-3">
              {[
                ["Sleep Window", "7-8h", "Good enough for normal training"],
                ["Stress", "Moderate", "Keep warmups deliberate"],
                ["Energy", "Normal", "No readiness limiter"],
              ].map(([label, value, helper]) => (
                <div
                  className="rounded-2xl border border-white/10 bg-slate-950/50 p-3"
                  key={label}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                      {label}
                    </span>
                    <span className="text-sm font-black text-cyan-100">
                      {value}
                    </span>
                  </div>
                  <p className="mt-1 text-xs font-semibold text-slate-400">
                    {helper}
                  </p>
                </div>
              ))}
            </div>
          </Panel>
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <Panel
            subtitle="Low-friction moves that improve tomorrow's training."
            title="Recovery Actions"
          >
            <div className="grid gap-2">
              {recoveryActions.map((action) => (
                <div
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] px-3 py-3"
                  key={action}
                >
                  <span
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-cyan-300 text-xs font-black text-slate-950"
                    aria-hidden="true"
                  >
                    ✓
                  </span>
                  <span className="text-sm font-semibold text-slate-300">
                    {action}
                  </span>
                </div>
              ))}
            </div>
          </Panel>

          <Panel
            subtitle="Keep deeper content as linked tools, not long article blocks."
            title="Recovery Library Links"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              {libraryLinks.map((link) => (
                <Link
                  className="rounded-2xl border border-white/10 bg-slate-950/50 p-4 transition hover:-translate-y-0.5 hover:border-cyan-200/35 hover:bg-cyan-300/8"
                  href={link.href}
                  key={link.label}
                >
                  <p className="text-sm font-black text-white">{link.label}</p>
                  <p className="mt-2 text-xs font-semibold leading-5 text-slate-400">
                    {link.text}
                  </p>
                </Link>
              ))}
            </div>
          </Panel>
        </section>

        <Panel
          className="mt-5 border-violet-200/18 bg-violet-300/[0.045]"
          subtitle="Coach and AI guidance stays concise, actionable, and tied to training decisions."
          title="Coach / AI Notes"
        >
          <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
            <p className="text-sm font-semibold leading-6 text-slate-300">
              Current plan appears trainable with light constraints. Keep the
              main session, add the mobility reset, and avoid stacking extra
              pulling volume until soreness drops.
            </p>
            <div className="flex flex-wrap gap-2">
              <Link
                className="rounded-2xl bg-cyan-300 px-4 py-3 text-xs font-black uppercase tracking-[0.13em] text-slate-950 transition hover:bg-cyan-200"
                href={ROUTES.dashboard.insights}
              >
                Open Insights
              </Link>
              <Link
                className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-xs font-black uppercase tracking-[0.13em] text-white transition hover:border-violet-200/35 hover:bg-violet-300/10"
                href={ROUTES.dashboard.coachMessaging}
              >
                Message Coach
              </Link>
            </div>
          </div>
        </Panel>
      </div>
    </main>
  );
}
