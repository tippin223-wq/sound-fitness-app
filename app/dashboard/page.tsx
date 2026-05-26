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

const getDashboardLocalDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const addDashboardDays = (date: Date, days: number) => {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  next.setDate(next.getDate() + days);
  return next;
};

const getDashboardEntryDateKey = (value?: string | null) => {
  if (!value) return null;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;

  return getDashboardLocalDateKey(parsed);
};

const getDashboardEntryStreak = (dateKeys: Set<string>, endDate: Date) => {
  let streak = 0;
  let cursor = new Date(
    endDate.getFullYear(),
    endDate.getMonth(),
    endDate.getDate(),
  );

  while (dateKeys.has(getDashboardLocalDateKey(cursor))) {
    streak += 1;
    cursor = addDashboardDays(cursor, -1);
  }

  return streak;
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

type ManualExerciseLibraryCategory = {
  exercises: Exercise[];
  helper: string;
  id: string;
  label: string;
};

type ManualExerciseCategoryIconName =
  | "core"
  | "library"
  | "lower"
  | "mobility"
  | "power"
  | "saved"
  | "today"
  | "upper"
  | "user";

const manualExerciseMovementCategoryLabels = [
  "Lower Body Compound",
  "Lower Body Isolation",
  "Core",
  "Upper Push",
  "Upper Pull",
  "Arm Isolation",
  "Athletic",
  "Integrated",
  "Mobility",
  "Cervical Isolation",
] as const;

type ManualExerciseMovementCategory =
  (typeof manualExerciseMovementCategoryLabels)[number];

const manualExerciseLibraryBaseCategories = [
  {
    id: "my-plan",
    label: "My Plan",
    fallbackExerciseIds: [
      "goblet-squat",
      "db-bench-press",
      "one-arm-db-row",
      "dead-bug",
      "farmer-carry",
      "hip-mobility-flow",
    ],
  },
  {
    id: "favorites",
    label: "Favorites",
    fallbackExerciseIds: [
      "goblet-squat",
      "push-up",
      "bent-over-row",
      "pallof-press",
      "kettlebell-swing",
      "worlds-greatest-stretch",
    ],
  },
  ...manualExerciseMovementCategoryLabels.map((label) => ({
    id: label.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    label,
    fallbackExerciseIds: [],
  })),
] as const;

const manualExerciseCategoryThemeByLabel: Record<
  string,
  {
    accent: string;
    accentSoft: string;
    accentStrong: string;
    glow: string;
    icon: ManualExerciseCategoryIconName;
  }
> = {
  "My Plan": {
    accent: "rgb(34, 211, 238)",
    accentSoft: "rgba(34, 211, 238, 0.18)",
    accentStrong: "rgb(103, 232, 249)",
    glow: "rgba(34, 211, 238, 0.22)",
    icon: "today",
  },
  Favorites: {
    accent: "rgb(250, 204, 21)",
    accentSoft: "rgba(250, 204, 21, 0.18)",
    accentStrong: "rgb(254, 240, 138)",
    glow: "rgba(250, 204, 21, 0.20)",
    icon: "saved",
  },
  "Lower Body Compound": {
    accent: "rgb(16, 185, 129)",
    accentSoft: "rgba(16, 185, 129, 0.18)",
    accentStrong: "rgb(110, 231, 183)",
    glow: "rgba(16, 185, 129, 0.22)",
    icon: "lower",
  },
  "Lower Body Isolation": {
    accent: "rgb(132, 204, 22)",
    accentSoft: "rgba(132, 204, 22, 0.18)",
    accentStrong: "rgb(190, 242, 100)",
    glow: "rgba(132, 204, 22, 0.20)",
    icon: "lower",
  },
  Core: {
    accent: "rgb(45, 212, 191)",
    accentSoft: "rgba(45, 212, 191, 0.18)",
    accentStrong: "rgb(153, 246, 228)",
    glow: "rgba(45, 212, 191, 0.20)",
    icon: "core",
  },
  "Upper Push": {
    accent: "rgb(56, 189, 248)",
    accentSoft: "rgba(56, 189, 248, 0.18)",
    accentStrong: "rgb(186, 230, 253)",
    glow: "rgba(56, 189, 248, 0.22)",
    icon: "upper",
  },
  "Upper Pull": {
    accent: "rgb(129, 140, 248)",
    accentSoft: "rgba(129, 140, 248, 0.18)",
    accentStrong: "rgb(199, 210, 254)",
    glow: "rgba(129, 140, 248, 0.22)",
    icon: "upper",
  },
  "Arm Isolation": {
    accent: "rgb(168, 85, 247)",
    accentSoft: "rgba(168, 85, 247, 0.18)",
    accentStrong: "rgb(216, 180, 254)",
    glow: "rgba(168, 85, 247, 0.22)",
    icon: "upper",
  },
  Athletic: {
    accent: "rgb(251, 146, 60)",
    accentSoft: "rgba(251, 146, 60, 0.18)",
    accentStrong: "rgb(253, 186, 116)",
    glow: "rgba(251, 146, 60, 0.20)",
    icon: "power",
  },
  Integrated: {
    accent: "rgb(244, 114, 182)",
    accentSoft: "rgba(244, 114, 182, 0.18)",
    accentStrong: "rgb(251, 207, 232)",
    glow: "rgba(244, 114, 182, 0.20)",
    icon: "power",
  },
  Mobility: {
    accent: "rgb(103, 232, 249)",
    accentSoft: "rgba(103, 232, 249, 0.16)",
    accentStrong: "rgb(207, 250, 254)",
    glow: "rgba(103, 232, 249, 0.18)",
    icon: "mobility",
  },
  "Cervical Isolation": {
    accent: "rgb(148, 163, 184)",
    accentSoft: "rgba(148, 163, 184, 0.16)",
    accentStrong: "rgb(226, 232, 240)",
    glow: "rgba(148, 163, 184, 0.18)",
    icon: "mobility",
  },
};

function ManualExerciseCategoryIcon({
  className = "h-4 w-4",
  name,
}: {
  className?: string;
  name: ManualExerciseCategoryIconName;
}) {
  const iconProps = {
    "aria-hidden": true,
    className,
    fill: "none",
    focusable: false,
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 2,
    viewBox: "0 0 24 24",
  };

  switch (name) {
    case "lower":
      return (
        <svg {...iconProps}>
          <path d="M9 3v6l-2.5 5.5 4 1.5 2-5 3.5 3-1 7h4l1-9-5.5-5V3" />
          <path d="M7 21h5" />
        </svg>
      );
    case "upper":
      return (
        <svg {...iconProps}>
          <path d="M6 7v10" />
          <path d="M18 7v10" />
          <path d="M3 9v6" />
          <path d="M21 9v6" />
          <path d="M6 12h12" />
        </svg>
      );
    case "core":
      return (
        <svg {...iconProps}>
          <circle cx="12" cy="12" r="7" />
          <path d="M12 5v14" />
          <path d="M5 12h14" />
          <path d="M8.5 8.5h.01" />
          <path d="M15.5 15.5h.01" />
        </svg>
      );
    case "power":
      return (
        <svg {...iconProps}>
          <path d="M13 2 4 14h7l-1 8 10-13h-7l1-7Z" />
        </svg>
      );
    case "mobility":
      return (
        <svg {...iconProps}>
          <path d="M22 12h-4l-3 8-6-16-3 8H2" />
        </svg>
      );
    case "saved":
      return (
        <svg {...iconProps} fill="currentColor">
          <path d="m12 2 3.09 6.26 6.91 1-5 4.87 1.18 6.87L12 17.77 5.82 21 7 14.13l-5-4.87 6.91-1L12 2Z" />
        </svg>
      );
    case "today":
      return (
        <svg {...iconProps}>
          <path d="M8 2v4" />
          <path d="M16 2v4" />
          <rect x="3" y="4" width="18" height="18" rx="3" />
          <path d="M3 10h18" />
          <path d="m8.5 15 2.2 2.2L16 12" />
        </svg>
      );
    case "user":
      return (
        <svg {...iconProps}>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21a8 8 0 0 1 16 0" />
        </svg>
      );
    default:
      return (
        <svg {...iconProps}>
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
          <path d="M9 6h7" />
          <path d="M9 10h5" />
          <path d="M9 14h6" />
        </svg>
      );
  }
}

const manualExercisePatternCategoryByToken: Record<
  string,
  ManualExerciseMovementCategory
> = {
  "anti-extension": "Core",
  "anti-lateral-flexion": "Core",
  "anti-rotation": "Core",
  carry: "Athletic",
  conditioning: "Athletic",
  core: "Core",
  crawl: "Athletic",
  flexion: "Core",
  gait: "Athletic",
  hinge: "Lower Body Compound",
  "hip-thrust-bridge": "Lower Body Compound",
  "horizontal-pull": "Upper Pull",
  "horizontal-push": "Upper Push",
  jump: "Athletic",
  lunge: "Lower Body Compound",
  mobility: "Mobility",
  power: "Athletic",
  "power-push": "Athletic",
  pull: "Upper Pull",
  rotation: "Core",
  squat: "Lower Body Compound",
  "squat-to-press": "Integrated",
  sprint: "Athletic",
  "step-up": "Lower Body Compound",
  throw: "Athletic",
  "vertical-pull": "Upper Pull",
  "vertical-push": "Upper Push",
};

const normalizeManualExerciseToken = (value?: string) =>
  (value || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const getManualExerciseMovementCategory = (
  exercise: Exercise,
): ManualExerciseMovementCategory => {
  const patternToken = normalizeManualExerciseToken(exercise.pattern);
  const nameToken = normalizeManualExerciseToken(exercise.name);
  const bodyToken = normalizeManualExerciseToken(exercise.body);
  const combinedToken = `${nameToken}-${patternToken}-${bodyToken}`;

  if (combinedToken.includes("neck") || combinedToken.includes("cervical")) {
    return "Cervical Isolation";
  }
  if (combinedToken.includes("mobility") || combinedToken.includes("stretch")) {
    return "Mobility";
  }
  if (
    combinedToken.includes("thruster") ||
    combinedToken.includes("turkish") ||
    combinedToken.includes("bear-crawl") ||
    patternToken === "squat-to-press"
  ) {
    return "Integrated";
  }
  if (
    combinedToken.includes("calf") ||
    combinedToken.includes("tibialis") ||
    combinedToken.includes("leg-extension") ||
    combinedToken.includes("leg-curl") ||
    combinedToken.includes("hip-abduction") ||
    combinedToken.includes("hip-adduction") ||
    combinedToken.includes("kickback") ||
    combinedToken.includes("frog-pump")
  ) {
    return "Lower Body Isolation";
  }
  if (
    combinedToken.includes("curl") ||
    combinedToken.includes("triceps") ||
    combinedToken.includes("wrist") ||
    combinedToken.includes("face-pull") ||
    combinedToken.includes("external-rotation") ||
    combinedToken.includes("internal-rotation")
  ) {
    return "Arm Isolation";
  }
  if (manualExercisePatternCategoryByToken[patternToken]) {
    return manualExercisePatternCategoryByToken[patternToken];
  }
  if (bodyToken.includes("chest") || bodyToken.includes("shoulder")) {
    return "Upper Push";
  }
  if (bodyToken.includes("back")) return "Upper Pull";
  if (
    bodyToken.includes("leg") ||
    bodyToken.includes("glute") ||
    bodyToken.includes("hamstring") ||
    bodyToken.includes("posterior-chain")
  ) {
    return "Lower Body Compound";
  }
  if (bodyToken.includes("core")) return "Core";

  return "Athletic";
};

const getManualExerciseFallbacks = (exerciseIds: readonly string[]) =>
  exerciseIds
    .map((exerciseId) =>
      exerciseLibrary.find((exercise) => exercise.id === exerciseId),
    )
    .filter((exercise): exercise is Exercise => Boolean(exercise));

const createManualExerciseLibraryCategories = ({
  favoriteExercises,
  myPlanExercises,
}: {
  favoriteExercises: Exercise[];
  myPlanExercises: Exercise[];
}) => {
  const grouped = exerciseLibrary.reduce((categories, exercise) => {
    const label = getManualExerciseMovementCategory(exercise);
    const current = categories.get(label) || [];
    current.push(exercise);
    categories.set(label, current);

    return categories;
  }, new Map<ManualExerciseMovementCategory, Exercise[]>());

  return manualExerciseLibraryBaseCategories.map((category) => {
    const fallbackExercises = getManualExerciseFallbacks(
      category.fallbackExerciseIds,
    );
    const exercises =
      category.id === "my-plan"
        ? myPlanExercises.length
          ? myPlanExercises
          : fallbackExercises
        : category.id === "favorites"
          ? favoriteExercises.length
            ? favoriteExercises
            : fallbackExercises
          : grouped.get(category.label as ManualExerciseMovementCategory) || [];

    return {
      exercises,
      helper:
        category.id === "my-plan"
          ? myPlanExercises.length
            ? `${myPlanExercises.length.toLocaleString()} planned`
            : "Plan preview"
          : category.id === "favorites"
            ? favoriteExercises.length
              ? `${favoriteExercises.length.toLocaleString()} saved`
              : "Favorite preview"
            : `${exercises.length.toLocaleString()} cards`,
      id: category.id,
      label: category.label,
    };
  });
};

function ManualExerciseLibraryPreview({
  activeCategoryId,
  categories,
  manualStatsDraft,
  onCategorySelect,
  onCategoryShift,
  onExerciseSelect,
  onManualStatsDraftChange,
  onSaveManualStats,
  selectedExerciseCue,
  selectedExerciseIds,
}: {
  activeCategoryId: string;
  categories: ManualExerciseLibraryCategory[];
  manualStatsDraft: ManualStatsDraft;
  onCategorySelect: (categoryId: string) => void;
  onCategoryShift: (direction: "left" | "right") => void;
  onExerciseSelect: (exercise: Exercise) => void;
  onManualStatsDraftChange: (
    field: keyof ManualStatsDraft,
    value: string,
  ) => void;
  onSaveManualStats: () => void;
  selectedExerciseCue?: string;
  selectedExerciseIds: Set<string>;
}) {
  const activeCategory =
    categories.find(
      (category) => category.id === activeCategoryId,
    ) || categories[0];
  const visibleExercises = activeCategory?.exercises || [];
  const exerciseCardScrollerRef = useRef<HTMLDivElement | null>(null);
  const [exerciseCardsCanScrollDown, setExerciseCardsCanScrollDown] =
    useState(false);
  const quickManualSliderFields: Array<{
    defaultValue: number;
    field: keyof Pick<ManualStatsDraft, "load" | "reps" | "rpe" | "sets">;
    label: string;
    max: number;
    min: number;
    step: number;
    valueLabel: (value: number) => string;
  }> = [
    {
      defaultValue: 3,
      field: "sets",
      label: "Sets",
      max: 10,
      min: 1,
      step: 1,
      valueLabel: (value) => `${value}`,
    },
    {
      defaultValue: 10,
      field: "reps",
      label: "Reps",
      max: 40,
      min: 1,
      step: 1,
      valueLabel: (value) => `${value}`,
    },
    {
      defaultValue: 185,
      field: "load",
      label: "Load",
      max: 450,
      min: 0,
      step: 5,
      valueLabel: (value) => (value >= 450 ? "450+ lb" : `${value} lb`),
    },
    {
      defaultValue: 8,
      field: "rpe",
      label: "RPE",
      max: 10,
      min: 1,
      step: 1,
      valueLabel: (value) => `${value}/10`,
    },
  ];
  const getQuickManualSliderValue = (
    field: (typeof quickManualSliderFields)[number],
  ) => {
    const rawValue = manualStatsDraft[field.field];
    const numericValue = Number.parseFloat(
      String(rawValue).replace(/[^\d.]/g, ""),
    );
    const fallbackValue = Number.isFinite(numericValue)
      ? numericValue
      : field.defaultValue;

    return Math.min(field.max, Math.max(field.min, fallbackValue));
  };
  const activeCategoryIndex = Math.max(
    0,
    categories.findIndex((category) => category.id === activeCategory?.id),
  );
  const maxExerciseCount = Math.max(
    1,
    ...categories.map((category) => category.exercises.length),
  );
  const getCategoryOrbitOffset = (categoryIndex: number) => {
    const totalCategories = Math.max(1, categories.length);
    let offset = categoryIndex - activeCategoryIndex;

    if (totalCategories > 1) {
      const halfCategoryCount = totalCategories / 2;

      if (offset > halfCategoryCount) offset -= totalCategories;
      if (offset < -halfCategoryCount) offset += totalCategories;
    }

    return offset;
  };
  const updateExerciseCardsScrollCue = (
    scroller = exerciseCardScrollerRef.current,
  ) => {
    if (!scroller) return;

    const hasMoreBelow =
      scroller.scrollTop + scroller.clientHeight < scroller.scrollHeight - 4;

    setExerciseCardsCanScrollDown((current) =>
      current === hasMoreBelow ? current : hasMoreBelow,
    );
  };
  const scrollExerciseCardsDown = () => {
    const scroller = exerciseCardScrollerRef.current;

    if (!scroller) return;

    scroller.scrollBy({
      behavior: "smooth",
      top: Math.max(132, scroller.clientHeight * 0.72),
    });
  };

  useEffect(() => {
    const scroller = exerciseCardScrollerRef.current;

    if (!scroller) return;

    const updateScrollCue = () => updateExerciseCardsScrollCue(scroller);
    const animationFrame = window.requestAnimationFrame(() => {
      scroller.scrollTop = 0;
      updateScrollCue();
    });
    let resizeObserver: ResizeObserver | null = null;

    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(updateScrollCue);
      resizeObserver.observe(scroller);
    }

    window.addEventListener("resize", updateScrollCue);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", updateScrollCue);
      resizeObserver?.disconnect();
    };
  }, [activeCategory?.id, selectedExerciseCue, visibleExercises.length]);

  return (
    <div className="w-full">
      <div className="relative mx-auto flex max-w-[56rem] items-center justify-center gap-2 text-center">
        <button
          type="button"
          aria-label="Previous exercise category"
          onClick={() => onCategoryShift("left")}
          className="grid h-9 w-8 shrink-0 place-items-center rounded-xl border border-transparent bg-transparent text-xs font-black text-cyan-100/80 transition hover:-translate-x-0.5 hover:border-amber-200/28 hover:bg-amber-300/8 hover:text-amber-100 active:scale-95"
        >
          &lt;
        </button>
        <div
          aria-label="Manual stats exercise category orbital"
          className="exercise-library-row-title-icon-line exercise-library-row-title-icon-line--orbit relative min-w-0 flex-1 overflow-visible px-1 py-1"
          style={{ height: "4.8rem", minHeight: "4.8rem" }}
        >
          {categories.map((category, categoryIndex) => {
            const active = category.id === activeCategory?.id;
            const orbitOffset = getCategoryOrbitOffset(categoryIndex);
            const orbitVisible = Math.abs(orbitOffset) <= 4;
            const categoryTheme =
              manualExerciseCategoryThemeByLabel[category.label] ||
              manualExerciseCategoryThemeByLabel.Mobility;
            const goalFillPercent = Math.round(
              (category.exercises.length / maxExerciseCount) * 100,
            );
            const categoryStyle = {
              "--exercise-category-goal-progress": `${goalFillPercent}%`,
              "--exercise-theme-accent": categoryTheme.accent,
              "--exercise-theme-accent-soft": categoryTheme.accentSoft,
              "--exercise-theme-accent-strong": categoryTheme.accentStrong,
              "--exercise-theme-glow": categoryTheme.glow,
            } as CSSProperties;

            return (
              <span
                key={category.id}
                aria-hidden={orbitVisible ? undefined : true}
                className="exercise-library-horizontal-card-scroller-slot relative flex shrink-0 overflow-visible"
                data-orbit-offset={orbitVisible ? String(orbitOffset) : undefined}
                data-orbit-visible={orbitVisible ? "true" : undefined}
              >
                <button
                  type="button"
                  aria-pressed={active}
                  data-section-key={category.id}
                  onClick={() => onCategorySelect(category.id)}
                  style={categoryStyle}
                  tabIndex={orbitVisible ? 0 : -1}
                  title={`${category.label}. ${category.helper}`}
                  className={`exercise-library-page-section-tab ${
                    active
                      ? "exercise-library-page-section-tab--active"
                      : "exercise-library-page-section-tab--inactive"
                  } group/tile flex h-11 shrink-0 items-center gap-2 border py-2 text-left transition duration-200 sm:h-12 ${
                    active
                      ? "w-[10rem] scale-[1.01] justify-start border-cyan-300/40 bg-cyan-300/10 px-3 text-white shadow-[0_0_28px_rgba(34,211,238,0.18)] sm:w-[11.25rem] sm:px-3.5"
                      : "w-11 justify-center border-white/10 bg-white/[0.04] px-2 text-slate-100 opacity-[0.88] hover:-translate-y-0.5 hover:border-cyan-200/24 hover:bg-cyan-300/10 hover:opacity-100 sm:w-12"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className="exercise-library-page-section-tab__goal-fill"
                  />
                  <span
                    aria-hidden="true"
                    className="exercise-library-page-section-tab__icon"
                  >
                    <ManualExerciseCategoryIcon
                      className="h-4 w-4"
                      name={categoryTheme.icon}
                    />
                    <span className="exercise-library-page-section-tab__status grid place-items-center">
                      <span className="block rounded-full bg-current shadow-[0_0_10px_currentColor]" />
                    </span>
                  </span>
                  {active ? (
                    <span className="exercise-library-page-section-tab__content relative z-10 min-w-0">
                      <span className="block truncate text-[10px] font-black uppercase leading-4 tracking-[0.14em] sm:text-[11px]">
                        {category.label}
                      </span>
                      <span className="mt-0.5 block truncate text-[8px] font-black uppercase tracking-[0.08em] opacity-78">
                        {category.helper}
                      </span>
                    </span>
                  ) : null}
                </button>
              </span>
            );
          })}
        </div>
        <button
          type="button"
          aria-label="Next exercise category"
          onClick={() => onCategoryShift("right")}
          className="grid h-9 w-8 shrink-0 place-items-center rounded-xl border border-transparent bg-transparent text-xs font-black text-cyan-100/80 transition hover:translate-x-0.5 hover:border-amber-200/28 hover:bg-amber-300/8 hover:text-amber-100 active:scale-95"
        >
          &gt;
        </button>
      </div>

      <div className="mt-3 rounded-[24px] border border-cyan-200/14 bg-[radial-gradient(circle_at_50%_0%,rgba(34,211,238,0.10),transparent_42%),rgba(2,6,23,0.38)] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] sm:p-3">
        <div className="grid items-stretch gap-2 min-[760px]:h-[24rem] min-[760px]:grid-cols-[minmax(0,1fr)_12rem] min-[1020px]:h-[25rem] min-[1020px]:grid-cols-[minmax(0,1fr)_13rem]">
          <div className="relative flex min-h-[21rem] min-w-0 flex-col overflow-hidden rounded-[20px] border border-cyan-200/10 bg-slate-950/24 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] min-[760px]:h-full min-[760px]:min-h-0">
            {selectedExerciseCue ? (
              <p className="mb-1.5 line-clamp-1 text-center text-[10px] font-semibold text-cyan-100/70">
                Cue: {selectedExerciseCue}
              </p>
            ) : null}
            <div
              data-dashboard-orbiter-local-scroll="true"
              ref={exerciseCardScrollerRef}
              onScroll={() => updateExerciseCardsScrollCue()}
              className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1 scroll-smooth [scrollbar-color:rgba(34,211,238,0.36)_rgba(15,23,42,0.56)] [scrollbar-width:thin] [touch-action:pan-y] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-cyan-300/38 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-slate-950/58"
            >
              <div className="grid gap-1.5 pb-8 sm:grid-cols-3">
                {visibleExercises.map((exercise) => {
                  const selected = selectedExerciseIds.has(exercise.id);

                  return (
                    <button
                      key={`${activeCategory?.id}-${exercise.id}`}
                      type="button"
                      aria-label={`Attach ${exercise.name}`}
                      onClick={() => onExerciseSelect(exercise)}
                      className={`group relative isolate min-h-[96px] overflow-hidden rounded-[16px] border p-2 text-left transition hover:-translate-y-0.5 active:scale-[0.98] ${
                        selected
                          ? "border-emerald-200/50 bg-emerald-300/12 text-emerald-50 shadow-[0_0_26px_rgba(16,185,129,0.16)]"
                          : "border-white/10 bg-white/[0.045] text-slate-200 hover:border-cyan-200/34 hover:bg-cyan-300/8 hover:text-white"
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className="absolute inset-0 -z-10 bg-cover bg-center opacity-48 transition duration-300 group-hover:scale-105 group-hover:opacity-60"
                        style={{
                          backgroundImage: `linear-gradient(180deg, rgba(2,6,23,0.08), rgba(2,6,23,0.88)), url(${exercise.image})`,
                        }}
                      />
                      <span className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_0%,rgba(34,211,238,0.16),transparent_40%),linear-gradient(180deg,transparent,rgba(2,6,23,0.78))]" />

                      <span className="relative flex min-h-[80px] flex-col justify-between">
                        <span className="flex items-start justify-between gap-1.5">
                          <span className="rounded-full border border-cyan-100/24 bg-slate-950/58 px-1.5 py-0.5 text-[6.5px] font-black uppercase tracking-[0.07em] text-cyan-100 backdrop-blur">
                            {exercise.body}
                          </span>
                          <span
                            className={`rounded-full border px-1.5 py-0.5 text-[6.5px] font-black uppercase tracking-[0.07em] backdrop-blur ${
                              selected
                                ? "border-emerald-100/44 bg-emerald-300/18 text-emerald-100"
                                : "border-white/14 bg-slate-950/54 text-slate-200"
                            }`}
                          >
                            {selected ? "Attached" : "Add"}
                          </span>
                        </span>

                        <span className="mt-auto block">
                          <span className="block truncate text-[6.5px] font-black uppercase tracking-[0.09em] text-cyan-100/80">
                            {exercise.pattern} / {exercise.equipment}
                          </span>
                          <span className="mt-0.5 block truncate text-[12px] font-black leading-4 text-white [text-shadow:0_2px_18px_rgba(0,0,0,0.55)]">
                            {exercise.name}
                          </span>
                          <span className="mt-0.5 line-clamp-1 text-[8px] font-semibold leading-3 text-slate-200/88">
                            {exercise.muscles}
                          </span>
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {exerciseCardsCanScrollDown ? (
              <>
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-2 bottom-2 h-14 rounded-b-[18px] bg-gradient-to-t from-slate-950/92 via-slate-950/52 to-transparent"
                />
                <button
                  type="button"
                  aria-label="Scroll exercise cards down"
                  onClick={scrollExerciseCardsDown}
                  className="absolute bottom-3 left-1/2 z-10 grid h-8 w-8 -translate-x-1/2 place-items-center rounded-full border border-cyan-100/28 bg-slate-950/82 text-cyan-50 shadow-[0_0_22px_rgba(34,211,238,0.22)] backdrop-blur transition hover:-translate-y-0.5 hover:border-cyan-100/50 hover:bg-cyan-300/14 active:scale-95"
                >
                  <span
                    aria-hidden="true"
                    className="mb-1 h-2.5 w-2.5 rotate-45 border-b-2 border-r-2 border-current"
                  />
                </button>
              </>
            ) : null}
          </div>

          <div className="grid gap-1.5 min-[760px]:h-full min-[760px]:content-start">
            {quickManualSliderFields.map((field) => {
              const sliderValue = getQuickManualSliderValue(field);
              const sliderFillPercent =
                ((sliderValue - field.min) / (field.max - field.min)) * 100;
              const sliderTrackStyle = {
                background: `linear-gradient(90deg, rgba(34,211,238,0.95) 0%, rgba(103,232,249,0.95) ${sliderFillPercent}%, rgba(148,163,184,0.28) ${sliderFillPercent}%, rgba(148,163,184,0.28) 100%)`,
                boxShadow: "0 0 18px rgba(34,211,238,0.14)",
              } as CSSProperties;

              return (
                <label
                  key={`quick-${field.field}`}
                  className="min-w-0 rounded-[16px] border border-white/10 bg-slate-950/48 px-2.5 py-2 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition hover:border-cyan-200/28 hover:bg-cyan-300/8"
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-[9px] font-black uppercase tracking-[0.13em] text-slate-400">
                      {field.label}
                    </span>
                    <span className="text-[14px] font-black uppercase tracking-[0.05em] text-cyan-50">
                      {field.valueLabel(sliderValue)}
                    </span>
                  </span>
                  <input
                    aria-label={`${field.label} slider`}
                    type="range"
                    min={field.min}
                    max={field.max}
                    step={field.step}
                    value={sliderValue}
                    onChange={(event) =>
                      onManualStatsDraftChange(field.field, event.target.value)
                    }
                    style={sliderTrackStyle}
                    className="mt-2 h-2 w-full cursor-ew-resize appearance-none rounded-full outline-none transition [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-cyan-50 [&::-moz-range-thumb]:bg-cyan-300 [&::-moz-range-thumb]:shadow-[0_0_16px_rgba(34,211,238,0.55)] [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-cyan-50 [&::-webkit-slider-thumb]:bg-cyan-300 [&::-webkit-slider-thumb]:shadow-[0_0_16px_rgba(34,211,238,0.55)]"
                  />
                </label>
              );
            })}

            <button
              type="button"
              onClick={onSaveManualStats}
              className="mt-0.5 inline-flex min-h-[38px] w-full items-center justify-center rounded-[16px] bg-gradient-to-r from-amber-300 to-cyan-300 px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-slate-950 shadow-[0_0_26px_rgba(34,211,238,0.16)] transition hover:-translate-y-0.5 hover:shadow-[0_0_34px_rgba(250,204,21,0.18)] active:scale-[0.99]"
            >
              Save Stat
            </button>
          </div>
        </div>

        <div className="mt-3 flex justify-center">
          <Link
            href={ROUTES.workoutBuilder.exerciseLibrary}
            className="inline-flex min-h-[34px] items-center justify-center rounded-full border border-cyan-200/24 bg-cyan-300/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-cyan-100 transition hover:-translate-y-0.5 hover:border-cyan-100/48 hover:bg-cyan-300/18 hover:text-cyan-50"
          >
            Open full Exercise Library
          </Link>
        </div>
      </div>
    </div>
  );
}

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

const formatManualLoadDisplay = (value?: string) => {
  const trimmedValue = value?.trim();

  if (!trimmedValue) return "0 lb";
  if (/\b(lb|lbs|kg)\b/i.test(trimmedValue)) return trimmedValue;

  return `${trimmedValue} lb`;
};

const formatManualRpeDisplay = (value?: string) => {
  const trimmedValue = value?.trim();

  if (!trimmedValue) return "0/10";
  if (trimmedValue.includes("/")) return trimmedValue;

  return `${trimmedValue}/10`;
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

type DashboardWeeklyRecapCard = {
  description: string;
  metric: string;
  rows: Array<{
    detail: string;
    label: string;
    value: string;
  }>;
  title: string;
  tone: DashboardCardTone;
};

type DashboardMySoundCard = {
  description: string;
  href: string;
  icon: string;
  metric: string;
  rows: Array<{
    detail: string;
    label: string;
    value: string;
  }>;
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

type DashboardMasterPlanTimelineItem = {
  dateLabel: string;
  detail: string;
  href: string;
  icon: string;
  metric: string;
  status: string;
  title: string;
  tone: DashboardCardTone;
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
    x: 158,
    y: 8,
    zIndex: 30,
  },
  {
    blur: 1.1,
    opacity: 0.34,
    rotateY: -28,
    scale: 0.62,
    x: 248,
    y: 18,
    zIndex: 16,
  },
  {
    blur: 2.1,
    opacity: 0.12,
    rotateY: -42,
    scale: 0.46,
    x: 328,
    y: 30,
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
    title: "Progress",
    href: ROUTES.dashboard.progress,
    description: "Check-ins, habits, goals, journal notes, and pain tracking.",
    icon: "Progress",
    tone: "emerald",
    status: "Track",
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
  "Progress",
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
  const [dashboardToday] = useState<Date>(() => new Date());
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
  const [
    activeManualExerciseCategoryId,
    setActiveManualExerciseCategoryId,
  ] = useState<string>(manualExerciseLibraryBaseCategories[0]?.id || "my-plan");
  const [exerciseSelectorOpen, setExerciseSelectorOpen] = useState(false);
  const [exerciseReferenceSearch, setExerciseReferenceSearch] = useState("");
  const [manualReferences, setManualReferences] = useState<
    ManualLibraryReference[]
  >([]);
  const [manualStatsDraft, setManualStatsDraft] = useState<ManualStatsDraft>({
    dateTime: getManualDateTimeInputValue(),
    load: "185",
    notes: "",
    reps: "10",
    rpe: "8",
    sessionLabel: "",
    sets: "3",
  });
  const [manualStatsLogs, setManualStatsLogs] = useState<ManualStatsLogEntry[]>(
    [],
  );
  const [manualStatsAdderCollapsed, setManualStatsAdderCollapsed] =
    useState(true);
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
  const [activeDailyToolIndex, setActiveDailyToolIndex] = useState(0);
  const [activeWeeklyRecapIndex, setActiveWeeklyRecapIndex] = useState(0);
  const [activeMySoundIndex, setActiveMySoundIndex] = useState(0);
  const [activeSystemCenterIndex, setActiveSystemCenterIndex] = useState(0);
  const [
    activeDashboardFloatingMetricIndex,
    setActiveDashboardFloatingMetricIndex,
  ] = useState(0);
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
  const [
    activeDashboardConsistencyMonthIndex,
    setActiveDashboardConsistencyMonthIndex,
  ] = useState(2);
  const favoriteWorkoutStripRef = useRef<HTMLDivElement | null>(null);
  const dashboardOrbiterPointerStartRef =
    useRef<DashboardVerticalPointerStart | null>(null);
  const dashboardOrbiterPointerMovedRef = useRef(false);
  const dashboardOrbiterRowChangeLockRef = useRef(0);
  const commandCenterPointerStartRef = useRef<number | null>(null);
  const commandCenterPointerMovedRef = useRef(false);
  const weeklyRecapPointerStartRef = useRef<number | null>(null);
  const weeklyRecapPointerMovedRef = useRef(false);
  const mySoundPointerStartRef = useRef<number | null>(null);
  const mySoundPointerMovedRef = useRef(false);
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
  const manualPlanExerciseCards = useMemo(() => {
    const planExercises = favoriteWorkoutTemplates[0]?.exercises || [];
    const resolvedExercises = planExercises
      .map((plannedExercise) =>
        exerciseLibrary.find(
          (exercise) =>
            exercise.id === plannedExercise.id ||
            exercise.name.toLowerCase() === plannedExercise.name.toLowerCase(),
        ),
      )
      .filter((exercise): exercise is Exercise => Boolean(exercise));

    return resolvedExercises.slice(0, 12);
  }, [favoriteWorkoutTemplates]);
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
  const manualExerciseLibraryCategories = useMemo(
    () =>
      createManualExerciseLibraryCategories({
        favoriteExercises: favoriteExerciseCards,
        myPlanExercises: manualPlanExerciseCards,
      }),
    [favoriteExerciseCards, manualPlanExerciseCards],
  );
  const activeManualExerciseCategory =
    manualExerciseLibraryCategories.find(
      (category) => category.id === activeManualExerciseCategoryId,
    ) || manualExerciseLibraryCategories[0];
  const activeManualFavoriteCountLabel =
    activeManualFavoriteDashboard.id === "workout"
      ? activeManualExerciseCategory?.helper || "Library"
      : `${activeManualFavoriteCount} saved`;
  const selectedManualExerciseReferenceIds = useMemo(
    () =>
      new Set(
        manualReferences
          .filter((reference) => reference.referenceType === "exercise")
          .map((reference) => reference.referenceId),
      ),
    [manualReferences],
  );
  const activeCommandCenter =
    dashboardCommandCenterCards[activeCommandCenterIndex] ||
    dashboardCommandCenterCards[0];
  const activeSystemCenter =
    dashboardSystemCards[activeSystemCenterIndex] || dashboardSystemCards[0];
  const dashboardOrbiterRows = [
    {
      completion: 100,
      helper: "Hero, rewards, and progression wallet.",
      icon: "dashboard",
      logo: "sound",
      title: "Weekly Snapshot",
    },
    {
      completion: manualStatsLogs.length ? 100 : 58,
      helper:
        "Manual stats, video review form checks, import tools, library attach, and recent saves.",
      icon: "stats",
      title: "Daily Tools",
    },
    {
      completion: exerciseStats.length ? 82 : 36,
      helper:
        "Last 7 days of training volume, nutrition consistency, and recovery readiness.",
      icon: "performance",
      title: "Weekly Recap",
    },
    {
      completion: Math.round(
        ((activeCommandCenterIndex + 1) / dashboardCommandCenterCards.length) *
          100,
      ),
      helper: "Core command centers.",
      icon: "dashboard",
      title: "Dashboards",
    },
    {
      completion: 72,
      helper: "Training calendar, scheduled sessions, and weekly commitments.",
      icon: "calendar",
      title: "Calendar",
    },
    {
      completion:
        exerciseStats.length || savedTemplates.length || manualStatsLogs.length
          ? 76
          : 34,
      helper:
        "Personalized insight cards that connect dashboard signals to relevant content.",
      icon: "soundworld",
      logo: "sound",
      title: "My Sound",
    },
    {
      completion: Math.round(
        ((activeSystemCenterIndex + 1) / dashboardSystemCards.length) * 100,
      ),
      helper:
        "Goals, insights, stats, progress, appointments, messages, packages, and achievements.",
      icon: "app",
      title: "System Row",
    },
    {
      completion: activeSessionTemplate
        ? 76
        : favoriteWorkoutTemplates.length
          ? 64
          : exerciseStats.length
            ? 54
            : 28,
      helper:
        "A dynamic plan snapshot laid out as a horizontal Master Training Journey timeline.",
      icon: "plan",
      title: "Master Training Journey",
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
    const target = event.target;

    if (
      target instanceof HTMLElement &&
      target.closest("[data-dashboard-orbiter-local-scroll='true']")
    ) {
      return;
    }

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
      target.closest(
        "input,select,textarea,[contenteditable='true'],[data-dashboard-orbiter-local-scroll='true']",
      )
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
      target.closest(
        "input,select,textarea,[contenteditable='true'],[data-dashboard-orbiter-local-scroll='true']",
      )
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
  const rotateManualExerciseCategory = (direction: "left" | "right") => {
    setActiveManualExerciseCategoryId((currentCategoryId) => {
      const currentIndex = Math.max(
        0,
        manualExerciseLibraryCategories.findIndex(
          (category) => category.id === currentCategoryId,
        ),
      );
      const nextIndex =
        direction === "left" ? currentIndex - 1 : currentIndex + 1;
      const nextCategory =
        manualExerciseLibraryCategories[
          (nextIndex + manualExerciseLibraryCategories.length) %
            manualExerciseLibraryCategories.length
        ];

      return nextCategory?.id || currentCategoryId;
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
    const chartSevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const trainingVolume = labels.map((label, index) => {
      const value = exerciseStats
        .filter((entry) => {
          const date = new Date(entry.date);
          const timestamp = date.getTime();
          if (Number.isNaN(timestamp) || timestamp < chartSevenDaysAgo) {
            return false;
          }
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
  const masterJourneyTimelineDateFormatter = new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    weekday: "short",
  });
  const formatMasterJourneyTimelineDate = (dayOffset: number) =>
    masterJourneyTimelineDateFormatter.format(
      addDashboardDays(dashboardToday, dayOffset),
    );
  const dashboardMasterPlanTimeline: DashboardMasterPlanTimelineItem[] = ((): DashboardMasterPlanTimelineItem[] => {
    const trainingItems: DashboardMasterPlanTimelineItem[] = favoriteWorkoutTemplates
      .slice(0, 4)
      .map((template, index): DashboardMasterPlanTimelineItem => ({
        dateLabel: formatMasterJourneyTimelineDate(index * 2 + 2),
        detail: `${template.exercises.length} exercises / ${getWorkoutTemplateTag(
          template,
        )}`,
        href:
          activeSessionTemplate?.id === template.id
            ? ROUTES.dashboard.sessionWorkout
            : buildTemplateWorkoutHref(template.id),
        icon: "workout",
        metric: index === 0 ? "Primary" : "Queued",
        status: activeSessionTemplate?.id === template.id ? "Live" : "Planned",
        title: template.title,
        tone: (index === 0 ? "cyan" : "sky") as DashboardCardTone,
      }));

    if (activeSessionTemplate) {
      return [
        {
          dateLabel: "Now",
          detail: `${activeSessionTemplate.exercises.length} exercises in progress`,
          href: ROUTES.dashboard.sessionWorkout,
          icon: "workout",
          metric: "Live",
          status: "In progress",
          title: activeSessionTemplate.title,
          tone: "emerald" as DashboardCardTone,
        },
        ...trainingItems.filter((item) => item.title !== activeSessionTemplate.title),
        {
          dateLabel: formatMasterJourneyTimelineDate(6),
          detail:
            dashboardSummary.hasStats
              ? dashboardSummary.latestExercise
              : "Log the session output",
          href: ROUTES.dashboard.stats,
          icon: "stats",
          metric: `${dashboardSummary.totalLoggedEntries} logs`,
          status: "Checkpoint",
          title: "Progress check",
          tone: "amber" as DashboardCardTone,
        },
        {
          dateLabel: formatMasterJourneyTimelineDate(7),
          detail:
            dashboardSummary.totalSets > 30
              ? "Deload, mobility, and soreness notes"
              : "Mobility reset and readiness notes",
          href: ROUTES.dashboard.recovery,
          icon: "recovery",
          metric: "Recovery",
          status: "Support",
          title: "Readiness reset",
          tone: "violet" as DashboardCardTone,
        },
      ].slice(0, 7);
    }

    if (trainingItems.length) {
      return [
        {
          dateLabel: "Today",
          detail: nextAction.detail,
          href: nextAction.href,
          icon: "plan",
          metric: nextAction.cta,
          status: "Next",
          title: nextAction.title,
          tone: "cyan" as DashboardCardTone,
        },
        ...trainingItems,
        {
          dateLabel: formatMasterJourneyTimelineDate(7),
          detail: "Review volume, recovery, and fuel signals",
          href: ROUTES.dashboard.myPlan,
          icon: "calendar",
          metric: `${dashboardSummary.templateCount} templates`,
          status: "Review",
          title: "Weekly plan review",
          tone: "amber" as DashboardCardTone,
        },
      ].slice(0, 7);
    }

    return [
      {
        dateLabel: "Today",
        detail: "Choose focus, timeline, and coaching context",
        href: ROUTES.dashboard.goals,
        icon: "goals",
        metric: `${dashboardFoundationProgress.goalsCompletion}% goals`,
        status: "Set direction",
        title: "Define the goal",
        tone: "amber" as DashboardCardTone,
      },
      {
        dateLabel: formatMasterJourneyTimelineDate(1),
        detail: "Create the first reusable training template",
        href: ROUTES.workoutBuilder.home,
        icon: "builder",
        metric: "Builder",
        status: "Build",
        title: "Build first workout",
        tone: "cyan" as DashboardCardTone,
      },
      {
        dateLabel: formatMasterJourneyTimelineDate(2),
        detail: "Place the first workout into the weekly map",
        href: ROUTES.dashboard.myPlan,
        icon: "plan",
        metric: "Plan",
        status: "Schedule",
        title: "Make the plan",
        tone: "sky" as DashboardCardTone,
      },
      {
        dateLabel: formatMasterJourneyTimelineDate(3),
        detail: "Run the first session and save training data",
        href: ROUTES.dashboard.sessions,
        icon: "workout",
        metric: "Session",
        status: "Train",
        title: "Start session",
        tone: "emerald" as DashboardCardTone,
      },
      {
        dateLabel: formatMasterJourneyTimelineDate(4),
        detail: "Submit a clip for technique feedback",
        href: ROUTES.dashboard.videoReview,
        icon: "form",
        metric: "Form check",
        status: "Coach",
        title: "Video review",
        tone: "violet" as DashboardCardTone,
      },
    ];
  })();
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
  const momentumEntryDateKeys = new Set<string>();
  exerciseStats.forEach((entry) => {
    const entryDateKey = getDashboardEntryDateKey(entry.date);
    if (entryDateKey) momentumEntryDateKeys.add(entryDateKey);
  });
  manualStatsLogs.forEach((entry) => {
    const entryDateKey = getDashboardEntryDateKey(
      entry.loggedAt || entry.dateTime,
    );
    if (entryDateKey) momentumEntryDateKeys.add(entryDateKey);
  });
  const dashboardTrainingDateKeys = new Set(
    groupWorkoutDates(exerciseStats)
      .map((date) => getDashboardEntryDateKey(date))
      .filter(Boolean),
  );
  const dashboardHasPlan =
    Boolean(activeSessionTemplate) || dashboardSummary.templateCount > 0;
  const dashboardStatDateKeys = Array.from(momentumEntryDateKeys).sort();
  const dashboardLatestStatDateKey =
    dashboardStatDateKeys[dashboardStatDateKeys.length - 1] || "";
  const dashboardDaysSinceLastStat = dashboardLatestStatDateKey
    ? Math.floor(
        (new Date(
          dashboardToday.getFullYear(),
          dashboardToday.getMonth(),
          dashboardToday.getDate(),
        ).getTime() -
          new Date(`${dashboardLatestStatDateKey}T00:00:00`).getTime()) /
          (24 * 60 * 60 * 1000),
      )
    : null;
  const dashboardHasSixMonthBiweeklyStats =
    dashboardStatDateKeys.length > 0 &&
    dashboardDaysSinceLastStat !== null &&
    dashboardDaysSinceLastStat < 14 &&
    Array.from({ length: 13 }).every((_, windowIndex) => {
      const windowEnd = addDashboardDays(dashboardToday, -windowIndex * 14);
      const windowStart = addDashboardDays(windowEnd, -13);
      const windowStartKey = getDashboardLocalDateKey(windowStart);
      const windowEndKey = getDashboardLocalDateKey(windowEnd);

      return dashboardStatDateKeys.some(
        (dateKey) => dateKey >= windowStartKey && dateKey <= windowEndKey,
      );
    });
  const momentumTodayKey = getDashboardLocalDateKey(dashboardToday);
  const momentumHasEntryToday = momentumEntryDateKeys.has(momentumTodayKey);
  const momentumStreakTarget = 7;
  const momentumEntryStreak = momentumHasEntryToday
    ? getDashboardEntryStreak(momentumEntryDateKeys, dashboardToday)
    : 0;
  const momentumPreviousStreak = momentumHasEntryToday
    ? momentumEntryStreak
    : getDashboardEntryStreak(
        momentumEntryDateKeys,
        addDashboardDays(dashboardToday, -1),
      );
  const momentumMeterScore = clampDashboardPercent(
    (momentumEntryStreak / momentumStreakTarget) * 100,
  );
  const momentumNeedleAngle = -90 + momentumMeterScore * 1.8;
  const momentumNeedleRadians = (momentumNeedleAngle * Math.PI) / 180;
  const momentumMeterNeedleTipX = 110 + Math.sin(momentumNeedleRadians) * 84;
  const momentumMeterNeedleTipY = 112 - Math.cos(momentumNeedleRadians) * 84;
  const momentumStreakDaysRemaining = Math.max(
    0,
    momentumStreakTarget - momentumEntryStreak,
  );
  const momentumGoalLabel =
    momentumStreakDaysRemaining > 0
      ? `${momentumStreakDaysRemaining} to ${momentumStreakTarget}`
      : "Goal live";
  const momentumSignalLabel = momentumHasEntryToday ? "Logged" : "Log today";
  const momentumMeterCaption = momentumHasEntryToday
    ? `${momentumEntryStreak} day streak`
    : "No entry today";
  const momentumPrompt = momentumHasEntryToday
    ? "Daily signal logged. Keep the chain alive tomorrow."
    : momentumPreviousStreak > 0
      ? `${momentumPreviousStreak} day streak waiting. Enter anything today.`
      : "Enter one stat, note, workout, or check-in today.";
  const dashboardCalendarToday = new Date(
    dashboardToday.getFullYear(),
    dashboardToday.getMonth(),
    dashboardToday.getDate(),
  );
  const dashboardConsistencyCalendarMonths = Array.from(
    { length: 3 },
    (_, monthIndex) => {
      const monthDate = new Date(
        dashboardToday.getFullYear(),
        dashboardToday.getMonth() - 2 + monthIndex,
        1,
      );
      const daysInMonth = new Date(
        monthDate.getFullYear(),
        monthDate.getMonth() + 1,
        0,
      ).getDate();
      const leadingBlankCount = monthDate.getDay();
      const days = Array.from({ length: daysInMonth }, (_, dayIndex) => {
        const dayDate = new Date(
          monthDate.getFullYear(),
          monthDate.getMonth(),
          dayIndex + 1,
        );
        const dateKey = getDashboardLocalDateKey(dayDate);
        const isToday = dateKey === momentumTodayKey;
        const isFuture = dayDate.getTime() > dashboardCalendarToday.getTime();
        const hasTraining = dashboardTrainingDateKeys.has(dateKey);
        const hasSignal = momentumEntryDateKeys.has(dateKey);
        const status = isFuture
          ? "future"
          : hasTraining
            ? "trained"
            : hasSignal
              ? "logged"
              : "empty";
        const label = new Intl.DateTimeFormat("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }).format(dayDate);

        return {
          dateKey,
          day: dayIndex + 1,
          isToday,
          label,
          status,
        };
      });

      return {
        label: new Intl.DateTimeFormat("en-US", {
          month: "short",
          year: "numeric",
        }).format(monthDate),
        leadingBlankCount,
        days,
      };
    },
  );
  const dashboardConsistencyCalendarWeekdays = ["S", "M", "T", "W", "T", "F", "S"];
  const dashboardConsistencyCalendarTrainingDays =
    dashboardConsistencyCalendarMonths.reduce(
      (total, month) =>
        total +
        month.days.filter((day) => day.status === "trained").length,
      0,
    );
  const dashboardConsistencyCalendarSignalDays =
    dashboardConsistencyCalendarMonths.reduce(
      (total, month) =>
        total + month.days.filter((day) => day.status === "logged").length,
      0,
    );
  const dashboardConsistencyCalendarMonthCount =
    dashboardConsistencyCalendarMonths.length;
  const getDashboardConsistencyMonthOrbitDistance = (index: number) => {
    let distance = index - activeDashboardConsistencyMonthIndex;
    if (distance > dashboardConsistencyCalendarMonthCount / 2) {
      distance -= dashboardConsistencyCalendarMonthCount;
    }
    if (distance < -dashboardConsistencyCalendarMonthCount / 2) {
      distance += dashboardConsistencyCalendarMonthCount;
    }
    return distance;
  };
  const rotateDashboardConsistencyMonth = (direction: -1 | 1) => {
    setActiveDashboardConsistencyMonthIndex((currentIndex) =>
      (currentIndex + direction + dashboardConsistencyCalendarMonthCount) %
      dashboardConsistencyCalendarMonthCount,
    );
  };
  const dashboardConsistencyStage =
    dashboardStatDateKeys.length === 0
      ? dashboardHasPlan
        ? "Contemplation"
        : "Pre-Contemplation"
      : dashboardHasSixMonthBiweeklyStats
        ? "Maintenance"
        : dashboardDaysSinceLastStat !== null && dashboardDaysSinceLastStat >= 28
          ? "Contemplation"
          : "Active";
  const dashboardStatusUrgency =
    dashboardConsistencyStage === "Maintenance"
      ? "Maintain rhythm"
      : dashboardConsistencyStage === "Active"
        ? "Log by 2 weeks"
        : dashboardConsistencyStage === "Contemplation"
          ? "Plan then log"
          : "Make a plan";
  const dashboardStatusPillTone =
    dashboardConsistencyStage === "Maintenance"
      ? "border-emerald-200/28 bg-emerald-300/10 text-emerald-100"
      : dashboardConsistencyStage === "Active"
        ? "border-cyan-200/30 bg-cyan-300/10 text-cyan-100"
        : dashboardConsistencyStage === "Contemplation"
          ? "border-amber-200/30 bg-amber-300/10 text-amber-100"
          : "border-slate-200/18 bg-slate-100/8 text-slate-200";
  const dashboardProfileHubCompletion = Math.max(
    dashboardFoundationProgress.profileCompletion,
    Math.round(
      (dashboardFoundationProgress.profileCompletion +
        dashboardFoundationProgress.goalsCompletion) /
        2,
    ),
  );
  const dashboardActiveProfileGoalFocus =
    dashboardFoundationProgress.goalFocus || "Choose training focus";
  const dashboardActiveProfilePlanDetail = activeSessionTemplate
    ? `${activeSessionTemplate.exercises.length} exercises in progress`
    : dashboardSummary.latestTemplate
      ? dashboardSummary.latestTemplate.title
      : dashboardSummary.templateCount > 0
        ? `${dashboardSummary.templateCount} templates ready`
        : "Build first workout";
  const dashboardActiveProfileNextStep =
    dashboardFoundationProgress.profileCompletion < 70
      ? "Profile context"
      : dashboardFoundationProgress.goalsCompletion < 70
        ? "Goal direction"
        : nextAction.cta;
  const dashboardActiveProfileNextHref =
    dashboardFoundationProgress.profileCompletion < 70
      ? ROUTES.dashboard.profile
      : dashboardFoundationProgress.goalsCompletion < 70
        ? ROUTES.dashboard.goals
        : nextAction.href;
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
    clampedDashboardOrbiterRow === 3
      ? activeCommandCenter
      : clampedDashboardOrbiterRow === 6
        ? activeSystemCenter
        : null;
  const dashboardFloatingSnapshotRowCards =
    clampedDashboardOrbiterRow === 3
      ? dashboardCommandCenterCards
      : clampedDashboardOrbiterRow === 6
        ? dashboardSystemCards
        : [];
  const dashboardFloatingSnapshotActiveCardIndex =
    clampedDashboardOrbiterRow === 3
      ? activeCommandCenterIndex
      : clampedDashboardOrbiterRow === 6
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
  const dashboardNutritionAverage = Math.round(
    dashboardCharts.nutritionConsistency.reduce(
      (sum, item) => sum + item.value,
      0,
    ) / dashboardCharts.nutritionConsistency.length,
  );
  const dashboardWeeklyRecapCards: DashboardWeeklyRecapCard[] = [
    {
      description: "Training volume by day from the last 7 days.",
      metric: `${Math.round(dashboardSummary.weeklyVolume).toLocaleString()} lb`,
      rows: dashboardCharts.trainingVolume.map((item) => ({
        detail:
          item.value >= item.target
            ? "At target"
            : `${(item.target * 100).toLocaleString()} lb goal`,
        label: item.label,
        value: `${(item.value * 100).toLocaleString()} lb`,
      })),
      title: "Weekly Training Volume",
      tone: "cyan",
    },
    {
      description: "Fuel habits summarized for the current weekly rhythm.",
      metric: `${dashboardNutritionAverage}%`,
      rows: dashboardCharts.nutritionConsistency.map((item) => ({
        detail: `${item.target}% target`,
        label: item.label,
        value: `${Math.round(item.value)}%`,
      })),
      title: "Nutrition Consistency",
      tone: "emerald",
    },
    {
      description: "Readiness trend across the last 7-day recovery window.",
      metric: `${dashboardRecoveryAverage}%`,
      rows: dashboardCharts.recoveryTrend.map((item) => ({
        detail:
          item.value >= 80
            ? "Ready"
            : item.value >= 70
              ? "Steady"
              : "Watch load",
        label: item.label,
        value: `${Math.round(item.value)}%`,
      })),
      title: "Recovery Readiness",
      tone: "amber",
    },
  ];
  const getWeeklyRecapOrbitDistance = (index: number) =>
    getDashboardOrbitDistance(
      index,
      activeWeeklyRecapIndex,
      dashboardWeeklyRecapCards.length,
    );
  const rotateWeeklyRecap = (direction: DashboardOrbitDirection) => {
    setActiveWeeklyRecapIndex((currentIndex) => {
      const nextIndex =
        direction === "left" ? currentIndex - 1 : currentIndex + 1;

      return (
        (nextIndex + dashboardWeeklyRecapCards.length) %
        dashboardWeeklyRecapCards.length
      );
    });
  };
  const getWeeklyRecapBarValue = (value: string) => {
    const match = value.replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);

    return match ? Number(match[0]) : 0;
  };
  const getWeeklyRecapBarPercent = (
    card: DashboardWeeklyRecapCard,
    row: DashboardWeeklyRecapCard["rows"][number],
  ) => {
    const value = getWeeklyRecapBarValue(row.value);
    const target = getWeeklyRecapBarValue(row.detail);

    if (row.value.includes("%")) {
      return Math.max(4, Math.min(100, value));
    }

    if (card.title === "Weekly Training Volume") {
      return Math.max(4, Math.min(100, target > 0 ? (value / target) * 100 : 0));
    }

    return Math.max(4, Math.min(100, value > 0 ? value : 0));
  };
  const dashboardNutritionFavorites =
    dashboardLibraryFavoriteIds.nutrition?.length || 0;
  const dashboardMySoundCards: DashboardMySoundCard[] = [
    {
      description:
        "Sessions, templates, and weekly volume are shaping the next training prompt.",
      href: ROUTES.dashboard.sessions,
      icon: "workout",
      metric: `${dashboardSummary.workoutsThisWeek} wk`,
      rows: [
        {
          detail: `${dashboardSummary.weeklySets} sets / ${Math.round(
            dashboardSummary.weeklyVolume,
          ).toLocaleString()} lb`,
          label: "Signal",
          value:
            dashboardSummary.workoutsThisWeek > 0
              ? "Training active"
              : "No sessions",
        },
        {
          detail:
            dashboardSummary.latestTemplate?.title ||
            "Create a reusable workout",
          label: "Relevant",
          value:
            dashboardSummary.templateCount > 0
              ? "Template ready"
              : "Builder path",
        },
        {
          detail: activeSessionTemplate ? "Resume current session" : "Open Sessions",
          label: "Next",
          value: activeSessionTemplate ? "Resume" : nextAction.cta,
        },
      ],
      title: "Training Signal",
      tone: "cyan",
    },
    {
      description:
        "Fuel content is weighted toward the habits with the biggest gap this week.",
      href: ROUTES.nutrition.home,
      icon: "nutrition",
      metric: `${dashboardNutritionAverage}%`,
      rows: [
        {
          detail: `${Math.round(dashboardProteinConsistency)}% protein`,
          label: "Protein",
          value:
            dashboardProteinConsistency >= 70 ? "Holding" : "Needs plan",
        },
        {
          detail: `${Math.round(dashboardHydrationConsistency)}% hydration`,
          label: "Hydration",
          value:
            dashboardHydrationConsistency >= 70 ? "Steady" : "Nudge",
        },
        {
          detail: `${dashboardNutritionFavorites} saved fuel items`,
          label: "Relevant",
          value: dashboardMealConsistency >= 70 ? "Meal rhythm" : "Grocery",
        },
      ],
      title: "Fuel Signal",
      tone: "emerald",
    },
    {
      description:
        "Recovery suggestions respond to recent training heat and readiness.",
      href: ROUTES.dashboard.recovery,
      icon: "recovery",
      metric: `${dashboardRecoveryAverage}%`,
      rows: [
        {
          detail:
            dashboardSummary.weeklySets > 30
              ? `${dashboardSummary.weeklySets} sets`
              : "Load manageable",
          label: "Heat",
          value: dashboardSummary.weeklySets > 30 ? "Reduce" : "Build",
        },
        {
          detail: `${dashboardRecoveryAverage}% average`,
          label: "Readiness",
          value: dashboardRecoveryAverage >= 78 ? "Ready" : "Monitor",
        },
        {
          detail: "Mobility and soreness context",
          label: "Relevant",
          value:
            dashboardSummary.weeklySets > 30 ? "Recovery plan" : "Mobility",
        },
      ],
      title: "Recovery Signal",
      tone: "amber",
    },
    {
      description:
        "Performance content follows volume, exercise variety, and logged stats.",
      href: ROUTES.dashboard.performance,
      icon: "performance",
      metric: `${dashboardSummary.uniqueExerciseCount} moves`,
      rows: [
        {
          detail: `${dashboardSummary.uniqueExerciseCount} unique exercises`,
          label: "Variety",
          value:
            dashboardSummary.uniqueExerciseCount >= 4 ? "Broad" : "Narrow",
        },
        {
          detail: `${dashboardSummary.totalLoggedEntries} total logs`,
          label: "Stats",
          value: dashboardSummary.hasStats ? "Trendable" : "Start",
        },
        {
          detail: dashboardSummary.latestExercise,
          label: "Relevant",
          value: "Performance",
        },
      ],
      title: "Performance Signal",
      tone: "sky",
    },
    {
      description:
        "Goal and profile context decide how specific the plan recommendations can get.",
      href: ROUTES.dashboard.goals,
      icon: "goals",
      metric: `${dashboardFoundationProgress.goalsCompletion}%`,
      rows: [
        {
          detail:
            dashboardFoundationProgress.goalFocus || "Choose training focus",
          label: "Goal",
          value:
            dashboardFoundationProgress.goalsCompletion >= 70
              ? "Clear"
              : "Open",
        },
        {
          detail: `${dashboardFoundationProgress.profileCompletion}% profile`,
          label: "Context",
          value:
            dashboardFoundationProgress.profileCompletion >= 70
              ? "Useful"
              : "Thin",
        },
        {
          detail: dashboardFoundationProgress.goalsVisited
            ? "Refine priorities"
            : "Set direction",
          label: "Relevant",
          value: "Goal setup",
        },
      ],
      title: "Goal Signal",
      tone: "violet",
    },
    {
      description:
        "Rewards and community prompts are tuned from points, streaks, and unlocked milestones.",
      href: ROUTES.dashboard.achievements,
      icon: "achievements",
      metric: soundPoints.toLocaleString(),
      rows: [
        {
          detail: `${soundTokens.toLocaleString()} Sound Tokens`,
          label: "Wallet",
          value: `${soundPoints.toLocaleString()} pts`,
        },
        {
          detail: `${momentumEntryStreak}/${momentumStreakTarget} day goal`,
          label: "Streak",
          value: momentumHasEntryToday ? "Live" : "Log today",
        },
        {
          detail: "Milestones and Sound World prompts",
          label: "Relevant",
          value: "Rewards",
        },
      ],
      title: "Reward Signal",
      tone: "fuchsia",
    },
  ];
  const getMySoundOrbitDistance = (index: number) =>
    getDashboardOrbitDistance(
      index,
      activeMySoundIndex,
      dashboardMySoundCards.length,
    );
  const rotateMySound = (direction: DashboardOrbitDirection) => {
    setActiveMySoundIndex((currentIndex) => {
      const nextIndex =
        direction === "left" ? currentIndex - 1 : currentIndex + 1;

      return (
        (nextIndex + dashboardMySoundCards.length) %
        dashboardMySoundCards.length
      );
    });
  };
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
    : clampedDashboardOrbiterRow === 4
      ? [
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
          {
            label: "Focus",
            value: "Calendar",
          },
        ]
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
  const dashboardFloatingSnapshotRow =
    dashboardOrbiterRows[clampedDashboardOrbiterRow];
  const dashboardFloatingSnapshotTitle =
    dashboardFloatingSnapshotActiveCard?.title ||
    dashboardFloatingSnapshotRow?.title ||
    "Weekly Snapshot";
  const dashboardFloatingSnapshotRowTone = getDashboardRowUrgencyTone(
    dashboardFloatingSnapshotRow?.completion || 0,
  );
  const getDashboardFloatingMetricCompletion = (metric: {
    label: string;
    value: string;
  }) => {
    const label = metric.label.toLowerCase();
    const value = metric.value.toLowerCase();
    const numericMatch = value.match(/-?\d+(?:\.\d+)?/);
    const numericValue = numericMatch ? Number(numericMatch[0]) : null;

    if (value.includes("%") && numericValue !== null) {
      return Math.max(0, Math.min(100, Math.round(numericValue)));
    }

    if (value.includes("ready")) return 90;
    if (value.includes("active")) return 68;
    if (value.includes("manage") || value.includes("watch")) return 28;
    if (
      value.includes("choose") ||
      value.includes("start") ||
      value.includes("build") ||
      value.includes("submit")
    ) {
      return 34;
    }

    if (
      numericValue === 0 &&
      (label.includes("weekly") ||
        label.includes("workout") ||
        label.includes("set") ||
        label.includes("template") ||
        label.includes("exercise") ||
        label.includes("logged") ||
        label.includes("saved"))
    ) {
      return 18;
    }

    if (numericValue !== null && numericValue > 0) return 72;

    return 56;
  };
  const dashboardFloatingSnapshotEyebrow = dashboardFloatingSnapshotActiveCard
    ? dashboardFloatingSnapshotRow?.title || "Dashboard Row"
    : dashboardFloatingSnapshotRow?.title || "Weekly Snapshot";
  const dashboardFloatingSnapshotDescription =
    dashboardFloatingSnapshotActiveCard?.description ||
    dashboardFloatingSnapshotRow?.helper ||
    "Workouts, nutrition, readiness, and performance stay visible as the orbiter moves.";
  const dashboardFloatingSnapshotIcon =
    dashboardFloatingSnapshotActiveCard?.icon ||
    dashboardFloatingSnapshotRow?.icon ||
    (clampedDashboardOrbiterRow === 4 ? "calendar" : "DB");
  const dashboardFloatingSnapshotIconLabel =
    dashboardFloatingSnapshotActiveCard?.title ||
    dashboardFloatingSnapshotRow?.title ||
    "Dashboard";
  const activeDashboardFloatingMetric =
    dashboardFloatingSnapshotMetrics[
      activeDashboardFloatingMetricIndex %
        Math.max(1, dashboardFloatingSnapshotMetrics.length)
    ] || dashboardFloatingSnapshotMetrics[0];

  useEffect(() => {
    setActiveDashboardFloatingMetricIndex(0);
  }, [clampedDashboardOrbiterRow, dashboardFloatingSnapshotTitle]);

  useEffect(() => {
    if (dashboardFloatingSnapshotMetrics.length <= 1) return;

    const intervalId = window.setInterval(() => {
      setActiveDashboardFloatingMetricIndex((currentIndex) =>
        (currentIndex + 1) % dashboardFloatingSnapshotMetrics.length,
      );
    }, 2600);

    return () => window.clearInterval(intervalId);
  }, [
    clampedDashboardOrbiterRow,
    dashboardFloatingSnapshotMetrics.length,
    dashboardFloatingSnapshotTitle,
  ]);
  const dashboardHeaderLinks = [
    {
      completion: dashboardTabCompletions.workout,
      href: ROUTES.dashboard.sessions,
      icon: "workout",
      label: "Sessions",
      meta: "Training",
      points: Math.round(soundPoints * 0.82),
      tone:
        "border-sky-200/28 bg-sky-300/10 text-sky-100 hover:border-sky-100/45 hover:bg-sky-300/16",
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

  const getDashboardJourneyStepTone = (
    step: DashboardJourneyStep,
    stepIndex = 0,
  ): DashboardCardTone => {
    const key = `${step.icon} ${step.label}`.toLowerCase();

    if (key.includes("dashboard") || key.includes("overview")) {
      return "sky";
    }
    if (key.includes("goal") || key.includes("plan")) {
      return "emerald";
    }
    if (
      key.includes("builder") ||
      key.includes("workout") ||
      key.includes("session")
    ) {
      return "amber";
    }
    if (key.includes("exercise") || key.includes("library")) {
      return "violet";
    }
    if (key.includes("hydrate") || key.includes("hydration")) {
      return "cyan";
    }
    if (key.includes("meal") || key.includes("nutrition")) {
      return "emerald";
    }
    if (key.includes("grocery") || key.includes("calories")) {
      return "amber";
    }
    if (key.includes("recovery")) {
      return "cyan";
    }
    if (
      key.includes("performance") ||
      key.includes("power") ||
      key.includes("run") ||
      key.includes("cardio")
    ) {
      return "amber";
    }
    if (key.includes("stat") || key.includes("metric") || key.includes("trend")) {
      return "violet";
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
      return "fuchsia";
    }
    if (
      key.includes("education") ||
      key.includes("lesson") ||
      key.includes("logic") ||
      key.includes("form") ||
      key.includes("app")
    ) {
      return "sky";
    }

    return (["cyan", "emerald", "amber", "violet", "fuchsia", "sky"] as const)[
      stepIndex % 6
    ];
  };

  const getDashboardJourneyStepIconTone = (
    step: DashboardJourneyStep,
    isActive: boolean,
    stepIndex = 0,
  ) => {
    const strength = isActive ? "active" : "idle";

    return dashboardIconToneStyles[getDashboardJourneyStepTone(step, stepIndex)][
      strength
    ];
  };

  const getDashboardHeaderJourneyCard = () => {
    if (activeDashboardHeaderLink.href === ROUTES.dashboard.sessions) {
      return dashboardNavigationCards.find(
        (card) => card.title === "Workout / Sessions",
      );
    }

    return dashboardNavigationCards.find(
      (card) =>
        card.href === activeDashboardHeaderLink.href ||
        card.title === activeDashboardHeaderLink.label,
    );
  };

  const getDashboardHeaderJourneyState = () => {
    const card = getDashboardHeaderJourneyCard();
    const journeySteps = card?.journeySteps?.length
      ? card.journeySteps
      : [
          {
            completion: activeDashboardHeaderLink.completion,
            href: activeDashboardHeaderLink.href,
            icon: activeDashboardHeaderLink.icon,
            label: activeDashboardHeaderLink.label,
            state: "active" as const,
          },
        ];
    const activeJourneyStepIndex = card
      ? getActiveDashboardJourneyStepIndex(card)
      : 0;

    return {
      activeJourneyStep:
        journeySteps[activeJourneyStepIndex] || journeySteps[0],
      activeJourneyStepIndex,
      card,
      journeySteps,
    };
  };

  const getDashboardHeaderActiveJourneyStepLabel = () =>
    getDashboardHeaderJourneyState().activeJourneyStep?.label ||
    activeDashboardHeaderLink.label;

  const renderDashboardHeaderJourneyTabs = () => {
    const { activeJourneyStepIndex, card, journeySteps } =
      getDashboardHeaderJourneyState();
    const canRotateJourney = Boolean(card && journeySteps.length > 1);

    return (
      <div
        aria-label={`${activeDashboardHeaderLink.label} journey tabs`}
        className="relative h-[62px] w-[62px] shrink-0 overflow-visible py-3 [perspective:390px]"
      >
        {canRotateJourney ? (
          <div
            aria-label={`${activeDashboardHeaderLink.label} journey scroll controls`}
            className="absolute right-0 top-1/2 z-40 flex h-9 w-5 -translate-y-1/2 flex-col overflow-hidden rounded-full border border-cyan-200/18 bg-slate-950/58 text-[8px] font-black leading-none text-cyan-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
            role="group"
          >
            <button
              aria-label={`Previous ${activeDashboardHeaderLink.label} journey tab`}
              className="grid min-h-0 flex-1 place-items-center border-b border-white/10 transition hover:border-amber-200/42 hover:bg-amber-300/10 hover:text-amber-100 active:scale-95"
              onClick={() => card && rotateDashboardJourneyStepOrbit(card, "left")}
              title={`Previous ${activeDashboardHeaderLink.label} journey tab`}
              type="button"
            >
              ^
            </button>
            <button
              aria-label={`Next ${activeDashboardHeaderLink.label} journey tab`}
              className="grid min-h-0 flex-1 place-items-center transition hover:border-amber-200/42 hover:bg-amber-300/10 hover:text-amber-100 active:scale-95"
              onClick={() => card && rotateDashboardJourneyStepOrbit(card, "right")}
              title={`Next ${activeDashboardHeaderLink.label} journey tab`}
              type="button"
            >
              v
            </button>
          </div>
        ) : (
          <span aria-hidden="true" className="absolute right-0 top-1/2 h-9 w-5 -translate-y-1/2" />
        )}
        <div className="absolute inset-y-4 left-5 w-9 -translate-x-1/2 [transform-style:preserve-3d]">
          {journeySteps.map((step, stepIndex) => {
            const journeyDistance = getDashboardJourneyStepOrbitDistance(
              stepIndex,
              activeJourneyStepIndex,
              journeySteps.length,
            );
            const isActiveJourneyStep = journeyDistance === 0;
            const stepCompletion = getDashboardJourneyStepCompletion(step);
            const stepUrgencyTone = getDashboardRowUrgencyTone(stepCompletion);
            const stepIconTone = getDashboardJourneyStepIconTone(
              step,
              isActiveJourneyStep,
              stepIndex,
            );
            const journeyAbsDistance = Math.abs(journeyDistance);
            const journeyDirection = Math.sign(journeyDistance);
            const journeySlots = [
              {
                blur: 0,
                opacity: 1,
                rotateX: 0,
                scale: 1.22,
                y: 0,
                zIndex: 32,
              },
              {
                blur: 0.15,
                opacity: 0.9,
                rotateX: -34,
                scale: 0.96,
                y: 20,
                zIndex: 22,
              },
              {
                blur: 0.35,
                opacity: 0,
                rotateX: -54,
                scale: 0.76,
                y: 32,
                zIndex: 12,
              },
            ];
            const journeySlot =
              journeySlots[
                Math.min(journeyAbsDistance, journeySlots.length - 1)
              ];

            return (
              <Link
                aria-current={isActiveJourneyStep ? "step" : undefined}
                aria-label={`${step.label} journey tab, ${stepUrgencyTone.label}`}
                className={`absolute left-1/2 top-1/2 grid h-6 w-6 place-items-center rounded-full border ring-1 ring-white/10 transition-[border-color,background-color,box-shadow,filter,opacity,transform] duration-300 hover:-translate-y-0.5 hover:brightness-125 active:scale-95 ${
                  isActiveJourneyStep
                    ? `${stepIconTone} ring-white/20`
                    : `${stepIconTone} hover:ring-cyan-100/24`
                }`}
                href={step.href}
                key={`${activeDashboardHeaderLink.label}-${step.label}-header-journey`}
                onClick={() => {
                  if (card) {
                    setActiveDashboardJourneyStepIndexes((currentIndexes) => ({
                      ...currentIndexes,
                      [card.title]: stepIndex,
                    }));
                  }
                  markDashboardDestinationVisited(step.href);
                }}
                style={{
                  filter: `blur(${journeySlot.blur}px)`,
                  opacity: journeySlot.opacity,
                  pointerEvents: journeyAbsDistance > 1 ? "none" : "auto",
                  transform: `translate(-50%, -50%) translateY(${
                    journeyDirection * journeySlot.y
                  }px) scale(${
                    journeySlot.scale
                  }) rotateX(${journeyDirection * journeySlot.rotateX}deg)`,
                  zIndex: journeySlot.zIndex,
                }}
                title={step.label}
              >
                <span className="sr-only">{step.label}</span>
                <DashboardTabIcon
                  className={
                    isActiveJourneyStep
                      ? "h-3.5 w-3.5 drop-shadow-[0_0_8px_rgba(255,255,255,0.30)]"
                      : "h-3 w-3 drop-shadow-[0_0_7px_rgba(255,255,255,0.24)]"
                  }
                  label={step.label}
                  name={step.icon}
                />
              </Link>
            );
          })}
        </div>
      </div>
    );
  };

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
        className="pointer-events-auto mt-2 pt-0 [perspective:900px]"
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
        <div className="relative mb-0.5 flex min-h-5 items-center justify-center">
          {steps.length > 1 ? (
            <button
              aria-label={`Previous ${card.title} journey step`}
              className="absolute left-0 top-1/2 z-40 grid h-5 w-5 -translate-y-1/2 place-items-center rounded-full border border-cyan-200/18 bg-slate-950/72 text-[8px] font-black text-cyan-100 shadow-[0_0_14px_rgba(34,211,238,0.10)] backdrop-blur transition hover:-translate-x-0.5 hover:border-amber-200/42 hover:bg-amber-300/10 hover:text-amber-100 active:scale-95"
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
          <div className="px-8 text-center text-[8px] font-black uppercase tracking-[0.16em] text-cyan-200/70">
            {dashboardJourneyPanelTitle}
          </div>
          {steps.length > 1 ? (
            <button
              aria-label={`Next ${card.title} journey step`}
              className="absolute right-0 top-1/2 z-40 grid h-5 w-5 -translate-y-1/2 place-items-center rounded-full border border-cyan-200/18 bg-slate-950/72 text-[8px] font-black text-cyan-100 shadow-[0_0_14px_rgba(34,211,238,0.10)] backdrop-blur transition hover:translate-x-0.5 hover:border-amber-200/42 hover:bg-amber-300/10 hover:text-amber-100 active:scale-95"
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
          className="relative mb-0.5 h-8 max-w-full overflow-visible px-1 [perspective:680px]"
        >
          {steps.map((step, stepIndex) => {
            const journeyDistance = getDashboardJourneyStepOrbitDistance(
              stepIndex,
              activeJourneyStepIndex,
              steps.length,
            );
            if (Math.abs(journeyDistance) > 3) {
              return null;
            }

            const clampedDistance = Math.max(
              -3,
              Math.min(3, journeyDistance),
            );
            const journeyAbsDistance = Math.abs(clampedDistance);
            const journeyDirection = Math.sign(clampedDistance);
            const isActiveJourneyStep = journeyDistance === 0;
            const stepCompletion = getDashboardJourneyStepCompletion(step);
            const stepUrgencyTone = getDashboardRowUrgencyTone(stepCompletion);
            const stepIconTone = getDashboardJourneyStepIconTone(
              step,
              isActiveJourneyStep,
              stepIndex,
            );
            const xSlots = [0, 26, 50, 74];
            const x = journeyDirection * xSlots[journeyAbsDistance];
            const scale =
              journeyAbsDistance === 0
                ? 1.08
                : journeyAbsDistance === 1
                  ? 0.94
                  : journeyAbsDistance === 2
                    ? 0.82
                    : 0.72;
            const opacity =
              journeyAbsDistance === 0
                ? 1
                : journeyAbsDistance === 1
                  ? 0.92
                  : journeyAbsDistance === 2
                    ? 0.78
                    : 0.58;
            const rotateY = journeyDirection * -14;

            return (
              <button
                aria-label={`Show ${step.label} journey card, ${stepUrgencyTone.label}`}
                aria-pressed={isActiveJourneyStep}
                className={`absolute left-1/2 top-1/2 isolate flex h-6 w-6 items-center justify-center overflow-visible rounded-full border text-left shadow-[0_12px_28px_rgba(0,0,0,0.30),inset_0_1px_0_rgba(255,255,255,0.14)] backdrop-blur-xl transition-[border-color,background-color,box-shadow,filter] duration-300 hover:-translate-y-0.5 hover:saturate-150 active:scale-95 ${
                  isActiveJourneyStep
                    ? `${stepIconTone} ring-2 ring-white/16 shadow-[0_0_20px_rgba(34,211,238,0.16),inset_0_1px_0_rgba(255,255,255,0.18)]`
                    : `${stepIconTone} hover:brightness-125`
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
                style={{
                  opacity,
                  transform: `translate(-50%, -50%) translateX(${x}px) translateZ(${
                    isActiveJourneyStep ? 38 : 18 - journeyAbsDistance * 5
                  }px) rotateY(${rotateY}deg) scale(${scale})`,
                  transition:
                    "transform 520ms cubic-bezier(0.2,0.82,0.2,1), opacity 260ms ease, border-color 220ms ease, background-color 220ms ease, box-shadow 220ms ease",
                  zIndex: 30 - journeyAbsDistance,
                }}
                title={`${step.label} - ${stepUrgencyTone.label}`}
                type="button"
              >
                <span className="sr-only">{step.label}</span>
                <DashboardTabIcon
                  className={`shrink-0 ${
                    isActiveJourneyStep ? "h-3.5 w-3.5" : "h-3 w-3"
                  }`}
                  label={step.label}
                  name={step.icon}
                />
                <span
                  aria-hidden="true"
                  className={`absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full ring-1 ring-slate-950/80 ${stepUrgencyTone.dot}`}
                />
              </button>
            );
          })}
        </div>

        <div className="relative h-[66px] overflow-visible [transform-style:preserve-3d]">
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
                width: 144,
                x: 0,
                y: 0,
                zIndex: 34,
              },
              {
                blur: 0.2,
                opacity: 0.74,
                rotateY: -18,
                scale: 0.78,
                width: 82,
                x: 92,
                y: 5,
                zIndex: 24,
              },
              {
                blur: 0.9,
                opacity: 0.34,
                rotateY: -34,
                scale: 0.58,
                width: 62,
                x: 122,
                y: 10,
                zIndex: 14,
              },
              {
                blur: 1.8,
                opacity: 0.14,
                rotateY: -48,
                scale: 0.5,
                width: 54,
                x: 142,
                y: 15,
                zIndex: 6,
              },
            ];
            const journeySlot =
              journeySlots[
                Math.min(journeyAbsDistance, journeySlots.length - 1)
              ];
            const isActiveJourneyStep = journeyDistance === 0;
            const stepCardTone = getDashboardJourneyStepTone(step, stepIndex);

            return (
              <Link
                aria-current={isActiveJourneyStep ? "step" : undefined}
                className={`dashboard-journey-orbit-card absolute left-1/2 top-1/2 isolate flex h-[58px] flex-col items-center justify-center gap-0.5 overflow-visible rounded-xl border px-1.5 text-center transition-[transform,opacity,filter,border-color,background-color,box-shadow] duration-[420ms] hover:-translate-y-0.5 active:scale-[0.98] ${
                  isActiveJourneyStep ? "dashboard-journey-active-card" : ""
                } ${dashboardJourneyStepStyles[step.state]}`}
                href={step.href}
                key={`${card.title}-${step.label}`}
                onClick={(event) => event.stopPropagation()}
                style={{
                  ...dashboardEffectToneStyles[stepCardTone],
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
                    isActiveJourneyStep ? "h-7 w-7" : "h-6 w-6"
                  } ${getDashboardJourneyStepIconTone(
                    step,
                    isActiveJourneyStep,
                    stepIndex,
                  )}`}
                  aria-hidden="true"
                >
                  <DashboardTabIcon
                    className={
                      isActiveJourneyStep
                        ? "h-3.5 w-3.5 drop-shadow-[0_0_10px_rgba(255,255,255,0.28)]"
                        : "h-3 w-3 drop-shadow-[0_0_8px_rgba(255,255,255,0.22)]"
                    }
                    label={step.label}
                    name={step.icon}
                  />
                </span>
                <span
                  className={`relative z-10 max-w-full px-1 font-black uppercase leading-[1.05] tracking-[0.08em] drop-shadow-[0_1px_8px_rgba(2,6,23,0.7)] ${
                    isActiveJourneyStep
                      ? "whitespace-normal text-[8px] text-white"
                      : "truncate whitespace-nowrap text-[7px] text-slate-100/90"
                  }`}
                >
                  {step.label}
                </span>
                {renderDashboardCompletionDot(
                  getDashboardJourneyStepCompletion(step),
                  isActiveJourneyStep || step.state === "complete",
                  "-bottom-1 -right-1 z-30",
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
        className="absolute right-[5.75rem] top-[44%] z-40 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-cyan-200/24 bg-slate-950/60 text-2xl font-black text-cyan-100 shadow-[0_0_30px_rgba(34,211,238,0.16)] backdrop-blur transition hover:translate-x-0.5 hover:border-amber-200/45 hover:bg-amber-300/10 hover:text-amber-100 hover:shadow-[0_0_38px_rgba(250,204,21,0.18)] active:scale-95 sm:right-[6.25rem] sm:h-14 sm:w-14 sm:text-3xl lg:right-[6.75rem] xl:right-[7.25rem]"
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
    if (
      clampedDashboardOrbiterRow <= 2 ||
      clampedDashboardOrbiterRow === 4 ||
      clampedDashboardOrbiterRow === 5
    ) {
      return null;
    }

    return (
    <div className="pointer-events-none absolute inset-x-0 top-[118px] z-[70] px-3 sm:top-[122px] sm:px-5 lg:top-[126px] lg:px-8">
      <section className="pointer-events-auto mx-auto max-w-[1280px] overflow-hidden rounded-[22px] border border-white/12 bg-[radial-gradient(circle_at_14%_0%,rgba(34,211,238,0.18),transparent_32%),radial-gradient(circle_at_88%_16%,rgba(250,204,21,0.11),transparent_28%),linear-gradient(135deg,rgba(15,23,42,0.72),rgba(2,6,23,0.58))] p-2.5 shadow-[0_18px_60px_rgba(0,0,0,0.30),0_0_28px_rgba(34,211,238,0.08),inset_0_1px_0_rgba(255,255,255,0.10)] backdrop-blur-xl sm:p-3">
        <div className="flex flex-col gap-2 min-[760px]:flex-row min-[760px]:items-center min-[760px]:justify-between">
          <div className="flex min-w-0 items-center gap-2 min-[760px]:max-w-[360px] min-[1040px]:max-w-[500px]">
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
                  aria-label={`${dashboardFloatingSnapshotEyebrow} card orbit`}
                  className="relative mt-1.5 h-9 w-[300px] max-w-full overflow-visible [perspective:760px] sm:w-[340px]"
                >
                  {dashboardFloatingSnapshotRowCards.map((card, cardIndex) => {
                    const activeCardIndex =
                      dashboardFloatingSnapshotActiveCardIndex >= 0
                        ? dashboardFloatingSnapshotActiveCardIndex
                        : 0;
                    const distance = getDashboardOrbitDistance(
                      cardIndex,
                      activeCardIndex,
                      dashboardFloatingSnapshotRowCards.length,
                    );
                    const clampedDistance = Math.max(-3, Math.min(3, distance));
                    const absDistance = Math.abs(clampedDistance);
                    const direction = Math.sign(clampedDistance);
                    const isActiveCard =
                      cardIndex === activeCardIndex;
                    const cardTone = getDashboardRowUrgencyTone(
                      getDashboardNavigationCardCompletion(card),
                    );
                    const xSlots = [0, 38, 76, 114];
                    const x = direction * xSlots[absDistance];
                    const scale =
                      absDistance === 0
                        ? 1
                        : absDistance === 1
                          ? 0.86
                          : absDistance === 2
                            ? 0.72
                            : 0.58;
                    const opacity =
                      absDistance === 0
                        ? 1
                        : absDistance === 1
                          ? 0.86
                          : absDistance === 2
                            ? 0.62
                            : 0.42;
                    const rotateY = direction * -18;

                    return (
                      <button
                        aria-label={`Show ${card.title} card, ${cardTone.label}`}
                        aria-pressed={isActiveCard}
                        className={`absolute left-1/2 top-1/2 flex h-8 items-center justify-center overflow-hidden rounded-full border text-left shadow-[0_14px_34px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-xl transition-[width,border-color,background-color,box-shadow] duration-300 hover:-translate-y-0.5 active:scale-95 ${
                          isActiveCard
                            ? `${dashboardIconToneStyles[card.tone].active} w-8 px-0 text-white`
                            : `${dashboardIconToneStyles[card.tone].idle} w-8 px-0 hover:brightness-125`
                        }`}
                        key={`${dashboardFloatingSnapshotEyebrow}-${card.title}`}
                        onClick={() => {
                          if (clampedDashboardOrbiterRow === 3) {
                            setActiveCommandCenterIndex(cardIndex);
                            return;
                          }

                          if (clampedDashboardOrbiterRow === 6) {
                            setActiveSystemCenterIndex(cardIndex);
                          }
                        }}
                        style={{
                          opacity,
                          transform: `translate(-50%, -50%) translateX(${x}px) translateZ(${
                            isActiveCard ? 42 : 16 - absDistance * 6
                          }px) rotateY(${rotateY}deg) scale(${scale})`,
                          transition:
                            "transform 520ms cubic-bezier(0.2,0.82,0.2,1), opacity 260ms ease, width 300ms ease, border-color 220ms ease, background-color 220ms ease, box-shadow 220ms ease",
                          zIndex: 30 - absDistance,
                        }}
                        title={`${card.title} - ${cardTone.label}`}
                        type="button"
                      >
                        <span className="sr-only">{card.title}</span>
                        <DashboardTabIcon
                          className={`shrink-0 ${
                            isActiveCard ? "h-3.5 w-3.5" : "h-3 w-3"
                          }`}
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

          <div className="relative min-h-[108px] min-w-0 flex-1 overflow-visible [perspective:780px] min-[760px]:max-w-[250px] min-[1040px]:max-w-[280px]">
            <div
              aria-live="polite"
              className="sr-only"
            >
              {activeDashboardFloatingMetric
                ? `${activeDashboardFloatingMetric.label}: ${activeDashboardFloatingMetric.value}`
                : "Dashboard metric orbit"}
            </div>
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-[94px] w-px -translate-x-1/2 -translate-y-1/2 bg-gradient-to-b from-transparent via-cyan-200/24 to-transparent shadow-[0_0_18px_rgba(34,211,238,0.20)]" />
            <div
              aria-label={`${dashboardFloatingSnapshotTitle} metric orbit`}
              className="absolute inset-0 [transform-style:preserve-3d]"
            >
              {dashboardFloatingSnapshotMetrics.map((metric, metricIndex) => {
                const activeMetricIndex =
                  activeDashboardFloatingMetricIndex %
                  Math.max(1, dashboardFloatingSnapshotMetrics.length);
                const distance = getDashboardOrbitDistance(
                  metricIndex,
                  activeMetricIndex,
                  dashboardFloatingSnapshotMetrics.length,
                );
                const clampedDistance = Math.max(-2, Math.min(2, distance));
                const absDistance = Math.abs(clampedDistance);
                const isActive = distance === 0;
                const direction = Math.sign(clampedDistance);
                const metricTone = [
                  "cyan",
                  "amber",
                  "emerald",
                  "violet",
                ][metricIndex % 4] as DashboardCardTone;
                const metricUrgencyTone = getDashboardRowUrgencyTone(
                  getDashboardFloatingMetricCompletion(metric),
                );
                const ySlots = [0, 35, 66];
                const y = direction * ySlots[absDistance];
                const x = isActive ? 0 : absDistance * 7;
                const scale = isActive ? 1 : absDistance === 1 ? 0.84 : 0.68;
                const opacity = isActive ? 1 : absDistance === 1 ? 0.72 : 0.34;
                const rotateX = direction * -18;

                return (
                  <button
                    aria-label={`Show ${metric.label} metric, ${metric.value}, ${metricUrgencyTone.label}`}
                    aria-pressed={isActive}
                    className={`absolute left-1/2 top-1/2 flex h-10 items-center justify-between gap-3 rounded-2xl border px-3 text-left shadow-[0_16px_42px_rgba(0,0,0,0.30),inset_0_1px_0_rgba(255,255,255,0.10)] backdrop-blur-xl transition-[width,border-color,background-color,box-shadow] duration-300 ${
                      isActive
                        ? `${dashboardIconToneStyles[metricTone].active} w-[208px]`
                        : `${dashboardIconToneStyles[metricTone].idle} w-[174px] hover:brightness-125`
                    }`}
                    key={`${dashboardFloatingSnapshotTitle}-${metric.label}`}
                    onClick={() =>
                      setActiveDashboardFloatingMetricIndex(metricIndex)
                    }
                    style={{
                      opacity,
                      transform: `translate(-50%, -50%) translateX(${x}px) translateY(${y}px) translateZ(${
                        isActive ? 62 : 18 - absDistance * 8
                      }px) rotateX(${rotateX}deg) scale(${scale})`,
                      transition:
                        "transform 560ms cubic-bezier(0.2, 0.82, 0.2, 1), opacity 320ms ease, width 260ms ease, border-color 220ms ease, background-color 220ms ease, box-shadow 220ms ease",
                      zIndex: 30 - absDistance,
                    }}
                    type="button"
                  >
                    <span
                      aria-hidden="true"
                      className={`absolute inset-x-5 top-0 h-px rounded-full ${dashboardToneStyles[metricTone].line}`}
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-[7px] font-black uppercase tracking-[0.14em] text-slate-300/80">
                        {metric.label}
                      </span>
                      <span className="block truncate text-sm font-black tracking-tight text-white">
                        {metric.value}
                      </span>
                    </span>
                    <span
                      aria-hidden="true"
                      className={`grid h-4 w-4 shrink-0 place-items-center rounded-full border bg-slate-950/72 text-[7px] font-black leading-none text-slate-950 ring-1 ring-white/10 ${
                        isActive
                          ? `${metricUrgencyTone.ring} ${metricUrgencyTone.text}`
                          : "border-white/10 text-slate-500"
                      }`}
                    >
                      <span
                        className={`grid h-3 w-3 place-items-center rounded-full text-slate-950 ${
                          isActive
                            ? metricUrgencyTone.dot
                            : `${metricUrgencyTone.dot} opacity-45 grayscale`
                        }`}
                      >
                        {isActive ? metricUrgencyTone.icon : ""}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
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
      <div className="relative mx-auto flex min-h-[88px] w-full max-w-[1840px] items-center gap-4 px-3 py-2.5 sm:px-4 sm:py-3 md:px-6 xl:px-8 2xl:px-10">
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
          className="flex w-fit max-w-[calc(100vw-7.5rem)] shrink-0 select-none items-center gap-2 bg-transparent p-0 shadow-none md:max-w-[min(64vw,620px)] lg:max-w-none"
        >
          <div
            aria-label="Dashboard scroll controls"
            className="relative z-10 flex h-12 w-9 translate-x-2 shrink-0 flex-col overflow-hidden rounded-2xl border border-cyan-100/12 bg-slate-950/22 text-[9px] font-black text-cyan-100/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
            role="group"
          >
            <button
              aria-label="Next dashboard"
              className="grid min-h-0 flex-1 place-items-center border-b border-white/10 transition hover:border-amber-200/28 hover:bg-amber-300/10 hover:text-amber-100 active:scale-95"
              onClick={() => rotateDashboardHeaderRail("right")}
              title="Next dashboard"
              type="button"
            >
              &gt;
            </button>
            <button
              aria-label="Previous dashboard"
              className="grid min-h-0 flex-1 place-items-center transition hover:border-amber-200/28 hover:bg-amber-300/10 hover:text-amber-100 active:scale-95"
              onClick={() => rotateDashboardHeaderRail("left")}
              title="Previous dashboard"
              type="button"
            >
              &lt;
            </button>
          </div>
          <div
            aria-label={`${activeDashboardHeaderLink.label} dashboard tab`}
            className={`flex min-h-[62px] w-auto min-w-max shrink-0 items-center gap-3 rounded-[22px] border border-transparent bg-transparent px-2.5 py-2 text-left text-cyan-50 shadow-none transition ${
              dashboardHeaderSlideDirection === "right"
                ? "animate-[sessions-dashboard-chip-slide-from-right_220ms_ease-out]"
                : "animate-[sessions-dashboard-chip-slide-from-left_220ms_ease-out]"
            }`}
            key={`${activeDashboardHeaderLink.label}-${dashboardHeaderSlideDirection}`}
            role="group"
          >
            <div className="flex min-w-[214px] shrink-0 items-center justify-center gap-2">
              <Link
                aria-label={`Open ${activeDashboardHeaderLink.label}, ${activeDashboardHeaderLink.points.toLocaleString()} points`}
                className="flex items-center gap-3 rounded-xl px-0.5 transition hover:-translate-y-0.5 hover:bg-white/[0.04]"
                draggable={false}
                href={activeDashboardHeaderLink.href}
                onClick={() =>
                  markDashboardDestinationVisited(activeDashboardHeaderLink.href)
                }
                onDragStart={(event) => event.preventDefault()}
              >
                <span
                  aria-hidden="true"
                  className={`relative flex h-12 w-12 shrink-0 flex-col items-center justify-center gap-0.5 rounded-2xl border text-[10px] font-black shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_16px_rgba(255,255,255,0.06)] ${activeDashboardHeaderLink.tone}`}
                >
                  <DashboardTabIcon className="h-4 w-4" name={activeDashboardHeaderLink.icon} />
                  <span className="block max-w-[2.65rem] truncate text-[8px] font-black leading-none tracking-tight text-cyan-50 [text-shadow:0_1px_10px_rgba(0,0,0,0.36)]">
                    {activeDashboardHeaderLink.points.toLocaleString()}
                  </span>
                  {renderDashboardCompletionDot(
                    activeDashboardHeaderLink.completion,
                    true,
                    "-bottom-1 -right-1",
                  )}
                </span>
                <span className="block whitespace-nowrap">
                  <span className="block text-[8px] font-black uppercase tracking-[0.14em] opacity-70">
                    {activeDashboardHeaderLink.meta}
                  </span>
                  <span className="mt-0.5 block text-[10px] font-black uppercase tracking-[0.12em] sm:text-[11px]">
                    {activeDashboardHeaderLink.label}
                  </span>
                  <span className="mt-0.5 block max-w-[118px] truncate text-[7px] font-black uppercase tracking-[0.1em] text-amber-100/80">
                    {getDashboardHeaderActiveJourneyStepLabel()}
                  </span>
                </span>
              </Link>
              {renderDashboardHeaderJourneyTabs()}
            </div>
          </div>
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
          <span className="flex min-w-[72px] flex-col items-start justify-center gap-1">
            <span className="flex items-center gap-1.5">
              <span className="sr-only">Tokens</span>
              <Image
                alt=""
                className="h-4 w-4 rounded-full border border-cyan-200/20 bg-slate-950 object-contain p-0.5"
                height={16}
                src="/sound-fitness-logo.png"
                width={16}
              />
              <span className="text-xs font-black leading-none text-white">
                {soundTokens.toLocaleString()}
              </span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="sr-only">Points</span>
              <svg
                aria-hidden="true"
                className="h-4 w-4 text-amber-200 drop-shadow-[0_0_12px_rgba(250,204,21,0.28)]"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M13.5 2 4.8 13.2h6.1L9.7 22 19.2 9.6h-6.4L13.5 2Z" />
              </svg>
              <span className="text-sm font-black leading-none text-white">
                {soundPoints.toLocaleString()}
              </span>
            </span>
          </span>
        </button>
      </div>
    </div>
  );

  const renderFavoriteWorkoutsCard = () => (
    <section className="relative z-10 mx-auto w-full max-w-[1080px] overflow-hidden rounded-[24px] border border-cyan-200/16 bg-[linear-gradient(135deg,rgba(15,23,42,0.68),rgba(2,6,23,0.54)),radial-gradient(circle_at_8%_0%,rgba(34,211,238,0.13),transparent_32%)] p-2.5 shadow-2xl shadow-black/15 backdrop-blur sm:p-3">
      <div className="flex flex-col gap-2 min-[760px]:flex-row min-[760px]:items-center">
        <div className="flex shrink-0 items-center justify-between gap-3 min-[760px]:w-[190px] min-[760px]:flex-col min-[760px]:items-start">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">
              Favorite Workouts
            </div>
            <p className="mt-1 text-[11px] font-semibold text-slate-400">
              Fast launch saved sessions.
            </p>
          </div>
          <div className="hidden gap-1.5 min-[760px]:flex">
            <button
              aria-label="Scroll favorite workouts left"
              className="grid h-7 w-7 place-items-center rounded-xl border border-white/10 bg-slate-950/55 text-xs font-black text-slate-300 transition hover:border-cyan-200/35 hover:bg-cyan-300/10 hover:text-cyan-100"
              onClick={() => scrollFavoriteWorkouts("left")}
              type="button"
            >
              &lt;
            </button>
            <button
              aria-label="Scroll favorite workouts right"
              className="grid h-7 w-7 place-items-center rounded-xl border border-white/10 bg-slate-950/55 text-xs font-black text-slate-300 transition hover:border-cyan-200/35 hover:bg-cyan-300/10 hover:text-cyan-100"
              onClick={() => scrollFavoriteWorkouts("right")}
              type="button"
            >
              &gt;
            </button>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex justify-end gap-2 min-[760px]:hidden">
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
                  className={`group flex h-[72px] min-w-[220px] snap-start items-center gap-2.5 rounded-[18px] border p-2.5 transition hover:-translate-y-0.5 active:scale-[0.99] ${
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
                    className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl border text-lg ${
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
              className="group flex h-[72px] min-w-[168px] snap-start items-center gap-2.5 rounded-[18px] border border-dashed border-cyan-200/24 bg-cyan-300/6 p-2.5 transition hover:-translate-y-0.5 hover:border-cyan-200/48 hover:bg-cyan-300/10 active:scale-[0.99]"
              href={ROUTES.workoutBuilder.home}
            >
              <span
                className="grid h-10 w-10 place-items-center rounded-2xl border border-cyan-200/24 bg-slate-950/54 text-lg text-cyan-100"
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
              className="group flex h-[72px] min-w-[168px] snap-start items-center gap-2.5 rounded-[18px] border border-white/10 bg-slate-950/45 p-2.5 transition hover:-translate-y-0.5 hover:border-amber-200/35 hover:bg-amber-300/8 active:scale-[0.99]"
              href={ROUTES.dashboard.sessionHistory}
            >
              <span
                className="grid h-10 w-10 place-items-center rounded-2xl border border-amber-200/20 bg-amber-300/8 text-base text-amber-100"
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
    <div className="relative z-10 mt-1 grid gap-2 min-[760px]:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] min-[760px]:items-end">
      <div className="relative h-[210px] min-w-0 overflow-hidden px-0 pb-5 pt-0 sm:h-[214px]">
        <div className="flex h-full min-w-0 flex-col items-center justify-end gap-0">
          <div className="order-2 relative h-[154px] w-[284px] max-w-full shrink-0 sm:h-[158px] sm:w-[296px]">
            <span className="pointer-events-none absolute inset-x-6 bottom-6 top-7 rounded-full bg-cyan-400/12 blur-2xl" />
            <span className="pointer-events-none absolute bottom-4 left-1/2 h-20 w-20 -translate-x-1/2 rounded-full bg-yellow-300/18 blur-2xl" />
            <svg
              aria-hidden="true"
              className="absolute inset-0 h-full w-full overflow-visible"
              viewBox="0 0 220 148"
            >
              <path
                d="M26 112 A84 84 0 0 1 194 112"
                fill="none"
                pathLength={100}
                stroke="rgba(148,163,184,0.16)"
                strokeLinecap="round"
                strokeWidth="22"
              />
              <path
                d="M34 112 A76 76 0 0 1 186 112"
                fill="none"
                pathLength={100}
                stroke="rgba(15,23,42,0.74)"
                strokeLinecap="round"
                strokeWidth="9"
              />
              <path
                d="M26 112 A84 84 0 0 1 194 112"
                fill="none"
                pathLength={100}
                stroke="rgba(255,255,255,0.15)"
                strokeLinecap="round"
                strokeWidth="2"
              />
              <path
                d="M26 112 A84 84 0 0 1 194 112"
                fill="none"
                pathLength={100}
                stroke="url(#dashboardMomentumGaugeGradient)"
                strokeDasharray="100"
                strokeDashoffset={100 - momentumMeterScore}
                strokeLinecap="round"
                strokeWidth="22"
                filter="url(#dashboardMomentumGaugeGlow)"
              />
              {Array.from({ length: 9 }).map((_, tickIndex) => {
                const tickAngle = -90 + tickIndex * 22.5;
                const isMajorTick = tickIndex % 2 === 0;

                return (
                  <line
                    key={`momentum-tick-${tickIndex}`}
                    stroke={
                      isMajorTick
                        ? "rgba(224,242,254,0.58)"
                        : "rgba(148,163,184,0.34)"
                    }
                    strokeLinecap="round"
                    strokeWidth={isMajorTick ? 2.2 : 1.4}
                    transform={`rotate(${tickAngle} 110 112)`}
                    x1="110"
                    x2="110"
                    y1={isMajorTick ? 30 : 34}
                    y2="42"
                  />
                );
              })}
              <g
                style={{
                  transform: `rotate(${momentumNeedleAngle}deg)`,
                  transformOrigin: "110px 112px",
                }}
              >
                <line
                  stroke="url(#dashboardMomentumNeedleGradient)"
                  strokeLinecap="round"
                  strokeWidth="5"
                  x1="110"
                  x2="110"
                  y1="112"
                  y2="48"
                  filter="url(#dashboardMomentumNeedleGlow)"
                />
                <line
                  stroke="rgba(236,254,255,0.82)"
                  strokeLinecap="round"
                  strokeWidth="1.5"
                  x1="110"
                  x2="110"
                  y1="110"
                  y2="54"
                />
              </g>
              <circle
                cx={momentumMeterNeedleTipX}
                cy={momentumMeterNeedleTipY}
                fill="rgb(250,204,21)"
                r="7"
                stroke="rgba(254,249,195,0.92)"
                strokeWidth="2"
                filter="url(#dashboardMomentumNeedleGlow)"
              />
              <circle
                cx="110"
                cy="112"
                fill="rgba(2,6,23,0.96)"
                r="14"
                stroke="rgba(125,211,252,0.45)"
                strokeWidth="4"
              />
              <circle
                cx="110"
                cy="112"
                fill="rgba(14,165,233,0.20)"
                r="8"
                stroke="rgba(224,242,254,0.45)"
                strokeWidth="1.5"
              />
              <text
                fill="rgba(203,213,225,0.56)"
                fontSize="9"
                fontWeight="900"
                textAnchor="middle"
                x="31"
                y="133"
              >
                0
              </text>
              <text
                fill="rgba(203,213,225,0.56)"
                fontSize="9"
                fontWeight="900"
                textAnchor="middle"
                x="189"
                y="133"
              >
                {momentumStreakTarget}
              </text>
              <defs>
                <linearGradient
                  id="dashboardMomentumGaugeGradient"
                  x1="24"
                  x2="196"
                  y1="112"
                  y2="112"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop offset="0%" stopColor="rgb(56,189,248)" />
                  <stop offset="45%" stopColor="rgb(45,212,191)" />
                  <stop offset="72%" stopColor="rgb(129,140,248)" />
                  <stop offset="100%" stopColor="rgb(250,204,21)" />
                </linearGradient>
                <linearGradient
                  id="dashboardMomentumNeedleGradient"
                  x1="110"
                  x2="110"
                  y1="112"
                  y2="48"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop offset="0%" stopColor="rgb(14,165,233)" />
                  <stop offset="55%" stopColor="rgb(224,242,254)" />
                  <stop offset="100%" stopColor="rgb(250,204,21)" />
                </linearGradient>
                <filter
                  id="dashboardMomentumGaugeGlow"
                  x="-20%"
                  y="-40%"
                  width="140%"
                  height="180%"
                >
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feColorMatrix
                    in="blur"
                    type="matrix"
                    values="0 0 0 0 0.18 0 0 0 0 0.82 0 0 0 0 0.95 0 0 0 0.58 0"
                  />
                  <feMerge>
                    <feMergeNode />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <filter
                  id="dashboardMomentumNeedleGlow"
                  x="-80%"
                  y="-80%"
                  width="260%"
                  height="260%"
                >
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
            </svg>
            <div className="absolute inset-x-0 bottom-[52px] text-center">
              <div className="text-[3.35rem] font-black leading-none text-white drop-shadow-[0_0_18px_rgba(125,211,252,0.30)]">
                {momentumEntryStreak}
              </div>
              <div className="mt-0.5 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200">
                Day Streak
              </div>
            </div>
            <div className="absolute inset-x-4 bottom-3 grid grid-cols-2 gap-1.5 text-center">
              <div className="rounded-full border border-cyan-300/18 bg-slate-950/48 px-2 py-0.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                <span className="block text-[7px] font-black uppercase tracking-[0.16em] text-slate-400">
                  Signal
                </span>
                <span className="block truncate text-[9px] font-black uppercase tracking-[0.08em] text-cyan-100">
                  {momentumSignalLabel}
                </span>
              </div>
              <div className="rounded-full border border-yellow-300/20 bg-slate-950/48 px-2 py-0.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                <span className="block text-[7px] font-black uppercase tracking-[0.16em] text-slate-400">
                  Goal
                </span>
                <span className="block truncate text-[9px] font-black uppercase tracking-[0.08em] text-yellow-100">
                  {momentumGoalLabel}
                </span>
              </div>
            </div>
          </div>

          <div className="order-1 min-w-0 self-stretch px-1 text-center">
            <div className="truncate text-[9px] font-black uppercase tracking-[0.14em] text-cyan-50">
              {momentumMeterCaption}
            </div>
            <p className="mt-1 line-clamp-1 text-[10px] font-bold leading-4 text-slate-100">
              {momentumPrompt}
            </p>
          </div>
        </div>
      </div>
      <div className="relative min-w-0 overflow-hidden before:pointer-events-none before:absolute before:inset-0 before:z-0 before:bg-[radial-gradient(ellipse_at_8%_0%,rgba(250,204,21,0.10),transparent_32%),radial-gradient(ellipse_at_92%_20%,rgba(34,211,238,0.09),transparent_34%),radial-gradient(ellipse_at_50%_72%,rgba(2,6,23,0.30),transparent_72%)] before:[mask-image:radial-gradient(ellipse_at_center,black_0%,black_46%,rgba(0,0,0,0.68)_68%,transparent_100%)] before:content-['']">
      <div className="sr-only">Progression rewards. Recent achievements.</div>
      <div
        aria-label="Dashboard achievement orbit"
        className="relative z-10 h-[154px] cursor-grab select-none overflow-visible [perspective:1000px] [touch-action:pan-y] active:cursor-grabbing sm:h-[160px]"
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
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 z-[31] w-24 bg-gradient-to-r from-[#101927]/95 via-[#101927]/64 to-transparent"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 z-[31] w-24 bg-gradient-to-l from-[#101927]/95 via-[#101927]/64 to-transparent"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-6 top-0 z-[31] h-8 bg-gradient-to-b from-[#101927]/58 to-transparent"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-6 bottom-0 z-[31] h-8 bg-gradient-to-t from-[#101927]/58 to-transparent"
        />
        <button
          aria-label="Previous dashboard achievement"
          className="absolute left-1 top-1/2 z-40 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full border border-cyan-200/24 bg-slate-950/72 text-base font-black text-cyan-100 shadow-[0_0_22px_rgba(34,211,238,0.14)] backdrop-blur transition hover:-translate-x-0.5 hover:border-amber-200/45 hover:bg-amber-300/10 hover:text-amber-100"
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
          className="absolute right-1 top-1/2 z-40 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full border border-cyan-200/24 bg-slate-950/72 text-base font-black text-cyan-100 shadow-[0_0_22px_rgba(34,211,238,0.14)] backdrop-blur transition hover:translate-x-0.5 hover:border-amber-200/45 hover:bg-amber-300/10 hover:text-amber-100"
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
                x: baseSlot.x + overflowDistance * 96,
                y: baseSlot.y + overflowDistance * 24,
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
                  ? "h-[136px] w-[min(52vw,184px)] overflow-visible rounded-[24px] border border-cyan-100/30 bg-[radial-gradient(circle_at_18%_0%,rgba(34,211,238,0.18),transparent_36%),radial-gradient(circle_at_88%_12%,rgba(250,204,21,0.13),transparent_34%),linear-gradient(135deg,rgba(15,23,42,0.88),rgba(2,6,23,0.74))] px-2.5 py-2 shadow-[0_18px_44px_rgba(0,0,0,0.30),0_0_28px_rgba(34,211,238,0.16),inset_0_1px_0_rgba(255,255,255,0.10)] backdrop-blur-xl sm:h-[140px]"
                  : "min-h-[92px] w-[min(42vw,122px)] hover:drop-shadow-[0_14px_34px_rgba(34,211,238,0.14)]"
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
                className={`pointer-events-none absolute left-1/2 top-[42%] h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full blur-2xl transition ${
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
                className={`relative z-10 mt-1 max-w-[130px] text-center font-black uppercase leading-tight tracking-[0.1em] ${
                  isActiveAchievement
                    ? "text-xs text-white drop-shadow-[0_0_16px_rgba(34,211,238,0.24)]"
                    : "text-[9px] text-slate-300"
                }`}
              >
                {achievement.label}
              </h3>
              {isActiveAchievement ? (
                <div className="relative z-10 mt-0.5 w-full text-left">
                  {achievement.meta ? (
                    <p className="truncate text-center text-[9px] font-bold leading-4 text-slate-300">
                      {achievement.meta}
                    </p>
                  ) : null}
                  <div className="mt-1 flex items-center justify-center gap-1.5">
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
    </div>
  );

  const renderDashboardHeroRow = () => (
    <div
      aria-label="Dashboard hero row"
      data-dashboard-orbiter-row="0"
      className="relative z-10 mx-auto w-full max-w-[1080px] overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(15,23,42,0.72)),radial-gradient(circle_at_18%_0%,rgba(34,211,238,0.14),transparent_34%),radial-gradient(circle_at_92%_18%,rgba(250,204,21,0.12),transparent_30%)] px-4 py-3 shadow-2xl shadow-black/20 backdrop-blur sm:rounded-[30px] sm:px-5 sm:py-4 lg:px-6"
    >
      <div className="grid gap-4 min-[760px]:grid-cols-[minmax(0,1fr)_minmax(240px,300px)] min-[760px]:items-start">
        <div className="min-w-0">
          <div className="text-[11px] font-black uppercase tracking-[0.24em] text-sky-400">
            Sound Fitness Command Center
          </div>

          <h1 className="mt-2 break-words text-3xl font-black uppercase tracking-tight sm:text-4xl">
            Welcome back, <span className="text-sky-400">{firstName}</span>
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-5 text-slate-300">
            Start training, check your progress, back up your workout data,
            and jump into the next part of your plan from one place.
          </p>

          <details className="group relative mt-3 max-w-full">
            <summary
              className={`inline-flex h-8 max-w-full cursor-pointer list-none items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[9px] font-black uppercase tracking-[0.08em] shadow-[0_0_22px_rgba(34,211,238,0.10)] transition hover:-translate-y-0.5 hover:border-cyan-100/42 hover:bg-cyan-300/12 [&::-webkit-details-marker]:hidden ${dashboardStatusPillTone}`}
            >
              <span
                aria-hidden="true"
                className="h-2 w-2 shrink-0 rounded-full bg-current shadow-[0_0_10px_currentColor]"
              />
              <span className="min-w-0 truncate">
                {dashboardConsistencyStage} / {dashboardStatusUrgency} /{" "}
                {masterJourneyCurrentFocus}
              </span>
              <span className="ml-1 grid h-4 w-4 shrink-0 place-items-center rounded-full border border-white/12 bg-slate-950/36 text-[8px] text-cyan-50 transition group-open:rotate-180">
                v
              </span>
            </summary>

            <div className="absolute left-0 top-full z-50 mt-2 w-[min(540px,calc(100vw-7rem))] rounded-2xl border border-cyan-100/18 bg-[#101927]/95 p-2.5 shadow-[0_18px_46px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-[8px] font-black uppercase tracking-[0.18em] text-cyan-100/72">
                    90 day training calendar
                  </div>
                  <div className="mt-0.5 truncate text-[10px] font-black uppercase tracking-[0.08em] text-white">
                    {dashboardConsistencyCalendarTrainingDays} trained /{" "}
                    {dashboardConsistencyCalendarSignalDays} logged
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2 text-[7px] font-black uppercase tracking-[0.1em] text-slate-400">
                  <span className="inline-flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_8px_rgba(52,211,153,0.72)]" />
                    Train
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-300 shadow-[0_0_8px_rgba(252,211,77,0.60)]" />
                    Log
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-600/80" />
                    Off
                  </span>
                </div>
              </div>

              <div
                aria-label="90 day training calendar month orbit"
                className="relative mt-2 h-[158px] overflow-hidden rounded-xl border border-white/8 bg-slate-950/28 px-8 py-2 [perspective:760px]"
              >
                <button
                  aria-label="Previous calendar month"
                  className="absolute left-1 top-1/2 z-30 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full border border-cyan-100/18 bg-slate-950/72 text-sm font-black text-cyan-100 shadow-[0_10px_24px_rgba(0,0,0,0.28)] transition hover:border-cyan-100/42 hover:bg-cyan-300/14"
                  onClick={() => rotateDashboardConsistencyMonth(-1)}
                  type="button"
                >
                  &lt;
                </button>
                <div className="absolute inset-x-8 inset-y-2 [transform-style:preserve-3d]">
                  {dashboardConsistencyCalendarMonths.map((month, index) => {
                    const orbitDistance =
                      getDashboardConsistencyMonthOrbitDistance(index);
                    const orbitAbsDistance = Math.abs(orbitDistance);
                    const isActive = orbitDistance === 0;
                    const orbitOpacity = isActive ? 1 : 0.66;
                    const orbitScale = isActive ? 1 : 0.78;
                    const orbitTranslateX = orbitDistance * 144;
                    const orbitTranslateZ = isActive ? 58 : -74;
                    const orbitRotateY = orbitDistance * -28;

                    return (
                      <button
                        aria-label={`Show ${month.label} training calendar`}
                        aria-pressed={isActive}
                        className={`absolute left-1/2 top-1/2 w-[168px] rounded-xl border px-2 py-1.5 text-left transition-[border-color,background-color,box-shadow] duration-300 ${
                          isActive
                            ? "border-cyan-200/70 bg-cyan-300/14 text-cyan-50 shadow-[0_18px_36px_rgba(0,0,0,0.34),0_0_24px_rgba(34,211,238,0.20),inset_0_1px_0_rgba(255,255,255,0.11)]"
                            : "border-white/8 bg-slate-950/50 text-slate-300 shadow-[0_12px_28px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.05)] hover:border-cyan-100/30 hover:bg-cyan-300/10"
                        }`}
                        key={`dashboard-consistency-month-${month.label}`}
                        onClick={() =>
                          setActiveDashboardConsistencyMonthIndex(index)
                        }
                        style={{
                          opacity: orbitOpacity,
                          transform: `translate(-50%, -50%) translateX(${orbitTranslateX}px) translateZ(${orbitTranslateZ}px) rotateY(${orbitRotateY}deg) scale(${orbitScale})`,
                          transition:
                            "transform 520ms cubic-bezier(0.2, 0.82, 0.2, 1), opacity 260ms ease, border-color 220ms ease, background-color 220ms ease, box-shadow 220ms ease",
                          zIndex: 20 - orbitAbsDistance,
                        }}
                        type="button"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-[8px] font-black uppercase tracking-[0.14em] text-cyan-100">
                            {month.label}
                          </span>
                          <span className="text-[7px] font-black uppercase tracking-[0.1em] text-slate-500">
                            {month.days.length}d
                          </span>
                        </div>
                        <div className="mt-1.5 grid grid-cols-7 gap-1 text-center">
                          {dashboardConsistencyCalendarWeekdays.map(
                            (weekday, weekdayIndex) => (
                              <span
                                className="text-[6px] font-black uppercase text-slate-500"
                                key={`${month.label}-weekday-${weekdayIndex}`}
                              >
                                {weekday}
                              </span>
                            ),
                          )}
                        </div>
                        <div className="mt-1 grid grid-cols-7 gap-x-1 gap-y-1">
                          {Array.from({ length: month.leadingBlankCount }).map(
                            (_, blankIndex) => (
                              <span
                                aria-hidden="true"
                                className="h-3"
                                key={`${month.label}-blank-${blankIndex}`}
                              />
                            ),
                          )}
                          {month.days.map((day) => {
                            const dayTone =
                              day.status === "trained"
                                ? "bg-emerald-300 shadow-[0_0_7px_rgba(52,211,153,0.80)]"
                                : day.status === "logged"
                                  ? "bg-amber-300 shadow-[0_0_7px_rgba(252,211,77,0.62)]"
                                  : day.status === "future"
                                    ? "bg-white/10"
                                    : "bg-slate-600/75";

                            return (
                              <span
                                aria-label={`${day.label}: ${
                                  day.status === "trained"
                                    ? "trained"
                                    : day.status === "logged"
                                      ? "logged"
                                      : day.status === "future"
                                        ? "upcoming"
                                        : "no training"
                                }`}
                                className="grid h-3 place-items-center"
                                key={day.dateKey}
                                title={`${day.label}: ${
                                  day.status === "trained"
                                    ? "trained"
                                    : day.status === "logged"
                                      ? "logged"
                                      : day.status === "future"
                                        ? "upcoming"
                                        : "no training"
                                }`}
                              >
                                <span
                                  className={`h-1.5 w-1.5 rounded-full transition ${
                                    day.isToday
                                      ? "ring-1 ring-cyan-100 ring-offset-1 ring-offset-[#101927]"
                                      : ""
                                  } ${dayTone}`}
                                />
                              </span>
                            );
                          })}
                        </div>
                      </button>
                    );
                  })}
                </div>
                <button
                  aria-label="Next calendar month"
                  className="absolute right-1 top-1/2 z-30 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full border border-cyan-100/18 bg-slate-950/72 text-sm font-black text-cyan-100 shadow-[0_10px_24px_rgba(0,0,0,0.28)] transition hover:border-cyan-100/42 hover:bg-cyan-300/14"
                  onClick={() => rotateDashboardConsistencyMonth(1)}
                  type="button"
                >
                  &gt;
                </button>
              </div>
            </div>
          </details>
        </div>

        <div className="grid gap-3 min-[760px]:w-[min(32vw,300px)] min-[760px]:justify-self-end">
          <div className="rounded-[24px] border border-white/10 bg-slate-950/36 p-3 shadow-inner shadow-white/5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <Image
                  alt=""
                  className="h-10 w-10 shrink-0 rounded-full border border-cyan-100/28 bg-slate-950 object-contain p-1 shadow-[0_0_18px_rgba(34,211,238,0.16)]"
                  height={40}
                  src="/sound-fitness-logo.png"
                  width={40}
                />
                <div className="min-w-0">
                  <div className="text-[9px] font-black uppercase tracking-[0.18em] text-cyan-100/72">
                    Active Profile
                  </div>
                  <div className="mt-0.5 truncate text-sm font-black text-white">
                    {firstName}
                  </div>
                  <div className="mt-0.5 truncate text-[10px] font-semibold text-slate-400">
                    {dashboardConsistencyStage} stage
                  </div>
                </div>
              </div>
              <div className="shrink-0 rounded-full border border-amber-300/25 bg-amber-300/10 px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.12em] text-amber-100">
                {dashboardProfileHubCompletion}% ready
              </div>
            </div>

            <div className="mt-3 grid gap-2 border-t border-white/10 pt-2.5">
              <Link
                className="group block min-w-0 text-left transition hover:translate-x-0.5"
                href={ROUTES.dashboard.goals}
              >
                <span className="flex min-w-0 items-center justify-between gap-2">
                  <span className="truncate text-[9px] font-black uppercase tracking-[0.15em] text-slate-500">
                    Goal Focus
                  </span>
                  <span className="shrink-0 text-[9px] font-black uppercase tracking-[0.12em] text-amber-100">
                    {dashboardFoundationProgress.goalsCompletion}% goals
                  </span>
                </span>
                <span className="mt-1 block truncate text-sm font-black text-white group-hover:text-cyan-100">
                  {dashboardActiveProfileGoalFocus}
                </span>
              </Link>

              <Link
                className="group block min-w-0 border-t border-white/10 pt-2 text-left transition hover:translate-x-0.5"
                href={dashboardActiveProfileNextHref}
              >
                <span className="flex min-w-0 items-center justify-between gap-2">
                  <span className="truncate text-[9px] font-black uppercase tracking-[0.15em] text-slate-500">
                    Position
                  </span>
                  <span className="shrink-0 text-[9px] font-black uppercase tracking-[0.12em] text-cyan-100">
                    {dashboardActiveProfileNextStep}
                  </span>
                </span>
                <span className="mt-1 block truncate text-sm font-black text-white group-hover:text-cyan-100">
                  {masterJourneyCurrentFocus}
                </span>
                <span className="mt-0.5 block truncate text-[10px] font-semibold text-slate-400">
                  {dashboardActiveProfilePlanDetail}
                </span>
              </Link>
            </div>

          </div>
        </div>
      </div>

      {renderDashboardHeroAchievementOrbit()}
    </div>
  );

  const renderDashboardDailyToolsRow = () => {
    const dailyToolCount = 2;
    const getDailyToolOrbitDistance = (index: number) =>
      getDashboardOrbitDistance(index, activeDailyToolIndex, dailyToolCount);
    const rotateDailyToolOrbit = (direction: DashboardOrbitDirection) => {
      setActiveDailyToolIndex((currentIndex) =>
        direction === "left"
          ? (currentIndex - 1 + dailyToolCount) % dailyToolCount
          : (currentIndex + 1) % dailyToolCount,
      );
    };
    const manualToolDistance = getDailyToolOrbitDistance(0);
    const videoToolDistance = getDailyToolOrbitDistance(1);
    const getDailyToolOrbitStyle = (distance: number): CSSProperties => {
      const clampedDistance = Math.max(-1, Math.min(1, distance));
      const absDistance = Math.abs(clampedDistance);
      const direction = Math.sign(clampedDistance);

      return {
        opacity: absDistance === 0 ? 1 : 0.56,
        transform: `translate(-50%, -50%) translateX(${
          direction * 235
        }px) translateZ(${absDistance === 0 ? 84 : 8}px) rotateY(${
          direction * -18
        }deg) scale(${absDistance === 0 ? 1 : 0.78})`,
        transition:
          "transform 560ms cubic-bezier(0.2, 0.82, 0.2, 1), opacity 260ms ease, border-color 220ms ease, background-color 220ms ease, box-shadow 220ms ease",
        zIndex: absDistance === 0 ? 30 : 18,
      };
    };

    return (
    <div
      aria-label="Daily Tools row"
      data-dashboard-orbiter-row="1"
      className={`relative flex min-h-0 items-start justify-center pl-6 pr-20 pt-2 transition-opacity duration-300 sm:pl-10 sm:pr-24 sm:pt-3 lg:pl-12 lg:pr-28 lg:pt-4 ${
        clampedDashboardOrbiterRow === 1
          ? "pointer-events-auto opacity-100"
          : "pointer-events-none opacity-40"
      }`}
    >
      <div className="pointer-events-none absolute left-6 top-6 z-20 min-w-0 pr-24 sm:left-10 lg:left-12">
        <div className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-300">
          Daily Tools
        </div>
        <p className="mt-1 max-w-[26rem] truncate text-[11px] font-semibold text-slate-400">
          Quick logging, form checks, imports, library attach, and recent saves.
        </p>
      </div>
      <div
        data-dashboard-orbiter-local-scroll="true"
        className="relative h-full w-full max-w-[1180px] overflow-visible pb-2 pr-1 [perspective:1100px]"
      >
        <section
          aria-label="Daily Tools horizontal 3D scroller"
          className="relative flex min-h-full items-center justify-center pb-4"
        >
          <button
            aria-label="Previous daily tool"
            className="absolute left-1 top-1/2 z-40 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-cyan-200/24 bg-slate-950/78 text-lg font-black text-cyan-100 shadow-[0_0_22px_rgba(34,211,238,0.14)] backdrop-blur transition hover:-translate-x-0.5 hover:border-amber-200/45 hover:bg-amber-300/10 hover:text-amber-100 active:scale-95"
            onClick={() => rotateDailyToolOrbit("left")}
            type="button"
          >
            &lt;
          </button>
          <button
            aria-label="Next daily tool"
            className="absolute right-1 top-1/2 z-40 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-cyan-200/24 bg-slate-950/78 text-lg font-black text-cyan-100 shadow-[0_0_22px_rgba(34,211,238,0.14)] backdrop-blur transition hover:translate-x-0.5 hover:border-amber-200/45 hover:bg-amber-300/10 hover:text-amber-100 active:scale-95"
            onClick={() => rotateDailyToolOrbit("right")}
            type="button"
          >
            &gt;
          </button>
          <div className="relative h-[320px] w-full max-w-[920px] [transform-style:preserve-3d]">
            <article
              className={`absolute left-1/2 top-1/2 flex overflow-hidden border border-cyan-300/24 bg-[radial-gradient(circle_at_16%_0%,rgba(34,211,238,0.16),transparent_34%),radial-gradient(circle_at_92%_12%,rgba(250,204,21,0.12),transparent_30%),rgba(15,23,42,0.72)] shadow-2xl shadow-black/25 backdrop-blur transition-[height,width,border-radius,box-shadow] duration-300 ${
                manualStatsAdderCollapsed
                  ? "h-[220px] w-[min(86vw,24rem)] flex-col rounded-[28px] p-5 sm:h-[244px] sm:w-[24rem]"
                  : "h-[300px] w-[min(86vw,26rem)] flex-col rounded-[28px] p-4 sm:rounded-[34px] sm:p-5"
              }`}
              style={getDailyToolOrbitStyle(manualToolDistance)}
            >
            {manualStatsAdderCollapsed ? (
              <button
                type="button"
                aria-controls="dashboard-manual-stats-adder-body"
                aria-expanded="false"
                onClick={() => setManualStatsAdderCollapsed(false)}
                className="group relative z-10 flex h-full w-full flex-col items-stretch justify-between text-left"
              >
                <span className="flex items-start justify-between gap-3">
                  <span
                    className="grid h-16 w-16 shrink-0 place-items-center rounded-[24px] border border-cyan-100/35 bg-cyan-300/14 text-2xl font-black text-cyan-50 shadow-[0_0_22px_rgba(34,211,238,0.16)]"
                    aria-hidden="true"
                  >
                    +
                  </span>
                  <span className="rounded-full border border-cyan-200/28 bg-cyan-300/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-cyan-100">
                    Daily Tool
                  </span>
                </span>

                <span className="block min-w-0">
                  <span className="block text-2xl font-black tracking-tight text-white">
                    Manual Stats Adder
                  </span>
                  <span className="mt-2 block max-w-[18rem] text-sm font-semibold leading-5 text-slate-300">
                    Quick-log a stat or attach it to an Exercise Library card.
                  </span>
                </span>

                <span className="grid grid-cols-3 gap-2">
                  {[
                    { label: "Sets", value: manualStatsDraft.sets || "3" },
                    { label: "Reps", value: manualStatsDraft.reps || "10" },
                    {
                      label: "Recent",
                      value: Math.min(manualStatsLogs.length, 6).toString(),
                    },
                  ].map((item) => (
                    <span
                      key={item.label}
                      className="min-w-0 rounded-2xl border border-white/10 bg-slate-950/42 px-2.5 py-2"
                    >
                      <span className="block truncate text-[8px] font-black uppercase tracking-[0.12em] text-slate-500">
                        {item.label}
                      </span>
                      <span className="mt-0.5 block truncate text-sm font-black uppercase text-white">
                        {item.value}
                      </span>
                    </span>
                  ))}
                </span>
              </button>
            ) : (
              <>
            <span className="pointer-events-none absolute inset-x-6 top-0 h-px rounded-full bg-gradient-to-r from-transparent via-cyan-200/70 to-amber-200/55" />
            <div className="relative flex min-h-0 flex-1 flex-col">
              <div className="grid gap-2">
                <div className="min-w-0 text-left">
                  <h2 className="text-2xl font-black tracking-tight sm:text-3xl">
                    Manual Stats Adder
                  </h2>
                  <p className="mt-1 max-w-[25rem] text-xs leading-5 text-slate-300">
                    Quick-log a generic stat or attach it to a referenced Exercise Library card.
                  </p>
                </div>

                <div className="flex max-w-full flex-wrap items-center justify-start gap-1.5">
                  <span className="flex w-full flex-wrap items-center justify-between gap-1.5">
                    <span className="text-[9px] font-black uppercase tracking-[0.18em] text-emerald-300">
                      Import Tools
                    </span>
                    <button
                      type="button"
                      aria-controls="dashboard-manual-stats-adder-body"
                      aria-expanded={!manualStatsAdderCollapsed}
                      onClick={() =>
                        setManualStatsAdderCollapsed((collapsed) => !collapsed)
                      }
                      className="inline-flex min-h-[28px] items-center justify-center gap-1 rounded-full border border-cyan-200/24 bg-cyan-300/10 px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.1em] text-cyan-100 transition hover:-translate-y-0.5 hover:border-cyan-100/48 hover:bg-cyan-300/16 hover:text-cyan-50 active:scale-[0.98]"
                    >
                      {manualStatsAdderCollapsed ? "Expand" : "Collapse"}
                      <span aria-hidden="true">
                        {manualStatsAdderCollapsed ? "v" : "^"}
                      </span>
                    </button>
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
                        className={`inline-flex min-h-[28px] items-center justify-center rounded-full border px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.1em] transition hover:-translate-y-0.5 active:scale-[0.98] ${
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
                    className="inline-flex min-h-[28px] items-center justify-center rounded-full border border-amber-200/28 bg-amber-300/10 px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.1em] text-amber-100 transition hover:-translate-y-0.5 hover:border-amber-100/50 hover:bg-amber-300/16 hover:text-amber-50 active:scale-[0.98]"
                  >
                    Wearables
                  </Link>
                </div>
              </div>

              <div
                data-dashboard-orbiter-local-scroll="true"
                className="mt-3 min-h-0 flex-1 overflow-y-auto pr-1 scroll-smooth [scrollbar-color:rgba(34,211,238,0.38)_rgba(15,23,42,0.58)] [scrollbar-width:thin] [touch-action:pan-y] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-cyan-300/38 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-slate-950/58"
              >
              {manualStatsAdderCollapsed ? (
                <div
                  id="dashboard-manual-stats-adder-body"
                  className="grid gap-2 rounded-[22px] border border-cyan-200/14 bg-slate-950/28 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] sm:grid-cols-2"
                >
                  {[
                    { label: "Sets", value: manualStatsDraft.sets || "3" },
                    { label: "Reps", value: manualStatsDraft.reps || "10" },
                    {
                      label: "Load",
                      value: formatManualLoadDisplay(manualStatsDraft.load),
                    },
                    {
                      label: "Recent",
                      value: `${Math.min(manualStatsLogs.length, 6)} saved`,
                    },
                  ].map((item) => (
                    <span
                      key={item.label}
                      className="min-w-0 rounded-2xl border border-white/10 bg-slate-950/46 px-3 py-2 text-left"
                    >
                      <span className="block truncate text-[8px] font-black uppercase tracking-[0.13em] text-slate-500">
                        {item.label}
                      </span>
                      <span className="mt-1 block truncate text-sm font-black uppercase text-cyan-50">
                        {item.value}
                      </span>
                    </span>
                  ))}
                </div>
              ) : (
                <div id="dashboard-manual-stats-adder-body">
                  <div className="overflow-hidden rounded-[22px] border border-cyan-200/14 bg-slate-950/28 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <div
                    aria-label="Manual stats dashboard favorite selector"
                    className="mx-auto flex min-w-0 items-center gap-1.5"
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
                        {activeManualFavoriteCountLabel}
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

                <div className="mx-auto mt-1.5 w-full max-w-full">
                  {activeManualFavoriteDashboard.id === "workout" ? (
                    <ManualExerciseLibraryPreview
                      activeCategoryId={activeManualExerciseCategoryId}
                      categories={manualExerciseLibraryCategories}
                      manualStatsDraft={manualStatsDraft}
                      onCategorySelect={setActiveManualExerciseCategoryId}
                      onCategoryShift={rotateManualExerciseCategory}
                      onExerciseSelect={selectExerciseReference}
                      onManualStatsDraftChange={updateManualStatsDraft}
                      onSaveManualStats={saveManualStatsLog}
                      selectedExerciseCue={selectedExercise?.cue}
                      selectedExerciseIds={selectedManualExerciseReferenceIds}
                    />
                  ) : (
                    <div className="mx-auto flex w-fit max-w-full gap-2 overflow-x-auto overscroll-x-contain pb-2 scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                      {activeDashboardLibraryFavoriteIds.length ? (
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
                  )}
                </div>
              </div>

            <div className="mt-3">
              <div className="mb-2 flex flex-col items-center justify-center gap-2 text-center sm:flex-row">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                  Recently saved stats
                </p>
                <span className="rounded-full border border-cyan-200/18 bg-cyan-300/8 px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-cyan-100">
                  Last {Math.min(manualStatsLogs.length, 6) || 0}
                </span>
              </div>

              {manualStatsLogs.length ? (
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {manualStatsLogs.slice(0, 6).map((entry) => {
                    const reference =
                      entry.references?.find(
                        (item) => item.referenceType === "exercise",
                      ) || entry.references?.[0];
                    const statTitle =
                      entry.sessionLabel?.trim() ||
                      reference?.referenceTitle ||
                      "Manual stat";
                    const statMeta = reference
                      ? `${reference.metadata.movementPattern || "Movement"} / ${
                          reference.metadata.equipment || "Equipment"
                        }`
                      : "Generic manual entry";
                    const statImage = reference?.metadata.image;
                    const statDate = formatCompactDateTime(
                      entry.loggedAt || entry.dateTime,
                    );
                    const statValues = [
                      { label: "Sets", value: entry.sets?.trim() || "0" },
                      { label: "Reps", value: entry.reps?.trim() || "0" },
                      {
                        label: "Load",
                        value: formatManualLoadDisplay(entry.load),
                      },
                      {
                        label: "RPE",
                        value: formatManualRpeDisplay(entry.rpe),
                      },
                    ];

                    return (
                      <article
                        key={entry.id}
                        className="relative isolate min-h-[132px] overflow-hidden rounded-2xl border border-white/10 bg-slate-950/42 p-3 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
                      >
                        <span className="flex items-start gap-3">
                          {statImage ? (
                            <span
                              aria-hidden="true"
                              className="h-14 w-14 shrink-0 rounded-xl border border-cyan-100/16 bg-cover bg-center"
                              style={{
                                backgroundImage: `linear-gradient(180deg, rgba(2,6,23,0.08), rgba(2,6,23,0.32)), url(${statImage})`,
                              }}
                            />
                          ) : (
                            <span
                              aria-hidden="true"
                              className="grid h-14 w-14 shrink-0 place-items-center rounded-xl border border-cyan-100/16 bg-cyan-300/10 text-[10px] font-black uppercase tracking-[0.12em] text-cyan-100"
                            >
                              Stat
                            </span>
                          )}

                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-black text-white">
                              {statTitle}
                            </span>
                            <span className="mt-1 block truncate text-[9px] font-black uppercase tracking-[0.11em] text-cyan-100/78">
                              {statMeta}
                            </span>
                            <span className="mt-1 block truncate text-[10px] font-semibold text-slate-400">
                              {statDate}
                            </span>
                          </span>
                        </span>

                        <span className="mt-3 grid grid-cols-4 gap-1.5">
                          {statValues.map((stat) => (
                            <span
                              key={stat.label}
                              className="min-w-0 rounded-xl border border-white/10 bg-slate-950/46 px-2 py-1"
                            >
                              <span className="block truncate text-[7px] font-black uppercase tracking-[0.1em] text-slate-500">
                                {stat.label}
                              </span>
                              <span className="mt-0.5 block truncate text-[10px] font-black uppercase text-cyan-50">
                                {stat.value}
                              </span>
                            </span>
                          ))}
                        </span>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="flex min-h-[74px] w-full items-center justify-center rounded-2xl border border-dashed border-cyan-200/22 bg-slate-950/36 px-4 py-3 text-center">
                  <p className="text-xs font-semibold text-slate-400">
                    Saved manual stats will appear here after you hit Save Stat.
                  </p>
                </div>
              )}
            </div>
                </div>
              )}
              </div>
          </div>
              </>
            )}
          </article>
          <Link
            aria-label="Open Video Review form checks"
            className="group absolute left-1/2 top-1/2 flex h-[220px] w-[min(82vw,21rem)] flex-col justify-between overflow-hidden rounded-[28px] border border-sky-300/24 bg-[radial-gradient(circle_at_18%_0%,rgba(56,189,248,0.20),transparent_34%),radial-gradient(circle_at_88%_16%,rgba(250,204,21,0.14),transparent_30%),rgba(15,23,42,0.72)] p-5 text-left shadow-2xl shadow-black/25 backdrop-blur transition hover:border-sky-200/48 hover:bg-sky-400/14 sm:h-[244px] sm:w-[22rem]"
            href={ROUTES.dashboard.videoReview}
            style={getDailyToolOrbitStyle(videoToolDistance)}
          >
            <span className="pointer-events-none absolute inset-x-6 top-0 h-px rounded-full bg-gradient-to-r from-transparent via-sky-200/70 to-amber-200/55" />
            <span className="flex items-start justify-between gap-3">
              <span
                className="grid h-16 w-16 shrink-0 place-items-center rounded-[24px] border border-sky-100/35 bg-sky-300/14 text-sky-50 shadow-[0_0_22px_rgba(56,189,248,0.18)]"
                aria-hidden="true"
              >
                <DashboardTabIcon
                  className="h-8 w-8 drop-shadow-[0_0_12px_rgba(255,255,255,0.24)]"
                  label="Video Review"
                  name="form"
                />
              </span>
              <span className="rounded-full border border-sky-200/28 bg-sky-300/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-sky-100">
                Form Check
              </span>
            </span>

            <span className="block min-w-0">
              <span className="block text-2xl font-black tracking-tight text-white">
                Video Review
              </span>
              <span className="mt-2 block max-w-[18rem] text-sm font-semibold leading-5 text-slate-300">
                Submit a lift clip, link it to a workout, and queue coach feedback.
              </span>
            </span>

            <span className="grid grid-cols-3 gap-2">
              {[
                { label: "Mode", value: "Check" },
                { label: "Queue", value: "2" },
                { label: "Next", value: "Submit" },
              ].map((item) => (
                <span
                  key={item.label}
                  className="min-w-0 rounded-2xl border border-white/10 bg-slate-950/42 px-2.5 py-2"
                >
                  <span className="block truncate text-[8px] font-black uppercase tracking-[0.12em] text-slate-500">
                    {item.label}
                  </span>
                  <span className="mt-0.5 block truncate text-sm font-black uppercase text-white">
                    {item.value}
                  </span>
                </span>
              ))}
            </span>
          </Link>
          </div>
        </section>
      </div>
    </div>
    );
  };

  const renderDashboardWeeklyRecapRow = () => (
    <div
      aria-label="Weekly Recap row"
      data-dashboard-orbiter-row="2"
      className={`relative min-h-0 w-full overflow-hidden px-10 pt-20 transition-opacity duration-300 sm:px-12 sm:pt-24 lg:pt-28 ${
        clampedDashboardOrbiterRow === 2
          ? "pointer-events-auto opacity-100"
          : "pointer-events-none opacity-40"
      }`}
    >
      <div className="pointer-events-none absolute left-6 top-6 z-20 min-w-0 pr-24 sm:left-10 lg:left-12">
        <div className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-200">
          Weekly Recap
        </div>
        <p className="mt-1 max-w-[30rem] truncate text-[11px] font-semibold text-slate-400">
          Last 7 days: training volume, nutrition consistency, and readiness.
        </p>
      </div>
      <button
        aria-label="Previous weekly recap card"
        className="absolute left-2 top-[44%] z-40 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-cyan-200/24 bg-slate-950/60 text-2xl font-black text-cyan-100 shadow-[0_0_30px_rgba(34,211,238,0.16)] backdrop-blur transition hover:-translate-x-0.5 hover:border-amber-200/45 hover:bg-amber-300/10 hover:text-amber-100 active:scale-95 sm:left-4 sm:h-14 sm:w-14 sm:text-3xl lg:left-6 xl:left-8"
        onClick={() => rotateWeeklyRecap("left")}
        type="button"
      >
        &lt;
      </button>
      <button
        aria-label="Next weekly recap card"
        className="absolute right-[5.75rem] top-[44%] z-40 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-cyan-200/24 bg-slate-950/60 text-2xl font-black text-cyan-100 shadow-[0_0_30px_rgba(34,211,238,0.16)] backdrop-blur transition hover:translate-x-0.5 hover:border-amber-200/45 hover:bg-amber-300/10 hover:text-amber-100 active:scale-95 sm:right-[6.25rem] sm:h-14 sm:w-14 sm:text-3xl lg:right-[6.75rem] xl:right-[7.25rem]"
        onClick={() => rotateWeeklyRecap("right")}
        type="button"
      >
        &gt;
      </button>

      <div className="sr-only">
        Weekly Recap. Last 7 days. Training volume, nutrition consistency, and
        recovery readiness.
      </div>

      <div
        aria-label="Weekly recap orbit selector"
        className="relative z-10 mx-auto h-[410px] w-full max-w-[1120px] cursor-grab select-none overflow-hidden outline-none [perspective:1500px] [touch-action:pan-y] active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-cyan-200/45 sm:h-[460px]"
        onClickCapture={(event) => {
          if (weeklyRecapPointerMovedRef.current) {
            event.preventDefault();
            event.stopPropagation();
            weeklyRecapPointerMovedRef.current = false;
          }
        }}
        onKeyDown={(event) => handleDashboardOrbitKeyDown(event, rotateWeeklyRecap)}
        onPointerCancel={(event) => {
          weeklyRecapPointerStartRef.current = null;
          if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
            event.currentTarget.releasePointerCapture?.(event.pointerId);
          }
        }}
        onPointerDown={(event) =>
          handleDashboardOrbitPointerDown(
            event,
            weeklyRecapPointerStartRef,
            weeklyRecapPointerMovedRef,
          )
        }
        onPointerMove={(event) =>
          handleDashboardOrbitPointerMove(
            event,
            weeklyRecapPointerStartRef,
            weeklyRecapPointerMovedRef,
            rotateWeeklyRecap,
          )
        }
        onPointerUp={(event) =>
          handleDashboardOrbitPointerUp(
            event,
            weeklyRecapPointerStartRef,
            weeklyRecapPointerMovedRef,
            rotateWeeklyRecap,
            setActiveWeeklyRecapIndex,
          )
        }
        onWheel={(event) => handleDashboardOrbitWheel(event, rotateWeeklyRecap)}
        onWheelCapture={(event) =>
          handleDashboardOrbitWheel(event, rotateWeeklyRecap)
        }
        tabIndex={0}
      >
        {dashboardWeeklyRecapCards.map((card, index) => {
          const distance = getWeeklyRecapOrbitDistance(index);
          const absDistance = Math.abs(distance);
          const direction = Math.sign(distance);
          const orbitSlots = [
            { blur: 0, opacity: 1, rotateY: 0, scale: 1, x: 0, y: -8, zIndex: 42 },
            { blur: 0, opacity: 0.76, rotateY: -16, scale: 0.82, x: 238, y: 20, zIndex: 30 },
            { blur: 0.9, opacity: 0.38, rotateY: -30, scale: 0.64, x: 318, y: 58, zIndex: 16 },
          ];
          const slot = orbitSlots[Math.min(absDistance, orbitSlots.length - 1)];
          const tone = dashboardToneStyles[card.tone];
          const isActive = distance === 0;
          const isRecoveryLineGraph = card.title === "Recovery Readiness";
          const isNutritionLoadingBars =
            card.title === "Nutrition Consistency";
          const lineGraphPoints = card.rows.map((row, rowIndex) => {
            const percent = getWeeklyRecapBarPercent(card, row);
            const x =
              18 +
              (card.rows.length > 1
                ? (rowIndex / (card.rows.length - 1)) * 244
                : 122);
            const y = 104 - (percent / 100) * 78;

            return { percent, row, x, y };
          });
          const lineGraphPath = lineGraphPoints
            .map((point, pointIndex) =>
              `${pointIndex === 0 ? "M" : "L"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`,
            )
            .join(" ");
          const lineGraphAreaPath = lineGraphPoints.length
            ? `M ${lineGraphPoints[0].x.toFixed(1)} 108 ${lineGraphPoints
                .map((point) => `L ${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
                .join(" ")} L ${lineGraphPoints[
                lineGraphPoints.length - 1
              ].x.toFixed(1)} 108 Z`
            : "";

          return (
            <article
              aria-label={
                isActive ? `${card.title} selected` : `Select ${card.title}`
              }
              aria-pressed={isActive}
              className={`dashboard-orbit-card group absolute left-1/2 top-1/2 w-[286px] overflow-hidden rounded-[28px] border p-4 text-left shadow-2xl transition-[border-color,background-color,box-shadow] duration-300 sm:w-[360px] ${
                isActive
                  ? "dashboard-orbit-card--active border-cyan-200/45 bg-slate-950/86 shadow-cyan-950/35"
                  : "border-white/10 bg-slate-950/64 shadow-black/30 hover:border-cyan-200/28 hover:bg-slate-950/78"
              }`}
              data-dashboard-orbit-card-index={index}
              key={card.title}
              onClick={() => {
                if (weeklyRecapPointerMovedRef.current) {
                  weeklyRecapPointerMovedRef.current = false;
                  return;
                }

                setActiveWeeklyRecapIndex(index);
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
                <div className="min-w-0">
                  <div className="text-[9px] font-black uppercase tracking-[0.18em] text-cyan-100/72">
                    Weekly Recap
                  </div>
                  <h3 className="mt-1 text-xl font-black tracking-tight text-white">
                    {card.title}
                  </h3>
                </div>
                <span
                  className={`shrink-0 rounded-2xl border px-3 py-2 text-lg font-black ${
                    isActive
                      ? "border-cyan-200/35 bg-cyan-300/12 text-cyan-50"
                      : "border-white/10 bg-white/[0.04] text-slate-300"
                  }`}
                >
                  {card.metric}
                </span>
              </div>
              <p className="relative z-10 mt-2 text-xs font-semibold leading-5 text-slate-400">
                {card.description}
              </p>
              <div
                aria-label={`${card.title} ${
                  isRecoveryLineGraph
                    ? "horizontal line graph"
                    : isNutritionLoadingBars
                      ? "loading bars"
                    : "vertical bar graph"
                }`}
                className="relative z-10 mt-4 rounded-3xl border border-white/10 bg-slate-950/34 px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
              >
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="text-[8px] font-black uppercase tracking-[0.16em] text-slate-500">
                    {isRecoveryLineGraph
                      ? "7 day trend"
                      : isNutritionLoadingBars
                        ? "fuel loading bars"
                        : "7 day chart"}
                  </span>
                  <span className={`h-1.5 w-12 rounded-full ${tone.line}`} />
                </div>
                {isRecoveryLineGraph ? (
                  <div className="relative h-[148px] overflow-hidden rounded-[22px] border border-white/8 bg-slate-950/42 px-1 pb-5 pt-1">
                    <svg
                      aria-label="Recovery readiness trend line"
                      className="h-full w-full overflow-visible"
                      role="img"
                      viewBox="0 0 280 122"
                    >
                      <defs>
                        <linearGradient
                          id={`weekly-recap-line-${index}`}
                          x1="0"
                          x2="1"
                          y1="0"
                          y2="0"
                        >
                          <stop offset="0%" stopColor="rgb(34, 211, 238)" />
                          <stop offset="55%" stopColor="rgb(250, 204, 21)" />
                          <stop offset="100%" stopColor="rgb(52, 211, 153)" />
                        </linearGradient>
                        <linearGradient
                          id={`weekly-recap-line-fill-${index}`}
                          x1="0"
                          x2="0"
                          y1="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor="rgba(34, 211, 238, 0.26)"
                          />
                          <stop
                            offset="100%"
                            stopColor="rgba(15, 23, 42, 0)"
                          />
                        </linearGradient>
                      </defs>
                      {[28, 52, 76, 100].map((lineY) => (
                        <line
                          key={`${card.title}-grid-${lineY}`}
                          stroke="rgba(148, 163, 184, 0.13)"
                          strokeDasharray="4 7"
                          strokeWidth="1"
                          x1="14"
                          x2="266"
                          y1={lineY}
                          y2={lineY}
                        />
                      ))}
                      <path
                        d={lineGraphAreaPath}
                        fill={`url(#weekly-recap-line-fill-${index})`}
                      />
                      <path
                        d={lineGraphPath}
                        fill="none"
                        stroke={`url(#weekly-recap-line-${index})`}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="4"
                      />
                      {lineGraphPoints.map((point) => (
                        <g key={`${card.title}-${point.row.label}-point`}>
                          <circle
                            cx={point.x}
                            cy={point.y}
                            fill="rgba(15,23,42,0.92)"
                            r="6"
                            stroke="rgba(255,255,255,0.30)"
                            strokeWidth="1.4"
                          />
                          <circle
                            cx={point.x}
                            cy={point.y}
                            fill={
                              point.percent >= 80
                                ? "rgb(52,211,153)"
                                : point.percent >= 70
                                  ? "rgb(34,211,238)"
                                  : "rgb(250,204,21)"
                            }
                            r="3.4"
                          />
                        </g>
                      ))}
                    </svg>
                    <div className="pointer-events-none absolute inset-x-3 top-2 flex justify-between">
                      {lineGraphPoints.map((point) => (
                        <span
                          className="text-[8px] font-black text-white"
                          key={`${card.title}-${point.row.label}-value`}
                        >
                          {point.row.value}
                        </span>
                      ))}
                    </div>
                    <div className="absolute inset-x-3 bottom-2 flex justify-between">
                      {card.rows.map((row) => (
                        <span
                          className="text-[8px] font-black uppercase tracking-[0.08em] text-cyan-100"
                          key={`${card.title}-${row.label}-label`}
                        >
                          {row.label}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : isNutritionLoadingBars ? (
                  <div className="space-y-3">
                    {card.rows.map((row) => {
                      const barPercent = getWeeklyRecapBarPercent(card, row);
                      const isStrong = barPercent >= 80;
                      const isSteady = barPercent >= 50;
                      const barTone = isStrong
                        ? "from-emerald-300 via-cyan-200 to-cyan-100 shadow-[0_0_18px_rgba(52,211,153,0.28)]"
                        : isSteady
                          ? "from-cyan-300 via-sky-300 to-cyan-100 shadow-[0_0_16px_rgba(34,211,238,0.22)]"
                          : "from-amber-300 via-orange-300 to-cyan-100 shadow-[0_0_16px_rgba(251,191,36,0.26)]";

                      return (
                        <div
                          className="rounded-2xl border border-white/8 bg-slate-950/44 px-3 py-2.5"
                          key={`${card.title}-${row.label}-loading`}
                          title={`${row.label}: ${row.value} (${row.detail})`}
                        >
                          <div className="mb-1.5 flex items-center justify-between gap-3">
                            <span className="truncate text-[9px] font-black uppercase tracking-[0.12em] text-cyan-100">
                              {row.label}
                            </span>
                            <span className="shrink-0 text-sm font-black text-white">
                              {row.value}
                            </span>
                          </div>
                          <div className="relative h-3 overflow-hidden rounded-full border border-white/10 bg-slate-950/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                            <span
                              aria-hidden="true"
                              className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r ${barTone}`}
                              style={{ width: `${barPercent}%` }}
                            />
                            <span
                              aria-hidden="true"
                              className="absolute inset-y-0 left-0 w-full bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.18),transparent)] opacity-40"
                            />
                          </div>
                          <div className="mt-1.5 flex items-center justify-between gap-2 text-[8px] font-bold text-slate-500">
                            <span>0%</span>
                            <span className="truncate text-right">
                              {row.detail}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex h-[148px] items-end justify-between gap-2">
                    {card.rows.map((row) => {
                      const barPercent = getWeeklyRecapBarPercent(card, row);
                      const isStrong = barPercent >= 80;
                      const isSteady = barPercent >= 50;
                      const barTone = isStrong
                        ? "from-emerald-300 via-cyan-200 to-cyan-100 shadow-[0_0_18px_rgba(52,211,153,0.28)]"
                        : isSteady
                          ? "from-cyan-300 via-sky-300 to-cyan-100 shadow-[0_0_16px_rgba(34,211,238,0.22)]"
                          : "from-amber-300 via-orange-300 to-cyan-100 shadow-[0_0_16px_rgba(251,191,36,0.26)]";

                      return (
                        <div
                          className="flex min-w-0 flex-1 flex-col items-center justify-end"
                          key={`${card.title}-${row.label}`}
                          title={`${row.label}: ${row.value} (${row.detail})`}
                        >
                          <span className="mb-1 max-w-full truncate text-[8px] font-black text-white">
                            {row.value}
                          </span>
                          <span className="relative flex h-[96px] w-full max-w-8 items-end justify-center overflow-hidden rounded-full border border-white/10 bg-slate-950/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                            <span
                              aria-hidden="true"
                              className="absolute inset-x-1/2 top-2 h-[78px] w-px -translate-x-1/2 bg-white/8"
                            />
                            <span
                              aria-hidden="true"
                              className={`relative z-10 w-full rounded-full bg-gradient-to-t ${barTone}`}
                              style={{ height: `${barPercent}%` }}
                            />
                          </span>
                          <span className="mt-1 max-w-full truncate text-[8px] font-black uppercase tracking-[0.08em] text-cyan-100">
                            {row.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div className="mt-2 flex items-center justify-between gap-2 text-[8px] font-bold text-slate-500">
                  <span className="truncate">{card.rows[0]?.detail}</span>
                  <span className="truncate text-right">
                    {card.rows[card.rows.length - 1]?.detail}
                  </span>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );

  const renderDashboardCalendarRow = () => (
    <div
      aria-label="Calendar row"
      data-dashboard-orbiter-row="4"
      className={`flex min-h-0 items-start justify-center pl-6 pr-20 pt-2 transition-opacity duration-300 sm:pl-10 sm:pr-24 sm:pt-3 lg:pl-12 lg:pr-28 lg:pt-4 ${
        clampedDashboardOrbiterRow === 4
          ? "pointer-events-auto opacity-100"
          : "pointer-events-none opacity-40"
      }`}
    >
      <div
        data-dashboard-orbiter-local-scroll="true"
        className="h-full w-full max-w-[1180px] overflow-y-auto overscroll-contain pr-1 scroll-smooth [scrollbar-color:rgba(34,211,238,0.36)_rgba(15,23,42,0.56)] [scrollbar-width:thin] [touch-action:pan-y] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-cyan-300/38 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-slate-950/58"
      >
        <section className="pb-4">
          <div className="mx-auto w-full max-w-[1120px]">
            <DashboardCalendar items={dashboardCalendarItems} />
          </div>
        </section>
      </div>
    </div>
  );

  const renderDashboardMySoundRow = () => (
    <div
      aria-label="My Sound row"
      data-dashboard-orbiter-row="5"
      className={`relative min-h-0 w-full overflow-hidden px-10 pt-20 transition-opacity duration-300 sm:px-12 sm:pt-24 lg:pt-28 ${
        clampedDashboardOrbiterRow === 5
          ? "pointer-events-auto opacity-100"
          : "pointer-events-none opacity-40"
      }`}
    >
      <div className="pointer-events-none absolute left-6 top-6 z-20 min-w-0 pr-24 sm:left-10 lg:left-12">
        <div className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-200">
          My Sound
        </div>
        <p className="mt-1 max-w-[34rem] truncate text-[11px] font-semibold text-slate-400">
          Personalized dashboard signals and relevant content paths.
        </p>
      </div>
      <button
        aria-label="Previous My Sound insight"
        className="absolute left-2 top-[44%] z-40 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-cyan-200/24 bg-slate-950/60 text-2xl font-black text-cyan-100 shadow-[0_0_30px_rgba(34,211,238,0.16)] backdrop-blur transition hover:-translate-x-0.5 hover:border-amber-200/45 hover:bg-amber-300/10 hover:text-amber-100 active:scale-95 sm:left-4 sm:h-14 sm:w-14 sm:text-3xl lg:left-6 xl:left-8"
        onClick={() => rotateMySound("left")}
        type="button"
      >
        &lt;
      </button>
      <button
        aria-label="Next My Sound insight"
        className="absolute right-[5.75rem] top-[44%] z-40 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-cyan-200/24 bg-slate-950/60 text-2xl font-black text-cyan-100 shadow-[0_0_30px_rgba(34,211,238,0.16)] backdrop-blur transition hover:translate-x-0.5 hover:border-amber-200/45 hover:bg-amber-300/10 hover:text-amber-100 active:scale-95 sm:right-[6.25rem] sm:h-14 sm:w-14 sm:text-3xl lg:right-[6.75rem] xl:right-[7.25rem]"
        onClick={() => rotateMySound("right")}
        type="button"
      >
        &gt;
      </button>

      <div className="sr-only">
        My Sound. Personalized insights for dashboard content.
      </div>

      <div
        aria-label="My Sound insight orbit selector"
        className="relative z-10 mx-auto h-[410px] w-full max-w-[1120px] cursor-grab select-none overflow-hidden outline-none [perspective:1500px] [touch-action:pan-y] active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-cyan-200/45 sm:h-[460px]"
        onClickCapture={(event) => {
          if (mySoundPointerMovedRef.current) {
            event.preventDefault();
            event.stopPropagation();
            mySoundPointerMovedRef.current = false;
          }
        }}
        onKeyDown={(event) => handleDashboardOrbitKeyDown(event, rotateMySound)}
        onPointerCancel={(event) => {
          mySoundPointerStartRef.current = null;
          if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
            event.currentTarget.releasePointerCapture?.(event.pointerId);
          }
        }}
        onPointerDown={(event) =>
          handleDashboardOrbitPointerDown(
            event,
            mySoundPointerStartRef,
            mySoundPointerMovedRef,
          )
        }
        onPointerMove={(event) =>
          handleDashboardOrbitPointerMove(
            event,
            mySoundPointerStartRef,
            mySoundPointerMovedRef,
            rotateMySound,
          )
        }
        onPointerUp={(event) =>
          handleDashboardOrbitPointerUp(
            event,
            mySoundPointerStartRef,
            mySoundPointerMovedRef,
            rotateMySound,
            setActiveMySoundIndex,
          )
        }
        onWheel={(event) => handleDashboardOrbitWheel(event, rotateMySound)}
        onWheelCapture={(event) => handleDashboardOrbitWheel(event, rotateMySound)}
        tabIndex={0}
      >
        {dashboardMySoundCards.map((card, index) => {
          const distance = getMySoundOrbitDistance(index);
          const absDistance = Math.abs(distance);
          const direction = Math.sign(distance);
          const orbitSlots = [
            { blur: 0, opacity: 1, rotateY: 0, scale: 1, x: 0, y: -8, zIndex: 42 },
            { blur: 0, opacity: 0.75, rotateY: -16, scale: 0.82, x: 238, y: 20, zIndex: 30 },
            { blur: 0.8, opacity: 0.44, rotateY: -30, scale: 0.64, x: 318, y: 58, zIndex: 16 },
            { blur: 1.5, opacity: 0.2, rotateY: -42, scale: 0.48, x: 190, y: 96, zIndex: 8 },
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
              className={`dashboard-orbit-card group absolute left-1/2 top-1/2 w-[286px] overflow-hidden rounded-[28px] border p-4 text-left shadow-2xl transition-[border-color,background-color,box-shadow] duration-300 sm:w-[360px] ${
                isActive
                  ? "dashboard-orbit-card--active border-cyan-200/45 bg-slate-950/86 shadow-cyan-950/35"
                  : "border-white/10 bg-slate-950/64 shadow-black/30 hover:border-cyan-200/28 hover:bg-slate-950/78"
              }`}
              data-dashboard-orbit-card-index={index}
              key={card.title}
              onClick={() => {
                if (mySoundPointerMovedRef.current) {
                  mySoundPointerMovedRef.current = false;
                  return;
                }

                setActiveMySoundIndex(index);
              }}
              role="button"
              style={{
                ...dashboardEffectToneStyles[card.tone],
                filter: `blur(${slot.blur}px)`,
                opacity: slot.opacity,
                pointerEvents: absDistance > 2 ? "none" : "auto",
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
                  className={`grid h-12 w-12 shrink-0 place-items-center rounded-[20px] border ${
                    dashboardIconToneStyles[card.tone].active
                  }`}
                  aria-hidden="true"
                >
                  <DashboardTabIcon
                    className="h-6 w-6 drop-shadow-[0_0_10px_rgba(255,255,255,0.24)]"
                    label={card.title}
                    name={card.icon}
                  />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[9px] font-black uppercase tracking-[0.18em] text-cyan-100/72">
                    My Sound
                  </span>
                  <span className="mt-1 block truncate text-xl font-black tracking-tight text-white">
                    {card.title}
                  </span>
                </span>
                <span
                  className={`shrink-0 rounded-2xl border px-3 py-2 text-sm font-black ${
                    isActive
                      ? "border-cyan-200/35 bg-cyan-300/12 text-cyan-50"
                      : "border-white/10 bg-white/[0.04] text-slate-300"
                  }`}
                >
                  {card.metric}
                </span>
              </div>
              <p className="relative z-10 mt-3 text-xs font-semibold leading-5 text-slate-400">
                {card.description}
              </p>
              <div className="relative z-10 mt-3 grid gap-1.5">
                {card.rows.map((row) => (
                  <span
                    className="grid grid-cols-[72px_minmax(0,1fr)] gap-2 rounded-2xl border border-white/8 bg-slate-950/48 px-3 py-2"
                    key={`${card.title}-${row.label}`}
                  >
                    <span className="text-[8px] font-black uppercase tracking-[0.12em] text-slate-500">
                      {row.label}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[10px] font-black uppercase text-cyan-50">
                        {row.value}
                      </span>
                      <span className="mt-0.5 block truncate text-[9px] font-semibold text-slate-400">
                        {row.detail}
                      </span>
                    </span>
                  </span>
                ))}
              </div>
              <div className="relative z-10 mt-3 flex items-center justify-between gap-3">
                <span className="truncate text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                  {isActive ? "Recommended path" : "Select insight"}
                </span>
                {isActive ? (
                  <Link
                    className="shrink-0 rounded-full border border-cyan-200/30 bg-cyan-300/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-cyan-50 transition hover:border-cyan-100/50 hover:bg-cyan-300/16"
                    href={card.href}
                    onClick={(event) => {
                      event.stopPropagation();
                      markDashboardDestinationVisited(card.href);
                    }}
                  >
                    Open Dashboard
                  </Link>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );

  const renderDashboardMasterJourneyRow = () => (
    <div
      aria-label="Master Training Journey row"
      data-dashboard-orbiter-row="7"
      className={`relative flex min-h-0 items-start justify-center pl-6 pr-20 pt-2 transition-opacity duration-300 sm:pl-10 sm:pr-24 sm:pt-3 lg:pl-12 lg:pr-28 lg:pt-4 ${
        clampedDashboardOrbiterRow === 7
          ? "pointer-events-auto opacity-100"
          : "pointer-events-none opacity-40"
      }`}
    >
      <div className="pointer-events-none absolute left-6 top-6 z-20 min-w-0 pr-24 sm:left-10 lg:left-12">
        <div className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-200">
          Master Training Journey
        </div>
        <p className="mt-1 max-w-[34rem] truncate text-[11px] font-semibold text-slate-400">
          Dynamic plan snapshot across the next training timeline.
        </p>
      </div>

      <div
        data-dashboard-orbiter-local-scroll="true"
        className="h-full w-full max-w-[1180px] overflow-y-auto overscroll-contain pb-3 pr-1 scroll-smooth [scrollbar-color:rgba(34,211,238,0.36)_rgba(15,23,42,0.56)] [scrollbar-width:thin] [touch-action:pan-y] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-cyan-300/38 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-slate-950/58"
      >
        <section className="grid min-h-full items-center gap-4 pb-4 pt-16 lg:grid-cols-[minmax(250px,0.56fr)_minmax(0,1.44fr)] lg:pt-20">
          <aside className="relative overflow-hidden rounded-[30px] border border-cyan-100/18 bg-[radial-gradient(circle_at_18%_0%,rgba(34,211,238,0.14),transparent_34%),linear-gradient(135deg,rgba(15,23,42,0.76),rgba(2,6,23,0.58))] p-4 shadow-2xl shadow-black/25 backdrop-blur">
            <span className="pointer-events-none absolute inset-x-6 top-0 h-px rounded-full bg-gradient-to-r from-transparent via-cyan-200/70 to-amber-200/55" />
            <div className="flex items-start justify-between gap-3">
              <span
                className="grid h-14 w-14 shrink-0 place-items-center rounded-[22px] border border-cyan-100/35 bg-cyan-300/14 text-cyan-50 shadow-[0_0_22px_rgba(34,211,238,0.18)]"
                aria-hidden="true"
              >
                <DashboardTabIcon
                  className="h-7 w-7 drop-shadow-[0_0_12px_rgba(255,255,255,0.24)]"
                  label="Master Training Journey"
                  name="plan"
                />
              </span>
              <span className="rounded-full border border-amber-200/28 bg-amber-300/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-amber-100">
                {masterJourneyProgress}% mapped
              </span>
            </div>

            <h2 className="mt-5 text-2xl font-black uppercase tracking-tight text-white">
              Plan timeline
            </h2>
            <p className="mt-2 text-sm font-semibold leading-5 text-slate-300">
              Current focus:{" "}
              <span className="text-cyan-100">{masterJourneyCurrentFocus}</span>
            </p>

            <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-950/80">
              <span
                className="block h-full rounded-full bg-gradient-to-r from-emerald-300 via-cyan-300 to-amber-300 shadow-[0_0_24px_rgba(34,211,238,0.28)]"
                style={{ width: `${masterJourneyProgress}%` }}
              />
            </div>

            <div className="mt-4 grid gap-2">
              {[
                {
                  label: "Plan source",
                  value: activeSessionTemplate
                    ? "Live workout"
                    : favoriteWorkoutTemplates.length
                      ? `${favoriteWorkoutTemplates.length} templates`
                      : "Setup path",
                },
                {
                  label: "Next action",
                  value: nextAction.cta,
                },
                {
                  label: "Training data",
                  value: `${dashboardSummary.totalLoggedEntries} logs`,
                },
              ].map((item) => (
                <span
                  className="flex min-w-0 items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/44 px-3 py-2"
                  key={item.label}
                >
                  <span className="truncate text-[8px] font-black uppercase tracking-[0.13em] text-slate-500">
                    {item.label}
                  </span>
                  <span className="truncate text-[10px] font-black uppercase tracking-[0.1em] text-cyan-50">
                    {item.value}
                  </span>
                </span>
              ))}
            </div>
          </aside>

          <section className="relative min-w-0 overflow-hidden rounded-[34px] border border-white/12 bg-[radial-gradient(circle_at_16%_0%,rgba(34,211,238,0.16),transparent_34%),radial-gradient(circle_at_86%_12%,rgba(251,191,36,0.12),transparent_32%),linear-gradient(135deg,rgba(15,23,42,0.76),rgba(2,6,23,0.62))] shadow-[0_28px_90px_rgba(0,0,0,0.34),0_0_40px_rgba(34,211,238,0.08)] backdrop-blur-xl">
            <div className="flex items-center justify-between gap-4 border-b border-white/10 px-4 py-3">
              <span className="flex items-center gap-1.5" aria-hidden="true">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-300/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-300/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-300/80" />
              </span>
              <span className="truncate text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100">
                Current Plan Screenshot
              </span>
              <span className="rounded-full border border-cyan-200/20 bg-cyan-300/8 px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.12em] text-cyan-100">
                {dashboardMasterPlanTimeline.length} steps
              </span>
            </div>

            <div className="relative p-4 sm:p-5">
              <div className="pointer-events-none absolute left-8 right-8 top-[8.9rem] h-px bg-gradient-to-r from-transparent via-cyan-200/42 to-transparent shadow-[0_0_22px_rgba(34,211,238,0.24)]" />
              <div
                data-dashboard-orbiter-local-scroll="true"
                className="overflow-x-auto overscroll-x-contain pb-3 scroll-smooth [scrollbar-color:rgba(34,211,238,0.38)_rgba(15,23,42,0.72)] [scrollbar-width:thin] [touch-action:pan-x] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-cyan-300/42 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-slate-950/70"
              >
                <div className="flex min-w-max items-stretch">
                  {dashboardMasterPlanTimeline.map((item, index) => {
                    const tone = dashboardToneStyles[item.tone];
                    const isFirst = index === 0;

                    return (
                      <div
                        className="flex items-center"
                        key={`${item.title}-${item.dateLabel}-${index}`}
                      >
                        <Link
                          className={`group relative flex min-h-[238px] w-[188px] flex-col justify-between rounded-[26px] border p-4 text-left transition hover:-translate-y-1 ${tone.border} ${tone.glow} ${
                            isFirst
                              ? "border-cyan-200/55 bg-cyan-300/12 shadow-[0_0_34px_rgba(34,211,238,0.18)]"
                              : "border-white/10 bg-slate-950/56 hover:bg-slate-950/72"
                          }`}
                          href={item.href}
                        >
                          <span
                            className={`absolute left-4 right-4 top-0 h-[2px] rounded-full ${tone.line}`}
                          />
                          <span className="flex items-start justify-between gap-3">
                            <span
                              className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl border ${
                                dashboardIconToneStyles[item.tone][
                                  isFirst ? "active" : "idle"
                                ]
                              }`}
                              aria-hidden="true"
                            >
                              <DashboardTabIcon
                                className="h-6 w-6 drop-shadow-[0_0_10px_rgba(255,255,255,0.22)]"
                                label={item.title}
                                name={item.icon}
                              />
                            </span>
                            <span className="rounded-full border border-white/10 bg-slate-950/50 px-2 py-1 text-[8px] font-black uppercase tracking-[0.12em] text-slate-300">
                              {item.status}
                            </span>
                          </span>

                          <span className="block min-w-0">
                            <span className="block text-[9px] font-black uppercase tracking-[0.16em] text-cyan-100/72">
                              {item.dateLabel}
                            </span>
                            <span className="mt-1.5 block text-lg font-black leading-5 text-white">
                              {item.title}
                            </span>
                            <span className="mt-2 block text-xs font-semibold leading-5 text-slate-400">
                              {item.detail}
                            </span>
                          </span>

                          <span className="inline-flex w-fit rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.12em] text-cyan-100">
                            {item.metric}
                          </span>
                        </Link>

                        {index < dashboardMasterPlanTimeline.length - 1 ? (
                          <span className="mx-2 h-px w-12 shrink-0 bg-gradient-to-r from-cyan-300/48 via-amber-200/38 to-cyan-300/14 shadow-[0_0_16px_rgba(34,211,238,0.20)]" />
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>
        </section>
      </div>
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

        <section className="hidden" aria-hidden="true">
          <div className="relative min-w-0 overflow-hidden rounded-[28px] border border-cyan-300/24 bg-[radial-gradient(circle_at_16%_0%,rgba(34,211,238,0.16),transparent_34%),radial-gradient(circle_at_92%_12%,rgba(250,204,21,0.12),transparent_30%),rgba(15,23,42,0.72)] p-4 shadow-2xl shadow-black/25 backdrop-blur sm:rounded-[34px] sm:p-5 lg:p-6">
            <span className="pointer-events-none absolute inset-x-6 top-0 h-px rounded-full bg-gradient-to-r from-transparent via-cyan-200/70 to-amber-200/55" />
            <div className="relative">
              <div className="mx-auto max-w-3xl min-w-0 text-center">
                <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
                  Manual Stats Adder
                </h2>
                <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                  Quick-log a generic stat or attach it to a referenced Exercise Library card.
                </p>

              </div>

              <div className="mx-auto mt-4 flex max-w-[680px] flex-wrap items-center justify-center gap-2">
                <span className="text-[9px] font-black uppercase tracking-[0.18em] text-emerald-300">
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

              <div className="mx-auto mt-5 max-w-[980px] overflow-hidden rounded-[22px] border border-cyan-200/14 bg-slate-950/28 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <div
                    aria-label="Manual stats dashboard favorite selector"
                    className="mx-auto flex min-w-0 items-center gap-1.5"
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
                        {activeManualFavoriteCountLabel}
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

                <div className="mx-auto mt-1.5 w-full max-w-full">
                  {activeManualFavoriteDashboard.id === "workout" ? (
                    <ManualExerciseLibraryPreview
                      activeCategoryId={activeManualExerciseCategoryId}
                      categories={manualExerciseLibraryCategories}
                      manualStatsDraft={manualStatsDraft}
                      onCategorySelect={setActiveManualExerciseCategoryId}
                      onCategoryShift={rotateManualExerciseCategory}
                      onExerciseSelect={selectExerciseReference}
                      onManualStatsDraftChange={updateManualStatsDraft}
                      onSaveManualStats={saveManualStatsLog}
                      selectedExerciseCue={selectedExercise?.cue}
                      selectedExerciseIds={selectedManualExerciseReferenceIds}
                    />
                  ) : (
                    <div className="mx-auto flex w-fit max-w-full gap-2 overflow-x-auto overscroll-x-contain pb-2 scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                      {activeDashboardLibraryFavoriteIds.length ? (
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
                  )}
                </div>
              </div>
            </div>

            <div className="mx-auto mt-4 max-w-[980px]">
              <div className="mb-2 flex flex-col items-center justify-center gap-2 text-center sm:flex-row">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                  Recently saved stats
                </p>
                <span className="rounded-full border border-cyan-200/18 bg-cyan-300/8 px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-cyan-100">
                  Last {Math.min(manualStatsLogs.length, 6) || 0}
                </span>
              </div>

              {manualStatsLogs.length ? (
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {manualStatsLogs.slice(0, 6).map((entry) => {
                    const reference =
                      entry.references?.find(
                        (item) => item.referenceType === "exercise",
                      ) || entry.references?.[0];
                    const statTitle =
                      entry.sessionLabel?.trim() ||
                      reference?.referenceTitle ||
                      "Manual stat";
                    const statMeta = reference
                      ? `${reference.metadata.movementPattern || "Movement"} / ${
                          reference.metadata.equipment || "Equipment"
                        }`
                      : "Generic manual entry";
                    const statImage = reference?.metadata.image;
                    const statDate = formatCompactDateTime(
                      entry.loggedAt || entry.dateTime,
                    );
                    const statValues = [
                      {
                        label: "Sets",
                        value: entry.sets?.trim() || "0",
                      },
                      {
                        label: "Reps",
                        value: entry.reps?.trim() || "0",
                      },
                      {
                        label: "Load",
                        value: formatManualLoadDisplay(entry.load),
                      },
                      {
                        label: "RPE",
                        value: formatManualRpeDisplay(entry.rpe),
                      },
                    ];

                    return (
                      <article
                        key={entry.id}
                        className="relative isolate min-h-[132px] overflow-hidden rounded-2xl border border-white/10 bg-slate-950/42 p-3 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
                      >
                        <span className="flex items-start gap-3">
                          {statImage ? (
                            <span
                              aria-hidden="true"
                              className="h-14 w-14 shrink-0 rounded-xl border border-cyan-100/16 bg-cover bg-center"
                              style={{
                                backgroundImage: `linear-gradient(180deg, rgba(2,6,23,0.08), rgba(2,6,23,0.32)), url(${statImage})`,
                              }}
                            />
                          ) : (
                            <span
                              aria-hidden="true"
                              className="grid h-14 w-14 shrink-0 place-items-center rounded-xl border border-cyan-100/16 bg-cyan-300/10 text-[10px] font-black uppercase tracking-[0.12em] text-cyan-100"
                            >
                              Stat
                            </span>
                          )}

                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-black text-white">
                              {statTitle}
                            </span>
                            <span className="mt-1 block truncate text-[9px] font-black uppercase tracking-[0.11em] text-cyan-100/78">
                              {statMeta}
                            </span>
                            <span className="mt-1 block truncate text-[10px] font-semibold text-slate-400">
                              {statDate}
                            </span>
                          </span>
                        </span>

                        <span className="mt-3 grid grid-cols-4 gap-1.5">
                          {statValues.map((stat) => (
                            <span
                              key={stat.label}
                              className="min-w-0 rounded-xl border border-white/10 bg-slate-950/46 px-2 py-1"
                            >
                              <span className="block truncate text-[7px] font-black uppercase tracking-[0.1em] text-slate-500">
                                {stat.label}
                              </span>
                              <span className="mt-0.5 block truncate text-[10px] font-black uppercase text-cyan-50">
                                {stat.value}
                              </span>
                            </span>
                          ))}
                        </span>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="mx-auto flex min-h-[74px] w-full max-w-[980px] items-center justify-center rounded-2xl border border-dashed border-cyan-200/22 bg-slate-950/36 px-4 py-3 text-center">
                  <p className="text-xs font-semibold text-slate-400">
                    Saved manual stats will appear here after you hit Save Stat.
                  </p>
                </div>
              )}
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
          <div className="absolute right-2 top-1/2 z-50 h-[410px] w-16 -translate-y-1/2 overflow-visible [perspective:760px] sm:right-4 lg:right-6">
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-[276px] w-px -translate-x-1/2 -translate-y-1/2 bg-gradient-to-b from-transparent via-cyan-200/22 to-transparent shadow-[0_0_22px_rgba(34,211,238,0.22)]" />
            <button
              aria-label="Show previous dashboard row"
              className="absolute left-1/2 top-0 z-50 flex h-9 w-11 -translate-x-1/2 items-center justify-center rounded-t-2xl border border-cyan-100/20 bg-slate-950/58 text-[11px] font-black text-cyan-100 shadow-[0_14px_34px_rgba(0,0,0,0.30),inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-cyan-100/42 hover:bg-cyan-300/12 disabled:cursor-not-allowed disabled:opacity-35"
              disabled={clampedDashboardOrbiterRow === 0}
              onClick={() => moveDashboardOrbiterRow(-1)}
              type="button"
            >
              ^
            </button>
            <div
              aria-label="Dashboard row orbit selector"
              className="absolute inset-x-0 bottom-12 top-12 [transform-style:preserve-3d]"
            >
              {dashboardOrbiterRows.map((row, index) => {
                const distance = index - clampedDashboardOrbiterRow;
                const rawAbsDistance = Math.abs(distance);
                const clampedDistance = Math.max(-3, Math.min(3, distance));
                const absDistance = Math.abs(clampedDistance);
                const isActive = distance === 0;
                const urgencyTone = getDashboardRowUrgencyTone(
                  row.completion,
                );
                const yOffset = clampedDistance * 58;
                const scale =
                  absDistance === 0
                    ? 1
                    : absDistance === 1
                      ? 0.82
                      : absDistance === 2
                        ? 0.66
                        : 0.5;
                const opacity =
                  rawAbsDistance > 3
                    ? 0
                    : absDistance === 0
                    ? 1
                    : absDistance === 1
                      ? 0.76
                      : absDistance === 2
                        ? 0.42
                        : 0.2;
                const rotateY = clampedDistance * -12;

                return (
                  <button
                    aria-label={`Show ${row.title} row`}
                    aria-pressed={isActive}
                    className={`absolute left-1/2 top-1/2 grid h-12 w-12 origin-center place-items-center overflow-hidden rounded-[18px] border p-1 text-left shadow-[0_14px_34px_rgba(0,0,0,0.32),inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-xl transition-[border-color,background-color,box-shadow] duration-300 ${
                      isActive
                        ? `${urgencyTone.ring} ${urgencyTone.text} border-cyan-100/34 shadow-[0_18px_46px_rgba(0,0,0,0.40),0_0_24px_rgba(34,211,238,0.18),inset_0_1px_0_rgba(255,255,255,0.18)]`
                        : "border-white/12 bg-slate-950/52 text-slate-300 hover:border-cyan-200/30 hover:bg-cyan-300/10 hover:text-cyan-100"
                    }`}
                    key={row.title}
                    onClick={() => setDashboardOrbiterRow(index)}
                    style={{
                      opacity,
                      pointerEvents: rawAbsDistance > 3 ? "none" : "auto",
                      transform: `translate(-50%, -50%) translateY(${yOffset}px) translateZ(${
                        isActive ? 56 : 14 - absDistance * 10
                      }px) rotateY(${rotateY}deg) scale(${scale})`,
                      transition:
                        "transform 520ms cubic-bezier(0.2, 0.82, 0.2, 1), opacity 260ms ease, border-color 220ms ease, background-color 220ms ease, box-shadow 220ms ease",
                      zIndex: 40 - absDistance,
                    }}
                    title={row.helper}
                    type="button"
                  >
                    <span
                      aria-hidden="true"
                      className={`relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-2xl border ${
                        isActive
                          ? "border-cyan-100/34 bg-cyan-300/14 text-cyan-50 shadow-[0_0_22px_rgba(34,211,238,0.22)]"
                          : "border-white/12 bg-slate-950/66 text-slate-300"
                      }`}
                    >
                      {row.logo === "sound" ? (
                        <Image
                          alt=""
                          className="h-7 w-7 object-contain drop-shadow-[0_0_10px_rgba(34,211,238,0.24)]"
                          height={28}
                          src="/sound-fitness-logo.png"
                          width={28}
                        />
                      ) : (
                        <DashboardTabIcon
                          className="h-4 w-4 drop-shadow-[0_0_8px_rgba(255,255,255,0.18)]"
                          label={row.title}
                          name={row.icon}
                        />
                      )}
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 grid h-4 w-4 place-items-center rounded-full text-[7px] font-black leading-none text-slate-950 ${
                          isActive
                            ? urgencyTone.dot
                            : `${urgencyTone.dot} opacity-70`
                        }`}
                      >
                        {urgencyTone.icon}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
            <button
              aria-label="Show next dashboard row"
              className="absolute bottom-0 left-1/2 z-50 flex h-9 w-11 -translate-x-1/2 items-center justify-center rounded-b-2xl border border-amber-100/20 bg-slate-950/58 text-[11px] font-black text-amber-100 shadow-[0_14px_34px_rgba(0,0,0,0.30),inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-xl transition hover:translate-y-0.5 hover:border-amber-100/42 hover:bg-amber-300/12 disabled:cursor-not-allowed disabled:opacity-35"
              disabled={
                clampedDashboardOrbiterRow === dashboardOrbiterRows.length - 1
              }
              onClick={() => moveDashboardOrbiterRow(1)}
              type="button"
            >
              v
            </button>
          </div>
          <div className="relative z-10 mt-4 h-[min(70vh,640px)] min-h-[520px] overflow-hidden sm:mt-5 sm:min-h-[560px] lg:mt-5 lg:min-h-[600px]">
            <div
              className="grid transition-transform duration-[620ms] ease-[cubic-bezier(0.2,0.85,0.25,1)]"
              style={{
                gridTemplateRows: `repeat(${dashboardOrbiterRows.length}, minmax(0, 1fr))`,
                height: `${dashboardOrbiterRows.length * 100}%`,
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
                <div
                  data-dashboard-orbiter-local-scroll="true"
                  className="flex h-full w-full max-w-[1120px] flex-col items-center gap-2 overflow-y-auto overscroll-contain pb-3 pr-1 sm:gap-3 [scrollbar-color:rgba(34,211,238,0.36)_rgba(15,23,42,0.56)] [scrollbar-width:thin] [touch-action:pan-y] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-cyan-300/38 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-slate-950/58"
                >
                  {renderDashboardHeroRow()}
                  {renderFavoriteWorkoutsCard()}
                </div>
              </div>
              {renderDashboardDailyToolsRow()}
              {renderDashboardWeeklyRecapRow()}
              {renderDashboardOrbitCardRow({
                cards: dashboardCommandCenterCards,
                description:
                  "Rotate through training, fuel, recovery, performance, education, and Sound World command centers.",
                getDistance: getCommandCenterOrbitDistance,
                kicker: "Dashboards",
                pointerMovedRef: commandCenterPointerMovedRef,
                pointerStartRef: commandCenterPointerStartRef,
                rotateOrbit: rotateCommandCenter,
                rowIndex: 3,
                setActiveIndex: setActiveCommandCenterIndex,
                title: "Choose Your Command Center",
              })}
              {renderDashboardCalendarRow()}
              {renderDashboardMySoundRow()}
              {renderDashboardOrbitCardRow({
                cards: dashboardSystemCards,
                description:
                  "Goals, insights, stats, progress, appointments, messages, packages, and achievements live together here.",
                getDistance: getSystemCenterOrbitDistance,
                kicker: "Systems",
                pointerMovedRef: systemCenterPointerMovedRef,
                pointerStartRef: systemCenterPointerStartRef,
                rotateOrbit: rotateSystemCenter,
                rowIndex: 6,
                setActiveIndex: setActiveSystemCenterIndex,
                title: "System Row",
              })}
              {renderDashboardMasterJourneyRow()}
            </div>
          </div>
        </section>
        {renderDashboardProfileHubOverlay()}

        <section className="mb-6">
          <DashboardCharts recoveryTrend={dashboardCharts.recoveryTrend} />
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

      </div>
    </main>
  );
}
