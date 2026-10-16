"use client";

import Link from "next/link";
import { type ReactNode, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { planningSnapshot, subscribePlanning } from "@/lib/planning/store";
import { readStatsRecord, readStatsWorkoutLogs, readStatsGoalTargets, readStatsPlanContext, mergeStatsExerciseEntries, readStatsRecoveryReports, readStatsJourneyFoundations, readStatsBodyWeights, type StatsRecoveryReport } from "@/lib/planning/statsSource";
import { captureWorkoutHistoryRecovery } from "@/lib/planning/workoutHistoryRecovery";
import WorkoutHistoryReviewNotice from "@/components/dashboard/WorkoutHistoryReviewNotice";
import StatsRecoveryReports from "@/components/dashboard/StatsRecoveryReports";
import StatsUnitWorkload from "@/components/dashboard/StatsUnitWorkload";
import { unitWorkloadSummary } from "@/lib/planning/unitWorkload";
import { bestPositiveStatsMetric, mostTrainedStatsRegion, statsRecordedTimestamp, statsWeekBounds, statsHistoryIncludes, statsCurrentStreak, statsExerciseRecords, statsSetDistribution, statsTargetStatus, statsExerciseMetrics, statsWorkoutTotals, statsExerciseClassification, statsCompletedSessions } from "@/lib/planning/statsEvidence";
import { WORKOUT_LOAD_UNIT_UNKNOWN, WORKOUT_VOLUME_UNIT_UNKNOWN, formatRecordedWorkoutLoad, workoutLoadInPounds } from "@/lib/planning/loadUnitEvidence";
import { localDate } from "@/lib/planning/dates";
import { workoutSetCount } from "@/lib/planning/history";
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

type MomentumZone = ReturnType<typeof statsTargetStatus>;

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
  weeklySetGoal: number | null;
  sessionsPerWeek: number | null;
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
  weightUnit?: "lb" | "kg";
  recordedLoadInPounds: number | null;
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
  weeklyGoal: number | null;
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
  weeklyReps: number;
  weeklyVolume: number;
  lifetimeSets: number;
  lifetimeVolume: number;
  sharePercent: number;
  lastTrained: string;
  lastTimestamp: number | null;
  status: string;
};

type PatternStat = {
  label: string;
  weeklySets: number;
  lifetimeSets: number;
  volume: number;
  sharePercent: number;
};

type PRCard = {
  recorded: boolean;
  label: string;
  exercise: string;
  value: string;
  date: string;
  pattern: string;
  suggestion: string;
};

type StrengthCard = {
  id: string;
  label: string;
  currentBest: string;
  loadDate: string;
  bestReps: string;
  repsDate: string;
};

type RecoveryStats = StatsRecoveryReport;

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
  foundations: ReturnType<typeof readStatsJourneyFoundations>;
  recovery: RecoveryStats;
  excludedEntries: number;
  profile: ProfileSnapshot;
  favorites: string[];
  exerciseStats: NormalizedExerciseStat[];
  workoutLogs: NormalizedWorkoutLog[];
  loadedAtLabel: string;
  reportedAt: number;
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



const EXERCISE_STAT_KEYS = [
  "soundFitnessExerciseStats",
  "soundFitnessExerciseLibraryStats",
  "soundFitness.exerciseLibrary.stats",
];

const FAVORITE_KEYS = [
  "soundFitnessFavorites",
  "soundFitnessExerciseFavorites",
  "soundFitness.exerciseLibrary.favorites",
];

const BODY_REGION_ORDER = ["Chest", "Back", "Shoulders", "Arms", "Core", "Glutes", "Quads", "Hamstrings", "Calves", "Neck / Traps"];

const ZONE_STYLES: Record<
  MomentumZone,
  { hex: string; text: string; border: string; bg: string }
> = {
  "No sets": {
    hex: "#38bdf8",
    text: "text-sky-200",
    border: "border-sky-300/25",
    bg: "bg-sky-400/10",
  },
  "Below target": {
    hex: "#2dd4bf",
    text: "text-teal-200",
    border: "border-teal-300/25",
    bg: "bg-teal-400/10",
  },
  "Target met": {
    hex: "#fbbf24",
    text: "text-amber-200",
    border: "border-amber-300/25",
    bg: "bg-amber-400/10",
  },
  "Above target": {
    hex: "#f43f5e",
    text: "text-rose-200",
    border: "border-rose-300/25",
    bg: "bg-rose-400/10",
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

const readLocalValue = readStatsRecord;

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

const getWeekBounds = statsWeekBounds;

const getTimestamp = statsRecordedTimestamp;

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

  return `This week: ${formatter.format(start)}-${formatter.format(end)}`;
};

const includesAny = (source: string, needles: string[]) =>
  needles.some((needle) => source.includes(needle));

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
  if (!Number.isFinite(timestamp)) return null;
  const metrics = statsExerciseMetrics(record);
  if (!metrics || metrics.sets > 2147483647 || metrics.reps > 2147483647) return null;
  const { sets, reps, weight } = metrics;
  const { bodyPart, pattern } = statsExerciseClassification(record);

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
    ...(record.weightUnit === "lb" || record.weightUnit === "kg" ? { weightUnit: record.weightUnit } : {}),
    recordedLoadInPounds: ["weight", "load", "loadValue"].some(key => record[key] != null && !(typeof record[key] === "string" && !(record[key] as string).trim())) ? workoutLoadInPounds({ ...record, weight }) : null,
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
  if (!Number.isFinite(timestamp)) return null;
  const exerciseItems = coerceArray(record.exercises ?? record.items ?? record.entries);
  const normalizedExercises = exerciseItems
    .map((exercise, exerciseIndex) => normalizeExerciseStat(exercise, exerciseIndex))
    .filter((exercise): exercise is NormalizedExerciseStat => Boolean(exercise));
  if (normalizedExercises.length !== exerciseItems.length) return null;
  if (!normalizedExercises.some(exercise => workoutSetCount(exercise.sets) > 0)) return null;

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

  const totals = statsWorkoutTotals(record, normalizedExercises);
  if (!totals) return null;
  const { totalSets, totalReps, totalVolume } = totals;

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
      !normalized.includes("no active") &&
      !normalized.includes("not reported") &&
      !normalized.startsWith("review ")
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
  const targets = readStatsGoalTargets();
  const weights = readStatsBodyWeights();
  const sessionsPerWeek = targets.weeklySessions;
  const weeklySetGoal = targets.weeklySets;
  const preferredUnitRaw =
    getString(profile, ["preferredWeightUnit", "units", "preferredUnit"]) ||
    getString(appPersonalization, ["units", "preferredUnitSystem"]);
  const context = readStatsPlanContext();

  return {
    anatomyBackground: getString(appPersonalization, ["anatomyBackground"], "Dark Grid"),
    currentPhase: context.currentPhase,
    currentPlan: context.currentPlan,
    currentWeight: weights.currentWeight ?? 0,
    displayName: getString(profile, ["displayName", "name", "firstName"], "Member"),
    equipment: getStringArray(profile, ["equipment", "availableEquipment"]).slice(0, 6),
    primaryGoal: context.primaryGoal,
    goalMode: getString(profile, ["goalMode", "bodyGoalMode"], "Not set"),
    limitationCount: getLimitationCount(profile),
    memberType: getString(profile, ["memberType", "accountType"], "Active Member"),
    planDirection: context.planDirection,
    profileImage: getString(profile, ["profileImage", "avatar", "avatarUrl", "photoUrl"]),
    trainingAge: getString(profile, ["trainingAge", "memberType"], "Training age not set"),
    weeklySetGoal,
    sessionsPerWeek,
    goalWeight: weights.goalWeight ?? 0,
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
  const savedWorkouts = readStatsWorkoutLogs();
  const savedExercises = mergeStatsExerciseEntries(readFirstArray(EXERCISE_STAT_KEYS), savedWorkouts);
  const exerciseStats = savedExercises
    .map((item, index) => normalizeExerciseStat(item, index))
    .filter((item): item is NormalizedExerciseStat => Boolean(item))
    .sort((a, b) => b.timestamp - a.timestamp);

  const workoutLogs = statsCompletedSessions(savedWorkouts
    .map((item, index) => normalizeWorkoutLog(item, index))
    .filter((item): item is NormalizedWorkoutLog => Boolean(item))
    .sort((a, b) => b.timestamp - a.timestamp));

  const profile = normalizeProfile(readLocalValue("soundFitnessProfile"));
  const favorites = normalizeFavorites(readFirstArray(FAVORITE_KEYS));

  return {
    excludedEntries: savedExercises.length - exerciseStats.length + savedWorkouts.length - workoutLogs.length,
    reportedAt: Date.now(),
    foundations: readStatsJourneyFoundations(),
    recovery: readStatsRecoveryReports(),
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
  workoutLogs: NormalizedWorkoutLog[] = [],
): WeeklyStats {
  const { start, end } = getWeekBounds();
  const through = Math.min(end.getTime(), Date.now());
  const weekEntries = entries.filter((entry) => entry.timestamp >= start.getTime() && entry.timestamp <= through);
  const weeklyGoal = profile?.weeklySetGoal ?? null;
  const uniqueExerciseIds = new Set(weekEntries.map((entry) => entry.exerciseId));
  const completed = statsCompletedSessions(workoutLogs);
  const weeklyCompleted = completed.filter(log => log.timestamp >= start.getTime() && log.timestamp <= through);
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
    sessionsCompleted: weeklyCompleted.length,
    weeklyGoal,
    completionPercent: weeklyGoal === null ? 0 : (sets / weeklyGoal) * 100,
    currentStreak: statsCurrentStreak(completed.map(log => log.timestamp)),
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

  const mostImprovedExercise = WORKOUT_LOAD_UNIT_UNKNOWN;

  return {
    sets: entries.reduce((total, entry) => total + entry.sets, 0),
    reps: entries.reduce((total, entry) => total + entry.reps * entry.sets, 0),
    volume: entries.reduce((total, entry) => total + entry.volume, 0),
    sessionsCompleted: workoutLogs.length,
    exercisesTracked: new Set(entries.map((entry) => entry.exerciseId)).size,
    mostTrainedExercise,
    mostImprovedExercise,
  };
}

function getBodyPartStats(entries: NormalizedExerciseStat[]): BodyPartStat[] {
  const { start, end } = getWeekBounds();
  const through = Math.min(end.getTime(), Date.now());

  const labels = [...new Set([...BODY_REGION_ORDER, ...entries.map(entry => entry.bodyPart)])];
  return statsSetDistribution(labels.map((label) => {
    const relatedEntries = entries.filter((entry) => entry.bodyPart === label);
    const weeklyEntries = relatedEntries.filter(
      (entry) => entry.timestamp >= start.getTime() && entry.timestamp <= through,
    );
    const weeklySets = weeklyEntries.reduce((total, entry) => total + entry.sets, 0);
    const latest = relatedEntries[0] || null;

    return {
      label,
      weeklySets,
      weeklyReps: weeklyEntries.reduce((total, entry) => total + entry.reps * entry.sets, 0),
      weeklyVolume: weeklyEntries.reduce((total, entry) => total + entry.volume, 0),
      lifetimeSets: relatedEntries.reduce((total, entry) => total + entry.sets, 0),
      lifetimeVolume: relatedEntries.reduce((total, entry) => total + entry.volume, 0),
      lastTrained: latest ? formatShortDate(latest.timestamp) : "Not logged yet",
      lastTimestamp: latest?.timestamp || null,
      status: weeklySets > 0 ? "Sets recorded this week" : "No sets recorded this week",
    };
  }));
}

function getMovementPatternStats(entries: NormalizedExerciseStat[]): PatternStat[] {
  const { start, end } = getWeekBounds();
  const through = Math.min(end.getTime(), Date.now());
  const byPattern = groupBy(entries, (entry) => entry.pattern || "Movement");

  return statsSetDistribution(Object.entries(byPattern)
    .map(([label, patternEntries]) => {
      const weeklyEntries = patternEntries.filter(
        (entry) => entry.timestamp >= start.getTime() && entry.timestamp <= through,
      );
      const weeklySets = weeklyEntries.reduce((total, entry) => total + entry.sets, 0);

      return {
        label,
        weeklySets,
        lifetimeSets: patternEntries.reduce((total, entry) => total + entry.sets, 0),
        volume: patternEntries.reduce((total, entry) => total + entry.volume, 0),
      };
    })
    .sort((a, b) => b.weeklySets - a.weeklySets));
}

function getPRStats(
  entries: NormalizedExerciseStat[],
  displayUnit: "lb" | "kg",
): { cards: PRCard[]; opportunities: string[]; strengthCards: StrengthCard[] } {
  const mostReps = bestPositiveStatsMetric(entries, (entry) => entry.reps);
  const mostSetsWeek = getMostSetsInAnyWeek(entries);
  const plank = bestPositiveStatsMetric(
    entries.filter((entry) => entry.exerciseName.toLowerCase().includes("plank")),
    (entry) => entry.reps,
  );
  const pullUp = bestPositiveStatsMetric(
    entries.filter((entry) =>
      includesAny(entry.exerciseName.toLowerCase(), ["pull-up", "pull up", "chin-up", "chin up"]),
    ),
    (entry) => entry.reps,
  );
  const mobility = bestPositiveStatsMetric(
    entries.filter((entry) =>
      includesAny(entry.exerciseName.toLowerCase(), ["depth", "mobility", "sissy"]),
    ),
    (entry) => entry.reps,
  );

  const cards: PRCard[] = [
    createPRCard(
      "Heaviest Set",
      null,
      WORKOUT_LOAD_UNIT_UNKNOWN,
      "A comparable load record requires recorded workout units.",
    ),
    createPRCard(
      "Most Reps",
      mostReps,
      mostReps ? `${mostReps.reps} reps` : "Not logged yet",
      "Beat this with one extra controlled rep.",
    ),
    createPRCard(
      "Highest Estimated 1RM",
      null,
      WORKOUT_LOAD_UNIT_UNKNOWN,
      "Estimated 1RM is unavailable without recorded load units.",
    ),
    {
      label: "Most Volume In A Session",
      recorded: false,
      exercise: WORKOUT_LOAD_UNIT_UNKNOWN,
      value: WORKOUT_VOLUME_UNIT_UNKNOWN,
      date: "Unavailable",
      pattern: "Session",
      suggestion: "Load-volume comparisons require recorded workout units.",
    },
    {
      label: "Most Sets In A Week",
      recorded: mostSetsWeek > 0,
      exercise: "Weekly consistency",
      value: mostSetsWeek > 0 ? `${mostSetsWeek.toLocaleString()} sets` : "Not logged yet",
      date: mostSetsWeek > 0 ? "Best calendar week" : "Not logged yet",
      pattern: "Volume",
      suggestion: "A small bump above this can become the next milestone.",
    },
    createPRCard(
      "Most Plank Reps",
      plank,
      plank ? `${plank.reps} reps` : "Not logged yet",
      "Based on recorded reps; hold duration is not recorded here.",
    ),
    createPRCard(
      "Max Pull-Ups",
      pullUp,
      pullUp ? `${pullUp.reps} reps` : "Not logged yet",
      "Rows and pulldowns can support the next rep milestone.",
    ),
    createPRCard(
      "Most Mobility Reps",
      mobility,
      mobility ? `${mobility.reps} reps` : "Not logged yet",
      "Pair mobility exposure with controlled strength through range.",
    ),
  ];

  const strengthCards = statsExerciseRecords(entries).map(record => ({
    id: JSON.stringify([record.exerciseId, record.exerciseName]),
    label: record.exerciseName,
    currentBest: record.load ? formatRecordedWorkoutLoad(record.load as unknown as Record<string, unknown>, displayUnit) : WORKOUT_LOAD_UNIT_UNKNOWN,
    loadDate: record.load ? formatShortDate(record.load.timestamp) : "Unavailable",
    bestReps: record.reps ? record.reps.reps.toLocaleString() + " reps" : "Reps not recorded",
    repsDate: record.reps ? formatShortDate(record.reps.timestamp) : "Not logged yet",
  }));

  return {
    cards,
    opportunities: getPROpportunities(cards, entries),
    strengthCards,
  };
}

function getTrendStats(
  entries: NormalizedExerciseStat[],
  workoutLogs: NormalizedWorkoutLog[] = [],
  profile?: ProfileSnapshot,
): TrendStats {
  const weeks = Array.from({ length: 8 }, (_, index) => {
    const anchor = new Date();
    anchor.setDate(anchor.getDate() - (7 * (7 - index)));
    const { start, end } = getWeekBounds(anchor);
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
      sessions: weekLogs.length,
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

const getMomentumZone = statsTargetStatus;

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
  recorded: Boolean(entry),
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
    const key = localDate(getWeekBounds(date).start);
    weeks[key] = (weeks[key] || 0) + entry.sets;
    return weeks;
  }, {});

  return Math.max(0, ...Object.values(byWeek));
};

const getPROpportunities = (cards: PRCard[], entries: NormalizedExerciseStat[]) => {
  if (entries.length === 0) {
    return ["Log two or three sessions to reveal your first PR opportunities."];
  }

  const closeCard = cards.find((card) => card.recorded);


  return [
    closeCard
      ? `${closeCard.exercise} has a visible benchmark. Try to beat it by a small rep or quality improvement.`
      : "Your next logged best set will become the first benchmark.",
    "Load-volume comparisons are unavailable until workout load units are recorded.",
  ];
};

const filterHistorySessions = (
  sessions: NormalizedWorkoutLog[],
  filter: HistoryFilter,
) => {
  const now = new Date();
  return sessions.filter((session) => statsHistoryIncludes(session.timestamp, filter, now));
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
      "No recorded workload is available yet. Log the exercises you complete to build your training history.",
      "Log sets, reps, and load to build performance history. Add pain, soreness and sleep reports in Profile.",
    ];
  }

  const cold = bodyPartStats.filter(stat => stat.lifetimeSets > 0).sort((a, b) => a.weeklySets - b.weeklySets)[0];
  const push = patternStats
    .filter((stat) => includesAny(stat.label.toLowerCase(), ["press", "push"]))
    .reduce((total, stat) => total + stat.weeklySets, 0);
  const pull = patternStats
    .filter((stat) => includesAny(stat.label.toLowerCase(), ["row", "pull"]))
    .reduce((total, stat) => total + stat.weeklySets, 0);

  return [
    weekly.weeklyGoal === null
        ? "Save a weekly set target in Goals to compare it with your logged work."
        : weekly.completionPercent < 40
        ? `${weekly.sets} recorded sets are below 40% of your saved weekly target.`
        : `${weekly.sets} recorded sets are ${Math.round(weekly.completionPercent)}% of your saved weekly target.`,
    `${push} pressing/pushing sets and ${pull} pulling/rowing sets are recorded this week. Counts describe logged work; they do not determine the right balance for your plan.`,
    cold
      ? `${cold.label} has ${cold.weeklySets} recorded sets this week. Review your plan and Profile reports before choosing more work.`
      : "Add body-region information to your logs to compare recorded work.",
  ];
};

const getHeroCoachInsight = ({
  weekly,
  patternStats,
  lifetime,
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

  const push = patternStats
    .filter((stat) => includesAny(stat.label.toLowerCase(), ["press", "push"]))
    .reduce((total, stat) => total + stat.weeklySets, 0);
  const pull = patternStats
    .filter((stat) => includesAny(stat.label.toLowerCase(), ["row", "pull"]))
    .reduce((total, stat) => total + stat.weeklySets, 0);

  return `${weekly.sets} sets recorded this week: ${push} pressing/pushing and ${pull} pulling/rowing.${weekly.weeklyGoal === null ? " Save a weekly target in Goals to track progress." : ` ${Math.round(weekly.completionPercent)}% of your saved weekly target.`}`;
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
  valueLabel,
  accent = "cyan",
}: {
  label: string;
  value: number;
  max: number;
  helper?: string;
  valueLabel?: string;
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
          {valueLabel ?? `${Math.round(value).toLocaleString()} / ${Math.round(max).toLocaleString()}`}
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
}: {
  stat: BodyPartStat;
  unit: "lb" | "kg";
}) {
  const zone = ZONE_STYLES["Below target"];

  return (
    <article className={`rounded-[26px] border ${zone.border} ${zone.bg} p-4`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-black text-white">{stat.label}</h3>
          <p className={`mt-1 text-xs font-black uppercase tracking-[0.14em] ${zone.text}`}>
            {stat.weeklySets} sets this week
          </p>
        </div>

      </div>
      <div className="mt-4 space-y-2">
        <ProgressBar
          label="Share of recorded region sets"
          value={stat.sharePercent}
          valueLabel={stat.sharePercent.toFixed(1) + "%"}
          max={100}
          helper={stat.sharePercent.toFixed(1) + "% of this week's recorded region sets"}
          accent="cyan"
        />
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
            <p className="text-slate-500">Weight Volume</p>
            <p className="mt-1 font-black text-white">
              {WORKOUT_VOLUME_UNIT_UNKNOWN}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
            <p className="text-slate-500">Last Trained</p>
            <p className="mt-1 font-black text-white">{stat.lastTrained}</p>
          </div>
        </div>
        <p className="text-xs text-slate-400">
          {stat.status}
        </p>
      </div>
    </article>
  );
}

function StrengthProgressCard({ card }: { card: StrengthCard }) {
  return (
    <article className="rounded-[26px] border border-white/10 bg-white/[0.04] p-4">
      <h3 className="text-lg font-black text-white">{card.label}</h3>
      <p className="mt-4 text-xs text-slate-400">Highest recorded load</p>
      <p className="mt-1 text-2xl font-black text-cyan-100">{card.currentBest}</p>
      <p className="mt-1 text-xs text-slate-500">Logged: {card.loadDate}</p>
      <p className="mt-4 text-xs text-slate-400">Most recorded reps in a set</p>
      <p className="mt-1 text-xl font-black text-amber-100">{card.bestReps}</p>
      <p className="mt-1 text-xs text-slate-500">Logged: {card.repsDate}</p>
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
        <MetricMini label="Volume" value={WORKOUT_VOLUME_UNIT_UNKNOWN} />
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
  const readinessZone = weekly.weeklyGoal === null ? "No sets" : getMomentumZone(weekly.completionPercent);
  const readinessStyle = ZONE_STYLES[readinessZone];
  const mostTrainedBodyPart = mostTrainedStatsRegion(bodyPartStats);
  const recentWorkout = historySessions[0];
  const recordedRegions = bodyPartStats.filter(stat => stat.weeklySets > 0 && stat.label !== "Unclassified").length;
  const prCount = prCards.filter((card) => card.recorded).length;
  const trendWeeks = trends.weeklyVolumeTrend.filter((week) => week.sets > 0).length;
  const bodyGoal =
    profile.currentWeight && profile.goalWeight
      ? `Current ${profile.currentWeight.toLocaleString()} ${unit} -> Goal ${profile.goalWeight.toLocaleString()} ${unit}`
      : "Add body metrics";
  const backgroundClass = getHeroBackgroundClass(profile.anatomyBackground);

  const navMetrics: Record<StatsTabId, string> = {
    overview: "Weekly snapshot",
    volume: WORKOUT_VOLUME_UNIT_UNKNOWN,
    strength: `${prCount} PRs`,
    "body-map": `${recordedRegions} regions logged`,
    prs: `${prCount} records`,
    recovery: `${recovery.reportedCount}/3 reported`,
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
            {weekly.weeklyGoal === null ? <div className="grid h-32 w-32 shrink-0 place-items-center rounded-full border border-white/10 p-4 text-center text-sm text-slate-300"><Link href={ROUTES.dashboard.goals} className="text-cyan-200 underline">Set weekly target</Link></div> : <MomentumRing
              percent={weekly.completionPercent}
              label="Set target progress"
              zone={readinessZone}
              size="lg"
            />}
            <div className="min-w-0">
              <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${readinessStyle.text}`}>
                {weekly.weeklyGoal === null ? "Target not set" : readinessZone}
              </p>
              <h2 className="mt-2 text-2xl font-black text-white">
                Training state
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                {coachInsight}
              </p>
              <p className="mt-2 text-xs text-slate-500">
                {weekly.dateRangeLabel} - {weekly.sets} sets{weekly.weeklyGoal === null ? " · Target not set" : ` / ${weekly.weeklyGoal} target`}
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <HeroMetricCard
              label="Weekly Sets"
              value={weekly.weeklyGoal === null ? String(weekly.sets) : `${weekly.sets} / ${weekly.weeklyGoal}`}
              helper={weekly.weeklyGoal === null ? "Set a weekly target in Goals" : `${Math.round(weekly.completionPercent)}% of saved target`}
              accent="cyan"
            />
            <HeroMetricCard
              label="Weekly Volume"
              value={WORKOUT_VOLUME_UNIT_UNKNOWN}
              helper={`${weekly.exercisesTrained} exercises trained`}
              accent="amber"
            />
            <HeroMetricCard
              label="Lifetime Volume"
              value={WORKOUT_VOLUME_UNIT_UNKNOWN}
              helper={`${lifetime.sets.toLocaleString()} lifetime sets`}
              accent="emerald"
            />
            <HeroMetricCard
              label="Workout Streak"
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
  useSyncExternalStore(subscribePlanning, planningSnapshot, planningSnapshot);
  const historyRecovery = captureWorkoutHistoryRecovery();
  const [activeTab, setActiveTab] = useState<StatsTabId>("overview");
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>("This week");
  const [snapshot, setSnapshot] = useState<AppStatsSnapshot>(() => ({
    foundations: readStatsJourneyFoundations(),
    recovery: readStatsRecoveryReports(),
    excludedEntries: 0,
    profile: normalizeProfile(null),
    favorites: [],
    exerciseStats: [],
    workoutLogs: [],
    loadedAtLabel: "Not loaded yet",
    reportedAt: 0,
  }));

  useEffect(() => {
    let active = true;
    const syncStats = () => { if (active && !captureWorkoutHistoryRecovery().issues.length) setSnapshot(getStatsFromLocalStorage()); };

    syncStats();
    window.addEventListener("storage", syncStats);
    window.addEventListener("focus", syncStats);
    document.addEventListener("visibilitychange", syncStats);
    const timer = window.setInterval(syncStats, 60000);

    const unsubscribe = subscribePlanning(syncStats);
    return () => { active = false; window.clearInterval(timer); window.removeEventListener("storage", syncStats); window.removeEventListener("focus", syncStats); document.removeEventListener("visibilitychange", syncStats); unsubscribe(); };
  }, []);

  const weekly = useMemo(
    () => getWeeklyStats(snapshot.exerciseStats, snapshot.profile, snapshot.workoutLogs),
    [snapshot.exerciseStats, snapshot.profile, snapshot.workoutLogs],
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
    () => getPRStats(snapshot.exerciseStats, snapshot.profile.preferredUnit),
    [snapshot.exerciseStats, snapshot.profile.preferredUnit],
  );
  const recovery = snapshot.recovery;
  const unitWorkload = useMemo(() => {
    const now = new Date(snapshot.reportedAt);
    return { weekly: unitWorkloadSummary(snapshot.exerciseStats, "This week", now), lifetime: unitWorkloadSummary(snapshot.exerciseStats, "Lifetime", now) };
  }, [snapshot.exerciseStats, snapshot.reportedAt]);
  const trends = useMemo(
    () => getTrendStats(snapshot.exerciseStats, snapshot.workoutLogs, snapshot.profile),
    [snapshot.exerciseStats, snapshot.workoutLogs, snapshot.profile],
  );
  const historySessions = snapshot.workoutLogs;
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
      goals: snapshot.foundations.goals,
      performance: getJourneyCompletion(
        lifetime.sessionsCompleted,
        false, // Load volume cannot establish progress without recorded units.
        prStats.cards.filter(card => card.recorded).length,
        weekly.exercisesTrained,
      ),
      profile: snapshot.foundations.profile,
      recovery: getJourneyCompletion(
        recovery.pain !== null,
        recovery.soreness !== null,
        recovery.sleep !== null,
      ),
      training: getJourneyCompletion(
        weekly.sets,
        weekly.sessionsCompleted,
        snapshot.profile.weeklySetGoal,
        snapshot.profile.currentPlan,
        snapshot.favorites,
      ),
    }),
    [lifetime, prStats, recovery, snapshot.favorites, snapshot.profile, snapshot.foundations, weekly],
  );
  const handleHeroTabSelect = (tab: StatsTabId) => {
    setActiveTab(tab);
    window.requestAnimationFrame(() => {
      document
        .getElementById("stats-command-center-content")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  if (historyRecovery.issues.length) return <WorkoutHistoryReviewNotice area="Workout Stats reporting" issues={historyRecovery.issues} />;
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_10%_0%,rgba(34,211,238,0.18),transparent_34%),radial-gradient(circle_at_85%_8%,rgba(251,191,36,0.16),transparent_30%),radial-gradient(circle_at_50%_70%,rgba(59,130,246,0.12),transparent_38%),linear-gradient(180deg,#020617_0%,#0f172a_48%,#020617_100%)] text-white">
      <section className="mx-auto w-full max-w-[1440px] space-y-5 px-3 py-5 sm:px-5 lg:px-8">
        <p role="status" className="rounded-2xl border border-amber-300/20 p-4 text-sm text-amber-100">Strength load records use recorded lb/kg units for each exercise. Older loads without units are excluded from load comparisons. The load-volume panel reports its data coverage; other volume summaries, estimated 1RM and load trends remain unavailable. History preserves original values; sets, reps and workout counts remain available. Profile body-weight units do not establish workout load units.</p>
        {snapshot.excludedEntries > 0 && <p role="status" className="rounded-2xl border border-amber-300/20 p-4 text-sm text-amber-100">{snapshot.excludedEntries} saved exercise or workout entries are excluded from Stats because their dates, recorded sets, numeric values, explicit load units or record shapes need review. Originals remain saved. <Link href={ROUTES.dashboard.sessionHistory} className="underline">Review workout history</Link> or export your planning backup above to inspect original exercise records.</p>}
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
          {activeTab === "overview" || activeTab === "volume" ? <StatsUnitWorkload reports={unitWorkload} unit={unit} /> : null}
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
            <StatsRecoveryReports reports={recovery} />
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
            trend={weekly.weeklyGoal === null ? "Target not set" : `${Math.round(weekly.completionPercent)}% of saved target`}
            accent="cyan"
          />
          <MetricCard
            label="Weekly Goal"
            value={weekly.weeklyGoal?.toLocaleString() ?? "Not set"}
            helper="From saved Goals"
            accent="blue"
          />
          <MetricCard
            label="Lifetime Volume"
            value={WORKOUT_VOLUME_UNIT_UNKNOWN}
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
            helper="Saved workout completions"
            accent="cyan"
          />
          <MetricCard
            label="Most Trained Exercise"
            value={lifetime.mostTrainedExercise}
            helper="Highest total logged sets"
            accent="amber"
          />
          <MetricCard
            label="Largest Recorded Volume Increase"
            value={lifetime.mostImprovedExercise}
            helper="Requires recorded workout load units"
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
            {weekly.weeklyGoal === null ? <p className="rounded-2xl border border-white/10 p-4 text-sm text-slate-300">{weekly.sets} recorded sets. <Link href={ROUTES.dashboard.goals} className="text-cyan-200 underline">Set your weekly target in Goals</Link> to track target progress.</p> : <ProgressBar
              label="Weekly Volume Progress"
              value={weekly.sets}
              max={weekly.weeklyGoal}
              helper={`${weekly.reps.toLocaleString()} reps - ${WORKOUT_VOLUME_UNIT_UNKNOWN} volume`}
              accent="cyan"
            />}
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
                  value={stat.sharePercent}
                  valueLabel={stat.sharePercent.toFixed(1) + "%"}
                  max={100}
                  helper={`${stat.weeklySets} recorded sets - ${stat.sharePercent.toFixed(1)}% of recorded region sets - ${WORKOUT_VOLUME_UNIT_UNKNOWN}`}
                  accent="amber"
                />
              ))}
          </div>
        </div>
      </Panel>

      <Panel title="Movement Pattern Breakdown" subtitle="Recorded movement-pattern labels. Missing or conflicting metadata stays Unclassified.">
        {patternStats.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {patternStats.slice(0, 12).map((stat) => (
              <ProgressBar
                key={stat.label}
                label={stat.label}
                value={stat.sharePercent}
                valueLabel={stat.sharePercent.toFixed(1) + "%"}
                max={100}
                helper={`${stat.weeklySets} recorded sets - ${stat.sharePercent.toFixed(1)}% of recorded pattern sets - ${stat.lifetimeSets.toLocaleString()} lifetime sets - ${WORKOUT_VOLUME_UNIT_UNKNOWN}`}
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
      subtitle="Separate records for each logged exercise. Load records compare only saved lb/kg values; older unknown-unit loads are excluded. Converted values are rounded for display. Load and rep records may come from different sets."
    >
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {strengthCards.length === 0 && <p className="text-sm text-slate-400">No recorded exercise performances yet. Complete a workout with recorded loads or reps to see your records.</p>}
        {strengthCards.map((card) => (
          <StrengthProgressCard key={card.id} card={card} />
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
      subtitle="Recorded sets, load volume and last training dates by saved region. Broad labels are preserved; missing or conflicting metadata stays Unclassified."
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
          <TrendBars weeks={trends.weeklyVolumeTrend} valueKey="sets" label="Weekly Sets Trend" accent="cyan" />
          <TrendBars weeks={trends.consistencyTrend} valueKey="sessions" label="Consistency Trend" accent="emerald" />
          <EmptyState>Load-volume and estimated 1RM trends require recorded workout load units.</EmptyState>
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
      subtitle="Saved workout completions. Standalone exercise records contribute to workload totals and keep their own dates."
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
