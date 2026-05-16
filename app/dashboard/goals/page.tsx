"use client";

import Link from "next/link";
import {
  type CSSProperties,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { writeSoundFitnessProfile } from "@/lib/profile-storage";
import { ROUTES } from "@/lib/routes";

type JsonObject = Record<string, unknown>;

type GoalId =
  | "Build Muscle"
  | "Lose Fat"
  | "Maintain"
  | "Strength"
  | "General Health"
  | "Mobility"
  | "Conditioning"
  | "Recovery"
  | "Performance";

type GoalState = {
  planDirections: GoalId[];
  primaryGoal: GoalId;
  secondaryGoal: GoalId;
  constraintGoal: string;
  goalDeadline: string;
  goalMilestones: string;
  goalPriorityRanking: string;
  currentWeight: string;
  goalWeight: string;
  targetWeeklySessions: string;
  targetWeeklySets: string;
  targetProtein: string;
  targetSteps: string;
  stepsGoal: string;
  targetSleep: string;
  waterGoal: string;
  benchmarkGoal: string;
  goalMode: string;
  motivationFocus: string;
  planDirectionNotes: string;
  updatedAt?: string;
};

type ProfileSnapshot = {
  displayName: string;
  primaryGoal: string;
  secondaryGoal: string;
  planDirections: GoalId[];
  goalMode: string;
  goalDeadline: string;
  goalMilestones: string;
  goalPriorityRanking: string;
  currentWeight: string;
  goalWeight: string;
  stepsGoal: string;
  waterGoal: string;
  motivationFocus: string;
  planDirectionNotes: string;
  sessionsPerWeek: string;
  sleepGoal: string;
  trainingAge: string;
};

const storageKeys = [
  "soundFitnessProfile",
  "soundFitnessExerciseStats",
  "soundFitnessWorkoutLogs",
  "soundFitnessFavorites",
  "soundFitnessDraftWorkout",
  "soundFitnessPlan",
  "soundFitnessPhases",
  "soundFitnessGoals",
  "soundFitnessCalendar",
] as const;

const goalOptions: GoalId[] = [
  "Build Muscle",
  "Lose Fat",
  "Maintain",
  "Strength",
  "General Health",
  "Mobility",
  "Conditioning",
  "Recovery",
  "Performance",
];

const goalPriorityOptions = [
  "Strength, recovery, consistency",
  "Muscle, strength, recovery",
  "Fat loss, steps, strength",
  "Performance, conditioning, power",
  "Mobility, pain-free movement, consistency",
  "Balanced",
  "Custom",
] as const;

const goalCards: Array<{
  id: GoalId;
  purpose: string;
  planEffect: string;
  volume: string;
  intensity: string;
  libraryFocus: string;
  phaseType: string;
}> = [
  {
    id: "Build Muscle",
    purpose: "Increase muscle size through useful weekly volume and progression.",
    planEffect: "More accessory work, muscle-group balance, and repeatable hypertrophy slots.",
    volume: "Moderate to high",
    intensity: "Controlled hard sets",
    libraryFocus: "Exercise + Nutrition",
    phaseType: "Hypertrophy block",
  },
  {
    id: "Lose Fat",
    purpose: "Support body composition while preserving strength and consistency.",
    planEffect: "Strength anchors, conditioning, steps, and recovery-aware volume.",
    volume: "Moderate",
    intensity: "Sustainable",
    libraryFocus: "Nutrition + Builder",
    phaseType: "Fat Loss base",
  },
  {
    id: "Maintain",
    purpose: "Keep strength, mobility, and muscle while life stays busy.",
    planEffect: "Efficient full-body sessions with simple progression and recovery guardrails.",
    volume: "Moderate",
    intensity: "Balanced",
    libraryFocus: "Library + Calendar",
    phaseType: "Maintenance cycle",
  },
  {
    id: "Strength",
    purpose: "Drive load progression and technical confidence on key patterns.",
    planEffect: "Compound lifts, longer rest, lower-rep strength slots, and PR tracking.",
    volume: "Moderate",
    intensity: "High but managed",
    libraryFocus: "Exercise Library",
    phaseType: "Strength block",
  },
  {
    id: "General Health",
    purpose: "Build a durable baseline of strength, movement, cardio, and consistency.",
    planEffect: "Balanced total-body training with mobility and low-friction weekly targets.",
    volume: "Base building",
    intensity: "Moderate",
    libraryFocus: "All libraries",
    phaseType: "Foundation",
  },
  {
    id: "Mobility",
    purpose: "Improve range, control, and movement quality without chasing fatigue.",
    planEffect: "More mobility slots, technique work, and tissue-friendly exercise choices.",
    volume: "Frequent small doses",
    intensity: "Low to moderate",
    libraryFocus: "Mobility + Recovery",
    phaseType: "Mobility / Recovery",
  },
  {
    id: "Conditioning",
    purpose: "Build aerobic capacity, intervals, and repeatable output without burying recovery.",
    planEffect: "Cardio blocks, circuits, and conditioning slots shaped around readiness.",
    volume: "Moderate",
    intensity: "Sustainable spikes",
    libraryFocus: "Performance + Builder",
    phaseType: "Conditioning block",
  },
  {
    id: "Recovery",
    purpose: "Lower training heat while rebuilding consistency and confidence.",
    planEffect: "Pain-aware substitutions, lower fatigue, and gradual reloading.",
    volume: "Low to moderate",
    intensity: "Conservative",
    libraryFocus: "Recovery Library",
    phaseType: "Recovery block",
  },
  {
    id: "Performance",
    purpose: "Improve power, athleticism, conditioning, and readiness for sport demands.",
    planEffect: "Carries, jumps, throws, sprints, power intent, and planned recovery.",
    volume: "Moderate",
    intensity: "Quality-first",
    libraryFocus: "Performance Library",
    phaseType: "Performance block",
  },
];

const selectablePlanDirectionIds = goalCards
  .filter((goal) => goal.id !== "Maintain")
  .map((goal) => goal.id);

const isSelectablePlanDirection = (value: unknown): value is GoalId =>
  typeof value === "string" &&
  selectablePlanDirectionIds.includes(value as GoalId);

const planDirectionVisualStyles: Record<
  GoalId,
  {
    accent: string;
    card: string;
    glow: string;
    icon: string;
    ring: string;
    wash: string;
  }
> = {
  "Build Muscle": {
    accent: "border-orange-200/30 bg-orange-300/12 text-orange-50",
    card: "hover:border-orange-200/48 hover:bg-orange-300/10",
    glow: "rgba(251,146,60,0.38)",
    icon: "\u{1F4AA}",
    ring: "border-orange-200/70 bg-orange-300/14 shadow-[0_0_38px_rgba(251,146,60,0.20)]",
    wash: "from-red-500/34 via-orange-300/20 to-transparent",
  },
  "Lose Fat": {
    accent: "border-yellow-200/30 bg-yellow-300/12 text-yellow-50",
    card: "hover:border-yellow-200/48 hover:bg-yellow-300/10",
    glow: "rgba(250,204,21,0.36)",
    icon: "\u{1F525}",
    ring: "border-yellow-200/70 bg-yellow-300/14 shadow-[0_0_38px_rgba(250,204,21,0.18)]",
    wash: "from-yellow-300/34 via-amber-300/20 to-transparent",
  },
  Maintain: {
    accent: "border-slate-200/20 bg-white/[0.06] text-slate-100",
    card: "hover:border-slate-200/34 hover:bg-white/[0.07]",
    glow: "rgba(148,163,184,0.28)",
    icon: "\u2696",
    ring: "border-slate-200/50 bg-slate-300/10 shadow-[0_0_28px_rgba(148,163,184,0.14)]",
    wash: "from-slate-300/18 via-slate-400/10 to-transparent",
  },
  Strength: {
    accent: "border-blue-200/30 bg-blue-300/12 text-blue-50",
    card: "hover:border-blue-200/48 hover:bg-blue-300/10",
    glow: "rgba(96,165,250,0.38)",
    icon: "\u{1F3CB}\uFE0F",
    ring: "border-blue-200/70 bg-blue-300/14 shadow-[0_0_38px_rgba(96,165,250,0.20)]",
    wash: "from-blue-400/34 via-cyan-300/18 to-transparent",
  },
  "General Health": {
    accent: "border-emerald-200/30 bg-emerald-300/12 text-emerald-50",
    card: "hover:border-emerald-200/48 hover:bg-emerald-300/10",
    glow: "rgba(52,211,153,0.34)",
    icon: "\u{1F33F}",
    ring: "border-emerald-200/70 bg-emerald-300/14 shadow-[0_0_38px_rgba(52,211,153,0.18)]",
    wash: "from-emerald-300/32 via-blue-300/16 to-transparent",
  },
  Mobility: {
    accent: "border-teal-200/30 bg-teal-300/12 text-teal-50",
    card: "hover:border-teal-200/48 hover:bg-teal-300/10",
    glow: "rgba(45,212,191,0.36)",
    icon: "\u{1F9D8}",
    ring: "border-teal-200/70 bg-teal-300/14 shadow-[0_0_38px_rgba(45,212,191,0.20)]",
    wash: "from-emerald-300/30 via-teal-300/20 to-transparent",
  },
  Conditioning: {
    accent: "border-sky-200/30 bg-sky-300/12 text-sky-50",
    card: "hover:border-sky-200/48 hover:bg-sky-300/10",
    glow: "rgba(56,189,248,0.36)",
    icon: "\u26A1",
    ring: "border-sky-200/70 bg-sky-300/14 shadow-[0_0_38px_rgba(56,189,248,0.20)]",
    wash: "from-cyan-300/34 via-sky-300/20 to-transparent",
  },
  Recovery: {
    accent: "border-violet-200/30 bg-violet-300/12 text-violet-50",
    card: "hover:border-violet-200/48 hover:bg-violet-300/10",
    glow: "rgba(167,139,250,0.34)",
    icon: "\u272A",
    ring: "border-violet-200/70 bg-violet-300/14 shadow-[0_0_38px_rgba(167,139,250,0.20)]",
    wash: "from-violet-300/32 via-purple-300/18 to-transparent",
  },
  Performance: {
    accent: "border-fuchsia-200/30 bg-fuchsia-300/12 text-fuchsia-50",
    card: "hover:border-fuchsia-200/48 hover:bg-fuchsia-300/10",
    glow: "rgba(217,70,239,0.34)",
    icon: "\u{1F680}",
    ring: "border-fuchsia-200/70 bg-fuchsia-300/14 shadow-[0_0_38px_rgba(217,70,239,0.18)]",
    wash: "from-fuchsia-400/32 via-orange-300/18 to-transparent",
  },
};

const planDirectionInsights: Record<GoalId, string> = {
  "Build Muscle": "Prioritize progressive overload, useful volume, and recovery support.",
  "Lose Fat": "Keep strength anchors while using steps, conditioning, and nutrition consistency.",
  Maintain: "Keep capacity, muscle, and mobility steady with repeatable sessions.",
  Strength: "Prioritize compound skill, heavier loading, longer rest, and repeatable benchmarks.",
  "General Health": "Build a balanced base of strength, mobility, conditioning, and consistency.",
  Mobility: "Add movement quality, joint prep, and range work around the main sessions.",
  Conditioning: "Build aerobic capacity, intervals, and repeatable output without burying recovery.",
  Recovery: "Lower training heat, protect pain-sensitive areas, and progress conservatively.",
  Performance: "Bias power, athletic patterns, conditioning quality, and performance testing.",
};

const planDirectionScrollbarThemes: Record<
  GoalId,
  { from: string; glow: string; to: string; via: string }
> = {
  "Build Muscle": {
    from: "rgba(248,113,113,0.92)",
    glow: "rgba(251,146,60,0.42)",
    to: "rgba(251,146,60,0.86)",
    via: "rgba(251,191,36,0.88)",
  },
  "Lose Fat": {
    from: "rgba(250,204,21,0.94)",
    glow: "rgba(250,204,21,0.40)",
    to: "rgba(251,146,60,0.84)",
    via: "rgba(251,191,36,0.90)",
  },
  Maintain: {
    from: "rgba(148,163,184,0.72)",
    glow: "rgba(148,163,184,0.28)",
    to: "rgba(203,213,225,0.62)",
    via: "rgba(226,232,240,0.72)",
  },
  Strength: {
    from: "rgba(96,165,250,0.92)",
    glow: "rgba(96,165,250,0.42)",
    to: "rgba(34,211,238,0.80)",
    via: "rgba(125,211,252,0.88)",
  },
  "General Health": {
    from: "rgba(45,212,191,0.90)",
    glow: "rgba(45,212,191,0.38)",
    to: "rgba(134,239,172,0.76)",
    via: "rgba(34,211,238,0.84)",
  },
  Mobility: {
    from: "rgba(45,212,191,0.92)",
    glow: "rgba(45,212,191,0.42)",
    to: "rgba(74,222,128,0.78)",
    via: "rgba(94,234,212,0.88)",
  },
  Conditioning: {
    from: "rgba(52,211,153,0.90)",
    glow: "rgba(52,211,153,0.38)",
    to: "rgba(34,211,238,0.84)",
    via: "rgba(125,211,252,0.86)",
  },
  Recovery: {
    from: "rgba(167,139,250,0.92)",
    glow: "rgba(167,139,250,0.40)",
    to: "rgba(217,70,239,0.76)",
    via: "rgba(196,181,253,0.86)",
  },
  Performance: {
    from: "rgba(217,70,239,0.90)",
    glow: "rgba(217,70,239,0.40)",
    to: "rgba(251,146,60,0.78)",
    via: "rgba(244,114,182,0.86)",
  },
};

const safeJsonParse = (value: string | null): unknown => {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const asRecord = (value: unknown): JsonObject =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : {};

const readLocal = (key: string) =>
  typeof window === "undefined" ? null : safeJsonParse(window.localStorage.getItem(key));

const getString = (source: JsonObject, keys: string[], fallback = "") => {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) return value;
    if (typeof value === "number") return String(value);
  }
  return fallback;
};

const getStringArray = (source: JsonObject, key: string) => {
  const value = source[key];
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
};

const normalizeGoalId = (value: string, fallback: GoalId): GoalId => {
  const normalized = value.toLowerCase();
  return (
    goalOptions.find(
      (goal) =>
        goal.toLowerCase() === normalized ||
        normalized.includes(goal.toLowerCase()),
    ) || fallback
  );
};

const normalizePlanDirections = (
  directions: unknown,
  fallbackGoalMode: unknown,
): GoalId[] => {
  if (Array.isArray(directions)) {
    return Array.from(new Set(directions.filter(isSelectablePlanDirection))).slice(0, 2);
  }

  if (isSelectablePlanDirection(fallbackGoalMode)) return [fallbackGoalMode];

  return [];
};

const getPlanDirectionComboInsight = (directions: GoalId[]) => {
  if (!directions.length) {
    return "Choose up to 2 plan directions to unlock personalized programming insights.";
  }

  const primary = directions[0].toLowerCase();
  const secondary = directions[1]?.toLowerCase();

  if (!secondary) {
    return `Your plan should bias ${primary} as the main programming filter.`;
  }

  return `Your plan should bias ${primary} while using ${secondary} to shape accessories, warmups, recovery, and conditioning choices.`;
};

const getPlanDirectionScrollbarTheme = (directions: GoalId[]) => {
  const primary = directions[0]
    ? planDirectionScrollbarThemes[directions[0]]
    : planDirectionScrollbarThemes.Strength;
  const secondary = directions[1]
    ? planDirectionScrollbarThemes[directions[1]]
    : planDirectionScrollbarThemes.Performance;

  return {
    from: primary.from,
    glow: directions[1] ? secondary.glow : primary.glow,
    to: secondary.to,
    via: directions[1] ? secondary.via : primary.via,
  };
};

const clampNumber = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const getNumberValue = (value: string, fallback: number, min: number, max: number) => {
  const parsed = Number.parseFloat(value);
  return clampNumber(Number.isFinite(parsed) ? parsed : fallback, min, max);
};

const isCompleteValue = (value: unknown) => {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "number") return Number.isFinite(value) && value > 0;
  if (typeof value === "string") return value.trim().length > 0;
  return Boolean(value);
};

const calculateCompletion = (items: unknown[]) =>
  Math.round(
    (items.filter(isCompleteValue).length / Math.max(items.length, 1)) * 100,
  );

const readArrayLength = (key: string) => {
  const value = readLocal(key);
  return Array.isArray(value) ? value.length : 0;
};

const countWeeklySets = (rawStats: unknown) => {
  const entries = Array.isArray(rawStats)
    ? rawStats
    : Object.values(asRecord(rawStats));
  const now = Date.now();
  const sevenDays = 7 * 24 * 60 * 60 * 1000;

  return entries.reduce((total, raw) => {
    const entry = asRecord(raw);
    const dateValue = getString(entry, ["date", "createdAt", "loggedAt", "updatedAt"]);
    const timestamp = dateValue ? new Date(dateValue).getTime() : now;
    const isRecent = Number.isFinite(timestamp) && now - timestamp <= sevenDays;
    const sets = Number(entry.sets ?? entry.weeklySets ?? entry.completedSets ?? 0);
    return total + (isRecent && Number.isFinite(sets) ? sets : 0);
  }, 0);
};

const defaultProfile = (): ProfileSnapshot => ({
  displayName: "Member",
  primaryGoal: "General Health",
  secondaryGoal: "Strength",
  planDirections: [],
  goalMode: "General Health",
  goalDeadline: "",
  goalMilestones: "",
  goalPriorityRanking: "Strength, recovery, consistency",
  currentWeight: "",
  goalWeight: "",
  stepsGoal: "",
  waterGoal: "",
  motivationFocus: "",
  planDirectionNotes: "",
  sessionsPerWeek: "4",
  sleepGoal: "7.5",
  trainingAge: "Not set",
});

const buildGoalsFromProfile = (profile: ProfileSnapshot): GoalState => {
  const planDirections = normalizePlanDirections(profile.planDirections, profile.goalMode);

  return {
    planDirections,
    primaryGoal: normalizeGoalId(profile.primaryGoal, "General Health"),
    secondaryGoal: normalizeGoalId(profile.secondaryGoal, "Strength"),
    constraintGoal: "Recovery-aware training",
    goalDeadline: profile.goalDeadline,
    goalMilestones: profile.goalMilestones,
    goalPriorityRanking: profile.goalPriorityRanking || "Strength, recovery, consistency",
    currentWeight: profile.currentWeight,
    goalWeight: profile.goalWeight,
    targetWeeklySessions: profile.sessionsPerWeek || "4",
    targetWeeklySets: "48",
    targetProtein: "150",
    targetSteps: profile.stepsGoal || "8000",
    stepsGoal: profile.stepsGoal,
    targetSleep: profile.sleepGoal || "7.5",
    waterGoal: profile.waterGoal,
    benchmarkGoal: "Improve one key lift or movement standard this cycle.",
    goalMode: planDirections[0] || profile.goalMode || "General Health",
    motivationFocus: profile.motivationFocus,
    planDirectionNotes: profile.planDirectionNotes,
  };
};

const getProfileSnapshot = (): ProfileSnapshot => {
  const profile = asRecord(readLocal("soundFitnessProfile"));
  const fallback = defaultProfile();

  return {
    displayName: getString(profile, ["displayName", "fullName", "name"], fallback.displayName),
    primaryGoal: getString(profile, ["primaryGoal", "goal", "goalMode"], fallback.primaryGoal),
    secondaryGoal: getString(profile, ["secondaryGoal"], fallback.secondaryGoal),
    planDirections: normalizePlanDirections(
      getStringArray(profile, "planDirections"),
      getString(profile, ["goalMode", "mode"], ""),
    ),
    goalMode: getString(profile, ["goalMode", "mode"], fallback.goalMode),
    goalDeadline: getString(profile, ["goalDeadline"], fallback.goalDeadline),
    goalMilestones: getString(profile, ["goalMilestones"], fallback.goalMilestones),
    goalPriorityRanking: getString(profile, ["goalPriorityRanking"], fallback.goalPriorityRanking),
    currentWeight: getString(profile, ["currentWeight", "weight"], fallback.currentWeight),
    goalWeight: getString(profile, ["goalWeight"], fallback.goalWeight),
    stepsGoal: getString(profile, ["stepsGoal", "targetSteps"], fallback.stepsGoal),
    waterGoal: getString(profile, ["waterGoal", "hydrationGoal"], fallback.waterGoal),
    motivationFocus: getString(profile, ["motivationFocus", "goalMotivation"], fallback.motivationFocus),
    planDirectionNotes: getString(profile, ["planDirectionNotes"], fallback.planDirectionNotes),
    sessionsPerWeek: getString(profile, ["sessionsPerWeek", "weeklyTarget"], fallback.sessionsPerWeek),
    sleepGoal: getString(profile, ["sleepGoal"], fallback.sleepGoal),
    trainingAge: getString(profile, ["trainingAge", "trainingLevel"], fallback.trainingAge),
  };
};

const getCoachInsight = ({
  goals,
  weeklySets,
}: {
  goals: GoalState;
  weeklySets: number;
}) => {
  const weeklyTarget = Number(goals.targetWeeklySets) || 48;
  if (weeklySets === 0) return "Start the loop with one simple full-body session, then let Progress adapt the next plan.";
  if (weeklySets < weeklyTarget * 0.4) return "Your weekly volume is still low. Build the base with compounds before adding lots of isolation.";
  if (weeklySets > weeklyTarget) return "You are ahead of target. Keep the goal, but let Recovery and Calendar protect the next few sessions.";
  if (goals.primaryGoal === "Lose Fat") return "Keep strength work focused while nutrition and steps support the body-composition goal.";
  if (goals.primaryGoal === "Strength") return "Prioritize key movement patterns, repeatable loading, and enough recovery between hard sessions.";
  return "Your goal stack is ready to feed the Library, Builder, My Plan, and future phases.";
};

function Field({
  label,
  onChange,
  value,
  suffix,
}: {
  label: string;
  onChange: (value: string) => void;
  suffix?: string;
  value: string;
}) {
  return (
    <label className="block rounded-[24px] border border-white/10 bg-white/[0.045] p-4">
      <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
        {label}
      </span>
      <div className="mt-3 flex items-center gap-2">
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="min-w-0 flex-1 bg-transparent text-2xl font-black text-white outline-none placeholder:text-slate-600"
          placeholder="0"
        />
        {suffix ? <span className="text-xs font-bold text-slate-500">{suffix}</span> : null}
      </div>
    </label>
  );
}

function MetricSliderField({
  accent = "rgb(103,232,249)",
  defaultValue,
  helper,
  label,
  max,
  min,
  onChange,
  step = 1,
  suffix,
  value,
}: {
  accent?: string;
  defaultValue: number;
  helper: string;
  label: string;
  max: number;
  min: number;
  onChange: (value: string) => void;
  step?: number;
  suffix: string;
  value: string;
}) {
  const numeric = getNumberValue(value, defaultValue, min, max);
  const progress = ((numeric - min) / (max - min)) * 100;
  const decimals = step < 1 ? 2 : 0;
  const formatValue = (next: number) =>
    Number(next.toFixed(decimals)).toString();
  const updateValue = (next: number) => {
    const clamped = clampNumber(next, min, max);
    onChange(formatValue(clamped));
  };

  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.045] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
            {label}
          </p>
          <p className="mt-2 text-3xl font-black text-white">
            {numeric.toLocaleString()}{" "}
            <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
              {suffix}
            </span>
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => updateValue(numeric - step)}
            className="grid h-9 w-9 place-items-center rounded-2xl border border-white/10 bg-slate-950/62 text-sm font-black text-slate-300 transition hover:border-cyan-200/30 hover:text-white"
            aria-label={`Decrease ${label}`}
          >
            &lt;
          </button>
          <button
            type="button"
            onClick={() => updateValue(numeric + step)}
            className="grid h-9 w-9 place-items-center rounded-2xl border border-white/10 bg-slate-950/62 text-sm font-black text-slate-300 transition hover:border-cyan-200/30 hover:text-white"
            aria-label={`Increase ${label}`}
          >
            &gt;
          </button>
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={numeric}
        onChange={(event) => updateValue(Number(event.target.value))}
        className="mt-4 h-2 w-full cursor-pointer appearance-none rounded-full border border-white/10 outline-none [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-slate-950 [&::-moz-range-thumb]:bg-white [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-slate-950 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-[0_0_18px_rgba(255,255,255,0.20)]"
        style={{
          background: `linear-gradient(90deg, ${accent} 0%, ${accent} ${progress}%, rgba(15,23,42,0.84) ${progress}%, rgba(15,23,42,0.84) 100%)`,
        }}
      />
      <div className="mt-2 flex justify-between text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
        <span>{min.toLocaleString()}</span>
        <span>{max.toLocaleString()}</span>
      </div>
      <p className="mt-3 text-xs font-semibold leading-5 text-slate-400">{helper}</p>
    </div>
  );
}

function DateField({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="block rounded-[24px] border border-white/10 bg-white/[0.045] p-4">
      <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
        {label}
      </span>
      <input
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-3 min-h-[48px] w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm font-black text-white outline-none transition focus:border-cyan-300"
      />
    </label>
  );
}

function TextAreaField({
  label,
  onChange,
  placeholder,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
}) {
  return (
    <label className="block rounded-[24px] border border-white/10 bg-white/[0.045] p-4">
      <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
        {label}
      </span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-3 min-h-[112px] w-full resize-none bg-transparent text-sm font-semibold leading-6 text-white outline-none placeholder:text-slate-600"
      />
    </label>
  );
}

function SelectField({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: string[];
  value: string;
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 min-h-[48px] w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm font-bold text-white outline-none transition focus:border-cyan-300"
      >
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function TranslationCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-sm font-bold leading-6 text-slate-200">{value}</p>
    </div>
  );
}

export default function GoalsPage() {
  const [profile, setProfile] = useState<ProfileSnapshot>(() => defaultProfile());
  const [goals, setGoals] = useState<GoalState>(() => buildGoalsFromProfile(defaultProfile()));
  const [planDirectionOpen, setPlanDirectionOpen] = useState(false);
  const [planDirectionMessage, setPlanDirectionMessage] = useState("");
  const [planDirectionScrolling, setPlanDirectionScrolling] = useState(false);
  const [masterJourneyExpanded, setMasterJourneyExpanded] = useState(false);
  const [openMasterJourney, setOpenMasterJourney] = useState<string | null>(null);
  const [weeklySets, setWeeklySets] = useState(0);
  const [favoriteCount, setFavoriteCount] = useState(0);
  const [savedMessage, setSavedMessage] = useState("");
  const planDirectionSliderRef = useRef<HTMLDivElement | null>(null);
  const planDirectionScrollTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const profileSnapshot = getProfileSnapshot();
    const storedGoals = asRecord(readLocal("soundFitnessGoals"));
    const mergedGoals = {
      ...buildGoalsFromProfile(profileSnapshot),
      ...storedGoals,
    } as GoalState;
    const nextGoals = {
      ...mergedGoals,
      planDirections: normalizePlanDirections(
        mergedGoals.planDirections,
        mergedGoals.goalMode,
      ),
      primaryGoal: normalizeGoalId(String(mergedGoals.primaryGoal || ""), "General Health"),
      secondaryGoal: normalizeGoalId(String(mergedGoals.secondaryGoal || ""), "Strength"),
      stepsGoal: getString(storedGoals, ["stepsGoal", "targetSteps"], mergedGoals.stepsGoal || mergedGoals.targetSteps || ""),
      targetSteps: getString(storedGoals, ["targetSteps", "stepsGoal"], mergedGoals.targetSteps || mergedGoals.stepsGoal || "8000"),
      waterGoal: getString(storedGoals, ["waterGoal"], mergedGoals.waterGoal || ""),
    } as GoalState;

    setProfile(profileSnapshot);
    setGoals(nextGoals);
    setWeeklySets(countWeeklySets(readLocal("soundFitnessExerciseStats")));
    setFavoriteCount(readArrayLength("soundFitnessFavorites"));
  }, []);

  useEffect(() => {
    return () => {
      if (planDirectionScrollTimerRef.current) {
        window.clearTimeout(planDirectionScrollTimerRef.current);
      }
    };
  }, []);

  const selectedDirections = useMemo(
    () => normalizePlanDirections(goals.planDirections, goals.goalMode),
    [goals.goalMode, goals.planDirections],
  );
  const primaryDirection = selectedDirections[0];
  const secondaryDirection = selectedDirections[1];
  const activeDirection = primaryDirection || goals.primaryGoal;
  const selectedGoalCard = useMemo(
    () =>
      goalCards.find((goal) => goal.id === activeDirection) ||
      goalCards[4],
    [activeDirection],
  );
  const scrollbarTheme = getPlanDirectionScrollbarTheme(selectedDirections);
  const planDirectionScrollbarStyle = {
    "--plan-scroll-from": scrollbarTheme.from,
    "--plan-scroll-glow": scrollbarTheme.glow,
    "--plan-scroll-to": scrollbarTheme.to,
    "--plan-scroll-via": scrollbarTheme.via,
  } as CSSProperties;
  const weeklyTarget = Number(goals.targetWeeklySets) || 48;
  const completion = Math.min(Math.round((weeklySets / weeklyTarget) * 100), 140);
  const coachInsight = getCoachInsight({ goals, weeklySets });
  const weightDelta =
    Number(goals.goalWeight || 0) && Number(goals.currentWeight || 0)
      ? Number(goals.goalWeight) - Number(goals.currentWeight)
      : 0;
  const goalCompletionItems = [
    goals.planDirections,
    goals.goalWeight,
    goals.stepsGoal || goals.targetSteps,
    goals.waterGoal,
    goals.goalMode,
    goals.goalPriorityRanking,
    goals.goalDeadline,
    goals.goalMilestones,
    goals.motivationFocus || goals.planDirectionNotes,
    goals.targetWeeklySessions,
    goals.benchmarkGoal,
  ];
  const goalSetupCompletion = Math.round(
    (goalCompletionItems.filter((item) => String(item || "").trim()).length /
      goalCompletionItems.length) *
      100,
  );
  const milestoneCount = goals.goalMilestones
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean).length;
  const deadlineDate = goals.goalDeadline
    ? new Date(`${goals.goalDeadline}T00:00:00`)
    : null;
  const goalDeadlineLabel =
    deadlineDate && !Number.isNaN(deadlineDate.getTime())
      ? new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(deadlineDate)
      : goals.goalDeadline || "Timeline open";
  const recommendedNextStep = !goals.goalDeadline
    ? "Set a realistic goal timeline so the plan can pace volume and progression."
    : !goals.goalMilestones.trim()
      ? "Add 2-3 milestones that turn the goal into visible weekly behaviors."
      : coachInsight;
  const goalPrioritySelectOptions =
    goals.goalPriorityRanking &&
    !goalPriorityOptions.includes(
      goals.goalPriorityRanking as (typeof goalPriorityOptions)[number],
    )
      ? [goals.goalPriorityRanking, ...goalPriorityOptions]
      : [...goalPriorityOptions];

  const updateGoal = <K extends keyof GoalState>(key: K, value: GoalState[K]) => {
    setGoals((current) => ({ ...current, [key]: value }));
    setSavedMessage("");
  };

  const updateStepsGoal = (value: string) => {
    setGoals((current) => ({ ...current, stepsGoal: value, targetSteps: value }));
    setSavedMessage("");
  };

  const markPlanDirectionScrolling = () => {
    setPlanDirectionScrolling(true);
    if (planDirectionScrollTimerRef.current) {
      window.clearTimeout(planDirectionScrollTimerRef.current);
    }
    planDirectionScrollTimerRef.current = window.setTimeout(() => {
      setPlanDirectionScrolling(false);
    }, 420);
  };

  const scrollPlanDirection = (direction: "left" | "right") => {
    const slider = planDirectionSliderRef.current;
    if (!slider) return;

    const scrollAmount = Math.max(260, slider.clientWidth * 0.78);
    markPlanDirectionScrolling();
    window.setTimeout(() => {
      slider.scrollBy({
        behavior: "smooth",
        left: direction === "left" ? -scrollAmount : scrollAmount,
      });
    }, 40);
  };

  const togglePlanDirection = (direction: GoalId) => {
    setGoals((current) => {
      const currentDirections = normalizePlanDirections(
        current.planDirections,
        current.goalMode,
      );
      const alreadySelected = currentDirections.includes(direction);
      const nextDirections = alreadySelected
        ? currentDirections.filter((item) => item !== direction)
        : currentDirections.length >= 2
          ? currentDirections
          : [...currentDirections, direction];

      if (!alreadySelected && currentDirections.length >= 2) {
        setPlanDirectionMessage("Choose up to 2 priorities.");
        return current;
      }

      setPlanDirectionMessage(
        nextDirections.length
          ? "Primary drives programming. Secondary modifies accessories, recovery, and cardio."
          : "Choose up to 2 priorities.",
      );
      setSavedMessage("");

      return {
        ...current,
        goalMode: nextDirections[0] || current.goalMode,
        planDirections: nextDirections,
      };
    });
  };

  const saveGoals = () => {
    const nextDirections = normalizePlanDirections(goals.planDirections, goals.goalMode);
    const stepsGoal = goals.stepsGoal || goals.targetSteps;
    const nextGoals = {
      ...goals,
      planDirections: nextDirections,
      targetSteps: stepsGoal,
      stepsGoal,
      updatedAt: new Date().toISOString(),
    };
    const storedProfile = asRecord(readLocal("soundFitnessProfile"));
    const nextProfile = {
      ...storedProfile,
      primaryGoal: nextDirections.length
        ? `${nextDirections.join(" + ")} Plan`
        : goals.primaryGoal,
      secondaryGoal: nextDirections[1] || goals.secondaryGoal,
      goalMode: nextDirections[0] || goals.goalMode,
      planDirections: nextDirections,
      goalDeadline: goals.goalDeadline,
      goalMilestones: goals.goalMilestones,
      goalPriorityRanking: goals.goalPriorityRanking,
      motivationFocus: goals.motivationFocus,
      goalMotivation: goals.motivationFocus,
      planDirectionNotes: goals.planDirectionNotes,
      currentWeight: goals.currentWeight,
      goalWeight: goals.goalWeight,
      stepsGoal,
      waterGoal: goals.waterGoal,
      sessionsPerWeek: goals.targetWeeklySessions,
      sleepGoal: goals.targetSleep,
    };

    window.localStorage.setItem("soundFitnessGoals", JSON.stringify(nextGoals));
    writeSoundFitnessProfile(nextProfile);
    setGoals(nextGoals);
    setProfile(getProfileSnapshot());
    setSavedMessage("Goals saved and Profile goal context updated.");
  };

  const renderMasterTrainingJourney = () => {
    const profileCompletion = calculateCompletion([
      profile.displayName,
      profile.trainingAge,
      goals.currentWeight,
      profile.sessionsPerWeek,
    ]);
    const trainingSetupCompletion = calculateCompletion([
      goals.targetWeeklySessions,
      goals.targetWeeklySets,
      goals.benchmarkGoal,
      selectedDirections,
    ]);
    const fuelCompletion = calculateCompletion([
      goals.targetProtein,
      goals.waterGoal,
      activeDirection,
      goals.goalMode,
    ]);
    const performanceCompletion = calculateCompletion([
      weeklySets,
      goals.benchmarkGoal,
      activeDirection === "Performance" || activeDirection === "Conditioning"
        ? activeDirection
        : "",
      goals.goalMilestones,
    ]);
    const recoveryCompletion = calculateCompletion([
      goals.targetSleep,
      activeDirection === "Recovery" ? activeDirection : "",
      goals.planDirectionNotes,
      goals.goalPriorityRanking,
    ]);

    const journeyRows: Array<{
      accent: string;
      completion: number;
      description: string;
      id: string;
      steps: Array<{
        href: string;
        label: string;
        status: string;
      }>;
      title: string;
    }> = [
      {
        accent: "from-cyan-300 to-blue-400",
        completion: Math.round(
          (profileCompletion + goalSetupCompletion + trainingSetupCompletion) / 3,
        ),
        description: "Build sessions from profile, goals, libraries, and plans.",
        id: "training",
        title: "Training Journey",
        steps: [
          { href: ROUTES.dashboard.profile, label: "Profile", status: "Foundation" },
          { href: ROUTES.dashboard.goals, label: "Goals", status: "Direction" },
          { href: ROUTES.dashboard.sessions, label: "Sessions", status: "Start" },
          { href: ROUTES.dashboard.exerciseLibrary, label: "Exercise Library", status: "Tools" },
          { href: ROUTES.dashboard.goals, label: "Goal Planning", status: "Goals" },
          { href: ROUTES.dashboard.plan, label: "My Plan", status: "Organize" },
          { href: ROUTES.dashboard.phases, label: "Periodized Plan", status: "Phase" },
          { href: ROUTES.dashboard.calendar, label: "Calendar", status: "Schedule" },
          { href: ROUTES.dashboard.stats, label: "Progress", status: "Reflect" },
        ],
      },
      {
        accent: "from-emerald-300 to-teal-400",
        completion: Math.round((profileCompletion + goalSetupCompletion + fuelCompletion) / 3),
        description: "Turn fuel decisions into meals, menus, and weekly nutrition plans.",
        id: "fuel",
        title: "Fuel Journey",
        steps: [
          { href: ROUTES.dashboard.profile, label: "Profile", status: "Foundation" },
          { href: "/nutrition/goals", label: "Goals", status: "Fuel goal" },
          { href: ROUTES.nutritionPortal.home, label: "Fuel Dashboard", status: "Today" },
          { href: ROUTES.nutritionPortal.grocery, label: "Shopping / My Fridge", status: "Stock" },
          { href: ROUTES.nutritionPortal.library, label: "Kitchen", status: "Library" },
          { href: ROUTES.nutritionPortal.meals, label: "My Menu", status: "Meals" },
          { href: "/nutrition/meal-plan", label: "My Plan", status: "Week" },
          { href: "/nutrition/progress", label: "Progress", status: "Track" },
        ],
      },
      {
        accent: "from-orange-300 to-amber-300",
        completion: Math.round(
          (goalSetupCompletion + trainingSetupCompletion + performanceCompletion) / 3,
        ),
        description: "Develop conditioning, athletic metrics, and performance trends.",
        id: "performance",
        title: "Performance Pathway",
        steps: [
          { href: "/performance", label: "Baseline", status: "Check" },
          { href: "/performance", label: "Cardio", status: "Engine" },
          { href: "/performance", label: "Conditioning", status: "Capacity" },
          { href: "/performance", label: "Metrics", status: "Measure" },
          { href: "/performance", label: "Athletic Tests", status: "Test" },
          { href: ROUTES.dashboard.stats, label: "Progress", status: "Track" },
        ],
      },
      {
        accent: "from-violet-300 to-cyan-300",
        completion: Math.round((profileCompletion + recoveryCompletion + goalSetupCompletion) / 3),
        description: "Connect readiness, mobility, pain/soreness, and recovery planning.",
        id: "recovery",
        title: "Recovery Roadmap",
        steps: [
          { href: ROUTES.dashboard.profile, label: "Readiness", status: "Profile" },
          { href: ROUTES.dashboard.mobilityLibrary, label: "Mobility", status: "Move" },
          { href: ROUTES.dashboard.painTracking, label: "Pain/Soreness", status: "Log" },
          { href: ROUTES.dashboard.profile, label: "Sleep/Stress", status: "Signals" },
          { href: "/recovery", label: "Recovery Plan", status: "Recover" },
          { href: ROUTES.dashboard.stats, label: "Progress", status: "Track" },
        ],
      },
    ];

    const foundationItems = [
      {
        href: ROUTES.dashboard.profile,
        label: "Profile",
        status: "Foundation",
      },
      {
        href: ROUTES.dashboard.goals,
        label: "Goals",
        status: "Direction",
      },
    ];

    const getJourneySummary = (row: (typeof journeyRows)[number]) => {
      const completedCount = Math.min(
        row.steps.length,
        Math.floor((row.completion / 100) * row.steps.length),
      );
      const currentIndex = Math.min(completedCount, row.steps.length - 1);
      const currentStep = row.steps[currentIndex]?.label || row.steps[0]?.label || "Profile";
      const nextAction =
        row.steps[Math.min(currentIndex + 1, row.steps.length - 1)]?.label ||
        currentStep;

      return { completedCount, currentIndex, currentStep, nextAction };
    };

    const overallJourneyCompletion = Math.round(
      journeyRows.reduce((total, row) => total + row.completion, 0) /
        Math.max(journeyRows.length, 1),
    );
    const currentJourney =
      journeyRows.find((row) => row.id === openMasterJourney) ||
      journeyRows.find((row) => row.completion < 100) ||
      journeyRows[0];
    const currentJourneySummary = getJourneySummary(currentJourney);

    return (
      <section className="overflow-hidden rounded-[30px] border border-white/10 bg-slate-950/58 shadow-2xl">
        <button
          type="button"
          aria-expanded={masterJourneyExpanded}
          onClick={() => setMasterJourneyExpanded((current) => !current)}
          className="group w-full p-5 text-left transition hover:bg-white/[0.035] sm:p-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200/70">
                Master Journey
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <h2 className="text-2xl font-black text-white">
                  Master Training Journey
                </h2>
                <span className="rounded-full border border-cyan-200/28 bg-cyan-300/12 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-cyan-100">
                  {overallJourneyCompletion}% complete
                </span>
              </div>
              <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-400">
                Profile and goals are the foundation. Training, fuel, performance, and recovery journeys build from there.
              </p>
              <div className="mt-3 flex max-w-full flex-wrap gap-2">
                <span className="rounded-full border border-emerald-200/20 bg-emerald-300/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.1em] text-emerald-100">
                  {overallJourneyCompletion}% Complete
                </span>
                <span className="rounded-full border border-cyan-200/20 bg-cyan-300/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.1em] text-cyan-100">
                  Current: {currentJourney.title}
                </span>
                <span className="rounded-full border border-orange-200/18 bg-orange-300/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.1em] text-orange-100">
                  Next: {currentJourneySummary.nextAction}
                </span>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-3">
              <span className="hidden h-2 w-24 rounded-full bg-gradient-to-r from-cyan-300 via-emerald-300 to-orange-300 shadow-[0_0_20px_rgba(34,211,238,0.16)] sm:block">
                <span
                  className="block h-full rounded-full bg-white/35 transition-[width] duration-500"
                  style={{ width: `${overallJourneyCompletion}%` }}
                />
              </span>
              <span
                className={`grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-white/[0.045] text-lg font-black text-slate-300 transition group-hover:border-cyan-200/35 group-hover:text-cyan-100 ${
                  masterJourneyExpanded ? "rotate-90" : ""
                }`}
              >
                &gt;
              </span>
            </div>
          </div>
        </button>

        <div
          className={`grid transition-all duration-300 ease-out ${
            masterJourneyExpanded
              ? "grid-rows-[1fr] opacity-100"
              : "grid-rows-[0fr] opacity-0"
          }`}
        >
          <div className="overflow-hidden">
            <div className="border-t border-white/10 p-5 sm:p-6">
              <div className="mx-auto grid max-w-2xl gap-3 sm:grid-cols-2">
                {foundationItems.map((item, index) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="group relative rounded-[26px] border border-cyan-200/22 bg-[radial-gradient(circle_at_20%_0%,rgba(34,211,238,0.18),transparent_44%),rgba(15,23,42,0.68)] p-4 text-center shadow-[0_0_28px_rgba(34,211,238,0.08)] transition hover:-translate-y-1 hover:border-cyan-200/42 hover:bg-cyan-300/10"
                  >
                    {index === 0 ? (
                      <span className="pointer-events-none absolute -right-5 top-1/2 hidden h-px w-10 bg-gradient-to-r from-cyan-300/60 to-orange-300/60 sm:block" />
                    ) : null}
                    <span className="mx-auto grid h-10 w-10 place-items-center rounded-2xl border border-cyan-100/25 bg-cyan-300/14 text-sm font-black text-cyan-100">
                      {index + 1}
                    </span>
                    <p className="mt-3 text-lg font-black text-white">{item.label}</p>
                    <p className="mt-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
                      {item.status}
                    </p>
                    <span className="mt-3 inline-flex rounded-full border border-cyan-100/25 bg-cyan-300/12 px-3 py-1 text-xs font-black text-cyan-100">
                      Start here
                    </span>
                  </Link>
                ))}
              </div>

              <div className="my-5 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />

              <div className="space-y-5">
                {journeyRows.map((row) => {
                  const isOpen = openMasterJourney === row.id;
                  const { completedCount, currentIndex, currentStep, nextAction } =
                    getJourneySummary(row);

                  return (
                    <section
                      key={row.id}
                      className="overflow-hidden rounded-[28px] border border-white/10 bg-slate-950/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                    >
                      <button
                        type="button"
                        aria-expanded={isOpen}
                        onClick={() =>
                          setOpenMasterJourney((current) =>
                            current === row.id ? null : row.id,
                          )
                        }
                        className="group w-full p-4 text-left transition hover:bg-white/[0.035]"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-4">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-3">
                              <p className="text-lg font-black text-white">{row.title}</p>
                              <span className="rounded-full border border-white/10 bg-white/[0.045] px-3 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-slate-300">
                                {row.completion}% complete
                              </span>
                            </div>
                            <p className="mt-1 text-xs font-semibold leading-5 text-slate-400">
                              {row.description}
                            </p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <span className="rounded-full border border-cyan-200/20 bg-cyan-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-cyan-100">
                                Current: {currentStep}
                              </span>
                              <span className="rounded-full border border-orange-200/18 bg-orange-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-orange-100">
                                Next: {nextAction}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <span
                              className={`hidden h-2 w-24 rounded-full bg-gradient-to-r ${row.accent} shadow-[0_0_18px_rgba(34,211,238,0.14)] sm:block`}
                            />
                            <span
                              className={`grid h-10 w-10 place-items-center rounded-2xl border border-white/10 bg-white/[0.045] text-lg font-black text-slate-300 transition group-hover:border-cyan-200/35 group-hover:text-cyan-100 ${
                                isOpen ? "rotate-90" : ""
                              }`}
                            >
                              &gt;
                            </span>
                          </div>
                        </div>
                      </button>

                      <div
                        className={`grid transition-all duration-300 ease-out ${
                          isOpen
                            ? "grid-rows-[1fr] opacity-100"
                            : "grid-rows-[0fr] opacity-0"
                        }`}
                      >
                        <div className="overflow-hidden">
                          <div className="border-t border-white/10 p-4 pt-5">
                            <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                              {row.steps.map((step, index) => {
                                const stepState =
                                  index < completedCount
                                    ? "Completed"
                                    : index === currentIndex
                                      ? "Active"
                                      : "Next";
                                const isActive = stepState === "Active";
                                const isComplete = stepState === "Completed";

                                return (
                                  <div
                                    key={`${row.title}-${step.label}`}
                                    className="flex shrink-0 snap-start items-center gap-3"
                                  >
                                    <Link
                                      href={step.href}
                                      className={`group min-h-[128px] w-[190px] rounded-[24px] border p-4 transition hover:-translate-y-1 active:scale-[0.98] ${
                                        isActive
                                          ? "border-cyan-200/45 bg-cyan-300/14 shadow-[0_0_28px_rgba(34,211,238,0.16)]"
                                          : isComplete
                                            ? "border-emerald-200/35 bg-emerald-300/10 shadow-[0_0_22px_rgba(52,211,153,0.12)]"
                                            : "border-white/10 bg-white/[0.045] hover:border-cyan-200/30 hover:bg-cyan-300/10"
                                      }`}
                                    >
                                      <div className="flex items-center justify-between gap-3">
                                        <span
                                          className={`grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br ${row.accent} text-xs font-black text-slate-950`}
                                        >
                                          {index + 1}
                                        </span>
                                        <span className="rounded-full border border-white/10 bg-slate-950/58 px-2 py-1 text-[9px] font-black uppercase tracking-[0.1em] text-slate-400 group-hover:text-cyan-100">
                                          {stepState}
                                        </span>
                                      </div>
                                      <p className="mt-4 text-sm font-black leading-tight text-white">
                                        {step.label}
                                      </p>
                                      <p className="mt-2 text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
                                        {step.status}
                                      </p>
                                    </Link>
                                    {index < row.steps.length - 1 ? (
                                      <span className="h-px w-10 shrink-0 bg-gradient-to-r from-white/18 to-cyan-300/30" />
                                    ) : null}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    </section>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_12%_0%,rgba(34,211,238,0.18),transparent_34%),radial-gradient(circle_at_88%_10%,rgba(251,191,36,0.15),transparent_32%),linear-gradient(180deg,#020617_0%,#0f172a_48%,#020617_100%)] text-white">
      <section className="mx-auto w-full max-w-[1440px] space-y-5 px-3 py-5 sm:px-5 lg:px-8">
        <section className="overflow-hidden rounded-[34px] border border-white/10 bg-[radial-gradient(circle_at_18%_0%,rgba(34,211,238,0.20),transparent_34%),linear-gradient(135deg,rgba(15,23,42,0.94),rgba(2,6,23,0.98))] p-5 shadow-[0_30px_120px_rgba(0,0,0,0.62)] sm:p-6 lg:p-8">
          <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr] xl:items-stretch">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.3em] text-cyan-200">
                Desired Outcomes
              </p>
              <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
                🎯 Goals
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-300 sm:text-base">
                Choose the outcomes your training system should build toward.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-black text-cyan-100">
                  Primary: {activeDirection}
                </span>
                {secondaryDirection ? (
                  <span className="rounded-full border border-fuchsia-300/20 bg-fuchsia-300/10 px-3 py-1 text-xs font-black text-fuchsia-100">
                    Secondary: {secondaryDirection}
                  </span>
                ) : null}
                <span className="rounded-full border border-violet-300/20 bg-violet-300/10 px-3 py-1 text-xs font-black text-violet-100">
                  Plan directions {selectedDirections.length}/2
                </span>
                <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-xs font-black text-amber-100">
                  Mode: {goals.goalMode}
                </span>
                <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs font-black text-emerald-100">
                  {goals.targetWeeklySessions || 0} sessions / wk
                </span>
                <span className="rounded-full border border-sky-300/20 bg-sky-300/10 px-3 py-1 text-xs font-black text-sky-100">
                  Timeline: {goalDeadlineLabel}
                </span>
                <span className="rounded-full border border-fuchsia-300/20 bg-fuchsia-300/10 px-3 py-1 text-xs font-black text-fuchsia-100">
                  Goal setup {goalSetupCompletion}%
                </span>
              </div>
            </div>
            <div className="rounded-[30px] border border-cyan-300/15 bg-slate-950/58 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-200">
                Recommended Next Goal Step
              </p>
              <p className="mt-3 text-xl font-black leading-tight text-white">
                {recommendedNextStep}
              </p>
              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                <TranslationCard label="Timeline" value={goalDeadlineLabel} />
                <TranslationCard label="Goal Progress" value={`${goalSetupCompletion}% complete`} />
                <TranslationCard label="Milestones" value={milestoneCount ? `${milestoneCount} milestone${milestoneCount === 1 ? "" : "s"} noted` : "Add milestones"} />
                <TranslationCard label="Member" value={`${profile.displayName} · ${profile.trainingAge}`} />
                <TranslationCard label="Weight Target" value={weightDelta ? `${weightDelta > 0 ? "Gain" : "Lose"} ${Math.abs(weightDelta).toLocaleString()} lb` : "Add body metrics"} />
                <TranslationCard label="Weekly Momentum" value={`${weeklySets} / ${weeklyTarget} sets · ${completion}%`} />
                <TranslationCard label="Favorites" value={`${favoriteCount} saved exercise targets`} />
              </div>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-[30px] border border-white/10 bg-slate-950/58 shadow-[0_24px_80px_rgba(0,0,0,0.38)] backdrop-blur-xl">
          <button
            type="button"
            onClick={() => setPlanDirectionOpen((current) => !current)}
            className="flex w-full flex-col gap-3 p-4 text-left transition hover:bg-white/[0.025] sm:flex-row sm:items-center sm:justify-between"
            aria-expanded={planDirectionOpen}
          >
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-200">
                Plan Direction
              </p>
              <h2 className="mt-2 text-xl font-black text-white sm:text-2xl">
                {goalSetupCompletion}% · {primaryDirection ? `Primary: ${primaryDirection}` : "No direction selected"}
                {secondaryDirection ? ` · Secondary: ${secondaryDirection}` : ""}
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {primaryDirection ? (
                <span className={`rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.1em] ${planDirectionVisualStyles[primaryDirection].accent}`}>
                  Primary
                </span>
              ) : null}
              {secondaryDirection ? (
                <span className={`rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.1em] ${planDirectionVisualStyles[secondaryDirection].accent}`}>
                  Secondary
                </span>
              ) : null}
              <span className="rounded-full border border-white/10 bg-white/[0.045] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.1em] text-slate-300">
                {selectedDirections.length}/2 selected
              </span>
              <span
                className={`grid h-9 w-9 place-items-center rounded-2xl border border-white/10 bg-slate-950/60 text-lg font-black text-cyan-100 transition ${planDirectionOpen ? "rotate-180" : ""}`}
                aria-hidden="true"
              >
                v
              </span>
            </div>
          </button>

          {planDirectionOpen ? (
            <div className="border-t border-white/10 p-4">
              {/* TODO: Primary plan direction should drive main programming. */}
              {/* TODO: Secondary plan direction should modify accessories, recovery, and cardio once robo-coach rules are ready. */}
              <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <p className="rounded-2xl border border-cyan-200/16 bg-cyan-300/8 px-4 py-3 text-xs font-semibold leading-5 text-cyan-50">
                  {planDirectionMessage ||
                    "Choose up to 2 priorities. The first selected card is Primary; the second is Secondary."}
                </p>
                <button
                  type="button"
                  onClick={saveGoals}
                  className="min-h-[44px] rounded-2xl bg-cyan-300 px-5 py-3 text-xs font-black uppercase tracking-[0.12em] text-slate-950 shadow-[0_0_26px_rgba(34,211,238,0.24)] transition hover:bg-cyan-200"
                >
                  Save Goals
                </button>
              </div>

              <div className="mb-4 rounded-[24px] border border-white/10 bg-white/[0.035] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-100/80">
                    Selected Direction Insights
                  </p>
                  <span className="rounded-full border border-white/10 bg-slate-950/48 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
                    {selectedDirections.length}/2 selected
                  </span>
                </div>
                {selectedDirections.length ? (
                  <>
                    <div className="mt-3 grid gap-3 lg:grid-cols-2">
                      {selectedDirections.map((direction, index) => {
                        const style = planDirectionVisualStyles[direction];
                        return (
                          <div
                            key={direction}
                            className="relative overflow-hidden rounded-[22px] border border-white/10 bg-slate-950/48 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                          >
                            <span
                              aria-hidden="true"
                              className={`pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r ${style.wash} opacity-80`}
                            />
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] ${style.accent}`}>
                                {index === 0 ? "Primary" : "Secondary"}
                              </span>
                              <p className="text-sm font-black text-white">{direction}</p>
                            </div>
                            <p className="mt-3 text-xs font-semibold leading-5 text-slate-300">
                              {planDirectionInsights[direction]}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-3 rounded-2xl border border-emerald-200/14 bg-emerald-300/8 p-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-100/80">
                        Combo Insight
                      </p>
                      <p className="mt-2 text-xs font-semibold leading-5 text-slate-200">
                        {getPlanDirectionComboInsight(selectedDirections)}
                      </p>
                    </div>
                  </>
                ) : (
                  <p className="mt-3 rounded-2xl border border-dashed border-white/12 bg-slate-950/36 p-3 text-xs font-semibold leading-5 text-slate-400">
                    Choose up to 2 plan directions to unlock personalized programming insights.
                  </p>
                )}
              </div>

              <div className="mb-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  aria-label="Scroll Plan Direction left"
                  onClick={() => scrollPlanDirection("left")}
                  className="grid h-10 w-10 place-items-center rounded-2xl border border-cyan-200/18 bg-cyan-300/8 text-lg font-black text-cyan-100 transition hover:border-cyan-200/45 hover:bg-cyan-300/16"
                >
                  &lt;
                </button>
                <button
                  type="button"
                  aria-label="Scroll Plan Direction right"
                  onClick={() => scrollPlanDirection("right")}
                  className="grid h-10 w-10 place-items-center rounded-2xl border border-fuchsia-200/18 bg-fuchsia-300/8 text-lg font-black text-fuchsia-100 transition hover:border-fuchsia-200/45 hover:bg-fuchsia-300/16"
                >
                  &gt;
                </button>
              </div>

              <div
                ref={planDirectionSliderRef}
                onScroll={markPlanDirectionScrolling}
                style={planDirectionScrollbarStyle}
                className={`flex max-w-full snap-x snap-mandatory gap-3 overflow-x-auto overflow-y-visible overscroll-x-contain scroll-smooth pb-5 pr-4 [scrollbar-color:var(--plan-scroll-via)_rgba(15,23,42,0.74)] [scrollbar-width:auto] [touch-action:pan-x] [&::-webkit-scrollbar]:h-3 [&::-webkit-scrollbar]:transition-all [&::-webkit-scrollbar]:duration-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:border-[3px] [&::-webkit-scrollbar-thumb]:border-slate-950/80 [&::-webkit-scrollbar-thumb]:bg-[linear-gradient(90deg,var(--plan-scroll-from),var(--plan-scroll-via),var(--plan-scroll-to))] [&::-webkit-scrollbar-thumb]:shadow-[0_0_18px_var(--plan-scroll-glow)] [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:border [&::-webkit-scrollbar-track]:border-white/10 [&::-webkit-scrollbar-track]:bg-slate-950/72 hover:[&::-webkit-scrollbar]:h-4 ${
                  planDirectionScrolling
                    ? "[&::-webkit-scrollbar]:h-4 [&::-webkit-scrollbar-thumb]:shadow-[0_0_34px_var(--plan-scroll-glow)] [&::-webkit-scrollbar-thumb]:animate-pulse"
                    : ""
                }`}
              >
                {goalCards
                  .filter((goal) => goal.id !== "Maintain")
                  .map((goal) => {
                    const selectedIndex = selectedDirections.indexOf(goal.id);
                    const isActive = selectedIndex >= 0;
                    const style = planDirectionVisualStyles[goal.id];

                    return (
                      <button
                        key={goal.id}
                        type="button"
                        aria-pressed={isActive}
                        onClick={() => togglePlanDirection(goal.id)}
                        className={`group relative flex min-h-[156px] w-[230px] shrink-0 snap-center flex-col overflow-hidden rounded-[24px] border p-3.5 text-left transition duration-300 hover:-translate-y-1 active:scale-[0.99] sm:w-[248px] ${
                          isActive
                            ? `${style.ring} ${selectedIndex === 0 ? "ring-2 ring-white/18" : "ring-1 ring-white/10 opacity-95"}`
                            : `border-white/10 bg-[radial-gradient(circle_at_18%_0%,rgba(255,255,255,0.055),transparent_34%),rgba(15,23,42,0.58)] shadow-[inset_0_1px_0_rgba(255,255,255,0.07)] ${style.card}`
                        }`}
                      >
                        <span
                          aria-hidden="true"
                          className={`pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r ${style.wash} opacity-90`}
                        />
                        <span
                          aria-hidden="true"
                          className={`grid h-12 w-12 place-items-center rounded-2xl border text-xl ${style.accent}`}
                        >
                          {style.icon}
                        </span>
                        <div className="relative mt-auto pt-5">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-base font-black leading-tight text-white">
                              {goal.id}
                            </p>
                            <span
                              className="grid h-7 w-7 place-items-center rounded-full border border-white/10 bg-slate-950/70 text-[10px] font-black text-slate-300"
                              title={`${goal.purpose} ${goal.planEffect}`}
                            >
                              i
                            </span>
                          </div>
                          <p className="mt-2 text-xs font-semibold leading-5 text-slate-400">
                            {goal.planEffect}
                          </p>
                          <span className={`mt-3 inline-flex rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.11em] ${isActive ? style.accent : "border-white/10 bg-white/[0.04] text-slate-400"}`}>
                            {selectedIndex === 0 ? "Primary" : selectedIndex === 1 ? "Secondary" : "Select"}
                          </span>
                        </div>
                      </button>
                    );
                  })}
              </div>
            </div>
          ) : null}
        </section>

        {savedMessage ? (
          <p className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-4 py-3 text-sm font-bold text-emerald-100">
            {savedMessage}
          </p>
        ) : null}

        <section className="grid gap-5 xl:grid-cols-[0.92fr_1.08fr]">
          <section className="rounded-[30px] border border-white/10 bg-slate-950/58 p-5 shadow-2xl">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-200">
              Goal Stack
            </p>
            <div className="mt-5 grid gap-4">
              <SelectField label="Primary Goal" value={goals.primaryGoal} options={goalOptions} onChange={(value) => updateGoal("primaryGoal", value as GoalId)} />
              <SelectField label="Secondary Goal" value={goals.secondaryGoal} options={goalOptions} onChange={(value) => updateGoal("secondaryGoal", value as GoalId)} />
              <label className="block">
                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200">
                  Constraint Goal
                </span>
                <input
                  value={goals.constraintGoal}
                  onChange={(event) => updateGoal("constraintGoal", event.target.value)}
                  className="mt-2 min-h-[48px] w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm font-bold text-white outline-none transition focus:border-cyan-300"
                />
              </label>
              <SelectField label="Goal Mode" value={goals.goalMode} options={["Bulk", "Cut", "Maintain", "Strength", "General Health", "Performance", "Recovery"]} onChange={(value) => updateGoal("goalMode", value)} />
              <SelectField label="Goal Priorities" value={goals.goalPriorityRanking} options={goalPrioritySelectOptions} onChange={(value) => updateGoal("goalPriorityRanking", value)} />
            </div>
          </section>

          <section className="rounded-[30px] border border-white/10 bg-slate-950/58 p-5 shadow-2xl">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-200">
              Body Goals
            </p>
            <div className="mt-5 grid gap-3 lg:grid-cols-[0.8fr_1.2fr]">
              <TranslationCard
                label="Current Weight"
                value={goals.currentWeight ? `${goals.currentWeight} lb from Profile` : "Set current weight in Profile"}
              />
              <MetricSliderField
                accent="rgb(52,211,153)"
                defaultValue={175}
                helper="Goal weight keeps body-direction recommendations grounded."
                label="Goal Weight"
                max={480}
                min={80}
                onChange={(value) => updateGoal("goalWeight", value)}
                suffix="lb"
                value={goals.goalWeight}
              />
            </div>

            <div className="mt-5 rounded-[24px] border border-white/10 bg-white/[0.025] p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-200">
                Daily Targets
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <MetricSliderField
                  accent="rgb(196,181,253)"
                  defaultValue={8000}
                  helper="Daily movement target for goal pacing and consistency."
                  label="Steps Goal"
                  max={25000}
                  min={1000}
                  onChange={updateStepsGoal}
                  step={500}
                  suffix="steps"
                  value={goals.stepsGoal || goals.targetSteps}
                />
                <MetricSliderField
                  accent="rgb(125,211,252)"
                  defaultValue={96}
                  helper="Hydration target for recovery and daily target tracking."
                  label="Water Goal"
                  max={180}
                  min={20}
                  onChange={(value) => updateGoal("waterGoal", value)}
                  step={4}
                  suffix="oz"
                  value={goals.waterGoal}
                />
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Weekly Sessions" value={goals.targetWeeklySessions} suffix="/ wk" onChange={(value) => updateGoal("targetWeeklySessions", value)} />
              <Field label="Weekly Sets" value={goals.targetWeeklySets} suffix="sets" onChange={(value) => updateGoal("targetWeeklySets", value)} />
              <Field label="Protein Target" value={goals.targetProtein} suffix="g" onChange={(value) => updateGoal("targetProtein", value)} />
              <Field label="Sleep Target" value={goals.targetSleep} suffix="hrs" onChange={(value) => updateGoal("targetSleep", value)} />
              <label className="block rounded-[24px] border border-white/10 bg-white/[0.045] p-4 sm:col-span-2">
                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                  Benchmark Goal
                </span>
                <textarea
                  value={goals.benchmarkGoal}
                  onChange={(event) => updateGoal("benchmarkGoal", event.target.value)}
                  className="mt-3 min-h-[92px] w-full resize-none bg-transparent text-sm font-semibold leading-6 text-white outline-none placeholder:text-slate-600"
                />
              </label>
            </div>
          </section>
        </section>

        <section className="rounded-[30px] border border-white/10 bg-slate-950/58 p-5 shadow-2xl">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-200">
                Goal Timeline & Motivation
              </p>
              <h2 className="mt-2 text-2xl font-black">Milestones, focus, and progress live here.</h2>
            </div>
            <div className="min-w-[220px] rounded-2xl border border-white/10 bg-white/[0.04] p-3">
              <div className="flex items-center justify-between gap-3 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                <span>Goal Progress</span>
                <span className="text-cyan-100">{goalSetupCompletion}%</span>
              </div>
              <div className="mt-3 h-2 rounded-full bg-slate-900">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-emerald-300 to-amber-300"
                  style={{ width: `${Math.min(goalSetupCompletion, 100)}%` }}
                />
              </div>
            </div>
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
            <div className="grid gap-4">
              <DateField label="Goal Timeline" value={goals.goalDeadline} onChange={(value) => updateGoal("goalDeadline", value)} />
              <TranslationCard label="Timeline Summary" value={`${goalDeadlineLabel} - ${milestoneCount ? `${milestoneCount} milestone${milestoneCount === 1 ? "" : "s"}` : "milestones not set"}`} />
              <TranslationCard label="Recommended Next Goal Step" value={recommendedNextStep} />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <TextAreaField label="Goal Milestones" value={goals.goalMilestones} onChange={(value) => updateGoal("goalMilestones", value)} placeholder="Example: First 4-week consistency streak, strength benchmark, measurement checkpoint..." />
              <TextAreaField label="Motivation / Focus" value={goals.motivationFocus} onChange={(value) => updateGoal("motivationFocus", value)} placeholder="What should the coach and app keep you focused on?" />
              <div className="md:col-span-2">
                <TextAreaField label="Plan Direction Notes" value={goals.planDirectionNotes} onChange={(value) => updateGoal("planDirectionNotes", value)} placeholder="Extra guidance for plan generation, tradeoffs, or goal context." />
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[30px] border border-white/10 bg-slate-950/58 p-5 shadow-2xl">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-200">
            Goal-to-Plan Translation
          </p>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <TranslationCard label="Exercise Library Filters" value={`${selectedGoalCard.libraryFocus} · prioritize ${activeDirection.toLowerCase()} matches`} />
            <TranslationCard label="Builder Defaults" value={`${selectedGoalCard.intensity} intensity with ${selectedGoalCard.volume.toLowerCase()} volume`} />
            <TranslationCard label="My Plan Split" value={`${goals.targetWeeklySessions || 4} sessions weekly · ${goals.constraintGoal}`} />
            <TranslationCard label="Phases" value={selectedGoalCard.phaseType} />
            <TranslationCard label="Recovery Warnings" value={activeDirection === "Recovery" ? "Lower heat threshold and mobility-first substitutions." : "Warn when volume exceeds the weekly target."} />
            <TranslationCard label="Nutrition Direction" value={goals.goalMode === "Cut" || activeDirection === "Lose Fat" ? "Protein consistency, steps, and moderate deficit support." : "Fuel performance and recovery around training."} />
          </div>
        </section>

        {renderMasterTrainingJourney()}

        <p className="text-xs text-slate-600">
          Local data read safely from {storageKeys.join(", ")}.
        </p>
      </section>
    </main>
  );
}
