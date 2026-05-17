"use client";

import Image from "next/image";
import Link from "next/link";
import {
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import DashboardCalendar, {
  type DashboardCalendarItem,
} from "@/components/dashboard/DashboardCalendar";
import DashboardCharts from "@/components/dashboard/DashboardCharts";
import SoundAchievementBadgeRow, {
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

type UploadOptionId =
  | "manual"
  | "photo"
  | "screenshot"
  | "file"
  | "connect"
  | "review";

type ManualEntryTypeId =
  | "workout"
  | "nutrition"
  | "water"
  | "weight"
  | "steps"
  | "sleep"
  | "recovery"
  | "upload";

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

const dashboardUploadOptions: Array<{
  cta: string;
  description: string;
  href: string;
  id: UploadOptionId;
  label: string;
  meta: string;
}> = [
  {
    cta: "Open Manual Entry",
    description: "Log workout, body, recovery, nutrition, or performance data directly.",
    href: "/stats/add/manual",
    id: "manual",
    label: "Manual Entry",
    meta: "Fast form",
  },
  {
    cta: "Upload Progress or Meal Photo",
    description: "Send a progress, meal, or body-context photo into the import flow.",
    href: "/stats/add/upload?type=photo",
    id: "photo",
    label: "Upload Photo",
    meta: "Photo",
  },
  {
    cta: "Upload Workout Screenshot",
    description: "Import a workout screenshot for later AI review and cleanup.",
    href: "/stats/add/upload?type=screenshot",
    id: "screenshot",
    label: "Upload Screenshot",
    meta: "Screenshot",
  },
  {
    cta: "Upload Spreadsheet",
    description: "Bring in Excel or CSV files from trackers, exports, or templates.",
    href: "/stats/add/upload?type=file",
    id: "file",
    label: "Upload Excel / CSV",
    meta: "File",
  },
  {
    cta: "Connect Fitness App",
    description: "Start a wearable or fitness app connection flow.",
    href: "/stats/add/connect",
    id: "connect",
    label: "Connect Wearable",
    meta: "Sync",
  },
  {
    cta: "Review AI Imports",
    description: "Check imported data that needs confirmation before it lands in stats.",
    href: "/stats/import-review",
    id: "review",
    label: "AI Import Review",
    meta: "Review",
  },
];

const dashboardManualEntryTypes: Array<{
  cta: string;
  fields: Array<{
    label: string;
    placeholder: string;
    type?: "text" | "number" | "time";
  }>;
  href: string;
  icon: string;
  id: ManualEntryTypeId;
  label: string;
  note: string;
  options?: Array<{
    href: string;
    label: string;
  }>;
}> = [
  {
    cta: "Open Workout Entry",
    fields: [
      { label: "Session", placeholder: "Upper Body Strength" },
      { label: "Sets", placeholder: "12", type: "number" },
      { label: "Load", placeholder: "Working weight", type: "text" },
    ],
    href: "/stats/add/manual?type=workout",
    icon: "🏋️",
    id: "workout",
    label: "Workout",
    note: "Session, exercise, sets, reps, and training notes only.",
  },
  {
    cta: "Open Nutrition Entry",
    fields: [
      { label: "Meal", placeholder: "Lunch" },
      { label: "Calories", placeholder: "650", type: "number" },
      { label: "Protein", placeholder: "42 g", type: "text" },
    ],
    href: "/stats/add/manual?type=nutrition",
    icon: "🍽️",
    id: "nutrition",
    label: "Nutrition",
    note: "Meal, calorie, protein, and food-context fields only.",
  },
  {
    cta: "Open Water Entry",
    fields: [
      { label: "Water", placeholder: "24 oz", type: "text" },
      { label: "Time", placeholder: "Now", type: "time" },
    ],
    href: "/stats/add/manual?type=water",
    icon: "💧",
    id: "water",
    label: "Water",
    note: "Hydration amount and timing fields only.",
  },
  {
    cta: "Open Weight Entry",
    fields: [
      { label: "Weight", placeholder: "185 lb", type: "text" },
      { label: "Body Fat", placeholder: "18.5%", type: "text" },
      { label: "Waist", placeholder: "34 in", type: "text" },
    ],
    href: "/stats/add/manual?type=weight",
    icon: "⚖️",
    id: "weight",
    label: "Weight",
    note: "Body stat fields for weight and measurements only.",
  },
  {
    cta: "Open Steps Entry",
    fields: [
      { label: "Steps", placeholder: "10000", type: "number" },
      { label: "Active Min", placeholder: "45", type: "number" },
    ],
    href: "/stats/add/manual?type=steps",
    icon: "👣",
    id: "steps",
    label: "Steps",
    note: "Step count and daily activity fields only.",
  },
  {
    cta: "Open Sleep Entry",
    fields: [
      { label: "Duration", placeholder: "7.5 hours", type: "text" },
      { label: "Quality", placeholder: "Good" },
    ],
    href: "/stats/add/manual?type=sleep",
    icon: "😴",
    id: "sleep",
    label: "Sleep",
    note: "Sleep duration, quality, and timing fields only.",
  },
  {
    cta: "Open Recovery Entry",
    fields: [
      { label: "Readiness", placeholder: "Normal" },
      { label: "Soreness", placeholder: "2 / 10", type: "text" },
      { label: "Pain", placeholder: "0 / 10", type: "text" },
    ],
    href: "/stats/add/manual?type=recovery",
    icon: "🧘",
    id: "recovery",
    label: "Recovery",
    note: "Soreness, readiness, pain, and recovery-context fields only.",
  },
  {
    cta: "Open Upload Options",
    fields: [],
    href: "/stats/add/upload",
    icon: "📸",
    id: "upload",
    label: "Upload",
    note: "Photo, screenshot, file, and AI import review options only.",
    options: [
      { href: "/stats/add/upload?type=photo", label: "Photo" },
      { href: "/stats/add/upload?type=screenshot", label: "Screenshot" },
      { href: "/stats/add/upload?type=file", label: "Excel / CSV" },
      { href: "/stats/import-review", label: "AI Review" },
    ],
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

const formatLastSyncedAt = (value: string | null) => {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

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

const dashboardNavigationCards: DashboardNavigationCard[] = [
  {
    title: "Workout / Sessions",
    href: ROUTES.dashboard.sessions,
    description: "Sessions, plans, builders, and training progression.",
    icon: "🏋️",
    tone: "cyan",
    status: "Primary",
    journeySteps: [
      { icon: "🧭", label: "Overview", href: ROUTES.dashboard.sessions, state: "complete" },
      { icon: "🎯", label: "Goals", href: ROUTES.dashboard.goals, state: "complete" },
      { icon: "🏋️", label: "Builder", href: ROUTES.workoutBuilder.home, state: "active" },
      { icon: "📅", label: "Plan", href: ROUTES.dashboard.myPlan, state: "default" },
      { icon: "✅", label: "Session", href: ROUTES.dashboard.sessionWorkout, state: "default" },
      { icon: "📈", label: "Stats", href: ROUTES.dashboard.stats, state: "default" },
      { icon: "🧠", label: "Insights", href: ROUTES.dashboard.insights, state: "locked" },
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
] as const;

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
    useState<UploadOptionId>("manual");
  const [isManualEntryOpen, setIsManualEntryOpen] = useState(false);
  const [activeManualEntryType, setActiveManualEntryType] =
    useState<ManualEntryTypeId>("workout");
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
  const [activeCommandCenterIndex, setActiveCommandCenterIndex] = useState(0);
  const uploadSelectorRef = useRef<HTMLDivElement | null>(null);
  const manualEntrySelectorRef = useRef<HTMLDivElement | null>(null);
  const favoriteWorkoutStripRef = useRef<HTMLDivElement | null>(null);
  const commandCenterPointerStartRef = useRef<number | null>(null);
  const commandCenterPointerMovedRef = useRef(false);
  const activeUploadOption =
    dashboardUploadOptions.find((option) => option.id === activeUploadType) ||
    dashboardUploadOptions[0];
  const activeManualEntryOption =
    dashboardManualEntryTypes.find(
      (option) => option.id === activeManualEntryType,
    ) || dashboardManualEntryTypes[0];
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
  const activeCommandCenter =
    dashboardNavigationCards[activeCommandCenterIndex] ||
    dashboardNavigationCards[0];
  const getCommandCenterOrbitDistance = (index: number) => {
    const totalCards = dashboardNavigationCards.length;
    const rawDistance = index - activeCommandCenterIndex;

    if (rawDistance > totalCards / 2) {
      return rawDistance - totalCards;
    }

    if (rawDistance < -totalCards / 2) {
      return rawDistance + totalCards;
    }

    return rawDistance;
  };
  const rotateCommandCenter = (direction: "left" | "right") => {
    setActiveCommandCenterIndex((currentIndex) => {
      const nextIndex =
        direction === "left" ? currentIndex - 1 : currentIndex + 1;

      return (
        (nextIndex + dashboardNavigationCards.length) %
        dashboardNavigationCards.length
      );
    });
  };
  const handleCommandCenterPointerDown = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;

    commandCenterPointerStartRef.current = event.clientX;
    commandCenterPointerMovedRef.current = false;
    event.currentTarget.focus({ preventScroll: true });
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const handleCommandCenterPointerMove = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    const startX = commandCenterPointerStartRef.current;
    if (startX === null) return;

    const deltaX = event.clientX - startX;
    if (Math.abs(deltaX) < 72) return;

    event.preventDefault();
    event.stopPropagation();
    commandCenterPointerMovedRef.current = true;
    rotateCommandCenter(deltaX > 0 ? "left" : "right");
    commandCenterPointerStartRef.current = event.clientX;
  };
  const handleCommandCenterPointerUp = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    const startX = commandCenterPointerStartRef.current;
    commandCenterPointerStartRef.current = null;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    }

    if (startX === null) {
      return;
    }

    if (commandCenterPointerMovedRef.current) {
      return;
    }

    const deltaX = event.clientX - startX;

    if (Math.abs(deltaX) < 44) {
      return;
    }

    commandCenterPointerMovedRef.current = true;
    rotateCommandCenter(deltaX > 0 ? "left" : "right");
  };
  const handleCommandCenterKeyDown = (
    event: ReactKeyboardEvent<HTMLDivElement>,
  ) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      rotateCommandCenter("left");
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      rotateCommandCenter("right");
    }
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

    if (optionId === "manual") {
      setIsManualEntryOpen(true);
      return;
    }

    setIsManualEntryOpen(false);
  };

  const scrollUploadOptions = (direction: "left" | "right") => {
    const selector = uploadSelectorRef.current;
    if (!selector) return;

    selector.scrollBy({
      behavior: "smooth",
      left: direction === "left" ? -260 : 260,
    });
  };
  const scrollManualEntryOptions = (direction: "left" | "right") => {
    const selector = manualEntrySelectorRef.current;
    if (!selector) return;

    selector.scrollBy({
      behavior: "smooth",
      left: direction === "left" ? -220 : 220,
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
  const launchFavoriteWorkout = (template: LocalWorkoutBuilderTemplate) => {
    if (!template.exercises.length) return;

    const sessionTemplate = writeActiveWorkoutBuilderSessionTemplate(template);
    setActiveSessionTemplate(sessionTemplate);
  };

  useEffect(() => {
    setManualStatsLogs(readManualStatsLogEntries());
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

  const lastSyncedLabel = formatLastSyncedAt(lastSyncedAt);

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
    const workoutsThisWeek = workoutDates.filter((date) => {
      const timestamp = new Date(date).getTime();
      return Number.isFinite(timestamp) && timestamp >= sevenDaysAgo;
    }).length;
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

  return (
    <main className="min-h-screen bg-[#020713] text-white">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_18%_0%,rgba(14,165,233,0.18),transparent_30%),radial-gradient(circle_at_82%_12%,rgba(16,185,129,0.13),transparent_26%),linear-gradient(180deg,#020713_0%,#07111f_48%,#020713_100%)]" />

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-8 lg:py-8">
        <header className="mb-6 overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(15,23,42,0.72)),radial-gradient(circle_at_18%_0%,rgba(34,211,238,0.14),transparent_34%),radial-gradient(circle_at_92%_18%,rgba(250,204,21,0.12),transparent_30%)] p-4 shadow-2xl shadow-black/20 backdrop-blur sm:rounded-[30px] sm:p-6 lg:p-7">
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
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.15em] text-cyan-100">
                      <span className="text-base">⚡</span>
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

          <SoundAchievementBadgeRow
            className="mt-6 border-t border-white/10 pt-5"
            eyebrow="Progression rewards"
            items={heroAchievements}
            title="Recent achievements"
          />
        </header>

        <section className="mb-6 overflow-hidden rounded-[24px] border border-cyan-200/16 bg-[linear-gradient(135deg,rgba(15,23,42,0.76),rgba(2,6,23,0.58)),radial-gradient(circle_at_8%_0%,rgba(34,211,238,0.13),transparent_32%)] p-3 shadow-2xl shadow-black/15 backdrop-blur sm:p-4">
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

        <section className="mb-6 grid gap-5 xl:grid-cols-2">
          <div className="relative min-w-0 overflow-hidden rounded-[28px] border border-cyan-300/24 bg-[radial-gradient(circle_at_16%_0%,rgba(34,211,238,0.16),transparent_34%),radial-gradient(circle_at_92%_12%,rgba(250,204,21,0.12),transparent_30%),rgba(15,23,42,0.72)] p-4 shadow-2xl shadow-black/25 backdrop-blur sm:rounded-[34px] sm:p-5 lg:p-6">
            <span className="pointer-events-none absolute inset-x-6 top-0 h-px rounded-full bg-gradient-to-r from-transparent via-cyan-200/70 to-amber-200/55" />
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
              <button
                type="button"
                onClick={() => setExerciseSelectorOpen(true)}
                className="rounded-2xl border border-cyan-200/32 bg-cyan-300/12 px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-cyan-50 shadow-[0_0_22px_rgba(34,211,238,0.14)] transition hover:-translate-y-0.5 hover:border-cyan-100/55 hover:bg-cyan-300/18"
              >
                Add Exercise Reference
              </button>
              <Link
                href={ROUTES.dashboard.sessions}
                className="rounded-2xl border border-white/10 bg-slate-950/46 px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-slate-300 transition hover:-translate-y-0.5 hover:border-cyan-200/35 hover:bg-cyan-300/8 hover:text-cyan-100"
              >
                Start Workout
              </Link>
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

          <div className="min-w-0 w-full rounded-[22px] border border-cyan-300/18 bg-[radial-gradient(circle_at_18%_0%,rgba(34,211,238,0.12),transparent_32%),linear-gradient(135deg,rgba(15,23,42,0.82),rgba(2,6,23,0.94))] p-3 shadow-2xl shadow-black/18 backdrop-blur sm:rounded-[24px]">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-[9px] font-black uppercase tracking-[0.18em] text-emerald-300">
                  Add Stats
                </div>
                <h2 className="mt-0.5 text-lg font-black tracking-tight">
                  Add Stats
                </h2>
              </div>
              <span className="w-fit rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-cyan-100">
                Import
              </span>
            </div>

            <p className="mt-1.5 text-[11px] font-semibold leading-4 text-slate-400">
              Quick-log, upload, connect, or review.
            </p>

            <div className="mt-3 overflow-hidden">
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                  Import type
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    aria-label="Scroll upload options left"
                    onClick={() => scrollUploadOptions("left")}
                    className="grid h-7 w-7 place-items-center rounded-lg border border-white/10 bg-slate-950/55 text-[10px] font-black text-slate-300 transition hover:border-cyan-200/35 hover:bg-cyan-300/10 hover:text-cyan-100"
                  >
                    &lt;
                  </button>
                  <button
                    type="button"
                    aria-label="Scroll upload options right"
                    onClick={() => scrollUploadOptions("right")}
                    className="grid h-7 w-7 place-items-center rounded-lg border border-white/10 bg-slate-950/55 text-[10px] font-black text-slate-300 transition hover:border-cyan-200/35 hover:bg-cyan-300/10 hover:text-cyan-100"
                  >
                    &gt;
                  </button>
                </div>
              </div>

              <div
                ref={uploadSelectorRef}
                className="flex max-w-full snap-x snap-mandatory gap-1.5 overflow-x-auto overscroll-x-contain scroll-smooth pb-2 [scrollbar-color:rgba(34,211,238,0.42)_rgba(15,23,42,0.7)] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-cyan-300/45 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-slate-950/70"
              >
                {dashboardUploadOptions.map((option) => {
                  const active = option.id === activeUploadType;

                  return (
                    <button
                      key={option.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => handleUploadOptionSelect(option.id)}
                      className={`group min-h-[46px] w-[118px] shrink-0 snap-start rounded-xl border px-2.5 py-1.5 text-left transition hover:-translate-y-0.5 active:scale-[0.98] ${
                        active
                          ? "border-cyan-200/55 bg-cyan-300/14 text-cyan-50 shadow-[0_0_22px_rgba(34,211,238,0.18)]"
                          : "border-white/10 bg-white/[0.045] text-slate-300 hover:border-cyan-200/32 hover:bg-cyan-300/8"
                      }`}
                    >
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.11em] ${
                          active
                            ? "border-cyan-100/32 bg-cyan-300/16 text-cyan-50"
                            : "border-white/10 bg-slate-950/55 text-slate-500 group-hover:text-cyan-100"
                        }`}
                      >
                        {option.meta}
                      </span>
                      <span className="mt-1 block truncate text-[10px] font-black uppercase tracking-[0.07em] text-white">
                        {option.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-2.5 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/45">
              <button
                type="button"
                aria-expanded={isManualEntryOpen}
                onClick={() => {
                  setActiveUploadType("manual");
                  setIsManualEntryOpen((open) => !open);
                }}
                className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left transition hover:bg-cyan-300/6"
              >
                <span className="min-w-0">
                  <span className="block text-[11px] font-black uppercase tracking-[0.14em] text-cyan-100">
                    Manual Entry
                  </span>
                  <span className="mt-0.5 block truncate text-[10px] font-semibold text-slate-400">
                    Default: {activeManualEntryOption.icon}{" "}
                    {activeManualEntryOption.label} quick entry
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-1.5">
                  <span
                    className={`grid h-7 w-7 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-xs font-black text-slate-300 transition ${
                      isManualEntryOpen ? "rotate-180 text-cyan-100" : ""
                    }`}
                    aria-hidden="true"
                  >
                    ˅
                  </span>
                </span>
              </button>

              {isManualEntryOpen ? (
                <div className="border-t border-white/10 p-2.5">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                      Quick entry type
                    </p>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        aria-label="Scroll manual entry types left"
                        onClick={() => scrollManualEntryOptions("left")}
                        className="grid h-6 w-6 place-items-center rounded-lg border border-white/10 bg-slate-950/55 text-[9px] font-black text-slate-300 transition hover:border-cyan-200/35 hover:bg-cyan-300/10 hover:text-cyan-100"
                      >
                        &lt;
                      </button>
                      <button
                        type="button"
                        aria-label="Scroll manual entry types right"
                        onClick={() => scrollManualEntryOptions("right")}
                        className="grid h-6 w-6 place-items-center rounded-lg border border-white/10 bg-slate-950/55 text-[9px] font-black text-slate-300 transition hover:border-cyan-200/35 hover:bg-cyan-300/10 hover:text-cyan-100"
                      >
                        &gt;
                      </button>
                    </div>
                  </div>

                  <div
                    ref={manualEntrySelectorRef}
                    className="flex max-w-full gap-1.5 overflow-x-auto overscroll-x-contain pb-2 scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                  >
                    {dashboardManualEntryTypes.map((option) => {
                      const active = option.id === activeManualEntryType;

                      return (
                        <button
                          key={option.id}
                          type="button"
                          aria-pressed={active}
                          onClick={() => setActiveManualEntryType(option.id)}
                          className={`flex h-8 shrink-0 items-center gap-1.5 rounded-lg border px-2.5 text-[9px] font-black uppercase tracking-[0.09em] transition hover:-translate-y-0.5 active:scale-[0.98] ${
                            active
                              ? "border-cyan-100/55 bg-gradient-to-r from-cyan-300/20 to-amber-300/12 text-cyan-50 shadow-[0_0_20px_rgba(34,211,238,0.18)]"
                              : "border-white/10 bg-white/[0.035] text-slate-400 hover:border-cyan-200/30 hover:bg-cyan-300/8 hover:text-white"
                          }`}
                        >
                          <span className="text-xs" aria-hidden="true">
                            {option.icon}
                          </span>
                          {option.label}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-1.5 rounded-2xl border border-cyan-200/14 bg-cyan-300/7 p-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.12em] text-cyan-100">
                          {activeManualEntryOption.icon}{" "}
                          {activeManualEntryOption.label} Entry
                        </p>
                        <p className="mt-1 line-clamp-2 text-[11px] font-semibold leading-4 text-slate-400">
                          {activeManualEntryOption.note}
                        </p>
                      </div>
                    </div>

                    {activeManualEntryOption.options ? (
                      <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        {activeManualEntryOption.options.map((option) => (
                          <Link
                            key={option.href}
                            href={option.href}
                            className="shrink-0 rounded-lg border border-white/10 bg-slate-950/55 px-2.5 py-1.5 text-[9px] font-black uppercase tracking-[0.1em] text-slate-300 transition hover:border-cyan-200/32 hover:bg-cyan-300/10 hover:text-cyan-100"
                          >
                            {option.label}
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        {activeManualEntryOption.fields.map((field) => (
                          <label
                            key={field.label}
                            className="w-[116px] shrink-0 rounded-lg border border-white/10 bg-slate-950/50 p-2"
                          >
                            <span className="block text-[9px] font-black uppercase tracking-[0.13em] text-slate-500">
                              {field.label}
                            </span>
                            <input
                              type={field.type || "text"}
                              placeholder={field.placeholder}
                              className="mt-1 w-full border-0 bg-transparent text-xs font-bold text-white outline-none placeholder:text-slate-600"
                            />
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="mt-2.5 rounded-2xl border border-cyan-200/14 bg-cyan-300/7 p-2.5">
              <div className="flex flex-col gap-2">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.12em] text-cyan-100">
                    {activeUploadType === "manual"
                      ? `${activeManualEntryOption.label} Manual Entry`
                      : activeUploadOption.label}
                  </p>
                  <p className="mt-1 line-clamp-1 text-[11px] font-semibold leading-4 text-slate-400">
                    {activeUploadType === "manual"
                      ? activeManualEntryOption.note
                      : activeUploadOption.description}
                  </p>
                </div>
                <Link
                  href={
                    activeUploadType === "manual"
                      ? activeManualEntryOption.href
                      : activeUploadOption.href
                  }
                  className="inline-flex min-h-[34px] w-full shrink-0 items-center justify-center rounded-xl bg-cyan-300 px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-slate-950 shadow-[0_0_24px_rgba(34,211,238,0.18)] transition hover:bg-cyan-200"
                >
                  {activeUploadType === "manual"
                    ? activeManualEntryOption.cta
                    : activeUploadOption.cta}
                </Link>
              </div>
            </div>

            <div className="mt-2.5 flex min-w-0 flex-wrap gap-1.5">
              <span className="max-w-full truncate rounded-full border border-white/10 bg-slate-950/45 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.1em] text-slate-400">
                Last: {lastSyncedLabel || "none"}
              </span>
              <span className="rounded-full border border-white/10 bg-slate-950/45 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.1em] text-slate-400">
                Apps: soon
              </span>
            </div>
          </div>
        </section>

        <section className="relative mb-6 overflow-hidden rounded-[34px] border border-cyan-200/12 bg-[radial-gradient(circle_at_50%_18%,rgba(34,211,238,0.13),transparent_34%),radial-gradient(circle_at_82%_28%,rgba(250,204,21,0.09),transparent_28%),linear-gradient(135deg,rgba(15,23,42,0.62),rgba(2,6,23,0.72))] p-5 shadow-2xl shadow-black/20 backdrop-blur sm:p-6 lg:p-7">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-[55%] h-[330px] w-[112%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-200/10 shadow-[0_0_90px_rgba(34,211,238,0.14)]"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-[57%] h-[162px] w-[96%] -translate-x-1/2 -translate-y-1/2 rounded-full border-t border-amber-200/18 opacity-90 blur-[0.2px]"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-[48%] h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-300/10 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-8 top-0 h-px rounded-full bg-gradient-to-r from-transparent via-cyan-200/50 to-amber-200/30"
          />
          <button
            aria-label="Previous command center"
            className="absolute left-2 top-[55%] z-30 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-cyan-200/24 bg-slate-950/60 text-2xl font-black text-cyan-100 shadow-[0_0_30px_rgba(34,211,238,0.16)] backdrop-blur transition hover:-translate-x-0.5 hover:border-amber-200/45 hover:bg-amber-300/10 hover:text-amber-100 hover:shadow-[0_0_38px_rgba(250,204,21,0.18)] active:scale-95 sm:left-4 sm:h-14 sm:w-14 sm:text-3xl lg:left-6"
            onClick={() => rotateCommandCenter("left")}
            type="button"
          >
            ‹
          </button>
          <button
            aria-label="Next command center"
            className="absolute right-2 top-[55%] z-30 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-cyan-200/24 bg-slate-950/60 text-2xl font-black text-cyan-100 shadow-[0_0_30px_rgba(34,211,238,0.16)] backdrop-blur transition hover:translate-x-0.5 hover:border-amber-200/45 hover:bg-amber-300/10 hover:text-amber-100 hover:shadow-[0_0_38px_rgba(250,204,21,0.18)] active:scale-95 sm:right-4 sm:h-14 sm:w-14 sm:text-3xl lg:right-6"
            onClick={() => rotateCommandCenter("right")}
            type="button"
          >
            ›
          </button>

          <div className="relative z-10 mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.24em] text-cyan-300">
                Dashboards
              </div>
              <h2 className="mt-2 text-2xl font-black uppercase tracking-tight text-white">
                Choose Your Command Center
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                Rotate through your training, fuel, recovery, and progress
                systems.
              </p>
            </div>
          </div>

          <div
            aria-label="Command center orbit selector"
            className="relative z-10 h-[410px] w-full cursor-grab select-none overflow-visible outline-none [perspective:1500px] [touch-action:pan-y] active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-cyan-200/45 sm:h-[460px]"
            onClickCapture={(event) => {
              if (commandCenterPointerMovedRef.current) {
                event.preventDefault();
                event.stopPropagation();
                commandCenterPointerMovedRef.current = false;
              }
            }}
            onKeyDown={handleCommandCenterKeyDown}
            onPointerCancel={(event) => {
              commandCenterPointerStartRef.current = null;
              if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
                event.currentTarget.releasePointerCapture?.(event.pointerId);
              }
            }}
            onPointerDown={handleCommandCenterPointerDown}
            onPointerMove={handleCommandCenterPointerMove}
            onPointerUp={handleCommandCenterPointerUp}
            tabIndex={0}
          >
            <div
              aria-hidden="true"
              className="absolute left-1/2 top-[53%] h-[246px] w-[94%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-200/12 shadow-[0_0_70px_rgba(34,211,238,0.12)]"
            />
            <div
              aria-hidden="true"
              className="absolute left-1/2 top-[56%] h-[124px] w-[82%] -translate-x-1/2 -translate-y-1/2 rounded-full border-t border-amber-200/20 opacity-80 blur-[0.2px]"
            />
            <div
              aria-hidden="true"
              className="absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-300/10 blur-3xl"
            />

            {dashboardNavigationCards.map((card, index) => {
              const distance = getCommandCenterOrbitDistance(index);
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
                    isActive
                      ? `${card.title} selected`
                      : `Select ${card.title}`
                  }
                  aria-pressed={isActive}
                  className={`group absolute left-1/2 top-1/2 w-[270px] rounded-[30px] border p-5 text-left shadow-2xl transition-[border-color,background-color,box-shadow] duration-300 sm:w-[340px] ${
                    isActive
                      ? "border-cyan-200/45 bg-slate-950/86 shadow-cyan-950/35"
                      : "border-white/10 bg-slate-950/64 shadow-black/30 hover:border-cyan-200/28 hover:bg-slate-950/78"
                  }`}
                  key={card.title}
                  onClick={() => {
                    if (commandCenterPointerMovedRef.current) {
                      commandCenterPointerMovedRef.current = false;
                      return;
                    }

                    setActiveCommandCenterIndex(index);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setActiveCommandCenterIndex(index);
                    }
                  }}
                  role="button"
                  style={{
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
                    className={`absolute left-6 right-6 top-0 h-[2px] rounded-full ${tone.line}`}
                  />
                  <div className="flex items-start justify-between gap-3">
                    <span
                      className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-[22px] border border-white/10 text-2xl shadow-inner shadow-white/5 ${tone.icon}`}
                      aria-hidden="true"
                    >
                      {card.icon}
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
                  <h3 className="mt-4 text-xl font-black tracking-tight text-white">
                    {card.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    {card.description}
                  </p>

                  {isActive && card.journeySteps?.length ? (
                    <div className="mt-5 border-t border-white/10 pt-3">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">
                          Journey
                        </span>
                        <span className="text-[9px] font-black uppercase tracking-[0.16em] text-cyan-200/70">
                          Swipe
                        </span>
                      </div>
                      <div className="flex max-w-full gap-2 overflow-x-auto overscroll-x-contain pb-1 scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        {card.journeySteps.map((step) => (
                          <Link
                            aria-current={step.state === "active" ? "step" : undefined}
                            className={`relative flex h-[56px] w-[60px] shrink-0 flex-col items-center justify-center gap-1 rounded-2xl border text-center transition duration-200 hover:-translate-y-0.5 active:scale-[0.98] ${dashboardJourneyStepStyles[step.state]}`}
                            href={step.href}
                            key={`${card.title}-${step.label}`}
                            title={`${card.title}: ${step.label}`}
                          >
                            <span className="text-base leading-none" aria-hidden="true">
                              {step.icon}
                            </span>
                            <span className="max-w-full truncate px-1 text-[8px] font-black uppercase tracking-[0.08em]">
                              {step.label}
                            </span>
                            {step.state === "complete" ? (
                              <span
                                className="absolute right-1 top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-300 text-[9px] font-black leading-none text-slate-950"
                                aria-hidden="true"
                              >
                                ✓
                              </span>
                            ) : null}
                          </Link>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>

          <div className="relative z-10 mt-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center justify-center gap-2 lg:justify-start">
              {dashboardNavigationCards.map((card, index) => {
                const isActive = index === activeCommandCenterIndex;

                return (
                  <button
                    aria-label={`Select ${card.title}`}
                    className={`h-2.5 rounded-full transition-all duration-300 ${
                      isActive
                        ? "w-8 bg-cyan-200 shadow-[0_0_14px_rgba(34,211,238,0.55)]"
                        : "w-2.5 bg-white/18 hover:bg-white/36"
                    }`}
                    key={`${card.title}-dot`}
                    onClick={() => setActiveCommandCenterIndex(index)}
                    type="button"
                  />
                );
              })}
            </div>

            <div className="flex flex-col gap-3 rounded-[26px] border border-white/10 bg-white/[0.035] p-3 sm:flex-row sm:items-center sm:justify-between lg:min-w-[440px]">
              <div className="min-w-0">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                  Selected Command Center
                </div>
                <div className="mt-1 flex items-center gap-2 text-sm font-black text-white">
                  <span aria-hidden="true">{activeCommandCenter.icon}</span>
                  <span className="truncate">{activeCommandCenter.title}</span>
                </div>
              </div>
              <Link
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-cyan-200/35 bg-cyan-300/14 px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-cyan-50 shadow-[0_0_24px_rgba(34,211,238,0.16)] transition hover:-translate-y-0.5 hover:bg-cyan-300/20 active:scale-[0.98]"
                href={activeCommandCenter.href}
              >
                Open Command Center
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </section>

        <section className="mb-4 overflow-hidden rounded-[24px] border border-white/10 bg-[radial-gradient(circle_at_12%_0%,rgba(34,211,238,0.12),transparent_34%),linear-gradient(135deg,rgba(15,23,42,0.72),rgba(2,6,23,0.62))] p-3 shadow-2xl shadow-black/15 backdrop-blur sm:p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0 lg:max-w-[360px]">
              <div className="text-[11px] font-black uppercase tracking-[0.24em] text-cyan-300">
                Weekly Snapshot
              </div>
              <h2 className="mt-1 text-xl font-black tracking-tight">
                Today&apos;s command panel
              </h2>
              <p className="mt-1 line-clamp-2 text-xs font-semibold leading-5 text-slate-400">
                Workouts, nutrition, readiness, and performance stay visible
                without relying on a fragile chart dependency.
              </p>
            </div>

            <div className="flex min-w-0 gap-2 overflow-x-auto overscroll-x-contain pb-1 scroll-smooth [scrollbar-color:rgba(34,211,238,0.36)_rgba(15,23,42,0.72)] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-cyan-300/38 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-slate-950/70">
              {[
                ["Workouts", `${dashboardSummary.workoutsThisWeek} this week`],
                [
                  "Weekly Volume",
                  `${Math.round(dashboardSummary.totalVolume).toLocaleString()} lb`,
                ],
                [
                  "Recovery",
                  dashboardSummary.totalSets > 30 ? "Manage heat" : "Ready to build",
                ],
                [
                  "Performance",
                  dashboardSummary.hasStats ? "Trend active" : "Start logging",
                ],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="min-w-[152px] flex-1 rounded-2xl border border-white/10 bg-slate-950/50 px-3 py-2.5"
                >
                  <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                    {label}
                  </div>
                  <div className="mt-1 truncate text-base font-black text-white">
                    {value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

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
