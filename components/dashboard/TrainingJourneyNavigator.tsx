"use client";

import Link from "next/link";
import { type ReactNode } from "react";
import { ROUTES } from "@/lib/routes";

export type TrainingJourneyStepId =
  | "profile"
  | "goals"
  | "sessions"
  | "library"
  | "workout-builder"
  | "my-plan"
  | "periodized-plan"
  | "calendar"
  | "progress";

type TrainingJourneyNavigatorProps = {
  currentStep: TrainingJourneyStepId;
  showQuickActions?: boolean;
  variant?: "full" | "compact";
};

type JourneyItem = {
  available: boolean;
  emoji: string;
  href?: string;
  id: TrainingJourneyStepId;
  label: string;
  requestedHref: string;
  shortLabel: string;
  subtitle: string;
};

// Future architecture: each goal can point to its own plan page when those routes exist.
export const goalPlanRoutes = {
  "Build Muscle": "/dashboard/goals/build-muscle",
  "Lose Fat": "/dashboard/goals/lose-fat",
  Strength: "/dashboard/goals/strength",
  "General Health": "/dashboard/goals/general-health",
  Recovery: "/dashboard/goals/recovery",
  Performance: "/dashboard/goals/performance",
} as const;

export const trainingJourneySteps: JourneyItem[] = [
  {
    id: "profile",
    emoji: "🧍",
    label: "Profile",
    shortLabel: "Profile",
    subtitle: "Identity",
    requestedHref: "/dashboard/profile",
    href: ROUTES.dashboard.profile,
    available: true,
  },
  {
    id: "goals",
    emoji: "🎯",
    label: "Goals",
    shortLabel: "Goals",
    subtitle: "Direction",
    requestedHref: "/dashboard/goals",
    href: ROUTES.dashboard.goals,
    available: true,
  },
  {
    id: "sessions",
    emoji: "📅",
    label: "Sessions",
    shortLabel: "Sessions",
    subtitle: "Execute",
    requestedHref: "/dashboard/sessions",
    href: ROUTES.dashboard.sessions,
    available: true,
  },
  {
    id: "library",
    emoji: "📚",
    label: "Library",
    shortLabel: "Library",
    subtitle: "Tools",
    requestedHref: "/dashboard/exercise-library",
    href: ROUTES.dashboard.exerciseLibrary,
    available: true,
  },
  {
    id: "workout-builder",
    emoji: "🛠",
    label: "Builder",
    shortLabel: "Builder",
    subtitle: "Session",
    requestedHref: "/dashboard/workout-builder",
    href: ROUTES.workoutBuilder.home,
    available: true,
  },
  {
    id: "my-plan",
    emoji: "🗂",
    label: "My Plan",
    shortLabel: "Plan",
    subtitle: "Week",
    requestedHref: "/dashboard/plan",
    href: ROUTES.dashboard.plan,
    available: true,
  },
  {
    id: "periodized-plan",
    emoji: "🧠",
    label: "Periodized Plan",
    shortLabel: "Phases",
    subtitle: "Blocks",
    requestedHref: "/dashboard/phases",
    href: ROUTES.dashboard.phases,
    available: true,
  },
  {
    id: "calendar",
    emoji: "📆",
    label: "Calendar",
    shortLabel: "Calendar",
    subtitle: "Schedule",
    requestedHref: "/dashboard/calendar",
    href: ROUTES.dashboard.calendar,
    available: true,
  },
  {
    id: "progress",
    emoji: "📈",
    label: "Progress",
    shortLabel: "Progress",
    subtitle: "Adapt",
    requestedHref: "/dashboard/progress",
    href: ROUTES.dashboard.progress,
    available: true,
  },
];

const stepIndex = (currentStep: TrainingJourneyStepId) =>
  Math.max(
    0,
    trainingJourneySteps.findIndex((step) => step.id === currentStep),
  );

function getStatus({
  index,
  currentIndex,
  available,
}: {
  available: boolean;
  currentIndex: number;
  index: number;
}) {
  if (!available) return "Soon";
  if (index < currentIndex) return "Complete";
  if (index === currentIndex) return "Active";
  return "Next";
}

function NodeShell({
  children,
  href,
  available,
  className,
  title,
}: {
  available: boolean;
  children: ReactNode;
  className: string;
  href?: string;
  title: string;
}) {
  if (available && href) {
    return (
      <Link className={className} href={href} title={title}>
        {children}
      </Link>
    );
  }

  return (
    <button
      className={`${className} cursor-not-allowed`}
      disabled
      title={`${title} - coming soon`}
      type="button"
    >
      {children}
    </button>
  );
}

function JourneyNode({
  currentIndex,
  index,
  step,
  variant,
}: {
  currentIndex: number;
  index: number;
  step: JourneyItem;
  variant: "full" | "compact";
}) {
  const isActive = index === currentIndex;
  const isComplete = index < currentIndex && step.available;
  const status = getStatus({ available: step.available, currentIndex, index });
  const compact = variant === "compact";

  return (
    <div className="flex min-w-[154px] flex-1 items-center gap-3">
      <NodeShell
        available={step.available}
        className={`group relative flex w-full flex-col overflow-hidden rounded-2xl border transition ${
          compact ? "min-h-[82px] p-3" : "min-h-[112px] p-4"
        } ${
          isActive
            ? "border-cyan-300/45 bg-cyan-300/12 text-cyan-100 shadow-[0_0_32px_rgba(34,211,238,0.22)]"
            : isComplete
              ? "border-amber-300/30 bg-amber-400/10 text-amber-100 shadow-[0_0_24px_rgba(251,191,36,0.12)]"
              : step.available
                ? "border-white/10 bg-white/[0.045] text-slate-300 hover:border-cyan-300/25 hover:bg-white/[0.08]"
                : "border-white/10 bg-white/[0.025] text-slate-500 opacity-70"
        }`}
        href={step.href}
        title={`${step.label} - ${step.requestedHref}`}
      >
        <span
          className={`absolute left-4 right-4 top-0 h-[2px] rounded-full ${
            isActive ? "bg-cyan-200" : isComplete ? "bg-amber-200" : "bg-white/10"
          }`}
        />
        <div className="flex items-start justify-between gap-3">
          <span
            aria-hidden="true"
            className={`text-lg leading-none ${
              isActive
                ? "drop-shadow-[0_0_10px_rgba(34,211,238,0.65)]"
                : isComplete
                  ? "drop-shadow-[0_0_10px_rgba(251,191,36,0.45)]"
                  : "opacity-70 group-hover:opacity-95"
            }`}
          >
            {step.emoji}
          </span>
          <span
            className={`rounded-full border px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] ${
              isActive
                ? "border-cyan-300/30 bg-cyan-300/12 text-cyan-100"
                : isComplete
                  ? "border-amber-300/25 bg-amber-300/10 text-amber-100"
                  : "border-white/10 bg-white/[0.04] text-slate-500"
            }`}
          >
            {status}
          </span>
        </div>
        <p className="mt-3 text-sm font-black uppercase tracking-[0.14em]">
          {compact ? step.shortLabel : step.label}
        </p>
        <p className="mt-1 text-xs text-slate-400">{step.subtitle}</p>
      </NodeShell>

      {index < trainingJourneySteps.length - 1 ? (
        <div
          className={`hidden h-[2px] w-8 rounded-full 2xl:block ${
            index < currentIndex
              ? "bg-amber-300/60 shadow-[0_0_14px_rgba(251,191,36,0.35)]"
              : "bg-white/10"
          }`}
        />
      ) : null}
    </div>
  );
}

export default function TrainingJourneyNavigator({
  currentStep,
  showQuickActions = true,
  variant = "full",
}: TrainingJourneyNavigatorProps) {
  const currentIndex = stepIndex(currentStep);
  const compact = variant === "compact";

  return (
    <section
      className={`overflow-hidden rounded-[28px] border border-white/10 bg-slate-950/58 shadow-[0_0_44px_rgba(34,211,238,0.08)] backdrop-blur-xl ${
        compact ? "p-3" : "p-4"
      }`}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-200">
            Training Journey
          </p>
          <p className="mt-2 max-w-4xl text-xs leading-5 text-slate-400 sm:text-sm">
            🧍 Profile → 🎯 Goals → 📅 Sessions → 📚 Library → 🛠 Builder →
            🗂 My Plan → 🧠 Periodized Plan → 📆 Calendar → 📈 Progress
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {showQuickActions ? (
            <>
              <Link
                href={ROUTES.dashboard.sessions}
                className="rounded-full border border-white/10 bg-white/[0.045] px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-slate-300 transition hover:border-cyan-200/35 hover:bg-cyan-300/10 hover:text-white"
              >
                ← Back to Sessions
              </Link>
              <Link
                href={ROUTES.dashboard.home}
                className="rounded-full border border-white/10 bg-white/[0.045] px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-slate-300 transition hover:border-cyan-200/35 hover:bg-cyan-300/10 hover:text-white"
              >
                ← Back to Dashboard
              </Link>
            </>
          ) : null}
          <p className="rounded-full border border-amber-300/20 bg-amber-400/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-amber-100">
            {trainingJourneySteps[currentIndex]
              ? `${trainingJourneySteps[currentIndex].emoji} ${trainingJourneySteps[currentIndex].label}`
              : "Journey"}
          </p>
        </div>
      </div>

      <div className="mt-4 flex gap-3 overflow-x-auto pb-2 2xl:overflow-visible">
        {trainingJourneySteps.map((step, index) => (
          <JourneyNode
            key={step.id}
            currentIndex={currentIndex}
            index={index}
            step={step}
            variant={variant}
          />
        ))}
      </div>
    </section>
  );
}
