"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  readActiveWorkoutBuilderSessionTemplate,
  type LocalWorkoutBuilderSessionTemplate,
  type LocalWorkoutBuilderTemplate,
  writeActiveWorkoutBuilderSessionTemplate,
} from "@/lib/localData/workoutBuilderData";
import {
  loadWorkoutLogEntriesWithFallback,
  loadWorkoutTemplatesWithFallback,
} from "@/lib/data/workoutPersistence";
import { ROUTES } from "@/lib/routes";
import type { LocalExerciseStatEntry } from "@/types";

type PlanMode = "coach" | "custom" | "hybrid";

type SourceResult = {
  source: "supabase" | "localStorage";
  error: string | null;
};

type RecentWorkoutSummary = {
  id: string;
  date: string;
  title: string;
  exerciseCount: number;
  totalSets: number;
  latestExercise: string;
  exerciseNames: string[];
};

const formatDateTime = (value?: string) => {
  if (!value) return "No activity yet";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
};

const getSourceLabel = ({ source, error }: SourceResult) => {
  if (source === "supabase") return "Supabase";

  return error && !error.includes("No authenticated Supabase user")
    ? "error fallback"
    : "localStorage fallback";
};

const buildRecentWorkoutSummaries = (
  entries: LocalExerciseStatEntry[],
): RecentWorkoutSummary[] => {
  const workoutEntries = entries.filter(
    (entry) => entry.source === "workout-session",
  );
  const sourceEntries = workoutEntries.length > 0 ? workoutEntries : entries;
  const groups = sourceEntries.reduce<Map<string, LocalExerciseStatEntry[]>>(
    (acc, entry) => {
      const key = entry.date || "unknown-date";
      acc.set(key, [...(acc.get(key) || []), entry]);
      return acc;
    },
    new Map(),
  );

  return Array.from(groups.entries())
    .map(([date, group]) => {
      const sortedGroup = [...group].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );
      const exerciseNames = Array.from(
        new Set(sortedGroup.map((entry) => entry.exerciseName).filter(Boolean)),
      );
      const latest = sortedGroup[0];

      return {
        id: `${date}-${exerciseNames.join("-")}`,
        date,
        title:
          exerciseNames.length === 1
            ? exerciseNames[0]
            : `${exerciseNames.length} movement workout`,
        exerciseCount: exerciseNames.length,
        totalSets: sortedGroup.reduce(
          (sum, entry) => sum + Number(entry.sets || 0),
          0,
        ),
        latestExercise: latest?.exerciseName || "Workout",
        exerciseNames,
      };
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 4);
};

const plans = {
  coach: {
    title: "Strength + Mobility Phase 1",
    type: "Coach Plan",
    phase: "Foundation",
    goal: "Build strength, improve mobility, and stay consistent",
    split: "Upper / Lower",
    weeklyTarget: "4 workouts",
    restDays: "2 recovery days",
    sessionTypes: "Strength - Mobility - Assisted Stretch",
    primaryFocus: "Strength",
    secondaryFocus: "Core stability + mobility",
    weakPoints: ["Glutes undertrained", "Upper pull volume low"],
    recovery: "Ready",
    progression: "+5 lbs when all reps are completed with clean form",
    rule: "Stop 1-2 reps before failure unless coach says otherwise.",
    note: "Follow the planned sequence. Keep lower body controlled and prioritize clean reps.",
    workouts: [
      "Lower Body Strength",
      "Upper Push + Core",
      "Upper Pull + Mobility",
    ],
  },
  custom: {
    title: "My Custom Plan",
    type: "Custom Plan",
    phase: "Flexible",
    goal: "Train based on personal preference while staying balanced",
    split: "User Selected",
    weeklyTarget: "3-5 workouts",
    restDays: "As needed",
    sessionTypes: "Custom Strength - Conditioning - Mobility",
    primaryFocus: "Personal preference",
    secondaryFocus: "App-guided balance",
    weakPoints: ["Needs push/pull review", "Needs recovery check"],
    recovery: "Needs Review",
    progression: "Add reps first, then weight when form stays clean.",
    rule: "If soreness is high, reduce volume by 20% or choose mobility.",
    note: "Build freely, but use app warnings to avoid imbalance.",
    workouts: ["Choose Workout", "Build Session", "Save Template"],
  },
  hybrid: {
    title: "Hybrid Strength Plan",
    type: "Hybrid Plan",
    phase: "Build",
    goal: "Let the client choose while the system keeps training balanced",
    split: "Guided Flexible",
    weeklyTarget: "4 workouts",
    restDays: "1-2 recovery days",
    sessionTypes: "Strength - Mobility - Optional Conditioning",
    primaryFocus: "Smart autonomy",
    secondaryFocus: "Weak-point correction",
    weakPoints: ["Posterior chain priority", "Core endurance"],
    recovery: "Balanced",
    progression: "Progress when heat map and recovery both look ready.",
    rule: "Choose what you enjoy, but follow recovery and volume guardrails.",
    note: "Best option: client preference plus coach/program guardrails.",
    workouts: ["Lower Body Priority", "Upper Strength", "Mobility + Core"],
  },
} as const;

const volumeTargets = [
  { muscle: "Chest", target: 14, completed: 9 },
  { muscle: "Back", target: 16, completed: 7 },
  { muscle: "Legs", target: 18, completed: 10 },
  { muscle: "Core", target: 12, completed: 6 },
] as const;

const packages = [
  {
    name: "4 Session Pack",
    total: 4,
    used: 1,
    price: "$440",
    status: "Starter",
  },
  {
    name: "12 Session Pack",
    total: 12,
    used: 5,
    price: "$1,260",
    status: "Active",
  },
  {
    name: "24 Session Pack",
    total: 24,
    used: 9,
    price: "$2,400",
    status: "Best Value",
  },
] as const;

const upcomingSessions = [
  {
    date: "Apr 26",
    type: "Video Review",
    focus: "Workout Review",
    status: "Upcoming",
  },
  {
    date: "Apr 22",
    type: "In-Home Strength",
    focus: "Lower Body + Core",
    status: "Completed",
  },
  {
    date: "Apr 18",
    type: "In-Home Strength",
    focus: "Upper Body + Mobility",
    status: "Completed",
  },
] as const;

export default function SessionsPage() {
  const router = useRouter();
  const [selectedPackage, setSelectedPackage] = useState("12 Session Pack");
  const [planMode, setPlanMode] = useState<PlanMode>("coach");
  const [savedTemplates, setSavedTemplates] = useState<
    LocalWorkoutBuilderTemplate[]
  >([]);
  const [activeSessionTemplate, setActiveSessionTemplate] =
    useState<LocalWorkoutBuilderSessionTemplate | null>(null);
  const [templateSourceLabel, setTemplateSourceLabel] =
    useState("Loading templates");
  const [workoutLogEntries, setWorkoutLogEntries] = useState<
    LocalExerciseStatEntry[]
  >([]);
  const [logSourceLabel, setLogSourceLabel] = useState("Loading logs");
  const [launcherMessage, setLauncherMessage] = useState("");

  useEffect(() => {
    let isActive = true;

    async function loadCommandCenterData() {
      const [templateResult, logResult] = await Promise.all([
        loadWorkoutTemplatesWithFallback(),
        loadWorkoutLogEntriesWithFallback(),
      ]);

      if (!isActive) return;

      setSavedTemplates(templateResult.data);
      setTemplateSourceLabel(getSourceLabel(templateResult));
      setWorkoutLogEntries(logResult.data);
      setLogSourceLabel(getSourceLabel(logResult));
    }

    setActiveSessionTemplate(readActiveWorkoutBuilderSessionTemplate());
    void loadCommandCenterData();

    return () => {
      isActive = false;
    };
  }, []);

  const activePlan = plans[planMode];
  const active =
    packages.find((pkg) => pkg.name === selectedPackage) || packages[1];
  const remaining = active.total - active.used;
  const percentUsed = Math.round((active.used / active.total) * 100);

  const recentWorkoutSummaries = useMemo(
    () => buildRecentWorkoutSummaries(workoutLogEntries),
    [workoutLogEntries],
  );

  const workoutStats = useMemo(() => {
    const workoutOnlyEntries = workoutLogEntries.filter(
      (entry) => entry.source === "workout-session",
    );
    const entriesToMeasure =
      workoutOnlyEntries.length > 0 ? workoutOnlyEntries : workoutLogEntries;
    const sorted = [...entriesToMeasure].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );

    return {
      loggedEntries: entriesToMeasure.length,
      totalSets: entriesToMeasure.reduce(
        (sum, entry) => sum + Number(entry.sets || 0),
        0,
      ),
      latestExercise: sorted[0]?.exerciseName || "No workout logged yet",
      latestDate: formatDateTime(sorted[0]?.date),
    };
  }, [workoutLogEntries]);

  const commandLinks = [
    {
      title: "Workout Builder",
      href: ROUTES.workoutBuilder.home,
      detail: "Create templates, choose exercises, or build a plan-ready workout.",
    },
    {
      title: "Exercise Library",
      href: ROUTES.workoutBuilder.exerciseLibrary,
      detail: "Browse normalized exercises, add stats, or choose movements.",
    },
    {
      title: "My Plan",
      href: ROUTES.dashboard.myPlan,
      detail: "Review the weekly training structure and planned workout focus.",
    },
    {
      title: "Create/Edit Plan",
      href: ROUTES.dashboard.createMyPlan,
      detail: "Outline training days, focus areas, and weekly plan notes.",
    },
    {
      title: "Session History",
      href: ROUTES.dashboard.sessionHistory,
      detail: "Review completed sessions and repeat past workouts later.",
    },
    {
      title: "Stats",
      href: ROUTES.dashboard.stats,
      detail: "See logged exercises, recent volume, and progress trends.",
    },
  ] as const;

  function startTemplateWorkout(template: LocalWorkoutBuilderTemplate) {
    if (template.exercises.length === 0) {
      setLauncherMessage("This template has no exercises to start.");
      return;
    }

    const sessionTemplate = writeActiveWorkoutBuilderSessionTemplate(template);

    setActiveSessionTemplate(sessionTemplate);
    setLauncherMessage(`${sessionTemplate.title} is ready in the workout logger.`);
    router.push(`${ROUTES.dashboard.sessionWorkout}?template=${template.id}`);
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.16),_transparent_30%),linear-gradient(180deg,#020617_0%,#0f172a_100%)] text-white">
      <section className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <section className="overflow-hidden rounded-[34px] border border-white/10 bg-[radial-gradient(circle_at_20%_10%,rgba(34,211,238,0.18),transparent_30%),linear-gradient(135deg,rgba(15,23,42,0.96),rgba(2,6,23,0.98))] p-5 shadow-2xl sm:rounded-[40px] sm:p-6 lg:p-8">
          <div className="grid gap-6 xl:grid-cols-[1fr_390px] xl:items-end">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.3em] text-cyan-300">
                Workout Command Center
              </p>
              <h1 className="mt-4 max-w-4xl text-3xl font-black leading-tight sm:text-5xl">
                Everything you need to work out.
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-300 sm:text-base">
                Start the logger, resume a template, choose exercises, build a
                workout, review the weekly plan, or jump into your stats from
                one place.
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link
                  href={ROUTES.dashboard.sessionWorkout}
                  className="min-h-[48px] rounded-2xl bg-cyan-400 px-5 py-4 text-center text-sm font-black uppercase tracking-[0.14em] text-slate-950 shadow-[0_0_28px_rgba(34,211,238,0.25)] transition hover:bg-cyan-300"
                >
                  Start / Resume Workout
                </Link>
                <Link
                  href={ROUTES.workoutBuilder.exerciseLibrary}
                  className="min-h-[48px] rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-center text-sm font-black uppercase tracking-[0.14em] text-slate-200 transition hover:border-cyan-300/40 hover:bg-cyan-400/10"
                >
                  Start From Library
                </Link>
                <Link
                  href={ROUTES.workoutBuilder.home}
                  className="min-h-[48px] rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-center text-sm font-black uppercase tracking-[0.14em] text-slate-200 transition hover:border-emerald-300/40 hover:bg-emerald-400/10"
                >
                  Build Workout
                </Link>
              </div>
            </div>

            <div className="rounded-[28px] border border-cyan-300/20 bg-cyan-400/10 p-5">
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-cyan-300">
                Active Workout Source
              </p>
              <h2 className="mt-3 text-2xl font-black">
                {activeSessionTemplate?.title || "Default workout logger"}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                {activeSessionTemplate
                  ? `${activeSessionTemplate.exercises.length} exercise${
                      activeSessionTemplate.exercises.length === 1 ? "" : "s"
                    } loaded from your saved templates.`
                  : "No saved template is active. The logger will open with the default workout fallback."}
              </p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <Link
                  href={ROUTES.dashboard.sessionWorkout}
                  className="min-h-[44px] rounded-2xl bg-slate-950/80 px-4 py-3 text-center text-sm font-black text-cyan-200 transition hover:bg-slate-900"
                >
                  Open Logger
                </Link>
                <Link
                  href={ROUTES.dashboard.myPlan}
                  className="min-h-[44px] rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-center text-sm font-black text-slate-200 transition hover:bg-white/10"
                >
                  View Plan
                </Link>
              </div>
              {launcherMessage ? (
                <p className="mt-4 rounded-2xl border border-emerald-300/20 bg-emerald-400/10 px-4 py-3 text-sm font-semibold text-emerald-100">
                  {launcherMessage}
                </p>
              ) : null}
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["Logged Entries", String(workoutStats.loggedEntries)],
            ["Total Sets", String(workoutStats.totalSets)],
            ["Latest Movement", workoutStats.latestExercise],
            ["Last Logged", workoutStats.latestDate],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-[26px] border border-white/10 bg-white/[0.05] p-5 shadow-xl shadow-black/15 backdrop-blur"
            >
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                {label}
              </p>
              <p className="mt-3 break-words text-2xl font-black tracking-tight text-white">
                {value}
              </p>
            </div>
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[32px] border border-white/10 bg-white/[0.05] p-5 shadow-2xl shadow-black/20 backdrop-blur sm:p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-yellow-300">
                  Start From Saved Template
                </p>
                <h2 className="mt-2 text-2xl font-black">
                  Saved workout templates
                </h2>
              </div>
              <span className="w-fit rounded-full border border-yellow-300/20 bg-yellow-400/10 px-3 py-2 text-[11px] font-black uppercase tracking-[0.14em] text-yellow-200">
                {templateSourceLabel}
              </span>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {savedTemplates.length > 0 ? (
                savedTemplates.slice(0, 6).map((template) => (
                  <article
                    key={template.id}
                    className="rounded-[24px] border border-white/10 bg-slate-950/55 p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h3 className="text-base font-black text-white">
                          {template.title}
                        </h3>
                        <p className="mt-1 text-xs text-slate-400">
                          {template.exercises.length} exercise
                          {template.exercises.length === 1 ? "" : "s"}
                        </p>
                      </div>
                      {activeSessionTemplate?.id === template.id ? (
                        <span className="w-fit rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1 text-xs font-black text-cyan-200">
                          Active
                        </span>
                      ) : null}
                    </div>

                    <p className="mt-3 min-h-[40px] text-sm leading-5 text-slate-400">
                      {template.exercises
                        .slice(0, 3)
                        .map((exercise) => exercise.name)
                        .join(" / ")}
                      {template.exercises.length > 3 ? " / ..." : ""}
                    </p>

                    <button
                      type="button"
                      onClick={() => startTemplateWorkout(template)}
                      className="mt-4 min-h-[44px] w-full rounded-2xl bg-gradient-to-r from-yellow-300 to-yellow-500 px-4 py-3 text-sm font-black text-slate-950 transition hover:scale-[1.01]"
                    >
                      Start Template
                    </button>
                  </article>
                ))
              ) : (
                <div className="rounded-[24px] border border-dashed border-white/15 bg-slate-950/35 p-5 text-sm leading-6 text-slate-400 md:col-span-2">
                  No saved templates yet. Build and save a workout template,
                  then it will appear here as a one-tap workout start.
                  <div className="mt-4">
                    <Link
                      href={ROUTES.workoutBuilder.home}
                      className="inline-flex min-h-[44px] items-center rounded-2xl bg-yellow-300 px-4 text-sm font-black text-slate-950"
                    >
                      Build Template
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[32px] border border-white/10 bg-white/[0.05] p-5 shadow-2xl shadow-black/20 backdrop-blur sm:p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-emerald-300">
                  Recent Completed Sessions
                </p>
                <h2 className="mt-2 text-2xl font-black">Workout log</h2>
              </div>
              <span className="w-fit rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-2 text-[11px] font-black uppercase tracking-[0.14em] text-emerald-200">
                {logSourceLabel}
              </span>
            </div>

            <div className="mt-5 space-y-3">
              {recentWorkoutSummaries.length > 0 ? (
                recentWorkoutSummaries.map((session) => (
                  <article
                    key={session.id}
                    className="rounded-[24px] border border-white/10 bg-slate-950/55 p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h3 className="text-base font-black text-white">
                          {session.title}
                        </h3>
                        <p className="mt-1 text-xs text-slate-400">
                          {formatDateTime(session.date)}
                        </p>
                      </div>
                      <span className="w-fit rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-xs font-black text-emerald-200">
                        Completed
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-5 text-slate-400">
                      Latest: {session.latestExercise}
                    </p>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                        <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">
                          Movements
                        </p>
                        <p className="mt-1 text-lg font-black text-white">
                          {session.exerciseCount}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                        <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">
                          Sets
                        </p>
                        <p className="mt-1 text-lg font-black text-white">
                          {session.totalSets}
                        </p>
                      </div>
                    </div>
                  </article>
                ))
              ) : (
                <div className="rounded-[24px] border border-dashed border-white/15 bg-slate-950/35 p-5 text-sm leading-6 text-slate-400">
                  No completed workout logs yet. Start the workout logger,
                  finish a session, and recent activity will appear here.
                </div>
              )}
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Link
                href={ROUTES.dashboard.sessionHistory}
                className="min-h-[44px] rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-center text-sm font-black text-slate-200 transition hover:bg-white/10"
              >
                Session History
              </Link>
              <Link
                href={ROUTES.dashboard.stats}
                className="min-h-[44px] rounded-2xl bg-emerald-400 px-4 py-3 text-center text-sm font-black text-slate-950 transition hover:bg-emerald-300"
              >
                View Stats
              </Link>
            </div>
          </div>
        </section>

        <section className="rounded-[32px] border border-white/10 bg-white/[0.05] p-5 shadow-2xl shadow-black/20 backdrop-blur sm:p-6">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-cyan-300">
            Workout Actions
          </p>
          <h2 className="mt-2 text-2xl font-black">
            Jump to the right workout tool
          </h2>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {commandLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group rounded-[24px] border border-white/10 bg-slate-950/55 p-4 transition hover:border-cyan-300/40 hover:bg-cyan-400/10"
              >
                <h3 className="text-base font-black text-white">
                  {item.title}
                </h3>
                <p className="mt-2 min-h-[44px] text-sm leading-6 text-slate-400">
                  {item.detail}
                </p>
                <div className="mt-3 text-xs font-black uppercase tracking-[0.16em] text-cyan-300 transition group-hover:translate-x-1">
                  Open
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="rounded-[32px] border border-white/10 bg-white/[0.04] p-5 shadow-2xl sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-emerald-300">
                Current Plan Snapshot
              </p>
              <h2 className="mt-3 text-3xl font-black">{activePlan.title}</h2>
              <p className="mt-2 text-sm text-slate-400">
                {activePlan.type} - {activePlan.phase}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                ["coach", "Coach Plan"],
                ["custom", "Build My Own"],
                ["hybrid", "Hybrid"],
              ].map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setPlanMode(mode as PlanMode)}
                  className={`rounded-2xl px-4 py-2 text-xs font-black uppercase tracking-[0.14em] transition ${
                    planMode === mode
                      ? "bg-emerald-400 text-slate-950"
                      : "border border-white/10 bg-slate-950/60 text-slate-300 hover:border-emerald-300/40"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 rounded-[28px] border border-cyan-300/15 bg-cyan-400/10 p-5">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-300">
              Goal
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-200">
              {activePlan.goal}
            </p>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-4">
            {[
              ["Split", activePlan.split],
              ["Weekly Target", activePlan.weeklyTarget],
              ["Primary Focus", activePlan.primaryFocus],
              ["Recovery", activePlan.recovery],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-2xl border border-white/10 bg-slate-950/60 p-4"
              >
                <p className="text-xs text-slate-400">{label}</p>
                <p className="mt-2 text-lg font-black text-white">{value}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_0.9fr]">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-cyan-300">
                Next 3 Workouts
              </p>

              <div className="mt-4 space-y-3">
                {activePlan.workouts.map((workout, index) => (
                  <div
                    key={workout}
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3"
                  >
                    <div>
                      <p className="text-xs text-slate-500">
                        Workout {index + 1}
                      </p>
                      <p className="font-bold">{workout}</p>
                    </div>
                    <span className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1 text-xs font-bold text-cyan-300">
                      Planned
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[28px] border border-emerald-300/15 bg-emerald-400/10 p-5">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-300">
                Plan Direction
              </p>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                {activePlan.note}
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href={ROUTES.dashboard.myPlan}
                  className="rounded-2xl bg-emerald-400 px-4 py-3 text-xs font-black uppercase tracking-[0.14em] text-slate-950 hover:bg-emerald-300"
                >
                  Open Plan
                </Link>
                <Link
                  href={ROUTES.workoutBuilder.home}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-xs font-black uppercase tracking-[0.14em] text-slate-200 hover:border-emerald-300/40"
                >
                  Edit In Builder
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[32px] border border-white/10 bg-white/[0.04] p-5 shadow-2xl sm:p-6">
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">
              Secondary Session Tools
            </p>
            <h2 className="mt-3 text-2xl font-black">Booking and packages</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Session package details still live here, but the primary workout
              flow now starts from the command center above.
            </p>

            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <div className="rounded-[24px] border border-white/10 bg-slate-950/60 p-4">
                <p className="text-sm text-slate-400">Active Package</p>
                <p className="mt-2 text-xl font-bold text-sky-300">
                  {active.name}
                </p>
              </div>
              <div className="rounded-[24px] border border-emerald-400/20 bg-emerald-500/10 p-4">
                <p className="text-sm text-emerald-300">Remaining</p>
                <p className="mt-2 text-3xl font-bold">{remaining}</p>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-slate-950/60 p-4">
                <p className="text-sm text-slate-400">Used</p>
                <p className="mt-2 text-3xl font-bold">{active.used}</p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {packages.map((pkg) => {
                const remainingSessions = pkg.total - pkg.used;

                return (
                  <button
                    key={pkg.name}
                    onClick={() => setSelectedPackage(pkg.name)}
                    className={`w-full rounded-[22px] border p-4 text-left transition ${
                      selectedPackage === pkg.name
                        ? "border-sky-400 bg-sky-500/15"
                        : "border-white/10 bg-slate-950/60 hover:bg-white/10"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-bold">{pkg.name}</h3>
                        <p className="mt-1 text-sm text-slate-400">
                          {pkg.used} used - {remainingSessions} remaining
                        </p>
                      </div>
                      <p className="text-lg font-bold text-sky-300">
                        {pkg.price}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-[32px] border border-sky-400/20 bg-sky-500/10 p-5 shadow-2xl sm:p-6">
            <p className="text-[11px] uppercase tracking-[0.24em] text-sky-300">
              Usage Progress
            </p>
            <h2 className="mt-3 text-2xl font-bold">
              {active.used} of {active.total} sessions used
            </h2>

            <div className="mt-6 h-4 overflow-hidden rounded-full bg-slate-950/70">
              <div
                className="h-full rounded-full bg-sky-400 transition-all"
                style={{ width: `${percentUsed}%` }}
              />
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-slate-950/60 p-4">
                <p className="text-sm text-slate-400">Purchased</p>
                <p className="mt-2 text-2xl font-bold">{active.total}</p>
              </div>
              <div className="rounded-2xl bg-slate-950/60 p-4">
                <p className="text-sm text-slate-400">Remaining</p>
                <p className="mt-2 text-2xl font-bold text-emerald-300">
                  {remaining}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-950/60 p-4">
                <p className="text-sm text-slate-400">Used</p>
                <p className="mt-2 text-2xl font-bold">{active.used}</p>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <Link
                href={ROUTES.dashboard.sessionBooking}
                className="rounded-2xl bg-sky-500 px-5 py-4 text-center font-bold text-slate-950 hover:bg-sky-400"
              >
                Book Session
              </Link>
              <Link
                href={ROUTES.dashboard.sessionNotes}
                className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-center font-bold text-slate-200 hover:bg-white/10"
              >
                Session Notes
              </Link>
            </div>
          </div>
        </section>

        <section className="rounded-[32px] border border-white/10 bg-white/[0.04] p-5 shadow-2xl sm:p-6">
          <p className="text-[11px] uppercase tracking-[0.24em] text-amber-300">
            Timeline
          </p>
          <h2 className="mt-3 text-2xl font-bold">
            Recent and upcoming appointments
          </h2>

          <div className="mt-5 space-y-3">
            {upcomingSessions.map((session) => (
              <div
                key={`${session.date}-${session.focus}`}
                className="grid gap-3 rounded-[24px] border border-white/10 bg-slate-950/60 p-4 md:grid-cols-4 md:items-center"
              >
                <p className="text-sm text-slate-400">{session.date}</p>
                <p className="font-semibold">{session.type}</p>
                <p className="text-sm text-slate-300">{session.focus}</p>
                <span
                  className={`w-fit rounded-full border px-3 py-1 text-xs font-semibold ${
                    session.status === "Completed"
                      ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-300"
                      : "border-sky-400/20 bg-sky-500/10 text-sky-300"
                  }`}
                >
                  {session.status}
                </span>
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
