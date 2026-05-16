"use client";

import Link from "next/link";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import MasterTrainingJourney from "@/components/dashboard/MasterTrainingJourney";
import { ROUTES } from "@/lib/routes";

type StatsTabId =
  | "overview"
  | "volume"
  | "strength"
  | "body-map"
  | "prs"
  | "recovery"
  | "trends"
  | "history";

type HistoryFilter = "This week" | "Last 30 days" | "Lifetime";

type MomentumZone =
  | "Ice Cold"
  | "Building"
  | "Productive Heat"
  | "Hot"
  | "Too Hot";

type Accent = "cyan" | "amber" | "emerald" | "rose" | "violet" | "blue";

type ProfileSnapshot = {
  anatomyBackground: string;
  currentPhase: string;
  currentPlan: string;
  currentWeight: number;
  displayName: string;
  equipment: string[];
  primaryGoal: string;
  goalMode: string;
  limitationCount: number;
  memberType: string;
  planDirection: string;
  profileImage: string;
  trainingAge: string;
  weeklySetGoal: number;
  sessionsPerWeek: number;
  goalWeight: number;
  preferredUnit: "lb" | "kg";
};

type NormalizedExerciseStat = {
  id: string;
  exerciseId: string;
  exerciseName: string;
  bodyPart: string;
  pattern: string;
  equipment: string;
  date: string;
  timestamp: number;
  sets: number;
  reps: number;
  weight: number;
  volume: number;
  source: string;
  notes: string;
};

type NormalizedWorkoutLog = {
  id: string;
  name: string;
  date: string;
  timestamp: number;
  exercises: string[];
  totalSets: number;
  totalReps: number;
  totalVolume: number;
  bodyParts: string[];
  patterns: string[];
  notes: string;
};

type WeeklyStats = {
  entries: NormalizedExerciseStat[];
  weekStart: Date;
  weekEnd: Date;
  dateRangeLabel: string;
  sets: number;
  reps: number;
  volume: number;
  exercisesTrained: number;
  sessionsCompleted: number;
  weeklyGoal: number;
  completionPercent: number;
  currentStreak: number;
};

type LifetimeStats = {
  sets: number;
  reps: number;
  volume: number;
  sessionsCompleted: number;
  exercisesTracked: number;
  mostTrainedExercise: string;
  mostImprovedExercise: string;
};

type BodyPartStat = {
  label: string;
  weeklySets: number;
  weeklyGoal: number;
  weeklyReps: number;
  weeklyVolume: number;
  lifetimeSets: number;
  lifetimeVolume: number;
  percent: number;
  zone: MomentumZone;
  lastTrained: string;
  lastTimestamp: number | null;
  cooldownHours: number;
  status: string;
};

type PatternStat = {
  label: string;
  weeklySets: number;
  weeklyGoal: number;
  lifetimeSets: number;
  volume: number;
  percent: number;
};

type PRCard = {
  label: string;
  exercise: string;
  value: string;
  date: string;
  pattern: string;
  suggestion: string;
};

type StrengthCard = {
  label: string;
  currentBest: string;
  goal: string;
  progressPercent: number;
  lastLogged: string;
  recommendedFocus: string;
};

type RecoveryStats = {
  runningHot: BodyPartStat[];
  readyToTrain: BodyPartStat[];
  cooldowns: BodyPartStat[];
  recommendations: string[];
};

type TrendWeek = {
  label: string;
  sets: number;
  volume: number;
  sessions: number;
  bestE1rm: number;
};

type TrendStats = {
  weeklyVolumeTrend: TrendWeek[];
  strengthTrend: TrendWeek[];
  consistencyTrend: TrendWeek[];
  bodyWeightTrend: { label: string; value: number }[];
};

type AppStatsSnapshot = {
  profile: ProfileSnapshot;
  favorites: string[];
  exerciseStats: NormalizedExerciseStat[];
  workoutLogs: NormalizedWorkoutLog[];
  loadedAtLabel: string;
};

const STATS_TABS: { id: StatsTabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "volume", label: "Volume" },
  { id: "strength", label: "Strength" },
  { id: "body-map", label: "Body Map" },
  { id: "prs", label: "PRs" },
  { id: "recovery", label: "Recovery" },
  { id: "trends", label: "Trends" },
  { id: "history", label: "History" },
];

const HISTORY_FILTERS: HistoryFilter[] = [
  "This week",
  "Last 30 days",
  "Lifetime",
];

const TRAILING_DAYS = 7;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DEFAULT_WEEKLY_SET_GOAL = 48;
const DEFAULT_PATTERN_GOAL = 12;

const EXERCISE_STAT_KEYS = [
  "soundFitnessExerciseStats",
  "soundFitnessExerciseLibraryStats",
  "soundFitness.exerciseLibrary.stats",
];

const WORKOUT_LOG_KEYS = [
  "soundFitnessWorkoutLogs",
  "soundFitnessWorkoutSessionLogs",
  "soundFitness.workoutLogs",
];

const FAVORITE_KEYS = [
  "soundFitnessFavorites",
  "soundFitnessExerciseFavorites",
  "soundFitness.exerciseLibrary.favorites",
];

const PHASE_KEYS = ["soundFitnessPhases", "soundFitnessTrainingPhases"];

const PLAN_KEYS = ["soundFitnessPlan", "soundFitnessTrainingPlan", "soundFitnessMyPlan"];

const BODY_REGION_GOALS: Record<string, number> = {
  Chest: 16,
  Back: 18,
  Shoulders: 14,
  Arms: 14,
  Core: 12,
  Glutes: 16,
  Quads: 16,
  Hamstrings: 14,
  Calves: 12,
  "Neck / Traps": 10,
};

const BODY_REGION_ORDER = Object.keys(BODY_REGION_GOALS);

const STRENGTH_TARGETS = [
  {
    label: "Bench Press",
    names: ["bench press", "chest press", "push-up", "push up"],
    pattern: "Chest Press",
    goal: 225,
    focus: "Pressing strength with rows and triceps support.",
  },
  {
    label: "Squat",
    names: ["squat", "goblet squat", "front squat", "back squat"],
    pattern: "Squat",
    goal: 315,
    focus: "Squat pattern, quad volume, bracing, and depth.",
  },
  {
    label: "Deadlift",
    names: ["deadlift", "romanian deadlift", "rdl", "hinge"],
    pattern: "Hinge",
    goal: 405,
    focus: "Hinge strength, posterior chain, and lat tension.",
  },
  {
    label: "Overhead Press",
    names: ["overhead press", "shoulder press", "military press"],
    pattern: "Shoulder Press",
    goal: 135,
    focus: "Shoulder strength with upper-back stability.",
  },
  {
    label: "Pull-Up",
    names: ["pull-up", "pull up", "chin-up", "chin up", "pulldown"],
    pattern: "Vertical Pull",
    goal: 10,
    focus: "Vertical pulling, lats, biceps, and scapular control.",
  },
  {
    label: "Row",
    names: ["row", "seal row", "chest supported row"],
    pattern: "Row",
    goal: 185,
    focus: "Horizontal pulling volume and upper-back density.",
  },
  {
    label: "Hip Thrust",
    names: ["hip thrust", "glute bridge", "bridge"],
    pattern: "Hip Thrust / Bridge",
    goal: 275,
    focus: "Glute strength and hip-extension capacity.",
  },
  {
    label: "Sissy Squat Depth",
    names: ["sissy squat", "knee extension"],
    pattern: "Knee Extension",
    goal: 10,
    focus: "Controlled knee extension, quad tolerance, and depth.",
  },
];

const ZONE_STYLES: Record<
  MomentumZone,
  { hex: string; text: string; border: string; bg: string; helper: string }
> = {
  "Ice Cold": {
    hex: "#38bdf8",
    text: "text-sky-200",
    border: "border-sky-300/25",
    bg: "bg-sky-400/10",
    helper: "Needs stimulus",
  },
  Building: {
    hex: "#2dd4bf",
    text: "text-teal-200",
    border: "border-teal-300/25",
    bg: "bg-teal-400/10",
    helper: "Building momentum",
  },
  "Productive Heat": {
    hex: "#fbbf24",
    text: "text-amber-200",
    border: "border-amber-300/25",
    bg: "bg-amber-400/10",
    helper: "Productive heat",
  },
  Hot: {
    hex: "#fb923c",
    text: "text-orange-200",
    border: "border-orange-300/25",
    bg: "bg-orange-400/10",
    helper: "Watch fatigue",
  },
  "Too Hot": {
    hex: "#f43f5e",
    text: "text-rose-200",
    border: "border-rose-300/25",
    bg: "bg-rose-400/10",
    helper: "Recovery signal",
  },
};

const ACCENT_CLASSES: Record<
  Accent,
  { border: string; bg: string; text: string; glow: string; bar: string }
> = {
  cyan: {
    border: "border-cyan-300/20",
    bg: "bg-cyan-400/10",
    text: "text-cyan-200",
    glow: "shadow-[0_0_34px_rgba(34,211,238,0.14)]",
    bar: "from-cyan-300 to-blue-400",
  },
  amber: {
    border: "border-amber-300/20",
    bg: "bg-amber-400/10",
    text: "text-amber-200",
    glow: "shadow-[0_0_34px_rgba(251,191,36,0.14)]",
    bar: "from-amber-300 to-orange-400",
  },
  emerald: {
    border: "border-emerald-300/20",
    bg: "bg-emerald-400/10",
    text: "text-emerald-200",
    glow: "shadow-[0_0_34px_rgba(52,211,153,0.14)]",
    bar: "from-emerald-300 to-teal-400",
  },
  rose: {
    border: "border-rose-300/20",
    bg: "bg-rose-400/10",
    text: "text-rose-200",
    glow: "shadow-[0_0_34px_rgba(251,113,133,0.14)]",
    bar: "from-rose-300 to-orange-400",
  },
  violet: {
    border: "border-violet-300/20",
    bg: "bg-violet-400/10",
    text: "text-violet-200",
    glow: "shadow-[0_0_34px_rgba(167,139,250,0.14)]",
    bar: "from-violet-300 to-fuchsia-400",
  },
  blue: {
    border: "border-blue-300/20",
    bg: "bg-blue-400/10",
    text: "text-blue-200",
    glow: "shadow-[0_0_34px_rgba(96,165,250,0.14)]",
    bar: "from-blue-300 to-cyan-400",
  },
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const safeParseJson = (value: string | null) => {
  if (!value) return null;

  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
};

const canUseLocalStorage = () =>
  typeof window !== "undefined" && Boolean(window.localStorage);

const readLocalValue = (key: string) => {
  if (!canUseLocalStorage()) return null;
  return safeParseJson(window.localStorage.getItem(key));
};

const coerceArray = (value: unknown): unknown[] => {
  if (Array.isArray(value)) return value;

  const record = asRecord(value);
  if (!record) return [];

  for (const key of ["entries", "stats", "items", "logs", "workouts", "data"]) {
    const candidate = record[key];
    if (Array.isArray(candidate)) return candidate;
  }

  return Object.values(record).filter((item) => Boolean(asRecord(item)));
};

const readFirstArray = (keys: string[]) => {
  for (const key of keys) {
    const value = readLocalValue(key);
    const items = coerceArray(value);
    if (items.length > 0) return items;
  }

  return [];
};

const readFirstValue = (keys: string[]) => {
  for (const key of keys) {
    const value = readLocalValue(key);
    if (value) return value;
  }

  return null;
};

const getString = (
  record: Record<string, unknown> | null,
  keys: string[],
  fallback = "",
) => {
  if (!record) return fallback;

  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return `${value}`;
  }

  return fallback;
};

const getNumber = (
  record: Record<string, unknown> | null,
  keys: string[],
  fallback = 0,
) => {
  if (!record) return fallback;

  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
      const parsed = Number.parseFloat(value.replace(/,/g, ""));
      if (Number.isFinite(parsed)) return parsed;
    }
  }

  return fallback;
};

const getStringArray = (record: Record<string, unknown> | null, keys: string[]) => {
  if (!record) return [];

  for (const key of keys) {
    const value = record[key];
    if (Array.isArray(value)) {
      return value
        .map((item) => (typeof item === "string" ? item : getString(asRecord(item), ["label", "name", "region"])))
        .filter(Boolean);
    }
    if (typeof value === "string" && value.trim()) {
      return value
        .split(/[,|]/)
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }

  return [];
};

const cleanNumber = (value: number) =>
  Number.isFinite(value) ? Math.max(0, value) : 0;

const startOfLocalDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

const getTrailingWeekBounds = () => {
  const end = new Date();
  const start = new Date(end);
  start.setDate(end.getDate() - (TRAILING_DAYS - 1));
  start.setHours(0, 0, 0, 0);

  return { start, end };
};

const getTimestamp = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = new Date(value).getTime();
    if (Number.isFinite(parsed)) return parsed;
  }

  return Date.now();
};

const formatShortDate = (timestamp: number | null) => {
  if (!timestamp) return "Not logged yet";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(timestamp));
};

const formatFullDate = (timestamp: number | null) => {
  if (!timestamp) return "Not logged yet";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(timestamp));
};

const formatDateRange = (start: Date, end: Date) => {
  const formatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  });

  return `Trailing 7 days: ${formatter.format(start)}-${formatter.format(end)}`;
};

const formatCompactNumber = (value: number) => {
  const safeValue = cleanNumber(value);
  if (safeValue >= 1_000_000) return `${(safeValue / 1_000_000).toFixed(1)}m`;
  if (safeValue >= 1000) return `${(safeValue / 1000).toFixed(1)}k`;
  return Math.round(safeValue).toLocaleString();
};

const getDisplayWeight = (value: number, unit: "lb" | "kg") =>
  unit === "kg" ? value * 0.453592 : value;

const formatLoad = (value: number, unit: "lb" | "kg") => {
  const display = getDisplayWeight(value, unit);
  if (!display) return "Not logged yet";
  return `${unit === "kg" ? display.toFixed(1) : Math.round(display).toLocaleString()} ${unit}`;
};

const formatWeightVolume = (value: number, unit: "lb" | "kg") => {
  const display = getDisplayWeight(value, unit);
  if (!display) return `0 ${unit}`;
  return `${formatCompactNumber(display)} ${unit}`;
};

const toTitleCase = (value: string) =>
  value
    .split(/[\s-_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");

const includesAny = (source: string, needles: string[]) =>
  needles.some((needle) => source.includes(needle));

const inferBodyPart = (record: Record<string, unknown>, name: string) => {
  const raw = [
    getString(record, ["bodyPart", "body", "bodyRegion", "muscle", "muscles"]),
    getString(record, ["category", "section", "primaryMuscle"]),
    name,
    getString(record, ["pattern", "movementPattern", "coreMovementPattern"]),
  ]
    .join(" ")
    .toLowerCase();

  if (includesAny(raw, ["chest", "bench", "push-up", "push up"])) return "Chest";
  if (includesAny(raw, ["lat", "back", "row", "pull-up", "pull up", "pulldown", "pullover"])) return "Back";
  if (includesAny(raw, ["shoulder", "delt", "lateral raise", "overhead press"])) return "Shoulders";
  if (includesAny(raw, ["bicep", "tricep", "arm", "curl", "forearm", "wrist"])) return "Arms";
  if (includesAny(raw, ["core", "abs", "oblique", "plank", "pallof", "rotation", "anti-extension"])) return "Core";
  if (includesAny(raw, ["glute", "hip thrust", "bridge", "hip extension"])) return "Glutes";
  if (includesAny(raw, ["quad", "squat", "lunge", "step-up", "step up", "knee extension", "sissy"])) return "Quads";
  if (includesAny(raw, ["hamstring", "hinge", "deadlift", "rdl", "leg curl", "knee flexion"])) return "Hamstrings";
  if (includesAny(raw, ["calf", "tibialis", "shin", "ankle"])) return "Calves";
  if (includesAny(raw, ["neck", "trap", "shrug", "carry", "cervical"])) return "Neck / Traps";

  return "Core";
};

const inferPattern = (record: Record<string, unknown>, name: string) => {
  const explicit = getString(record, [
    "pattern",
    "movementPattern",
    "coreMovementPattern",
    "coreMovementPatternName",
  ]);

  if (explicit) return toTitleCase(explicit.replace(/-/g, " "));

  const raw = [name, getString(record, ["category", "body", "bodyPart"])]
    .join(" ")
    .toLowerCase();

  if (includesAny(raw, ["bench", "chest press", "push-up", "push up"])) return "Chest Press";
  if (includesAny(raw, ["fly", "flye"])) return "Chest Fly";
  if (includesAny(raw, ["row"])) return "Row";
  if (includesAny(raw, ["pull-up", "pull up", "pulldown"])) return "Vertical Pull";
  if (includesAny(raw, ["pullover"])) return "Pullover";
  if (includesAny(raw, ["squat"])) return "Squat";
  if (includesAny(raw, ["lunge"])) return "Lunge";
  if (includesAny(raw, ["step-up", "step up"])) return "Step-Up";
  if (includesAny(raw, ["deadlift", "hinge", "rdl"])) return "Hinge";
  if (includesAny(raw, ["hip thrust", "bridge"])) return "Hip Thrust / Bridge";
  if (includesAny(raw, ["knee extension", "sissy", "leg extension"])) return "Knee Extension";
  if (includesAny(raw, ["curl"])) return "Curl";
  if (includesAny(raw, ["tricep"])) return "Triceps Extension";
  if (includesAny(raw, ["press", "shoulder"])) return "Shoulder Press";
  if (includesAny(raw, ["carry"])) return "Carry";
  if (includesAny(raw, ["crawl"])) return "Crawl";
  if (includesAny(raw, ["jump"])) return "Jump";
  if (includesAny(raw, ["sprint"])) return "Sprint";
  if (includesAny(raw, ["throw"])) return "Throw";
  if (includesAny(raw, ["mobility", "cars", "stretch"])) return "Mobility";
  if (includesAny(raw, ["plank", "pallof", "rotation", "core"])) return "Core";

  return "Movement";
};

const normalizeExerciseStat = (
  item: unknown,
  index: number,
): NormalizedExerciseStat | null => {
  const record = asRecord(item);
  if (!record) return null;

  const exerciseName =
    getString(record, [
      "exerciseName",
      "exercise_name",
      "name",
      "title",
      "generatedTitle",
      "exercise",
    ]) || `Exercise ${index + 1}`;

  const timestamp = getTimestamp(
    record.date ??
      record.performed_at ??
      record.performedAt ??
      record.completedAt ??
      record.createdAt ??
      record.timestamp,
  );
  const sets = Math.round(cleanNumber(getNumber(record, ["sets", "setCount", "completedSets"])));
  const reps = Math.round(cleanNumber(getNumber(record, ["reps", "repCount", "completedReps"])));
  const weight = cleanNumber(
    getNumber(record, ["weight", "load", "weightPounds", "weightLb", "loadValue"]),
  );
  const bodyPart = inferBodyPart(record, exerciseName);
  const pattern = inferPattern(record, exerciseName);

  return {
    id:
      getString(record, ["id", "statId", "entryId"]) ||
      `${exerciseName}-${timestamp}-${index}`,
    exerciseId:
      getString(record, ["exerciseId", "exercise_id", "movementId"]) ||
      exerciseName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    exerciseName,
    bodyPart,
    pattern,
    equipment: getString(record, ["equipment", "primaryEquipment"], "Equipment"),
    date: new Date(timestamp).toISOString(),
    timestamp,
    sets,
    reps,
    weight,
    volume: sets * reps * weight,
    source: getString(record, ["source"], "localStorage"),
    notes: getString(record, ["notes", "note"], ""),
  };
};

const normalizeWorkoutLog = (
  item: unknown,
  index: number,
): NormalizedWorkoutLog | null => {
  const record = asRecord(item);
  if (!record) return null;

  const timestamp = getTimestamp(
    record.date ?? record.completedAt ?? record.createdAt ?? record.timestamp,
  );
  const exerciseItems = coerceArray(record.exercises ?? record.items ?? record.entries);
  const normalizedExercises = exerciseItems
    .map((exercise, exerciseIndex) => normalizeExerciseStat(exercise, exerciseIndex))
    .filter((exercise): exercise is NormalizedExerciseStat => Boolean(exercise));

  const explicitExercises = exerciseItems
    .map((exercise) => {
      const exerciseRecord = asRecord(exercise);
      return getString(exerciseRecord, ["exerciseName", "name", "title"]);
    })
    .filter(Boolean);

  const exercises =
    normalizedExercises.length > 0
      ? normalizedExercises.map((exercise) => exercise.exerciseName)
      : explicitExercises;

  const totalSets =
    getNumber(record, ["totalSets", "sets"]) ||
    normalizedExercises.reduce((total, exercise) => total + exercise.sets, 0);
  const totalReps =
    getNumber(record, ["totalReps", "reps"]) ||
    normalizedExercises.reduce((total, exercise) => total + exercise.reps, 0);
  const totalVolume =
    getNumber(record, ["totalVolume", "volume", "weightVolume"]) ||
    normalizedExercises.reduce((total, exercise) => total + exercise.volume, 0);

  return {
    id: getString(record, ["id", "workoutLogId"]) || `workout-${timestamp}-${index}`,
    name: getString(record, ["name", "title", "workoutName"], `Workout ${index + 1}`),
    date: new Date(timestamp).toISOString(),
    timestamp,
    exercises,
    totalSets,
    totalReps,
    totalVolume,
    bodyParts: [
      ...new Set(normalizedExercises.map((exercise) => exercise.bodyPart)),
    ],
    patterns: [...new Set(normalizedExercises.map((exercise) => exercise.pattern))],
    notes: getString(record, ["notes", "note"], ""),
  };
};

const getNamedItemLabel = (
  value: unknown,
  keys: string[],
  fallback: string,
) => {
  const direct = asRecord(value);
  if (direct) {
    const nestedActive =
      asRecord(direct.current) ||
      asRecord(direct.active) ||
      asRecord(direct.selected) ||
      asRecord(direct.plan) ||
      asRecord(direct.phase);
    const directLabel = getString(direct, keys);
    if (directLabel) return directLabel;
    const nestedLabel = getString(nestedActive, keys);
    if (nestedLabel) return nestedLabel;
  }

  const items = coerceArray(value);
  const activeItem =
    items
      .map((item) => asRecord(item))
      .find((item) =>
        Boolean(
          item &&
            (item.isActive === true ||
              item.active === true ||
              getString(item, ["status"]).toLowerCase() === "active"),
        ),
      ) || asRecord(items[0]);

  return getString(activeItem, keys, fallback);
};

const getLimitationCount = (profile: Record<string, unknown> | null) => {
  const injuries = profile?.injuries;
  if (Array.isArray(injuries)) return injuries.length;

  const limitations = profile?.limitations;
  if (Array.isArray(limitations)) return limitations.length;

  return 0;
};

const isJourneyValueComplete = (value: unknown) => {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "number") return Number.isFinite(value) && value > 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return (
      normalized.length > 0 &&
      !normalized.includes("not set") &&
      !normalized.includes("no active")
    );
  }
  return Boolean(value);
};

const getJourneyCompletion = (...items: unknown[]) =>
  Math.round(
    (items.filter(isJourneyValueComplete).length / Math.max(items.length, 1)) *
      100,
  );

const normalizeProfile = (rawProfile: unknown): ProfileSnapshot => {
  const profile = asRecord(rawProfile);
  const appPersonalization = asRecord(profile?.appPersonalization);
  const sessionsPerWeek = Math.round(
    cleanNumber(getNumber(profile, ["sessionsPerWeek", "weeklySessions"], 4)) || 4,
  );
  const weeklySetGoal =
    Math.round(cleanNumber(getNumber(profile, ["weeklySetGoal", "weeklyTarget"]))) ||
    Math.max(24, sessionsPerWeek * 12) ||
    DEFAULT_WEEKLY_SET_GOAL;
  const preferredUnitRaw =
    getString(profile, ["preferredWeightUnit", "units", "preferredUnit"]) ||
    getString(appPersonalization, ["units", "preferredUnitSystem"]);
  const currentPlan = getNamedItemLabel(
    readFirstValue(PLAN_KEYS),
    ["name", "title", "planName", "focus", "currentPlan"],
    "No active plan yet",
  );
  const currentPhase = getNamedItemLabel(
    readFirstValue(PHASE_KEYS),
    ["name", "title", "phaseName", "focus", "currentPhase"],
    "No active phase yet",
  );

  return {
    anatomyBackground: getString(appPersonalization, ["anatomyBackground"], "Dark Grid"),
    currentPhase,
    currentPlan,
    currentWeight: cleanNumber(getNumber(profile, ["currentWeight", "weight"])),
    displayName: getString(profile, ["displayName", "name", "firstName"], "Member"),
    equipment: getStringArray(profile, ["equipment", "availableEquipment"]).slice(0, 6),
    primaryGoal: getString(profile, ["primaryGoal", "goal"], "Goal not set"),
    goalMode: getString(profile, ["goalMode", "bodyGoalMode"], "General Health"),
    limitationCount: getLimitationCount(profile),
    memberType: getString(profile, ["memberType", "accountType"], "Active Member"),
    planDirection: getString(profile, ["preferredSplit", "planDirection", "currentPlanFocus"], "Strength + Mobility"),
    profileImage: getString(profile, ["profileImage", "avatar", "avatarUrl", "photoUrl"]),
    trainingAge: getString(profile, ["trainingAge", "memberType"], "Training age not set"),
    weeklySetGoal,
    sessionsPerWeek,
    goalWeight: cleanNumber(getNumber(profile, ["goalWeight", "targetWeight"])),
    preferredUnit: preferredUnitRaw.toLowerCase().includes("kg") ? "kg" : "lb",
  };
};

const normalizeFavorites = (items: unknown[]) =>
  items
    .map((item) => {
      if (typeof item === "string") return item;
      const record = asRecord(item);
      return getString(record, ["exerciseId", "id", "name", "exerciseName"]);
    })
    .filter(Boolean);

function getStatsFromLocalStorage(): AppStatsSnapshot {
  const exerciseStats = readFirstArray(EXERCISE_STAT_KEYS)
    .map((item, index) => normalizeExerciseStat(item, index))
    .filter((item): item is NormalizedExerciseStat => Boolean(item))
    .sort((a, b) => b.timestamp - a.timestamp);

  const workoutLogs = readFirstArray(WORKOUT_LOG_KEYS)
    .map((item, index) => normalizeWorkoutLog(item, index))
    .filter((item): item is NormalizedWorkoutLog => Boolean(item))
    .sort((a, b) => b.timestamp - a.timestamp);

  const profile = normalizeProfile(readLocalValue("soundFitnessProfile"));
  const favorites = normalizeFavorites(readFirstArray(FAVORITE_KEYS));

  return {
    profile,
    favorites,
    exerciseStats,
    workoutLogs,
    loadedAtLabel: new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date()),
  };
}

function getWeeklyStats(
  entries: NormalizedExerciseStat[],
  profile?: ProfileSnapshot,
): WeeklyStats {
  const { start, end } = getTrailingWeekBounds();
  const weekEntries = entries.filter((entry) => entry.timestamp >= start.getTime());
  const weeklyGoal = profile?.weeklySetGoal || DEFAULT_WEEKLY_SET_GOAL;
  const uniqueExerciseIds = new Set(weekEntries.map((entry) => entry.exerciseId));
  const uniqueTrainingDays = new Set(
    weekEntries.map((entry) => new Date(entry.timestamp).toDateString()),
  );
  const sets = weekEntries.reduce((total, entry) => total + entry.sets, 0);

  return {
    entries: weekEntries,
    weekStart: start,
    weekEnd: end,
    dateRangeLabel: formatDateRange(start, end),
    sets,
    reps: weekEntries.reduce((total, entry) => total + entry.reps * entry.sets, 0),
    volume: weekEntries.reduce((total, entry) => total + entry.volume, 0),
    exercisesTrained: uniqueExerciseIds.size,
    sessionsCompleted: uniqueTrainingDays.size,
    weeklyGoal,
    completionPercent: Math.min((sets / Math.max(weeklyGoal, 1)) * 100, 140),
    currentStreak: getCurrentStreak(entries),
  };
}

function getLifetimeStats(
  entries: NormalizedExerciseStat[],
  workoutLogs: NormalizedWorkoutLog[] = [],
): LifetimeStats {
  const byExercise = groupBy(entries, (entry) => entry.exerciseName);
  const mostTrainedExercise =
    Object.entries(byExercise)
      .map(([exerciseName, exerciseEntries]) => ({
        exerciseName,
        sets: exerciseEntries.reduce((total, entry) => total + entry.sets, 0),
      }))
      .sort((a, b) => b.sets - a.sets)[0]?.exerciseName || "Not logged yet";

  const mostImprovedExercise =
    Object.entries(byExercise)
      .map(([exerciseName, exerciseEntries]) => {
        const sorted = [...exerciseEntries].sort((a, b) => b.timestamp - a.timestamp);
        const latest = sorted[0]?.volume || 0;
        const previous = sorted[1]?.volume || 0;
        return { exerciseName, improvement: latest - previous };
      })
      .sort((a, b) => b.improvement - a.improvement)[0]?.exerciseName ||
    "Not enough data yet";

  return {
    sets: entries.reduce((total, entry) => total + entry.sets, 0),
    reps: entries.reduce((total, entry) => total + entry.reps * entry.sets, 0),
    volume: entries.reduce((total, entry) => total + entry.volume, 0),
    sessionsCompleted:
      workoutLogs.length || new Set(entries.map((entry) => startOfLocalDay(new Date(entry.timestamp)))).size,
    exercisesTracked: new Set(entries.map((entry) => entry.exerciseId)).size,
    mostTrainedExercise,
    mostImprovedExercise,
  };
}

function getBodyPartStats(entries: NormalizedExerciseStat[]): BodyPartStat[] {
  const { start } = getTrailingWeekBounds();

  return BODY_REGION_ORDER.map((label) => {
    const relatedEntries = entries.filter((entry) => entry.bodyPart === label);
    const weeklyEntries = relatedEntries.filter(
      (entry) => entry.timestamp >= start.getTime(),
    );
    const weeklySets = weeklyEntries.reduce((total, entry) => total + entry.sets, 0);
    const weeklyGoal = BODY_REGION_GOALS[label] || 12;
    const percent = Math.min((weeklySets / Math.max(weeklyGoal, 1)) * 100, 140);
    const latest = relatedEntries[0] || null;
    const latestDay = latest
      ? relatedEntries.filter(
          (entry) => startOfLocalDay(new Date(entry.timestamp)) === startOfLocalDay(new Date(latest.timestamp)),
        )
      : [];
    const recentSessionSets = latestDay.reduce((total, entry) => total + entry.sets, 0);
    const initialCooldown = Math.min(recentSessionSets / weeklyGoal / 0.5, 1) * 48;
    const elapsedHours = latest ? (Date.now() - latest.timestamp) / (60 * 60 * 1000) : 48;
    const cooldownHours = Math.max(0, initialCooldown - elapsedHours);
    const zone = getMomentumZone(percent);

    return {
      label,
      weeklySets,
      weeklyGoal,
      weeklyReps: weeklyEntries.reduce((total, entry) => total + entry.reps * entry.sets, 0),
      weeklyVolume: weeklyEntries.reduce((total, entry) => total + entry.volume, 0),
      lifetimeSets: relatedEntries.reduce((total, entry) => total + entry.sets, 0),
      lifetimeVolume: relatedEntries.reduce((total, entry) => total + entry.volume, 0),
      percent,
      zone,
      lastTrained: latest ? formatShortDate(latest.timestamp) : "Not logged yet",
      lastTimestamp: latest?.timestamp || null,
      cooldownHours,
      status:
        weeklySets >= weeklyGoal
          ? "Recovery"
          : percent >= 46
            ? "Productive"
            : "Needs stimulus",
    };
  });
}

function getMovementPatternStats(entries: NormalizedExerciseStat[]): PatternStat[] {
  const { start } = getTrailingWeekBounds();
  const byPattern = groupBy(entries, (entry) => entry.pattern || "Movement");

  return Object.entries(byPattern)
    .map(([label, patternEntries]) => {
      const weeklyEntries = patternEntries.filter(
        (entry) => entry.timestamp >= start.getTime(),
      );
      const weeklySets = weeklyEntries.reduce((total, entry) => total + entry.sets, 0);
      const weeklyGoal = Math.max(DEFAULT_PATTERN_GOAL, Math.round(patternEntries.length / 2) * 4);

      return {
        label,
        weeklySets,
        weeklyGoal,
        lifetimeSets: patternEntries.reduce((total, entry) => total + entry.sets, 0),
        volume: patternEntries.reduce((total, entry) => total + entry.volume, 0),
        percent: Math.min((weeklySets / Math.max(weeklyGoal, 1)) * 100, 140),
      };
    })
    .sort((a, b) => b.weeklySets - a.weeklySets);
}

function getPRStats(
  entries: NormalizedExerciseStat[],
  workoutLogs: NormalizedWorkoutLog[] = [],
): { cards: PRCard[]; opportunities: string[]; strengthCards: StrengthCard[] } {
  const heaviest = maxBy(entries, (entry) => entry.weight);
  const mostReps = maxBy(entries, (entry) => entry.reps);
  const highestE1rm = maxBy(entries, (entry) => getEstimatedOneRepMax(entry));
  const bestSession = maxBy(workoutLogs, (log) => log.totalVolume);
  const mostSetsWeek = getMostSetsInAnyWeek(entries);
  const plank = maxBy(
    entries.filter((entry) => entry.exerciseName.toLowerCase().includes("plank")),
    (entry) => entry.reps,
  );
  const pullUp = maxBy(
    entries.filter((entry) =>
      includesAny(entry.exerciseName.toLowerCase(), ["pull-up", "pull up", "chin-up", "chin up"]),
    ),
    (entry) => entry.reps,
  );
  const mobility = maxBy(
    entries.filter((entry) =>
      includesAny(entry.exerciseName.toLowerCase(), ["depth", "mobility", "sissy"]),
    ),
    (entry) => Math.max(entry.reps, entry.weight),
  );

  const cards: PRCard[] = [
    createPRCard(
      "Heaviest Set",
      heaviest,
      heaviest ? formatLoad(heaviest.weight, "lb") : "Not logged yet",
      "Add a clean top set before loading more.",
    ),
    createPRCard(
      "Most Reps",
      mostReps,
      mostReps ? `${mostReps.reps} reps` : "Not logged yet",
      "Beat this with one extra controlled rep.",
    ),
    createPRCard(
      "Highest Estimated 1RM",
      highestE1rm,
      highestE1rm ? formatLoad(getEstimatedOneRepMax(highestE1rm), "lb") : "Not logged yet",
      "Use recent rep strength as a cautious projection.",
    ),
    {
      label: "Most Volume In A Session",
      exercise: bestSession?.name || "Not logged yet",
      value: bestSession ? `${bestSession.totalVolume.toLocaleString()} lb` : "Not logged yet",
      date: bestSession ? formatShortDate(bestSession.timestamp) : "Not logged yet",
      pattern: bestSession?.patterns[0] || "Session",
      suggestion: "Repeat the structure with cleaner execution before adding volume.",
    },
    {
      label: "Most Sets In A Week",
      exercise: "Weekly consistency",
      value: `${mostSetsWeek.toLocaleString()} sets`,
      date: "Best 7-day block",
      pattern: "Volume",
      suggestion: "A small bump above this can become the next milestone.",
    },
    createPRCard(
      "Longest Plank",
      plank,
      plank ? `${plank.reps} sec` : "Not logged yet",
      "Add time slowly or progress anti-extension difficulty.",
    ),
    createPRCard(
      "Max Pull-Ups",
      pullUp,
      pullUp ? `${pullUp.reps} reps` : "Not logged yet",
      "Rows and pulldowns can support the next rep milestone.",
    ),
    createPRCard(
      "Best Depth / Mobility Score",
      mobility,
      mobility ? `${Math.max(mobility.reps, mobility.weight)}` : "Not logged yet",
      "Pair mobility exposure with controlled strength through range.",
    ),
  ];

  const strengthCards = STRENGTH_TARGETS.map((target) => {
    const matches = entries.filter((entry) => {
      const exerciseName = entry.exerciseName.toLowerCase();
      const pattern = entry.pattern.toLowerCase();
      return target.names.some((name) => exerciseName.includes(name)) || pattern.includes(target.pattern.toLowerCase());
    });
    const best = maxBy(matches, (entry) =>
      target.label.includes("Pull-Up") || target.label.includes("Depth")
        ? entry.reps
        : Math.max(entry.weight, getEstimatedOneRepMax(entry)),
    );
    const bestValue = best
      ? target.label.includes("Pull-Up") || target.label.includes("Depth")
        ? best.reps
        : Math.max(best.weight, getEstimatedOneRepMax(best))
      : 0;

    return {
      label: target.label,
      currentBest: best
        ? target.label.includes("Pull-Up") || target.label.includes("Depth")
          ? `${bestValue.toLocaleString()} reps`
          : formatLoad(bestValue, "lb")
        : "Not logged yet",
      goal:
        target.label.includes("Pull-Up") || target.label.includes("Depth")
          ? `${target.goal} reps`
          : `${target.goal} lb`,
      progressPercent: Math.min((bestValue / target.goal) * 100, 120),
      lastLogged: best ? formatShortDate(best.timestamp) : "Not logged yet",
      recommendedFocus: target.focus,
    };
  });

  return {
    cards,
    opportunities: getPROpportunities(cards, entries),
    strengthCards,
  };
}

function getRecoveryStats(bodyPartStats: BodyPartStat[]): RecoveryStats {
  const runningHot = bodyPartStats.filter(
    (stat) => stat.weeklySets >= stat.weeklyGoal || stat.zone === "Hot" || stat.zone === "Too Hot",
  );
  const readyToTrain = bodyPartStats.filter(
    (stat) => stat.weeklySets < stat.weeklyGoal * 0.46 && stat.cooldownHours <= 1,
  );
  const cooldowns = bodyPartStats.filter((stat) => stat.cooldownHours > 0);
  const recommendations = [
    runningHot[0]
      ? `${runningHot[0].label} is running hot. Use mobility, technique work, or train an alternate area today.`
      : "No body area is above target yet. You can build volume intelligently.",
    readyToTrain[0]
      ? `${readyToTrain[0].label} looks ready for useful training stimulus.`
      : "Most tracked areas have recent work. Keep the next session balanced.",
    "Keep hard sets gradual when soreness, stress, or sleep quality are working against you.",
  ];

  return { runningHot, readyToTrain, cooldowns, recommendations };
}

function getTrendStats(
  entries: NormalizedExerciseStat[],
  workoutLogs: NormalizedWorkoutLog[] = [],
  profile?: ProfileSnapshot,
): TrendStats {
  const weeks = Array.from({ length: 8 }, (_, index) => {
    const end = new Date();
    end.setDate(end.getDate() - (7 * (7 - index)));
    const start = new Date(end);
    start.setDate(end.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    const weekEntries = entries.filter(
      (entry) => entry.timestamp >= start.getTime() && entry.timestamp <= end.getTime(),
    );
    const weekLogs = workoutLogs.filter(
      (log) => log.timestamp >= start.getTime() && log.timestamp <= end.getTime(),
    );

    return {
      label: formatShortDate(start.getTime()),
      sets: weekEntries.reduce((total, entry) => total + entry.sets, 0),
      volume: weekEntries.reduce((total, entry) => total + entry.volume, 0),
      sessions:
        weekLogs.length ||
        new Set(weekEntries.map((entry) => startOfLocalDay(new Date(entry.timestamp)))).size,
      bestE1rm: maxBy(weekEntries, (entry) => getEstimatedOneRepMax(entry))
        ? getEstimatedOneRepMax(maxBy(weekEntries, (entry) => getEstimatedOneRepMax(entry)) as NormalizedExerciseStat)
        : 0,
    };
  });

  const bodyWeightTrend =
    profile?.currentWeight && profile.goalWeight
      ? [
          { label: "Current", value: profile.currentWeight },
          { label: "Goal", value: profile.goalWeight },
        ]
      : [];

  return {
    weeklyVolumeTrend: weeks,
    strengthTrend: weeks,
    consistencyTrend: weeks,
    bodyWeightTrend,
  };
}

const getCurrentStreak = (entries: NormalizedExerciseStat[]) => {
  if (entries.length === 0) return 0;

  const trainedDays = new Set(entries.map((entry) => startOfLocalDay(new Date(entry.timestamp))));
  const today = startOfLocalDay(new Date());
  let cursor = trainedDays.has(today) ? today : today - MS_PER_DAY;
  let streak = 0;

  while (trainedDays.has(cursor)) {
    streak += 1;
    cursor -= MS_PER_DAY;
  }

  return streak;
};

const getMomentumZone = (percent: number): MomentumZone => {
  if (percent <= 20) return "Ice Cold";
  if (percent <= 45) return "Building";
  if (percent <= 75) return "Productive Heat";
  if (percent <= 90) return "Hot";
  return "Too Hot";
};

const getEstimatedOneRepMax = (entry: NormalizedExerciseStat) =>
  entry.weight > 0 && entry.reps > 0 ? entry.weight * (1 + entry.reps / 30) : 0;

const groupBy = <T,>(items: T[], getKey: (item: T) => string) =>
  items.reduce<Record<string, T[]>>((groups, item) => {
    const key = getKey(item) || "Other";
    groups[key] = [...(groups[key] || []), item];
    return groups;
  }, {});

const maxBy = <T,>(items: T[], getValue: (item: T) => number) =>
  items.reduce<T | null>((best, item) => {
    if (!best) return item;
    return getValue(item) > getValue(best) ? item : best;
  }, null);

const createPRCard = (
  label: string,
  entry: NormalizedExerciseStat | null,
  value: string,
  suggestion: string,
): PRCard => ({
  label,
  exercise: entry?.exerciseName || "Not logged yet",
  value,
  date: entry ? formatShortDate(entry.timestamp) : "Not logged yet",
  pattern: entry?.pattern || "Movement",
  suggestion,
});

const getMostSetsInAnyWeek = (entries: NormalizedExerciseStat[]) => {
  const byWeek = entries.reduce<Record<string, number>>((weeks, entry) => {
    const date = new Date(entry.timestamp);
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay());
    const key = weekStart.toISOString().slice(0, 10);
    weeks[key] = (weeks[key] || 0) + entry.sets;
    return weeks;
  }, {});

  return Math.max(0, ...Object.values(byWeek));
};

const getPROpportunities = (cards: PRCard[], entries: NormalizedExerciseStat[]) => {
  if (entries.length === 0) {
    return ["Log two or three sessions to reveal your first PR opportunities."];
  }

  const closeCard = cards.find((card) => card.value !== "Not logged yet");
  const recentImprover = Object.entries(groupBy(entries, (entry) => entry.exerciseName))
    .map(([exerciseName, exerciseEntries]) => {
      const sorted = [...exerciseEntries].sort((a, b) => b.timestamp - a.timestamp);
      return {
        exerciseName,
        change: (sorted[0]?.volume || 0) - (sorted[1]?.volume || 0),
      };
    })
    .sort((a, b) => b.change - a.change)[0];

  return [
    closeCard
      ? `${closeCard.exercise} has a visible benchmark. Try to beat it by a small rep, load, or quality improvement.`
      : "Your next logged best set will become the first benchmark.",
    recentImprover?.change > 0
      ? `${recentImprover.exerciseName} is trending up. Keep the next progression modest and repeatable.`
      : "Add repeat logs for the same movement to detect your next realistic PR window.",
  ];
};

const buildHistorySessions = (
  entries: NormalizedExerciseStat[],
  workoutLogs: NormalizedWorkoutLog[],
) => {
  if (workoutLogs.length > 0) return workoutLogs;

  const groupedByDay = groupBy(entries, (entry) =>
    new Date(entry.timestamp).toISOString().slice(0, 10),
  );

  return Object.entries(groupedByDay)
    .map(([day, dayEntries], index) => ({
      id: `session-${day}-${index}`,
      name: `Training Session - ${formatShortDate(new Date(day).getTime())}`,
      date: new Date(day).toISOString(),
      timestamp: new Date(day).getTime(),
      exercises: [...new Set(dayEntries.map((entry) => entry.exerciseName))],
      totalSets: dayEntries.reduce((total, entry) => total + entry.sets, 0),
      totalReps: dayEntries.reduce((total, entry) => total + entry.reps * entry.sets, 0),
      totalVolume: dayEntries.reduce((total, entry) => total + entry.volume, 0),
      bodyParts: [...new Set(dayEntries.map((entry) => entry.bodyPart))],
      patterns: [...new Set(dayEntries.map((entry) => entry.pattern))],
      notes: "",
    }))
    .sort((a, b) => b.timestamp - a.timestamp);
};

const filterHistorySessions = (
  sessions: NormalizedWorkoutLog[],
  filter: HistoryFilter,
) => {
  const now = Date.now();
  if (filter === "Lifetime") return sessions;
  const days = filter === "This week" ? TRAILING_DAYS : 30;
  return sessions.filter((session) => session.timestamp >= now - days * MS_PER_DAY);
};

const getBalanceStat = (
  entries: NormalizedExerciseStat[],
  leftLabels: string[],
  rightLabels: string[],
) => {
  const left = entries
    .filter((entry) => leftLabels.includes(entry.bodyPart) || leftLabels.includes(entry.pattern))
    .reduce((total, entry) => total + entry.sets, 0);
  const right = entries
    .filter((entry) => rightLabels.includes(entry.bodyPart) || rightLabels.includes(entry.pattern))
    .reduce((total, entry) => total + entry.sets, 0);

  return { left, right };
};

const getCoachInsights = ({
  weekly,
  bodyPartStats,
  patternStats,
  lifetime,
}: {
  weekly: WeeklyStats;
  bodyPartStats: BodyPartStat[];
  patternStats: PatternStat[];
  lifetime: LifetimeStats;
}) => {
  if (lifetime.sets === 0) {
    return [
      "Your total logged volume is empty. Start with compound movements so the app can build a real training signal.",
      "Log sets, reps, and load to unlock recovery, PR, and body-map intelligence.",
    ];
  }

  const hot = bodyPartStats.find((stat) => stat.weeklySets >= stat.weeklyGoal);
  const cold = [...bodyPartStats].sort((a, b) => a.percent - b.percent)[0];
  const push = patternStats
    .filter((stat) => includesAny(stat.label.toLowerCase(), ["press", "push"]))
    .reduce((total, stat) => total + stat.weeklySets, 0);
  const pull = patternStats
    .filter((stat) => includesAny(stat.label.toLowerCase(), ["row", "pull"]))
    .reduce((total, stat) => total + stat.weeklySets, 0);

  return [
    hot
      ? `${hot.label} is over weekly target. Consider recovery work or an alternate ready area today.`
      : weekly.completionPercent < 40
        ? "Your total weekly volume is low. Start with a few compound movements before chasing accessories."
        : "Your weekly volume is building. Keep hard sets repeatable and let the next session fill obvious gaps.",
    pull + 3 < push
      ? "Pulling volume is lower than pressing. Add rows or pulldowns to balance the week."
      : "Push and pull work look reasonably balanced from the current logs.",
    cold
      ? `${cold.label} is the lowest-volume area right now. It is a useful candidate for your next focused block.`
      : "Add more logs to identify undertrained body parts.",
  ];
};

const getHeroCoachInsight = ({
  weekly,
  bodyPartStats,
  patternStats,
  lifetime,
  profile,
}: {
  weekly: WeeklyStats;
  bodyPartStats: BodyPartStat[];
  patternStats: PatternStat[];
  lifetime: LifetimeStats;
  profile: ProfileSnapshot;
}) => {
  if (lifetime.sets === 0) {
    return "Start logging workouts to unlock your training intelligence.";
  }

  const hot = bodyPartStats.find(
    (stat) => stat.weeklySets >= stat.weeklyGoal || stat.zone === "Too Hot",
  );
  if (hot) {
    return "Recovery signal detected. Train an alternate region today.";
  }

  const push = patternStats
    .filter((stat) => includesAny(stat.label.toLowerCase(), ["press", "push"]))
    .reduce((total, stat) => total + stat.weeklySets, 0);
  const pull = patternStats
    .filter((stat) => includesAny(stat.label.toLowerCase(), ["row", "pull"]))
    .reduce((total, stat) => total + stat.weeklySets, 0);

  if (pull + 3 < push) {
    return "Add pulling work to balance pressing.";
  }

  if (weekly.completionPercent < 40) {
    return "Build the base this week with compound lifts.";
  }

  if (profile.goalMode.toLowerCase().includes("cut")) {
    return "Keep strength work focused and recovery-aware while cutting.";
  }

  return "Your weekly momentum is building. Keep the next session clean, balanced, and repeatable.";
};

function MetricCard({
  label,
  value,
  helper,
  trend,
  accent = "cyan",
}: {
  label: string;
  value: string;
  helper: string;
  trend?: string;
  accent?: Accent;
}) {
  const classes = ACCENT_CLASSES[accent];

  return (
    <article
      className={`rounded-[28px] border ${classes.border} ${classes.bg} ${classes.glow} p-4 backdrop-blur-xl`}
    >
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
        {label}
      </p>
      <p className={`mt-2 break-words text-2xl font-black ${classes.text}`}>
        {value}
      </p>
      <p className="mt-2 text-xs leading-5 text-slate-400">{helper}</p>
      {trend ? (
        <span className="mt-3 inline-flex rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-white">
          {trend}
        </span>
      ) : null}
    </article>
  );
}

function ProgressBar({
  label,
  value,
  max,
  helper,
  accent = "cyan",
}: {
  label: string;
  value: number;
  max: number;
  helper?: string;
  accent?: Accent;
}) {
  const percent = Math.min((value / Math.max(max, 1)) * 100, 120);
  const classes = ACCENT_CLASSES[accent];

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 truncate text-xs font-black uppercase tracking-[0.16em] text-slate-300">
          {label}
        </p>
        <p className={`shrink-0 text-xs font-black ${classes.text}`}>
          {Math.round(value).toLocaleString()} / {Math.round(max).toLocaleString()}
        </p>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.08]">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${classes.bar} transition-all duration-700`}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
      {helper ? <p className="mt-2 text-xs text-slate-500">{helper}</p> : null}
    </div>
  );
}

function MomentumRing({
  percent,
  label,
  zone,
  size = "md",
}: {
  percent: number;
  label: string;
  zone: MomentumZone;
  size?: "sm" | "md" | "lg";
}) {
  const zoneStyle = ZONE_STYLES[zone];
  const dimension =
    size === "lg" ? "h-32 w-32" : size === "sm" ? "h-16 w-16" : "h-24 w-24";
  const inner =
    size === "lg" ? "h-24 w-24" : size === "sm" ? "h-12 w-12" : "h-16 w-16";

  return (
    <div
      className={`${dimension} rounded-full p-[3px] shadow-[0_0_30px_rgba(34,211,238,0.16)]`}
      style={{
        background: `conic-gradient(${zoneStyle.hex} ${Math.min(percent, 100) * 3.6}deg, rgba(255,255,255,0.09) 0deg)`,
      }}
      title={`${label}: ${Math.round(percent)}% ${zone}`}
    >
      <div className={`grid ${inner} place-items-center rounded-full bg-slate-950/95 text-center`}>
        <div>
          <p className={`text-sm font-black ${zoneStyle.text}`}>
            {Math.round(percent)}%
          </p>
          <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500">
            {size === "sm" ? "zone" : label}
          </p>
        </div>
      </div>
    </div>
  );
}

function Panel({
  title,
  subtitle,
  children,
  action,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[28px] border border-white/10 bg-slate-950/60 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.42)] backdrop-blur-xl sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-cyan-200">
            {title}
          </p>
          {subtitle ? (
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
              {subtitle}
            </p>
          ) : null}
        </div>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function TabButton({
  tab,
  isActive,
  onClick,
}: {
  tab: { id: StatsTabId; label: string };
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative min-h-[48px] shrink-0 overflow-hidden rounded-2xl border px-5 py-3 text-xs font-black uppercase tracking-[0.18em] transition ${
        isActive
          ? "border-cyan-300/40 bg-cyan-300/12 text-cyan-100 shadow-[0_0_28px_rgba(34,211,238,0.2)]"
          : "border-white/10 bg-white/[0.04] text-slate-400 hover:border-cyan-300/20 hover:bg-cyan-300/10 hover:text-cyan-100"
      }`}
    >
      <span
        className={`absolute left-4 right-4 top-0 h-[2px] rounded-full ${
          isActive ? "bg-cyan-200" : "bg-white/10"
        }`}
      />
      {tab.label}
    </button>
  );
}

function BodyRegionCard({
  stat,
  unit,
}: {
  stat: BodyPartStat;
  unit: "lb" | "kg";
}) {
  const zone = ZONE_STYLES[stat.zone];

  return (
    <article className={`rounded-[26px] border ${zone.border} ${zone.bg} p-4`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-black text-white">{stat.label}</h3>
          <p className={`mt-1 text-xs font-black uppercase tracking-[0.14em] ${zone.text}`}>
            {stat.zone}
          </p>
        </div>
        <MomentumRing percent={stat.percent} label={stat.label} zone={stat.zone} size="sm" />
      </div>
      <div className="mt-4 space-y-2">
        <ProgressBar
          label="Weekly Sets"
          value={stat.weeklySets}
          max={stat.weeklyGoal}
          accent={stat.zone === "Too Hot" ? "rose" : "cyan"}
        />
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
            <p className="text-slate-500">Weight Volume</p>
            <p className="mt-1 font-black text-white">
              {formatWeightVolume(stat.weeklyVolume, unit)}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
            <p className="text-slate-500">Last Trained</p>
            <p className="mt-1 font-black text-white">{stat.lastTrained}</p>
          </div>
        </div>
        <p className="text-xs text-slate-400">
          {stat.cooldownHours > 1
            ? `Cooldown: ${Math.ceil(stat.cooldownHours)}h remaining`
            : stat.status}
        </p>
      </div>
    </article>
  );
}

function StrengthProgressCard({
  card,
}: {
  card: StrengthCard;
}) {
  return (
    <article className="rounded-[26px] border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-black text-white">{card.label}</h3>
          <p className="mt-1 text-xs text-slate-500">Goal: {card.goal}</p>
        </div>
        <span className="rounded-full border border-amber-300/20 bg-amber-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-amber-200">
          {Math.round(card.progressPercent)}%
        </span>
      </div>
      <p className="mt-4 text-2xl font-black text-cyan-100">{card.currentBest}</p>
      <p className="mt-1 text-xs text-slate-500">Last logged: {card.lastLogged}</p>
      <div className="mt-4">
        <ProgressBar
          label="Progress"
          value={Math.min(card.progressPercent, 100)}
          max={100}
          accent="amber"
          helper={card.recommendedFocus}
        />
      </div>
    </article>
  );
}

function PRStatCard({ card }: { card: PRCard }) {
  return (
    <article className="rounded-[26px] border border-white/10 bg-white/[0.04] p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-200">
        {card.label}
      </p>
      <h3 className="mt-3 text-xl font-black text-white">{card.value}</h3>
      <p className="mt-1 text-sm font-bold text-cyan-100">{card.exercise}</p>
      <p className="mt-1 text-xs text-slate-500">
        {card.pattern} - {card.date}
      </p>
      <p className="mt-3 text-xs leading-5 text-slate-400">{card.suggestion}</p>
    </article>
  );
}

function HistoryCard({
  session,
  unit,
}: {
  session: NormalizedWorkoutLog;
  unit: "lb" | "kg";
}) {
  return (
    <article className="rounded-[26px] border border-white/10 bg-white/[0.04] p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200">
            {formatFullDate(session.timestamp)}
          </p>
          <h3 className="mt-2 text-xl font-black text-white">{session.name}</h3>
        </div>
        <span className="rounded-full border border-white/10 bg-black/25 px-3 py-1 text-xs font-black text-slate-200">
          {session.totalSets} sets
        </span>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <MetricMini label="Total Reps" value={session.totalReps.toLocaleString()} />
        <MetricMini label="Volume" value={formatWeightVolume(session.totalVolume, unit)} />
        <MetricMini label="Exercises" value={session.exercises.length.toLocaleString()} />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {[...session.bodyParts, ...session.patterns].slice(0, 8).map((item) => (
          <span
            key={item}
            className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-300"
          >
            {item}
          </span>
        ))}
      </div>
      {session.exercises.length > 0 ? (
        <p className="mt-3 text-xs leading-5 text-slate-400">
          {session.exercises.slice(0, 5).join(", ")}
          {session.exercises.length > 5 ? "..." : ""}
        </p>
      ) : null}
      {session.notes ? <p className="mt-3 text-xs text-slate-500">{session.notes}</p> : null}
    </article>
  );
}

function MetricMini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-sm font-black text-white">{value}</p>
    </div>
  );
}

function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[26px] border border-dashed border-white/15 bg-white/[0.03] p-6 text-center text-sm leading-6 text-slate-400">
      {children}
    </div>
  );
}

function TrendBars({
  weeks,
  valueKey,
  label,
  accent = "cyan",
}: {
  weeks: TrendWeek[];
  valueKey: "sets" | "volume" | "sessions" | "bestE1rm";
  label: string;
  accent?: Accent;
}) {
  const maxValue = Math.max(1, ...weeks.map((week) => week[valueKey]));

  return (
    <div className="rounded-[26px] border border-white/10 bg-white/[0.04] p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
        {label}
      </p>
      <div className="mt-4 flex h-44 items-end gap-2 overflow-x-auto pb-2">
        {weeks.map((week) => {
          const height = Math.max(8, (week[valueKey] / maxValue) * 100);
          return (
            <div key={week.label} className="flex min-w-[46px] flex-1 flex-col items-center justify-end gap-2">
              <div className="flex h-32 w-full items-end rounded-full bg-white/[0.06] p-1">
                <div
                  className={`w-full rounded-full bg-gradient-to-t ${ACCENT_CLASSES[accent].bar}`}
                  style={{ height: `${height}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-500">{week.label}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const getInitials = (name: string) => {
  const parts = name
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) return "SF";
  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
};

const getHeroBackgroundClass = (background: string) => {
  const key = background.toLowerCase();

  if (key.includes("seattle")) {
    return "bg-[radial-gradient(circle_at_15%_5%,rgba(34,211,238,0.24),transparent_26%),radial-gradient(circle_at_82%_12%,rgba(14,165,233,0.2),transparent_34%),linear-gradient(135deg,rgba(2,6,23,0.96),rgba(8,47,73,0.72),rgba(2,6,23,0.98))]";
  }

  if (key.includes("beach")) {
    return "bg-[radial-gradient(circle_at_12%_8%,rgba(45,212,191,0.22),transparent_30%),radial-gradient(circle_at_84%_0%,rgba(251,146,60,0.22),transparent_32%),linear-gradient(135deg,rgba(2,6,23,0.96),rgba(15,118,110,0.48),rgba(67,20,7,0.66))]";
  }

  if (key.includes("studio")) {
    return "bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.18),transparent_22%),radial-gradient(circle_at_15%_15%,rgba(34,211,238,0.16),transparent_30%),linear-gradient(135deg,rgba(2,6,23,0.98),rgba(30,41,59,0.72),rgba(2,6,23,0.98))]";
  }

  if (key.includes("mountain")) {
    return "bg-[radial-gradient(circle_at_15%_5%,rgba(52,211,153,0.18),transparent_28%),radial-gradient(circle_at_82%_12%,rgba(96,165,250,0.18),transparent_34%),linear-gradient(135deg,rgba(2,6,23,0.96),rgba(20,83,45,0.48),rgba(30,41,59,0.76))]";
  }

  return "bg-[linear-gradient(135deg,rgba(2,6,23,0.98),rgba(8,13,35,0.94)),linear-gradient(rgba(34,211,238,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.1)_1px,transparent_1px)] bg-[size:auto,42px_42px,42px_42px]";
};

function TabGlyph({ tabId }: { tabId: StatsTabId }) {
  const path =
    tabId === "volume"
      ? "M4 18h16M7 18V8m5 10V5m5 13v-7"
      : tabId === "strength"
        ? "M5 12h14M7 9v6m10-6v6M3 10v4m18-4v4"
        : tabId === "body-map"
          ? "M12 4a3 3 0 0 1 3 3v3l3 7M12 10v10M9 10v3l-3 4"
          : tabId === "prs"
            ? "M12 3l2.5 5 5.5.8-4 3.9.9 5.5L12 15l-4.9 2.7.9-5.5-4-3.9 5.5-.8L12 3Z"
            : tabId === "recovery"
              ? "M12 21s7-4.4 7-11a4 4 0 0 0-7-2.6A4 4 0 0 0 5 10c0 6.6 7 11 7 11Z"
              : tabId === "trends"
                ? "M4 17 9 12l3 3 7-8M4 20h16"
                : tabId === "history"
                  ? "M12 8v5l3 2M21 12a9 9 0 1 1-3-6.7"
                  : "M4 12a8 8 0 1 1 16 0 8 8 0 0 1-16 0Zm4 0h8";

  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      <path d={path} />
    </svg>
  );
}

function HeroMetricCard({
  label,
  value,
  helper,
  accent = "cyan",
}: {
  label: string;
  value: string;
  helper: string;
  accent?: Accent;
}) {
  const classes = ACCENT_CLASSES[accent];

  return (
    <div className={`rounded-2xl border ${classes.border} bg-white/[0.045] p-3`}>
      <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <p className={`mt-1 truncate text-lg font-black ${classes.text}`}>{value}</p>
      <p className="mt-1 truncate text-[11px] text-slate-400">{helper}</p>
    </div>
  );
}

function StatsProfileHero({
  activeTab,
  onTabSelect,
  profile,
  weekly,
  lifetime,
  bodyPartStats,
  prCards,
  recovery,
  trends,
  historySessions,
  favorites,
  coachInsight,
  unit,
}: {
  activeTab: StatsTabId;
  onTabSelect: (tab: StatsTabId) => void;
  profile: ProfileSnapshot;
  weekly: WeeklyStats;
  lifetime: LifetimeStats;
  bodyPartStats: BodyPartStat[];
  prCards: PRCard[];
  recovery: RecoveryStats;
  trends: TrendStats;
  historySessions: NormalizedWorkoutLog[];
  favorites: string[];
  coachInsight: string;
  unit: "lb" | "kg";
}) {
  const readinessZone = getMomentumZone(weekly.completionPercent);
  const readinessStyle = ZONE_STYLES[readinessZone];
  const mostTrainedBodyPart =
    [...bodyPartStats].sort((a, b) => b.lifetimeSets - a.lifetimeSets)[0]?.label ||
    "Not enough data";
  const recentWorkout = historySessions[0];
  const hotZones = bodyPartStats.filter(
    (stat) => stat.zone === "Hot" || stat.zone === "Too Hot",
  ).length;
  const prCount = prCards.filter((card) => card.value !== "Not logged yet").length;
  const trendWeeks = trends.weeklyVolumeTrend.filter((week) => week.sets > 0).length;
  const bodyGoal =
    profile.currentWeight && profile.goalWeight
      ? `Current ${profile.currentWeight.toLocaleString()} ${unit} -> Goal ${profile.goalWeight.toLocaleString()} ${unit}`
      : "Add body metrics";
  const backgroundClass = getHeroBackgroundClass(profile.anatomyBackground);

  const navMetrics: Record<StatsTabId, string> = {
    overview: "Weekly snapshot",
    volume: `${formatWeightVolume(weekly.volume, unit)} volume`,
    strength: `${prCount} PRs`,
    "body-map": `${hotZones} hot zones`,
    prs: `${prCount} records`,
    recovery: `${recovery.runningHot.length} caution`,
    trends: `${trendWeeks} active weeks`,
    history: `${historySessions.length} logs`,
  };

  return (
    <section
      className={`relative overflow-hidden rounded-[32px] border border-white/10 ${backgroundClass} p-4 shadow-[0_30px_120px_rgba(0,0,0,0.7)] backdrop-blur-xl sm:p-5 lg:p-6`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_35%_0%,rgba(255,255,255,0.08),transparent_28%),linear-gradient(135deg,rgba(2,6,23,0.26),rgba(2,6,23,0.9))]" />
      <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-cyan-300/10 blur-3xl" />
      <div className="absolute -bottom-20 left-1/3 h-56 w-56 rounded-full bg-amber-300/10 blur-3xl" />

      <div className="relative z-10 grid gap-4 xl:grid-cols-[0.92fr_1.05fr_1.2fr]">
        <div className="rounded-[28px] border border-white/10 bg-slate-950/52 p-4 shadow-[0_0_40px_rgba(34,211,238,0.08)]">
          <div className="flex items-start gap-4">
            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full border border-cyan-300/25 bg-cyan-300/10 shadow-[0_0_34px_rgba(34,211,238,0.22)]">
              {profile.profileImage ? (
                <img
                  alt={`${profile.displayName} profile`}
                  className="h-full w-full object-cover"
                  src={profile.profileImage}
                />
              ) : (
                <div className="grid h-full w-full place-items-center text-3xl font-black text-cyan-100">
                  {getInitials(profile.displayName)}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-200">
                Sound Fitness ID
              </p>
              <h1 className="mt-2 truncate text-3xl font-black text-white sm:text-4xl">
                {profile.displayName}
              </h1>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full border border-emerald-300/25 bg-emerald-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-emerald-200">
                  Active Member
                </span>
                <span className="rounded-full border border-amber-300/25 bg-amber-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-amber-200">
                  {profile.goalMode}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-2 text-xs text-slate-300">
            <ProfileLine label="Member Type" value={profile.memberType} />
            <ProfileLine label="Training Age" value={profile.trainingAge} />
            <ProfileLine label="Plan Direction" value={profile.planDirection} />
            <ProfileLine label="Current Plan" value={profile.currentPlan} />
            <ProfileLine label="Current Phase" value={profile.currentPhase} />
            <ProfileLine label="Body Goal" value={bodyGoal} />
          </div>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-slate-950/58 p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <MomentumRing
              percent={weekly.completionPercent}
              label="Readiness"
              zone={readinessZone}
              size="lg"
            />
            <div className="min-w-0">
              <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${readinessStyle.text}`}>
                {readinessZone}
              </p>
              <h2 className="mt-2 text-2xl font-black text-white">
                Training state
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                {coachInsight}
              </p>
              <p className="mt-2 text-xs text-slate-500">
                {weekly.dateRangeLabel} - {weekly.sets} / {weekly.weeklyGoal} sets
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <HeroMetricCard
              label="Weekly Sets"
              value={`${weekly.sets} / ${weekly.weeklyGoal}`}
              helper={`${Math.round(weekly.completionPercent)}% complete`}
              accent="cyan"
            />
            <HeroMetricCard
              label="Weekly Volume"
              value={formatWeightVolume(weekly.volume, unit)}
              helper={`${weekly.exercisesTrained} exercises trained`}
              accent="amber"
            />
            <HeroMetricCard
              label="Lifetime Volume"
              value={formatWeightVolume(lifetime.volume, unit)}
              helper={`${lifetime.sets.toLocaleString()} lifetime sets`}
              accent="emerald"
            />
            <HeroMetricCard
              label="Streak"
              value={`${weekly.currentStreak} day${weekly.currentStreak === 1 ? "" : "s"}`}
              helper={recentWorkout?.name || "No recent workout"}
              accent="blue"
            />
            <HeroMetricCard
              label="Favorites"
              value={favorites.length.toLocaleString()}
              helper="Saved exercise targets"
              accent="violet"
            />
            <HeroMetricCard
              label="Limitations"
              value={profile.limitationCount.toLocaleString()}
              helper={`Most trained: ${mostTrainedBodyPart}`}
              accent={profile.limitationCount > 0 ? "rose" : "cyan"}
            />
          </div>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-slate-950/58 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-200">
                📈 Progress Stats Navigator
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Jump through the Progress Stats command center.
              </p>
            </div>
            <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-300">
              {profile.anatomyBackground}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-2 2xl:grid-cols-4">
            {STATS_TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onTabSelect(tab.id)}
                  className={`group min-h-[92px] rounded-2xl border p-3 text-left transition ${
                    isActive
                      ? "border-cyan-300/40 bg-cyan-300/12 text-cyan-100 shadow-[0_0_30px_rgba(34,211,238,0.2)]"
                      : "border-white/10 bg-white/[0.04] text-slate-300 hover:border-cyan-300/25 hover:bg-white/[0.08]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className={isActive ? "text-cyan-100" : "text-slate-400 group-hover:text-cyan-200"}>
                      <TabGlyph tabId={tab.id} />
                    </span>
                    <span className={`h-2 w-2 rounded-full ${isActive ? "bg-cyan-200" : "bg-white/20"}`} />
                  </div>
                  <p className="mt-3 text-xs font-black uppercase tracking-[0.15em]">
                    {tab.label}
                  </p>
                  <p className="mt-1 truncate text-[11px] text-slate-500">
                    {navMetrics[tab.id]}
                  </p>
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            <HeroRoutePill href={ROUTES.dashboard.profile} label="🧍 Profile" />
            <HeroRoutePill href={ROUTES.dashboard.exerciseLibrary} label="📚 Library" />
            <HeroRoutePill href={ROUTES.workoutBuilder.home} label="🛠 Builder" />
            <HeroRoutePill href={ROUTES.dashboard.plan} label="🗂 My Plan" />
            <HeroRoutePill href={ROUTES.dashboard.phases} label="🧠 Periodized Plan" />
            <HeroRoutePill href={ROUTES.dashboard.recovery} label="🩹 Recovery" />
          </div>
        </div>
      </div>
    </section>
  );
}

function ProfileLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.035] px-3 py-2">
      <span className="shrink-0 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
        {label}
      </span>
      <span className="min-w-0 truncate text-right font-bold text-slate-200">
        {value || "Not set"}
      </span>
    </div>
  );
}

function HeroRoutePill({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="min-h-[38px] shrink-0 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-cyan-100 transition hover:border-cyan-200/45 hover:bg-cyan-300/15"
    >
      {label}
    </Link>
  );
}

export default function StatsPage() {
  const [activeTab, setActiveTab] = useState<StatsTabId>("overview");
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>("This week");
  const [snapshot, setSnapshot] = useState<AppStatsSnapshot>(() => ({
    profile: normalizeProfile(null),
    favorites: [],
    exerciseStats: [],
    workoutLogs: [],
    loadedAtLabel: "Not loaded yet",
  }));

  useEffect(() => {
    const syncStats = () => setSnapshot(getStatsFromLocalStorage());

    syncStats();
    window.addEventListener("storage", syncStats);

    return () => window.removeEventListener("storage", syncStats);
  }, []);

  const weekly = useMemo(
    () => getWeeklyStats(snapshot.exerciseStats, snapshot.profile),
    [snapshot.exerciseStats, snapshot.profile],
  );
  const lifetime = useMemo(
    () => getLifetimeStats(snapshot.exerciseStats, snapshot.workoutLogs),
    [snapshot.exerciseStats, snapshot.workoutLogs],
  );
  const bodyPartStats = useMemo(
    () => getBodyPartStats(snapshot.exerciseStats),
    [snapshot.exerciseStats],
  );
  const patternStats = useMemo(
    () => getMovementPatternStats(snapshot.exerciseStats),
    [snapshot.exerciseStats],
  );
  const prStats = useMemo(
    () => getPRStats(snapshot.exerciseStats, snapshot.workoutLogs),
    [snapshot.exerciseStats, snapshot.workoutLogs],
  );
  const recovery = useMemo(
    () => getRecoveryStats(bodyPartStats),
    [bodyPartStats],
  );
  const trends = useMemo(
    () => getTrendStats(snapshot.exerciseStats, snapshot.workoutLogs, snapshot.profile),
    [snapshot.exerciseStats, snapshot.workoutLogs, snapshot.profile],
  );
  const historySessions = useMemo(
    () => buildHistorySessions(snapshot.exerciseStats, snapshot.workoutLogs),
    [snapshot.exerciseStats, snapshot.workoutLogs],
  );
  const filteredHistory = useMemo(
    () => filterHistorySessions(historySessions, historyFilter),
    [historySessions, historyFilter],
  );
  const coachInsights = useMemo(
    () => getCoachInsights({ weekly, bodyPartStats, patternStats, lifetime }),
    [weekly, bodyPartStats, patternStats, lifetime],
  );
  const heroCoachInsight = useMemo(
    () =>
      getHeroCoachInsight({
        weekly,
        bodyPartStats,
        patternStats,
        lifetime,
        profile: snapshot.profile,
      }),
    [weekly, bodyPartStats, patternStats, lifetime, snapshot.profile],
  );

  const unit = snapshot.profile.preferredUnit;
  const upperLower = getBalanceStat(
    weekly.entries,
    ["Chest", "Back", "Shoulders", "Arms"],
    ["Glutes", "Quads", "Hamstrings", "Calves"],
  );
  const pushPull = getBalanceStat(
    weekly.entries,
    ["Chest Press", "Shoulder Press", "Chest"],
    ["Row", "Vertical Pull", "Pullover", "Back"],
  );
  const compoundIsolation = {
    compound: weekly.entries
      .filter((entry) =>
        includesAny(entry.pattern.toLowerCase(), [
          "squat",
          "hinge",
          "lunge",
          "press",
          "row",
          "pull",
          "carry",
        ]),
      )
      .reduce((total, entry) => total + entry.sets, 0),
    isolation: weekly.entries
      .filter((entry) =>
        includesAny(entry.pattern.toLowerCase(), [
          "curl",
          "extension",
          "raise",
          "fly",
          "abduction",
          "adduction",
        ]),
      )
      .reduce((total, entry) => total + entry.sets, 0),
  };
  const masterJourneyCompletions = useMemo(
    () => ({
      fuel: getJourneyCompletion(
        snapshot.profile.goalMode,
        snapshot.profile.currentWeight,
        snapshot.profile.goalWeight,
      ),
      goals: getJourneyCompletion(
        snapshot.profile.primaryGoal,
        snapshot.profile.goalMode,
        snapshot.profile.goalWeight,
        snapshot.profile.planDirection,
      ),
      performance: getJourneyCompletion(
        lifetime.sessionsCompleted,
        lifetime.volume,
        prStats.cards.length,
        weekly.exercisesTrained,
      ),
      profile: getJourneyCompletion(
        snapshot.profile.displayName,
        snapshot.profile.memberType,
        snapshot.profile.trainingAge,
        snapshot.profile.currentWeight,
        snapshot.profile.sessionsPerWeek,
        snapshot.profile.equipment,
      ),
      recovery: getJourneyCompletion(
        recovery.recommendations.length,
        recovery.readyToTrain.length,
        recovery.cooldowns.length,
        snapshot.profile.limitationCount,
      ),
      training: getJourneyCompletion(
        weekly.sets,
        weekly.sessionsCompleted,
        snapshot.profile.weeklySetGoal,
        snapshot.profile.currentPlan,
        snapshot.favorites,
      ),
    }),
    [lifetime, prStats, recovery, snapshot.favorites, snapshot.profile, weekly],
  );
  const handleHeroTabSelect = (tab: StatsTabId) => {
    setActiveTab(tab);
    window.requestAnimationFrame(() => {
      document
        .getElementById("stats-command-center-content")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_10%_0%,rgba(34,211,238,0.18),transparent_34%),radial-gradient(circle_at_85%_8%,rgba(251,191,36,0.16),transparent_30%),radial-gradient(circle_at_50%_70%,rgba(59,130,246,0.12),transparent_38%),linear-gradient(180deg,#020617_0%,#0f172a_48%,#020617_100%)] text-white">
      <section className="mx-auto w-full max-w-[1440px] space-y-5 px-3 py-5 sm:px-5 lg:px-8">
        <StatsProfileHero
          activeTab={activeTab}
          bodyPartStats={bodyPartStats}
          coachInsight={heroCoachInsight}
          favorites={snapshot.favorites}
          historySessions={historySessions}
          lifetime={lifetime}
          onTabSelect={handleHeroTabSelect}
          prCards={prStats.cards}
          profile={snapshot.profile}
          recovery={recovery}
          trends={trends}
          unit={unit}
          weekly={weekly}
        />

        <nav className="sticky top-0 z-20 -mx-3 overflow-hidden border-y border-white/10 bg-slate-950/80 px-3 py-3 backdrop-blur-xl sm:mx-0 sm:rounded-[26px] sm:border">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {STATS_TABS.map((tab) => (
              <TabButton
                key={tab.id}
                tab={tab}
                isActive={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
              />
            ))}
          </div>
        </nav>

        <div id="stats-command-center-content" className="scroll-mt-28 space-y-5">
          {activeTab === "overview" ? (
            <OverviewTab
              weekly={weekly}
              lifetime={lifetime}
              coachInsights={coachInsights}
              unit={unit}
            />
          ) : null}

          {activeTab === "volume" ? (
            <VolumeTab
              weekly={weekly}
              bodyPartStats={bodyPartStats}
              patternStats={patternStats}
              unit={unit}
              pushPull={pushPull}
              upperLower={upperLower}
              compoundIsolation={compoundIsolation}
            />
          ) : null}

          {activeTab === "strength" ? (
            <StrengthTab strengthCards={prStats.strengthCards} />
          ) : null}

          {activeTab === "body-map" ? (
            <BodyMapTab bodyPartStats={bodyPartStats} unit={unit} />
          ) : null}

          {activeTab === "prs" ? (
            <PRsTab cards={prStats.cards} opportunities={prStats.opportunities} />
          ) : null}

          {activeTab === "recovery" ? (
            <RecoveryTab recovery={recovery} unit={unit} />
          ) : null}

          {activeTab === "trends" ? (
            <TrendsTab trends={trends} profile={snapshot.profile} unit={unit} />
          ) : null}

          {activeTab === "history" ? (
            <HistoryTab
              sessions={filteredHistory}
              historyFilter={historyFilter}
              onHistoryFilterChange={setHistoryFilter}
              unit={unit}
            />
          ) : null}
        </div>

        <MasterTrainingJourney completions={masterJourneyCompletions} />
      </section>
    </main>
  );
}

function OverviewTab({
  weekly,
  lifetime,
  coachInsights,
  unit,
}: {
  weekly: WeeklyStats;
  lifetime: LifetimeStats;
  coachInsights: string[];
  unit: "lb" | "kg";
}) {
  return (
    <div className="space-y-5">
      <Panel
        title="Overview"
        subtitle="A compact read on what you have done, where volume is going, and what the next useful focus might be."
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Weekly Sets"
            value={weekly.sets.toLocaleString()}
            helper={weekly.dateRangeLabel}
            trend={`${Math.round(weekly.completionPercent)}% complete`}
            accent="cyan"
          />
          <MetricCard
            label="Weekly Goal"
            value={weekly.weeklyGoal.toLocaleString()}
            helper="From profile or safe fallback target"
            accent="blue"
          />
          <MetricCard
            label="Lifetime Volume"
            value={formatWeightVolume(lifetime.volume, unit)}
            helper="All logged load volume"
            accent="amber"
          />
          <MetricCard
            label="Lifetime Sets"
            value={lifetime.sets.toLocaleString()}
            helper="All logged sets"
            accent="emerald"
          />
          <MetricCard
            label="Lifetime Reps"
            value={lifetime.reps.toLocaleString()}
            helper="Sets multiplied by reps"
            accent="violet"
          />
          <MetricCard
            label="Sessions Completed"
            value={lifetime.sessionsCompleted.toLocaleString()}
            helper="Workout logs or training days"
            accent="cyan"
          />
          <MetricCard
            label="Most Trained Exercise"
            value={lifetime.mostTrainedExercise}
            helper="Highest total logged sets"
            accent="amber"
          />
          <MetricCard
            label="Most Improved Exercise"
            value={lifetime.mostImprovedExercise}
            helper="Best latest-vs-previous volume change"
            accent="emerald"
          />
        </div>
      </Panel>

      <Panel title="Smart Coach Insights" subtitle="Generated from real logged stats only.">
        <div className="grid gap-3 lg:grid-cols-3">
          {coachInsights.map((insight) => (
            <div
              key={insight}
              className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4 text-sm leading-6 text-slate-300"
            >
              {insight}
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function VolumeTab({
  weekly,
  bodyPartStats,
  patternStats,
  unit,
  pushPull,
  upperLower,
  compoundIsolation,
}: {
  weekly: WeeklyStats;
  bodyPartStats: BodyPartStat[];
  patternStats: PatternStat[];
  unit: "lb" | "kg";
  pushPull: { left: number; right: number };
  upperLower: { left: number; right: number };
  compoundIsolation: { compound: number; isolation: number };
}) {
  return (
    <div className="space-y-5">
      <Panel
        title="Volume Intelligence"
        subtitle="Weekly volume progress, body-part ranking, movement patterns, and balance signals."
      >
        <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-3">
            <ProgressBar
              label="Weekly Volume Progress"
              value={weekly.sets}
              max={weekly.weeklyGoal}
              helper={`${weekly.reps.toLocaleString()} reps - ${formatWeightVolume(weekly.volume, unit)} volume`}
              accent="cyan"
            />
            <BalanceCard label="Push vs Pull" left={pushPull.left} right={pushPull.right} leftLabel="Push" rightLabel="Pull" />
            <BalanceCard label="Upper vs Lower" left={upperLower.left} right={upperLower.right} leftLabel="Upper" rightLabel="Lower" />
            <BalanceCard
              label="Compound vs Isolation"
              left={compoundIsolation.compound}
              right={compoundIsolation.isolation}
              leftLabel="Compound"
              rightLabel="Isolation"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {bodyPartStats
              .slice()
              .sort((a, b) => b.weeklySets - a.weeklySets)
              .slice(0, 8)
              .map((stat) => (
                <ProgressBar
                  key={stat.label}
                  label={stat.label}
                  value={stat.weeklySets}
                  max={stat.weeklyGoal}
                  helper={`${formatWeightVolume(stat.weeklyVolume, unit)} - ${stat.zone}`}
                  accent={stat.zone === "Too Hot" ? "rose" : "amber"}
                />
              ))}
          </div>
        </div>
      </Panel>

      <Panel title="Movement Pattern Breakdown" subtitle="Patterns stay aligned with the Sound Fitness movement engine.">
        {patternStats.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {patternStats.slice(0, 12).map((stat) => (
              <ProgressBar
                key={stat.label}
                label={stat.label}
                value={stat.weeklySets}
                max={stat.weeklyGoal}
                helper={`${stat.lifetimeSets.toLocaleString()} lifetime sets - ${formatWeightVolume(stat.volume, unit)}`}
                accent="emerald"
              />
            ))}
          </div>
        ) : (
          <EmptyState>Movement pattern stats will appear after logged sets.</EmptyState>
        )}
      </Panel>
    </div>
  );
}

function BalanceCard({
  label,
  left,
  right,
  leftLabel,
  rightLabel,
}: {
  label: string;
  left: number;
  right: number;
  leftLabel: string;
  rightLabel: string;
}) {
  const total = Math.max(left + right, 1);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-300">
          {label}
        </p>
        <p className="text-xs font-bold text-slate-500">
          {left} / {right}
        </p>
      </div>
      <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-white/[0.08]">
        <div
          className="bg-gradient-to-r from-cyan-300 to-blue-400"
          style={{ width: `${(left / total) * 100}%` }}
        />
        <div
          className="bg-gradient-to-r from-amber-300 to-orange-400"
          style={{ width: `${(right / total) * 100}%` }}
        />
      </div>
      <div className="mt-2 flex justify-between text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
        <span>{leftLabel}</span>
        <span>{rightLabel}</span>
      </div>
    </div>
  );
}

function StrengthTab({ strengthCards }: { strengthCards: StrengthCard[] }) {
  return (
    <Panel
      title="Strength Progress"
      subtitle="Best available logged sets, estimated 1RM where load and reps exist, and movement-specific focus notes."
    >
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {strengthCards.map((card) => (
          <StrengthProgressCard key={card.label} card={card} />
        ))}
      </div>
    </Panel>
  );
}

function BodyMapTab({
  bodyPartStats,
  unit,
}: {
  bodyPartStats: BodyPartStat[];
  unit: "lb" | "kg";
}) {
  return (
    <Panel
      title="Body Map"
      subtitle="Compact region readiness using weekly sets, weekly goals, load volume, last trained, and cooldown."
    >
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {bodyPartStats.map((stat) => (
          <BodyRegionCard key={stat.label} stat={stat} unit={unit} />
        ))}
      </div>
    </Panel>
  );
}

function PRsTab({
  cards,
  opportunities,
}: {
  cards: PRCard[];
  opportunities: string[];
}) {
  return (
    <div className="space-y-5">
      <Panel title="Personal Records" subtitle="Your current logged bests and what to try next.">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => (
            <PRStatCard key={card.label} card={card} />
          ))}
        </div>
      </Panel>

      <Panel title="PR Opportunities" subtitle="Close, realistic next wins based on current logged history.">
        <div className="grid gap-3 lg:grid-cols-2">
          {opportunities.map((opportunity) => (
            <div
              key={opportunity}
              className="rounded-[24px] border border-amber-300/15 bg-amber-400/10 p-4 text-sm leading-6 text-slate-200"
            >
              {opportunity}
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function RecoveryTab({
  recovery,
  unit,
}: {
  recovery: RecoveryStats;
  unit: "lb" | "kg";
}) {
  return (
    <div className="space-y-5">
      <Panel title="Recovery Intelligence" subtitle="Shows what is running hot, what is ready, and what to do next.">
        <div className="grid gap-4 lg:grid-cols-3">
          <RecoveryColumn title="Muscles Running Hot" stats={recovery.runningHot} empty="No area is above target right now." unit={unit} />
          <RecoveryColumn title="Ready To Train" stats={recovery.readyToTrain} empty="No clear low-volume area yet." unit={unit} />
          <RecoveryColumn title="Cooldown Timers" stats={recovery.cooldowns} empty="No active cooldown timers." unit={unit} />
        </div>
      </Panel>

      <Panel title="Recovery Recommendations" subtitle="Safe training direction, not medical advice.">
        <div className="grid gap-3 lg:grid-cols-3">
          {recovery.recommendations.map((recommendation) => (
            <div
              key={recommendation}
              className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4 text-sm leading-6 text-slate-300"
            >
              {recommendation}
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function RecoveryColumn({
  title,
  stats,
  empty,
  unit,
}: {
  title: string;
  stats: BodyPartStat[];
  empty: string;
  unit: "lb" | "kg";
}) {
  return (
    <div className="rounded-[26px] border border-white/10 bg-white/[0.04] p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200">
        {title}
      </p>
      <div className="mt-4 space-y-3">
        {stats.length > 0 ? (
          stats.slice(0, 5).map((stat) => (
            <div key={stat.label} className="rounded-2xl border border-white/10 bg-black/20 p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="font-black text-white">{stat.label}</p>
                <span className={`text-xs font-black ${ZONE_STYLES[stat.zone].text}`}>
                  {stat.zone}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {stat.weeklySets} / {stat.weeklyGoal} sets - {formatWeightVolume(stat.weeklyVolume, unit)}
              </p>
              {stat.cooldownHours > 1 ? (
                <p className="mt-1 text-xs text-amber-200">
                  Cooldown: {Math.ceil(stat.cooldownHours)}h
                </p>
              ) : null}
            </div>
          ))
        ) : (
          <p className="text-sm leading-6 text-slate-500">{empty}</p>
        )}
      </div>
    </div>
  );
}

function TrendsTab({
  trends,
  profile,
  unit,
}: {
  trends: TrendStats;
  profile: ProfileSnapshot;
  unit: "lb" | "kg";
}) {
  return (
    <div className="space-y-5">
      <Panel title="Trends" subtitle="Simple chart cards that stay safe even without a charting library.">
        <div className="grid gap-4 lg:grid-cols-2">
          <TrendBars weeks={trends.weeklyVolumeTrend} valueKey="sets" label="Weekly Volume Trend" accent="cyan" />
          <TrendBars weeks={trends.strengthTrend} valueKey="bestE1rm" label="Strength Trend" accent="amber" />
          <TrendBars weeks={trends.consistencyTrend} valueKey="sessions" label="Consistency Trend" accent="emerald" />
          <TrendBars weeks={trends.weeklyVolumeTrend} valueKey="volume" label={`Load Volume Trend (${unit})`} accent="violet" />
        </div>
      </Panel>

      <Panel title="Goal Progress" subtitle="Profile body-weight target if available.">
        {trends.bodyWeightTrend.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {trends.bodyWeightTrend.map((point) => (
              <MetricCard
                key={point.label}
                label={point.label}
                value={`${point.value.toLocaleString()} ${unit}`}
                helper={`${profile.goalMode} direction from profile`}
                accent={point.label === "Goal" ? "amber" : "cyan"}
              />
            ))}
          </div>
        ) : (
          <EmptyState>Body-weight trend appears after current and goal weight are added to Profile.</EmptyState>
        )}
      </Panel>
    </div>
  );
}

function HistoryTab({
  sessions,
  historyFilter,
  onHistoryFilterChange,
  unit,
}: {
  sessions: NormalizedWorkoutLog[];
  historyFilter: HistoryFilter;
  onHistoryFilterChange: (filter: HistoryFilter) => void;
  unit: "lb" | "kg";
}) {
  return (
    <Panel
      title="History"
      subtitle="Session-level training history built from workout logs, or grouped exercise stats when workout logs are missing."
      action={
        <div className="flex max-w-full gap-2 overflow-x-auto pb-1">
          {HISTORY_FILTERS.map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => onHistoryFilterChange(filter)}
              className={`shrink-0 rounded-full border px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] transition ${
                historyFilter === filter
                  ? "border-cyan-300/40 bg-cyan-300/12 text-cyan-100"
                  : "border-white/10 bg-white/[0.04] text-slate-400 hover:bg-white/[0.08]"
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      }
    >
      {sessions.length > 0 ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {sessions.map((session) => (
            <HistoryCard key={session.id} session={session} unit={unit} />
          ))}
        </div>
      ) : (
        <EmptyState>No sessions match this filter yet.</EmptyState>
      )}
    </Panel>
  );
}
