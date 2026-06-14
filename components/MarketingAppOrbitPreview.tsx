"use client";

import DashboardScrollButton3D from "@/components/dashboard/DashboardScrollButton3D";
import { DashboardSpinningSoundCoin3D } from "@/components/dashboard/DashboardTreasureChest3D";
import {
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  Dumbbell,
  Sparkles,
  Target,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import {
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
  type WheelEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type AppPreviewTone = "amber" | "cyan" | "emerald" | "fuchsia" | "sky" | "violet";

type AppPreviewSlide = {
  id:
    | "profile"
    | "goals"
    | "plan"
    | "builder"
    | "workout"
    | "results";
  label: string;
  title: string;
  helper: string;
  accent: string;
  Icon: LucideIcon;
  tone: AppPreviewTone;
};

const appPreviewSlides: AppPreviewSlide[] = [
  {
    id: "profile",
    label: "Profile",
    title: "Training profile",
    helper: "Home setup, limitations, preferences, and coaching style become usable context.",
    accent: "from-sky-300 via-cyan-300 to-emerald-300",
    Icon: UserRound,
    tone: "cyan",
  },
  {
    id: "goals",
    label: "Goals",
    title: "Goal builder",
    helper: "Draft goals turn broad intent into target dates, constraints, and check-ins.",
    accent: "from-amber-200 via-lime-200 to-emerald-300",
    Icon: Target,
    tone: "amber",
  },
  {
    id: "plan",
    label: "Plan",
    title: "Weekly plan",
    helper: "A draft training week connects goals, recovery, equipment, and coach priorities.",
    accent: "from-cyan-200 via-sky-300 to-blue-500",
    Icon: ClipboardCheck,
    tone: "sky",
  },
  {
    id: "builder",
    label: "Workout builder",
    title: "5 move recommendations",
    helper: "A simple recommendation system suggests a focused five-exercise session.",
    accent: "from-violet-200 via-cyan-300 to-emerald-300",
    Icon: Dumbbell,
    tone: "violet",
  },
  {
    id: "workout",
    label: "Complete workout",
    title: "Session runner",
    helper: "Members complete the actual workout, log sets, and keep notes tied to the plan.",
    accent: "from-emerald-200 via-cyan-300 to-sky-400",
    Icon: CheckCircle2,
    tone: "emerald",
  },
  {
    id: "results",
    label: "Analyze results",
    title: "Results review",
    helper: "Readiness, effort, soreness, and wins shape the next recommendation.",
    accent: "from-amber-200 via-cyan-200 to-sky-500",
    Icon: BarChart3,
    tone: "fuchsia",
  },
];

const appPreviewToneStyles: Record<
  AppPreviewTone,
  {
    effectStyle: CSSProperties;
    icon: { active: string; idle: string };
    labelText: string;
  }
> = {
  amber: {
    effectStyle: {
      "--dashboard-header-journey-circle": "rgba(250,204,21,0.42)",
      "--dashboard-header-journey-circle-ring": "rgba(253,224,71,0.42)",
      "--dashboard-header-journey-circle-soft": "rgba(245,158,11,0.22)",
      "--dashboard-header-journey-halo": "rgba(250,204,21,0.54)",
      "--dashboard-header-journey-halo-soft": "rgba(245,158,11,0.22)",
      "--dashboard-header-journey-motion": "rgba(250,204,21,0.86)",
      "--dashboard-header-journey-motion-alt": "rgba(251,146,60,0.64)",
      "--dashboard-header-journey-shadow": "rgba(250,204,21,0.34)",
    } as CSSProperties,
    icon: {
      active: "text-amber-100 drop-shadow-[0_0_10px_rgba(250,204,21,0.46)]",
      idle: "text-amber-100/72 drop-shadow-[0_0_7px_rgba(250,204,21,0.26)]",
    },
    labelText: "text-amber-100",
  },
  cyan: {
    effectStyle: {
      "--dashboard-header-journey-circle": "rgba(34,211,238,0.42)",
      "--dashboard-header-journey-circle-ring": "rgba(125,211,252,0.42)",
      "--dashboard-header-journey-circle-soft": "rgba(14,165,233,0.22)",
      "--dashboard-header-journey-halo": "rgba(34,211,238,0.54)",
      "--dashboard-header-journey-halo-soft": "rgba(14,165,233,0.22)",
      "--dashboard-header-journey-motion": "rgba(34,211,238,0.86)",
      "--dashboard-header-journey-motion-alt": "rgba(125,211,252,0.58)",
      "--dashboard-header-journey-shadow": "rgba(34,211,238,0.34)",
    } as CSSProperties,
    icon: {
      active: "text-cyan-50 drop-shadow-[0_0_10px_rgba(34,211,238,0.52)]",
      idle: "text-cyan-100/72 drop-shadow-[0_0_7px_rgba(34,211,238,0.30)]",
    },
    labelText: "text-cyan-100",
  },
  emerald: {
    effectStyle: {
      "--dashboard-header-journey-circle": "rgba(52,211,153,0.4)",
      "--dashboard-header-journey-circle-ring": "rgba(167,243,208,0.4)",
      "--dashboard-header-journey-circle-soft": "rgba(16,185,129,0.2)",
      "--dashboard-header-journey-halo": "rgba(52,211,153,0.5)",
      "--dashboard-header-journey-halo-soft": "rgba(16,185,129,0.2)",
      "--dashboard-header-journey-motion": "rgba(52,211,153,0.82)",
      "--dashboard-header-journey-motion-alt": "rgba(45,212,191,0.58)",
      "--dashboard-header-journey-shadow": "rgba(16,185,129,0.3)",
    } as CSSProperties,
    icon: {
      active: "text-emerald-100 drop-shadow-[0_0_10px_rgba(16,185,129,0.44)]",
      idle: "text-emerald-100/72 drop-shadow-[0_0_7px_rgba(16,185,129,0.24)]",
    },
    labelText: "text-emerald-100",
  },
  fuchsia: {
    effectStyle: {
      "--dashboard-header-journey-circle": "rgba(217,70,239,0.38)",
      "--dashboard-header-journey-circle-ring": "rgba(245,208,254,0.38)",
      "--dashboard-header-journey-circle-soft": "rgba(192,38,211,0.2)",
      "--dashboard-header-journey-halo": "rgba(217,70,239,0.48)",
      "--dashboard-header-journey-halo-soft": "rgba(192,38,211,0.2)",
      "--dashboard-header-journey-motion": "rgba(217,70,239,0.8)",
      "--dashboard-header-journey-motion-alt": "rgba(244,114,182,0.58)",
      "--dashboard-header-journey-shadow": "rgba(217,70,239,0.28)",
    } as CSSProperties,
    icon: {
      active: "text-fuchsia-100 drop-shadow-[0_0_10px_rgba(217,70,239,0.42)]",
      idle: "text-fuchsia-100/70 drop-shadow-[0_0_7px_rgba(217,70,239,0.22)]",
    },
    labelText: "text-fuchsia-100",
  },
  sky: {
    effectStyle: {
      "--dashboard-header-journey-circle": "rgba(14,165,233,0.4)",
      "--dashboard-header-journey-circle-ring": "rgba(186,230,253,0.4)",
      "--dashboard-header-journey-circle-soft": "rgba(37,99,235,0.2)",
      "--dashboard-header-journey-halo": "rgba(14,165,233,0.5)",
      "--dashboard-header-journey-halo-soft": "rgba(37,99,235,0.2)",
      "--dashboard-header-journey-motion": "rgba(14,165,233,0.82)",
      "--dashboard-header-journey-motion-alt": "rgba(96,165,250,0.58)",
      "--dashboard-header-journey-shadow": "rgba(14,165,233,0.3)",
    } as CSSProperties,
    icon: {
      active: "text-sky-100 drop-shadow-[0_0_10px_rgba(14,165,233,0.46)]",
      idle: "text-sky-100/72 drop-shadow-[0_0_7px_rgba(14,165,233,0.26)]",
    },
    labelText: "text-sky-100",
  },
  violet: {
    effectStyle: {
      "--dashboard-header-journey-circle": "rgba(139,92,246,0.4)",
      "--dashboard-header-journey-circle-ring": "rgba(221,214,254,0.4)",
      "--dashboard-header-journey-circle-soft": "rgba(124,58,237,0.2)",
      "--dashboard-header-journey-halo": "rgba(139,92,246,0.5)",
      "--dashboard-header-journey-halo-soft": "rgba(124,58,237,0.2)",
      "--dashboard-header-journey-motion": "rgba(139,92,246,0.82)",
      "--dashboard-header-journey-motion-alt": "rgba(34,211,238,0.58)",
      "--dashboard-header-journey-shadow": "rgba(139,92,246,0.3)",
    } as CSSProperties,
    icon: {
      active: "text-violet-100 drop-shadow-[0_0_10px_rgba(139,92,246,0.44)]",
      idle: "text-violet-100/72 drop-shadow-[0_0_7px_rgba(139,92,246,0.24)]",
    },
    labelText: "text-violet-100",
  },
};

const workoutRecommendations = [
  {
    name: "90/90 hip lift",
    type: "Reset",
    dose: "2 min",
    reason: "Breathing + pelvis position",
  },
  {
    name: "Goblet box squat",
    type: "Strength",
    dose: "3 x 8",
    reason: "Lower body without back flare-up",
  },
  {
    name: "Band row",
    type: "Pull",
    dose: "3 x 10",
    reason: "Posture and shoulder balance",
  },
  {
    name: "Step-up",
    type: "Single leg",
    dose: "2 x 8/side",
    reason: "Knee-friendly control",
  },
  {
    name: "Dead bug reach",
    type: "Core",
    dose: "2 x 6/side",
    reason: "Brace practice before loading",
  },
] as const;

const positiveMod = (value: number, divisor: number) =>
  ((value % divisor) + divisor) % divisor;

type HorizontalJoystickDirection = "left" | "right";

const getOrbitDistance = (index: number, activeIndex: number) => {
  const rawDistance = positiveMod(
    index - activeIndex,
    appPreviewSlides.length,
  );

  return rawDistance > appPreviewSlides.length / 2
    ? rawDistance - appPreviewSlides.length
    : rawDistance;
};

const appPreviewJourneyOrbitSlots = [
  { blur: 0, opacity: 1, rotateY: 0, scale: 1.2, x: 0, y: -4, z: 58, zIndex: 36 },
  { blur: 0.1, opacity: 0.9, rotateY: 28, scale: 0.94, x: 42, y: 5, z: 16, zIndex: 28 },
  { blur: 0.24, opacity: 0.66, rotateY: 46, scale: 0.78, x: 82, y: 14, z: -34, zIndex: 18 },
  { blur: 0.42, opacity: 0.42, rotateY: 62, scale: 0.66, x: 116, y: 21, z: -72, zIndex: 10 },
] as const;

function AppPreviewJourneyBall({
  iconClassName,
  isActive,
  slide,
}: {
  iconClassName?: string;
  isActive: boolean;
  slide: AppPreviewSlide;
}) {
  const Icon = slide.Icon;
  const tone = appPreviewToneStyles[slide.tone];

  return (
    <>
      <span
        aria-hidden="true"
        className="dashboard-header-journey-tab__halo"
        style={{
          filter: "blur(4px)",
          inset: "-0.12rem",
          opacity: isActive ? undefined : 0.34,
          zIndex: 0,
        }}
      />
      <span
        aria-hidden="true"
        className="dashboard-header-journey-tab__motion"
        style={{
          inset: "-0.06rem",
          opacity: isActive ? 0.92 : 0.42,
          zIndex: 0,
        }}
      />
      <span
        aria-hidden="true"
        className="dashboard-header-journey-tab__core"
        style={{
          inset: isActive ? "0.16rem" : "0.2rem",
          opacity: isActive ? 1 : 0.72,
          zIndex: 1,
        }}
      />
      <span
        className={
          isActive
            ? "dashboard-header-journey-tab__float relative z-10 grid h-full w-full place-items-center rounded-full"
            : "relative z-10 grid h-full w-full place-items-center rounded-full"
        }
      >
        <Icon
          aria-hidden="true"
          className={
            iconClassName ||
            `${isActive ? "h-4 w-4" : "h-3.5 w-3.5"} ${
              tone.icon[isActive ? "active" : "idle"]
            }`
          }
          strokeWidth={2.45}
        />
      </span>
    </>
  );
}

function AppStillShell({
  accent,
  children,
  eyebrow,
  Icon,
  title,
}: {
  accent: string;
  children: ReactNode;
  eyebrow: string;
  Icon: LucideIcon;
  title: string;
}) {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-white/10 bg-[radial-gradient(circle_at_18%_0%,rgba(14,165,233,0.16),transparent_38%),linear-gradient(145deg,rgba(6,17,31,0.98),rgba(2,7,19,0.96))] p-3 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-sky-300/24 bg-sky-400/12 text-sky-100 shadow-[0_0_18px_rgba(14,165,233,0.18)]">
            <Icon aria-hidden="true" className="h-[18px] w-[18px]" strokeWidth={2.4} />
          </div>
          <div className="min-w-0">
            <div className="truncate text-[8px] font-black uppercase tracking-[0.16em] text-sky-300">
              {eyebrow}
            </div>
            <div className="mt-1 truncate text-base font-black uppercase leading-none text-white sm:text-lg">
              {title}
            </div>
          </div>
        </div>
        <div className={`h-1.5 w-16 shrink-0 rounded-full bg-gradient-to-r ${accent} shadow-[0_0_18px_rgba(125,211,252,0.34)]`} />
      </div>
      <div className="mt-3 min-h-0 flex-1 overflow-hidden">{children}</div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  tone = "sky",
}: {
  label: string;
  value: string;
  tone?: "amber" | "emerald" | "sky";
}) {
  const toneClass =
    tone === "amber"
      ? "text-amber-100 bg-amber-200/10 border-amber-200/18"
      : tone === "emerald"
        ? "text-emerald-100 bg-emerald-300/10 border-emerald-200/18"
        : "text-sky-100 bg-sky-400/10 border-sky-300/18";

  return (
    <div className={`rounded-lg border p-2.5 ${toneClass}`}>
      <div className="text-[8px] font-black uppercase tracking-[0.14em] opacity-70">
        {label}
      </div>
      <div className="mt-1 text-xs font-black leading-4 text-white">
        {value}
      </div>
    </div>
  );
}

function ProfileStill() {
  return (
    <AppStillShell
      accent="from-sky-300 via-cyan-300 to-emerald-300"
      eyebrow="Profile input"
      Icon={UserRound}
      title="Maya R."
    >
      <div className="grid h-full grid-cols-[0.82fr_1.18fr] gap-3">
        <div className="flex flex-col justify-between rounded-lg border border-white/10 bg-white/[0.04] p-3">
          <div>
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-sky-200/35 bg-[radial-gradient(circle_at_42%_30%,rgba(125,211,252,0.34),rgba(15,23,42,0.78))] text-xl font-black text-white shadow-[0_0_28px_rgba(14,165,233,0.2)]">
              MR
            </div>
            <div className="mt-3 text-center text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">
              Level 12
            </div>
          </div>
          <div className="rounded-md bg-slate-950/54 p-2 text-center">
            <div className="text-xl font-black text-emerald-100">82%</div>
            <div className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-500">
              Ready
            </div>
          </div>
        </div>

        <div className="grid gap-2">
          <MiniStat label="Home setup" value="Dumbbells, bands, mat" />
          <MiniStat
            label="Limits"
            tone="amber"
            value="Low-back friendly cues"
          />
          <MiniStat
            label="Support style"
            tone="emerald"
            value="Direct plan + form notes"
          />
          <MiniStat label="Schedule" value="3 training windows" />
        </div>
      </div>
    </AppStillShell>
  );
}

function GoalsStill() {
  return (
    <AppStillShell
      accent="from-amber-200 via-lime-200 to-emerald-300"
      eyebrow="Goal draft"
      Icon={Target}
      title="Target board"
    >
      <div className="grid h-full gap-3">
        <div className="rounded-lg border border-amber-200/18 bg-amber-200/10 p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[8px] font-black uppercase tracking-[0.16em] text-amber-100/70">
                Primary goal
              </div>
              <div className="mt-1 text-sm font-black leading-5 text-white">
                Lose 12 lb + gain lean muscle
              </div>
            </div>
            <div className="rounded-full bg-slate-950/55 px-2.5 py-1 text-xs font-black text-amber-100">
              64%
            </div>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-950/60">
            <div className="h-full w-[64%] rounded-full bg-gradient-to-r from-cyan-300 via-emerald-200 to-amber-200" />
          </div>
          <div className="mt-2 flex justify-between text-[8px] font-black uppercase tracking-[0.12em] text-slate-500">
            <span>Start</span>
            <span>Check-in</span>
            <span>Aug 30, 2026</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <MiniStat label="Mobility" value="4 days per week" tone="emerald" />
          <MiniStat label="Pain cap" value="Stay under 2/10" tone="sky" />
          <MiniStat label="Nutrition" value="Protein target set" tone="amber" />
          <MiniStat label="Coach review" value="Draft ready" tone="emerald" />
        </div>
      </div>
    </AppStillShell>
  );
}

function PlanStill() {
  const planDays = [
    ["Mon", "Lower body strength", "Squat pattern + core"],
    ["Wed", "Mobility reset", "Hips, t-spine, breath"],
    ["Fri", "Full body build", "Push, pull, hinge"],
  ] as const;

  return (
    <AppStillShell
      accent="from-cyan-200 via-sky-300 to-blue-500"
      eyebrow="Draft plan"
      Icon={ClipboardCheck}
      title="Training week"
    >
      <div className="grid h-full grid-cols-[1fr_0.9fr] gap-3">
        <div className="space-y-2">
          {planDays.map(([day, title, detail]) => (
            <div
              className="grid grid-cols-[2.1rem_1fr] gap-2 rounded-lg border border-white/10 bg-white/[0.04] p-2.5"
              key={day}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-400/12 text-[10px] font-black uppercase text-sky-100">
                {day}
              </div>
              <div className="min-w-0">
                <div className="truncate text-xs font-black text-white">
                  {title}
                </div>
                <div className="mt-0.5 truncate text-[9px] font-bold text-slate-500">
                  {detail}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="grid gap-2">
          <MiniStat label="Equipment" value="Dumbbells + bands" />
          <MiniStat label="Recovery" value="Sleep + soreness aware" tone="amber" />
          <MiniStat label="Status" value="Needs coach approval" tone="emerald" />
        </div>
      </div>
    </AppStillShell>
  );
}

function WorkoutBuilderStill() {
  return (
    <AppStillShell
      accent="from-violet-200 via-cyan-300 to-emerald-300"
      eyebrow="Recommendation demo"
      Icon={Dumbbell}
      title="5 exercise build"
    >
      <div className="grid h-full grid-cols-[0.88fr_1.12fr] gap-3">
        <div className="flex flex-col justify-between rounded-lg border border-cyan-200/16 bg-cyan-300/8 p-3">
          <div>
            <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.14em] text-cyan-100">
              <Sparkles aria-hidden="true" className="h-3.5 w-3.5" />
              Match rules
            </div>
            <div className="mt-3 space-y-2">
              {["Low-back friendly", "Home equipment", "Strength + mobility"].map(
                (rule) => (
                  <div
                    className="rounded-md border border-white/10 bg-slate-950/50 px-2.5 py-2 text-[10px] font-bold text-slate-200"
                    key={rule}
                  >
                    {rule}
                  </div>
                ),
              )}
            </div>
          </div>
          <div className="rounded-md bg-slate-950/60 p-2">
            <div className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-500">
              Match score
            </div>
            <div className="mt-1 text-2xl font-black text-cyan-100">91%</div>
          </div>
        </div>

        <div className="space-y-1">
          {workoutRecommendations.map((exercise, index) => (
            <div
              className="grid grid-cols-[1.25rem_1fr_auto] items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.04] px-2 py-1"
              key={exercise.name}
            >
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-sky-500 text-[9px] font-black text-white">
                {index + 1}
              </div>
              <div className="min-w-0">
                <div className="truncate text-[10px] font-black text-white">
                  {exercise.name}
                </div>
                <div className="truncate text-[7px] font-bold text-slate-500">
                  {exercise.reason}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[7px] font-black uppercase tracking-[0.1em] text-cyan-200">
                  {exercise.type}
                </div>
                <div className="text-[8px] font-bold text-slate-300">
                  {exercise.dose}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppStillShell>
  );
}

function WorkoutStill() {
  return (
    <AppStillShell
      accent="from-emerald-200 via-cyan-300 to-sky-400"
      eyebrow="Live session"
      Icon={CheckCircle2}
      title="Complete workout"
    >
      <div className="grid h-full grid-cols-[1fr_0.9fr] gap-3">
        <div className="space-y-2">
          {workoutRecommendations.map((exercise, index) => {
            const isDone = index < 3;
            return (
              <div
                className="grid grid-cols-[1.4rem_1fr_auto] items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] p-2"
                key={exercise.name}
              >
                <div
                  className={`flex h-5 w-5 items-center justify-center rounded-full border text-[9px] font-black ${
                    isDone
                      ? "border-emerald-200/60 bg-emerald-300 text-slate-950"
                      : "border-sky-300/30 bg-slate-950/60 text-sky-100"
                  }`}
                >
                  {isDone ? "OK" : index + 1}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-[11px] font-black text-white">
                    {exercise.name}
                  </div>
                  <div className="truncate text-[8px] font-bold text-slate-500">
                    {exercise.dose}
                  </div>
                </div>
                <div className="text-[9px] font-black uppercase tracking-[0.08em] text-slate-400">
                  {isDone ? "Done" : "Next"}
                </div>
              </div>
            );
          })}
        </div>
        <div className="grid gap-2">
          <MiniStat label="Elapsed" value="32:18" tone="emerald" />
          <MiniStat label="Current" value="Step-up set 2" />
          <MiniStat label="Coach note" value="Keep ribs stacked" tone="amber" />
          <MiniStat label="Session" value="68% complete" tone="emerald" />
        </div>
      </div>
    </AppStillShell>
  );
}

function ResultsStill() {
  const metrics = [
    ["Readiness", "87%", "w-[87%]"],
    ["Effort", "7/10", "w-[70%]"],
    ["Soreness", "2/10", "w-[24%]"],
  ] as const;

  return (
    <AppStillShell
      accent="from-amber-200 via-cyan-200 to-sky-500"
      eyebrow="Analysis"
      Icon={BarChart3}
      title="Next best move"
    >
      <div className="grid h-full grid-cols-[0.95fr_1.05fr] gap-3">
        <div className="space-y-2 rounded-lg border border-white/10 bg-white/[0.04] p-3">
          {metrics.map(([label, value, width]) => (
            <div key={label}>
              <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">
                <span>{label}</span>
                <span className="text-slate-200">{value}</span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-950/70">
                <div
                  className={`h-full rounded-full bg-gradient-to-r from-cyan-300 via-emerald-200 to-amber-200 ${width}`}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="grid gap-2">
          <MiniStat
            label="Result"
            value="Completed 5/5 movements"
            tone="emerald"
          />
          <MiniStat
            label="Recommendation"
            value="Add 5 lb to goblet squat"
            tone="sky"
          />
          <MiniStat
            label="Next objective"
            value="Movement baseline review"
            tone="amber"
          />
        </div>
      </div>
    </AppStillShell>
  );
}

function PreviewStill({ slide }: { slide: AppPreviewSlide }) {
  if (slide.id === "profile") {
    return <ProfileStill />;
  }

  if (slide.id === "goals") {
    return <GoalsStill />;
  }

  if (slide.id === "plan") {
    return <PlanStill />;
  }

  if (slide.id === "builder") {
    return <WorkoutBuilderStill />;
  }

  if (slide.id === "workout") {
    return <WorkoutStill />;
  }

  return <ResultsStill />;
}

export default function MarketingAppOrbitPreview() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [joystickDirection, setJoystickDirection] =
    useState<HorizontalJoystickDirection | null>(null);
  const [joystickDragging, setJoystickDragging] = useState(false);
  const joystickClickSuppressedRef = useRef(false);
  const joystickPointerStartXRef = useRef<number | null>(null);
  const joystickResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const pointerStartXRef = useRef<number | null>(null);

  const activeSlide = appPreviewSlides[activeIndex] ?? appPreviewSlides[0];
  const activeSlideTone = appPreviewToneStyles[activeSlide.tone];

  const rotate = (direction: -1 | 1) => {
    setActiveIndex((currentIndex) =>
      positiveMod(currentIndex + direction, appPreviewSlides.length),
    );
  };

  const pulseJoystick = (direction: HorizontalJoystickDirection) => {
    if (joystickResetTimerRef.current) {
      clearTimeout(joystickResetTimerRef.current);
    }

    setJoystickDirection(direction);
    joystickResetTimerRef.current = setTimeout(() => {
      setJoystickDirection(null);
      joystickResetTimerRef.current = null;
    }, 280);
  };

  const rotateWithJoystick = (
    direction: -1 | 1,
    activeDirection: HorizontalJoystickDirection = direction === -1
      ? "left"
      : "right",
  ) => {
    pulseJoystick(activeDirection);
    rotate(direction);
  };

  const activeLabel = useMemo(
    () => `${activeSlide.label}: ${activeSlide.helper}`,
    [activeSlide],
  );

  useEffect(() => {
    return () => {
      if (joystickResetTimerRef.current) {
        clearTimeout(joystickResetTimerRef.current);
      }
    };
  }, []);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      rotate(-1);
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      rotate(1);
    }
  };

  const handleJoystickClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();

    if (joystickClickSuppressedRef.current) {
      event.preventDefault();
      joystickClickSuppressedRef.current = false;
      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();
    const clickedLeft = event.clientX < bounds.left + bounds.width / 2;
    rotateWithJoystick(clickedLeft ? -1 : 1, clickedLeft ? "left" : "right");
  };

  const handleJoystickKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      event.stopPropagation();
      rotateWithJoystick(-1, "left");
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      event.stopPropagation();
      rotateWithJoystick(1, "right");
    }
  };

  const handleJoystickPointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    joystickClickSuppressedRef.current = false;
    joystickPointerStartXRef.current = event.clientX;
    setJoystickDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleJoystickPointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    const pointerStartX = joystickPointerStartXRef.current;

    if (pointerStartX === null) {
      return;
    }

    const movement = event.clientX - pointerStartX;

    if (Math.abs(movement) > 8) {
      setJoystickDirection(movement > 0 ? "right" : "left");
    }
  };

  const finishJoystickPointer = (event: PointerEvent<HTMLButtonElement>) => {
    const pointerStartX = joystickPointerStartXRef.current;
    joystickPointerStartXRef.current = null;
    setJoystickDragging(false);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (pointerStartX === null) {
      return;
    }

    const movement = event.clientX - pointerStartX;

    if (Math.abs(movement) > 28) {
      const physicalDirection = movement > 0 ? "right" : "left";
      joystickClickSuppressedRef.current = true;
      rotateWithJoystick(movement > 0 ? 1 : -1, physicalDirection);
      return;
    }

    if (joystickResetTimerRef.current) {
      clearTimeout(joystickResetTimerRef.current);
    }

    joystickResetTimerRef.current = setTimeout(() => {
      setJoystickDirection(null);
      joystickResetTimerRef.current = null;
    }, 140);
  };

  const cancelJoystickPointer = (event: PointerEvent<HTMLButtonElement>) => {
    if (joystickPointerStartXRef.current === null) {
      return;
    }

    joystickPointerStartXRef.current = null;
    joystickClickSuppressedRef.current = false;
    setJoystickDragging(false);
    setJoystickDirection(null);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleJoystickWheel = (event: WheelEvent<HTMLButtonElement>) => {
    const dominantDelta =
      Math.abs(event.deltaX) > Math.abs(event.deltaY)
        ? event.deltaX
        : event.deltaY;

    if (Math.abs(dominantDelta) < 2) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    rotateWithJoystick(
      dominantDelta > 0 ? 1 : -1,
      dominantDelta > 0 ? "right" : "left",
    );
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    pointerStartXRef.current = event.clientX;
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const pointerStartX = pointerStartXRef.current;
    pointerStartXRef.current = null;

    if (pointerStartX === null) {
      return;
    }

    const movement = event.clientX - pointerStartX;

    if (Math.abs(movement) > 36) {
      rotate(movement > 0 ? -1 : 1);
    }
  };

  return (
    <section
      aria-label="Member app journey preview cards"
      className="relative min-h-[790px] select-none py-1 sm:min-h-[720px]"
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <div className="pointer-events-none absolute -inset-x-12 top-10 h-[560px] bg-[radial-gradient(ellipse_at_50%_44%,rgba(56,189,248,0.18),rgba(14,165,233,0.08)_34%,rgba(2,7,19,0.32)_48%,transparent_72%)]" />
      <div className="pointer-events-none absolute left-1/2 top-[47%] h-72 w-[86%] -translate-x-1/2 rounded-full border border-sky-300/12 opacity-70" />
      <div className="pointer-events-none absolute left-1/2 top-[47%] h-48 w-[64%] -translate-x-1/2 rounded-full border border-amber-200/10 opacity-60" />

      <div className="relative z-10 flex items-start justify-between gap-4">
        <div>
          <div className="text-[11px] font-black uppercase tracking-[0.22em] text-sky-300">
            Member app preview
          </div>
          <h2 className="mt-3 max-w-xl text-3xl font-black uppercase leading-[0.9] text-white sm:text-4xl">
            Preview the member journey in the app.
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">
            Swipe through profile, goals, planning, workout building, workout
            completion, and results analysis screens.
          </p>
        </div>
        <div className="hidden h-16 w-16 shrink-0 [perspective:780px] sm:block">
          <DashboardSpinningSoundCoin3D
            className="h-full w-full drop-shadow-[0_0_18px_rgba(226,232,240,0.3)]"
            tone="black"
            variant="treasure"
          />
        </div>
      </div>

      <div aria-live="polite" className="sr-only">
        {activeLabel}
      </div>

      <div
        className="relative z-10 mt-8 h-[500px] [perspective:1200px] sm:h-[450px]"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
      >
        <div className="absolute inset-0 [transform-style:preserve-3d]">
          {appPreviewSlides.map((slide, index) => {
            const distance = getOrbitDistance(index, activeIndex);
            const absDistance = Math.abs(distance);
            const isActive = distance === 0;
            const isHidden = absDistance > 2;
            const visibleDistance = Math.max(-2, Math.min(2, distance));
            const translateX = visibleDistance * 43;
            const rotateY = visibleDistance * -22;
            const translateZ = isActive ? 82 : -94 - absDistance * 18;
            const scale = isActive ? 1 : 0.77;

            return (
              <article
                aria-hidden={!isActive}
                className={`absolute left-1/2 top-1/2 h-[458px] w-[86%] max-w-[520px] overflow-hidden rounded-2xl border bg-slate-950/90 p-2 shadow-2xl transition-all duration-500 ease-out sm:h-[418px] sm:w-[78%] ${
                  isActive
                    ? "border-sky-300/45 opacity-100"
                    : isHidden
                      ? "pointer-events-none border-white/0 opacity-0"
                      : "border-white/10 opacity-52"
                }`}
                key={slide.id}
                style={{
                  transform: `translate(-50%, -50%) translateX(${translateX}%) translateZ(${translateZ}px) rotateY(${rotateY}deg) scale(${scale})`,
                  zIndex: 20 - absDistance,
                }}
              >
                <div className={`h-1.5 rounded-full bg-gradient-to-r ${slide.accent}`} />
                <div className="flex items-center justify-between gap-3 px-3 py-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-sky-300/22 bg-sky-400/10 text-sky-100">
                      <slide.Icon
                        aria-hidden="true"
                        className="h-[18px] w-[18px]"
                        strokeWidth={2.5}
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">
                        {String(index + 1).padStart(2, "0")} {slide.label}
                      </div>
                      <div className="mt-1 truncate text-base font-black uppercase leading-none text-white sm:text-lg">
                        {slide.title}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-rose-300/70" />
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-200/70" />
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-300/70" />
                  </div>
                </div>
                <div className="h-[366px] sm:h-[328px]">
                  <PreviewStill slide={slide} />
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <div className="relative z-10 mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-start">
        <div className="flex w-full items-center gap-2 overflow-visible sm:w-auto [perspective:900px]">
          <button
            aria-label="Journey card horizontal joystick"
            className={`dashboard-header-scroll-button dashboard-header-scroll-button--horizontal grid place-items-center overflow-visible border border-cyan-100/16 bg-slate-950/32 text-cyan-50 shadow-[0_14px_30px_rgba(0,0,0,0.26),inset_0_1px_0_rgba(255,255,255,0.09)] outline-none transition hover:border-amber-100/34 hover:bg-cyan-300/8 active:scale-95 focus-visible:ring-2 focus-visible:ring-cyan-100/45 [perspective:420px] [touch-action:none] ${
              joystickDragging
                ? "dashboard-header-scroll-button--dragging cursor-grabbing border-amber-100/44 bg-amber-300/10"
                : "cursor-pointer"
            } ${
              joystickDirection
                ? `dashboard-header-scroll-button--${joystickDirection}`
                : ""
            }`}
            data-dashboard-tooltip="Slide journey cards"
            onClick={handleJoystickClick}
            onKeyDown={handleJoystickKeyDown}
            onPointerCancel={cancelJoystickPointer}
            onPointerDown={handleJoystickPointerDown}
            onLostPointerCapture={cancelJoystickPointer}
            onPointerMove={handleJoystickPointerMove}
            onPointerUp={finishJoystickPointer}
            onWheel={handleJoystickWheel}
            style={
              {
                ...activeSlideTone.effectStyle,
                "--dashboard-header-scroll-button-roll":
                  joystickDirection === "left"
                    ? "-16deg"
                    : joystickDirection === "right"
                      ? "16deg"
                      : "0deg",
                "--dashboard-header-scroll-button-tilt-x": "7deg",
                "--dashboard-header-scroll-button-tilt-y":
                  joystickDirection === "left"
                    ? "-16deg"
                    : joystickDirection === "right"
                      ? "16deg"
                      : "0deg",
                "--dashboard-analog-offset-x":
                  joystickDirection === "left"
                    ? "-5px"
                    : joystickDirection === "right"
                      ? "5px"
                      : "0px",
                "--dashboard-analog-offset-y": "0px",
              } as CSSProperties
            }
            type="button"
          >
            <DashboardScrollButton3D
              active={joystickDragging || Boolean(joystickDirection)}
              activeDirection={joystickDirection}
              className="dashboard-header-scroll-button__webgl"
              compact
              horizontal
              tone={activeSlide.tone}
            />
          </button>

          <div
            aria-label="Journey card tabs"
            className="relative h-16 min-w-[15.5rem] flex-1 overflow-visible [perspective:640px] [transform-style:preserve-3d] sm:flex-none"
            role="group"
          >
            {appPreviewSlides.map((slide, index) => {
              const isActiveSlide = index === activeIndex;
              const slideTone = appPreviewToneStyles[slide.tone];
              const slideDistance = getOrbitDistance(index, activeIndex);
              const orbitDistance = Math.min(
                Math.abs(slideDistance),
                appPreviewJourneyOrbitSlots.length - 1,
              );
              const orbitDirection = Math.sign(slideDistance);
              const orbitSlot = appPreviewJourneyOrbitSlots[orbitDistance];

              return (
                <button
                  aria-label={`Show ${slide.label}`}
                  aria-pressed={isActiveSlide}
                  className={`dashboard-header-journey-tab absolute left-1/2 top-1/2 isolate grid h-8 w-8 place-items-center overflow-visible rounded-full bg-transparent text-cyan-100 transition-[filter,opacity,transform,color] duration-300 hover:brightness-125 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-100/55 active:scale-95 ${
                    isActiveSlide
                      ? "dashboard-header-journey-tab--active"
                      : "hover:opacity-100"
                  }`}
                  key={slide.id}
                  onClick={() => {
                    setActiveIndex(index);
                    if (slideDistance !== 0) {
                      pulseJoystick(slideDistance < 0 ? "left" : "right");
                    }
                  }}
                  style={{
                    ...slideTone.effectStyle,
                    filter: `blur(${orbitSlot.blur}px)`,
                    opacity: orbitSlot.opacity,
                    transform: `translate(-50%, -50%) translate3d(${
                      orbitDirection * orbitSlot.x
                    }px, ${orbitSlot.y}px, ${orbitSlot.z}px) rotateY(${
                      orbitDirection * -orbitSlot.rotateY
                    }deg) scale(${orbitSlot.scale})`,
                    zIndex: orbitSlot.zIndex,
                  }}
                  type="button"
                >
                  <span className="sr-only">{slide.label}</span>
                  <AppPreviewJourneyBall
                    isActive={isActiveSlide}
                    slide={slide}
                  />
                </button>
              );
            })}
          </div>
        </div>

        <div className="sm:pl-3">
          <div className="flex items-center gap-2.5">
            <span
              aria-hidden="true"
              className="dashboard-header-journey-tab dashboard-header-journey-tab--active relative isolate grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full bg-transparent text-cyan-100 [transform-style:preserve-3d]"
              style={activeSlideTone.effectStyle}
            >
              <AppPreviewJourneyBall isActive slide={activeSlide} />
            </span>
            <div
              className={`text-[10px] font-black uppercase tracking-[0.18em] ${activeSlideTone.labelText}`}
            >
              {activeSlide.label}
            </div>
          </div>
          <p className="mt-2 max-w-md text-sm leading-6 text-slate-300">
            {activeSlide.helper}
          </p>
        </div>
      </div>
    </section>
  );
}
