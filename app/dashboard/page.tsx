"use client";

import Image from "next/image";
import Link from "next/link";
import {
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import DashboardCalendar, {
  type DashboardCalendarItem,
} from "@/components/dashboard/DashboardCalendar";
import DashboardCharts from "@/components/dashboard/DashboardCharts";
import DashboardTabIcon from "@/components/dashboard/DashboardTabIcon";
import {
  SoundLogoAchievementBadge,
  type AchievementBadgeItem,
} from "@/components/dashboard/SoundAchievementBadgeRow";
import {
  loadWorkoutLogEntriesWithFallback,
  loadWorkoutTemplatesWithFallback,
  syncLocalWorkoutLogsToSupabase,
  syncLocalWorkoutTemplatesToSupabase,
} from "@/lib/data/workoutPersistence";
import {
  readActiveWorkoutBuilderSessionTemplate,
  type LocalWorkoutBuilderSessionTemplate,
  type LocalWorkoutBuilderTemplate,
  writeActiveWorkoutBuilderSessionTemplate,
} from "@/lib/localData/workoutBuilderData";
import {
  prependExerciseStats,
  subscribeToLocalWorkoutData,
} from "@/lib/localData/workoutData";
import {
  SOUND_FITNESS_PROFILE_STORAGE_KEY,
  SOUND_FITNESS_PROFILE_UPDATED_EVENT,
  asRecord,
  safeJsonParse,
} from "@/lib/profile-storage";
import { ROUTES } from "@/lib/routes";
import { supabase } from "@/lib/supabaseClient";
import {
  exerciseLibrary,
  type Exercise,
} from "@/lib/training/exerciseLibrary";
import type { LocalExerciseStatEntry } from "@/types";

type SourceResult = {
  source: "supabase" | "localStorage";
  error: string | null;
};

type UploadOptionId = "photo" | "screenshot" | "file";

type LibraryReferenceType =
  | "education"
  | "exercise"
  | "mobility"
  | "nutrition"
  | "performance-test"
  | "recovery";

type ManualLibraryReference = {
  metadata: {
    body?: string;
    equipment?: string;
    goal?: string;
    image?: string;
    level?: string;
    movementPattern?: string;
    muscles?: string;
    tags?: string[];
  };
  referenceId: string;
  referenceTitle: string;
  referenceType: LibraryReferenceType;
  sourceLibrary: string;
};

type ManualStatsDraft = {
  dateTime: string;
  load: string;
  notes: string;
  reps: string;
  rpe: string;
  sessionLabel: string;
  sets: string;
};

type ManualStatsLogEntry = ManualStatsDraft & {
  id: string;
  loggedAt: string;
  references: ManualLibraryReference[];
};

const WORKOUT_SYNC_LAST_SYNCED_KEY = "soundFitnessWorkoutDataLastSyncedAt";
const MANUAL_STATS_LOG_STORAGE_KEY = "soundFitnessManualStatsLogs";
const DASHBOARD_GOALS_STORAGE_KEY = "soundFitnessGoals";
const DASHBOARD_PROFILE_VISITED_KEY = "soundFitnessDashboardProfileVisited";
const DASHBOARD_GOALS_VISITED_KEY = "soundFitnessDashboardGoalsVisited";
const EXERCISE_LIBRARY_FAVORITES_STORAGE_KEY =
  "sound-fitness:exercise-library:favorites";
const GLOBAL_DASHBOARD_FAVORITES_STORAGE_KEY = "soundFitnessFavorites";

const dashboardFavoriteLibrarySources = [
  {
    helper: "Meal, grocery, and fuel favorites.",
    href: ROUTES.nutrition.home,
    id: "nutrition",
    label: "Nutrition",
    storageKey: "soundFitnessNutritionLibrary",
  },
  {
    helper: "Cooldown and readiness favorites.",
    href: ROUTES.dashboard.recovery,
    id: "recovery",
    label: "Recovery",
    storageKey: "soundFitnessRecoveryLibrary",
  },
  {
    helper: "Mobility prep favorites.",
    href: ROUTES.dashboard.mobility,
    id: "mobility",
    label: "Mobility",
    storageKey: "soundFitnessMobilityLibrary",
  },
  {
    helper: "Power and conditioning favorites.",
    href: ROUTES.performance.home,
    id: "performance",
    label: "Performance",
    storageKey: "soundFitnessPerformanceLibrary",
  },
] as const;

const manualStatsFavoriteDashboardSources = [
  {
    helper: "Exercise Library favorites attach directly to manual stats.",
    href: ROUTES.workoutBuilder.exerciseLibrary,
    id: "workout",
    label: "Workout / Sessions",
    meta: "Exercise Library",
  },
  ...dashboardFavoriteLibrarySources.map((source) => ({
    helper: source.helper,
    href: source.href,
    id: source.id,
    label: source.label,
    meta: "Favorites",
  })),
] as const;

const dashboardUploadOptions: Array<{
  cta: string;
  description: string;
  href: string;
  id: UploadOptionId;
  label: string;
  meta: string;
}> = [
  {
    cta: "Upload Workout Screenshot",
    description: "Import a workout screenshot for later AI review and cleanup.",
    href: "/stats/add/upload?type=screenshot",
    id: "screenshot",
    label: "Screenshot",
    meta: "Screenshot",
  },
  {
    cta: "Upload Spreadsheet",
    description: "Bring in Excel or CSV files from trackers, exports, or templates.",
    href: "/stats/add/upload?type=file",
    id: "file",
    label: "Excel / CSV",
    meta: "Spreadsheet",
  },
  {
    cta: "Upload Progress or Meal Photo",
    description: "Send a progress, meal, or body-context photo into the import flow.",
    href: "/stats/add/upload?type=photo",
    id: "photo",
    label: "Photo",
    meta: "Photo",
  },
];

const getManualDateTimeInputValue = () => {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
};

const getManualLogIsoDate = (value: string) => {
  if (!value) return new Date().toISOString();

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return new Date().toISOString();

  return date.toISOString();
};

const readManualStatsLogEntries = (): ManualStatsLogEntry[] => {
  if (typeof window === "undefined") return [];

  const saved = window.localStorage.getItem(MANUAL_STATS_LOG_STORAGE_KEY);
  if (!saved) return [];

  try {
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? (parsed as ManualStatsLogEntry[]) : [];
  } catch {
    return [];
  }
};

const writeManualStatsLogEntries = (entries: ManualStatsLogEntry[]) => {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(
    MANUAL_STATS_LOG_STORAGE_KEY,
    JSON.stringify(entries),
  );
};

const readStringArrayFromStorage = (key: string) => {
  if (typeof window === "undefined") return [];

  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || "[]");
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === "string")
      : [];
  } catch {
    return [];
  }
};

const readDashboardLibraryFavoriteIds = (
  source: (typeof dashboardFavoriteLibrarySources)[number],
) => {
  if (typeof window === "undefined") return [];

  let namespacedFavorites: string[] = [];

  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(source.storageKey) || "{}",
    );
    const favorites = asRecord(parsed).favorites;
    namespacedFavorites = Array.isArray(favorites)
      ? favorites.filter((value): value is string => typeof value === "string")
      : [];
  } catch {
    namespacedFavorites = [];
  }

  const globalFavorites = readStringArrayFromStorage(
    GLOBAL_DASHBOARD_FAVORITES_STORAGE_KEY,
  )
    .filter((value) => value.startsWith(`${source.id}:`))
    .map((value) => value.replace(`${source.id}:`, ""));

  return Array.from(new Set([...namespacedFavorites, ...globalFavorites]));
};

const formatFavoriteIdLabel = (value: string) =>
  value
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const buildExerciseReference = (exercise: Exercise): ManualLibraryReference => ({
  metadata: {
    body: exercise.body,
    equipment: exercise.equipment,
    goal: exercise.goal,
    image: exercise.image,
    level: exercise.level,
    movementPattern: exercise.pattern,
    muscles: exercise.muscles,
    tags: [
      exercise.body,
      exercise.pattern,
      exercise.equipment,
      exercise.goal,
      exercise.level,
    ].filter(Boolean),
  },
  referenceId: exercise.id,
  referenceTitle: exercise.name,
  referenceType: "exercise",
  sourceLibrary: "Exercise Library",
});

const formatDashboardDate = (value?: string) => {
  if (!value) return "No workout logged yet";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently logged";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
};

const formatCompactDateTime = (value?: string) => {
  if (!value) return "Not started";

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
  if (source === "supabase") return "Account-backed";

  return error && !error.includes("No authenticated Supabase user")
    ? "Backup retry"
    : "Browser backup";
};

const buildTemplateWorkoutHref = (templateId: string) =>
  `${ROUTES.dashboard.sessionWorkout}?template=${encodeURIComponent(
    templateId,
  )}`;

const getWorkoutTemplateIcon = (template: LocalWorkoutBuilderTemplate) => {
  const signature = template.exercises
    .map((exercise) =>
      [exercise.body, exercise.pattern, exercise.goal, exercise.equipment]
        .join(" ")
        .toLowerCase(),
    )
    .join(" ");

  if (signature.includes("leg") || signature.includes("lower")) return "🦵";
  if (signature.includes("push") || signature.includes("chest")) return "💪";
  if (signature.includes("pull") || signature.includes("back")) return "🔗";
  if (signature.includes("cardio") || signature.includes("conditioning")) return "⚡";
  if (signature.includes("mobility") || signature.includes("recovery")) return "🧘";

  return "🏋️";
};

const getWorkoutTemplateTag = (template: LocalWorkoutBuilderTemplate) =>
  template.exercises[0]?.body ||
  template.exercises[0]?.pattern ||
  template.exercises[0]?.goal ||
  "Custom";

const groupWorkoutDates = (entries: LocalExerciseStatEntry[]) =>
  Array.from(
    new Set(
      entries
        .filter((entry) => entry.source === "workout-session")
        .map((entry) => entry.date)
        .filter(Boolean),
    ),
  );

const toLoggedNumber = (value: string | number | null | undefined) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const clampDashboardPercent = (value: number) =>
  Math.max(0, Math.min(100, Math.round(value)));

const isDashboardValueComplete = (value: unknown): boolean => {
  if (Array.isArray(value)) return value.some(isDashboardValueComplete);
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "boolean") return value;
  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).some(
      isDashboardValueComplete,
    );
  }

  return false;
};

const getDashboardCompletionFromValues = (values: unknown[]) => {
  if (!values.length) return 0;

  return clampDashboardPercent(
    (values.filter(isDashboardValueComplete).length / values.length) * 100,
  );
};

const readDashboardText = (...values: unknown[]) => {
  const found = values.find(
    (value) => typeof value === "string" && value.trim().length > 0,
  );

  return typeof found === "string" ? found.trim() : "";
};

const readDashboardLocalRecord = (key: string) => {
  if (typeof window === "undefined") return {};

  try {
    return asRecord(safeJsonParse(window.localStorage.getItem(key)));
  } catch {
    return {};
  }
};

const getDashboardProfileCompletion = (
  profile: Record<string, unknown>,
) => {
  const measurements = asRecord(profile.measurements);

  return getDashboardCompletionFromValues([
    profile.displayName,
    profile.birthday,
    profile.height,
    profile.currentWeight,
    measurements.weight,
    profile.waist || measurements.waist,
    profile.primaryGoal,
    profile.secondaryGoal,
    profile.goalMode,
    profile.sessionsPerWeek,
    profile.trainingAge,
    profile.sleepGoal,
    profile.occupation,
    profile.phone,
    profile.email,
  ]);
};

const getDashboardGoalsCompletion = (goals: Record<string, unknown>) =>
  getDashboardCompletionFromValues([
    goals.planDirections,
    goals.primaryGoal,
    goals.secondaryGoal,
    goals.goalMode,
    goals.goalDeadline,
    goals.goalMilestones,
    goals.goalPriorityRanking,
    goals.goalWeight || goals.currentWeight,
    goals.targetWeeklySessions,
    goals.targetWeeklySets,
    goals.targetProtein,
    goals.targetSteps || goals.stepsGoal,
    goals.targetSleep,
    goals.waterGoal,
    goals.benchmarkGoal,
    goals.motivationFocus,
    goals.planDirectionNotes,
  ]);

const getDashboardGoalFocus = (
  profile: Record<string, unknown>,
  goals: Record<string, unknown>,
) =>
  readDashboardText(
    Array.isArray(goals.planDirections) ? goals.planDirections[0] : "",
    goals.primaryGoal,
    goals.goalMode,
    profile.primaryGoal,
    profile.goalMode,
  );

const readDashboardFoundationProgress = (): DashboardFoundationProgress => {
  if (typeof window === "undefined") {
    return {
      goalFocus: "",
      goalsCompletion: 0,
      goalsVisited: false,
      profileCompletion: 0,
      profileVisited: false,
    };
  }

  const profile = readDashboardLocalRecord(SOUND_FITNESS_PROFILE_STORAGE_KEY);
  const goals = readDashboardLocalRecord(DASHBOARD_GOALS_STORAGE_KEY);

  return {
    goalFocus: getDashboardGoalFocus(profile, goals),
    goalsCompletion: getDashboardGoalsCompletion(goals),
    goalsVisited:
      window.localStorage.getItem(DASHBOARD_GOALS_VISITED_KEY) === "true",
    profileCompletion: getDashboardProfileCompletion(profile),
    profileVisited:
      window.localStorage.getItem(DASHBOARD_PROFILE_VISITED_KEY) === "true",
  };
};

const getDashboardPulseIndicatorTone = (
  percent: number,
): DashboardPulseIndicatorTone => {
  if (percent >= 80) {
    return {
      dotActive:
        "bg-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.72)]",
      dotInactive:
        "bg-emerald-300/80 shadow-[0_0_10px_rgba(52,211,153,0.46)]",
      motion: "water",
      outerActive: "border-emerald-100/42 ring-1 ring-emerald-200/38",
      outerInactive: "border-emerald-300/22 ring-1 ring-emerald-300/18",
      style: {
        "--profile-indicator-glow": "rgba(52,211,153,0.92)",
        "--profile-indicator-glow-dim": "rgba(52,211,153,0.46)",
        "--profile-indicator-glow-soft": "rgba(16,185,129,0.34)",
      } as DashboardPulseIndicatorStyle,
    };
  }

  if (percent >= 50) {
    return {
      dotActive: "bg-cyan-200 shadow-[0_0_12px_rgba(103,232,249,0.72)]",
      dotInactive:
        "bg-cyan-300/80 shadow-[0_0_10px_rgba(34,211,238,0.46)]",
      motion: "pulse",
      outerActive: "border-cyan-100/42 ring-1 ring-cyan-200/38",
      outerInactive: "border-cyan-300/22 ring-1 ring-cyan-300/18",
      style: {
        "--profile-indicator-glow": "rgba(103,232,249,0.92)",
        "--profile-indicator-glow-dim": "rgba(34,211,238,0.46)",
        "--profile-indicator-glow-soft": "rgba(34,211,238,0.34)",
      } as DashboardPulseIndicatorStyle,
    };
  }

  if (percent >= 25) {
    return {
      dotActive:
        "bg-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.72)]",
      dotInactive:
        "bg-amber-300/80 shadow-[0_0_10px_rgba(251,191,36,0.46)]",
      motion: "pulse",
      outerActive: "border-amber-100/42 ring-1 ring-amber-200/38",
      outerInactive: "border-amber-300/22 ring-1 ring-amber-300/18",
      style: {
        "--profile-indicator-glow": "rgba(251,191,36,0.92)",
        "--profile-indicator-glow-dim": "rgba(251,191,36,0.46)",
        "--profile-indicator-glow-soft": "rgba(245,158,11,0.34)",
      } as DashboardPulseIndicatorStyle,
    };
  }

  return {
    dotActive: "bg-rose-300 shadow-[0_0_12px_rgba(251,113,133,0.72)]",
    dotInactive:
      "bg-rose-300/80 shadow-[0_0_10px_rgba(251,113,133,0.46)]",
    motion: "pulse",
    outerActive: "border-rose-100/42 ring-1 ring-rose-200/38",
    outerInactive: "border-rose-300/22 ring-1 ring-rose-300/18",
    style: {
      "--profile-indicator-glow": "rgba(251,113,133,0.92)",
      "--profile-indicator-glow-dim": "rgba(251,113,133,0.46)",
      "--profile-indicator-glow-soft": "rgba(244,63,94,0.34)",
    } as DashboardPulseIndicatorStyle,
  };
};

const memberAreaCards = [
  {
    title: "Sessions",
    href: ROUTES.dashboard.sessions,
    text: "Workout command center, saved templates, history, and session tools.",
    label: "Primary",
  },
  {
    title: "Workout Builder",
    href: ROUTES.workoutBuilder.home,
    text: "Create templates, load saved workouts, and start custom sessions.",
    label: "Build",
  },
  {
    title: "My Plan",
    href: ROUTES.dashboard.myPlan,
    text: "Weekly plan outline and future program assignments.",
    label: "Plan",
  },
  {
    title: "Stats",
    href: ROUTES.dashboard.stats,
    text: "Exercise logs, recent sets, and performance trends.",
    label: "Progress",
  },
  {
    title: "Goals",
    href: ROUTES.dashboard.goals,
    text: "Plan direction, goal timeline, priorities, and milestones.",
    label: "Direction",
  },
  {
    title: "Video Review",
    href: ROUTES.dashboard.videoReview,
    text: "Submit form checks and link coach feedback to training.",
    label: "Coach",
  },
  {
    title: "Recovery",
    href: ROUTES.dashboard.recovery,
    text: "Mobility, recovery recommendations, and readiness work.",
    label: "Readiness",
  },
  {
    title: "Nutrition",
    href: ROUTES.nutrition.home,
    text: "Recipes, meal prep, grocery lists, and nutrition habits.",
    label: "Fuel",
  },
  {
    title: "Profile",
    href: ROUTES.dashboard.profile,
    text: "Personal details, body context, preferences, and account settings.",
    label: "Account",
  },
] as const;

type DashboardJourneyStepState = "active" | "complete" | "default" | "locked";

type DashboardJourneyStep = {
  completion?: number;
  href: string;
  icon: string;
  label: string;
  state: DashboardJourneyStepState;
};

type DashboardCardTone =
  | "amber"
  | "cyan"
  | "emerald"
  | "fuchsia"
  | "sky"
  | "violet";

type DashboardNavigationCard = {
  description: string;
  href: string;
  icon: string;
  journeySteps?: DashboardJourneyStep[];
  status: string;
  title: string;
  tone: DashboardCardTone;
};

type MasterJourneyNode = {
  href: string;
  icon: string;
  label: string;
  metric: string;
  state: DashboardJourneyStepState;
};

type DashboardFoundationProgress = {
  goalFocus: string;
  goalsCompletion: number;
  goalsVisited: boolean;
  profileCompletion: number;
  profileVisited: boolean;
};

type DashboardPulseIndicatorStyle = CSSProperties & {
  "--profile-indicator-glow": string;
  "--profile-indicator-glow-dim": string;
  "--profile-indicator-glow-soft": string;
};

type DashboardPulseIndicatorTone = {
  dotActive: string;
  dotInactive: string;
  motion: "pulse" | "water";
  outerActive: string;
  outerInactive: string;
  style: DashboardPulseIndicatorStyle;
};

type DashboardOrbitDirection = "left" | "right";

type DashboardPointerStartRef = {
  current: number | null;
};

type DashboardPointerMovedRef = {
  current: boolean;
};

type DashboardVerticalPointerStart = {
  x: number;
  y: number;
};

type DashboardProfileHubOrbitItem = {
  helper: string;
  href: string;
  icon: string;
  label: string;
  references: string[];
  stat: string;
  tone: string;
};

const DASHBOARD_HERO_ACHIEVEMENT_VISIBLE_DISTANCE = 3;

const dashboardHeroAchievementOrbitSlots = [
  { blur: 0, opacity: 1, rotateY: 0, scale: 1, x: 0, y: 0, zIndex: 42 },
  {
    blur: 0.2,
    opacity: 0.76,
    rotateY: -14,
    scale: 0.82,
    x: 225,
    y: 12,
    zIndex: 30,
  },
  {
    blur: 1.1,
    opacity: 0.34,
    rotateY: -28,
    scale: 0.62,
    x: 360,
    y: 28,
    zIndex: 16,
  },
  {
    blur: 2.1,
    opacity: 0.12,
    rotateY: -42,
    scale: 0.46,
    x: 480,
    y: 48,
    zIndex: 8,
  },
];

const dashboardNavigationCards: DashboardNavigationCard[] = [
  {
    title: "Workout / Sessions",
    href: ROUTES.dashboard.sessions,
    description: "Sessions, plans, builders, and training progression.",
    icon: "🏋️",
    tone: "cyan",
    status: "Primary",
    journeySteps: [
      {
        icon: "Dash",
        label: "Dashboard",
        href: ROUTES.dashboard.sessions,
        state: "complete",
      },
      {
        icon: "Plan",
        label: "My Plan",
        href: ROUTES.dashboard.myPlan,
        state: "default",
      },
      {
        icon: "Build",
        label: "Workout Builder",
        href: ROUTES.workoutBuilder.home,
        state: "active",
      },
      {
        icon: "Lib",
        label: "Exercise Library",
        href: ROUTES.workoutBuilder.exerciseLibrary,
        state: "default",
      },
    ],
  },
  {
    title: "Nutrition / Fuel",
    href: ROUTES.nutritionPortal.home,
    description: "Meals, hydration, grocery planning, and fuel tracking.",
    icon: "🍽️",
    tone: "emerald",
    status: "Fuel",
    journeySteps: [
      { icon: "🧭", label: "Overview", href: ROUTES.nutritionPortal.home, state: "complete" },
      { icon: "💧", label: "Hydrate", href: ROUTES.nutritionPortal.hydration, state: "active" },
      { icon: "🍽️", label: "Meals", href: ROUTES.nutritionPortal.meals, state: "default" },
      { icon: "🛒", label: "Grocery", href: ROUTES.nutritionPortal.grocery, state: "default" },
      { icon: "🔥", label: "Calories", href: "/nutrition/calories", state: "default" },
      { icon: "📈", label: "Trends", href: "/nutrition/progress", state: "default" },
      { icon: "🧠", label: "Insights", href: "/nutrition/insights", state: "locked" },
    ],
  },
  {
    title: "Recovery",
    href: ROUTES.dashboard.recovery,
    description: "Readiness, mobility, soreness, and recovery support.",
    icon: "💧",
    tone: "sky",
    status: "Recovery",
  },
  {
    title: "Performance",
    href: ROUTES.performance.home,
    description: "Power, conditioning, capacity, and athletic development.",
    icon: "⚡",
    tone: "amber",
    status: "Athletic",
    journeySteps: [
      { icon: "🧭", label: "Overview", href: ROUTES.performance.home, state: "complete" },
      { icon: "⚡", label: "Power", href: ROUTES.dashboard.performance, state: "active" },
      { icon: "🫀", label: "Cardio", href: "/performance#cardio", state: "default" },
      { icon: "🏃", label: "Run", href: "/performance#running", state: "default" },
      { icon: "🧪", label: "Tests", href: "/performance#tests", state: "default" },
      { icon: "📈", label: "Metrics", href: ROUTES.dashboard.stats, state: "default" },
      { icon: "🧠", label: "Insights", href: ROUTES.dashboard.insights, state: "locked" },
    ],
  },
  {
    title: "Education",
    href: ROUTES.learning.home,
    description: "Technique lessons, coaching concepts, and app guidance.",
    icon: "ED",
    tone: "sky",
    status: "Learning",
    journeySteps: [
      { icon: "ED", label: "Lessons", href: ROUTES.learning.home, state: "active" },
      { icon: "Form", label: "Technique", href: ROUTES.learning.home, state: "default" },
      { icon: "Logic", label: "Training Logic", href: ROUTES.learning.home, state: "default" },
      { icon: "App", label: "App Guide", href: ROUTES.learning.home, state: "default" },
    ],
  },
  {
    title: "Sound World",
    href: ROUTES.soundworld.home,
    description: "Community, rewards, social loops, and Sound Fitness world-building.",
    icon: "SW",
    tone: "fuchsia",
    status: "Community",
    journeySteps: [
      { icon: "SW", label: "World Hub", href: ROUTES.soundworld.home, state: "active" },
      { icon: "Feed", label: "Social", href: ROUTES.dashboard.social, state: "default" },
      { icon: "Post", label: "Post", href: ROUTES.dashboard.socialPost, state: "default" },
      { icon: "Trophy", label: "Achievements", href: ROUTES.dashboard.achievements, state: "default" },
    ],
  },
  {
    title: "Stats",
    href: ROUTES.dashboard.stats,
    description: "Charts, trends, recent activity, and body metrics.",
    icon: "📈",
    tone: "sky",
    status: "Metrics",
  },
  {
    title: "Goals",
    href: ROUTES.dashboard.goals,
    description: "Plan direction, daily targets, milestones, and motivation.",
    icon: "🎯",
    tone: "violet",
    status: "Planning",
  },
  {
    title: "Calendar",
    href: ROUTES.dashboard.calendar,
    description: "Training calendar, scheduled sessions, and weekly commitments.",
    icon: "Cal",
    tone: "sky",
    status: "Schedule",
  },
  {
    title: "Appointments",
    href: ROUTES.dashboard.sessionBooking,
    description: "Booking requests, coach availability, and upcoming sessions.",
    icon: "Appt",
    tone: "cyan",
    status: "Booking",
  },
  {
    title: "Insights",
    href: ROUTES.dashboard.insights,
    description: "AI coaching context, trends, and progression signals.",
    icon: "🧠",
    tone: "cyan",
    status: "AI",
  },
  {
    title: "Achievements",
    href: ROUTES.dashboard.achievements,
    description: "Badges, streaks, rewards, and locked progression tiers.",
    icon: "🏆",
    tone: "amber",
    status: "Rewards",
  },
  {
    title: "Messages",
    href: ROUTES.dashboard.coachMessaging,
    description: "Coach communication, check-ins, and support threads.",
    icon: "💬",
    tone: "fuchsia",
    status: "Coach",
  },
  {
    title: "Packages",
    href: ROUTES.dashboard.payments,
    description: "Session packages, remaining visits, payment status, and renewals.",
    icon: "Pkg",
    tone: "violet",
    status: "Account",
  },
] as const;

const dashboardSystemCardOrder = [
  "Goals",
  "Insights",
  "Stats",
  "Calendar",
  "Appointments",
  "Messages",
  "Packages",
  "Achievements",
];

const dashboardSystemCardTitles = new Set(dashboardSystemCardOrder);

const dashboardCommandCenterCards = dashboardNavigationCards.filter(
  (card) => !dashboardSystemCardTitles.has(card.title),
);

const dashboardSystemCards = dashboardNavigationCards
  .filter((card) => dashboardSystemCardTitles.has(card.title))
  .sort(
    (left, right) =>
      dashboardSystemCardOrder.indexOf(left.title) -
      dashboardSystemCardOrder.indexOf(right.title),
  );

const dashboardToneStyles = {
  amber: {
    border: "hover:border-amber-300/45",
    glow: "hover:shadow-[0_0_34px_rgba(251,191,36,0.13)]",
    icon: "bg-amber-300/12 text-amber-100",
    line: "bg-amber-300/60",
  },
  cyan: {
    border: "hover:border-cyan-300/45",
    glow: "hover:shadow-[0_0_34px_rgba(34,211,238,0.15)]",
    icon: "bg-cyan-300/12 text-cyan-100",
    line: "bg-cyan-300/70",
  },
  emerald: {
    border: "hover:border-emerald-300/45",
    glow: "hover:shadow-[0_0_34px_rgba(16,185,129,0.13)]",
    icon: "bg-emerald-300/12 text-emerald-100",
    line: "bg-emerald-300/60",
  },
  fuchsia: {
    border: "hover:border-fuchsia-300/40",
    glow: "hover:shadow-[0_0_34px_rgba(217,70,239,0.12)]",
    icon: "bg-fuchsia-300/12 text-fuchsia-100",
    line: "bg-fuchsia-300/50",
  },
  sky: {
    border: "hover:border-sky-300/45",
    glow: "hover:shadow-[0_0_34px_rgba(14,165,233,0.13)]",
    icon: "bg-sky-300/12 text-sky-100",
    line: "bg-sky-300/60",
  },
  violet: {
    border: "hover:border-violet-300/40",
    glow: "hover:shadow-[0_0_34px_rgba(139,92,246,0.12)]",
    icon: "bg-violet-300/12 text-violet-100",
    line: "bg-violet-300/50",
  },
} as const;

const dashboardIconToneStyles: Record<
  DashboardCardTone,
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
  fuchsia: {
    active:
      "border-fuchsia-100/40 bg-fuchsia-300/16 text-fuchsia-100 shadow-[0_0_24px_rgba(217,70,239,0.18)]",
    idle: "border-fuchsia-200/22 bg-fuchsia-300/10 text-fuchsia-100/78 shadow-[0_0_14px_rgba(217,70,239,0.10)]",
  },
  sky: {
    active:
      "border-sky-100/44 bg-sky-300/16 text-sky-100 shadow-[0_0_24px_rgba(14,165,233,0.20)]",
    idle: "border-sky-200/24 bg-sky-300/10 text-sky-100/80 shadow-[0_0_14px_rgba(14,165,233,0.12)]",
  },
  violet: {
    active:
      "border-violet-100/42 bg-violet-300/16 text-violet-100 shadow-[0_0_24px_rgba(139,92,246,0.20)]",
    idle: "border-violet-200/24 bg-violet-300/10 text-violet-100/80 shadow-[0_0_14px_rgba(139,92,246,0.12)]",
  },
};

type DashboardEffectToneStyle = CSSProperties & {
  "--dashboard-effect-accent": string;
  "--dashboard-effect-accent-soft": string;
  "--dashboard-effect-primary": string;
  "--dashboard-effect-primary-soft": string;
  "--dashboard-effect-shadow": string;
};

const dashboardEffectToneStyles: Record<
  DashboardCardTone,
  DashboardEffectToneStyle
> = {
  amber: {
    "--dashboard-effect-accent": "rgba(251, 191, 36, 0.22)",
    "--dashboard-effect-accent-soft": "rgba(253, 224, 71, 0.13)",
    "--dashboard-effect-primary": "rgba(251, 191, 36, 0.30)",
    "--dashboard-effect-primary-soft": "rgba(251, 191, 36, 0.16)",
    "--dashboard-effect-shadow": "rgba(251, 191, 36, 0.24)",
  },
  cyan: {
    "--dashboard-effect-accent": "rgba(125, 211, 252, 0.22)",
    "--dashboard-effect-accent-soft": "rgba(14, 165, 233, 0.14)",
    "--dashboard-effect-primary": "rgba(34, 211, 238, 0.31)",
    "--dashboard-effect-primary-soft": "rgba(34, 211, 238, 0.17)",
    "--dashboard-effect-shadow": "rgba(34, 211, 238, 0.24)",
  },
  emerald: {
    "--dashboard-effect-accent": "rgba(52, 211, 153, 0.22)",
    "--dashboard-effect-accent-soft": "rgba(16, 185, 129, 0.13)",
    "--dashboard-effect-primary": "rgba(16, 185, 129, 0.30)",
    "--dashboard-effect-primary-soft": "rgba(16, 185, 129, 0.16)",
    "--dashboard-effect-shadow": "rgba(16, 185, 129, 0.23)",
  },
  fuchsia: {
    "--dashboard-effect-accent": "rgba(244, 114, 182, 0.20)",
    "--dashboard-effect-accent-soft": "rgba(217, 70, 239, 0.12)",
    "--dashboard-effect-primary": "rgba(217, 70, 239, 0.28)",
    "--dashboard-effect-primary-soft": "rgba(217, 70, 239, 0.15)",
    "--dashboard-effect-shadow": "rgba(217, 70, 239, 0.21)",
  },
  sky: {
    "--dashboard-effect-accent": "rgba(56, 189, 248, 0.22)",
    "--dashboard-effect-accent-soft": "rgba(14, 165, 233, 0.13)",
    "--dashboard-effect-primary": "rgba(14, 165, 233, 0.30)",
    "--dashboard-effect-primary-soft": "rgba(14, 165, 233, 0.16)",
    "--dashboard-effect-shadow": "rgba(14, 165, 233, 0.22)",
  },
  violet: {
    "--dashboard-effect-accent": "rgba(192, 132, 252, 0.20)",
    "--dashboard-effect-accent-soft": "rgba(139, 92, 246, 0.12)",
    "--dashboard-effect-primary": "rgba(139, 92, 246, 0.28)",
    "--dashboard-effect-primary-soft": "rgba(139, 92, 246, 0.15)",
    "--dashboard-effect-shadow": "rgba(139, 92, 246, 0.21)",
  },
};

const dashboardJourneyStepStyles: Record<DashboardJourneyStepState, string> = {
  active:
    "border-cyan-200/65 bg-cyan-300/14 text-cyan-50 shadow-[0_0_22px_rgba(34,211,238,0.26)] ring-1 ring-cyan-200/20",
  complete:
    "border-emerald-300/30 bg-emerald-300/10 text-emerald-100 shadow-[0_0_14px_rgba(16,185,129,0.12)]",
  default:
    "border-white/10 bg-slate-950/58 text-slate-300 hover:border-cyan-200/30 hover:bg-cyan-300/8 hover:text-white",
  locked:
    "border-white/10 bg-white/[0.025] text-slate-500 opacity-60 hover:border-white/15 hover:opacity-80",
};

export default function UserHomeDashboardPage() {
  const [firstName, setFirstName] = useState("Member");
  const [exerciseStats, setExerciseStats] = useState<LocalExerciseStatEntry[]>(
    [],
  );
  const [savedTemplates, setSavedTemplates] = useState<
    LocalWorkoutBuilderTemplate[]
  >([]);
  const [activeSessionTemplate, setActiveSessionTemplate] =
    useState<LocalWorkoutBuilderSessionTemplate | null>(null);
  const [statsSourceLabel, setStatsSourceLabel] = useState("Loading stats");
  const [templatesSourceLabel, setTemplatesSourceLabel] =
    useState("Loading templates");
  const [canSyncWorkoutData, setCanSyncWorkoutData] = useState(false);
  const [isSyncingWorkoutData, setIsSyncingWorkoutData] = useState(false);
  const [syncStatusMessage, setSyncStatusMessage] = useState("");
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [activeUploadType, setActiveUploadType] =
    useState<UploadOptionId>("screenshot");
  const [favoriteExerciseIds, setFavoriteExerciseIds] = useState<string[]>([]);
  const [dashboardLibraryFavoriteIds, setDashboardLibraryFavoriteIds] =
    useState<Record<string, string[]>>({});
  const [
    activeManualFavoriteDashboardIndex,
    setActiveManualFavoriteDashboardIndex,
  ] = useState(0);
  const [exerciseSelectorOpen, setExerciseSelectorOpen] = useState(false);
  const [exerciseReferenceSearch, setExerciseReferenceSearch] = useState("");
  const [manualReferences, setManualReferences] = useState<
    ManualLibraryReference[]
  >([]);
  const [manualStatsDraft, setManualStatsDraft] = useState<ManualStatsDraft>({
    dateTime: getManualDateTimeInputValue(),
    load: "",
    notes: "",
    reps: "",
    rpe: "",
    sessionLabel: "",
    sets: "",
  });
  const [manualStatsLogs, setManualStatsLogs] = useState<ManualStatsLogEntry[]>(
    [],
  );
  const [manualLogMessage, setManualLogMessage] = useState("");
  const [activeDashboardOrbiterRow, setActiveDashboardOrbiterRow] =
    useState(0);
  const [activeDashboardHeaderIndex, setActiveDashboardHeaderIndex] =
    useState(0);
  const [dashboardFoundationProgress, setDashboardFoundationProgress] =
    useState<DashboardFoundationProgress>({
      goalFocus: "",
      goalsCompletion: 0,
      goalsVisited: false,
      profileCompletion: 0,
      profileVisited: false,
    });
  const [dashboardHeaderSlideDirection, setDashboardHeaderSlideDirection] =
    useState<"left" | "right">("right");
  const [activeCommandCenterIndex, setActiveCommandCenterIndex] = useState(0);
  const [activeSystemCenterIndex, setActiveSystemCenterIndex] = useState(0);
  const [
    activeDashboardJourneyStepIndexes,
    setActiveDashboardJourneyStepIndexes,
  ] = useState<Record<string, number>>({});
  const [activeHeroAchievementIndex, setActiveHeroAchievementIndex] =
    useState(0);
  const [heroAchievementSlideDirection, setHeroAchievementSlideDirection] =
    useState<"left" | "right">("right");
  const [dashboardProfileHubOpen, setDashboardProfileHubOpen] =
    useState(false);
  const [activeDashboardProfileHubLayer, setActiveDashboardProfileHubLayer] =
    useState(0);
  const [
    activeDashboardProfileHubMainIndex,
    setActiveDashboardProfileHubMainIndex,
  ] = useState(0);
  const [
    activeDashboardProfileHubAccountIndex,
    setActiveDashboardProfileHubAccountIndex,
  ] = useState(0);
  const favoriteWorkoutStripRef = useRef<HTMLDivElement | null>(null);
  const dashboardOrbiterPointerStartRef =
    useRef<DashboardVerticalPointerStart | null>(null);
  const dashboardOrbiterPointerMovedRef = useRef(false);
  const dashboardOrbiterRowChangeLockRef = useRef(0);
  const commandCenterPointerStartRef = useRef<number | null>(null);
  const commandCenterPointerMovedRef = useRef(false);
  const systemCenterPointerStartRef = useRef<number | null>(null);
  const systemCenterPointerMovedRef = useRef(false);
  const dashboardCardWheelLockRef = useRef(0);
  const heroAchievementPointerStartRef = useRef<number | null>(null);
  const heroAchievementPointerMovedRef = useRef(false);
  const heroAchievementWheelLockRef = useRef(0);
  const selectedExerciseReference = manualReferences.find(
    (reference) => reference.referenceType === "exercise",
  );
  const selectedExercise = selectedExerciseReference
    ? exerciseLibrary.find(
        (exercise) => exercise.id === selectedExerciseReference.referenceId,
      ) || null
    : null;
  const favoriteWorkoutTemplates = useMemo(() => {
    const seenTemplateIds = new Set<string>();
    const templates: LocalWorkoutBuilderTemplate[] = [];

    if (activeSessionTemplate?.exercises?.length) {
      seenTemplateIds.add(activeSessionTemplate.id);
      templates.push(activeSessionTemplate);
    }

    savedTemplates.forEach((template) => {
      if (!template.exercises.length || seenTemplateIds.has(template.id)) {
        return;
      }

      seenTemplateIds.add(template.id);
      templates.push(template);
    });

    return templates.slice(0, 8);
  }, [activeSessionTemplate, savedTemplates]);
  const favoriteExerciseCards = useMemo(() => {
    const favorites = favoriteExerciseIds
      .map((favoriteId) =>
        exerciseLibrary.find((exercise) => exercise.id === favoriteId),
      )
      .filter((exercise): exercise is Exercise => Boolean(exercise));

    return favorites.slice(0, 12);
  }, [favoriteExerciseIds]);
  const activeManualFavoriteDashboard =
    manualStatsFavoriteDashboardSources[
      activeManualFavoriteDashboardIndex %
        manualStatsFavoriteDashboardSources.length
    ] || manualStatsFavoriteDashboardSources[0];
  const activeDashboardLibraryFavoriteIds =
    activeManualFavoriteDashboard.id === "workout"
      ? []
      : dashboardLibraryFavoriteIds[activeManualFavoriteDashboard.id] || [];
  const activeManualFavoriteCount =
    activeManualFavoriteDashboard.id === "workout"
      ? favoriteExerciseCards.length
      : activeDashboardLibraryFavoriteIds.length;
  const activeCommandCenter =
    dashboardCommandCenterCards[activeCommandCenterIndex] ||
    dashboardCommandCenterCards[0];
  const activeSystemCenter =
    dashboardSystemCards[activeSystemCenterIndex] || dashboardSystemCards[0];
  const dashboardOrbiterRows = [
    {
      completion: 100,
      helper: "Hero, rewards, and progression wallet.",
      title: "Weekly Snapshot",
    },
    {
      completion: Math.round(
        ((activeCommandCenterIndex + 1) / dashboardCommandCenterCards.length) *
          100,
      ),
      helper: "Core command centers.",
      title: "Dashboards",
    },
    {
      completion: Math.round(
        ((activeSystemCenterIndex + 1) / dashboardSystemCards.length) * 100,
      ),
      helper:
        "Goals, insights, stats, calendar, appointments, messages, packages, and achievements.",
      title: "System Row",
    },
  ];
  const getDashboardRowUrgencyTone = (completion: number) =>
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
  const clampedDashboardOrbiterRow = Math.max(
    0,
    Math.min(dashboardOrbiterRows.length - 1, activeDashboardOrbiterRow),
  );
  const setDashboardOrbiterRow = (row: number) => {
    const nextRow = Math.max(
      0,
      Math.min(dashboardOrbiterRows.length - 1, row),
    );
    if (nextRow === clampedDashboardOrbiterRow) return;

    const now = Date.now();
    if (now - dashboardOrbiterRowChangeLockRef.current < 280) return;

    dashboardOrbiterRowChangeLockRef.current = now;
    setActiveDashboardOrbiterRow(nextRow);
  };
  const moveDashboardOrbiterRow = (direction: -1 | 1) => {
    setDashboardOrbiterRow(clampedDashboardOrbiterRow + direction);
  };
  const handleDashboardOrbiterWheel = (
    event: ReactWheelEvent<HTMLElement>,
  ) => {
    if (Math.abs(event.deltaX) > Math.abs(event.deltaY) * 1.2) return;

    const direction = event.deltaY > 18 ? 1 : event.deltaY < -18 ? -1 : 0;
    if (direction === 0) return;

    const nextRow = Math.max(
      0,
      Math.min(
        dashboardOrbiterRows.length - 1,
        clampedDashboardOrbiterRow + direction,
      ),
    );
    if (nextRow === clampedDashboardOrbiterRow) return;

    event.preventDefault();
    event.stopPropagation();
    setDashboardOrbiterRow(nextRow);
  };
  const handleDashboardOrbiterKeyDown = (
    event: ReactKeyboardEvent<HTMLElement>,
  ) => {
    const target = event.target;
    if (
      target instanceof HTMLElement &&
      target.closest("input,select,textarea,[contenteditable='true']")
    ) {
      return;
    }

    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;

    const direction = event.key === "ArrowDown" ? 1 : -1;
    const nextRow = Math.max(
      0,
      Math.min(
        dashboardOrbiterRows.length - 1,
        clampedDashboardOrbiterRow + direction,
      ),
    );
    if (nextRow === clampedDashboardOrbiterRow) return;

    event.preventDefault();
    event.stopPropagation();
    setDashboardOrbiterRow(nextRow);
  };
  const handleDashboardOrbiterPointerDown = (
    event: ReactPointerEvent<HTMLElement>,
  ) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;

    const target = event.target;
    if (
      target instanceof HTMLElement &&
      target.closest("input,select,textarea,[contenteditable='true']")
    ) {
      return;
    }

    dashboardOrbiterPointerStartRef.current = {
      x: event.clientX,
      y: event.clientY,
    };
    dashboardOrbiterPointerMovedRef.current = false;
    event.currentTarget.focus({ preventScroll: true });
  };
  const handleDashboardOrbiterPointerMove = (
    event: ReactPointerEvent<HTMLElement>,
  ) => {
    const start = dashboardOrbiterPointerStartRef.current;
    if (!start) return;

    const deltaX = event.clientX - start.x;
    const deltaY = event.clientY - start.y;
    const verticalIntent = Math.abs(deltaY) > Math.abs(deltaX) * 1.15;

    if (!verticalIntent || Math.abs(deltaY) < 70) return;

    const direction = deltaY > 0 ? -1 : 1;
    const nextRow = Math.max(
      0,
      Math.min(
        dashboardOrbiterRows.length - 1,
        clampedDashboardOrbiterRow + direction,
      ),
    );

    dashboardOrbiterPointerMovedRef.current = true;
    dashboardOrbiterPointerStartRef.current = {
      x: event.clientX,
      y: event.clientY,
    };

    event.preventDefault();
    event.stopPropagation();

    if (nextRow !== clampedDashboardOrbiterRow) {
      setDashboardOrbiterRow(nextRow);
    }
  };
  const handleDashboardOrbiterPointerEnd = (
    event: ReactPointerEvent<HTMLElement>,
  ) => {
    dashboardOrbiterPointerStartRef.current = null;

    if (dashboardOrbiterPointerMovedRef.current) {
      event.preventDefault();
      window.setTimeout(() => {
        dashboardOrbiterPointerMovedRef.current = false;
      }, 0);
    }
  };
  const getDashboardOrbitDistance = (
    index: number,
    activeIndex: number,
    totalCards: number,
  ) => {
    const rawDistance = index - activeIndex;

    if (rawDistance > totalCards / 2) {
      return rawDistance - totalCards;
    }

    if (rawDistance < -totalCards / 2) {
      return rawDistance + totalCards;
    }

    return rawDistance;
  };
  const getCommandCenterOrbitDistance = (index: number) =>
    getDashboardOrbitDistance(
      index,
      activeCommandCenterIndex,
      dashboardCommandCenterCards.length,
    );
  const getSystemCenterOrbitDistance = (index: number) =>
    getDashboardOrbitDistance(
      index,
      activeSystemCenterIndex,
      dashboardSystemCards.length,
    );
  const rotateCommandCenter = (direction: DashboardOrbitDirection) => {
    setActiveCommandCenterIndex((currentIndex) => {
      const nextIndex =
        direction === "left" ? currentIndex - 1 : currentIndex + 1;

      return (
        (nextIndex + dashboardCommandCenterCards.length) %
        dashboardCommandCenterCards.length
      );
    });
  };
  const rotateSystemCenter = (direction: DashboardOrbitDirection) => {
    setActiveSystemCenterIndex((currentIndex) => {
      const nextIndex =
        direction === "left" ? currentIndex - 1 : currentIndex + 1;

      return (
        (nextIndex + dashboardSystemCards.length) % dashboardSystemCards.length
      );
    });
  };
  const handleDashboardOrbitPointerDown = (
    event: ReactPointerEvent<HTMLDivElement>,
    pointerStartRef: DashboardPointerStartRef,
    pointerMovedRef: DashboardPointerMovedRef,
  ) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;

    pointerStartRef.current = event.clientX;
    pointerMovedRef.current = false;
    event.currentTarget.focus({ preventScroll: true });
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const handleDashboardOrbitPointerMove = (
    event: ReactPointerEvent<HTMLDivElement>,
    pointerStartRef: DashboardPointerStartRef,
    pointerMovedRef: DashboardPointerMovedRef,
    rotateOrbit: (direction: DashboardOrbitDirection) => void,
    threshold = 72,
  ) => {
    const startX = pointerStartRef.current;
    if (startX === null) return;

    const deltaX = event.clientX - startX;
    if (Math.abs(deltaX) < threshold) return;

    event.preventDefault();
    event.stopPropagation();
    pointerMovedRef.current = true;
    rotateOrbit(deltaX > 0 ? "left" : "right");
    pointerStartRef.current = event.clientX;
  };
  const handleDashboardOrbitPointerUp = (
    event: ReactPointerEvent<HTMLDivElement>,
    pointerStartRef: DashboardPointerStartRef,
    pointerMovedRef: DashboardPointerMovedRef,
    rotateOrbit: (direction: DashboardOrbitDirection) => void,
    setActiveIndex?: (index: number) => void,
  ) => {
    const startX = pointerStartRef.current;
    pointerStartRef.current = null;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    }

    if (startX === null) {
      return;
    }

    if (pointerMovedRef.current) {
      return;
    }

    const deltaX = event.clientX - startX;

    if (Math.abs(deltaX) < 44) {
      const elementAtPoint = event.currentTarget.ownerDocument.elementFromPoint(
        event.clientX,
        event.clientY,
      );
      const cardElement =
        elementAtPoint instanceof HTMLElement
          ? elementAtPoint.closest("[data-dashboard-orbit-card-index]")
          : null;
      const cardIndexValue =
        cardElement instanceof HTMLElement
          ? cardElement.dataset.dashboardOrbitCardIndex
          : undefined;
      const cardIndex =
        typeof cardIndexValue === "string" ? Number(cardIndexValue) : NaN;

      if (setActiveIndex && Number.isInteger(cardIndex)) {
        setActiveIndex(cardIndex);
      }

      return;
    }

    pointerMovedRef.current = true;
    rotateOrbit(deltaX > 0 ? "left" : "right");
  };
  const handleDashboardOrbitKeyDown = (
    event: ReactKeyboardEvent<HTMLDivElement>,
    rotateOrbit: (direction: DashboardOrbitDirection) => void,
  ) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      rotateOrbit("left");
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      rotateOrbit("right");
    }
  };
  const handleDashboardOrbitWheel = (
    event: ReactWheelEvent<HTMLDivElement>,
    rotateOrbit: (direction: DashboardOrbitDirection) => void,
  ) => {
    const horizontalDelta =
      Math.abs(event.deltaX) >= Math.abs(event.deltaY)
        ? event.deltaX
        : event.shiftKey
          ? event.deltaY
          : 0;

    if (Math.abs(horizontalDelta) < 18) return;

    event.preventDefault();
    event.stopPropagation();

    const now = Date.now();
    if (now - dashboardCardWheelLockRef.current < 240) return;

    dashboardCardWheelLockRef.current = now;
    rotateOrbit(horizontalDelta > 0 ? "right" : "left");
  };
  const filteredExerciseReferences = useMemo(() => {
    const searchValue = exerciseReferenceSearch.trim().toLowerCase();
    const matches = searchValue
      ? exerciseLibrary.filter((exercise) =>
          [
            exercise.name,
            exercise.body,
            exercise.muscles,
            exercise.pattern,
            exercise.goal,
            exercise.equipment,
            exercise.level,
          ]
            .join(" ")
            .toLowerCase()
            .includes(searchValue),
        )
      : exerciseLibrary;

    return matches.slice(0, 18);
  }, [exerciseReferenceSearch]);

  const updateManualStatsDraft = (
    field: keyof ManualStatsDraft,
    value: string,
  ) => {
    setManualLogMessage("");
    setManualStatsDraft((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const selectExerciseReference = (exercise: Exercise) => {
    const nextReference = buildExerciseReference(exercise);
    setManualReferences((current) => [
      nextReference,
      ...current.filter(
        (reference) => reference.referenceType !== nextReference.referenceType,
      ),
    ]);
    setExerciseSelectorOpen(false);
    setExerciseReferenceSearch("");
    setManualLogMessage("");
  };

  const removeManualReference = (referenceId: string) => {
    setManualReferences((current) =>
      current.filter((reference) => reference.referenceId !== referenceId),
    );
  };

  const saveManualStatsLog = () => {
    const hasManualValue = [
      manualStatsDraft.sets,
      manualStatsDraft.reps,
      manualStatsDraft.load,
      manualStatsDraft.rpe,
      manualStatsDraft.notes,
      manualStatsDraft.sessionLabel,
    ].some((value) => value.trim());

    if (!hasManualValue && manualReferences.length === 0) {
      setManualLogMessage("Add a stat, note, or exercise reference first.");
      return;
    }

    const loggedAt = new Date().toISOString();
    const entry: ManualStatsLogEntry = {
      ...manualStatsDraft,
      id: `manual-log-${Date.now()}`,
      loggedAt,
      references: manualReferences,
    };
    const updatedManualLogs = [entry, ...manualStatsLogs].slice(0, 24);
    setManualStatsLogs(updatedManualLogs);
    writeManualStatsLogEntries(updatedManualLogs);

    if (selectedExerciseReference) {
      const statDate = getManualLogIsoDate(manualStatsDraft.dateTime);
      const newExerciseStat: LocalExerciseStatEntry = {
        body: selectedExerciseReference.metadata.body,
        equipment: selectedExerciseReference.metadata.equipment,
        exerciseId: selectedExerciseReference.referenceId,
        exerciseName: selectedExerciseReference.referenceTitle,
        pattern: selectedExerciseReference.metadata.movementPattern,
        reps: manualStatsDraft.reps.trim() || "0",
        sets: manualStatsDraft.sets.trim() || "1",
        weight: manualStatsDraft.load.trim() || "0",
        date: statDate,
        source: "exercise-library",
      };
      const updatedExerciseStats = prependExerciseStats(newExerciseStat);
      setExerciseStats(updatedExerciseStats);
    }

    setManualStatsDraft({
      dateTime: getManualDateTimeInputValue(),
      load: "",
      notes: "",
      reps: "",
      rpe: "",
      sessionLabel: "",
      sets: "",
    });
    setManualLogMessage(
      selectedExerciseReference
        ? `Logged ${selectedExerciseReference.referenceTitle}.`
        : "Logged generic manual stats.",
    );
  };

  const handleUploadOptionSelect = (optionId: UploadOptionId) => {
    setActiveUploadType(optionId);
  };

  const rotateManualFavoriteDashboard = (direction: "left" | "right") => {
    setActiveManualFavoriteDashboardIndex((currentIndex) => {
      const nextIndex =
        direction === "left" ? currentIndex - 1 : currentIndex + 1;

      return (
        (nextIndex + manualStatsFavoriteDashboardSources.length) %
        manualStatsFavoriteDashboardSources.length
      );
    });
  };
  const scrollFavoriteWorkouts = (direction: "left" | "right") => {
    const selector = favoriteWorkoutStripRef.current;
    if (!selector) return;

    selector.scrollBy({
      behavior: "smooth",
      left: direction === "left" ? -300 : 300,
    });
  };
  const markDashboardDestinationVisited = (href: string) => {
    if (typeof window === "undefined") return;

    if (href === ROUTES.dashboard.profile) {
      window.localStorage.setItem(DASHBOARD_PROFILE_VISITED_KEY, "true");
    }

    if (href === ROUTES.dashboard.goals) {
      window.localStorage.setItem(DASHBOARD_GOALS_VISITED_KEY, "true");
    }

    setDashboardFoundationProgress(readDashboardFoundationProgress());
  };
  const launchFavoriteWorkout = (template: LocalWorkoutBuilderTemplate) => {
    if (!template.exercises.length) return;

    const sessionTemplate = writeActiveWorkoutBuilderSessionTemplate(template);
    setActiveSessionTemplate(sessionTemplate);
  };

  useEffect(() => {
    setManualStatsLogs(readManualStatsLogEntries());
  }, []);

  useEffect(() => {
    if (!dashboardProfileHubOpen) return;

    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDashboardProfileHubOpen(false);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [dashboardProfileHubOpen]);

  useEffect(() => {
    const loadDashboardFavorites = () => {
      setFavoriteExerciseIds(
        readStringArrayFromStorage(EXERCISE_LIBRARY_FAVORITES_STORAGE_KEY),
      );
      setDashboardLibraryFavoriteIds(
        Object.fromEntries(
          dashboardFavoriteLibrarySources.map((source) => [
            source.id,
            readDashboardLibraryFavoriteIds(source),
          ]),
        ),
      );
    };

    loadDashboardFavorites();

    const handleStorage = (event: StorageEvent) => {
      const favoriteStorageKeys = new Set([
        EXERCISE_LIBRARY_FAVORITES_STORAGE_KEY,
        GLOBAL_DASHBOARD_FAVORITES_STORAGE_KEY,
        ...dashboardFavoriteLibrarySources.map((source) => source.storageKey),
      ]);

      if (event.key && !favoriteStorageKeys.has(event.key)) return;

      loadDashboardFavorites();
    };

    window.addEventListener("focus", loadDashboardFavorites);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("focus", loadDashboardFavorites);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  useEffect(() => {
    if (!exerciseSelectorOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setExerciseSelectorOpen(false);
      }
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [exerciseSelectorOpen]);

  useEffect(() => {
    async function loadUser() {
      const { data: authData } = await supabase.auth.getUser();

      if (!authData.user) {
        setCanSyncWorkoutData(false);
        return;
      }

      setCanSyncWorkoutData(true);

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", authData.user.id)
        .single();

      const nameSource =
        profile?.full_name ||
        authData.user.user_metadata?.full_name ||
        authData.user.user_metadata?.first_name ||
        "Member";

      setFirstName(String(nameSource).split(" ")[0] || "Member");
    }

    loadUser();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    setLastSyncedAt(window.localStorage.getItem(WORKOUT_SYNC_LAST_SYNCED_KEY));
    setActiveSessionTemplate(readActiveWorkoutBuilderSessionTemplate());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const refreshFoundationProgress = () => {
      setDashboardFoundationProgress(readDashboardFoundationProgress());
    };

    refreshFoundationProgress();
    window.addEventListener("storage", refreshFoundationProgress);
    window.addEventListener("focus", refreshFoundationProgress);
    window.addEventListener(
      SOUND_FITNESS_PROFILE_UPDATED_EVENT,
      refreshFoundationProgress,
    );

    return () => {
      window.removeEventListener("storage", refreshFoundationProgress);
      window.removeEventListener("focus", refreshFoundationProgress);
      window.removeEventListener(
        SOUND_FITNESS_PROFILE_UPDATED_EVENT,
        refreshFoundationProgress,
      );
    };
  }, []);

  useEffect(() => {
    let isActive = true;

    const syncDashboardData = async () => {
      const [statsResult, templatesResult] = await Promise.all([
        loadWorkoutLogEntriesWithFallback(),
        loadWorkoutTemplatesWithFallback(),
      ]);

      if (!isActive) return;

      setExerciseStats(statsResult.data);
      setSavedTemplates(templatesResult.data);
      setStatsSourceLabel(getSourceLabel(statsResult));
      setTemplatesSourceLabel(getSourceLabel(templatesResult));
    };

    syncDashboardData();
    const unsubscribe = subscribeToLocalWorkoutData(() => {
      void syncDashboardData();
    });

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, []);

  async function refreshHybridDashboardData() {
    const [statsResult, templatesResult] = await Promise.all([
      loadWorkoutLogEntriesWithFallback(),
      loadWorkoutTemplatesWithFallback(),
    ]);

    setExerciseStats(statsResult.data);
    setSavedTemplates(templatesResult.data);
    setStatsSourceLabel(getSourceLabel(statsResult));
    setTemplatesSourceLabel(getSourceLabel(templatesResult));

    return { statsResult, templatesResult };
  }

  async function syncLocalWorkoutData() {
    if (!canSyncWorkoutData || isSyncingWorkoutData) return;

    setIsSyncingWorkoutData(true);
    setSyncStatusMessage("Syncing local workout data...");

    try {
      const [templatesResult, logsResult] = await Promise.all([
        syncLocalWorkoutTemplatesToSupabase(),
        syncLocalWorkoutLogsToSupabase(),
      ]);

      await refreshHybridDashboardData();

      const templateSummary = templatesResult.data;
      const logSummary = logsResult.data;
      const syncedCount =
        templateSummary.syncedItems + logSummary.syncedItems;
      const skippedCount =
        templateSummary.skippedItems + logSummary.skippedItems;
      const failedCount =
        templateSummary.failedItems + logSummary.failedItems;
      const localCount =
        templateSummary.localItems + logSummary.localItems;

      if (!templatesResult.success || !logsResult.success) {
        setSyncStatusMessage(
          `Sync hit a snag, but your local data is still safe. Synced ${syncedCount}, skipped ${skippedCount} duplicate${
            skippedCount === 1 ? "" : "s"
          }, failed ${failedCount}. ${
            templatesResult.error ||
            logsResult.error ||
            "Some data could not sync."
          }`,
        );
      } else if (localCount === 0) {
        setSyncStatusMessage(
          "Nothing local to sync yet. New workout data will still save locally and sync when available.",
        );
      } else {
        setSyncStatusMessage(
          `Account backup complete: ${templateSummary.syncedItems} template${
            templateSummary.syncedItems === 1 ? "" : "s"
          } synced, ${logSummary.syncedItems} workout log ${
            logSummary.syncedItems === 1 ? "entry" : "entries"
          } synced, and ${skippedCount} duplicate${
            skippedCount === 1 ? "" : "s"
          } skipped.`,
        );
      }

      if (failedCount === 0) {
        const syncedAt = new Date().toISOString();

        if (typeof window !== "undefined") {
          window.localStorage.setItem(
            WORKOUT_SYNC_LAST_SYNCED_KEY,
            syncedAt,
          );
        }

        setLastSyncedAt(syncedAt);
      }
    } catch {
      setSyncStatusMessage(
        "Local workout data could not sync right now. Your local fallback is still safe.",
      );
    } finally {
      setIsSyncingWorkoutData(false);
    }
  }

  const dashboardSummary = useMemo(() => {
    const sortedStats = [...exerciseStats].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
    const latest = sortedStats[0];
    const totalSets = exerciseStats.reduce(
      (sum, stat) => sum + toLoggedNumber(stat.sets),
      0,
    );
    const totalVolume = exerciseStats.reduce(
      (sum, stat) =>
        sum +
        toLoggedNumber(stat.weight) *
          toLoggedNumber(stat.reps) *
          toLoggedNumber(stat.sets),
      0,
    );
    const workoutSessionEntries = exerciseStats.filter(
      (stat) => stat.source === "workout-session",
    );
    const uniqueExercises = new Set(
      exerciseStats.map((stat) => stat.exerciseName).filter(Boolean),
    );
    const workoutDates = groupWorkoutDates(exerciseStats);
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const weeklyExerciseStats = exerciseStats.filter((stat) => {
      const timestamp = new Date(stat.date).getTime();
      return Number.isFinite(timestamp) && timestamp >= sevenDaysAgo;
    });
    const workoutsThisWeek = workoutDates.filter((date) => {
      const timestamp = new Date(date).getTime();
      return Number.isFinite(timestamp) && timestamp >= sevenDaysAgo;
    }).length;
    const weeklySets = weeklyExerciseStats.reduce(
      (sum, stat) => sum + toLoggedNumber(stat.sets),
      0,
    );
    const weeklyVolume = weeklyExerciseStats.reduce(
      (sum, stat) =>
        sum +
        toLoggedNumber(stat.weight) *
          toLoggedNumber(stat.reps) *
          toLoggedNumber(stat.sets),
      0,
    );
    const latestTemplate = [...savedTemplates].sort(
      (a, b) =>
        new Date(b.updatedAt || b.createdAt).getTime() -
        new Date(a.updatedAt || a.createdAt).getTime(),
    )[0];

    return {
      totalLoggedEntries: exerciseStats.length,
      workoutSessionEntries: workoutSessionEntries.length,
      completedWorkouts: workoutDates.length,
      workoutsThisWeek,
      totalSets,
      totalVolume,
      weeklySets,
      weeklyVolume,
      uniqueExerciseCount: uniqueExercises.size,
      latestExercise: latest?.exerciseName || "No exercise logged yet",
      mostRecentDate: formatDashboardDate(latest?.date),
      hasStats: exerciseStats.length > 0,
      latestEntries: sortedStats.slice(0, 3),
      latestTemplate,
      templateCount: savedTemplates.length,
    };
  }, [exerciseStats, savedTemplates]);

  const nextAction = activeSessionTemplate
    ? {
        eyebrow: "Resume active session",
        title: activeSessionTemplate.title,
        detail: `${activeSessionTemplate.exercises.length} exercises started ${formatCompactDateTime(
          activeSessionTemplate.startedAt,
        )}`,
        href: ROUTES.dashboard.sessionWorkout,
        cta: "Resume Workout",
      }
    : dashboardSummary.latestTemplate
      ? {
          eyebrow: "Next best action",
          title: `Start ${dashboardSummary.latestTemplate.title}`,
          detail: `${dashboardSummary.latestTemplate.exercises.length} saved exercises ready from your templates.`,
          href: buildTemplateWorkoutHref(dashboardSummary.latestTemplate.id),
          cta: "Start Template",
        }
      : {
          eyebrow: "Next best action",
          title: "Start your first logged workout",
          detail:
            "Open the session hub or workout logger to create your first saved training entry.",
          href: ROUTES.dashboard.sessions,
          cta: "Open Sessions",
        };

  const statCards = [
    {
      label: "Completed Workouts",
      value: String(dashboardSummary.completedWorkouts),
      detail: `${dashboardSummary.workoutsThisWeek} in the last 7 days`,
    },
    {
      label: "Logged Entries",
      value: String(dashboardSummary.totalLoggedEntries),
      detail: `${dashboardSummary.workoutSessionEntries} from workout sessions`,
    },
    {
      label: "Total Sets",
      value: String(dashboardSummary.totalSets),
      detail: `${dashboardSummary.uniqueExerciseCount} unique exercises`,
    },
    {
      label: "Templates",
      value: String(dashboardSummary.templateCount),
      detail: templatesSourceLabel,
    },
  ];

  const planHighlights = [
    {
      label: "Current week",
      value:
        dashboardSummary.latestTemplate?.title ||
        "Build or choose a saved template",
    },
    {
      label: "Training target",
      value:
        dashboardSummary.workoutsThisWeek > 0
          ? `${dashboardSummary.workoutsThisWeek} workout${
              dashboardSummary.workoutsThisWeek === 1 ? "" : "s"
            } logged this week`
          : "Start with one complete session",
    },
    {
      label: "Next planning step",
      value:
        dashboardSummary.templateCount > 0
          ? "Assign templates to your weekly plan"
          : "Create a reusable workout template",
    },
  ];

  const dashboardCharts = useMemo(() => {
    const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const trainingVolume = labels.map((label, index) => {
      const value = exerciseStats
        .filter((entry) => {
          const date = new Date(entry.date);
          if (Number.isNaN(date.getTime())) return false;
          const dayIndex = date.getDay() === 0 ? 6 : date.getDay() - 1;
          return dayIndex === index;
        })
        .reduce(
          (sum, entry) =>
            sum +
            toLoggedNumber(entry.weight) *
              toLoggedNumber(entry.reps) *
              toLoggedNumber(entry.sets),
          0,
        );

      return {
        label,
        value: value > 0 ? Math.round(value / 100) : 0,
        target: 18,
      };
    });

    const weeklyGoal = Math.max(12, (dashboardSummary.templateCount || 1) * 12);
    const goalProgressPercent = Math.min(
      (dashboardSummary.totalSets / weeklyGoal) * 100,
      100,
    );

    return {
      trainingVolume,
      goalProgressPercent,
      nutritionConsistency: [
        { label: "Protein", value: dashboardSummary.hasStats ? 74 : 42, target: 100 },
        { label: "Hydration", value: dashboardSummary.hasStats ? 68 : 40, target: 100 },
        { label: "Meals", value: dashboardSummary.hasStats ? 81 : 35, target: 100 },
      ],
      recoveryTrend: [
        { label: "Mon", value: 72 },
        { label: "Tue", value: dashboardSummary.workoutsThisWeek > 2 ? 64 : 78 },
        { label: "Wed", value: 76 },
        { label: "Thu", value: 70 },
        { label: "Fri", value: dashboardSummary.totalSets > 30 ? 62 : 82 },
        { label: "Sat", value: 84 },
        { label: "Sun", value: 79 },
      ],
    };
  }, [dashboardSummary, exerciseStats]);

  const dashboardTabCompletions = useMemo(() => {
    const nutritionAverage =
      dashboardCharts.nutritionConsistency.reduce(
        (sum, item) => sum + item.value,
        0,
      ) / dashboardCharts.nutritionConsistency.length;
    const recoveryAverage =
      dashboardCharts.recoveryTrend.reduce((sum, item) => sum + item.value, 0) /
      dashboardCharts.recoveryTrend.length;
    const workoutCompletion = clampDashboardPercent(
      Math.max(
        activeSessionTemplate ? 68 : 0,
        dashboardSummary.workoutsThisWeek * 20,
        dashboardSummary.templateCount * 16,
        dashboardSummary.completedWorkouts * 9,
      ),
    );
    const performanceCompletion = clampDashboardPercent(
      dashboardSummary.hasStats
        ? Math.min(
            92,
            34 +
              dashboardSummary.uniqueExerciseCount * 6 +
              dashboardSummary.workoutsThisWeek * 7,
          )
        : 12,
    );
    const statsCompletion = clampDashboardPercent(
      Math.max(
        dashboardSummary.totalLoggedEntries * 7,
        dashboardSummary.hasStats ? 46 : 10,
      ),
    );

    return {
      dashboard: 100,
      education: 18,
      goals: dashboardFoundationProgress.goalsCompletion,
      nutrition: nutritionAverage,
      performance: performanceCompletion,
      profile: dashboardFoundationProgress.profileCompletion,
      recovery: recoveryAverage,
      soundWorld: 8,
      stats: statsCompletion,
      workout: workoutCompletion,
    };
  }, [
    activeSessionTemplate,
    dashboardCharts,
    dashboardFoundationProgress.goalsCompletion,
    dashboardFoundationProgress.profileCompletion,
    dashboardSummary,
  ]);
  const getDashboardJourneyStepCompletion = (step: DashboardJourneyStep) => {
    if (typeof step.completion === "number") {
      return clampDashboardPercent(step.completion);
    }

    if (step.href === ROUTES.dashboard.sessions) {
      return dashboardTabCompletions.workout;
    }

    if (step.href === ROUTES.dashboard.myPlan) {
      return clampDashboardPercent(
        Math.max(28, dashboardSummary.templateCount * 18),
      );
    }

    if (step.href === ROUTES.workoutBuilder.home) {
      return clampDashboardPercent(
        Math.max(36, dashboardSummary.templateCount * 20),
      );
    }

    if (step.href === ROUTES.workoutBuilder.exerciseLibrary) {
      return clampDashboardPercent(
        Math.max(30, favoriteExerciseCards.length * 16),
      );
    }

    if (step.state === "complete") return 100;
    if (step.state === "active") return 62;
    if (step.state === "default") return 28;

    return 0;
  };
  const getDashboardNavigationCardCompletion = (
    card: DashboardNavigationCard,
  ) => {
    if (card.title === "Workout / Sessions") return dashboardTabCompletions.workout;
    if (card.title === "Nutrition / Fuel") return dashboardTabCompletions.nutrition;
    if (card.title === "Recovery") return dashboardTabCompletions.recovery;
    if (card.title === "Goals") return dashboardTabCompletions.goals;
    if (card.title === "Performance") return dashboardTabCompletions.performance;
    if (card.title === "Education") return dashboardTabCompletions.education;
    if (card.title === "Sound World") return dashboardTabCompletions.soundWorld;
    if (card.title === "Stats") return dashboardTabCompletions.stats;
    if (card.title === "Achievements") return 72;
    if (card.title === "Insights") return dashboardSummary.hasStats ? 48 : 12;
    if (card.title === "Calendar") {
      return clampDashboardPercent(dashboardSummary.workoutsThisWeek * 20);
    }
    if (card.title === "Appointments") return 25;
    if (card.title === "Messages") return 35;
    if (card.title === "Packages") return 42;

    return 20;
  };

  const dashboardCalendarItems = useMemo<DashboardCalendarItem[]>(() => {
    const templateTitle =
      dashboardSummary.latestTemplate?.title || "Build first workout";

    return [
      {
        dateLabel: "Mon",
        title:
          dashboardSummary.workoutsThisWeek > 0
            ? "Completed session"
            : "Plan first session",
        type: dashboardSummary.workoutsThisWeek > 0 ? "completed" : "training",
        status: dashboardSummary.workoutsThisWeek > 0 ? "Done" : "Start",
      },
      {
        dateLabel: "Tue",
        title: "Hydration check",
        type: "nutrition",
        status: "Fuel",
      },
      {
        dateLabel: "Wed",
        title: templateTitle,
        type: "training",
        status: "Planned",
      },
      {
        dateLabel: "Thu",
        title: "Mobility reset",
        type: "recovery",
        status: "Recovery",
      },
      {
        dateLabel: "Fri",
        title: dashboardSummary.latestExercise,
        type: dashboardSummary.hasStats ? "completed" : "training",
        status: dashboardSummary.hasStats ? "Recent" : "Suggested",
      },
      {
        dateLabel: "Sat",
        title: "Nutrition prep",
        type: "nutrition",
        status: "Plan",
      },
      {
        dateLabel: "Sun",
        title: "Reflection",
        type: "recovery",
        status: "Review",
      },
    ];
  }, [dashboardSummary]);

  const masterJourneyCurrentFocus = activeSessionTemplate
    ? "Session Execution"
    : dashboardSummary.workoutsThisWeek > 0
      ? "Progress Tracking"
      : dashboardSummary.templateCount > 0
        ? "Program Planning"
        : "Workout Builder";
  const masterJourneyNodes: MasterJourneyNode[] = [
    {
      href: ROUTES.dashboard.profile,
      icon: "🧭",
      label: "Foundation",
      metric: "100% base",
      state: "complete",
    },
    {
      href: ROUTES.dashboard.goals,
      icon: "🎯",
      label: "Goals",
      metric: "Direction XP",
      state: "complete",
    },
    {
      href: ROUTES.workoutBuilder.home,
      icon: "🏋️",
      label: "Workout Builder",
      metric: `${dashboardSummary.templateCount} saved`,
      state:
        masterJourneyCurrentFocus === "Workout Builder"
          ? "active"
          : dashboardSummary.templateCount > 0
            ? "complete"
            : "default",
    },
    {
      href: ROUTES.dashboard.myPlan,
      icon: "📅",
      label: "Program Planning",
      metric: "Weekly map",
      state: masterJourneyCurrentFocus === "Program Planning" ? "active" : "default",
    },
    {
      href: ROUTES.dashboard.sessions,
      icon: "✅",
      label: "Session Execution",
      metric: `${dashboardSummary.workoutsThisWeek} this wk`,
      state:
        masterJourneyCurrentFocus === "Session Execution"
          ? "active"
          : dashboardSummary.workoutsThisWeek > 0
            ? "complete"
            : "default",
    },
    {
      href: ROUTES.dashboard.recovery,
      icon: "💧",
      label: "Recovery",
      metric: "72% ready",
      state: "default",
    },
    {
      href: ROUTES.nutritionPortal.home,
      icon: "🍽️",
      label: "Nutrition",
      metric: "Fuel XP",
      state: "default",
    },
    {
      href: ROUTES.dashboard.stats,
      icon: "📈",
      label: "Progress Tracking",
      metric: `${dashboardSummary.totalLoggedEntries} logs`,
      state:
        masterJourneyCurrentFocus === "Progress Tracking"
          ? "active"
          : dashboardSummary.hasStats
            ? "complete"
            : "default",
    },
    {
      href: ROUTES.dashboard.performance,
      icon: "⚡",
      label: "Performance",
      metric: "Power XP",
      state: "default",
    },
    {
      href: ROUTES.dashboard.insights,
      icon: "🧠",
      label: "Insights",
      metric: "Unlocking",
      state: "locked",
    },
    {
      href: ROUTES.dashboard.achievements,
      icon: "🏆",
      label: "Achievement System",
      metric: "0 pts",
      state: "locked",
    },
    {
      href: ROUTES.soundworld.home,
      icon: "🌎",
      label: "Sound World",
      metric: "Community",
      state: "locked",
    },
  ];
  const masterJourneyProgress = Math.round(
    ((masterJourneyNodes.filter((node) => node.state === "complete").length +
      masterJourneyNodes.filter((node) => node.state === "active").length * 0.5) /
      masterJourneyNodes.length) *
      100,
  );
  const heroProgressionLine = activeSessionTemplate
    ? "Session in motion. Keep the chain alive."
    : dashboardSummary.workoutsThisWeek >= 3
      ? `${dashboardSummary.workoutsThisWeek} active progression streaks.`
      : dashboardSummary.hasStats
        ? "Recovery stable. Strength trend rising."
        : "Momentum building. First milestone is close.";
  const soundPoints =
    1200 +
    dashboardSummary.completedWorkouts * 130 +
    dashboardSummary.totalLoggedEntries * 28 +
    dashboardSummary.totalSets * 5 +
    dashboardSummary.templateCount * 90;
  const soundTokens =
    80 +
    dashboardSummary.completedWorkouts * 4 +
    dashboardSummary.templateCount * 6 +
    (dashboardSummary.hasStats ? 12 : 0);
  const dashboardProfileHubCompletion = Math.max(
    dashboardFoundationProgress.profileCompletion,
    Math.round(
      (dashboardFoundationProgress.profileCompletion +
        dashboardFoundationProgress.goalsCompletion) /
        2,
    ),
  );
  const dashboardProfileHubMainItems: DashboardProfileHubOrbitItem[] = [
    {
      helper: "Identity, member status, profile completion, and dashboard defaults.",
      href: ROUTES.dashboard.profile,
      icon: "profile",
      label: "Profile Basics",
      references: [
        `${dashboardFoundationProgress.profileCompletion}% profile`,
        dashboardFoundationProgress.profileVisited ? "Visited" : "Needs review",
        "Member hub",
      ],
      stat: `${firstName} / Member`,
      tone: "border-cyan-200/24 bg-cyan-300/10 text-cyan-100",
    },
    {
      helper: "Body metrics, weight direction, measurements, and visual progress.",
      href: `${ROUTES.dashboard.profile}#my-body`,
      icon: "performance",
      label: "My Body",
      references: [
        dashboardSummary.hasStats ? "Stats active" : "Stats open",
        `${dashboardSummary.totalLoggedEntries} logs`,
        "Body metrics",
      ],
      stat: dashboardSummary.hasStats ? "Trend active" : "Add metrics",
      tone: "border-sky-200/24 bg-sky-300/10 text-sky-100",
    },
    {
      helper: "Sleep, stress, soreness, pain, energy, and readiness context.",
      href: `${ROUTES.dashboard.profile}#readiness-section`,
      icon: "recovery",
      label: "Readiness",
      references: [
        dashboardSummary.totalSets > 30 ? "Manage heat" : "Ready to build",
        `${dashboardSummary.totalSets} sets`,
        "Recovery signals",
      ],
      stat: "Recovery context",
      tone: "border-amber-200/24 bg-amber-300/10 text-amber-100",
    },
    {
      helper: "Primary goals, training direction, weekly targets, and motivation.",
      href: `${ROUTES.dashboard.profile}#plan-direction`,
      icon: "goals",
      label: "Goal Direction",
      references: [
        dashboardFoundationProgress.goalFocus || "Goal focus open",
        `${dashboardFoundationProgress.goalsCompletion}% goals`,
        dashboardFoundationProgress.goalsVisited ? "Synced" : "Needs setup",
      ],
      stat: `${dashboardFoundationProgress.goalsCompletion}% ready`,
      tone: "border-emerald-200/24 bg-emerald-300/10 text-emerald-100",
    },
    {
      helper: "Coach notes, app preferences, AI guidance, and communication style.",
      href: `${ROUTES.dashboard.profile}#coach-app-notes`,
      icon: "education",
      label: "Coach + App",
      references: ["Coach context", "App defaults", "Guidance notes"],
      stat: "Personalization",
      tone: "border-teal-200/24 bg-teal-300/10 text-teal-100",
    },
  ];
  const dashboardProfileHubAccountItems: DashboardProfileHubOrbitItem[] = [
    {
      helper: "Notifications, display controls, security, and app preferences.",
      href: ROUTES.dashboard.settings,
      icon: "dashboard",
      label: "Settings",
      references: ["Preferences", "Security", "Notifications"],
      stat: "Account controls",
      tone: "border-violet-200/24 bg-violet-300/10 text-violet-100",
    },
    {
      helper: "Session packages, payments, invoices, and renewal context.",
      href: ROUTES.dashboard.payments,
      icon: "performance",
      label: "Billing",
      references: ["Packages", "Invoices", "Payments"],
      stat: "Plan status",
      tone: "border-amber-200/24 bg-amber-300/10 text-amber-100",
    },
    {
      helper: "Support, FAQs, app guidance, and troubleshooting paths.",
      href: ROUTES.dashboard.help,
      icon: "education",
      label: "Help",
      references: ["Support center", "FAQs", "Guidance"],
      stat: "Support",
      tone: "border-emerald-200/24 bg-emerald-300/10 text-emerald-100",
    },
    {
      helper: "Milestones, badges, Sound Points, and token rewards.",
      href: ROUTES.dashboard.achievements,
      icon: "goals",
      label: "Achievements",
      references: [
        `${soundPoints.toLocaleString()} points`,
        `${soundTokens.toLocaleString()} tokens`,
        `${dashboardProfileHubCompletion}% profile`,
      ],
      stat: "Rewards",
      tone: "border-orange-200/24 bg-orange-300/10 text-orange-100",
    },
  ];
  const dashboardProfileHubLayerMenuItems = [
    { label: "Profile", layer: 0 },
    { label: "My Hub", layer: 1 },
    { label: "Account", layer: 2 },
  ];
  const openDashboardProfileHub = () => {
    setActiveDashboardProfileHubLayer(0);
    setActiveDashboardProfileHubMainIndex(0);
    setActiveDashboardProfileHubAccountIndex(0);
    setDashboardProfileHubOpen(true);
  };
  const closeDashboardProfileHub = () => {
    setDashboardProfileHubOpen(false);
  };
  const selectDashboardProfileHubLayer = (layer: number) => {
    setActiveDashboardProfileHubLayer(Math.max(0, Math.min(2, layer)));
  };
  const rotateDashboardProfileHubLayer = (direction: "up" | "down") => {
    setActiveDashboardProfileHubLayer((currentLayer) =>
      Math.max(
        0,
        Math.min(2, currentLayer + (direction === "down" ? 1 : -1)),
      ),
    );
  };
  const rotateDashboardProfileHubOrbit = (direction: DashboardOrbitDirection) => {
    setActiveDashboardProfileHubMainIndex((currentIndex) =>
      direction === "left"
        ? (currentIndex - 1 + dashboardProfileHubMainItems.length) %
          dashboardProfileHubMainItems.length
        : (currentIndex + 1) % dashboardProfileHubMainItems.length,
    );
  };
  const rotateDashboardProfileHubAccountOrbit = (
    direction: DashboardOrbitDirection,
  ) => {
    setActiveDashboardProfileHubAccountIndex((currentIndex) =>
      direction === "left"
        ? (currentIndex - 1 + dashboardProfileHubAccountItems.length) %
          dashboardProfileHubAccountItems.length
        : (currentIndex + 1) % dashboardProfileHubAccountItems.length,
    );
  };
  const getDashboardProfileHubOrbitDistance = (
    index: number,
    activeIndex: number,
    itemCount: number,
  ) => {
    const rawDistance = index - activeIndex;

    if (rawDistance > itemCount / 2) return rawDistance - itemCount;
    if (rawDistance < -itemCount / 2) return rawDistance + itemCount;

    return rawDistance;
  };
  const dashboardFloatingSnapshotActiveCard =
    clampedDashboardOrbiterRow === 1
      ? activeCommandCenter
      : clampedDashboardOrbiterRow === 2
        ? activeSystemCenter
        : null;
  const dashboardFloatingSnapshotRowCards =
    clampedDashboardOrbiterRow === 1
      ? dashboardCommandCenterCards
      : clampedDashboardOrbiterRow === 2
        ? dashboardSystemCards
        : [];
  const dashboardFloatingSnapshotActiveCardIndex =
    clampedDashboardOrbiterRow === 1
      ? activeCommandCenterIndex
      : clampedDashboardOrbiterRow === 2
        ? activeSystemCenterIndex
        : -1;
  const dashboardFloatingSnapshotCompletion =
    dashboardFloatingSnapshotActiveCard
      ? getDashboardNavigationCardCompletion(dashboardFloatingSnapshotActiveCard)
      : 0;
  const dashboardFloatingSnapshotJourneySteps =
    dashboardFloatingSnapshotActiveCard?.journeySteps || [];
  const dashboardFloatingSnapshotActiveJourneyStepIndex =
    dashboardFloatingSnapshotActiveCard &&
    dashboardFloatingSnapshotJourneySteps.length
      ? (() => {
          const savedIndex =
            activeDashboardJourneyStepIndexes[
              dashboardFloatingSnapshotActiveCard.title
            ];

          if (
            typeof savedIndex === "number" &&
            savedIndex >= 0 &&
            savedIndex < dashboardFloatingSnapshotJourneySteps.length
          ) {
            return savedIndex;
          }

          const activeIndex = dashboardFloatingSnapshotJourneySteps.findIndex(
            (step) => step.state === "active",
          );
          if (activeIndex >= 0) return activeIndex;

          const defaultIndex = dashboardFloatingSnapshotJourneySteps.findIndex(
            (step) => step.state === "default",
          );
          if (defaultIndex >= 0) return defaultIndex;

          const completeIndex = dashboardFloatingSnapshotJourneySteps.findIndex(
            (step) => step.state === "complete",
          );

          return completeIndex >= 0 ? completeIndex : 0;
        })()
      : -1;
  const dashboardFloatingSnapshotActiveJourneyStep =
    dashboardFloatingSnapshotActiveJourneyStepIndex >= 0
      ? dashboardFloatingSnapshotJourneySteps[
          dashboardFloatingSnapshotActiveJourneyStepIndex
        ]
      : null;
  const dashboardWeeklyCaloriesTarget = 14700;
  const dashboardHydrationConsistency =
    dashboardCharts.nutritionConsistency.find(
      (item) => item.label === "Hydration",
    )?.value || 0;
  const dashboardMealConsistency =
    dashboardCharts.nutritionConsistency.find((item) => item.label === "Meals")
      ?.value || 0;
  const dashboardProteinConsistency =
    dashboardCharts.nutritionConsistency.find(
      (item) => item.label === "Protein",
    )?.value || 0;
  const dashboardRecoveryAverage = Math.round(
    dashboardCharts.recoveryTrend.reduce((sum, item) => sum + item.value, 0) /
      dashboardCharts.recoveryTrend.length,
  );
  const dashboardNutritionFavorites =
    dashboardLibraryFavoriteIds.nutrition?.length || 0;
  const getDashboardFloatingSnapshotMetrics = (
    card: DashboardNavigationCard,
    activeStep: DashboardJourneyStep | null,
  ) => {
    const stepLabel = activeStep?.label || "Open hub";
    const progressMetric = {
      label: "Progress",
      value: `${dashboardFloatingSnapshotCompletion}%`,
    };

    if (card.title === "Workout / Sessions") {
      const stepMetric =
        stepLabel === "My Plan"
          ? {
              label: "Weekly Plan",
              value: dashboardSummary.latestTemplate?.title || "Build week",
            }
          : stepLabel === "Workout Builder"
            ? {
                label: "Templates",
                value: `${dashboardSummary.templateCount} saved`,
              }
            : stepLabel === "Exercise Library"
              ? {
                  label: "Exercise Lib",
                  value: `${favoriteExerciseCards.length} saved`,
                }
              : {
                  label: "Inner Focus",
                  value: stepLabel,
                };

      return [
        {
          label: "Weekly Volume",
          value: `${Math.round(dashboardSummary.weeklyVolume).toLocaleString()} lb`,
        },
        {
          label: "Workouts",
          value: `${dashboardSummary.workoutsThisWeek} this week`,
        },
        {
          label: "Weekly Sets",
          value: `${dashboardSummary.weeklySets} sets`,
        },
        stepMetric,
      ];
    }

    if (card.title === "Nutrition / Fuel") {
      const stepMetric =
        stepLabel === "Hydrate"
          ? {
              label: "Hydration",
              value: `${Math.round(dashboardHydrationConsistency)}%`,
            }
          : stepLabel === "Meals"
            ? {
                label: "Meal Rhythm",
                value: `${Math.round(dashboardMealConsistency)}%`,
              }
            : stepLabel === "Grocery"
              ? {
                  label: "Grocery",
                  value: `${dashboardNutritionFavorites} saved`,
                }
              : stepLabel === "Calories"
                ? {
                    label: "Calories",
                    value: `${dashboardWeeklyCaloriesTarget.toLocaleString()} target`,
                  }
                : {
                    label: "Inner Focus",
                    value: stepLabel,
                  };

      return [
        {
          label: "Weekly Calories",
          value: `${dashboardWeeklyCaloriesTarget.toLocaleString()} target`,
        },
        {
          label: "Meal Rhythm",
          value: `${Math.round(dashboardMealConsistency)}%`,
        },
        {
          label: "Protein",
          value: `${Math.round(dashboardProteinConsistency)}%`,
        },
        {
          label: "Saved Fuel",
          value: `${dashboardNutritionFavorites} saved`,
        },
        stepMetric,
      ].filter(
        (metric, metricIndex, metrics) =>
          metrics.findIndex((item) => item.label === metric.label) ===
          metricIndex,
      );
    }

    if (card.title === "Recovery") {
      return [
        {
          label: "Readiness",
          value: `${dashboardRecoveryAverage}%`,
        },
        {
          label: "Training Heat",
          value:
            dashboardSummary.weeklySets > 30
              ? "Manage heat"
              : `${dashboardSummary.weeklySets} sets`,
        },
        {
          label: "Hydration",
          value: `${Math.round(dashboardHydrationConsistency)}%`,
        },
        progressMetric,
      ];
    }

    if (card.title === "Performance") {
      return [
        {
          label: "Weekly Volume",
          value: `${Math.round(dashboardSummary.weeklyVolume).toLocaleString()} lb`,
        },
        {
          label: "Exercises",
          value: `${dashboardSummary.uniqueExerciseCount} unique`,
        },
        {
          label: "Workouts",
          value: `${dashboardSummary.workoutsThisWeek} this week`,
        },
        {
          label: "Inner Focus",
          value: stepLabel,
        },
      ];
    }

    if (card.title === "Stats") {
      return [
        {
          label: "Logged Entries",
          value: `${dashboardSummary.totalLoggedEntries} logs`,
        },
        {
          label: "Weekly Volume",
          value: `${Math.round(dashboardSummary.weeklyVolume).toLocaleString()} lb`,
        },
        {
          label: "Latest",
          value: dashboardSummary.latestExercise,
        },
        progressMetric,
      ];
    }

    if (card.title === "Goals") {
      return [
        {
          label: "Goal Setup",
          value: `${dashboardFoundationProgress.goalsCompletion}%`,
        },
        {
          label: "Focus",
          value: dashboardFoundationProgress.goalFocus || "Choose focus",
        },
        {
          label: "Profile",
          value: `${dashboardFoundationProgress.profileCompletion}%`,
        },
        progressMetric,
      ];
    }

    if (card.title === "Calendar") {
      return [
        {
          label: "Week",
          value: `${dashboardSummary.workoutsThisWeek} workouts`,
        },
        {
          label: "Templates",
          value: `${dashboardSummary.templateCount} saved`,
        },
        {
          label: "Next Plan",
          value: dashboardSummary.latestTemplate?.title || "Build week",
        },
        progressMetric,
      ];
    }

    if (card.title === "Achievements") {
      return [
        {
          label: "Sound Points",
          value: soundPoints.toLocaleString(),
        },
        {
          label: "Tokens",
          value: soundTokens.toLocaleString(),
        },
        {
          label: "Profile",
          value: `${dashboardProfileHubCompletion}%`,
        },
        progressMetric,
      ];
    }

    if (card.title === "Education") {
      return [
        {
          label: "Lessons",
          value: "Technique",
        },
        {
          label: "Training Logic",
          value: `${dashboardSummary.templateCount} templates`,
        },
        {
          label: "Inner Focus",
          value: stepLabel,
        },
        progressMetric,
      ];
    }

    if (card.title === "Sound World") {
      return [
        {
          label: "Sound Points",
          value: soundPoints.toLocaleString(),
        },
        {
          label: "Tokens",
          value: soundTokens.toLocaleString(),
        },
        {
          label: "Inner Focus",
          value: stepLabel,
        },
        progressMetric,
      ];
    }

    return [
      progressMetric,
      {
        label: "Focus",
        value: card.status,
      },
      {
        label: "Active View",
        value: stepLabel,
      },
      {
        label: "Path",
        value: dashboardFloatingSnapshotJourneySteps.length
          ? `${dashboardFloatingSnapshotJourneySteps.length} steps`
          : "Direct hub",
      },
    ];
  };
  const dashboardFloatingSnapshotMetrics = dashboardFloatingSnapshotActiveCard
    ? getDashboardFloatingSnapshotMetrics(
        dashboardFloatingSnapshotActiveCard,
        dashboardFloatingSnapshotActiveJourneyStep,
      )
    : [
        {
          label: "Workouts",
          value: `${dashboardSummary.workoutsThisWeek} this week`,
        },
        {
          label: "Weekly Volume",
          value: `${Math.round(dashboardSummary.weeklyVolume).toLocaleString()} lb`,
        },
        {
          label: "Recovery",
          value:
            dashboardSummary.totalSets > 30 ? "Manage heat" : "Ready to build",
        },
        {
          label: "Performance",
          value: dashboardSummary.hasStats ? "Trend active" : "Start logging",
        },
      ];
  const dashboardFloatingSnapshotTitle =
    dashboardFloatingSnapshotActiveCard?.title || "Weekly Snapshot";
  const dashboardFloatingSnapshotRow =
    dashboardOrbiterRows[clampedDashboardOrbiterRow];
  const dashboardFloatingSnapshotRowTone = getDashboardRowUrgencyTone(
    dashboardFloatingSnapshotRow?.completion || 0,
  );
  const dashboardFloatingSnapshotEyebrow = dashboardFloatingSnapshotActiveCard
    ? dashboardFloatingSnapshotRow?.title || "Dashboard Row"
    : "Weekly Snapshot";
  const dashboardFloatingSnapshotDescription =
    dashboardFloatingSnapshotActiveCard?.description ||
    "Workouts, nutrition, readiness, and performance stay visible as the orbiter moves.";
  const dashboardFloatingSnapshotIcon =
    dashboardFloatingSnapshotActiveCard?.icon || "DB";
  const dashboardFloatingSnapshotIconLabel =
    dashboardFloatingSnapshotActiveCard?.title || "Dashboard";
  const dashboardFloatingSnapshotHref = dashboardFloatingSnapshotActiveCard?.href;
  const dashboardHeaderLinks = [
    {
      completion: dashboardTabCompletions.dashboard,
      href: ROUTES.dashboard.home,
      icon: "dashboard",
      label: "Dashboard",
      meta: "Command",
      points: soundPoints,
      tone:
        "border-cyan-100/50 bg-cyan-300 text-slate-950 shadow-[0_0_26px_rgba(34,211,238,0.24)]",
    },
    {
      completion: dashboardTabCompletions.profile,
      href: ROUTES.dashboard.profile,
      icon: "profile",
      label: "Profile",
      meta: "Identity",
      points: Math.round(soundPoints * 0.94),
      tone:
        "border-cyan-200/30 bg-cyan-300/10 text-cyan-100 hover:border-cyan-100/45 hover:bg-cyan-300/16",
    },
    {
      completion: dashboardTabCompletions.goals,
      href: ROUTES.dashboard.goals,
      icon: "goals",
      label: "Goals",
      meta: "Direction",
      points: Math.round(soundPoints * 0.68),
      tone:
        "border-amber-200/34 bg-amber-300/12 text-amber-100 hover:border-amber-100/45 hover:bg-amber-300/18",
    },
    {
      completion: dashboardTabCompletions.workout,
      href: ROUTES.dashboard.sessions,
      icon: "workout",
      label: "Workout",
      meta: "Sessions",
      points: Math.round(soundPoints * 0.82),
      tone:
        "border-sky-200/28 bg-sky-300/10 text-sky-100 hover:border-sky-100/45 hover:bg-sky-300/16",
    },
    {
      completion: dashboardTabCompletions.nutrition,
      href: ROUTES.nutritionPortal.home,
      icon: "nutrition",
      label: "Nutrition",
      meta: "Fuel",
      points: Math.round(soundPoints * 0.38),
      tone:
        "border-emerald-200/28 bg-emerald-300/10 text-emerald-100 hover:border-emerald-100/45 hover:bg-emerald-300/16",
    },
    {
      completion: dashboardTabCompletions.recovery,
      href: ROUTES.dashboard.recovery,
      icon: "recovery",
      label: "Recovery",
      meta: "Readiness",
      points: Math.round(soundPoints * 0.24),
      tone:
        "border-violet-200/28 bg-violet-300/10 text-violet-100 hover:border-violet-100/45 hover:bg-violet-300/16",
    },
    {
      completion: dashboardTabCompletions.performance,
      href: ROUTES.performance.home,
      icon: "performance",
      label: "Performance",
      meta: "Athletic",
      points: Math.round(soundPoints * 0.46),
      tone:
        "border-amber-200/30 bg-amber-300/10 text-amber-100 hover:border-amber-100/45 hover:bg-amber-300/16",
    },
    {
      completion: dashboardTabCompletions.education,
      href: ROUTES.learning.home,
      icon: "education",
      label: "Education",
      meta: "Learning",
      points: Math.round(soundPoints * 0.12),
      tone:
        "border-blue-200/28 bg-blue-300/10 text-blue-100 hover:border-blue-100/45 hover:bg-blue-300/16",
    },
    {
      completion: dashboardTabCompletions.soundWorld,
      href: ROUTES.soundworld.home,
      icon: "soundworld",
      label: "Sound World",
      meta: "Community",
      points: Math.round(soundPoints * 0.08),
      tone:
        "border-pink-200/28 bg-pink-300/10 text-pink-100 hover:border-pink-100/45 hover:bg-pink-300/16",
    },
  ];
  const activeDashboardHeaderLink =
    dashboardHeaderLinks[
      activeDashboardHeaderIndex % dashboardHeaderLinks.length
    ] || dashboardHeaderLinks[0];
  const dashboardHeaderGoalsLink =
    dashboardHeaderLinks.find(
      (dashboardLink) => dashboardLink.label === "Goals",
    ) || dashboardHeaderLinks[2];
  const rotateDashboardHeaderRail = (direction: "left" | "right") => {
    setDashboardHeaderSlideDirection(direction);
    setActiveDashboardHeaderIndex((currentIndex) =>
      direction === "left"
        ? (currentIndex - 1 + dashboardHeaderLinks.length) %
          dashboardHeaderLinks.length
        : (currentIndex + 1) % dashboardHeaderLinks.length,
    );
  };
  const heroAchievements = [
    {
      category: "volume",
      href: ROUTES.dashboard.achievements,
      icon: "🏋️",
      label: "Volume Milestone",
      meta: "Training volume milestone",
      progress: 100,
      rarity: "gold",
      status: "completed",
      statusLabel: "Earned",
    },
    {
      category: "streak",
      href: ROUTES.dashboard.achievements,
      icon: "🔥",
      label: "5 Day Streak",
      meta: "Consistency streak",
      progress: 100,
      rarity: "gold",
      status: "completed",
      statusLabel: "Earned",
    },
    {
      category: "goal",
      href: ROUTES.dashboard.achievements,
      icon: "🎯",
      label: "Goal Locked",
      meta: "Plan direction set",
      progress: 100,
      rarity: "gold",
      status: "completed",
      statusLabel: "Earned",
    },
    {
      category: "volume",
      href: ROUTES.dashboard.achievements,
      icon: "💪",
      label: "Strength Builder",
      meta: "Progressive overload",
      progress: 72,
      rarity: "cyan",
      status: "active",
      statusLabel: "In progress",
    },
    {
      category: "performance",
      href: ROUTES.dashboard.achievements,
      icon: "🧠",
      label: "Consistency King",
      meta: "AI consistency trend",
      progress: 45,
      rarity: "cyan",
      status: "active",
      statusLabel: "In progress",
    },
    {
      category: "recovery",
      href: ROUTES.dashboard.achievements,
      icon: "😴",
      label: "Sleep Optimized",
      meta: "Recovery rhythm",
      progress: 28,
      rarity: "bronze",
      status: "active",
      statusLabel: "In progress",
    },
    {
      category: "performance",
      href: ROUTES.dashboard.achievements,
      icon: "🏆",
      label: "Elite Performer",
      meta: "Future prestige tier",
      progress: 0,
      rarity: "elite",
      status: "locked",
      statusLabel: "Locked",
    },
    {
      category: "performance",
      href: ROUTES.dashboard.achievements,
      icon: "⚡",
      label: "Power Surge",
      meta: "Explosive performance",
      progress: 0,
      rarity: "silver",
      status: "locked",
      statusLabel: "Locked",
    },
    {
      actionLabel: "Open",
      category: "performance",
      description: "See all badges, progress, and locked rewards.",
      href: ROUTES.dashboard.achievements,
      icon: "\u{1F3C6}",
      label: "View Achievements",
      progress: 100,
      rarity: "gold",
      status: "active",
      variant: "cta",
    },
  ] satisfies AchievementBadgeItem[];
  const heroAchievementCount = heroAchievements.length;
  const rotateHeroAchievement = (direction: DashboardOrbitDirection) => {
    if (heroAchievementCount < 2) return;

    setHeroAchievementSlideDirection(direction);
    setActiveHeroAchievementIndex((currentIndex) =>
      direction === "left"
        ? (currentIndex - 1 + heroAchievementCount) % heroAchievementCount
        : (currentIndex + 1) % heroAchievementCount,
    );
  };
  const getHeroAchievementOrbitDistance = (index: number) => {
    if (heroAchievementCount <= 1) return 0;

    const rawDistance = index - activeHeroAchievementIndex;

    if (rawDistance > heroAchievementCount / 2) {
      return rawDistance - heroAchievementCount;
    }

    if (rawDistance < -heroAchievementCount / 2) {
      return rawDistance + heroAchievementCount;
    }

    return rawDistance;
  };
  const finishHeroAchievementPointer = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    heroAchievementPointerStartRef.current = null;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    }

    if (!heroAchievementPointerMovedRef.current) return;

    event.preventDefault();
    window.setTimeout(() => {
      heroAchievementPointerMovedRef.current = false;
    }, 0);
  };
  const handleHeroAchievementWheel = (
    event: ReactWheelEvent<HTMLDivElement>,
  ) => {
    const horizontalIntent =
      Math.abs(event.deltaX) > Math.abs(event.deltaY) || event.shiftKey;
    const primaryDelta = horizontalIntent
      ? event.shiftKey && Math.abs(event.deltaY) >= Math.abs(event.deltaX)
        ? event.deltaY
        : event.deltaX
      : event.deltaY;

    if (Math.abs(primaryDelta) < 18) return;

    event.preventDefault();
    event.stopPropagation();

    const now = Date.now();
    if (now - heroAchievementWheelLockRef.current < 280) return;

    heroAchievementWheelLockRef.current = now;
    rotateHeroAchievement(primaryDelta > 0 ? "right" : "left");
  };

  const renderDashboardCompletionDot = (
    completion: number,
    isActive = false,
    positionClass = "-bottom-1 -right-1",
  ) => {
    const pulseTone = getDashboardPulseIndicatorTone(completion);

    return (
      <span
        aria-hidden="true"
        className={`profile-row-card-indicator absolute ${positionClass} inline-flex h-4 w-4 items-center justify-center rounded-full border bg-slate-950/78 backdrop-blur ${isActive ? pulseTone.outerActive : pulseTone.outerInactive}`}
        data-active={isActive ? "true" : undefined}
        data-profile-indicator-motion={pulseTone.motion}
        style={pulseTone.style}
      >
        <span
          className={`h-2 w-2 rounded-full ${isActive ? pulseTone.dotActive : pulseTone.dotInactive}`}
          data-profile-pulse-dot="true"
        />
      </span>
    );
  };

  const getDefaultDashboardJourneyStepIndex = (
    steps: DashboardJourneyStep[],
  ) => {
    const activeIndex = steps.findIndex((step) => step.state === "active");
    if (activeIndex >= 0) return activeIndex;

    const defaultIndex = steps.findIndex((step) => step.state === "default");
    if (defaultIndex >= 0) return defaultIndex;

    const completeIndex = steps.findIndex((step) => step.state === "complete");
    return completeIndex >= 0 ? completeIndex : 0;
  };

  const getActiveDashboardJourneyStepIndex = (
    card: DashboardNavigationCard,
  ) => {
    const steps = card.journeySteps || [];
    if (!steps.length) return 0;

    const savedIndex = activeDashboardJourneyStepIndexes[card.title];
    if (
      typeof savedIndex === "number" &&
      savedIndex >= 0 &&
      savedIndex < steps.length
    ) {
      return savedIndex;
    }

    return getDefaultDashboardJourneyStepIndex(steps);
  };

  const getDashboardJourneyStepOrbitDistance = (
    index: number,
    activeIndex: number,
    itemCount: number,
  ) => {
    if (itemCount <= 1) return 0;

    const rawDistance = index - activeIndex;

    if (rawDistance > itemCount / 2) return rawDistance - itemCount;
    if (rawDistance < -itemCount / 2) return rawDistance + itemCount;

    return rawDistance;
  };

  const rotateDashboardJourneyStepOrbit = (
    card: DashboardNavigationCard,
    direction: DashboardOrbitDirection,
  ) => {
    const steps = card.journeySteps || [];
    if (steps.length < 2) return;

    setActiveDashboardJourneyStepIndexes((currentIndexes) => {
      const savedIndex = currentIndexes[card.title];
      const currentIndex =
        typeof savedIndex === "number" &&
        savedIndex >= 0 &&
        savedIndex < steps.length
          ? savedIndex
          : getDefaultDashboardJourneyStepIndex(steps);
      const nextIndex =
        direction === "left"
          ? (currentIndex - 1 + steps.length) % steps.length
          : (currentIndex + 1) % steps.length;

      return {
        ...currentIndexes,
        [card.title]: nextIndex,
      };
    });
  };

  const getDashboardJourneyStepIconTone = (
    step: DashboardJourneyStep,
    isActive: boolean,
  ) => {
    const key = `${step.icon} ${step.label}`.toLowerCase();
    const strength = isActive ? "active" : "idle";

    if (key.includes("hydrate") || key.includes("hydration")) {
      return dashboardIconToneStyles.cyan[strength];
    }
    if (key.includes("meal") || key.includes("nutrition")) {
      return dashboardIconToneStyles.violet[strength];
    }
    if (key.includes("grocery") || key.includes("calories")) {
      return dashboardIconToneStyles.amber[strength];
    }
    if (key.includes("recovery")) {
      return dashboardIconToneStyles.cyan[strength];
    }
    if (key.includes("goal") || key.includes("plan")) {
      return dashboardIconToneStyles.emerald[strength];
    }
    if (
      key.includes("performance") ||
      key.includes("power") ||
      key.includes("run") ||
      key.includes("cardio")
    ) {
      return dashboardIconToneStyles.amber[strength];
    }
    if (key.includes("stat") || key.includes("metric") || key.includes("trend")) {
      return dashboardIconToneStyles.violet[strength];
    }
    if (
      key.includes("sound") ||
      key.includes("world") ||
      key.includes("feed") ||
      key.includes("post") ||
      key.includes("social") ||
      key.includes("trophy") ||
      key.includes("achievement")
    ) {
      return dashboardIconToneStyles.fuchsia[strength];
    }
    if (
      key.includes("education") ||
      key.includes("lesson") ||
      key.includes("logic") ||
      key.includes("form") ||
      key.includes("app")
    ) {
      return dashboardIconToneStyles.sky[strength];
    }

    return dashboardIconToneStyles.cyan[strength];
  };

  const showGoalsQuickLink =
    activeDashboardHeaderLink.label !== dashboardHeaderGoalsLink.label;

  const renderDashboardJourneyStepOrbitPanel = (
    card?: DashboardNavigationCard,
  ) => {
    if (!card) return null;

    const steps = card.journeySteps || [];
    if (!steps.length) return null;

    const activeJourneyStepIndex = getActiveDashboardJourneyStepIndex(card);
    const dashboardJourneyPanelTitle = `${card.title.split(" / ")[0]} Journey`;

    return (
      <div
        className="pointer-events-auto mt-3 pt-0 [perspective:900px]"
        onClick={(event) => event.stopPropagation()}
        onPointerCancel={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
        onPointerMove={(event) => event.stopPropagation()}
        onPointerUp={(event) => event.stopPropagation()}
        onWheel={(event) => {
          const primaryDelta =
            Math.abs(event.deltaX) > Math.abs(event.deltaY)
              ? event.deltaX
              : event.deltaY;
          if (Math.abs(primaryDelta) < 8) return;

          event.preventDefault();
          event.stopPropagation();
          rotateDashboardJourneyStepOrbit(
            card,
            primaryDelta > 0 ? "right" : "left",
          );
        }}
      >
        <div className="relative mb-1 flex min-h-7 items-center justify-center">
          {steps.length > 1 ? (
            <button
              aria-label={`Previous ${card.title} journey step`}
              className="absolute left-0 top-1/2 z-40 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full border border-cyan-200/18 bg-slate-950/72 text-[9px] font-black text-cyan-100 shadow-[0_0_18px_rgba(34,211,238,0.12)] backdrop-blur transition hover:-translate-x-0.5 hover:border-amber-200/42 hover:bg-amber-300/10 hover:text-amber-100 active:scale-95"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                rotateDashboardJourneyStepOrbit(card, "left");
              }}
              type="button"
            >
              &lt;
            </button>
          ) : null}
          <div className="px-10 text-center text-[9px] font-black uppercase tracking-[0.18em] text-cyan-200/70">
            {dashboardJourneyPanelTitle}
          </div>
          {steps.length > 1 ? (
            <button
              aria-label={`Next ${card.title} journey step`}
              className="absolute right-0 top-1/2 z-40 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full border border-cyan-200/18 bg-slate-950/72 text-[9px] font-black text-cyan-100 shadow-[0_0_18px_rgba(34,211,238,0.12)] backdrop-blur transition hover:translate-x-0.5 hover:border-amber-200/42 hover:bg-amber-300/10 hover:text-amber-100 active:scale-95"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                rotateDashboardJourneyStepOrbit(card, "right");
              }}
              type="button"
            >
              &gt;
            </button>
          ) : null}
        </div>

        <div
          aria-label={`${dashboardJourneyPanelTitle} urgency indicators`}
          className="mb-1.5 flex max-w-full items-center justify-center gap-1 overflow-x-auto overscroll-x-contain px-1 scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {steps.map((step, stepIndex) => {
            const isActiveJourneyStep = stepIndex === activeJourneyStepIndex;
            const stepCompletion = getDashboardJourneyStepCompletion(step);
            const stepUrgencyTone = getDashboardRowUrgencyTone(stepCompletion);

            return (
              <button
                aria-label={`Show ${step.label} journey card, ${stepUrgencyTone.label}`}
                aria-pressed={isActiveJourneyStep}
                className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border transition hover:-translate-y-0.5 active:scale-95 ${
                  isActiveJourneyStep
                    ? `${stepUrgencyTone.ring} ${stepUrgencyTone.text} shadow-[0_0_16px_rgba(34,211,238,0.16)]`
                    : "border-white/10 bg-slate-950/54 text-slate-400 hover:border-cyan-200/30 hover:bg-cyan-300/8 hover:text-cyan-100"
                }`}
                key={`${card.title}-${step.label}-journey-indicator`}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setActiveDashboardJourneyStepIndexes((currentIndexes) => ({
                    ...currentIndexes,
                    [card.title]: stepIndex,
                  }));
                }}
                title={`${step.label} - ${stepUrgencyTone.label}`}
                type="button"
              >
                <span className="sr-only">{step.label}</span>
                <DashboardTabIcon
                  className="h-3 w-3"
                  label={step.label}
                  name={step.icon}
                />
              </button>
            );
          })}
        </div>

        <div className="relative h-[106px] overflow-visible [transform-style:preserve-3d]">
          {steps.map((step, stepIndex) => {
            const journeyDistance = getDashboardJourneyStepOrbitDistance(
              stepIndex,
              activeJourneyStepIndex,
              steps.length,
            );
            const journeyAbsDistance = Math.abs(journeyDistance);
            const journeyDirection = Math.sign(journeyDistance);
            const journeySlots = [
              {
                blur: 0,
                opacity: 1,
                rotateY: 0,
                scale: 1,
                width: 152,
                x: 0,
                y: 0,
                zIndex: 34,
              },
              {
                blur: 0.2,
                opacity: 0.74,
                rotateY: -18,
                scale: 0.82,
                width: 112,
                x: 96,
                y: 10,
                zIndex: 24,
              },
              {
                blur: 0.9,
                opacity: 0.34,
                rotateY: -34,
                scale: 0.62,
                width: 92,
                x: 140,
                y: 20,
                zIndex: 14,
              },
              {
                blur: 1.8,
                opacity: 0.14,
                rotateY: -48,
                scale: 0.5,
                width: 78,
                x: 166,
                y: 28,
                zIndex: 6,
              },
            ];
            const journeySlot =
              journeySlots[
                Math.min(journeyAbsDistance, journeySlots.length - 1)
              ];
            const isActiveJourneyStep = journeyDistance === 0;

            return (
              <Link
                aria-current={isActiveJourneyStep ? "step" : undefined}
                className={`dashboard-journey-orbit-card absolute left-1/2 top-1/2 isolate flex h-[96px] flex-col items-center justify-center gap-1.5 overflow-visible rounded-2xl border px-3 text-center transition-[transform,opacity,filter,border-color,background-color,box-shadow] duration-[420ms] hover:-translate-y-0.5 active:scale-[0.98] ${
                  isActiveJourneyStep ? "dashboard-journey-active-card" : ""
                } ${dashboardJourneyStepStyles[step.state]}`}
                href={step.href}
                key={`${card.title}-${step.label}`}
                onClick={(event) => event.stopPropagation()}
                style={{
                  ...dashboardEffectToneStyles[card.tone],
                  filter: `blur(${journeySlot.blur}px)`,
                  opacity: journeySlot.opacity,
                  pointerEvents: journeyAbsDistance > 2 ? "none" : "auto",
                  transform: `translate(-50%, -50%) translateX(${
                    journeyDirection * journeySlot.x
                  }px) translateY(${journeySlot.y}px) scale(${
                    journeySlot.scale
                  }) rotateY(${journeyDirection * journeySlot.rotateY}deg)`,
                  width: `${journeySlot.width}px`,
                  zIndex: journeySlot.zIndex,
                }}
                title={`${card.title}: ${step.label}`}
              >
                <span
                  aria-hidden="true"
                  className={`dashboard-journey-orbit-card__effect ${
                    isActiveJourneyStep
                      ? "dashboard-journey-active-card__effect"
                      : ""
                  }`}
                />
                <span
                  className={`relative z-10 grid shrink-0 place-items-center rounded-full border ${
                    isActiveJourneyStep ? "h-10 w-10" : "h-8 w-8"
                  } ${getDashboardJourneyStepIconTone(
                    step,
                    isActiveJourneyStep,
                  )}`}
                  aria-hidden="true"
                >
                  <DashboardTabIcon
                    className={
                      isActiveJourneyStep
                        ? "h-[22px] w-[22px] drop-shadow-[0_0_10px_rgba(255,255,255,0.28)]"
                        : "h-5 w-5 drop-shadow-[0_0_8px_rgba(255,255,255,0.22)]"
                    }
                    label={step.label}
                    name={step.icon}
                  />
                </span>
                <span
                  className={`relative z-10 line-clamp-2 min-h-[1.35rem] max-w-full px-1 font-black uppercase leading-[1.08] tracking-[0.08em] drop-shadow-[0_1px_8px_rgba(2,6,23,0.7)] ${
                    isActiveJourneyStep
                      ? "text-[10px] text-white"
                      : "text-[8px] text-slate-100/90"
                  }`}
                >
                  {step.label}
                </span>
                {renderDashboardCompletionDot(
                  getDashboardJourneyStepCompletion(step),
                  isActiveJourneyStep || step.state === "complete",
                  "-bottom-2 -right-2 z-30",
                )}
              </Link>
            );
          })}
        </div>
      </div>
    );
  };

  const renderDashboardOrbitCardRow = ({
    cards,
    description,
    getDistance,
    kicker,
    pointerMovedRef,
    pointerStartRef,
    rotateOrbit,
    rowIndex,
    setActiveIndex,
    title,
  }: {
    cards: DashboardNavigationCard[];
    description: string;
    getDistance: (index: number) => number;
    kicker: string;
    pointerMovedRef: DashboardPointerMovedRef;
    pointerStartRef: DashboardPointerStartRef;
    rotateOrbit: (direction: DashboardOrbitDirection) => void;
    rowIndex: number;
    setActiveIndex: (index: number) => void;
    title: string;
  }) => (
    <div
      data-dashboard-orbiter-row={rowIndex}
      className={`relative min-h-0 w-full overflow-hidden px-10 pt-20 transition-opacity duration-300 sm:px-12 sm:pt-24 lg:pt-28 ${
        clampedDashboardOrbiterRow === rowIndex
          ? "pointer-events-auto opacity-100"
          : "pointer-events-none opacity-40"
      }`}
    >
      <button
        aria-label={`Previous ${title}`}
        className="absolute left-2 top-[44%] z-40 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-cyan-200/24 bg-slate-950/60 text-2xl font-black text-cyan-100 shadow-[0_0_30px_rgba(34,211,238,0.16)] backdrop-blur transition hover:-translate-x-0.5 hover:border-amber-200/45 hover:bg-amber-300/10 hover:text-amber-100 hover:shadow-[0_0_38px_rgba(250,204,21,0.18)] active:scale-95 sm:left-4 sm:h-14 sm:w-14 sm:text-3xl lg:left-6 xl:left-8"
        onClick={() => rotateOrbit("left")}
        type="button"
      >
        &lt;
      </button>
      <button
        aria-label={`Next ${title}`}
        className="absolute right-[12.5rem] top-[44%] z-40 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-cyan-200/24 bg-slate-950/60 text-2xl font-black text-cyan-100 shadow-[0_0_30px_rgba(34,211,238,0.16)] backdrop-blur transition hover:translate-x-0.5 hover:border-amber-200/45 hover:bg-amber-300/10 hover:text-amber-100 hover:shadow-[0_0_38px_rgba(250,204,21,0.18)] active:scale-95 sm:right-[13rem] sm:h-14 sm:w-14 sm:text-3xl lg:right-[13.75rem] xl:right-[14.5rem]"
        onClick={() => rotateOrbit("right")}
        type="button"
      >
        &gt;
      </button>

      <div className="sr-only">
        {kicker}. {title}. {description}
      </div>

      <div
        aria-label={`${title} orbit selector`}
        className="relative z-10 mx-auto h-[410px] w-full max-w-[1120px] cursor-grab select-none overflow-hidden outline-none [perspective:1500px] [touch-action:pan-y] active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-cyan-200/45 sm:h-[460px]"
        onClickCapture={(event) => {
          if (pointerMovedRef.current) {
            event.preventDefault();
            event.stopPropagation();
            pointerMovedRef.current = false;
          }
        }}
        onKeyDown={(event) => handleDashboardOrbitKeyDown(event, rotateOrbit)}
        onPointerCancel={(event) => {
          pointerStartRef.current = null;
          if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
            event.currentTarget.releasePointerCapture?.(event.pointerId);
          }
        }}
        onPointerDown={(event) =>
          handleDashboardOrbitPointerDown(
            event,
            pointerStartRef,
            pointerMovedRef,
          )
        }
        onPointerMove={(event) =>
          handleDashboardOrbitPointerMove(
            event,
            pointerStartRef,
            pointerMovedRef,
            rotateOrbit,
          )
        }
        onPointerUp={(event) =>
          handleDashboardOrbitPointerUp(
            event,
            pointerStartRef,
            pointerMovedRef,
            rotateOrbit,
            setActiveIndex,
          )
        }
        onWheel={(event) => handleDashboardOrbitWheel(event, rotateOrbit)}
        onWheelCapture={(event) => handleDashboardOrbitWheel(event, rotateOrbit)}
        tabIndex={0}
      >
        {cards.map((card, index) => {
          const distance = getDistance(index);
          const absDistance = Math.abs(distance);
          const direction = Math.sign(distance);
          const orbitSlots = [
            { blur: 0, opacity: 1, rotateY: 0, scale: 1, x: 0, y: -8, zIndex: 42 },
            { blur: 0, opacity: 0.74, rotateY: -16, scale: 0.8, x: 214, y: 18, zIndex: 32 },
            { blur: 0.7, opacity: 0.48, rotateY: -28, scale: 0.63, x: 294, y: 58, zIndex: 20 },
            { blur: 1.35, opacity: 0.3, rotateY: -38, scale: 0.5, x: 198, y: 96, zIndex: 12 },
            { blur: 2.1, opacity: 0.18, rotateY: -48, scale: 0.42, x: 72, y: 126, zIndex: 8 },
          ];
          const slot = orbitSlots[Math.min(absDistance, orbitSlots.length - 1)];
          const tone = dashboardToneStyles[card.tone];
          const isActive = distance === 0;

          return (
            <article
              aria-label={
                isActive ? `${card.title} selected` : `Select ${card.title}`
              }
              aria-pressed={isActive}
              data-dashboard-orbit-card-index={index}
              className={`dashboard-orbit-card group absolute left-1/2 top-1/2 w-[270px] overflow-hidden rounded-[30px] border p-5 text-left shadow-2xl transition-[border-color,background-color,box-shadow] duration-300 sm:w-[340px] ${
                isActive
                  ? "dashboard-orbit-card--active border-cyan-200/45 bg-slate-950/86 shadow-cyan-950/35"
                  : "border-white/10 bg-slate-950/64 shadow-black/30 hover:border-cyan-200/28 hover:bg-slate-950/78"
              }`}
              key={card.title}
              onClick={() => {
                if (pointerMovedRef.current) {
                  pointerMovedRef.current = false;
                  return;
                }

                setActiveIndex(index);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setActiveIndex(index);
                }
              }}
              role="button"
              style={{
                ...dashboardEffectToneStyles[card.tone],
                filter: `blur(${slot.blur}px)`,
                opacity: slot.opacity,
                transform: `translate(-50%, -50%) translateX(${
                  direction * slot.x
                }px) translateY(${slot.y}px) scale(${slot.scale}) rotateY(${
                  direction * slot.rotateY
                }deg)`,
                transition:
                  "transform 560ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 360ms ease, filter 360ms ease",
                zIndex: slot.zIndex,
              }}
              tabIndex={0}
            >
              <span
                aria-hidden="true"
                className="dashboard-orbit-card__effect"
              />
              <span
                className={`absolute left-6 right-6 top-0 z-10 h-[2px] rounded-full ${tone.line}`}
              />
              <div className="relative z-10 flex items-start justify-between gap-3">
                <span
                  className={`relative flex shrink-0 items-center justify-center rounded-[24px] border ${
                    isActive ? "h-16 w-16" : "h-14 w-14"
                  } ${dashboardIconToneStyles[card.tone][
                    isActive ? "active" : "idle"
                  ]}`}
                  aria-hidden="true"
                >
                  <DashboardTabIcon
                    className={
                      isActive
                        ? "h-8 w-8 drop-shadow-[0_0_12px_rgba(255,255,255,0.26)]"
                        : "h-7 w-7 drop-shadow-[0_0_9px_rgba(255,255,255,0.18)]"
                    }
                    label={card.title}
                    name={card.icon}
                  />
                  {renderDashboardCompletionDot(
                    getDashboardNavigationCardCompletion(card),
                    isActive,
                  )}
                </span>
                <span
                  className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${
                    isActive
                      ? "border-cyan-200/45 bg-cyan-300/12 text-cyan-50"
                      : "border-white/10 bg-white/[0.04] text-slate-400"
                  }`}
                >
                  {card.status}
                </span>
              </div>
              <h3 className="relative z-10 mt-4 text-xl font-black tracking-tight text-white">
                {card.title}
              </h3>
              <p className="relative z-10 mt-2 text-sm leading-6 text-slate-400">
                {card.description}
              </p>
              {isActive ? (
                <div className="relative z-10">
                  {renderDashboardJourneyStepOrbitPanel(card)}
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </div>
  );

  const renderDashboardFloatingSnapshotHeader = () => {
    if (clampedDashboardOrbiterRow === 0) return null;

    return (
    <div className="pointer-events-none absolute inset-x-0 top-[118px] z-[70] px-3 sm:top-[122px] sm:px-5 lg:top-[126px] lg:px-8">
      <section className="pointer-events-auto mx-auto max-w-[1280px] overflow-hidden rounded-[22px] border border-white/12 bg-[radial-gradient(circle_at_14%_0%,rgba(34,211,238,0.18),transparent_32%),radial-gradient(circle_at_88%_16%,rgba(250,204,21,0.11),transparent_28%),linear-gradient(135deg,rgba(15,23,42,0.72),rgba(2,6,23,0.58))] p-2.5 shadow-[0_18px_60px_rgba(0,0,0,0.30),0_0_28px_rgba(34,211,238,0.08),inset_0_1px_0_rgba(255,255,255,0.10)] backdrop-blur-xl sm:p-3">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-2 lg:max-w-[500px]">
            <span
              className="grid h-10 w-10 shrink-0 place-items-center rounded-[18px] border border-cyan-200/22 bg-cyan-300/12 text-xs font-black text-cyan-50 shadow-[0_0_18px_rgba(34,211,238,0.12)]"
              aria-hidden="true"
            >
              <DashboardTabIcon
                label={dashboardFloatingSnapshotIconLabel}
                name={dashboardFloatingSnapshotIcon}
              />
            </span>
            <div className="min-w-0">
              {clampedDashboardOrbiterRow === 0 ? null : (
                <div
                  className={`flex max-w-full items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.18em] ${dashboardFloatingSnapshotRowTone.text}`}
                >
                  <span
                    aria-hidden="true"
                    className={`grid h-4 w-4 shrink-0 place-items-center rounded-full border ${dashboardFloatingSnapshotRowTone.ring}`}
                  >
                    <span
                      className={`grid h-3 w-3 place-items-center rounded-full text-[7px] font-black leading-none text-slate-950 ${dashboardFloatingSnapshotRowTone.dot}`}
                    >
                      {dashboardFloatingSnapshotRowTone.icon}
                    </span>
                  </span>
                  <span className="min-w-0 truncate">
                    {dashboardFloatingSnapshotEyebrow}
                  </span>
                </div>
              )}
              {clampedDashboardOrbiterRow === 0 ? null : (
                <h2 className="mt-0.5 truncate text-lg font-black uppercase tracking-[0.08em] text-white sm:text-xl">
                  {dashboardFloatingSnapshotTitle}
                </h2>
              )}
              {dashboardFloatingSnapshotRowCards.length ? (
                <div
                  aria-label={`${dashboardFloatingSnapshotEyebrow} card indicators`}
                  className="mt-1.5 flex max-w-full items-center gap-1 overflow-x-auto overscroll-x-contain scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                >
                  {dashboardFloatingSnapshotRowCards.map((card, cardIndex) => {
                    const isActiveCard =
                      cardIndex === dashboardFloatingSnapshotActiveCardIndex;
                    const cardTone = getDashboardRowUrgencyTone(
                      getDashboardNavigationCardCompletion(card),
                    );

                    return (
                      <button
                        aria-label={`Show ${card.title} card, ${cardTone.label}`}
                        aria-pressed={isActiveCard}
                        className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border transition hover:-translate-y-0.5 active:scale-95 ${
                          isActiveCard
                            ? `${cardTone.ring} ${cardTone.text} shadow-[0_0_18px_rgba(34,211,238,0.16)]`
                            : "border-white/10 bg-slate-950/54 text-slate-400 hover:border-cyan-200/30 hover:bg-cyan-300/8 hover:text-cyan-100"
                        }`}
                        key={`${dashboardFloatingSnapshotEyebrow}-${card.title}`}
                        onClick={() => {
                          if (clampedDashboardOrbiterRow === 1) {
                            setActiveCommandCenterIndex(cardIndex);
                            return;
                          }

                          if (clampedDashboardOrbiterRow === 2) {
                            setActiveSystemCenterIndex(cardIndex);
                          }
                        }}
                        title={`${card.title} - ${cardTone.label}`}
                        type="button"
                      >
                        <span className="sr-only">{card.title}</span>
                        <DashboardTabIcon
                          className="h-3 w-3"
                          label={card.title}
                          name={card.icon}
                        />
                      </button>
                    );
                  })}
                </div>
              ) : null}
              <p className="mt-0.5 line-clamp-1 text-[11px] font-semibold leading-4 text-slate-400">
                {dashboardFloatingSnapshotDescription}
              </p>
            </div>
          </div>

          <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto overscroll-x-contain scroll-smooth [scrollbar-width:none] lg:max-w-[640px] [&::-webkit-scrollbar]:hidden">
            {dashboardFloatingSnapshotMetrics.map((metric) => (
              <div
                key={metric.label}
                className="min-w-[112px] flex-1 rounded-2xl border border-white/10 bg-slate-950/46 px-2.5 py-2 shadow-inner shadow-white/5"
              >
                <div className="text-[8px] font-black uppercase tracking-[0.15em] text-slate-500">
                  {metric.label}
                </div>
                <div className="mt-0.5 truncate text-sm font-black text-white">
                  {metric.value}
                </div>
              </div>
            ))}
            {dashboardFloatingSnapshotHref ? (
              <Link
                className="inline-flex min-h-[42px] shrink-0 items-center justify-center rounded-2xl border border-cyan-200/35 bg-cyan-300/14 px-3.5 text-[11px] font-black uppercase tracking-[0.14em] text-cyan-50 shadow-[0_0_20px_rgba(34,211,238,0.12)] transition hover:-translate-y-0.5 hover:bg-cyan-300/20 active:scale-[0.98]"
                href={dashboardFloatingSnapshotHref}
              >
                Open
              </Link>
            ) : null}
          </div>
        </div>
      </section>
    </div>
    );
  };

  const renderDashboardProfileHubOrbitCard = ({
    activeIndex,
    index,
    item,
    itemCount,
    setActiveIndex,
  }: {
    activeIndex: number;
    index: number;
    item: DashboardProfileHubOrbitItem;
    itemCount: number;
    setActiveIndex: (index: number) => void;
  }) => {
    const distance = getDashboardProfileHubOrbitDistance(
      index,
      activeIndex,
      itemCount,
    );
    const absDistance = Math.abs(distance);
    const clampedDistance = Math.max(-3, Math.min(3, distance));
    const xSlots = [0, 252, 398, 516];
    const x =
      Math.sign(clampedDistance) *
      xSlots[Math.min(absDistance, xSlots.length - 1)];
    const y = absDistance * 18 + (absDistance > 1 ? 8 : 0);
    const isActive = distance === 0;
    const scale = isActive ? 1.04 : absDistance === 1 ? 0.82 : 0.64;
    const opacity = isActive ? 1 : absDistance === 1 ? 0.76 : 0.34;
    const rotateY = clampedDistance * -18;

    return (
      <article
        aria-current={isActive ? "page" : undefined}
        className={`absolute left-1/2 top-1/2 rounded-[28px] border text-left shadow-[0_18px_44px_rgba(0,0,0,0.38)] outline-none backdrop-blur transition-[transform,opacity,filter,border-color,background-color,box-shadow,width,padding] duration-[520ms] ease-[cubic-bezier(0.2,0.85,0.25,1)] ${
          isActive
            ? "p-5 ring-2 ring-cyan-100/24"
            : "cursor-pointer p-4 hover:border-white/25"
        } ${item.tone}`}
        key={item.label}
        onClick={() => {
          if (!isActive) setActiveIndex(index);
        }}
        onKeyDown={(event) => {
          if (event.key !== "Enter" && event.key !== " ") return;

          event.preventDefault();
          if (!isActive) setActiveIndex(index);
        }}
        role="button"
        style={{
          filter: absDistance > 2 ? "blur(1.4px)" : "none",
          opacity,
          transform: `translate(-50%, -50%) translateX(${x}px) translateY(${y}px) rotateY(${rotateY}deg) scale(${scale})`,
          width: isActive ? "min(84vw, 336px)" : "190px",
          zIndex: 40 - absDistance,
        }}
        tabIndex={0}
      >
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className={`grid shrink-0 place-items-center rounded-2xl border border-white/12 bg-slate-950/42 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] ${
              isActive ? "h-12 w-12" : "h-10 w-10"
            }`}
          >
            <DashboardTabIcon
              className={isActive ? "h-6 w-6" : "h-5 w-5"}
              name={item.icon}
            />
          </span>
          <div className="min-w-0">
            <div className="truncate text-[10px] font-black uppercase tracking-[0.12em] text-white">
              {item.label}
            </div>
            <div className="mt-1 truncate text-[10px] font-black uppercase tracking-[0.12em] text-current/80">
              {item.stat}
            </div>
          </div>
        </div>

        <p
          className={`mt-3 font-semibold text-slate-300 ${
            isActive
              ? "line-clamp-3 text-xs leading-5"
              : "line-clamp-2 text-[10px] leading-4"
          }`}
        >
          {item.helper}
        </p>

        {isActive ? (
          <>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {item.references.map((reference) => (
                <span
                  className="rounded-full border border-white/10 bg-white/[0.045] px-2 py-1 text-[8px] font-black uppercase tracking-[0.1em] text-slate-200"
                  key={`${item.label}-${reference}`}
                >
                  {reference}
                </span>
              ))}
            </div>
            <Link
              className="mt-4 inline-flex min-h-[42px] w-full items-center justify-center rounded-2xl border border-cyan-200/32 bg-cyan-300/14 px-4 text-[10px] font-black uppercase tracking-[0.14em] text-cyan-50 shadow-[0_0_24px_rgba(34,211,238,0.12)] transition hover:-translate-y-0.5 hover:border-cyan-100/48 hover:bg-cyan-300/20"
              href={item.href}
              onClick={closeDashboardProfileHub}
            >
              Open {item.label}
            </Link>
          </>
        ) : null}
      </article>
    );
  };

  const renderDashboardProfileHubRowIndicators = ({
    activeIndex,
    items,
    setActiveIndex,
    tone,
  }: {
    activeIndex: number;
    items: DashboardProfileHubOrbitItem[];
    setActiveIndex: (index: number) => void;
    tone: "amber" | "cyan";
  }) => (
    <div className="pointer-events-auto mt-2 flex justify-center gap-1.5">
      {items.map((item, index) => {
        const isActive = index === activeIndex;
        const activeClasses =
          tone === "cyan"
            ? "border-cyan-100/55 bg-cyan-300/18 text-cyan-50 shadow-[0_0_16px_rgba(34,211,238,0.22)]"
            : "border-amber-100/55 bg-amber-300/18 text-amber-50 shadow-[0_0_16px_rgba(250,204,21,0.18)]";
        const idleClasses =
          tone === "cyan"
            ? "border-cyan-100/14 bg-cyan-300/[0.06] text-cyan-100/55 hover:border-cyan-100/35 hover:bg-cyan-300/12 hover:text-cyan-50"
            : "border-amber-100/14 bg-amber-300/[0.06] text-amber-100/55 hover:border-amber-100/35 hover:bg-amber-300/12 hover:text-amber-50";

        return (
          <button
            aria-label={`Show ${item.label} profile hub card`}
            aria-pressed={isActive}
            className={`grid h-7 w-7 place-items-center rounded-full border transition active:scale-95 ${
              isActive ? activeClasses : idleClasses
            }`}
            key={item.label}
            onClick={(event) => {
              event.stopPropagation();
              setActiveIndex(index);
            }}
            title={item.label}
            type="button"
          >
            <span className="sr-only">{item.label}</span>
            <DashboardTabIcon
              className="h-3.5 w-3.5"
              label={item.label}
              name={item.icon}
            />
          </button>
        );
      })}
    </div>
  );

  const renderDashboardProfileHubOverlay = () => {
    if (!dashboardProfileHubOpen) return null;

    const layerStyle = (layer: number) => {
      const offset = layer - activeDashboardProfileHubLayer;
      const absOffset = Math.abs(offset);

      return {
        filter: absOffset > 1 ? "blur(5px)" : absOffset ? "blur(1px)" : "none",
        opacity: absOffset === 0 ? 1 : absOffset === 1 ? 0.42 : 0,
        pointerEvents: absOffset === 0 ? "auto" : "none",
        transform: `translateY(${offset * 54}%) scale(${
          absOffset === 0 ? 1 : absOffset === 1 ? 0.9 : 0.82
        })`,
        zIndex: 30 - absOffset,
      } as CSSProperties;
    };

    return (
      <div
        aria-modal="true"
        className="fixed inset-0 z-[240] overflow-hidden"
        id="dashboard-profile-hub-orbital-overlay"
        role="dialog"
      >
        <button
          aria-label="Close profile hub overlay"
          className="absolute inset-0 bg-slate-950/82 backdrop-blur-xl"
          onClick={closeDashboardProfileHub}
          type="button"
        />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(34,211,238,0.20),transparent_34%),radial-gradient(circle_at_82%_18%,rgba(250,204,21,0.13),transparent_30%),linear-gradient(180deg,rgba(2,6,23,0.34),rgba(2,6,23,0.92))]" />

        <button
          aria-label="Close profile hub"
          className="absolute right-5 top-5 z-50 grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-slate-950/72 text-xs font-black text-slate-300 shadow-[0_18px_44px_rgba(0,0,0,0.34)] backdrop-blur transition hover:border-cyan-200/40 hover:bg-cyan-300/10 hover:text-cyan-100"
          onClick={closeDashboardProfileHub}
          type="button"
        >
          X
        </button>

        <div className="absolute left-5 top-1/2 z-50 flex -translate-y-1/2 flex-col gap-2 rounded-[26px] border border-white/10 bg-slate-950/54 p-2 shadow-[0_18px_54px_rgba(0,0,0,0.38)] backdrop-blur-xl">
          <button
            aria-label="Move profile hub layer up"
            className="grid h-9 w-10 place-items-center rounded-2xl border border-cyan-200/18 bg-cyan-300/10 text-xs font-black text-cyan-100 transition hover:border-cyan-200/42 hover:bg-cyan-300/16 disabled:cursor-not-allowed disabled:opacity-35"
            disabled={activeDashboardProfileHubLayer === 0}
            onClick={() => rotateDashboardProfileHubLayer("up")}
            type="button"
          >
            ^
          </button>
          {dashboardProfileHubLayerMenuItems.map((item) => {
            const isActive = item.layer === activeDashboardProfileHubLayer;

            return (
              <button
                aria-label={`Show ${item.label} layer`}
                aria-pressed={isActive}
                className={`grid h-12 w-10 place-items-center rounded-2xl border text-[8px] font-black uppercase tracking-[0.09em] transition ${
                  isActive
                    ? "border-cyan-100/44 bg-cyan-300/16 text-cyan-50 shadow-[0_0_24px_rgba(34,211,238,0.18)]"
                    : "border-white/10 bg-white/[0.04] text-slate-500 hover:border-amber-200/28 hover:bg-amber-300/10 hover:text-amber-100"
                }`}
                key={item.label}
                onClick={() => selectDashboardProfileHubLayer(item.layer)}
                type="button"
              >
                {item.label.split(" ")[0]}
              </button>
            );
          })}
          <button
            aria-label="Move profile hub layer down"
            className="grid h-9 w-10 place-items-center rounded-2xl border border-amber-200/18 bg-amber-300/10 text-xs font-black text-amber-100 transition hover:border-amber-200/42 hover:bg-amber-300/16 disabled:cursor-not-allowed disabled:opacity-35"
            disabled={activeDashboardProfileHubLayer === 2}
            onClick={() => rotateDashboardProfileHubLayer("down")}
            type="button"
          >
            v
          </button>
        </div>

        <div className="absolute inset-0 [perspective:1500px] [transform-style:preserve-3d]">
          <section
            className="absolute inset-0 transition-[transform,opacity,filter] duration-[560ms] ease-[cubic-bezier(0.2,0.85,0.25,1)]"
            style={layerStyle(0)}
          >
            <div className="absolute inset-x-0 top-[32%] z-20 flex -translate-y-1/2 justify-center px-4 [transform:translateY(-50%)_translateZ(58px)] sm:px-6">
              <div className="grid w-[min(90vw,900px)] gap-4 rounded-[28px] border border-cyan-100/22 bg-slate-950/76 p-4 text-left shadow-[0_24px_64px_rgba(0,0,0,0.42),0_0_30px_rgba(34,211,238,0.12)] sm:p-5 md:grid-cols-[minmax(0,1fr)_minmax(220px,260px)] md:items-stretch">
                <div className="flex min-w-0 items-center gap-4">
                  <Image
                    alt={`${firstName} profile`}
                    className="h-14 w-14 rounded-full border border-cyan-100/30 bg-slate-950 object-contain p-1 shadow-[0_0_24px_rgba(34,211,238,0.18)] sm:h-16 sm:w-16"
                    height={56}
                    src="/sound-fitness-logo.png"
                    width={56}
                  />
                  <div className="min-w-0">
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-100 sm:text-[10px]">
                      Profile Reward Hub
                    </p>
                    <p className="mt-1 truncate text-lg font-black text-white sm:text-xl">
                      {firstName}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-xs font-semibold leading-5 text-slate-400 sm:text-sm">
                      Profile, rewards, coach context, and account controls.
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {[
                        `${dashboardProfileHubCompletion}% profile`,
                        dashboardFoundationProgress.goalFocus || "Goals open",
                        dashboardSummary.hasStats ? "Stats active" : "Stats open",
                      ].map((reference) => (
                        <span
                          className="rounded-2xl border border-white/10 bg-white/[0.045] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.1em] text-slate-200"
                          key={reference}
                        >
                          {reference}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="grid w-full shrink-0 gap-2 sm:grid-cols-2 md:w-auto md:grid-cols-1">
                  <div className="rounded-2xl border border-amber-200/22 bg-amber-300/10 px-3 py-2.5">
                    <div className="text-[8px] font-black uppercase tracking-[0.14em] text-amber-100/70">
                      Sound Points
                    </div>
                    <div className="text-lg font-black text-white sm:text-xl">
                      {soundPoints.toLocaleString()}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-cyan-200/18 bg-cyan-300/10 px-3 py-2.5">
                    <div className="text-[8px] font-black uppercase tracking-[0.14em] text-cyan-100/70">
                      Sound Tokens
                    </div>
                    <div className="flex items-center gap-2 text-lg font-black text-white sm:text-xl">
                      <Image
                        alt=""
                        aria-hidden="true"
                        className="h-5 w-5 rounded-full object-contain"
                        height={20}
                        src="/sound-fitness-logo.png"
                        width={20}
                      />
                      {soundTokens.toLocaleString()}
                    </div>
                  </div>
                </div>
                <Link
                  className="inline-flex min-h-[42px] items-center justify-center rounded-2xl border border-cyan-200/32 bg-cyan-300/14 px-4 text-[11px] font-black uppercase tracking-[0.14em] text-cyan-50 transition hover:-translate-y-0.5 hover:bg-cyan-300/20 md:col-span-2"
                  href={ROUTES.dashboard.profile}
                  onClick={closeDashboardProfileHub}
                >
                  Open Full Profile
                </Link>
              </div>
            </div>
          </section>

          <section
            className="absolute inset-0 transition-[transform,opacity,filter] duration-[560ms] ease-[cubic-bezier(0.2,0.85,0.25,1)]"
            style={layerStyle(1)}
          >
            <div className="pointer-events-none absolute left-1/2 top-[26%] z-40 w-[min(88vw,460px)] -translate-x-1/2 rounded-2xl border border-cyan-200/24 bg-cyan-300/10 px-3 py-2 text-center text-cyan-100 shadow-[0_16px_44px_rgba(0,0,0,0.28)] backdrop-blur">
              <div className="text-[9px] font-black uppercase tracking-[0.16em]">
                My Hub Row
              </div>
              <div className="mt-1 text-[10px] font-bold leading-4 text-slate-300">
                Profile stats, body context, readiness, plan, and coach notes.
              </div>
              {renderDashboardProfileHubRowIndicators({
                activeIndex: activeDashboardProfileHubMainIndex,
                items: dashboardProfileHubMainItems,
                setActiveIndex: setActiveDashboardProfileHubMainIndex,
                tone: "cyan",
              })}
            </div>
            <button
              aria-label="Previous profile hub card"
              className="absolute left-[8%] top-1/2 z-40 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-cyan-200/24 bg-slate-950/72 text-lg font-black text-cyan-100 shadow-[0_0_22px_rgba(34,211,238,0.14)] backdrop-blur transition hover:-translate-x-0.5 hover:border-amber-200/45 hover:bg-amber-300/10 hover:text-amber-100"
              onClick={() => rotateDashboardProfileHubOrbit("left")}
              type="button"
            >
              &lt;
            </button>
            <button
              aria-label="Next profile hub card"
              className="absolute right-[8%] top-1/2 z-40 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-cyan-200/24 bg-slate-950/72 text-lg font-black text-cyan-100 shadow-[0_0_22px_rgba(34,211,238,0.14)] backdrop-blur transition hover:translate-x-0.5 hover:border-amber-200/45 hover:bg-amber-300/10 hover:text-amber-100"
              onClick={() => rotateDashboardProfileHubOrbit("right")}
              type="button"
            >
              &gt;
            </button>
            <div className="absolute inset-x-0 top-[56%] h-[360px] -translate-y-1/2 [transform-style:preserve-3d]">
              <span
                aria-hidden="true"
                className="pointer-events-none absolute left-1/2 top-1/2 h-[230px] w-[min(88vw,1120px)] -translate-x-1/2 -translate-y-1/2 rounded-[46px] bg-[radial-gradient(ellipse_at_center,rgba(34,211,238,0.11),rgba(99,102,241,0.08)_42%,transparent_74%)] blur-xl"
              />
              {dashboardProfileHubMainItems.map((item, index) =>
                renderDashboardProfileHubOrbitCard({
                  activeIndex: activeDashboardProfileHubMainIndex,
                  index,
                  item,
                  itemCount: dashboardProfileHubMainItems.length,
                  setActiveIndex: setActiveDashboardProfileHubMainIndex,
                }),
              )}
            </div>
          </section>

          <section
            className="absolute inset-0 transition-[transform,opacity,filter] duration-[560ms] ease-[cubic-bezier(0.2,0.85,0.25,1)]"
            style={layerStyle(2)}
          >
            <div className="pointer-events-none absolute left-1/2 top-[26%] z-40 w-[min(88vw,430px)] -translate-x-1/2 rounded-2xl border border-amber-200/24 bg-amber-300/10 px-3 py-2 text-center text-amber-100 shadow-[0_16px_44px_rgba(0,0,0,0.28)] backdrop-blur">
              <div className="text-[9px] font-black uppercase tracking-[0.16em]">
                Account Row
              </div>
              <div className="mt-1 text-[10px] font-bold leading-4 text-slate-300">
                Settings, billing, help, and achievements.
              </div>
              {renderDashboardProfileHubRowIndicators({
                activeIndex: activeDashboardProfileHubAccountIndex,
                items: dashboardProfileHubAccountItems,
                setActiveIndex: setActiveDashboardProfileHubAccountIndex,
                tone: "amber",
              })}
            </div>
            <button
              aria-label="Previous account card"
              className="absolute left-[8%] top-1/2 z-40 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-amber-200/24 bg-slate-950/72 text-lg font-black text-amber-100 shadow-[0_0_22px_rgba(250,204,21,0.12)] backdrop-blur transition hover:-translate-x-0.5 hover:border-cyan-200/45 hover:bg-cyan-300/10 hover:text-cyan-100"
              onClick={() => rotateDashboardProfileHubAccountOrbit("left")}
              type="button"
            >
              &lt;
            </button>
            <button
              aria-label="Next account card"
              className="absolute right-[8%] top-1/2 z-40 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-amber-200/24 bg-slate-950/72 text-lg font-black text-amber-100 shadow-[0_0_22px_rgba(250,204,21,0.12)] backdrop-blur transition hover:translate-x-0.5 hover:border-cyan-200/45 hover:bg-cyan-300/10 hover:text-cyan-100"
              onClick={() => rotateDashboardProfileHubAccountOrbit("right")}
              type="button"
            >
              &gt;
            </button>
            <div className="absolute inset-x-0 top-[56%] h-[360px] -translate-y-1/2 [transform-style:preserve-3d]">
              <span
                aria-hidden="true"
                className="pointer-events-none absolute left-1/2 top-1/2 h-[204px] w-[min(84vw,1000px)] -translate-x-1/2 -translate-y-1/2 rounded-[42px] bg-[radial-gradient(ellipse_at_center,rgba(250,204,21,0.10),rgba(34,211,238,0.07)_44%,transparent_74%)] blur-xl"
              />
              {dashboardProfileHubAccountItems.map((item, index) =>
                renderDashboardProfileHubOrbitCard({
                  activeIndex: activeDashboardProfileHubAccountIndex,
                  index,
                  item,
                  itemCount: dashboardProfileHubAccountItems.length,
                  setActiveIndex: setActiveDashboardProfileHubAccountIndex,
                }),
              )}
            </div>
          </section>
        </div>
      </div>
    );
  };

  const renderDashboardOrbiterTopMenu = () => (
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
            onClick={() => rotateDashboardHeaderRail("left")}
            type="button"
          >
            &lt;
          </button>
          <Link
            aria-current={
              activeDashboardHeaderLink.href === ROUTES.dashboard.home
                ? "page"
                : undefined
            }
            className={`flex min-h-[58px] w-auto min-w-max shrink-0 items-center gap-3 rounded-[22px] border border-transparent bg-transparent px-2.5 py-2 text-left text-cyan-50 shadow-none transition hover:-translate-y-0.5 hover:bg-white/[0.04] ${
              dashboardHeaderSlideDirection === "right"
                ? "animate-[sessions-dashboard-chip-slide-from-right_220ms_ease-out]"
                : "animate-[sessions-dashboard-chip-slide-from-left_220ms_ease-out]"
            }`}
            draggable={false}
            href={activeDashboardHeaderLink.href}
            key={`${activeDashboardHeaderLink.label}-${dashboardHeaderSlideDirection}`}
            onClick={() =>
              markDashboardDestinationVisited(activeDashboardHeaderLink.href)
            }
            onDragStart={(event) => event.preventDefault()}
          >
            <span
              aria-hidden="true"
              className={`relative grid h-11 w-11 shrink-0 place-items-center rounded-2xl border text-[11px] font-black shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_16px_rgba(255,255,255,0.06)] ${activeDashboardHeaderLink.tone}`}
            >
              <DashboardTabIcon name={activeDashboardHeaderLink.icon} />
              {renderDashboardCompletionDot(
                activeDashboardHeaderLink.completion,
                true,
              )}
            </span>
            <span className="shrink-0 whitespace-nowrap">
              <span className="block text-[8px] font-black uppercase tracking-[0.14em] opacity-70">
                {activeDashboardHeaderLink.meta}
              </span>
              <span className="mt-0.5 block text-[10px] font-black uppercase tracking-[0.12em] sm:text-[11px]">
                {activeDashboardHeaderLink.label}
              </span>
            </span>
            <span
              className={`shrink-0 rounded-2xl border px-3 py-2 text-right ${activeDashboardHeaderLink.tone}`}
            >
              <span className="block text-[8px] font-black uppercase tracking-[0.1em] opacity-75">
                pts
              </span>
              <span className="block text-sm font-black leading-none [text-shadow:0_1px_12px_rgba(0,0,0,0.34)]">
                {activeDashboardHeaderLink.points.toLocaleString()}
              </span>
            </span>
          </Link>
          <button
            aria-label="Next dashboard"
            className="grid h-11 w-9 shrink-0 place-items-center rounded-2xl border border-transparent bg-transparent text-xs font-black text-cyan-100/80 transition hover:translate-x-0.5 hover:border-amber-200/28 hover:bg-amber-300/8 hover:text-amber-100 active:scale-95"
            onClick={() => rotateDashboardHeaderRail("right")}
            type="button"
          >
            &gt;
          </button>
          {showGoalsQuickLink ? (
            <Link
              aria-label="Open goals dashboard"
              className={`group flex min-h-[58px] w-auto min-w-max shrink-0 items-center gap-2 rounded-[22px] border px-2.5 py-2 text-left shadow-[0_0_20px_rgba(251,191,36,0.08)] transition hover:-translate-y-0.5 ${dashboardHeaderGoalsLink.tone}`}
              draggable={false}
              href={dashboardHeaderGoalsLink.href}
              onClick={() =>
                markDashboardDestinationVisited(dashboardHeaderGoalsLink.href)
              }
              onDragStart={(event) => event.preventDefault()}
            >
              <span
                aria-hidden="true"
                className={`relative grid h-11 w-11 shrink-0 place-items-center rounded-2xl border text-[11px] font-black shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_16px_rgba(251,191,36,0.10)] ${dashboardHeaderGoalsLink.tone}`}
              >
                <DashboardTabIcon name={dashboardHeaderGoalsLink.icon} />
                {renderDashboardCompletionDot(
                  dashboardHeaderGoalsLink.completion,
                )}
              </span>
              <span className="hidden shrink-0 whitespace-nowrap sm:block">
                <span className="block text-[8px] font-black uppercase tracking-[0.14em] opacity-70">
                  {dashboardHeaderGoalsLink.meta}
                </span>
                <span className="mt-0.5 block text-[10px] font-black uppercase tracking-[0.12em] sm:text-[11px]">
                  {dashboardHeaderGoalsLink.label}
                </span>
              </span>
            </Link>
          ) : null}
        </div>

        <button
          aria-controls="dashboard-profile-hub-orbital-overlay"
          aria-expanded={dashboardProfileHubOpen}
          aria-label="Open profile hub"
          className="hidden min-h-[58px] shrink-0 items-center gap-3 rounded-[22px] border border-transparent bg-transparent px-2 py-2 text-left text-slate-200 shadow-none transition hover:-translate-y-0.5 hover:bg-white/[0.04] md:flex"
          onClick={openDashboardProfileHub}
          type="button"
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
              <span className="sr-only">Points</span>
              <svg
                aria-hidden="true"
                className="h-5 w-5 text-amber-200 drop-shadow-[0_0_12px_rgba(250,204,21,0.28)]"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M13.5 2 4.8 13.2h6.1L9.7 22 19.2 9.6h-6.4L13.5 2Z" />
              </svg>
              <span className="text-sm font-black leading-none text-white">
                {soundPoints.toLocaleString()}
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
                {soundTokens.toLocaleString()}
              </span>
            </span>
          </span>
        </button>
      </div>
    </div>
  );

  const renderFavoriteWorkoutsCard = () => (
    <section className="relative z-10 mx-auto w-full max-w-[1080px] overflow-hidden rounded-[24px] border border-cyan-200/16 bg-[linear-gradient(135deg,rgba(15,23,42,0.68),rgba(2,6,23,0.54)),radial-gradient(circle_at_8%_0%,rgba(34,211,238,0.13),transparent_32%)] p-3 shadow-2xl shadow-black/15 backdrop-blur sm:p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="flex shrink-0 items-center justify-between gap-3 lg:w-[210px] lg:flex-col lg:items-start">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">
              Favorite Workouts
            </div>
            <p className="mt-1 text-[11px] font-semibold text-slate-400">
              Fast launch saved sessions.
            </p>
          </div>
          <div className="hidden gap-2 lg:flex">
            <button
              aria-label="Scroll favorite workouts left"
              className="grid h-8 w-8 place-items-center rounded-xl border border-white/10 bg-slate-950/55 text-xs font-black text-slate-300 transition hover:border-cyan-200/35 hover:bg-cyan-300/10 hover:text-cyan-100"
              onClick={() => scrollFavoriteWorkouts("left")}
              type="button"
            >
              &lt;
            </button>
            <button
              aria-label="Scroll favorite workouts right"
              className="grid h-8 w-8 place-items-center rounded-xl border border-white/10 bg-slate-950/55 text-xs font-black text-slate-300 transition hover:border-cyan-200/35 hover:bg-cyan-300/10 hover:text-cyan-100"
              onClick={() => scrollFavoriteWorkouts("right")}
              type="button"
            >
              &gt;
            </button>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-2 flex justify-end gap-2 lg:hidden">
            <button
              aria-label="Scroll favorite workouts left"
              className="grid h-8 w-8 place-items-center rounded-xl border border-white/10 bg-slate-950/55 text-xs font-black text-slate-300 transition hover:border-cyan-200/35 hover:bg-cyan-300/10 hover:text-cyan-100"
              onClick={() => scrollFavoriteWorkouts("left")}
              type="button"
            >
              &lt;
            </button>
            <button
              aria-label="Scroll favorite workouts right"
              className="grid h-8 w-8 place-items-center rounded-xl border border-white/10 bg-slate-950/55 text-xs font-black text-slate-300 transition hover:border-cyan-200/35 hover:bg-cyan-300/10 hover:text-cyan-100"
              onClick={() => scrollFavoriteWorkouts("right")}
              type="button"
            >
              &gt;
            </button>
          </div>

          <div
            ref={favoriteWorkoutStripRef}
            className="flex max-w-full snap-x snap-mandatory gap-2 overflow-x-auto overscroll-x-contain pb-1 scroll-smooth [scrollbar-color:rgba(34,211,238,0.38)_rgba(15,23,42,0.72)] [scrollbar-width:thin] [touch-action:pan-x] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-cyan-300/42 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-slate-950/70"
          >
            {favoriteWorkoutTemplates.map((template) => {
              const isActive = activeSessionTemplate?.id === template.id;
              const exerciseCount = template.exercises.length;

              return (
                <Link
                  className={`group flex h-[82px] min-w-[236px] snap-start items-center gap-3 rounded-[20px] border p-3 transition hover:-translate-y-0.5 active:scale-[0.99] ${
                    isActive
                      ? "border-cyan-200/55 bg-cyan-300/14 shadow-[0_0_28px_rgba(34,211,238,0.18)]"
                      : "border-white/10 bg-slate-950/52 hover:border-cyan-200/35 hover:bg-cyan-300/8"
                  }`}
                  href={
                    isActive
                      ? ROUTES.dashboard.sessionWorkout
                      : buildTemplateWorkoutHref(template.id)
                  }
                  key={template.id}
                  onClick={() => {
                    if (!isActive) {
                      launchFavoriteWorkout(template);
                    }
                  }}
                >
                  <span
                    className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl border text-xl ${
                      isActive
                        ? "border-cyan-100/45 bg-cyan-300/16 text-cyan-50"
                        : "border-white/10 bg-white/[0.045] text-slate-100 group-hover:border-cyan-200/28 group-hover:bg-cyan-300/10"
                    }`}
                    aria-hidden="true"
                  >
                    {getWorkoutTemplateIcon(template)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-black text-white">
                        {template.title}
                      </span>
                      <span className="shrink-0 text-amber-200" aria-hidden="true">
                        *
                      </span>
                    </span>
                    <span className="mt-1 flex min-w-0 items-center gap-1.5">
                      <span className="max-w-[92px] truncate rounded-full border border-cyan-200/18 bg-cyan-300/8 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.1em] text-cyan-100">
                        {getWorkoutTemplateTag(template)}
                      </span>
                      <span className="truncate text-[10px] font-bold text-slate-500">
                        {exerciseCount} move{exerciseCount === 1 ? "" : "s"}
                      </span>
                    </span>
                    <span
                      className={`mt-1.5 inline-flex rounded-full border px-2.5 py-0.5 text-[8px] font-black uppercase tracking-[0.12em] ${
                        isActive
                          ? "border-emerald-200/35 bg-emerald-300/12 text-emerald-100"
                          : "border-white/10 bg-white/[0.04] text-slate-300 group-hover:border-cyan-200/28 group-hover:text-cyan-100"
                      }`}
                    >
                      {isActive ? "Resume" : "Quick Start"}
                    </span>
                  </span>
                </Link>
              );
            })}

            <Link
              className="group flex h-[82px] min-w-[180px] snap-start items-center gap-3 rounded-[20px] border border-dashed border-cyan-200/24 bg-cyan-300/6 p-3 transition hover:-translate-y-0.5 hover:border-cyan-200/48 hover:bg-cyan-300/10 active:scale-[0.99]"
              href={ROUTES.workoutBuilder.home}
            >
              <span
                className="grid h-12 w-12 place-items-center rounded-2xl border border-cyan-200/24 bg-slate-950/54 text-xl text-cyan-100"
                aria-hidden="true"
              >
                +
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-black text-white">
                  Add Favorite
                </span>
                <span className="mt-1 block text-[10px] font-bold text-slate-500">
                  Save a builder template
                </span>
              </span>
            </Link>

            <Link
              className="group flex h-[82px] min-w-[180px] snap-start items-center gap-3 rounded-[20px] border border-white/10 bg-slate-950/45 p-3 transition hover:-translate-y-0.5 hover:border-amber-200/35 hover:bg-amber-300/8 active:scale-[0.99]"
              href={ROUTES.dashboard.sessionHistory}
            >
              <span
                className="grid h-12 w-12 place-items-center rounded-2xl border border-amber-200/20 bg-amber-300/8 text-lg text-amber-100"
                aria-hidden="true"
              >
                R
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-black text-white">
                  Recently Used
                </span>
                <span className="mt-1 block text-[10px] font-bold text-slate-500">
                  Open session history
                </span>
              </span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );

  const renderDashboardHeroAchievementOrbit = () => (
    <div className="relative z-10 -mx-4 mt-3 overflow-hidden py-0 before:pointer-events-none before:absolute before:inset-0 before:bg-[radial-gradient(ellipse_at_8%_0%,rgba(250,204,21,0.12),transparent_32%),radial-gradient(ellipse_at_92%_20%,rgba(34,211,238,0.10),transparent_34%),radial-gradient(ellipse_at_50%_72%,rgba(2,6,23,0.34),transparent_72%)] before:[mask-image:linear-gradient(to_bottom,transparent_0%,black_42%,black_100%)] before:content-[''] sm:-mx-6 lg:-mx-7">
      <div className="sr-only">Progression rewards. Recent achievements.</div>
      <div
        aria-label="Dashboard achievement orbit"
        className="relative z-10 h-[166px] cursor-grab select-none overflow-hidden [perspective:1100px] [touch-action:pan-y] active:cursor-grabbing sm:h-[172px]"
        onPointerCancel={(event) => {
          event.stopPropagation();
          finishHeroAchievementPointer(event);
        }}
        onPointerDown={(event) => {
          event.stopPropagation();
          handleDashboardOrbitPointerDown(
            event,
            heroAchievementPointerStartRef,
            heroAchievementPointerMovedRef,
          );
        }}
        onPointerMove={(event) => {
          event.stopPropagation();
          handleDashboardOrbitPointerMove(
            event,
            heroAchievementPointerStartRef,
            heroAchievementPointerMovedRef,
            rotateHeroAchievement,
            58,
          );
        }}
        onPointerUp={(event) => {
          event.stopPropagation();
          finishHeroAchievementPointer(event);
        }}
        onWheel={handleHeroAchievementWheel}
        onWheelCapture={handleHeroAchievementWheel}
      >
        <button
          aria-label="Previous dashboard achievement"
          className="absolute left-2 top-1/2 z-40 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-cyan-200/24 bg-slate-950/72 text-lg font-black text-cyan-100 shadow-[0_0_22px_rgba(34,211,238,0.14)] backdrop-blur transition hover:-translate-x-0.5 hover:border-amber-200/45 hover:bg-amber-300/10 hover:text-amber-100"
          onClick={(event) => {
            event.stopPropagation();
            rotateHeroAchievement("left");
          }}
          onPointerDown={(event) => event.stopPropagation()}
          type="button"
        >
          &lt;
        </button>
        <button
          aria-label="Next dashboard achievement"
          className="absolute right-2 top-1/2 z-40 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-cyan-200/24 bg-slate-950/72 text-lg font-black text-cyan-100 shadow-[0_0_22px_rgba(34,211,238,0.14)] backdrop-blur transition hover:translate-x-0.5 hover:border-amber-200/45 hover:bg-amber-300/10 hover:text-amber-100"
          onClick={(event) => {
            event.stopPropagation();
            rotateHeroAchievement("right");
          }}
          onPointerDown={(event) => event.stopPropagation()}
          type="button"
        >
          &gt;
        </button>

        {heroAchievements.map((achievement, index) => {
          const distance = getHeroAchievementOrbitDistance(index);
          const absDistance = Math.abs(distance);
          const direction = Math.sign(distance);
          const slotIndex = Math.min(
            absDistance,
            dashboardHeroAchievementOrbitSlots.length - 1,
          );
          const baseSlot = dashboardHeroAchievementOrbitSlots[slotIndex];
          const shouldRestartOffEdge =
            absDistance > DASHBOARD_HERO_ACHIEVEMENT_VISIBLE_DISTANCE;
          const overflowDistance = Math.max(0, absDistance - slotIndex);
          const slot = overflowDistance
            ? {
                ...baseSlot,
                blur: baseSlot.blur + overflowDistance * 0.8,
                opacity: shouldRestartOffEdge
                  ? 0
                  : Math.max(0, baseSlot.opacity - overflowDistance * 0.08),
                rotateY: baseSlot.rotateY - overflowDistance * 8,
                scale: Math.max(0.26, baseSlot.scale - overflowDistance * 0.08),
                x: baseSlot.x + overflowDistance * 140,
                y: baseSlot.y + overflowDistance * 32,
                zIndex: Math.max(0, baseSlot.zIndex - overflowDistance * 4),
              }
            : baseSlot;
          const isActiveAchievement = index === activeHeroAchievementIndex;
          const resetDirection =
            heroAchievementSlideDirection === "right" ? 1 : -1;
          const isRestartingAcrossEdge =
            shouldRestartOffEdge && direction === resetDirection;
          const achievementProgress = Math.min(
            100,
            Math.max(
              0,
              achievement.progress ??
                (achievement.status === "completed"
                  ? 100
                  : achievement.status === "locked"
                    ? 0
                    : 50),
            ),
          );
          const achievementProgressLabel =
            achievement.statusLabel ||
            (achievementProgress >= 100
              ? "Completed"
              : achievement.status === "locked"
                ? "Locked"
                : `${Math.round(achievementProgress)}% complete`);

          return (
            <Link
              aria-current={isActiveAchievement ? "step" : undefined}
              aria-label={`Open ${achievement.label} achievements`}
              className={`group/hero-achievement absolute left-1/2 top-1/2 flex cursor-pointer flex-col items-center justify-center text-center transition duration-300 ${
                isActiveAchievement
                  ? "h-[154px] w-[min(68vw,270px)] overflow-hidden rounded-[28px] border border-cyan-100/30 bg-[radial-gradient(circle_at_18%_0%,rgba(34,211,238,0.18),transparent_36%),radial-gradient(circle_at_88%_12%,rgba(250,204,21,0.13),transparent_34%),linear-gradient(135deg,rgba(15,23,42,0.88),rgba(2,6,23,0.74))] px-4 py-2 shadow-[0_24px_62px_rgba(0,0,0,0.34),0_0_34px_rgba(34,211,238,0.18),inset_0_1px_0_rgba(255,255,255,0.10)] backdrop-blur-xl sm:h-[160px]"
                  : "min-h-[128px] w-[min(52vw,170px)] hover:drop-shadow-[0_14px_34px_rgba(34,211,238,0.14)]"
              }`}
              draggable={false}
              href={achievement.href || ROUTES.dashboard.achievements}
              key={`${achievement.label}-dashboard-hero-orbit`}
              onClick={(event) => {
                event.stopPropagation();
                if (heroAchievementPointerMovedRef.current) {
                  event.preventDefault();
                  heroAchievementPointerMovedRef.current = false;
                }
              }}
              onDragStart={(event) => event.preventDefault()}
              style={{
                filter: `blur(${slot.blur}px)`,
                opacity: slot.opacity,
                pointerEvents: absDistance > 2 ? "none" : "auto",
                transform: `translate(-50%, -50%) translateX(${
                  direction * slot.x
                }px) translateY(${slot.y}px) scale(${slot.scale}) rotateY(${
                  direction * slot.rotateY
                }deg)`,
                transition: isRestartingAcrossEdge
                  ? "opacity 180ms ease, filter 180ms ease"
                  : "transform 520ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 320ms ease, filter 320ms ease",
                zIndex: slot.zIndex,
              }}
            >
              {isActiveAchievement ? (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-5 top-0 h-px rounded-full bg-gradient-to-r from-transparent via-cyan-100/70 to-amber-100/55"
                />
              ) : null}
              <span
                aria-hidden="true"
                className={`pointer-events-none absolute left-1/2 top-[42%] h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full blur-2xl transition ${
                  isActiveAchievement ? "bg-cyan-300/20" : "bg-cyan-300/8"
                }`}
              />
              <div
                className={`relative z-10 grid place-items-center transition duration-300 ${
                  isActiveAchievement ? "scale-100" : "scale-95"
                }`}
              >
                <SoundLogoAchievementBadge
                  compact
                  item={achievement}
                />
              </div>
              <h3
                className={`relative z-10 mt-2 max-w-[150px] text-center font-black uppercase leading-tight tracking-[0.1em] ${
                  isActiveAchievement
                    ? "text-sm text-white drop-shadow-[0_0_16px_rgba(34,211,238,0.24)]"
                    : "text-[10px] text-slate-300"
                }`}
              >
                {achievement.label}
              </h3>
              {isActiveAchievement ? (
                <div className="relative z-10 mt-1.5 w-full text-left">
                  {achievement.meta ? (
                    <p className="truncate text-center text-[10px] font-bold leading-4 text-slate-300">
                      {achievement.meta}
                    </p>
                  ) : null}
                  <div className="mt-1.5 flex items-center justify-center gap-2">
                    <span className="rounded-full border border-cyan-100/24 bg-cyan-300/12 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.12em] text-cyan-100">
                      {achievement.category}
                    </span>
                    <span className="rounded-full border border-amber-100/24 bg-amber-300/12 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.12em] text-amber-100">
                      {achievementProgressLabel}
                    </span>
                  </div>
                </div>
              ) : null}
            </Link>
          );
        })}
      </div>
    </div>
  );

  const renderDashboardHeroRow = () => (
    <div
      aria-label="Dashboard hero row"
      data-dashboard-orbiter-row="0"
      className="relative z-10 mx-auto w-full max-w-[1080px] overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(15,23,42,0.72)),radial-gradient(circle_at_18%_0%,rgba(34,211,238,0.14),transparent_34%),radial-gradient(circle_at_92%_18%,rgba(250,204,21,0.12),transparent_30%)] px-4 pb-3 pt-4 shadow-2xl shadow-black/20 backdrop-blur sm:rounded-[30px] sm:px-6 sm:pb-4 sm:pt-6 lg:px-7 lg:pb-5 lg:pt-7"
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(330px,390px)] xl:items-start">
        <div className="min-w-0">
          <div className="text-[11px] font-black uppercase tracking-[0.24em] text-sky-400">
            Sound Fitness Command Center
          </div>

          <h1 className="mt-3 break-words text-3xl font-black uppercase tracking-tight sm:text-5xl">
            Welcome back, <span className="text-sky-400">{firstName}</span>
          </h1>

          <div className="mt-3 inline-flex max-w-full items-center gap-2 rounded-full border border-cyan-300/22 bg-cyan-300/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em] text-cyan-100 shadow-[0_0_24px_rgba(34,211,238,0.12)]">
            <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,0.75)]" />
            <span className="min-w-0 truncate">{heroProgressionLine}</span>
          </div>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
            Start training, check your progress, back up your workout data,
            and jump into the next part of your plan from one place.
          </p>
        </div>

        <div className="grid gap-3">
          <div className="rounded-[24px] border border-white/10 bg-slate-950/36 p-3 shadow-inner shadow-white/5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                  Progress wallet
                </div>
                <div className="mt-1 text-sm font-black text-white">
                  Ecosystem rewards
                </div>
              </div>
              <div className="rounded-full border border-amber-300/25 bg-amber-300/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.13em] text-amber-100">
                Level {Math.max(1, Math.round(masterJourneyProgress / 12))}
              </div>
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-3 shadow-[0_0_18px_rgba(34,211,238,0.08)]">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.15em] text-cyan-100 [&>span:first-child]:hidden">
                  <span className="text-base">âš¡</span>
                  <span className="relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-amber-200/35 bg-amber-300/12 text-amber-100 shadow-[0_0_14px_rgba(250,204,21,0.25)]">
                    <svg
                      aria-hidden="true"
                      className="h-4 w-4 drop-shadow-[0_0_10px_rgba(250,204,21,0.32)]"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M13.5 2 4.8 13.2h6.1L9.7 22 19.2 9.6h-6.4L13.5 2Z" />
                    </svg>
                  </span>
                  Sound Points
                </div>
                <div className="mt-1 text-2xl font-black tracking-tight text-white">
                  {soundPoints.toLocaleString()}
                </div>
              </div>

              <div className="rounded-2xl border border-amber-300/24 bg-amber-300/10 p-3 shadow-[0_0_18px_rgba(250,204,21,0.1)]">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.15em] text-amber-100">
                  <span className="relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-amber-200/35 bg-slate-950/70 shadow-[0_0_14px_rgba(250,204,21,0.25)]">
                    <Image
                      src="/sound-fitness-logo.png"
                      alt="Sound Fitness token"
                      width={18}
                      height={18}
                      className="rounded-full"
                    />
                  </span>
                  Sound Tokens
                </div>
                <div className="mt-1 text-2xl font-black tracking-tight text-white">
                  {soundTokens.toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {renderDashboardHeroAchievementOrbit()}
    </div>
  );

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#020713] text-white">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_18%_0%,rgba(14,165,233,0.18),transparent_30%),radial-gradient(circle_at_82%_12%,rgba(16,185,129,0.13),transparent_26%),linear-gradient(180deg,#020713_0%,#07111f_48%,#020713_100%)]" />

      <div className="mx-auto flex max-w-7xl flex-col px-4 pb-6 pt-0 sm:px-8 lg:pb-8">
        <section className="hidden">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="flex shrink-0 items-center justify-between gap-3 lg:w-[210px] lg:flex-col lg:items-start">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">
                  Favorite Workouts
                </div>
                <p className="mt-1 text-[11px] font-semibold text-slate-400">
                  Fast launch saved sessions.
                </p>
              </div>
              <div className="hidden gap-2 lg:flex">
                <button
                  aria-label="Scroll favorite workouts left"
                  className="grid h-8 w-8 place-items-center rounded-xl border border-white/10 bg-slate-950/55 text-xs font-black text-slate-300 transition hover:border-cyan-200/35 hover:bg-cyan-300/10 hover:text-cyan-100"
                  onClick={() => scrollFavoriteWorkouts("left")}
                  type="button"
                >
                  &lt;
                </button>
                <button
                  aria-label="Scroll favorite workouts right"
                  className="grid h-8 w-8 place-items-center rounded-xl border border-white/10 bg-slate-950/55 text-xs font-black text-slate-300 transition hover:border-cyan-200/35 hover:bg-cyan-300/10 hover:text-cyan-100"
                  onClick={() => scrollFavoriteWorkouts("right")}
                  type="button"
                >
                  &gt;
                </button>
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <div className="mb-2 flex justify-end gap-2 lg:hidden">
                <button
                  aria-label="Scroll favorite workouts left"
                  className="grid h-8 w-8 place-items-center rounded-xl border border-white/10 bg-slate-950/55 text-xs font-black text-slate-300 transition hover:border-cyan-200/35 hover:bg-cyan-300/10 hover:text-cyan-100"
                  onClick={() => scrollFavoriteWorkouts("left")}
                  type="button"
                >
                  &lt;
                </button>
                <button
                  aria-label="Scroll favorite workouts right"
                  className="grid h-8 w-8 place-items-center rounded-xl border border-white/10 bg-slate-950/55 text-xs font-black text-slate-300 transition hover:border-cyan-200/35 hover:bg-cyan-300/10 hover:text-cyan-100"
                  onClick={() => scrollFavoriteWorkouts("right")}
                  type="button"
                >
                  &gt;
                </button>
              </div>

              <div className="flex max-w-full snap-x snap-mandatory gap-2 overflow-x-auto overscroll-x-contain pb-1 scroll-smooth [scrollbar-color:rgba(34,211,238,0.38)_rgba(15,23,42,0.72)] [scrollbar-width:thin] [touch-action:pan-x] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-cyan-300/42 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-slate-950/70">
                {favoriteWorkoutTemplates.map((template) => {
                  const isActive = activeSessionTemplate?.id === template.id;
                  const exerciseCount = template.exercises.length;

                  return (
                    <Link
                      className={`group flex h-[82px] min-w-[236px] snap-start items-center gap-3 rounded-[20px] border p-3 transition hover:-translate-y-0.5 active:scale-[0.99] ${
                        isActive
                          ? "border-cyan-200/55 bg-cyan-300/14 shadow-[0_0_28px_rgba(34,211,238,0.18)]"
                          : "border-white/10 bg-slate-950/52 hover:border-cyan-200/35 hover:bg-cyan-300/8"
                      }`}
                      href={
                        isActive
                          ? ROUTES.dashboard.sessionWorkout
                          : buildTemplateWorkoutHref(template.id)
                      }
                      key={template.id}
                      onClick={() => {
                        if (!isActive) {
                          launchFavoriteWorkout(template);
                        }
                      }}
                    >
                      <span
                        className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl border text-xl ${
                          isActive
                            ? "border-cyan-100/45 bg-cyan-300/16 text-cyan-50"
                            : "border-white/10 bg-white/[0.045] text-slate-100 group-hover:border-cyan-200/28 group-hover:bg-cyan-300/10"
                        }`}
                        aria-hidden="true"
                      >
                        {getWorkoutTemplateIcon(template)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-sm font-black text-white">
                            {template.title}
                          </span>
                          <span className="shrink-0 text-amber-200" aria-hidden="true">
                            ★
                          </span>
                        </span>
                        <span className="mt-1 flex min-w-0 items-center gap-1.5">
                          <span className="max-w-[92px] truncate rounded-full border border-cyan-200/18 bg-cyan-300/8 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.1em] text-cyan-100">
                            {getWorkoutTemplateTag(template)}
                          </span>
                          <span className="truncate text-[10px] font-bold text-slate-500">
                            {exerciseCount} move{exerciseCount === 1 ? "" : "s"}
                          </span>
                        </span>
                        <span
                          className={`mt-1.5 inline-flex rounded-full border px-2.5 py-0.5 text-[8px] font-black uppercase tracking-[0.12em] ${
                            isActive
                              ? "border-emerald-200/35 bg-emerald-300/12 text-emerald-100"
                              : "border-white/10 bg-white/[0.04] text-slate-300 group-hover:border-cyan-200/28 group-hover:text-cyan-100"
                          }`}
                        >
                          {isActive ? "Resume" : "Quick Start"}
                        </span>
                      </span>
                    </Link>
                  );
                })}

                <Link
                  className="group flex h-[82px] min-w-[180px] snap-start items-center gap-3 rounded-[20px] border border-dashed border-cyan-200/24 bg-cyan-300/6 p-3 transition hover:-translate-y-0.5 hover:border-cyan-200/48 hover:bg-cyan-300/10 active:scale-[0.99]"
                  href={ROUTES.workoutBuilder.home}
                >
                  <span
                    className="grid h-12 w-12 place-items-center rounded-2xl border border-cyan-200/24 bg-slate-950/54 text-xl text-cyan-100"
                    aria-hidden="true"
                  >
                    +
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-black text-white">
                      Add Favorite
                    </span>
                    <span className="mt-1 block text-[10px] font-bold text-slate-500">
                      Save a builder template
                    </span>
                  </span>
                </Link>

                <Link
                  className="group flex h-[82px] min-w-[180px] snap-start items-center gap-3 rounded-[20px] border border-white/10 bg-slate-950/45 p-3 transition hover:-translate-y-0.5 hover:border-amber-200/35 hover:bg-amber-300/8 active:scale-[0.99]"
                  href={ROUTES.dashboard.sessionHistory}
                >
                  <span
                    className="grid h-12 w-12 place-items-center rounded-2xl border border-amber-200/20 bg-amber-300/8 text-lg text-amber-100"
                    aria-hidden="true"
                  >
                    ↺
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-black text-white">
                      Recently Used
                    </span>
                    <span className="mt-1 block text-[10px] font-bold text-slate-500">
                      Open session history
                    </span>
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-6">
          <div className="relative min-w-0 overflow-hidden rounded-[28px] border border-cyan-300/24 bg-[radial-gradient(circle_at_16%_0%,rgba(34,211,238,0.16),transparent_34%),radial-gradient(circle_at_92%_12%,rgba(250,204,21,0.12),transparent_30%),rgba(15,23,42,0.72)] p-4 shadow-2xl shadow-black/25 backdrop-blur sm:rounded-[34px] sm:p-5 lg:p-6">
            <span className="pointer-events-none absolute inset-x-6 top-0 h-px rounded-full bg-gradient-to-r from-transparent via-cyan-200/70 to-amber-200/55" />
            <div className="relative">
              <div className="min-w-0 lg:pr-[350px]">
                <div className="text-[11px] font-black uppercase tracking-[0.24em] text-sky-400">
                  Active Log Panel
                </div>
                <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
                  Manual Stats Adder
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                  Quick-log a generic stat or attach it to a referenced Exercise Library card.
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    href={ROUTES.dashboard.sessions}
                    className="rounded-2xl border border-white/10 bg-slate-950/46 px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-slate-300 transition hover:-translate-y-0.5 hover:border-cyan-200/35 hover:bg-cyan-300/8 hover:text-cyan-100"
                  >
                    Start Workout
                  </Link>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2 lg:absolute lg:right-0 lg:top-0 lg:mt-0 lg:max-w-[430px] lg:justify-end">
                <span className="mr-1 text-[9px] font-black uppercase tracking-[0.18em] text-emerald-300">
                  Import Tools
                </span>
                {dashboardUploadOptions.map((option) => {
                  const active = option.id === activeUploadType;

                  return (
                    <Link
                      key={option.id}
                      href={option.href}
                      aria-current={active ? "page" : undefined}
                      onClick={() => handleUploadOptionSelect(option.id)}
                      title={option.description}
                      className={`inline-flex min-h-[30px] items-center justify-center rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-[0.1em] transition hover:-translate-y-0.5 active:scale-[0.98] ${
                        active
                          ? "border-cyan-100/45 bg-cyan-300/16 text-cyan-50 shadow-[0_0_18px_rgba(34,211,238,0.18)]"
                          : "border-white/10 bg-slate-950/46 text-slate-300 hover:border-cyan-200/32 hover:bg-cyan-300/8 hover:text-cyan-100"
                      }`}
                    >
                      {option.label}
                    </Link>
                  );
                })}
                <Link
                  href="/stats/add/connect"
                  className="inline-flex min-h-[30px] items-center justify-center rounded-full border border-amber-200/28 bg-amber-300/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.1em] text-amber-100 transition hover:-translate-y-0.5 hover:border-amber-100/50 hover:bg-amber-300/16 hover:text-amber-50 active:scale-[0.98]"
                >
                  Wearables
                </Link>
              </div>

              <div className="mt-5 overflow-hidden rounded-[22px] border border-cyan-200/14 bg-slate-950/28 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div
                    aria-label="Manual stats dashboard favorite selector"
                    className="flex min-w-0 items-center gap-1.5"
                  >
                    <button
                      type="button"
                      aria-label="Previous favorites dashboard"
                      onClick={() => rotateManualFavoriteDashboard("left")}
                      className="grid h-9 w-8 shrink-0 place-items-center rounded-xl border border-transparent bg-transparent text-xs font-black text-cyan-100/80 transition hover:-translate-x-0.5 hover:border-amber-200/28 hover:bg-amber-300/8 hover:text-amber-100 active:scale-95"
                    >
                      &lt;
                    </button>
                    <Link
                      href={activeManualFavoriteDashboard.href}
                      className="group flex min-h-[50px] min-w-[230px] items-center justify-between gap-3 rounded-2xl border border-cyan-200/22 bg-cyan-300/8 px-3 py-2 text-left shadow-[0_0_18px_rgba(34,211,238,0.08)] transition hover:-translate-y-0.5 hover:border-cyan-200/42 hover:bg-cyan-300/12"
                    >
                      <span className="min-w-0">
                        <span className="block text-[8px] font-black uppercase tracking-[0.14em] text-cyan-100/75">
                          {activeManualFavoriteDashboard.meta}
                        </span>
                        <span className="mt-0.5 block truncate text-[11px] font-black uppercase tracking-[0.11em] text-white">
                          {activeManualFavoriteDashboard.label}
                        </span>
                      </span>
                      <span className="shrink-0 rounded-full border border-white/10 bg-slate-950/48 px-2 py-1 text-[8px] font-black uppercase tracking-[0.1em] text-slate-300">
                        {activeManualFavoriteCount} saved
                      </span>
                    </Link>
                    <button
                      type="button"
                      aria-label="Next favorites dashboard"
                      onClick={() => rotateManualFavoriteDashboard("right")}
                      className="grid h-9 w-8 shrink-0 place-items-center rounded-xl border border-transparent bg-transparent text-xs font-black text-cyan-100/80 transition hover:translate-x-0.5 hover:border-amber-200/28 hover:bg-amber-300/8 hover:text-amber-100 active:scale-95"
                    >
                      &gt;
                    </button>
                  </div>
                </div>

                <div className="mt-3 flex max-w-full gap-2 overflow-x-auto overscroll-x-contain pb-2 scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {activeManualFavoriteDashboard.id === "workout" ? (
                    favoriteExerciseCards.length ? (
                      favoriteExerciseCards.map((exercise) => {
                        const selected = manualReferences.some(
                          (reference) => reference.referenceId === exercise.id,
                        );

                        return (
                          <button
                            type="button"
                            key={exercise.id}
                            onClick={() => selectExerciseReference(exercise)}
                            className={`group flex min-h-[96px] min-w-[210px] shrink-0 flex-col justify-between rounded-2xl border p-3 text-left transition hover:-translate-y-0.5 active:scale-[0.98] ${
                              selected
                                ? "border-emerald-200/44 bg-emerald-300/12 text-emerald-50 shadow-[0_0_22px_rgba(16,185,129,0.12)]"
                                : "border-white/10 bg-white/[0.045] text-slate-300 hover:border-cyan-200/34 hover:bg-cyan-300/8 hover:text-white"
                            }`}
                          >
                            <span>
                              <span className="block truncate text-[9px] font-black uppercase tracking-[0.14em] text-cyan-100/80">
                                {exercise.body} / {exercise.pattern}
                              </span>
                              <span className="mt-1.5 block truncate text-sm font-black text-white">
                                {exercise.name}
                              </span>
                              <span className="mt-1 block truncate text-[10px] font-bold text-slate-400">
                                {exercise.equipment} / {exercise.level}
                              </span>
                            </span>
                            <span
                              className={`mt-2 inline-flex w-fit rounded-full border px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.1em] ${
                                selected
                                  ? "border-emerald-100/34 bg-emerald-300/14 text-emerald-100"
                                  : "border-cyan-200/18 bg-slate-950/45 text-cyan-100"
                              }`}
                            >
                              {selected ? "Attached" : "Add to stat"}
                            </span>
                          </button>
                        );
                      })
                    ) : (
                      <Link
                        href={ROUTES.workoutBuilder.exerciseLibrary}
                        className="flex min-h-[96px] min-w-[230px] shrink-0 flex-col justify-between rounded-2xl border border-dashed border-cyan-200/24 bg-cyan-300/6 p-3 text-left transition hover:-translate-y-0.5 hover:border-cyan-200/48 hover:bg-cyan-300/10"
                      >
                        <span>
                          <span className="block text-[9px] font-black uppercase tracking-[0.14em] text-cyan-100">
                            No exercise favorites
                          </span>
                          <span className="mt-1.5 block text-sm font-black text-white">
                            Star library moves
                          </span>
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">
                          Open Exercise Library
                        </span>
                      </Link>
                    )
                  ) : activeDashboardLibraryFavoriteIds.length ? (
                    activeDashboardLibraryFavoriteIds.map((favoriteId) => (
                      <Link
                        key={`${activeManualFavoriteDashboard.id}-${favoriteId}`}
                        href={activeManualFavoriteDashboard.href}
                        className="flex min-h-[96px] min-w-[210px] shrink-0 flex-col justify-between rounded-2xl border border-white/10 bg-white/[0.045] p-3 transition hover:-translate-y-0.5 hover:border-cyan-200/30 hover:bg-cyan-300/8"
                      >
                        <span>
                          <span className="block text-[9px] font-black uppercase tracking-[0.14em] text-cyan-100/80">
                            {activeManualFavoriteDashboard.label}
                          </span>
                          <span className="mt-1.5 block truncate text-sm font-black text-white">
                            {formatFavoriteIdLabel(favoriteId)}
                          </span>
                        </span>
                        <span className="mt-2 inline-flex w-fit rounded-full border border-white/10 bg-slate-950/45 px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.1em] text-slate-300">
                          Open dashboard
                        </span>
                      </Link>
                    ))
                  ) : (
                    <Link
                      href={activeManualFavoriteDashboard.href}
                      className="flex min-h-[96px] min-w-[230px] shrink-0 flex-col justify-between rounded-2xl border border-dashed border-cyan-200/24 bg-cyan-300/6 p-3 text-left transition hover:-translate-y-0.5 hover:border-cyan-200/48 hover:bg-cyan-300/10"
                    >
                      <span>
                        <span className="block text-[9px] font-black uppercase tracking-[0.14em] text-cyan-100">
                          No saved favorites
                        </span>
                        <span className="mt-1.5 block text-sm font-black text-white">
                          {activeManualFavoriteDashboard.label}
                        </span>
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">
                        {activeManualFavoriteDashboard.helper}
                      </span>
                    </Link>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                  References
                </p>
                <span className="rounded-full border border-amber-200/18 bg-amber-300/8 px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-amber-100">
                  Future library-ready
                </span>
              </div>

              {manualReferences.length ? (
                <div className="flex max-w-full gap-2 overflow-x-auto overscroll-x-contain pb-2 scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {manualReferences.map((reference) => (
                    <div
                      key={`${reference.referenceType}-${reference.referenceId}`}
                      className="relative flex min-w-[260px] max-w-[320px] shrink-0 gap-3 overflow-hidden rounded-2xl border border-cyan-200/35 bg-cyan-300/10 p-3 shadow-[0_0_26px_rgba(34,211,238,0.13)]"
                    >
                      {reference.metadata.image ? (
                        <img
                          alt=""
                          className="h-16 w-16 shrink-0 rounded-xl border border-white/10 object-cover"
                          src={reference.metadata.image}
                        />
                      ) : (
                        <span className="grid h-16 w-16 shrink-0 place-items-center rounded-xl border border-cyan-200/20 bg-cyan-300/10 text-lg font-black text-cyan-100">
                          EX
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-black text-white">
                          {reference.referenceTitle}
                        </p>
                        <p className="mt-1 truncate text-[10px] font-black uppercase tracking-[0.1em] text-cyan-100/80">
                          {reference.metadata.movementPattern || "Movement"} /{" "}
                          {reference.metadata.equipment || "Equipment"}
                        </p>
                        <p className="mt-1 line-clamp-2 text-[11px] font-semibold leading-4 text-slate-300">
                          {reference.metadata.muscles || "Muscle profile pending"}
                        </p>
                        <div className="mt-2 flex gap-1 overflow-hidden">
                          {(reference.metadata.tags || []).slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="shrink-0 rounded-full border border-white/10 bg-slate-950/44 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.08em] text-slate-300"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                      <button
                        type="button"
                        aria-label={`Remove ${reference.referenceTitle}`}
                        onClick={() => removeManualReference(reference.referenceId)}
                        className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-lg border border-white/10 bg-slate-950/70 text-[10px] font-black text-slate-400 transition hover:border-rose-200/40 hover:bg-rose-300/10 hover:text-rose-100"
                      >
                        X
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setExerciseSelectorOpen(true)}
                  className="flex min-h-[74px] w-full items-center justify-between gap-3 rounded-2xl border border-dashed border-cyan-200/22 bg-slate-950/36 px-4 py-3 text-left transition hover:border-cyan-200/42 hover:bg-cyan-300/8"
                >
                  <span>
                    <span className="block text-xs font-black uppercase tracking-[0.14em] text-cyan-100">
                      No exercise attached
                    </span>
                    <span className="mt-1 block text-xs font-semibold text-slate-400">
                      Log generic stats, or attach a movement from the Exercise Library.
                    </span>
                  </span>
                  <span className="rounded-full border border-cyan-200/24 bg-cyan-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-cyan-100">
                    Browse
                  </span>
                </button>
              )}
              {selectedExercise?.cue ? (
                <p className="mt-1.5 line-clamp-1 text-[11px] font-semibold text-slate-500">
                  Cue: {selectedExercise.cue}
                </p>
              ) : null}
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {[
                { field: "sessionLabel", label: "Session Label", placeholder: "Upper Strength" },
                { field: "sets", label: "Sets", placeholder: "3", type: "number" },
                { field: "reps", label: "Reps", placeholder: "10", type: "number" },
                { field: "load", label: "Weight / Load", placeholder: "185 lb" },
                { field: "rpe", label: "RPE / Effort", placeholder: "8 / 10" },
                { field: "dateTime", label: "Date / Time", placeholder: "", type: "datetime-local" },
              ].map((field) => (
                <label
                  key={field.field}
                  className="rounded-2xl border border-white/10 bg-slate-950/44 p-2.5"
                >
                  <span className="block text-[9px] font-black uppercase tracking-[0.13em] text-slate-500">
                    {field.label}
                  </span>
                  <input
                    type={field.type || "text"}
                    placeholder={field.placeholder}
                    value={manualStatsDraft[field.field as keyof ManualStatsDraft]}
                    onChange={(event) =>
                      updateManualStatsDraft(
                        field.field as keyof ManualStatsDraft,
                        event.target.value,
                      )
                    }
                    className="mt-1 w-full border-0 bg-transparent text-sm font-bold text-white outline-none placeholder:text-slate-600"
                  />
                </label>
              ))}
            </div>

            <label className="mt-2.5 block rounded-2xl border border-white/10 bg-slate-950/44 p-2.5">
              <span className="block text-[9px] font-black uppercase tracking-[0.13em] text-slate-500">
                Notes
              </span>
              <textarea
                value={manualStatsDraft.notes}
                onChange={(event) => updateManualStatsDraft("notes", event.target.value)}
                placeholder="How did it feel? Any setup notes?"
                className="mt-1 min-h-[52px] w-full resize-none border-0 bg-transparent text-sm font-bold text-white outline-none placeholder:text-slate-600"
              />
            </label>

            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="truncate text-[11px] font-bold text-slate-400">
                  {manualLogMessage ||
                    (manualStatsLogs[0]
                      ? `Last manual log: ${manualStatsLogs[0].sessionLabel || manualStatsLogs[0].references[0]?.referenceTitle || "Generic entry"}`
                      : "Manual logs stay compact and can attach to library references.")}
                </p>
              </div>
              <button
                type="button"
                onClick={saveManualStatsLog}
                className="inline-flex min-h-[42px] shrink-0 items-center justify-center rounded-2xl bg-gradient-to-r from-amber-300 to-cyan-300 px-4 py-2 text-xs font-black uppercase tracking-[0.13em] text-slate-950 shadow-[0_0_28px_rgba(250,204,21,0.16)] transition hover:-translate-y-0.5 hover:shadow-[0_0_36px_rgba(34,211,238,0.24)] active:scale-[0.99]"
              >
                Log Manual Stats
              </button>
            </div>

            <div className="hidden">
              <Link
                href={
                  activeSessionTemplate
                    ? ROUTES.dashboard.sessionWorkout
                    : nextAction.href
                }
                className="group flex min-h-[46px] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-400 to-cyan-300 px-4 py-3 text-center text-xs font-black uppercase tracking-[0.13em] text-slate-950 shadow-[0_0_34px_rgba(14,165,233,0.28)] transition hover:-translate-y-0.5 hover:shadow-[0_0_42px_rgba(34,211,238,0.35)] active:scale-[0.99]"
              >
                <span className="text-base leading-none" aria-hidden="true">
                  ▶
                </span>
                Resume Workout
              </Link>
              <Link
                href={ROUTES.dashboard.sessions}
                className="group flex min-h-[46px] items-center justify-center gap-2 rounded-2xl border border-cyan-200/22 bg-slate-950/46 px-4 py-3 text-center text-xs font-black uppercase tracking-[0.13em] text-cyan-100 transition hover:-translate-y-0.5 hover:border-cyan-200/50 hover:bg-cyan-300/10 hover:text-cyan-50 active:scale-[0.99]"
              >
                <span className="text-base leading-none" aria-hidden="true">
                  ➕
                </span>
                Start Workout
              </Link>
            </div>

            {exerciseSelectorOpen ? (
              <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/76 px-4 py-10 backdrop-blur-sm">
                <button
                  type="button"
                  aria-label="Close exercise selector"
                  className="absolute inset-0 cursor-default"
                  onClick={() => setExerciseSelectorOpen(false)}
                />
                <div className="relative w-full max-w-4xl overflow-hidden rounded-[28px] border border-cyan-200/22 bg-[radial-gradient(circle_at_18%_0%,rgba(34,211,238,0.16),transparent_34%),rgba(2,6,23,0.96)] p-4 shadow-[0_28px_90px_rgba(0,0,0,0.52),0_0_48px_rgba(34,211,238,0.12)]">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200">
                        Exercise Library Reference
                      </p>
                      <h3 className="mt-1 text-2xl font-black text-white">
                        Select an exercise card
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setExerciseSelectorOpen(false)}
                      className="grid h-10 w-10 place-items-center rounded-2xl border border-white/10 bg-white/[0.045] text-xs font-black text-slate-300 transition hover:border-cyan-200/35 hover:bg-cyan-300/10 hover:text-cyan-100"
                    >
                      X
                    </button>
                  </div>

                  <input
                    type="search"
                    value={exerciseReferenceSearch}
                    onChange={(event) => setExerciseReferenceSearch(event.target.value)}
                    placeholder="Search by exercise, pattern, muscle, equipment, or tag"
                    className="mt-4 w-full rounded-2xl border border-cyan-200/18 bg-slate-950/68 px-4 py-3 text-sm font-bold text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-200/45 focus:bg-slate-950"
                  />

                  <div className="mt-4 grid max-h-[56vh] gap-3 overflow-y-auto pr-1 [scrollbar-color:rgba(34,211,238,0.42)_rgba(15,23,42,0.72)] [scrollbar-width:thin] sm:grid-cols-2">
                    {filteredExerciseReferences.map((exercise) => (
                      <button
                        key={exercise.id}
                        type="button"
                        onClick={() => selectExerciseReference(exercise)}
                        className="group flex gap-3 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/54 p-3 text-left transition hover:-translate-y-0.5 hover:border-cyan-200/36 hover:bg-cyan-300/8"
                      >
                        <img
                          alt=""
                          className="h-20 w-20 shrink-0 rounded-xl border border-white/10 object-cover"
                          src={exercise.image}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-black text-white">
                            {exercise.name}
                          </span>
                          <span className="mt-1 block truncate text-[10px] font-black uppercase tracking-[0.1em] text-cyan-100/80">
                            {exercise.pattern} / {exercise.equipment}
                          </span>
                          <span className="mt-1 line-clamp-2 text-[11px] font-semibold leading-4 text-slate-400">
                            {exercise.muscles}
                          </span>
                          <span className="mt-2 flex flex-wrap gap-1">
                            {[exercise.body, exercise.goal, exercise.level].map((tag) => (
                              <span
                                key={tag}
                                className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.08em] text-slate-300"
                              >
                                {tag}
                              </span>
                            ))}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </section>

        <section
          aria-label="Dashboard vertical orbiter"
          className="relative left-1/2 -order-1 mb-6 w-screen -translate-x-1/2 cursor-grab overflow-visible rounded-none border-y border-cyan-200/12 bg-[radial-gradient(circle_at_50%_18%,rgba(34,211,238,0.13),transparent_34%),radial-gradient(circle_at_82%_28%,rgba(250,204,21,0.09),transparent_28%),linear-gradient(135deg,rgba(15,23,42,0.62),rgba(2,6,23,0.72))] px-0 pb-5 pt-0 shadow-2xl shadow-black/20 outline-none backdrop-blur [touch-action:none] active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-cyan-200/45 sm:pb-6 lg:pb-7"
          onClickCapture={(event) => {
            if (dashboardOrbiterPointerMovedRef.current) {
              event.preventDefault();
              event.stopPropagation();
              dashboardOrbiterPointerMovedRef.current = false;
            }
          }}
          onKeyDown={handleDashboardOrbiterKeyDown}
          onPointerCancel={handleDashboardOrbiterPointerEnd}
          onPointerDown={handleDashboardOrbiterPointerDown}
          onPointerMove={handleDashboardOrbiterPointerMove}
          onPointerUp={handleDashboardOrbiterPointerEnd}
          onWheel={handleDashboardOrbiterWheel}
          tabIndex={0}
        >
          {renderDashboardOrbiterTopMenu()}
          {renderDashboardFloatingSnapshotHeader()}
          <div
            className={`group/row-selector absolute right-2 top-1/2 z-50 isolate flex w-12 -translate-y-1/2 flex-col overflow-hidden p-1.5 shadow-[0_18px_60px_rgba(0,0,0,0.36),0_0_24px_rgba(34,211,238,0.10),inset_0_1px_0_rgba(255,255,255,0.14)] backdrop-blur-2xl transition-[width,background-color,border-color,box-shadow] duration-300 sm:right-4 ${
              clampedDashboardOrbiterRow === 0
                ? "items-center rounded-full border border-amber-100/24 bg-[radial-gradient(circle_at_35%_0%,rgba(251,191,36,0.22),transparent_36%),linear-gradient(180deg,rgba(255,255,255,0.11),rgba(15,23,42,0.50)_42%,rgba(2,6,23,0.44))]"
                : "items-stretch gap-1.5 rounded-[22px] border border-cyan-100/18 bg-[radial-gradient(circle_at_18%_0%,rgba(103,232,249,0.22),transparent_36%),radial-gradient(circle_at_88%_12%,rgba(251,191,36,0.13),transparent_34%),linear-gradient(180deg,rgba(15,23,42,0.70),rgba(2,6,23,0.50))] hover:w-44 hover:border-cyan-100/30 hover:shadow-[0_22px_70px_rgba(0,0,0,0.46),0_0_30px_rgba(34,211,238,0.16),inset_0_1px_0_rgba(255,255,255,0.18)] focus-within:w-44 focus-within:border-cyan-100/30 focus-within:shadow-[0_22px_70px_rgba(0,0,0,0.46),0_0_30px_rgba(34,211,238,0.16),inset_0_1px_0_rgba(255,255,255,0.18)]"
            }`}
          >
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-2 top-0 -z-10 h-px rounded-full bg-gradient-to-r from-transparent via-cyan-100/70 to-transparent"
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(135deg,rgba(255,255,255,0.16),transparent_34%),radial-gradient(circle_at_50%_110%,rgba(34,211,238,0.12),transparent_42%)]"
            />
            {clampedDashboardOrbiterRow === 0 ? (
              <button
                type="button"
                aria-label="Show Dashboards row"
                onClick={() => setDashboardOrbiterRow(1)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-amber-100/30 bg-[radial-gradient(circle_at_35%_16%,rgba(255,255,255,0.24),transparent_34%),linear-gradient(180deg,rgba(251,191,36,0.18),rgba(251,146,60,0.10))] text-sm font-black text-amber-50 shadow-[0_0_26px_rgba(251,191,36,0.18),inset_0_1px_0_rgba(255,255,255,0.16)] backdrop-blur transition hover:translate-y-0.5 hover:border-amber-100/54 hover:bg-amber-300/18 active:scale-95"
                title={dashboardOrbiterRows[1]?.title}
              >
                v
              </button>
            ) : (
              <>
                <button
                  type="button"
                  aria-label="Show dashboard hero row"
                  disabled={clampedDashboardOrbiterRow === 0}
                  onClick={() => moveDashboardOrbiterRow(-1)}
                  className="flex h-8 w-full items-center justify-center rounded-xl border border-cyan-100/24 bg-[radial-gradient(circle_at_32%_12%,rgba(255,255,255,0.22),transparent_34%),rgba(34,211,238,0.10)] px-2 text-sm font-black text-cyan-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.14)] backdrop-blur transition hover:border-cyan-100/48 hover:bg-cyan-300/16 disabled:cursor-not-allowed disabled:opacity-35"
                >
                  ^
                </button>
                {dashboardOrbiterRows.slice(1).map((row, rowOffset) => {
                  const index = rowOffset + 1;
                  const isActive = index === clampedDashboardOrbiterRow;
                  const urgencyTone = getDashboardRowUrgencyTone(
                    row.completion,
                  );

                  return (
                    <button
                      key={row.title}
                      type="button"
                      aria-label={`Show ${row.title} row`}
                      aria-pressed={isActive}
                      onClick={() => setDashboardOrbiterRow(index)}
                      className={`flex min-h-10 w-full items-center gap-2 overflow-hidden rounded-xl border px-2 text-left transition-all ${
                        isActive
                          ? `${urgencyTone.ring} ${urgencyTone.text} shadow-[0_0_18px_rgba(34,211,238,0.14),inset_0_1px_0_rgba(255,255,255,0.16)]`
                          : "border-white/12 bg-white/[0.055] text-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] hover:border-cyan-200/30 hover:bg-cyan-300/10 hover:text-cyan-100"
                      } backdrop-blur`}
                      title={row.helper}
                    >
                      <span
                        aria-hidden="true"
                        className={`relative grid h-5 w-5 shrink-0 place-items-center rounded-full border ${
                          isActive
                            ? urgencyTone.ring
                            : "border-white/10 bg-slate-950/62"
                        }`}
                      >
                        <span
                          className={`grid h-3.5 w-3.5 place-items-center rounded-full text-[7px] font-black leading-none text-slate-950 ${
                            isActive
                              ? urgencyTone.dot
                              : `${urgencyTone.dot} opacity-60`
                          }`}
                        >
                          {urgencyTone.icon}
                        </span>
                      </span>
                      <span className="min-w-0 max-w-0 overflow-hidden opacity-0 transition-all duration-300 group-hover/row-selector:max-w-[8.5rem] group-hover/row-selector:opacity-100 group-focus-within/row-selector:max-w-[8.5rem] group-focus-within/row-selector:opacity-100">
                        <span className="block truncate text-[10px] font-black uppercase tracking-[0.12em]">
                          {row.title}
                        </span>
                      </span>
                    </button>
                  );
                })}
                <button
                  type="button"
                  aria-label="Show dashboard cards row"
                  disabled={
                    clampedDashboardOrbiterRow ===
                    dashboardOrbiterRows.length - 1
                  }
                  onClick={() => moveDashboardOrbiterRow(1)}
                  className="flex h-8 w-full items-center justify-center rounded-xl border border-amber-100/24 bg-[radial-gradient(circle_at_32%_12%,rgba(255,255,255,0.20),transparent_34%),rgba(251,191,36,0.10)] px-2 text-sm font-black text-amber-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.14)] backdrop-blur transition hover:border-amber-100/48 hover:bg-amber-300/16 disabled:cursor-not-allowed disabled:opacity-35"
                >
                  v
                </button>
              </>
            )}
          </div>
          <div className="relative z-10 mt-4 h-[min(78vh,760px)] min-h-[640px] overflow-hidden sm:mt-5 sm:min-h-[670px] lg:mt-5 lg:min-h-[700px]">
            <div
              className="grid h-[300%] grid-rows-3 transition-transform duration-[620ms] ease-[cubic-bezier(0.2,0.85,0.25,1)]"
              style={{
                transform: `translateY(-${
                  clampedDashboardOrbiterRow *
                  (100 / dashboardOrbiterRows.length)
                }%)`,
              }}
            >
              <div
                className={`flex min-h-0 items-start justify-center pl-6 pr-20 pt-2 transition-opacity duration-300 sm:pl-10 sm:pr-24 sm:pt-3 lg:pl-12 lg:pr-28 lg:pt-4 ${
                  clampedDashboardOrbiterRow === 0
                    ? "pointer-events-auto opacity-100"
                    : "pointer-events-none opacity-40"
                }`}
              >
                <div className="flex w-full max-w-[1120px] flex-col items-center gap-3 sm:gap-4">
                  {renderDashboardHeroRow()}
                  {renderFavoriteWorkoutsCard()}
                </div>
              </div>
              {renderDashboardOrbitCardRow({
                cards: dashboardCommandCenterCards,
                description:
                  "Rotate through training, fuel, recovery, performance, education, and Sound World command centers.",
                getDistance: getCommandCenterOrbitDistance,
                kicker: "Dashboards",
                pointerMovedRef: commandCenterPointerMovedRef,
                pointerStartRef: commandCenterPointerStartRef,
                rotateOrbit: rotateCommandCenter,
                rowIndex: 1,
                setActiveIndex: setActiveCommandCenterIndex,
                title: "Choose Your Command Center",
              })}
              {renderDashboardOrbitCardRow({
                cards: dashboardSystemCards,
                description:
                  "Goals, insights, stats, calendar, appointments, messages, packages, and achievements live together here.",
                getDistance: getSystemCenterOrbitDistance,
                kicker: "Systems",
                pointerMovedRef: systemCenterPointerMovedRef,
                pointerStartRef: systemCenterPointerStartRef,
                rotateOrbit: rotateSystemCenter,
                rowIndex: 2,
                setActiveIndex: setActiveSystemCenterIndex,
                title: "System Row",
              })}
            </div>
          </div>
        </section>
        {renderDashboardProfileHubOverlay()}

        <section className="mb-6">
          <DashboardCalendar items={dashboardCalendarItems} />
        </section>

        <section className="mb-6">
          <DashboardCharts
            goalProgressPercent={dashboardCharts.goalProgressPercent}
            nutritionConsistency={dashboardCharts.nutritionConsistency}
            recoveryTrend={dashboardCharts.recoveryTrend}
            trainingVolume={dashboardCharts.trainingVolume}
          />
        </section>

        <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {statCards.map((card) => (
            <div
              key={card.label}
              className="rounded-[24px] border border-white/10 bg-white/[0.05] p-5 shadow-xl shadow-black/15 backdrop-blur"
            >
              <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                {card.label}
              </div>
              <div className="mt-3 break-words text-2xl font-black tracking-tight text-white">
                {card.value}
              </div>
              <div className="mt-2 text-sm text-slate-400">{card.detail}</div>
            </div>
          ))}
        </section>

        <section className="mb-6 grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[28px] border border-white/10 bg-white/[0.045] p-5 shadow-2xl shadow-black/15 backdrop-blur sm:rounded-[32px] sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="text-[11px] font-black uppercase tracking-[0.22em] text-amber-300">
                  Current Week
                </div>
                <h2 className="mt-2 text-2xl font-black tracking-tight">
                  Plan snapshot
                </h2>
              </div>
              <Link
                href={ROUTES.dashboard.myPlan}
                className="min-h-[44px] rounded-2xl border border-amber-300/25 bg-amber-300/10 px-4 py-3 text-center text-xs font-black uppercase tracking-[0.14em] text-amber-200 transition hover:bg-amber-300 hover:text-slate-950"
              >
                Open Plan
              </Link>
            </div>

            <div className="mt-5 space-y-3">
              {planHighlights.map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-white/10 bg-slate-950/45 px-4 py-3"
                >
                  <div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
                    {item.label}
                  </div>
                  <p className="mt-1 text-sm font-bold leading-6 text-white">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/[0.045] p-5 shadow-2xl shadow-black/15 backdrop-blur sm:rounded-[32px] sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="text-[11px] font-black uppercase tracking-[0.22em] text-emerald-300">
                  Recent Workout Activity
                </div>
                <h2 className="mt-2 text-2xl font-black tracking-tight">
                  {dashboardSummary.latestExercise}
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  {dashboardSummary.mostRecentDate}
                </p>
              </div>
              <Link
                href={ROUTES.dashboard.stats}
                className="min-h-[44px] rounded-2xl border border-emerald-300/25 bg-emerald-400/10 px-4 py-3 text-center text-xs font-black uppercase tracking-[0.14em] text-emerald-200 transition hover:bg-emerald-300 hover:text-slate-950"
              >
                Stats
              </Link>
            </div>

            {dashboardSummary.hasStats ? (
              <div className="mt-5 grid gap-3 lg:grid-cols-3">
                {dashboardSummary.latestEntries.map((entry, index) => (
                  <div
                    key={`${entry.date}-${entry.exerciseId}-${index}`}
                    className="rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3"
                  >
                    <div className="text-sm font-bold leading-5 text-white">
                      {entry.exerciseName}
                    </div>
                    <p className="mt-2 text-sm text-slate-400">
                      {entry.weight} x {entry.reps} x {entry.sets}
                    </p>
                    <span className="mt-3 inline-flex rounded-full border border-sky-400/20 bg-sky-500/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-sky-300">
                      {entry.source === "workout-session"
                        ? "Workout"
                        : "Library"}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-5 rounded-2xl border border-white/10 bg-slate-950/55 p-4 text-sm leading-6 text-slate-300">
                No saved workout activity yet. Start the session hub to create
                your first local stats entry.
              </p>
            )}
          </div>
        </section>

        <section className="mb-6 grid gap-4 lg:grid-cols-3">
          <Link
            href={ROUTES.dashboard.videoReview}
            className="group rounded-[26px] border border-sky-300/20 bg-sky-400/10 p-5 shadow-xl shadow-black/15 transition hover:border-sky-300/45 hover:bg-sky-400/15"
          >
            <div className="text-[11px] font-black uppercase tracking-[0.2em] text-sky-300">
              Video Review
            </div>
            <h3 className="mt-3 text-xl font-black tracking-tight text-white">
              Submit a lift for coach feedback
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              MVP review queue with related exercise and linked workout fields.
            </p>
            <div className="mt-4 text-xs font-black uppercase tracking-[0.16em] text-sky-200 transition group-hover:translate-x-1">
              Open Video Review
            </div>
          </Link>

          <Link
            href={ROUTES.dashboard.recovery}
            className="group rounded-[26px] border border-emerald-300/20 bg-emerald-400/10 p-5 shadow-xl shadow-black/15 transition hover:border-emerald-300/45 hover:bg-emerald-400/15"
          >
            <div className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-300">
              Recovery / Readiness
            </div>
            <h3 className="mt-3 text-xl font-black tracking-tight text-white">
              Keep readiness in the loop
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Mobility, soreness, and recovery recommendations remain secondary
              until readiness data is wired.
            </p>
            <div className="mt-4 text-xs font-black uppercase tracking-[0.16em] text-emerald-200 transition group-hover:translate-x-1">
              Open Recovery
            </div>
          </Link>

          <Link
            href={ROUTES.nutrition.home}
            className="group rounded-[26px] border border-amber-300/20 bg-amber-300/10 p-5 shadow-xl shadow-black/15 transition hover:border-amber-300/45 hover:bg-amber-300/15"
          >
            <div className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-300">
              Nutrition
            </div>
            <h3 className="mt-3 text-xl font-black tracking-tight text-white">
              Fuel the next phase
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Recipes, meal prep, and grocery tools are available while deeper
              nutrition logic stays future-scoped.
            </p>
            <div className="mt-4 text-xs font-black uppercase tracking-[0.16em] text-amber-200 transition group-hover:translate-x-1">
              Open Nutrition
            </div>
          </Link>
        </section>

        <section className="mb-6 grid gap-5 xl:grid-cols-[1fr_1fr]">
          <div className="rounded-[28px] border border-white/10 bg-white/[0.035] p-5 shadow-2xl shadow-black/15 backdrop-blur sm:rounded-[32px] sm:p-6">
            <div className="text-[11px] font-black uppercase tracking-[0.22em] text-fuchsia-300">
              Continuation Program
            </div>
            <h2 className="mt-2 text-2xl font-black tracking-tight">
              Keep the plan moving
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Use My Plan and the Sessions hub as the active continuation path
              for weekly programming, workout launches, and progress follow-up.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Link
                href={ROUTES.dashboard.myPlan}
                className="min-h-[48px] rounded-2xl border border-fuchsia-300/20 bg-fuchsia-400/10 px-4 py-3 text-center text-xs font-black uppercase tracking-[0.14em] text-fuchsia-100 transition hover:bg-fuchsia-300 hover:text-slate-950"
              >
                Review Plan
              </Link>
              <Link
                href={ROUTES.dashboard.sessions}
                className="min-h-[48px] rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-center text-xs font-black uppercase tracking-[0.14em] text-white transition hover:border-sky-300/40 hover:bg-sky-400/10"
              >
                Sessions Hub
              </Link>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/[0.035] p-5 shadow-2xl shadow-black/15 backdrop-blur sm:rounded-[32px] sm:p-6">
            <div className="text-[11px] font-black uppercase tracking-[0.22em] text-cyan-300">
              Performance / Conditioning
            </div>
            <h2 className="mt-2 text-2xl font-black tracking-tight">
              Track capacity without clutter
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Stats are the live source today. Conditioning, calendars, and
              deeper performance trends can build from the same workout logs.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Link
                href={ROUTES.dashboard.stats}
                className="min-h-[48px] rounded-2xl border border-cyan-300/20 bg-cyan-400/10 px-4 py-3 text-center text-xs font-black uppercase tracking-[0.14em] text-cyan-100 transition hover:bg-cyan-300 hover:text-slate-950"
              >
                View Stats
              </Link>
              <Link
                href={ROUTES.dashboard.trainingCalendar}
                className="min-h-[48px] rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-center text-xs font-black uppercase tracking-[0.14em] text-white transition hover:border-cyan-300/40 hover:bg-cyan-400/10"
              >
                Calendar
              </Link>
            </div>
          </div>
        </section>

        <section className="rounded-[32px] border border-white/10 bg-white/[0.035] p-5 shadow-2xl shadow-black/15 backdrop-blur sm:p-6">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">
                Member Areas
              </div>
              <h2 className="mt-2 text-2xl font-black uppercase tracking-tight text-slate-200">
                Where do I go?
              </h2>
            </div>
            <p className="max-w-md text-sm leading-6 text-slate-500">
              Primary training actions are above. These areas stay available as
              the broader member experience fills in.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {memberAreaCards.map((card) => (
              <Link
                key={card.title}
                href={card.href}
                className="group rounded-[24px] border border-white/10 bg-slate-950/35 p-4 transition duration-300 hover:border-sky-400/35 hover:bg-sky-500/10"
              >
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                  {card.label}
                </div>
                <h3 className="mt-2 text-base font-black uppercase tracking-tight text-white">
                  {card.title}
                </h3>
                <p className="mt-2 min-h-[66px] text-sm leading-6 text-slate-500">
                  {card.text}
                </p>
                <div className="mt-3 text-xs font-black uppercase tracking-[0.16em] text-sky-400 transition group-hover:translate-x-1">
                  Open
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-6 overflow-hidden rounded-[34px] border border-cyan-100/18 bg-[radial-gradient(circle_at_16%_0%,rgba(34,211,238,0.16),transparent_34%),radial-gradient(circle_at_88%_14%,rgba(250,204,21,0.11),transparent_30%),linear-gradient(135deg,rgba(15,23,42,0.72),rgba(2,6,23,0.56))] p-5 shadow-[0_28px_90px_rgba(0,0,0,0.34),0_0_46px_rgba(34,211,238,0.08)] backdrop-blur-xl sm:p-6 lg:p-7">
          <div className="pointer-events-none h-px rounded-full bg-gradient-to-r from-transparent via-cyan-200/60 to-amber-200/50 shadow-[0_0_28px_rgba(34,211,238,0.24)]" />

          <div className="mt-6 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex rounded-full border border-cyan-200/20 bg-cyan-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100">
                Global Progression Hub
              </div>
              <h2 className="mt-3 text-3xl font-black uppercase tracking-tight text-white sm:text-4xl">
                MASTER TRAINING JOURNEY
              </h2>
              <p className="mt-3 text-sm font-semibold leading-6 text-slate-300 sm:text-base">
                Track your full progression across training, recovery,
                nutrition, performance, mobility, and coaching systems.
              </p>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-slate-950/54 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] lg:min-w-[260px]">
              <div className="flex items-center justify-between gap-4">
                <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                  Ecosystem XP
                </span>
                <span className="text-lg font-black text-cyan-100">
                  {masterJourneyProgress}%
                </span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-950/80">
                <span
                  className="block h-full rounded-full bg-gradient-to-r from-emerald-300 via-cyan-300 to-amber-300 shadow-[0_0_24px_rgba(34,211,238,0.28)]"
                  style={{ width: `${masterJourneyProgress}%` }}
                />
              </div>
              <p className="mt-3 text-xs font-bold leading-5 text-slate-400">
                Current focus:{" "}
                <span className="text-cyan-100">{masterJourneyCurrentFocus}</span>
              </p>
            </div>
          </div>

          <div className="mt-7 overflow-x-auto overscroll-x-contain pb-4 scroll-smooth [scrollbar-color:rgba(34,211,238,0.38)_rgba(15,23,42,0.72)] [scrollbar-width:thin] [touch-action:pan-x] [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-cyan-300/42 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-slate-950/70">
            <div className="flex min-w-max items-stretch">
              {masterJourneyNodes.map((node, index) => {
                const isActive = node.state === "active";
                const isComplete = node.state === "complete";
                const isLocked = node.state === "locked";

                return (
                  <div
                    className="flex items-center"
                    key={`${node.label}-${index}`}
                  >
                    <Link
                      href={node.href}
                      aria-current={isActive ? "step" : undefined}
                      className={`group relative flex min-h-[178px] w-[176px] flex-col justify-between rounded-[28px] border p-4 text-left transition duration-300 hover:-translate-y-1 ${
                        isActive
                          ? "border-cyan-200/65 bg-cyan-300/14 text-cyan-50 shadow-[0_0_38px_rgba(34,211,238,0.22)] ring-1 ring-cyan-200/25"
                          : isComplete
                            ? "border-emerald-300/32 bg-emerald-300/10 text-emerald-100 shadow-[0_0_22px_rgba(16,185,129,0.10)]"
                            : isLocked
                              ? "border-white/10 bg-white/[0.025] text-slate-500 opacity-60 hover:opacity-85"
                              : "border-white/10 bg-slate-950/56 text-slate-300 hover:border-cyan-200/32 hover:bg-cyan-300/8 hover:text-white"
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3">
                          <span
                            className={`grid h-12 w-12 place-items-center rounded-2xl border text-2xl ${
                              isActive
                                ? "border-cyan-100/40 bg-cyan-200/16 shadow-[0_0_24px_rgba(34,211,238,0.18)]"
                                : isComplete
                                  ? "border-emerald-100/28 bg-emerald-300/12"
                                  : "border-white/10 bg-slate-950/64"
                            }`}
                            aria-hidden="true"
                          >
                            {node.icon}
                          </span>
                          {isComplete ? (
                            <span className="grid h-6 w-6 place-items-center rounded-full bg-emerald-300 text-xs font-black text-slate-950">
                              ✓
                            </span>
                          ) : null}
                        </div>

                        <h3 className="mt-4 text-base font-black uppercase tracking-tight text-white">
                          {node.label}
                        </h3>
                      </div>

                      <div className="mt-4 space-y-2">
                        {isActive ? (
                          <span className="inline-flex rounded-full border border-cyan-100/30 bg-cyan-300/16 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-cyan-50">
                            Current Focus
                          </span>
                        ) : null}
                        <p
                          className={`text-[10px] font-black uppercase tracking-[0.14em] ${
                            isLocked ? "text-slate-600" : "text-slate-400"
                          }`}
                        >
                          {node.metric}
                        </p>
                      </div>
                    </Link>

                    {index < masterJourneyNodes.length - 1 ? (
                      <span className="mx-2 h-px w-12 shrink-0 bg-gradient-to-r from-cyan-300/40 via-amber-200/35 to-cyan-300/12 shadow-[0_0_16px_rgba(34,211,238,0.20)]" />
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
