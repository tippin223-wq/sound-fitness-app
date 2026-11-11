"use client";

import Link from "next/link";
import Image from "next/image";
import { UserRound, ClipboardList, ChevronLeft, ChevronRight, Apple, Flag, Info, Trophy, Medal, Cake, Ruler, Scale, PersonStanding, CalendarCheck, CalendarDays, CalendarRange } from "lucide-react";
import {

  type CSSProperties,
  type ReactNode,
  type KeyboardEvent as ReactKeyboardEvent,
  type WheelEvent as ReactWheelEvent,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import DashboardExperience from "@/components/dashboard/DashboardExperience";
import { useProfile } from "@/components/profile/ProfileProvider";
import SessionsCardNavigation from "@/components/dashboard/SessionsCardNavigation";
import styles from "./goals.module.css";
import DashboardTabIcon from "@/components/dashboard/DashboardTabIcon";
import { sessionRewardSummary, sessionRewardLabel } from "@/lib/planning/sessionRewards";
import { readPlanning, planningKeys, planningOwner, planningAccountGeneration, planningRecordVersion, planningSnapshot, subscribePlanning } from "@/lib/planning/store";
import { normalizeGoalId, normalizeGoals, savedGoalsIssue, saveGoalsRecord, type GoalState, type GoalId } from "@/lib/planning/goals";
import { completeBankGoal, validGoalBank } from "@/lib/planning/goalBank";
import profileStyles from "@/components/profile/ProfileHero.module.css";
import PhysicalReadinessMeter from "@/components/profile/PhysicalReadinessMeter";
import GoalsHeroInsights from "@/components/dashboard/GoalsHeroInsights";
import GoalDateDots from "@/components/dashboard/GoalDateDots";

import type { TrainingAreaPreferences } from "@/lib/trainingAreaCare";
import { setsInWeek } from "@/lib/planning/logs";
import { trainingJourneyState, readTrainingJourneyWorkoutLogs } from "@/lib/planning/trainingJourney";
import { cloudHistorySnapshot, serverCloudHistory } from "@/lib/planning/availableLogs";
import { checkInWeek } from "@/lib/planning/checkIns";
import { localDate, validDateOnly } from "@/lib/planning/dates";
import { goalDateMilestones } from "@/lib/planning/goalDateMilestones";
import { goalNumber } from "@/lib/planning/goalNumbers";
import { usePlanningDay } from "@/lib/planning/usePlanningDay";
import { planGoalsNeedReview, inspectWorkoutPlans, createWorkoutPlan } from "@/lib/localData/workoutPlanData";
import { ROUTES } from "@/lib/routes";

type JsonObject = Record<string, unknown>;

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
  (Object.values(planningKeys) as string[]).includes(key) ? readPlanning(key, null) : key === "soundFitnessPlan" ? inspectWorkoutPlans().plans.find(p => p.status === "active") || null : typeof window === "undefined" ? null : safeJsonParse(window.localStorage.getItem(key));

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

const normalizePlanDirections = (
  directions: unknown,
  fallbackGoalMode: unknown,
): GoalId[] => {
  if (Array.isArray(directions)) {
    return Array.from(new Set(directions.map(normalizeGoalId).filter((id): id is GoalId => Boolean(id)))).slice(0, 2);
  }

  const fallback = normalizeGoalId(fallbackGoalMode);
  if (fallback) return [fallback];

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
    primaryGoal: normalizeGoalId(profile.primaryGoal) || "General Health",
    secondaryGoal: normalizeGoalId(profile.secondaryGoal) || "",
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
            {value ? numeric.toLocaleString() : "Not set"}{" "}
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
        aria-label={label}
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
      {helper && <p className="mt-3 text-xs font-semibold leading-5 text-slate-400">{helper}</p>}
    </div>
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

type GoalOrbiterIconName =
  | "calendar"
  | "compass"
  | "scale"
  | "signal"
  | "stage"
  | "nutrition";

function GoalOrbiterIcon({
  name,
  className = "h-5 w-5",
}: {
  className?: string;
  name: GoalOrbiterIconName;
}) {
  const iconProps = {
    className,
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 2.2,
    viewBox: "0 0 24 24",
  };

  switch (name) {
    case "nutrition": return <Apple className={className} aria-hidden="true" />;
    case "calendar":
      return (
        <svg {...iconProps}>
          <path d="M8 2v4" />
          <path d="M16 2v4" />
          <rect height="18" rx="3" width="18" x="3" y="4" />
          <path d="M3 10h18" />
          <path d="M8 14h3" />
          <path d="M13 14h3" />
          <path d="M8 18h3" />
        </svg>
      );
    case "compass":
      return (
        <svg {...iconProps}>
          <circle cx="12" cy="12" r="9" />
          <path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" />
        </svg>
      );
    case "scale":
      return (
        <svg {...iconProps}>
          <path d="M7 20h10" />
          <path d="M12 4v16" />
          <path d="M5 7h14" />
          <path d="m6 7-3 6h6L6 7Z" />
          <path d="m18 7-3 6h6l-3-6Z" />
        </svg>
      );
    case "signal":
      return (
        <svg {...iconProps}>
          <path d="M4 19v-4" />
          <path d="M9 19V9" />
          <path d="M14 19v-7" />
          <path d="M19 19V5" />
        </svg>
      );
    case "stage":
      return (
        <svg {...iconProps}>
          <path d="M5 19h14" />
          <path d="M7 15h10" />
          <path d="M9 11h6" />
          <path d="M12 5v6" />
          <path d="m9 8 3-3 3 3" />
        </svg>
      );
    default:
      return (
        <svg {...iconProps}>
          <circle cx="12" cy="12" r="8" />
        </svg>
      );
  }
}

export default function GoalsPage() {
  const { profile: memberIdentity } = useProfile();
  usePlanningDay();
  useSyncExternalStore(subscribePlanning, planningSnapshot, planningSnapshot);
  useSyncExternalStore(subscribePlanning, cloudHistorySnapshot, serverCloudHistory);
  const weekStart = checkInWeek(new Date());
  const weekEnd = new Date(`${weekStart}T12:00:00`); weekEnd.setDate(weekEnd.getDate() + 6);
  const weeklySets = setsInWeek(weekStart, localDate(weekEnd));
  const favoriteCount = readArrayLength("soundFitnessFavorites");
  const [profile, setProfile] = useState<ProfileSnapshot>(() => defaultProfile());
  const [goals, setGoals] = useState<GoalState>(() => buildGoalsFromProfile(defaultProfile()));
  const [activeGoalsHeaderIndex, setActiveGoalsHeaderIndex] = useState(0);
  const [goalsHeaderSlideDirection, setGoalsHeaderSlideDirection] =
    useState<"left" | "right">("right");
  const [activeGoalsOrbiterRow, setActiveGoalsOrbiterRow] = useState(0);
  const goalsViewportRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const viewport = goalsViewportRef.current;
    if (!viewport) return;
    let previousHeight = viewport.clientHeight;
    const observer = new ResizeObserver(() => {
      const height = viewport.clientHeight;
      if (!height || height === previousHeight) return;
      const row = Math.round(viewport.scrollTop / Math.max(1, previousHeight));
      previousHeight = height;
      viewport.scrollTo({ top: row * height, behavior: "instant" });
      setActiveGoalsOrbiterRow(row);
    });
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);
  const [activeGoalOrbiterIndex, setActiveGoalOrbiterIndex] = useState(0);
  const [hoveredDirectionInfo, setHoveredDirectionInfo] = useState<GoalId | null>(null);
  const [pinnedDirectionInfo, setPinnedDirectionInfo] = useState<GoalId | null>(null);
  const [planNotice, setPlanNotice] = useState("");
  const [highlightedDirection, setHighlightedDirection] = useState(0);
  const [planDirectionMessage, setPlanDirectionMessage] = useState("");
  const [planDirectionScrolling, setPlanDirectionScrolling] = useState(false);
  const [masterJourneyExpanded, setMasterJourneyExpanded] = useState(false);
  const [openMasterJourney, setOpenMasterJourney] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState("");
  const [goalCelebration, setGoalCelebration] = useState("");
  const [savedSnapshot, setSavedSnapshot] = useState("");
  const goalsVersionRef = useRef(planningRecordVersion(planningKeys.goals));
  const accountRef = useRef(planningOwner());
  const generationRef = useRef(planningAccountGeneration());
  const goalsRef = useRef(goals);
  const savedRef = useRef(savedSnapshot);
  useEffect(() => { goalsRef.current = goals; savedRef.current = savedSnapshot; }, [goals, savedSnapshot]);
  useEffect(() => subscribePlanning(() => {
    if (savedRef.current && JSON.stringify(goalsRef.current) === savedRef.current) {
      const record = { ...buildGoalsFromProfile(getProfileSnapshot()), ...normalizeGoals(readPlanning(planningKeys.goals, {})) } as GoalState;
      goalsVersionRef.current = planningRecordVersion(planningKeys.goals);
      accountRef.current = planningOwner(); generationRef.current = planningAccountGeneration();
      setGoals(record); setSavedSnapshot(JSON.stringify(record));
    }
  }), []);
  const planDirectionSliderRef = useRef<HTMLDivElement | null>(null);
  const planDirectionScrollTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("soundFitnessDashboardGoalsVisited", "true");
    }

    const profileSnapshot = getProfileSnapshot();
    const storedGoals = normalizeGoals(asRecord(readLocal("soundFitnessGoals")));
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
      primaryGoal: normalizeGoalId(mergedGoals.primaryGoal) || "General Health",
      secondaryGoal: normalizeGoalId(mergedGoals.secondaryGoal) || "",
      stepsGoal: getString(storedGoals, ["stepsGoal", "targetSteps"], mergedGoals.stepsGoal || mergedGoals.targetSteps || ""),
      targetSteps: getString(storedGoals, ["targetSteps", "stepsGoal"], mergedGoals.targetSteps || mergedGoals.stepsGoal || "8000"),
      waterGoal: getString(storedGoals, ["waterGoal"], mergedGoals.waterGoal || ""),
    } as GoalState;

    goalsVersionRef.current = planningRecordVersion(planningKeys.goals);
      accountRef.current = planningOwner(); generationRef.current = planningAccountGeneration();
    setProfile(profileSnapshot);
    setGoals(nextGoals);
    setSavedSnapshot(JSON.stringify(nextGoals));
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
  const savedGoalIssue = savedGoalsIssue(readPlanning(planningKeys.goals, {}));
  const unsavedGoalChanges = Boolean(savedSnapshot && JSON.stringify(goals) !== savedSnapshot);
  const weightDelta =
    Number(goals.goalWeight || 0) && Number(goals.currentWeight || 0)
      ? Number(goals.goalWeight) - Number(goals.currentWeight)
      : 0;
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
  const goalPrioritySelectOptions =
    goals.goalPriorityRanking &&
    !goalPriorityOptions.includes(
      goals.goalPriorityRanking as (typeof goalPriorityOptions)[number],
    )
      ? [goals.goalPriorityRanking, ...goalPriorityOptions]
      : [...goalPriorityOptions];
  const displayName = profile.displayName.trim() || "Member";
  const memberName = getString(memberIdentity, ["displayName", "fullName", "name"], displayName);
  const memberPhoto = getString(memberIdentity, ["profileImage", "avatarUrl"], "");
  const memberHandle = getString(memberIdentity, ["username", "handle"], memberName.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 24)).replace(/^@+/, "");
  const memberBirthday = getString(memberIdentity, ["birthday"], "");
  const birthDate = memberBirthday ? new Date(`${memberBirthday}T00:00:00`) : null;
  const today = new Date();
  const birthdayPending = birthDate && (today.getMonth() < birthDate.getMonth() || (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate()));
  const memberAge = birthDate && Number.isFinite(birthDate.getTime()) ? today.getFullYear() - birthDate.getFullYear() - (birthdayPending ? 1 : 0) : null;
  const memberGender = getString(memberIdentity, ["gender"], "");
  const rawMemberHeight = getString(memberIdentity, ["height"], "");
  const metricHeight = asRecord(memberIdentity.appPersonalization).preferredUnitSystem === "kg";
  const numericHeight = /^\d+(\.\d+)?$/.test(rawMemberHeight) ? Number(rawMemberHeight) : null;
  const memberHeight = numericHeight !== null ? metricHeight ? `${numericHeight} cm` : `${Math.floor(Math.round(numericHeight) / 12)}′ ${Math.round(numericHeight) % 12}″` : rawMemberHeight;
  const firstName = displayName.split(/\s+/)[0] || "Member";
  const goalRewards = sessionRewardSummary(readPlanning(planningKeys.profile, {}), []);
  const soundPoints = goalRewards.soundPoints;
  const soundTokens = goalRewards.soundTokens;
  const goalsHeaderLinks = [
    {
      href: ROUTES.dashboard.home,
      icon: "dashboard",
      label: "Dashboard",
      meta: "Command",
      tone:
        "border-cyan-200/30 bg-cyan-300/10 text-cyan-100 hover:border-cyan-100/45 hover:bg-cyan-300/16",
    },
    {
      href: ROUTES.dashboard.profile,
      icon: "profile",
      label: "Profile",
      meta: "Identity",
      tone:
        "border-cyan-200/30 bg-cyan-300/10 text-cyan-100 hover:border-cyan-100/45 hover:bg-cyan-300/16",
    },
    {
      href: ROUTES.dashboard.sessions,
      icon: "workout",
      label: "Workout",
      meta: "Sessions",
      tone:
        "border-sky-200/28 bg-sky-300/10 text-sky-100 hover:border-sky-100/45 hover:bg-sky-300/16",
    },
    {
      href: ROUTES.nutritionPortal.home,
      icon: "nutrition",
      label: "Nutrition",
      meta: "Fuel",
      tone:
        "border-emerald-200/28 bg-emerald-300/10 text-emerald-100 hover:border-emerald-100/45 hover:bg-emerald-300/16",
    },
    {
      href: ROUTES.dashboard.recovery,
      icon: "recovery",
      label: "Recovery",
      meta: "Readiness",
      tone:
        "border-violet-200/28 bg-violet-300/10 text-violet-100 hover:border-violet-100/45 hover:bg-violet-300/16",
    },
    {
      href: ROUTES.performance.home,
      icon: "performance",
      label: "Performance",
      meta: "Athletic",
      tone:
        "border-amber-200/30 bg-amber-300/10 text-amber-100 hover:border-amber-100/45 hover:bg-amber-300/16",
    },
    {
      href: ROUTES.learning.home,
      icon: "education",
      label: "Education",
      meta: "Learning",
      tone:
        "border-blue-200/28 bg-blue-300/10 text-blue-100 hover:border-blue-100/45 hover:bg-blue-300/16",
    },
    {
      href: ROUTES.soundworld.home,
      icon: "soundworld",
      label: "Sound World",
      meta: "Community",
      tone:
        "border-pink-200/28 bg-pink-300/10 text-pink-100 hover:border-pink-100/45 hover:bg-pink-300/16",
    },
  ] as const;
  const activeGoalsHeaderLink =
    goalsHeaderLinks[activeGoalsHeaderIndex % goalsHeaderLinks.length] ||
    goalsHeaderLinks[0];
  const goalsHeaderCommandLink =
    goalsHeaderLinks.find((dashboardLink) => dashboardLink.label === "Dashboard") ||
    goalsHeaderLinks[0];
  const rotateGoalsHeaderRail = (direction: "left" | "right") => {
    setGoalsHeaderSlideDirection(direction);
    setActiveGoalsHeaderIndex((currentIndex) =>
      direction === "left"
        ? (currentIndex - 1 + goalsHeaderLinks.length) %
          goalsHeaderLinks.length
        : (currentIndex + 1) % goalsHeaderLinks.length,
    );
  };
  const goalsOrbiterRows = ["Goals Overview","Your Goals","Goal Bank","Plan Bank","Proceed to training plans"].map(label=>({label}));
  const activeGoalsOrbiterRowIndex = Math.max(
    0,
    Math.min(activeGoalsOrbiterRow, goalsOrbiterRows.length - 1),
  );
  const setGoalsOrbiterRow=(rowIndex:number)=>{const next=Math.max(0,Math.min(rowIndex,goalsOrbiterRows.length-1));setActiveGoalsOrbiterRow(next);const el=goalsViewportRef.current;if(el)el.scrollTo({top:next*el.clientHeight,behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"instant":"smooth"});};
  const moveGoalsOrbiterRow=(direction:-1|1)=>setGoalsOrbiterRow(activeGoalsOrbiterRowIndex+direction);
  const handleGoalsOrbiterWheel = (event: ReactWheelEvent<HTMLElement>) => {
    if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
    if (Math.abs(event.deltaY) < 18) return;

    const direction = event.deltaY > 0 ? 1 : -1;
    const nextIndex = Math.max(
      0,
      Math.min(activeGoalsOrbiterRowIndex + direction, goalsOrbiterRows.length - 1),
    );

    if (nextIndex === activeGoalsOrbiterRowIndex) return;
    event.preventDefault();
    setGoalsOrbiterRow(nextIndex);
  };
  const handleGoalsOrbiterKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    const target = event.target as HTMLElement | null;
    if (
      target?.isContentEditable ||
      ["A", "BUTTON", "INPUT", "SELECT", "TEXTAREA"].includes(
        target?.tagName || "",
      )
    ) {
      return;
    }

    if (event.key === "ArrowDown" || event.key === "PageDown") {
      event.preventDefault();
      moveGoalsOrbiterRow(1);
    } else if (event.key === "ArrowUp" || event.key === "PageUp") {
      event.preventDefault();
      moveGoalsOrbiterRow(-1);
    }
  };

  const renderGoalsOrbiterTopMenu = () => (
    <div className="sticky top-0 z-[120] mb-0 w-full overflow-hidden border-b border-cyan-100/18 bg-[radial-gradient(circle_at_16%_0%,rgba(34,211,238,0.18),transparent_34%),radial-gradient(circle_at_88%_12%,rgba(251,191,36,0.10),transparent_30%),linear-gradient(135deg,rgba(15,23,42,0.86),rgba(2,6,23,0.78))] shadow-[0_20px_70px_rgba(0,0,0,0.34),0_0_34px_rgba(34,211,238,0.10),inset_0_1px_0_rgba(255,255,255,0.10)] backdrop-blur-xl">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-6 top-0 h-px rounded-full bg-gradient-to-r from-transparent via-cyan-100/55 to-transparent"
      />
      <div className="relative mx-auto flex min-h-[84px] w-full max-w-[1840px] items-center gap-4 px-3 py-3 sm:px-4 sm:py-4 md:px-6 xl:px-8 2xl:px-10">
        <Link
          aria-label="Open Sound Fitness dashboard"
          className="flex min-h-[58px] min-w-0 shrink-0 items-center gap-3 rounded-[24px] border border-transparent bg-transparent px-2.5 py-2 transition hover:border-cyan-100/24 hover:bg-cyan-300/8"
          href={ROUTES.dashboard.home}
        >
          <Image
            alt="Sound Fitness"
            className="h-10 w-10 shrink-0 rounded-full object-contain"
            height={40}
            src="/sound-fitness-logo.png"
            width={40}
          />
          <span className="hidden min-w-0 leading-[0.9] sm:block">
            <span className="block text-sm font-black uppercase tracking-[0.12em] text-white">
              Sound
            </span>
            <span className="block text-[9px] font-black uppercase tracking-[0.34em] text-cyan-300">
              Fitness
            </span>
          </span>
          <span className="hidden rounded-full border border-cyan-200/28 bg-cyan-300/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.13em] text-cyan-100 lg:inline-flex">
            Member
          </span>
        </Link>

        <div className="min-w-0 flex-1" />

        <div
          aria-label="Dashboard selector"
          className="flex w-fit max-w-[calc(100vw-7.5rem)] shrink-0 select-none items-center gap-1.5 bg-transparent p-0 shadow-none md:max-w-[min(56vw,520px)] lg:max-w-none"
        >
          <button
            aria-label="Previous dashboard"
            className="grid h-11 w-9 shrink-0 place-items-center rounded-2xl border border-transparent bg-transparent text-xs font-black text-cyan-100/80 transition hover:-translate-x-0.5 hover:border-amber-200/28 hover:bg-amber-300/8 hover:text-amber-100 active:scale-95"
            onClick={() => rotateGoalsHeaderRail("left")}
            type="button"
          >
            &lt;
          </button>
          <Link
            className={`flex min-h-[58px] w-auto min-w-max shrink-0 items-center gap-3 rounded-[22px] border border-transparent bg-transparent px-2.5 py-2 text-left text-cyan-50 shadow-none transition hover:-translate-y-0.5 hover:bg-white/[0.04] ${
              goalsHeaderSlideDirection === "right"
                ? "animate-[sessions-dashboard-chip-slide-from-right_220ms_ease-out]"
                : "animate-[sessions-dashboard-chip-slide-from-left_220ms_ease-out]"
            }`}
            draggable={false}
            href={activeGoalsHeaderLink.href}
            key={`${activeGoalsHeaderLink.label}-${goalsHeaderSlideDirection}`}
            onDragStart={(event) => event.preventDefault()}
          >
            <span
              aria-hidden="true"
              className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl border text-[11px] font-black shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_16px_rgba(255,255,255,0.06)] ${activeGoalsHeaderLink.tone}`}
            >
              <DashboardTabIcon name={activeGoalsHeaderLink.icon} />
            </span>
            <span className="shrink-0 whitespace-nowrap">
              <span className="block text-[8px] font-black uppercase tracking-[0.14em] opacity-70">
                {activeGoalsHeaderLink.meta}
              </span>
              <span className="mt-0.5 block text-[10px] font-black uppercase tracking-[0.12em] sm:text-[11px]">
                {activeGoalsHeaderLink.label}
              </span>
            </span>
            <span
              className={`shrink-0 rounded-2xl border px-3 py-2 text-right ${activeGoalsHeaderLink.tone}`}
            >
              <span className="block text-[8px] font-black uppercase tracking-[0.1em] opacity-75">
                recorded pts
              </span>
              <span className="block text-sm font-black leading-none [text-shadow:0_1px_12px_rgba(0,0,0,0.34)]">
                {sessionRewardLabel(soundPoints)}
              </span>
            </span>
          </Link>
          {activeGoalsHeaderLink.label !== "Dashboard" ? (
            <Link
              aria-label="Open command dashboard"
              className={`group flex min-h-[58px] w-auto min-w-max shrink-0 items-center gap-2 rounded-[22px] border px-2.5 py-2 text-left shadow-[0_0_20px_rgba(251,191,36,0.08)] transition hover:-translate-y-0.5 ${goalsHeaderCommandLink.tone}`}
              draggable={false}
              href={goalsHeaderCommandLink.href}
              onDragStart={(event) => event.preventDefault()}
            >
              <span
                aria-hidden="true"
                className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl border text-[11px] font-black shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_16px_rgba(251,191,36,0.10)] ${goalsHeaderCommandLink.tone}`}
              >
                <DashboardTabIcon name={goalsHeaderCommandLink.icon} />
              </span>
              <span className="hidden shrink-0 whitespace-nowrap sm:block">
                <span className="block text-[8px] font-black uppercase tracking-[0.14em] opacity-70">
                  {goalsHeaderCommandLink.meta}
                </span>
                <span className="mt-0.5 block text-[10px] font-black uppercase tracking-[0.12em] sm:text-[11px]">
                  {goalsHeaderCommandLink.label}
                </span>
              </span>
            </Link>
          ) : null}
          <button
            aria-label="Next dashboard"
            className="grid h-11 w-9 shrink-0 place-items-center rounded-2xl border border-transparent bg-transparent text-xs font-black text-cyan-100/80 transition hover:translate-x-0.5 hover:border-amber-200/28 hover:bg-amber-300/8 hover:text-amber-100 active:scale-95"
            onClick={() => rotateGoalsHeaderRail("right")}
            type="button"
          >
            &gt;
          </button>
        </div>

        <Link
          aria-label="Open profile hub"
          className="hidden min-h-[58px] shrink-0 items-center gap-3 rounded-[22px] border border-transparent bg-transparent px-2 py-2 text-left text-slate-200 shadow-none transition hover:-translate-y-0.5 hover:bg-white/[0.04] md:flex"
          href={ROUTES.dashboard.profile}
        >
          <Image
            alt={`${firstName} profile`}
            className="h-10 w-10 rounded-full border border-cyan-200/28 bg-slate-950 object-contain p-0.5 shadow-[0_0_18px_rgba(34,211,238,0.14)]"
            height={40}
            src="/sound-fitness-logo.png"
            width={40}
          />
          <span className="hidden min-w-0 leading-none lg:block">
            <span className="block max-w-[110px] truncate text-[10px] font-black uppercase tracking-[0.12em] text-white">
              {firstName}
            </span>
            <span className="mt-1 block text-[8px] font-black uppercase tracking-[0.14em] text-cyan-200/70">
              Profile Hub
            </span>
          </span>
          <span className="flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span className="sr-only">Recorded points</span>
              <svg
                aria-hidden="true"
                className="h-5 w-5 text-amber-200 drop-shadow-[0_0_12px_rgba(250,204,21,0.28)]"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M13.5 2 4.8 13.2h6.1L9.7 22 19.2 9.6h-6.4L13.5 2Z" />
              </svg>
              <span className="text-sm font-black leading-none text-white">
                {sessionRewardLabel(soundPoints)}
              </span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="sr-only">Tokens</span>
              <Image
                alt=""
                aria-hidden="true"
                className="h-5 w-5 rounded-full border border-cyan-200/24 bg-slate-950 object-contain p-0.5 shadow-[0_0_12px_rgba(34,211,238,0.20)]"
                height={20}
                src="/sound-fitness-logo.png"
                width={20}
              />
              <span className="text-sm font-black leading-none text-white">
                {sessionRewardLabel(soundTokens)}
              </span>
            </span>
          </span>
        </Link>
      </div>
    </div>
  );

  const renderGoalsHeroRow = () => (
    <section aria-label="Goals hero row" data-goals-orbiter-row="0" className={styles.hero}>
      <nav className={styles.heroPageNavigation} aria-label="Profile setup pages">
        <Link href={ROUTES.dashboard.profile} className={styles.heroProfileLink}><ChevronLeft aria-hidden="true" /><UserRound aria-hidden="true" /><span>Back to profile</span></Link>
        <Link href={ROUTES.dashboard.trainingPlans} className={styles.heroPlansLink}><span>Training plans</span><ClipboardList aria-hidden="true" /><ChevronRight aria-hidden="true" /></Link>
      </nav>
      <header className={styles.heroIdentityHeader}>
      <Link href={ROUTES.dashboard.profile} className={styles.heroIdentity} aria-label={`Open ${memberName}'s profile`}>
          <span className={styles.heroPhoto}><span aria-hidden="true">{memberName.charAt(0).toUpperCase()}</span>{memberPhoto && <img src={memberPhoto} alt="" onError={event => { event.currentTarget.style.visibility = "hidden"; }} />}</span>
          <span className={styles.heroIdentityText}><span className={styles.heroMemberName}>{memberName}</span>{memberHandle && <span className={styles.heroMemberHandle}>@{memberHandle}</span>}</span>
      </Link>
        <div className={styles.heroPhysicalReadiness}><PhysicalReadinessMeter preferences={memberIdentity.trainingRegressions as TrainingAreaPreferences | undefined} /></div>
      </header>
      <p className={styles.heroMemberBasics} aria-label="Member basics">
        <span><Cake aria-hidden="true" />{memberAge !== null && memberAge >= 0 && memberAge <= 120 ? `${memberAge} yrs` : "Age not set"}</span>
        <span><PersonStanding aria-hidden="true" />{memberGender || "Gender not set"}</span>
        <span><Ruler aria-hidden="true" />{memberHeight || "Height not set"}</span>
        <span><Scale aria-hidden="true" />{getString(memberIdentity, ["currentWeight", "weight"], "") ? `${getString(memberIdentity, ["currentWeight", "weight"], "")} ${metricHeight ? "kg" : "lb"}` : "Weight not set"}</span>
      </p>

      <GoalsHeroInsights goals={goals} onQuestion={index => {setActiveGoalOrbiterIndex(index); setGoalsOrbiterRow(1);}} />
    </section>
  );

  const requireSequentialGoalEditing = false;
  const hasPositiveTarget = (value: unknown) => (goalNumber(value) ?? 0) > 0;
  const questionRequirements = [
    { complete: Boolean(goals.goalTitle?.trim() && validDateOnly(goals.goalDeadline) && goals.goalDeadline >= localDate(today)), prompt: "Name your goal and choose a target date." },
    { complete: selectedDirections.length > 0, prompt: "Select a first choice for your goal direction." },
    { complete: Boolean(goals.goalCheckInFrequency), prompt: "Choose your check-in frequency." },
    { complete: hasPositiveTarget(goals.goalWeight), prompt: "Set your goal weight." },
    { complete: [goals.targetWeeklySessions, goals.sessionMinutes, goals.targetWeeklySets, goals.targetSleep].every(hasPositiveTarget), prompt: "Set weekly sessions, time per session, weekly sets, and target sleep." },
    { complete: [goals.stepsGoal, goals.waterGoal, goals.benchTarget, goals.squatTarget, goals.deadliftTarget, goals.pullupTarget].some(hasPositiveTarget), prompt: "Set at least one daily or strength target." },
    { complete: [goals.targetCalories, goals.targetProtein, goals.targetCarbs, goals.targetFat, goals.targetFiber].some(hasPositiveTarget), prompt: "Set at least one nutrition target." },
  ];

  const renderGoalOrbiterRow = (questions: Record<string, ReactNode>) => {
    const goalDirectionCompletion = calculateCompletion([
      selectedDirections,
      goals.primaryGoal,
      goals.secondaryGoal,
      goals.goalMode,
      goals.goalPriorityRanking,
    ]);
    const goalStageCompletion = calculateCompletion([goals.goalCheckInFrequency]);
    const bodyTargetCompletion = calculateCompletion([goals.currentWeight, goals.goalWeight]);
    const weeklyTargetCompletion = calculateCompletion([
      goals.targetWeeklySessions,
      goals.targetWeeklySets,
      goals.targetProtein,
      goals.targetSleep,
    ]);
    const signalCompletion = calculateCompletion([
      weeklySets,
      favoriteCount,
      goals.benchmarkGoal,
      goals.goalMilestones,
    ]);
    const goalStageStatus = goals.goalCheckInFrequency || "Choose a frequency";
    const goalOrbiterCards: Array<{
      completion: number;
      helper: string;
      icon: GoalOrbiterIconName;
      label: string;
      references: string[];
      stat: string;
      targetId: string;
      tone: string;
      wash: string;
    }> = [
      {
        completion: calculateCompletion([goals.goalTitle, goals.goalDeadline]),
        helper: "Name this goal and choose when you want to review it.", icon: "calendar",
        label: "Your Goal & Timeline", references: [], stat: goals.goalDeadline || "Choose a review date",
        targetId: "goal-preface", tone: "border-amber-200/30 bg-amber-300/10 text-amber-50",
        wash: "from-amber-300/26 via-orange-300/12 to-transparent",
      },
      {
        completion: goalDirectionCompletion,
        helper: "Primary and secondary training priorities that steer programming.",
        icon: "compass",
        label: "Goal Direction",
        references: [
          primaryDirection ? `Primary: ${primaryDirection}` : "Primary direction open",
          secondaryDirection ? `Secondary: ${secondaryDirection}` : "Secondary direction optional",
          `${selectedDirections.length}/2 directions selected`,
        ],
        stat: primaryDirection || "Choose direction",
        targetId: "goal-direction",
        tone: "border-cyan-200/28 bg-cyan-300/10 text-cyan-50",
        wash: "from-cyan-300/26 via-blue-300/12 to-transparent",
      },
      {
        completion: goalStageCompletion,
        helper: "Choose how often to review progress toward this goal.",
        icon: "stage",
        label: "Check-in Frequency",
        references: [
          `Timeline: ${goalDeadlineLabel}`,
          goals.goalCheckInFrequency || "Frequency open",
          goals.goalPriorityRanking || "Priority open",
        ],
        stat: goalStageStatus,
        targetId: "goal-stage",
        tone: "border-amber-200/30 bg-amber-300/10 text-amber-50",
        wash: "from-amber-300/26 via-orange-300/12 to-transparent",
      },
      {
        completion: bodyTargetCompletion,
        helper: "Current weight and goal weight.",
        icon: "scale",
        label: "Body Target",
        references: [
          goals.currentWeight ? `Current ${goals.currentWeight} lb` : "Current weight open",
          goals.goalWeight ? `Goal ${goals.goalWeight} lb` : "Goal weight open",

        ],
        stat: weightDelta ? `${weightDelta > 0 ? "Gain" : "Lose"} ${Math.abs(weightDelta)} lb` : "Target open",
        targetId: "goal-targets",
        tone: "border-emerald-200/28 bg-emerald-300/10 text-emerald-50",
        wash: "from-emerald-300/24 via-teal-300/12 to-transparent",
      },
      {
        completion: weeklyTargetCompletion,
        helper: "Weekly sessions, session length, estimated sets, and sleep.",
        icon: "calendar",
        label: "Training & Recovery",
        references: [
          `${goals.targetWeeklySessions || 0} sessions/week`,
          `${goals.targetWeeklySets || 0} sets/week`,
          `${goals.targetSleep || 0} hours sleep`,
        ],
        stat: `${goals.targetWeeklySessions || 0} sessions/wk`,
        targetId: "weekly-targets",
        tone: "border-sky-200/28 bg-sky-300/10 text-sky-50",
        wash: "from-sky-300/24 via-violet-300/12 to-transparent",
      },
      {
        completion: calculateCompletion([goals.stepsGoal, goals.waterGoal, goals.benchTarget, goals.squatTarget, goals.deadliftTarget, goals.pullupTarget]),
        helper: "Choose daily activity and compound lift targets.",
        icon: "signal", label: "Daily & Strength Targets", references: [],
        stat: "Set daily and lift targets", targetId: "daily-strength-targets",
        tone: "border-amber-200/30 bg-amber-300/10 text-amber-50",
        wash: "from-amber-300/26 via-orange-300/12 to-transparent",
      },
      {
        completion: calculateCompletion([goals.targetProtein, goals.waterGoal, goals.targetCalories, goals.targetCarbs, goals.targetFat, goals.targetFiber]),
        helper: "Set your own daily nutrition targets and review them with your plan.",
        icon: "nutrition", label: "Nutrition Goals", references: [],
        stat: goals.targetProtein ? `${goals.targetProtein} g protein / day` : "Set daily targets",
        targetId: "nutrition-goals", tone: "border-emerald-200/28 bg-emerald-300/10 text-emerald-50",
        wash: "from-emerald-300/24 via-teal-300/12 to-transparent",
      },
      {
        completion: signalCompletion,
        helper: "Weekly volume, saved exercises, benchmarks, and milestones.",
        icon: "signal",
        label: "Goal-to-Plan Summary",
        references: [
          `${weeklySets} weekly sets`,
          `${favoriteCount} saved exercise targets`,
          goals.benchmarkGoal || "Benchmark open",
        ],
        stat: `${completion}% weekly volume`,
        targetId: "goal-signals",
        tone: "border-fuchsia-200/28 bg-fuchsia-300/10 text-fuchsia-50",
        wash: "from-fuchsia-300/24 via-cyan-300/12 to-transparent",
      },
    ];
    const activeIndex =
      ((activeGoalOrbiterIndex % goalOrbiterCards.length) +
        goalOrbiterCards.length) %
      goalOrbiterCards.length;
    const missingQuestion = requireSequentialGoalEditing
      ? questionRequirements.findIndex((requirement, index) => index < activeIndex && !requirement.complete)
      : -1;
    return (
      <section className={styles.goalOrbitSurface}>
        <div className={styles.goalOrbitHeader}>
          <p className={styles.goalRowEyebrow}>Your goals</p>
          <h2 className={styles.goalQuestionTitle}>{goalOrbiterCards[activeIndex].label}</h2>
          <nav className={styles.goalOrbitIndicators} aria-label="Goal category indicators">
            {goalOrbiterCards.map((card, index) => (
              <button
                key={card.label}
                type="button"
                aria-label={`Show ${card.label}`}
                aria-pressed={activeIndex === index}
                onClick={() => setActiveGoalOrbiterIndex(index)}
                title={card.label}
              ><GoalOrbiterIcon name={card.icon} className="h-5 w-5" /></button>
            ))}
          </nav>
          <nav className={styles.goalQuestionArrows} aria-label="Goal question navigation">
            <button type="button" aria-label="Previous goal question" onClick={() => setActiveGoalOrbiterIndex((activeIndex - 1 + goalOrbiterCards.length) % goalOrbiterCards.length)}><ChevronLeft aria-hidden="true" /></button>
            <span>Question {activeIndex + 1} of {goalOrbiterCards.length}</span>
            <button type="button" aria-label="Next goal question" onClick={() => setActiveGoalOrbiterIndex((activeIndex + 1) % goalOrbiterCards.length)}><ChevronRight aria-hidden="true" /></button>
          </nav>
        </div>

        <div className={styles.goalOrbitStage}>
          <article key={activeIndex} className={styles.goalOrbitCard} aria-current="page" aria-label={`Active ${goalOrbiterCards[activeIndex].label}`}>
            <div className={styles.goalQuestionContent} onPointerDown={event => event.stopPropagation()} onPointerUp={event => event.stopPropagation()}>
              {missingQuestion >= 0 && <div className="mx-2 mb-3 rounded-lg border border-amber-200/25 p-3 text-sm text-amber-100">
                <p>Complete question {missingQuestion + 1} to unlock editing. {questionRequirements[missingQuestion].prompt}</p>
                <button type="button" className="mt-2 min-h-8 font-bold underline" onClick={() => setActiveGoalOrbiterIndex(missingQuestion)}>Go to question {missingQuestion + 1}</button>
              </div>}
              <fieldset disabled={missingQuestion >= 0} className="m-0 min-w-0 border-0 p-0 disabled:opacity-55">
                {questions[goalOrbiterCards[activeIndex].targetId]}
              </fieldset>
            </div>
          </article>
        </div>
      </section>
    );
  };

  const updateGoal = <K extends keyof GoalState>(key: K, value: GoalState[K]) => {
    setGoals((current) => {
      if (key === "primaryGoal" || key === "goalMode") {
        const primary = value as GoalId;
        return { ...current, ...normalizeGoals({ ...current, planDirections: [primary, ...current.planDirections.filter(id => id !== primary)].slice(0, 2) }) };
      }
      if (key === "secondaryGoal") return { ...current, ...normalizeGoals({ ...current, planDirections: [current.primaryGoal, ...(value && value !== current.primaryGoal ? [value as GoalId] : [])] }) };
      return { ...current, [key]: value };
    });
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

    const cards = Array.from(slider.children) as HTMLElement[];
    const next = (highlightedDirection + (direction === "left" ? -1 : 1) + cards.length) % cards.length;
    setHighlightedDirection(next);
    const card = cards[next];
    if (card) slider.scrollTo({left: card.offsetLeft - slider.offsetLeft - (slider.clientWidth - card.offsetWidth) / 2, behavior: "smooth"});
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
          ? "Primary guides your plan. Secondary adds a supporting focus."
          : "Choose up to 2 priorities.",
      );
      setSavedMessage("");

      return {
        ...current,
        goalMode: nextDirections[0] || current.goalMode,
        planDirections: nextDirections,
        primaryGoal: nextDirections[0] || current.primaryGoal,
        secondaryGoal: nextDirections[1] || "",
      };
    });
  };

  const swapGoalDirections = () => {
    setGoals(current => {
      const [first, second] = normalizePlanDirections(current.planDirections, current.goalMode);
      if (!first || !second) return current;
      return { ...current, planDirections: [second, first], primaryGoal: second, secondaryGoal: first, goalMode: second };
    });
    setSavedMessage("");
  };

  const saveGoals = useCallback(() => {
    const nextDirections = normalizePlanDirections(goals.planDirections, goals.goalMode);
    const stepsGoal = goals.stepsGoal || goals.targetSteps;
    const nextGoals = {
      ...goals, ...normalizeGoals(goals),
      planDirections: nextDirections,
      targetSteps: stepsGoal,
      stepsGoal,
      updatedAt: new Date().toISOString(),
    };
    const storedProfile = asRecord(readLocal("soundFitnessProfile"));
    const nextProfile = {
      ...storedProfile,
      primaryGoal: nextGoals.primaryGoal,
      secondaryGoal: nextDirections[1] || "",
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

    let savedGoals: GoalState;
    try { savedGoals = saveGoalsRecord(nextGoals, nextProfile, { account: accountRef.current, generation: generationRef.current, version: goalsVersionRef.current, allowDraft: true }); } catch (error) { setSavedMessage(error instanceof Error ? error.message : "Goals could not be saved."); return; }
    goalsVersionRef.current = planningRecordVersion(planningKeys.goals);
      accountRef.current = planningOwner(); generationRef.current = planningAccountGeneration();
    const previousBank = savedSnapshot ? (JSON.parse(savedSnapshot) as GoalState).goalBank || [] : [];
    const newlyCompleted = savedGoals.goalBank?.find(entry => entry.completedAt && !previousBank.some(previous => previous.id === entry.id && previous.completedAt));
    if (newlyCompleted) setGoalCelebration(`${newlyCompleted.title} complete — well done!`);
    setGoals(savedGoals);
    setSavedSnapshot(JSON.stringify(savedGoals));
    setProfile(getProfileSnapshot());
    setSavedMessage("");
    return savedGoals;
  }, [goals, savedSnapshot]);

  useEffect(() => {
    if (savedSnapshot && (JSON.stringify(goals) !== savedSnapshot || (goals.updatedAt && (goals.goalBank === undefined || (goals.planDirections.length > 0 && validGoalBank(goals.goalBank) && goals.goalBank.some(entry => entry.key !== "overall-goal")))))) saveGoals();
  }, [goals, savedSnapshot, saveGoals]);

  const directionMetrics: Partial<Record<GoalId, { key: keyof GoalState; label: string; max: number }>> = {
    "Build Muscle": { key: "muscleGain", label: "Muscle to gain (lb)", max: 500 },
    "Lose Fat": { key: "fatLoss", label: "Fat to lose (lb)", max: 500 },
    Strength: { key: "strengthGain", label: "Strength gain on a key lift (lb)", max: 1500 },
    Mobility: { key: "mobilityGain", label: "Range of motion to gain (°)", max: 180 },
    Conditioning: { key: "conditioningGain", label: "Continuous activity target (min)", max: 1440 },
  };
  const activeDirectionInfo = goalCards.find(goal => goal.id === (hoveredDirectionInfo ?? pinnedDirectionInfo));
  const directionContent=(<section
          id="goal-direction"
          className="scroll-mt-28 overflow-hidden rounded-[30px] border border-white/10 bg-slate-950/58 shadow-[0_24px_80px_rgba(0,0,0,0.38)] backdrop-blur-xl"
        >{(
            <div className="relative border-t border-white/10 p-4" onKeyDown={event => { if (event.key === "Escape") { setHoveredDirectionInfo(null); setPinnedDirectionInfo(null); } }}>
              <div
                ref={planDirectionSliderRef}
                onScroll={markPlanDirectionScrolling}
                style={planDirectionScrollbarStyle}
                className={styles.directionSelectionRail}
              >
                {goalCards
                  .filter((goal) => goal.id !== "Maintain")
                  .map((goal, optionIndex) => {
                    const selectedIndex = selectedDirections.indexOf(goal.id);
                    const isActive = selectedIndex >= 0;
                    const style = planDirectionVisualStyles[goal.id];

                    return (
                      <div key={goal.id} className="relative w-[230px] shrink-0 snap-center sm:w-[248px]">
                      <button
                        type="button"
                        aria-pressed={isActive}
                        onClick={() => { setHighlightedDirection(optionIndex); togglePlanDirection(goal.id); }}
                        data-highlighted={highlightedDirection === optionIndex}
                        className={`group relative flex min-h-[82px] w-full items-center gap-3 pr-12 overflow-hidden rounded-[24px] border p-3.5 text-left transition duration-300 hover:-translate-y-1 active:scale-[0.99] ${
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
                        <span className="text-base font-black leading-tight text-white">{goal.id}</span>
                      </button>
                      <button
                        type="button"
                        aria-label={`About ${goal.id}`}
                        aria-expanded={activeDirectionInfo?.id === goal.id}
                        aria-controls="goal-direction-info"
                        className="absolute right-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full text-amber-200 hover:bg-white/10 focus-visible:outline focus-visible:outline-amber-200"
                        onPointerEnter={event => { if (event.pointerType === "mouse") setHoveredDirectionInfo(goal.id); }}
                        onPointerLeave={() => setHoveredDirectionInfo(null)}
                        onClick={() => {
                          setHoveredDirectionInfo(null);
                          setPinnedDirectionInfo(current => current === goal.id ? null : goal.id);
                        }}
                      >
                        <Info className="size-5" aria-hidden="true" />
                      </button>
                      </div>
                    );
                  })}
              </div>
              <div id="goal-direction-info" hidden={!activeDirectionInfo} className="absolute inset-x-2 top-20 z-30 rounded-xl border border-amber-200/30 bg-slate-950 p-3 text-sm leading-relaxed text-slate-200 shadow-xl">
                {activeDirectionInfo && <><strong className="text-amber-200">{activeDirectionInfo.id}</strong><p>{activeDirectionInfo.purpose} {activeDirectionInfo.planEffect}</p></>}
              </div>
              <nav className={styles.goalQuestionArrows} aria-label="Highlight goal direction options">
                <button type="button" aria-label="Highlight previous goal direction" onClick={() => scrollPlanDirection("left")}><ChevronLeft aria-hidden="true" /></button>
                <button type="button" aria-label="Highlight next goal direction" onClick={() => scrollPlanDirection("right")}><ChevronRight aria-hidden="true" /></button>
              </nav>
              <div className="mt-3" aria-label="Selected goal directions">
                <h3 className="text-xs font-bold text-amber-200">Selected directions</h3>
                <ol className="mt-2 grid grid-cols-2 gap-2">
                    {["First choice", "Second choice"].map((rank, index) => {
                      const direction = selectedDirections[index];
                      const metric = direction ? directionMetrics[direction] : undefined;
                      return <li key={rank} className="min-w-0 rounded-lg border border-white/10 p-2">
                        <span className={styles.directionRank}>{index === 0 ? <Trophy aria-hidden="true" /> : <Medal aria-hidden="true" />}{rank}</span>
                        {direction ? (
                        <button
                          type="button"
                          aria-label={`Remove ${direction}`}
                          className={`flex w-full items-center justify-between gap-1 rounded-lg border px-2 py-3 text-xs font-bold ${planDirectionVisualStyles[direction].accent}`}
                          onClick={() => togglePlanDirection(direction)}
                        >
                          <span aria-hidden="true">{planDirectionVisualStyles[direction].icon}</span> {direction} <span aria-hidden="true">×</span>
                        </button>
                        ) : <span className="text-xs text-slate-400">{index === 0 ? "Choose a direction" : "Optional"}</span>}
                        {metric && <label className="mt-2 block text-xs text-amber-100">
                          {metric.label}
                          <input className="mt-1 block w-full rounded border border-white/15 bg-slate-950 p-2" type="number" min={0} max={metric.max} step="any" value={String(goals[metric.key] ?? "")} onChange={event => updateGoal(metric.key, event.target.value)} />
                        </label>}
                      </li>;
                    })}
                </ol>
                {selectedDirections.length === 2 && <button type="button" className="mt-2 min-h-8 text-xs font-bold text-amber-200 underline underline-offset-4" onClick={swapGoalDirections}>Swap first and second choice</button>}
              </div>
            </div>
          )}</section>);
const profileWeight = goalNumber(getString(memberIdentity, ["currentWeight", "weight"], "")) ?? goalNumber(goals.currentWeight);
const currentWeightLb = profileWeight === null ? null : profileWeight * (metricHeight ? 2.2046226218 : 1);
const displayedGoalWeight = goalNumber(goals.goalWeight) ?? currentWeightLb;
const displayUnit = metricHeight ? "kg" : "lb";
const toDisplayWeight = (pounds: number) => Number((pounds / (metricHeight ? 2.2046226218 : 1)).toFixed(1));
const targetDays = validDateOnly(goals.goalDeadline) ? Math.round((Date.parse(goals.goalDeadline) - Date.parse(localDate(today))) / 86400000) : 0;
const muscleTarget = selectedDirections.includes("Build Muscle") ? goalNumber(goals.muscleGain) ?? 0 : 0;
const fatTarget = selectedDirections.includes("Lose Fat") ? goalNumber(goals.fatLoss) ?? 0 : 0;
const hasCompositionTargets = muscleTarget > 0 || fatTarget > 0;
const starterChange = targetDays >= 14 ? (selectedDirections.includes("Lose Fat") ? -1 : selectedDirections.includes("Build Muscle") ? 1 : 0) : 0;
const suggestedWeight = currentWeightLb === null ? null : Math.max(1, currentWeightLb + (hasCompositionTargets ? muscleTarget - fatTarget : starterChange));
const setWeightTarget = (pounds: number) => {
  setGoals(current => ({...current, currentWeight: currentWeightLb === null ? current.currentWeight : String(Number(currentWeightLb.toFixed(2))), goalWeight: String(Number(Math.max(1, Math.min(1500, pounds)).toFixed(2)))}));
  setSavedMessage("");
};
const targetContent = <section className="grid gap-4" aria-label="Body weight target">
  <p className="text-center text-sm text-slate-300">Current weight <strong className="text-white">{currentWeightLb === null ? "Not recorded" : `${toDisplayWeight(currentWeightLb)} ${displayUnit}`}</strong></p>
  {displayedGoalWeight === null ? <Link href={ROUTES.dashboard.profile} className="text-center text-amber-200 underline">Add your current weight in Profile</Link> : <>
    <label className="text-center text-sm font-bold text-amber-100" htmlFor="goal-weight-slider">Goal weight <strong className="block text-3xl">{toDisplayWeight(displayedGoalWeight)} {displayUnit}</strong></label>
    <div className="flex items-center gap-3">
      <button type="button" aria-label="Decrease goal weight" className={styles.weightTargetAdjust} onClick={() => setWeightTarget(displayedGoalWeight - (metricHeight ? 1.1023113109 : .5))}>−</button>
      <input id="goal-weight-slider" type="range" className="min-w-0 flex-1 accent-amber-300" min={Math.max(1, Math.min(displayedGoalWeight, (currentWeightLb ?? displayedGoalWeight) - 15))} max={Math.min(1500, Math.max(displayedGoalWeight, (currentWeightLb ?? displayedGoalWeight) + 15))} step={metricHeight ? 1.1023113109 : .5} value={displayedGoalWeight} onChange={event => setWeightTarget(Number(event.target.value))} />
      <button type="button" aria-label="Increase goal weight" className={styles.weightTargetAdjust} onClick={() => setWeightTarget(displayedGoalWeight + (metricHeight ? 1.1023113109 : .5))}>+</button>
    </div>
    {!goals.goalWeight && <button type="button" className="text-sm font-bold text-amber-200 underline" onClick={() => setWeightTarget(displayedGoalWeight)}>Use current weight as target</button>}
    {suggestedWeight !== null && <div className="text-center text-xs text-slate-300">
      <p>{hasCompositionTargets ? "Your muscle-gain and fat-loss amounts give this net weight target." : selectedDirections.includes("Build Muscle") && selectedDirections.includes("Lose Fat") ? "Use a small scale change while tracking muscle and fat separately." : selectedDirections.includes("Build Muscle") ? "Start with a small weight increase and review your progress at check-ins." : selectedDirections.includes("Lose Fat") ? "Start with a small weight decrease and review your progress at check-ins." : "Keep a stable target or adjust it to suit your goal."}</p>
      {targetDays > 0 && <p className="mt-1">{targetDays} days to your target date.</p>}
      <button type="button" className="mt-2 min-h-9 font-bold text-amber-200 underline" onClick={() => setWeightTarget(suggestedWeight)}>Use {toDisplayWeight(suggestedWeight)} {displayUnit} {hasCompositionTargets ? "target" : "starting target"}</button>
    </div>}
  </>}
</section>;
const selector = (key: keyof GoalState, label: string, suffix: string, min: number, max: number, step: number, initial: number) =>
  <MetricSliderField key={key} label={label} suffix={suffix} min={min} max={max} step={step} defaultValue={initial} value={String(goals[key] ?? "")} helper="" onChange={value => updateGoal(key, value)} />;
const estimatedSets = Math.max(1, Math.min(500, Math.floor(Number(goals.targetWeeklySessions) * Number(goals.sessionMinutes || 45) / 4) || 1));
const weeklyContent = <div className="grid gap-3 sm:grid-cols-2">
  {selector("targetWeeklySessions", "Weekly sessions", "/ week", 1, 7, 1, 3)}
  {selector("sessionMinutes", "Time per session", "min", 5, 240, 5, 45)}
  <div className="p-2 text-sm text-amber-100">
    <p>About {estimatedSets} sets per week</p>
    <small>Estimate based on four minutes per set, including rest.</small>
    <button type="button" className="block min-h-9 underline" onClick={() => updateGoal("targetWeeklySets", String(estimatedSets))}>Use this sets target</button>
  </div>
  {selector("targetSleep", "Target sleep", "hrs", 1, 24, .5, 8)}
</div>;
const dailyStrengthContent = <div className="grid gap-3 sm:grid-cols-2">
  {selector("stepsGoal", "Daily steps", "steps", 1, 100000, 1, 8000)}
  {selector("waterGoal", "Daily water", "oz", 1, 500, 1, 64)}
  {([
    ["benchTarget", "Bench press", "lb"],
    ["squatTarget", "Squat", "lb"],
    ["deadliftTarget", "Deadlift", "lb"],
    ["pullupTarget", "Pull-ups", "reps"],
  ] as const).map(([key, label, suffix]) => <Field key={key} label={label} suffix={suffix} value={goals[key] || ""} onChange={value => updateGoal(key, value)} />)}
</div>;
const goalDurationDays = validDateOnly(goals.goalDeadline)
  ? Math.round((Date.parse(goals.goalDeadline) - Date.parse(localDate(today))) / 86400000)
  : 0;
const monthlyCheckInDate = goalDateMilestones(today, 1)[1].date;
const monthlyCheckInDays = Math.round((Date.parse(monthlyCheckInDate) - Date.parse(localDate(today))) / 86400000);
const checkInChoices = [
  { value: "weekly", label: "Every week", days: 7, Icon: CalendarCheck, CalendarDays, CalendarRange },
  { value: "fortnightly", label: "Every two weeks", days: 14, Icon: CalendarDays },
  { value: "monthly", label: "Every month", days: monthlyCheckInDays, Icon: CalendarRange },
];
const recommendedCheckIn = [...checkInChoices].reverse().find(choice => choice.days < goalDurationDays);
const milestoneContent = <section id="goal-stage" aria-label="Goal check-ins">
  <h3 className="text-center text-xl font-black text-amber-100">How often would you like to check in?</h3>
  <div className={styles.checkInChoices}>
    {checkInChoices.map(({value, label, days, Icon}) => <button
      key={value}
      type="button"
      aria-pressed={goals.goalCheckInFrequency === value}
      className={styles.checkInChoice}
      onClick={() => updateGoal("goalCheckInFrequency", value)}
    >
      <Icon aria-hidden="true" />
      <strong>{label}</strong>
      <span>{recommendedCheckIn?.value === value ? "Recommended" : days >= goalDurationDays && goalDurationDays > 0 ? "On or after your target date" : "Review your progress"}</span>
    </button>)}
  </div>
  <p className="mt-3 text-center text-xs text-slate-300">
    {goalDurationDays > 7
      ? `${goalDurationDays} days until your target. ${recommendedCheckIn?.label || "Choose a frequency"} gives you time to adjust before then.`
      : goalDurationDays > 0 ? "Your target is less than a week away. Review your progress on your target date."
        : "Choose a target date to see a recommended frequency."}
  </p>
</section>;
const savePlanDraft = () => {
  if (!savedSnapshot || accountRef.current !== planningOwner() || generationRef.current !== planningAccountGeneration()) { setPlanNotice("Reload Goals for your current account before saving a plan."); return; }
  if (JSON.stringify(goals) !== savedSnapshot && !saveGoals()) return;
  try {
    createWorkoutPlan({title: goals.goalTitle?.trim() || "Goal-based training plan"});
    setPlanNotice("Draft saved to Plan Bank.");
  } catch (error) {
    setPlanNotice(error instanceof Error ? error.message : "Could not save the draft plan.");
  }
};
const guidanceContent=(<section
          id="goal-signals"
          className="scroll-mt-28 rounded-[30px] border border-white/10 bg-slate-950/58 p-5 shadow-2xl"
        >
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-200">
            Plan settings
          </p>
          <div className={styles.planSummaryRail}>
            <TranslationCard label="Exercise Library Filters" value={`${selectedGoalCard.libraryFocus} · prioritize ${activeDirection.toLowerCase()} matches`} />
            <TranslationCard label="Builder Defaults" value={`${selectedGoalCard.intensity} intensity with ${selectedGoalCard.volume.toLowerCase()} volume`} />
            <TranslationCard label="My Plan Split" value={`${goals.targetWeeklySessions || "—"} sessions weekly · ${goals.sessionMinutes || "—"} min per session · ${goals.targetWeeklySets || "—"} sets weekly`} />
            <TranslationCard label="Phases" value={selectedGoalCard.phaseType} />
            <TranslationCard label="Recovery Warnings" value={activeDirection === "Recovery" ? "Lower heat threshold and mobility-first substitutions." : "Warn when volume exceeds the weekly target."} />
            <TranslationCard label="Nutrition Direction" value={goals.goalMode === "Cut" || activeDirection === "Lose Fat" ? "Protein consistency, steps, and moderate deficit support." : "Fuel performance and recovery around training."} />
          </div>
        </section>);

const nutritionContent = <section aria-label="Daily nutrition targets">
  <p className="mb-3 text-sm text-slate-300">
    {goals.currentWeight ? `Current weight ${goals.currentWeight} lb` : "Add current weight in Profile"}
    {goals.goalWeight && ` · Goal weight ${goals.goalWeight} lb`}
    {primaryDirection && ` · ${primaryDirection}`}.
    {primaryDirection === "Build Muscle" || primaryDirection === "Strength"
      ? " Start with a protein target you can consistently meet."
      : primaryDirection === "Conditioning" || primaryDirection === "Performance"
        ? " Set a carb target that fits your training sessions."
        : " Set targets you can follow and review alongside your weight trend."}
  </p>
  <div className="grid gap-3 sm:grid-cols-2">
    {selector("targetCalories", "Calories / day", "cal", 1, 20000, 1, 2000)}
    {selector("targetProtein", "Protein / day", "g", 1, 500, 1, 100)}
    {selector("targetCarbs", "Carbs / day", "g", 0, 2000, 1, 200)}
    {selector("targetFat", "Fat / day", "g", 0, 1000, 1, 60)}
    {selector("targetFiber", "Fiber / day", "g", 0, 200, 1, 25)}
  </div>
</section>;
const prefaceContent = <section className={styles.goalPreface} aria-label="Goal name and timeline">
  <h3 className={styles.createGoalHeading}>Create a goal</h3>
  <label><span className={styles.goalNameHeading}><Flag aria-hidden="true" />Give your goal a name</span><input value={goals.goalTitle || ""} placeholder="e.g. My next strength milestone" maxLength={160} onChange={event => updateGoal("goalTitle", event.target.value)} /></label>
  <GoalDateDots value={goals.goalDeadline} onChange={value => updateGoal("goalDeadline", value)} today={today} />
</section>;
const bankEntries = validGoalBank(goals.goalBank) ? goals.goalBank : [];
const goalBankContent = <section className={styles.goalBank} aria-label="Goal Bank">
  <header className={styles.goalBankHeader}><p className={styles.goalRowEyebrow}>Your progress log</p><h2 className={styles.goalQuestionTitle}>Goal Bank</h2></header>
  {goalCelebration && <p key={goalCelebration} className={styles.goalCelebration} role="status">✦ {goalCelebration} ✦</p>}
  {!bankEntries.length ? <div className={styles.emptyGoalBank}><Trophy aria-hidden="true" /><p>Add a goal to start tracking your progress.</p><button type="button" onClick={() => {setActiveGoalOrbiterIndex(0); setGoalsOrbiterRow(1);}}>Add a goal</button></div> : <div className={styles.goalBankList}>
    {([false, true] as const).map(completed => <section key={String(completed)} aria-label={completed ? "Completed goals" : "Active goals"}>
      <h3>{completed ? "Completed" : "Working toward"}</h3>
      {bankEntries.filter(entry => Boolean(entry.completedAt) === completed).map(entry => <article key={entry.id} className={styles.goalBankItem}>
        <div><h4>{entry.title}</h4><p>{entry.target} {entry.unit}</p><small>{entry.completedAt ? `Completed ${new Date(entry.completedAt).toLocaleDateString(undefined, {month: "short", day: "numeric", year: "numeric"})}` : entry.reviewDate ? `Review ${entry.reviewDate}` : `Started ${new Date(entry.createdAt).toLocaleDateString(undefined, {month: "short", day: "numeric", year: "numeric"})}`}</small></div>
        {completed ? <span className={styles.goalCompletedMark} aria-label="Completed">✓</span> : <div className={styles.goalBankActions}>
          <button type="button" aria-label={`Review ${entry.title} goal`} onClick={() => {
            const question = entry.key === "direction" ? 0 : entry.key === "goalMilestones" ? 1 : ["goalWeight", "stepsGoal"].includes(entry.key) ? 2 : ["targetWeeklySessions", "targetWeeklySets", "targetSleep", "benchmarkGoal"].includes(entry.key) ? 3 : 4;
            setActiveGoalOrbiterIndex(entry.key === "overall-goal" ? 0 : question + 1); setGoalsOrbiterRow(1);
          }}>Review</button>
          <button type="button" aria-label={`Mark ${entry.title} goal complete`} onClick={() => setGoals(current => ({...current, goalBank: completeBankGoal(current.goalBank || [], entry.id, new Date().toISOString())}))}>Mark complete</button>
        </div>}
      </article>)}
    </section>)}
  </div>}
</section>;
const planBank = inspectWorkoutPlans();
const shellContent=[renderGoalsHeroRow(),renderGoalOrbiterRow({
  "goal-preface": prefaceContent,
  "goal-direction": directionContent,
  "goal-stage": milestoneContent,
  "goal-targets": targetContent,
  "weekly-targets": weeklyContent,
  "daily-strength-targets": dailyStrengthContent,
  "nutrition-goals": nutritionContent,
  "goal-signals": <div>{guidanceContent}<button type="button" className={styles.goalQuestionSave} onClick={savePlanDraft}>Save draft plan</button><p role="status" className="mt-2 text-sm text-amber-100">{planNotice}</p></div>,
}),goalBankContent,
  <section className={styles.goalBank} aria-label="Plan Bank">
    <h2 className={styles.goalQuestionTitle}>Plan Bank</h2>
    {planBank.issue ? <p role="status">{planBank.issue}</p> : planBank.plans.length ? <div className={styles.goalBankList}>{planBank.plans.map(plan =>
      <article key={plan.id} className={styles.goalBankItem}><div><h4>{plan.title}</h4><p>{plan.weekStartDate} · {plan.status}</p></div><Link href={ROUTES.dashboard.myPlan}>Open plans</Link></article>
    )}</div> : <div className={styles.emptyGoalBank}><ClipboardList aria-hidden="true" /><p>Save a draft from Goal-to-Plan Summary to add it here.</p></div>}
  </section>,
  <div key="proceed-to-plans" className={`${profileStyles.goalsProceedContent} ${styles.plansProceed}`}>
    <ClipboardList aria-hidden="true" className={profileStyles.goalsProceedIcon} />
    <h2>Your next step: training plans</h2>
    <p>Review your plans and choose how to put your goals into action. You can return to update your goals anytime.</p>
    <Link href={ROUTES.dashboard.trainingPlans} className={profileStyles.goalsProceedAction}>Proceed to training plans <span aria-hidden="true">›</span></Link>
  </div>
];
return <DashboardExperience headerOnly headerOnlyViewport><section className={styles.shell} data-save-message={savedMessage ? "true" : undefined} aria-label="Goals orbital command center">
<SessionsCardNavigation accentColor="#fbbf24" labelPrefix="goals" showTitle={false} showHorizontalIndicators={false} rows={goalsOrbiterRows.map((row,index)=>({title:row.label,cards:index===1?["Your Goal & Timeline","Goal Direction","Check-in Frequency","Body Target","Training & Recovery","Daily & Strength Targets","Nutrition Goals","Goal-to-Plan Summary"].map(title=>({title,icon:"goals"})):[{title:row.label,icon:"goals"}]}))} row={activeGoalsOrbiterRowIndex} card={activeGoalsOrbiterRowIndex===1?activeGoalOrbiterIndex:0} onRow={setGoalsOrbiterRow} onCard={setActiveGoalOrbiterIndex} onNavigate={direction=>{if(direction==="up"||direction==="down")moveGoalsOrbiterRow(direction==="up"?-1:1);else if(activeGoalsOrbiterRowIndex===1)setActiveGoalOrbiterIndex(current=>(current+(direction==="left"?-1:1)+8)%8);}} />
<div ref={goalsViewportRef} className={styles.viewport} aria-label="Goals rows" tabIndex={0} onKeyDown={handleGoalsOrbiterKeyDown} onScroll={event=>{const el=event.currentTarget;setActiveGoalsOrbiterRow(Math.max(0,Math.min(goalsOrbiterRows.length-1,Math.round(el.scrollTop/el.clientHeight))));}}>
{shellContent.map((content,index)=><section key={goalsOrbiterRows[index].label} data-goals-shell-row={index} aria-label={goalsOrbiterRows[index].label} className={styles.row}><div className={index===0?styles.heroFrame:styles.rowFrame}><div className={styles.content} data-goals-row-scroll="true"><div className={styles.contentInner}>{content}</div></div></div></section>)}
</div><div className={styles.status} aria-live="polite">
{savedMessage ? (
          <p className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-4 py-3 text-sm font-bold text-emerald-100">
            {savedMessage}
          </p>
        ) : null}
{(savedMessage.includes("Goals changed") || savedMessage.includes("account changed")) && <button type="button" className="rounded-xl border border-white/20 px-4 py-2 text-sm" onClick={() => {
          const record = { ...buildGoalsFromProfile(getProfileSnapshot()), ...normalizeGoals(readPlanning(planningKeys.goals, {})) } as GoalState;
          goalsVersionRef.current = planningRecordVersion(planningKeys.goals);
      accountRef.current = planningOwner(); generationRef.current = planningAccountGeneration();
          goalsRef.current = record; savedRef.current = JSON.stringify(record);
          setGoals(record); setSavedSnapshot(JSON.stringify(record)); setProfile(getProfileSnapshot()); setSavedMessage("Saved goals reloaded.");
        }}>Reload saved goals and discard these edits</button>}</div></section></DashboardExperience>;
}
