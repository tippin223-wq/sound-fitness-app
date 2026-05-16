"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import {
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  SoundLogoAchievementBadge,
  type AchievementBadgeItem,
} from "@/components/dashboard/SoundAchievementBadgeRow";
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
import { supabase } from "@/lib/supabaseClient";
import type { LocalExerciseStatEntry } from "@/types";

type PlanMode = "coach" | "custom" | "hybrid";

type SourceResult = {
  source: "supabase" | "localStorage";
  error: string | null;
};

type RecentWorkoutSummary = {
  bodyFocus: string[];
  id: string;
  date: string;
  equipment: string[];
  exerciseCount: number;
  latestExercise: string;
  movements: {
    body?: string;
    equipment?: string;
    loadLabel: string;
    name: string;
    pattern?: string;
    repsLabel: string;
    sets: number;
  }[];
  patterns: string[];
  title: string;
  topLoad: number;
  totalReps: number;
  totalSets: number;
  totalVolume: number;
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

const parseLoggedNumber = (value?: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

const formatLoggedLabel = (value?: string) =>
  value
    ? value
        .replace(/[-_]/g, " ")
        .replace(/\b\w/g, (letter) => letter.toUpperCase())
    : "";

const formatCompactNumber = (value: number) =>
  Number.isInteger(value) ? String(value) : value.toFixed(1);

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
      const movementMap = sortedGroup.reduce<
        Map<
          string,
          {
            body?: string;
            equipment?: string;
            name: string;
            pattern?: string;
            reps: Set<number>;
            sets: number;
            topLoad: number;
          }
        >
      >((acc, entry) => {
        const name = entry.exerciseName || "Workout movement";
        const current =
          acc.get(name) ||
          {
            body: formatLoggedLabel(entry.body),
            equipment: formatLoggedLabel(entry.equipment),
            name,
            pattern: formatLoggedLabel(entry.pattern),
            reps: new Set<number>(),
            sets: 0,
            topLoad: 0,
          };
        const sets = parseLoggedNumber(entry.sets);
        const reps = parseLoggedNumber(entry.reps);
        const weight = parseLoggedNumber(entry.weight);

        current.sets += sets;
        if (reps > 0) current.reps.add(reps);
        current.topLoad = Math.max(current.topLoad, weight);

        acc.set(name, current);
        return acc;
      }, new Map());
      const movements = Array.from(movementMap.values()).map((movement) => {
        const reps = Array.from(movement.reps).sort((a, b) => a - b);
        const repsLabel =
          reps.length === 0
            ? "Reps not logged"
            : reps.length === 1
              ? `${formatCompactNumber(reps[0])} reps`
              : `${formatCompactNumber(reps[0])}-${formatCompactNumber(
                  reps[reps.length - 1],
                )} reps`;

        return {
          body: movement.body,
          equipment: movement.equipment,
          loadLabel:
            movement.topLoad > 0
              ? `${formatCompactNumber(movement.topLoad)} lb`
              : "Bodyweight / unweighted",
          name: movement.name,
          pattern: movement.pattern,
          repsLabel,
          sets: movement.sets,
        };
      });
      const totalSets = sortedGroup.reduce(
        (sum, entry) => sum + parseLoggedNumber(entry.sets),
        0,
      );
      const totalReps = sortedGroup.reduce(
        (sum, entry) =>
          sum +
          parseLoggedNumber(entry.sets) * parseLoggedNumber(entry.reps),
        0,
      );
      const totalVolume = sortedGroup.reduce(
        (sum, entry) =>
          sum +
          parseLoggedNumber(entry.sets) *
            parseLoggedNumber(entry.reps) *
            parseLoggedNumber(entry.weight),
        0,
      );
      const topLoad = sortedGroup.reduce(
        (max, entry) => Math.max(max, parseLoggedNumber(entry.weight)),
        0,
      );
      const patterns = Array.from(
        new Set(sortedGroup.map((entry) => formatLoggedLabel(entry.pattern)).filter(Boolean)),
      );
      const equipment = Array.from(
        new Set(sortedGroup.map((entry) => formatLoggedLabel(entry.equipment)).filter(Boolean)),
      );
      const bodyFocus = Array.from(
        new Set(sortedGroup.map((entry) => formatLoggedLabel(entry.body)).filter(Boolean)),
      );

      return {
        bodyFocus,
        id: `${date}-${exerciseNames.join("-")}`,
        date,
        equipment,
        title:
          exerciseNames.length === 1
            ? exerciseNames[0]
            : `${exerciseNames.length} movement workout`,
        exerciseCount: exerciseNames.length,
        latestExercise: latest?.exerciseName || "Workout",
        movements,
        patterns,
        topLoad,
        totalReps,
        totalSets,
        totalVolume,
        exerciseNames,
      };
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 3);
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

type WorkoutJourneyStageStatus =
  | "Complete"
  | "Current"
  | "Next"
  | "Unlocked"
  | "Locked";

type WorkoutJourneyStage = {
  helper: string;
  href: string;
  icon: string;
  nextAction: string;
  progress: number;
  status: WorkoutJourneyStageStatus;
  title: string;
};

const UPPER_TRAINING_JOURNEY_TITLES = new Set([
  "Insights",
  "Performance",
  "Achievements",
]);

const TRAINING_JOURNEY_LAYER_SIZE = 5;
const TRAINING_JOURNEY_HERO_LAYER = -1;
const TRAINING_JOURNEY_LAYER_SPACING = 520;

const heroAchievementOrbitSlots = [
  { blur: 0, opacity: 1, rotateY: 0, scale: 1, x: 0, y: 0, zIndex: 42 },
  { blur: 0.2, opacity: 0.76, rotateY: -14, scale: 0.82, x: 280, y: 18, zIndex: 30 },
  { blur: 1.1, opacity: 0.34, rotateY: -28, scale: 0.62, x: 455, y: 42, zIndex: 16 },
  { blur: 2.1, opacity: 0.12, rotateY: -42, scale: 0.46, x: 610, y: 70, zIndex: 8 },
];

const workoutJourneyStatusStyles: Record<
  WorkoutJourneyStageStatus,
  {
    badge: string;
    card: string;
    connector: string;
    marker: string;
  }
> = {
  Complete: {
    badge: "border-emerald-300/25 bg-emerald-300/10 text-emerald-100",
    card:
      "border-emerald-300/30 bg-emerald-300/10 text-emerald-50 shadow-[0_0_24px_rgba(16,185,129,0.12)]",
    connector: "from-emerald-300/55 to-cyan-300/24",
    marker: "border-emerald-200/45 bg-emerald-300 text-slate-950",
  },
  Current: {
    badge: "border-cyan-200/35 bg-cyan-300/14 text-cyan-50",
    card:
      "border-cyan-200/55 bg-cyan-300/14 text-cyan-50 shadow-[0_0_38px_rgba(34,211,238,0.24)] ring-1 ring-cyan-200/20",
    connector: "from-cyan-300/70 to-amber-200/36",
    marker:
      "border-cyan-100/70 bg-cyan-300 text-slate-950 shadow-[0_0_24px_rgba(34,211,238,0.34)]",
  },
  Next: {
    badge: "border-amber-300/28 bg-amber-300/12 text-amber-100",
    card:
      "border-amber-300/30 bg-amber-300/9 text-amber-50 shadow-[0_0_24px_rgba(251,191,36,0.12)]",
    connector: "from-amber-300/42 to-white/12",
    marker: "border-amber-200/45 bg-amber-300/18 text-amber-100",
  },
  Unlocked: {
    badge: "border-white/10 bg-white/[0.045] text-slate-300",
    card:
      "border-white/10 bg-slate-950/58 text-slate-300 hover:border-cyan-200/32 hover:bg-cyan-300/8 hover:text-white",
    connector: "from-white/14 to-white/8",
    marker: "border-white/12 bg-slate-950/72 text-slate-300",
  },
  Locked: {
    badge: "border-white/10 bg-white/[0.03] text-slate-500",
    card:
      "border-white/10 bg-white/[0.025] text-slate-500 opacity-65 hover:opacity-85",
    connector: "from-white/10 to-white/5",
    marker: "border-white/10 bg-slate-950/70 text-slate-500",
  },
};

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
  const [activeTrainingJourneyLayer, setActiveTrainingJourneyLayer] =
    useState(TRAINING_JOURNEY_HERO_LAYER);
  const [
    activeTrainingJourneyPositions,
    setActiveTrainingJourneyPositions,
  ] = useState([1, 0]);
  const [activeHeroAchievementIndex, setActiveHeroAchievementIndex] =
    useState(0);
  const trainingJourneyPointerStartRef = useRef<{
    x: number;
    y: number;
  } | null>(null);
  const trainingJourneyPointerMovedRef = useRef(false);
  const trainingJourneyOrbitRef = useRef<HTMLDivElement | null>(null);
  const trainingJourneyWheelCaptureRef = useRef(false);
  const trainingJourneyWheelLockRef = useRef(0);
  const sessionsDashboardPointerStartRef = useRef<number | null>(null);
  const sessionsDashboardPointerMovedRef = useRef(false);
  const heroAchievementPointerStartRef = useRef<number | null>(null);
  const heroAchievementPointerMovedRef = useRef(false);
  const heroAchievementWheelLockRef = useRef(0);
  const profileHubLayerWheelGestureRef = useRef(false);
  const profileHubLayerWheelResetRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionsProfileHubRef = useRef<HTMLDivElement | null>(null);
  const sessionsProfileHubOverlayRef = useRef<HTMLDivElement | null>(null);
  const sessionsProfileLayerPointerStartRef = useRef<{
    x: number;
    y: number;
  } | null>(null);
  const sessionsProfileLayerPointerMovedRef = useRef(false);
  const sessionsHubOrbitPointerStartRef = useRef<number | null>(null);
  const sessionsHubOrbitPointerMovedRef = useRef(false);
  const sessionsAccountOrbitPointerStartRef = useRef<number | null>(null);
  const sessionsAccountOrbitPointerMovedRef = useRef(false);
  const recentSessionsScrollRef = useRef<HTMLDivElement | null>(null);
  const recentSessionsScrollDragRef = useRef({
    isDragging: false,
    moved: false,
    scrollLeft: 0,
    startX: 0,
  });
  const [activeSessionsDashboardIndex, setActiveSessionsDashboardIndex] =
    useState(0);
  const [
    sessionsDashboardSlideDirection,
    setSessionsDashboardSlideDirection,
  ] = useState<"left" | "right">("right");
  const [activeSessionsHubIndex, setActiveSessionsHubIndex] = useState(0);
  const [activeSessionsAccountIndex, setActiveSessionsAccountIndex] =
    useState(0);
  const [activeSessionsProfileLayer, setActiveSessionsProfileLayer] =
    useState(0);
  const [sessionsProfileHubOpen, setSessionsProfileHubOpen] = useState(false);
  const [openSessionsProfileDetailKey, setOpenSessionsProfileDetailKey] =
    useState<string | null>(null);

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

  const workoutRewardStats = useMemo(() => {
    const dateKeys = Array.from(
      new Set(
        workoutLogEntries
          .map((entry) => {
            const date = new Date(entry.date);
            return Number.isNaN(date.getTime())
              ? ""
              : date.toISOString().slice(0, 10);
          })
          .filter(Boolean),
      ),
    );
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const trainingStreak = dateKeys.filter((dateKey) => {
      const timestamp = new Date(`${dateKey}T00:00:00`).getTime();
      return Number.isFinite(timestamp) && timestamp >= sevenDaysAgo;
    }).length;

    return {
      soundPoints: 12450 + workoutStats.loggedEntries * 85 + workoutStats.totalSets * 12,
      soundTokens: 88 + Math.floor(workoutStats.totalSets / 12),
      trainingStreak: Math.max(1, Math.min(7, trainingStreak || active.used)),
      workoutXp: 2400 + workoutStats.totalSets * 24 + savedTemplates.length * 120,
    };
  }, [
    active.used,
    savedTemplates.length,
    workoutLogEntries,
    workoutStats.loggedEntries,
    workoutStats.totalSets,
  ]);

  const workoutJourneyStages: WorkoutJourneyStage[] = useMemo(() => {
    const hasTemplates = savedTemplates.length > 0;
    const hasLogs = workoutStats.loggedEntries > 0;
    const hasActiveSession = Boolean(activeSessionTemplate?.exercises.length);
    const builderProgress = hasTemplates ? 100 : 55;
    const historyProgress = hasLogs
      ? Math.min(100, 42 + workoutStats.loggedEntries * 4)
      : hasActiveSession
        ? 72
        : hasTemplates
          ? 38
          : 12;
    const historyStatus: WorkoutJourneyStageStatus =
      hasLogs || hasActiveSession || hasTemplates ? "Current" : "Next";

    return [
      {
        title: "Profile + Goals",
        helper: "Profile setup, body metrics, readiness, goals, style, and experience drive everything downstream.",
        href: ROUTES.dashboard.profile,
        icon: "👤",
        nextAction: "Open foundation",
        progress: 92,
        status: "Complete",
      },
      {
        title: "My Plan",
        helper: "Periodization, phases, weekly structure, and the active training block.",
        href: ROUTES.dashboard.myPlan,
        icon: "📅",
        nextAction: "Open plan",
        progress: 76,
        status: "Complete",
      },
      {
        title: "Workout Builder",
        helper: "Workout creation, templates, session architecture, and movement selection.",
        href: ROUTES.workoutBuilder.home,
        icon: "🏋️",
        nextAction: hasTemplates ? "Use saved template" : "Build first template",
        progress: builderProgress,
        status: hasTemplates ? "Complete" : "Current",
      },
      {
        title: "Exercise Library",
        helper: "Movement discovery, anatomy systems, exercise references, and patterns.",
        href: ROUTES.dashboard.exerciseLibrary,
        icon: "📚",
        nextAction: "Browse movements",
        progress: hasTemplates ? 70 : 46,
        status: "Unlocked",
      },
      {
        title: "Session History",
        helper: "Completed workouts, logs, adherence, streaks, and repeatable sessions.",
        href: ROUTES.dashboard.sessionHistory,
        icon: "▶",
        nextAction: hasLogs ? "Review logs" : "Start first log",
        progress: historyProgress,
        status: historyStatus,
      },
      {
        title: "Insights",
        helper: "Analytics, trends, recommendations, AI feedback, and coaching signals.",
        href: ROUTES.dashboard.insights,
        icon: "🧠",
        nextAction: hasLogs ? "Open insights" : "Unlock insights",
        progress: hasLogs ? 42 : 0,
        status: hasLogs ? "Unlocked" : "Locked",
      },
      {
        title: "Performance",
        helper: "Strength metrics, cardio, speed, athletic testing, and progression.",
        href: ROUTES.performance.home,
        icon: "⚡",
        nextAction: "Open performance",
        progress: hasLogs ? 36 : 12,
        status: hasLogs ? "Unlocked" : "Locked",
      },
      {
        title: "Achievements",
        helper: "Badges, milestones, streaks, Sound Points, and workout rewards.",
        href: ROUTES.dashboard.achievements,
        icon: "🏆",
        nextAction: "View badges",
        progress: Math.min(100, 22 + workoutRewardStats.trainingStreak * 9),
        status: "Unlocked",
      },
    ];
  }, [
    activeSessionTemplate,
    savedTemplates.length,
    workoutRewardStats.trainingStreak,
    workoutStats.loggedEntries,
  ]);

  const workoutJourneyProgress = Math.round(
    workoutJourneyStages.reduce((total, stage) => total + stage.progress, 0) /
      workoutJourneyStages.length,
  );
  const currentWorkoutStage =
    workoutJourneyStages.find((stage) => stage.status === "Current") ||
    workoutJourneyStages[0];
  const workoutAchievements: AchievementBadgeItem[] = [
    {
      category: "volume",
      href: ROUTES.dashboard.achievements,
      icon: "🏋️",
      label: "Volume Milestone",
      meta: `${workoutStats.totalSets} total sets`,
      progress: Math.min(100, Math.max(35, workoutStats.totalSets * 2)),
      rarity: workoutStats.totalSets >= 50 ? "gold" : "cyan",
      status: workoutStats.totalSets >= 50 ? "completed" : "active",
      statusLabel: workoutStats.totalSets >= 50 ? "Earned" : "In progress",
    },
    {
      category: "streak",
      href: ROUTES.dashboard.achievements,
      icon: "🔥",
      label: "7 Day Training Streak",
      meta: `${workoutRewardStats.trainingStreak} day streak`,
      progress: Math.min(100, Math.round((workoutRewardStats.trainingStreak / 7) * 100)),
      rarity: "gold",
      status: workoutRewardStats.trainingStreak >= 7 ? "completed" : "active",
      statusLabel: workoutRewardStats.trainingStreak >= 7 ? "Earned" : "In progress",
    },
    {
      category: "volume",
      href: ROUTES.dashboard.achievements,
      icon: "💪",
      label: "Push Strength Up",
      meta: "Upper body progress",
      progress: 64,
      rarity: "cyan",
      status: "active",
      statusLabel: "In progress",
    },
    {
      category: "volume",
      href: ROUTES.dashboard.achievements,
      icon: "🦵",
      label: "Leg Day Completed",
      meta: "Lower body session",
      progress: workoutStats.loggedEntries ? 100 : 0,
      rarity: "gold",
      status: workoutStats.loggedEntries ? "completed" : "locked",
      statusLabel: workoutStats.loggedEntries ? "Earned" : "Locked",
    },
    {
      category: "performance",
      href: ROUTES.dashboard.achievements,
      icon: "⚡",
      label: "PR Achieved",
      meta: "Performance marker",
      progress: 48,
      rarity: "cyan",
      status: "active",
      statusLabel: "In progress",
    },
    {
      category: "goal",
      href: ROUTES.dashboard.achievements,
      icon: "🎯",
      label: "Program Consistency",
      meta: activePlan.weeklyTarget,
      progress: Math.min(100, percentUsed),
      rarity: percentUsed >= 80 ? "gold" : "bronze",
      status: percentUsed >= 80 ? "completed" : "active",
      statusLabel: percentUsed >= 80 ? "Earned" : "In progress",
    },
    {
      category: "performance",
      href: ROUTES.dashboard.achievements,
      icon: "🧠",
      label: "Perfect Form Week",
      meta: "Clean execution",
      progress: 24,
      rarity: "silver",
      status: "locked",
      statusLabel: "Locked",
    },
    {
      category: "performance",
      href: ROUTES.dashboard.achievements,
      icon: "🏃",
      label: "Conditioning Complete",
      meta: "Engine session",
      progress: 18,
      rarity: "bronze",
      status: "locked",
      statusLabel: "Locked",
    },
  ];
  const recentProfileHubAchievement =
    [...workoutAchievements]
      .reverse()
      .find((achievement) => achievement.status === "completed") ||
    workoutAchievements.find((achievement) => achievement.status === "active") ||
    workoutAchievements[0];
  const recentProfileHubAchievementProgress = Math.min(
    100,
    Math.max(
      0,
      recentProfileHubAchievement.progress ??
        (recentProfileHubAchievement.status === "completed"
          ? 100
          : recentProfileHubAchievement.status === "locked"
            ? 0
            : 50),
    ),
  );
  const heroAchievementCount = workoutAchievements.length;
  const rotateHeroAchievement = (direction: "left" | "right") => {
    if (heroAchievementCount < 2) return;

    setActiveHeroAchievementIndex((currentIndex) =>
      direction === "left"
        ? (currentIndex - 1 + heroAchievementCount) % heroAchievementCount
        : (currentIndex + 1) % heroAchievementCount,
    );
  };
  const startHorizontalOrbitDrag = (
    event: ReactPointerEvent<HTMLElement>,
    startRef: { current: number | null },
    movedRef: { current: boolean },
    stopPropagation = true,
  ) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;

    if (stopPropagation) {
      event.stopPropagation();
    }
    startRef.current = event.clientX;
    movedRef.current = false;
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const moveHorizontalOrbitDrag = (
    event: ReactPointerEvent<HTMLElement>,
    startRef: { current: number | null },
    movedRef: { current: boolean },
    rotate: (direction: "left" | "right") => void,
    threshold = 72,
  ) => {
    const startX = startRef.current;
    if (startX === null) return;

    const deltaX = event.clientX - startX;
    if (Math.abs(deltaX) < threshold) return;

    event.preventDefault();
    event.stopPropagation();
    movedRef.current = true;
    rotate(deltaX > 0 ? "left" : "right");
    startRef.current = null;
  };
  const finishHorizontalOrbitDrag = (
    event: ReactPointerEvent<HTMLElement>,
    startRef: { current: number | null },
  ) => {
    startRef.current = null;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    }
  };
  const startHorizontalScrollDrag = (
    event: ReactPointerEvent<HTMLDivElement>,
    scrollRef: { current: HTMLDivElement | null },
    dragRef: {
      current: {
        isDragging: boolean;
        moved: boolean;
        scrollLeft: number;
        startX: number;
      };
    },
  ) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;

    const node = scrollRef.current;
    if (!node) return;

    dragRef.current = {
      isDragging: true,
      moved: false,
      scrollLeft: node.scrollLeft,
      startX: event.clientX,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const moveHorizontalScrollDrag = (
    event: ReactPointerEvent<HTMLDivElement>,
    scrollRef: { current: HTMLDivElement | null },
    dragRef: {
      current: {
        isDragging: boolean;
        moved: boolean;
        scrollLeft: number;
        startX: number;
      };
    },
  ) => {
    const node = scrollRef.current;
    if (!node || !dragRef.current.isDragging) return;

    const deltaX = event.clientX - dragRef.current.startX;
    if (Math.abs(deltaX) < 3) return;

    event.preventDefault();
    dragRef.current.moved = true;
    node.scrollLeft = dragRef.current.scrollLeft - deltaX;
  };
  const finishHorizontalScrollDrag = (
    event: ReactPointerEvent<HTMLDivElement>,
    dragRef: {
      current: {
        isDragging: boolean;
        moved: boolean;
        scrollLeft: number;
        startX: number;
      };
    },
  ) => {
    dragRef.current.isDragging = false;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
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
  const upperTrainingJourneyStages = useMemo(
    () =>
      workoutJourneyStages.filter((stage) =>
        UPPER_TRAINING_JOURNEY_TITLES.has(stage.title),
      ),
    [workoutJourneyStages],
  );
  const foundationTrainingJourneyStages = useMemo(
    () =>
      workoutJourneyStages.filter((stage) => stage.title === "Profile + Goals"),
    [workoutJourneyStages],
  );
  const mainTrainingJourneyStages = useMemo(
    () =>
      workoutJourneyStages.filter(
        (stage) =>
          stage.title !== "Profile + Goals" &&
          !UPPER_TRAINING_JOURNEY_TITLES.has(stage.title),
      ),
    [workoutJourneyStages],
  );
  const combinedTrainingJourneyStages = useMemo(
    () => [
      ...foundationTrainingJourneyStages,
      ...mainTrainingJourneyStages,
      ...upperTrainingJourneyStages,
    ],
    [
      foundationTrainingJourneyStages,
      mainTrainingJourneyStages,
      upperTrainingJourneyStages,
    ],
  );
  const totalTrainingJourneyLayers = Math.max(
    1,
    Math.ceil(combinedTrainingJourneyStages.length / TRAINING_JOURNEY_LAYER_SIZE),
  );
  const isTrainingJourneyHeroActive =
    activeTrainingJourneyLayer === TRAINING_JOURNEY_HERO_LAYER;
  const trainingJourneyHeroOffset =
    (TRAINING_JOURNEY_HERO_LAYER - activeTrainingJourneyLayer) *
    TRAINING_JOURNEY_LAYER_SPACING;
  const trainingJourneyHeroOpacity = isTrainingJourneyHeroActive
    ? 1
    : activeTrainingJourneyLayer === 0
      ? 0.22
      : 0;
  const activeTrainingJourneyPosition =
    activeTrainingJourneyLayer >= 0
      ? activeTrainingJourneyPositions[activeTrainingJourneyLayer] || 0
      : 0;
  const activeTrainingJourneyIndex = activeTrainingJourneyLayer >= 0
    ? Math.min(
        activeTrainingJourneyLayer * TRAINING_JOURNEY_LAYER_SIZE +
          activeTrainingJourneyPosition,
        Math.max(0, combinedTrainingJourneyStages.length - 1),
      )
    : -1;
  const activeTrainingJourneyStage =
    combinedTrainingJourneyStages[activeTrainingJourneyIndex] ||
    combinedTrainingJourneyStages[0] ||
    workoutJourneyStages[0];
  const getTrainingJourneyLayer = (index: number) =>
    Math.floor(index / TRAINING_JOURNEY_LAYER_SIZE);
  const getTrainingJourneyLayerSize = (layer: number) =>
    Math.max(
      1,
      Math.min(
        TRAINING_JOURNEY_LAYER_SIZE,
        combinedTrainingJourneyStages.length -
          layer * TRAINING_JOURNEY_LAYER_SIZE,
      ),
    );
  const getTrainingJourneyOrbitDistance = (index: number) => {
    const stageLayer = getTrainingJourneyLayer(index);
    const layerSize = getTrainingJourneyLayerSize(stageLayer);
    const activePosition = Math.min(
      activeTrainingJourneyPositions[stageLayer] || 0,
      layerSize - 1,
    );
    const stagePosition = index % TRAINING_JOURNEY_LAYER_SIZE;
    const rawDistance = stagePosition - activePosition;

    return rawDistance;
  };
  const getTrainingJourneyLayerOffset = (index: number) =>
    getTrainingJourneyLayer(index) - activeTrainingJourneyLayer;
  const rotateTrainingJourney = (
    direction: "left" | "right" | "up" | "down",
  ) => {
    if (!combinedTrainingJourneyStages.length) return;

    if (direction === "up" || direction === "down") {
      setActiveTrainingJourneyLayer((currentLayer) =>
        direction === "up"
          ? Math.max(TRAINING_JOURNEY_HERO_LAYER, currentLayer - 1)
          : Math.min(totalTrainingJourneyLayers - 1, currentLayer + 1),
      );
      return;
    }

    if (activeTrainingJourneyLayer < 0) return;

    setActiveTrainingJourneyPositions((currentPositions) => {
      const layerSize = getTrainingJourneyLayerSize(activeTrainingJourneyLayer);
      const currentPosition = Math.min(
        currentPositions[activeTrainingJourneyLayer] || 0,
        layerSize - 1,
      );
      const nextPosition =
        direction === "left"
          ? currentPosition - 1
          : currentPosition + 1;
      const nextPositions = [...currentPositions];

      nextPositions[activeTrainingJourneyLayer] = Math.max(
        0,
        Math.min(layerSize - 1, nextPosition),
      );

      return nextPositions;
    });
  };
  const handleTrainingJourneyPointerDown = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;

    trainingJourneyPointerStartRef.current = {
      x: event.clientX,
      y: event.clientY,
    };
    trainingJourneyPointerMovedRef.current = false;
    trainingJourneyWheelCaptureRef.current = true;
    event.currentTarget.focus({ preventScroll: true });
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const handleTrainingJourneyPointerMove = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    const start = trainingJourneyPointerStartRef.current;
    if (!start) return;

    const deltaX = event.clientX - start.x;
    const deltaY = event.clientY - start.y;
    const horizontalIntent = Math.abs(deltaX) > Math.abs(deltaY) * 1.1;
    const primaryDelta = horizontalIntent ? deltaX : deltaY;
    const movementThreshold = horizontalIntent ? 48 : 118;
    if (Math.abs(primaryDelta) < movementThreshold) return;

    event.preventDefault();
    event.stopPropagation();
    trainingJourneyPointerMovedRef.current = true;
    rotateTrainingJourney(
      horizontalIntent
        ? deltaX > 0
          ? "left"
          : "right"
        : deltaY > 0
          ? "up"
          : "down",
    );
    trainingJourneyPointerStartRef.current = horizontalIntent
      ? {
          x: event.clientX,
          y: event.clientY,
        }
      : null;
  };
  const handleTrainingJourneyPointerUp = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    const start = trainingJourneyPointerStartRef.current;
    trainingJourneyPointerStartRef.current = null;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    }

    if (!start) {
      return;
    }

    if (trainingJourneyPointerMovedRef.current) {
      return;
    }

    const deltaX = event.clientX - start.x;
    const deltaY = event.clientY - start.y;
    const horizontalIntent = Math.abs(deltaX) > Math.abs(deltaY) * 1.1;
    const primaryDelta = horizontalIntent ? deltaX : deltaY;

    const releaseThreshold = horizontalIntent ? 36 : 92;
    if (Math.abs(primaryDelta) < releaseThreshold) {
      return;
    }

    trainingJourneyPointerMovedRef.current = true;
    rotateTrainingJourney(
      horizontalIntent
        ? deltaX > 0
          ? "left"
          : "right"
        : deltaY > 0
          ? "up"
          : "down",
    );
  };
  const handleTrainingJourneyKeyDown = (
    event: ReactKeyboardEvent<HTMLDivElement>,
  ) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      rotateTrainingJourney("left");
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      rotateTrainingJourney("right");
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      rotateTrainingJourney("up");
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      rotateTrainingJourney("down");
    }
  };
  const handleTrainingJourneyWheel = (
    event: ReactWheelEvent<HTMLDivElement>,
  ) => {
    const horizontalIntent =
      Math.abs(event.deltaX) > Math.abs(event.deltaY) || event.shiftKey;
    const primaryDelta = horizontalIntent
      ? event.shiftKey && Math.abs(event.deltaY) >= Math.abs(event.deltaX)
        ? event.deltaY
        : event.deltaX
      : event.deltaY;

    const captured =
      trainingJourneyWheelCaptureRef.current ||
      (typeof document !== "undefined" &&
        event.currentTarget.contains(document.activeElement));

    const wheelThreshold = horizontalIntent ? 18 : 46;
    if (Math.abs(primaryDelta) < wheelThreshold) {
      if (captured) event.preventDefault();
      return;
    }

    const direction = horizontalIntent
      ? primaryDelta > 0
        ? "right"
        : "left"
      : primaryDelta > 0
        ? "down"
        : "up";
    const atTop =
      direction === "up" &&
      activeTrainingJourneyLayer <= TRAINING_JOURNEY_HERO_LAYER;
    const atBottom =
      direction === "down" &&
      activeTrainingJourneyLayer >= totalTrainingJourneyLayers - 1;
    const inactiveHorizontal =
      (direction === "left" || direction === "right") &&
      activeTrainingJourneyLayer < 0;

    event.preventDefault();
    if (captured) event.stopPropagation();

    if (atTop || atBottom || inactiveHorizontal) return;

    const now = Date.now();
    const wheelLockMs = horizontalIntent ? 360 : 820;
    if (now - trainingJourneyWheelLockRef.current < wheelLockMs) return;

    trainingJourneyWheelLockRef.current = now;
    rotateTrainingJourney(direction);
  };

  useEffect(() => {
    if (!combinedTrainingJourneyStages.length) return;

    setActiveTrainingJourneyLayer((currentLayer) =>
      Math.min(currentLayer, totalTrainingJourneyLayers - 1),
    );
    setActiveTrainingJourneyPositions((currentPositions) => {
      const nextPositions = [...currentPositions];

      for (let layer = 0; layer < totalTrainingJourneyLayers; layer += 1) {
        const layerSize = Math.max(
          1,
          Math.min(
            TRAINING_JOURNEY_LAYER_SIZE,
            combinedTrainingJourneyStages.length -
              layer * TRAINING_JOURNEY_LAYER_SIZE,
          ),
        );

        nextPositions[layer] = Math.min(
          nextPositions[layer] || 0,
          layerSize - 1,
        );
      }

      return nextPositions;
    });
  }, [combinedTrainingJourneyStages.length, totalTrainingJourneyLayers]);

  useEffect(() => {
    const node = trainingJourneyOrbitRef.current;
    if (!node) return;

    const preventSelectedOrbitScroll = (event: WheelEvent) => {
      if (!trainingJourneyWheelCaptureRef.current) return;
      if (Math.abs(event.deltaX) < 1 && Math.abs(event.deltaY) < 1) return;

      event.preventDefault();
    };

    node.addEventListener("wheel", preventSelectedOrbitScroll, {
      passive: false,
    });

    return () => {
      node.removeEventListener("wheel", preventSelectedOrbitScroll);
    };
  }, []);

  useEffect(() => {
    if (!sessionsProfileHubOpen) return;

    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      const clickedProfileTrigger =
        sessionsProfileHubRef.current?.contains(target) ?? false;
      const clickedProfileOverlay =
        sessionsProfileHubOverlayRef.current?.contains(target) ?? false;

      if (!clickedProfileTrigger && !clickedProfileOverlay) {
        setSessionsProfileHubOpen(false);
      }
    };
    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setSessionsProfileHubOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      profileHubLayerWheelGestureRef.current = false;
      if (profileHubLayerWheelResetRef.current) {
        clearTimeout(profileHubLayerWheelResetRef.current);
        profileHubLayerWheelResetRef.current = null;
      }
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [sessionsProfileHubOpen]);

  const sessionsOrbitDashboardLinks = [
    {
      href: ROUTES.dashboard.sessions,
      icon: "🏋️",
      label: "Workout",
      meta: "Sessions",
      points: workoutRewardStats.soundPoints,
      tone: "border-cyan-100/50 bg-cyan-300 text-slate-950 shadow-[0_0_26px_rgba(34,211,238,0.24)]",
    },
    {
      href: ROUTES.nutritionPortal.home,
      icon: "🍽️",
      label: "Nutrition",
      meta: "Fuel",
      points: Math.round(workoutRewardStats.soundPoints * 0.38),
      tone: "border-emerald-200/28 bg-emerald-300/10 text-emerald-100 hover:border-emerald-100/45 hover:bg-emerald-300/16",
    },
    {
      href: "/recovery",
      icon: "🧘",
      label: "Recovery",
      meta: "Readiness",
      points: Math.round(workoutRewardStats.soundPoints * 0.24),
      tone: "border-sky-200/28 bg-sky-300/10 text-sky-100 hover:border-sky-100/45 hover:bg-sky-300/16",
    },
    {
      href: ROUTES.performance.home,
      icon: "⚡",
      label: "Performance",
      meta: "Athletic",
      points: Math.round(workoutRewardStats.soundPoints * 0.46),
      tone: "border-amber-200/30 bg-amber-300/10 text-amber-100 hover:border-amber-100/45 hover:bg-amber-300/16",
    },
    {
      href: ROUTES.learning.home,
      icon: "📚",
      label: "Education",
      meta: "Learning",
      points: Math.round(workoutRewardStats.soundPoints * 0.12),
      tone: "border-violet-200/28 bg-violet-300/10 text-violet-100 hover:border-violet-100/45 hover:bg-violet-300/16",
    },
    {
      href: ROUTES.soundworld.home,
      icon: "🌎",
      label: "Sound World",
      meta: "Community",
      points: Math.round(workoutRewardStats.soundPoints * 0.08),
      tone: "border-pink-200/28 bg-pink-300/10 text-pink-100 hover:border-pink-100/45 hover:bg-pink-300/16",
    },
  ] as const;

  const activeSessionsDashboardLink =
    sessionsOrbitDashboardLinks[
      activeSessionsDashboardIndex % sessionsOrbitDashboardLinks.length
    ] || sessionsOrbitDashboardLinks[0];
  const rotateSessionsDashboardRail = (direction: "left" | "right") => {
    setSessionsDashboardSlideDirection(direction);
    setActiveSessionsDashboardIndex((currentIndex) =>
      direction === "left"
        ? (currentIndex - 1 + sessionsOrbitDashboardLinks.length) %
          sessionsOrbitDashboardLinks.length
        : (currentIndex + 1) % sessionsOrbitDashboardLinks.length,
    );
  };
  const scrollRecentSessions = (direction: "left" | "right") => {
    const row = recentSessionsScrollRef.current;
    if (!row) return;

    const cards = Array.from(row.children).filter(
      (child): child is HTMLElement => child instanceof HTMLElement,
    );
    if (!cards.length) return;

    const currentIndex = cards.reduce((nearestIndex, card, index) => {
      const currentDistance = Math.abs(card.offsetLeft - row.scrollLeft);
      const nearestDistance = Math.abs(
        cards[nearestIndex].offsetLeft - row.scrollLeft,
      );

      return currentDistance < nearestDistance ? index : nearestIndex;
    }, 0);
    const nextIndex =
      direction === "left"
        ? Math.max(0, currentIndex - 1)
        : Math.min(cards.length - 1, currentIndex + 1);

    row.scrollTo({
      behavior: "smooth",
      left: cards[nextIndex].offsetLeft,
    });
  };
  const sessionsHubOrbitItems = [
    {
      href: ROUTES.dashboard.stats,
      helper: "Progress, PRs, and training trends.",
      icon: "📈",
      label: "Stats",
      references: [
        `${workoutStats.loggedEntries} logged entries`,
        `${workoutStats.totalSets} total sets`,
        `Latest: ${workoutStats.latestExercise}`,
      ],
      stat: workoutStats.latestDate || "Ready to track",
      tone: "border-cyan-200/24 bg-cyan-300/10 text-cyan-100",
    },
    {
      href: ROUTES.dashboard.goals,
      helper: "Outcomes and training direction.",
      icon: "🎯",
      label: "Goals",
      references: [
        activePlan.primaryFocus,
        activePlan.secondaryFocus,
        activePlan.goal,
      ],
      stat: activePlan.phase,
      tone: "border-amber-200/26 bg-amber-300/10 text-amber-100",
    },
    {
      href: ROUTES.dashboard.insights,
      helper: "Coach intelligence and next actions.",
      icon: "🧠",
      label: "Insights",
      references: [
        currentWorkoutStage.title,
        `${workoutJourneyProgress}% journey`,
        activePlan.recovery,
      ],
      stat: currentWorkoutStage.status,
      tone: "border-violet-200/24 bg-violet-300/10 text-violet-100",
    },
    {
      href: ROUTES.dashboard.plan,
      helper: "Weekly structure and templates.",
      icon: "📅",
      label: "Plan",
      references: [
        activePlan.title,
        activePlan.split,
        activePlan.weeklyTarget,
      ],
      stat: activePlan.type,
      tone: "border-sky-200/24 bg-sky-300/10 text-sky-100",
    },
    {
      href: ROUTES.dashboard.achievements,
      helper: "Milestones, badges, and wins.",
      icon: "🏆",
      label: "Achievements",
      references: [
        `${workoutRewardStats.soundPoints.toLocaleString()} points`,
        `${workoutRewardStats.trainingStreak} day streak`,
        `${workoutRewardStats.soundTokens.toLocaleString()} tokens`,
      ],
      stat: `${workoutRewardStats.workoutXp.toLocaleString()} XP`,
      tone: "border-orange-200/24 bg-orange-300/10 text-orange-100",
    },
    {
      href: ROUTES.dashboard.coachMessaging,
      helper: "Coach messages and questions.",
      icon: "💬",
      label: "Messages",
      references: [
        activePlan.rule,
        activePlan.note,
        "Coach context ready",
      ],
      stat: "Coach channel",
      tone: "border-emerald-200/24 bg-emerald-300/10 text-emerald-100",
    },
  ] as const;
  const rotateSessionsHubOrbit = (direction: "left" | "right") => {
    setActiveSessionsHubIndex((currentIndex) =>
      direction === "left"
        ? (currentIndex - 1 + sessionsHubOrbitItems.length) %
          sessionsHubOrbitItems.length
        : (currentIndex + 1) % sessionsHubOrbitItems.length,
    );
  };
  const getSessionsHubOrbitDistance = (index: number) => {
    const rawDistance = index - activeSessionsHubIndex;

    if (rawDistance > sessionsHubOrbitItems.length / 2) {
      return rawDistance - sessionsHubOrbitItems.length;
    }

    if (rawDistance < -sessionsHubOrbitItems.length / 2) {
      return rawDistance + sessionsHubOrbitItems.length;
    }

    return rawDistance;
  };
  const sessionsAccountOrbitItems = [
    {
      href: ROUTES.dashboard.profile,
      helper: "Update profile, body metrics, preferences, and avatar.",
      icon: "👤",
      label: "Edit Profile",
      references: [
        "Body metrics",
        "Training readiness",
        "Coach preferences",
      ],
      stat: "Profile sync",
      tone: "border-cyan-200/24 bg-cyan-300/10 text-cyan-100",
    },
    {
      href: ROUTES.dashboard.settings,
      helper: "App preferences and account controls.",
      icon: "⚙️",
      label: "Settings",
      references: [
        "Notifications",
        "Display controls",
        "Account security",
      ],
      stat: "Preferences",
      tone: "border-violet-200/24 bg-violet-300/10 text-violet-100",
    },
    {
      href: ROUTES.dashboard.payments,
      helper: "Payments and invoice history.",
      icon: "💳",
      label: "Billing",
      references: [
        active.name,
        `${remaining} sessions left`,
        active.price,
      ],
      stat: active.status,
      tone: "border-amber-200/24 bg-amber-300/10 text-amber-100",
    },
    {
      href: ROUTES.dashboard.help,
      helper: "Support, FAQs, and app guidance.",
      icon: "💬",
      label: "Help",
      references: [
        "Support center",
        "FAQs",
        "App guidance",
      ],
      stat: "Support",
      tone: "border-emerald-200/24 bg-emerald-300/10 text-emerald-100",
    },
    {
      action: "logout",
      iconType: "logout",
      href: ROUTES.auth.login,
      helper: "Sign out and return to login.",
      icon: "ðŸšª",
      label: "Logout",
      references: [
        "Secure exit",
        "Return to login",
        "Profile remains saved",
      ],
      stat: "Account session",
      tone: "border-red-200/24 bg-red-500/10 text-red-100",
    },
  ] as const;
  const rotateSessionsAccountOrbit = (direction: "left" | "right") => {
    setActiveSessionsAccountIndex((currentIndex) =>
      direction === "left"
        ? (currentIndex - 1 + sessionsAccountOrbitItems.length) %
          sessionsAccountOrbitItems.length
        : (currentIndex + 1) % sessionsAccountOrbitItems.length,
    );
  };
  const getSessionsAccountOrbitDistance = (index: number) => {
    const rawDistance = index - activeSessionsAccountIndex;

    if (rawDistance > sessionsAccountOrbitItems.length / 2) {
      return rawDistance - sessionsAccountOrbitItems.length;
    }

    if (rawDistance < -sessionsAccountOrbitItems.length / 2) {
      return rawDistance + sessionsAccountOrbitItems.length;
    }

    return rawDistance;
  };
  const rotateSessionsProfileLayer = (direction: "up" | "down") => {
    setActiveSessionsProfileLayer((currentLayer) =>
      direction === "up"
        ? Math.max(0, currentLayer - 1)
        : Math.min(2, currentLayer + 1),
    );
  };
  const handleSessionsProfileLayerWheel = (
    event: ReactWheelEvent<HTMLDivElement>,
  ) => {
    if (Math.abs(event.deltaY) < 40) return;

    event.preventDefault();
    event.stopPropagation();

    if (!profileHubLayerWheelGestureRef.current) {
      profileHubLayerWheelGestureRef.current = true;
      rotateSessionsProfileLayer(event.deltaY > 0 ? "down" : "up");
    }

    if (profileHubLayerWheelResetRef.current) {
      clearTimeout(profileHubLayerWheelResetRef.current);
    }

    profileHubLayerWheelResetRef.current = setTimeout(() => {
      profileHubLayerWheelGestureRef.current = false;
      profileHubLayerWheelResetRef.current = null;
    }, 240);
  };
  const handleSessionsProfileLayerPointerDown = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;

    const target = event.target as Element | null;
    const startedInsideHorizontalOrbit = Boolean(
      target?.closest("[data-profile-horizontal-orbit]"),
    );
    const startedInLeftVerticalZone =
      typeof window !== "undefined" &&
      event.clientX <= Math.min(220, window.innerWidth * 0.22);

    sessionsProfileLayerPointerStartRef.current = {
      x: event.clientX,
      y: event.clientY,
    };
    sessionsProfileLayerPointerMovedRef.current = false;
    if (!startedInsideHorizontalOrbit || startedInLeftVerticalZone) {
      event.currentTarget.setPointerCapture?.(event.pointerId);
    }
  };
  const handleSessionsProfileLayerPointerMove = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    const start = sessionsProfileLayerPointerStartRef.current;
    if (!start) return;

    const deltaX = event.clientX - start.x;
    const deltaY = event.clientY - start.y;
    if (Math.abs(deltaY) < 58 || Math.abs(deltaY) < Math.abs(deltaX) * 0.9) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    sessionsProfileLayerPointerMovedRef.current = true;
    rotateSessionsProfileLayer(deltaY > 0 ? "up" : "down");
    sessionsProfileLayerPointerStartRef.current = null;
  };
  const handleSessionsProfileLayerPointerEnd = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    sessionsProfileLayerPointerStartRef.current = null;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    }
  };

  async function signOutFromSessionsHub() {
    await supabase.auth.signOut();
    setSessionsProfileHubOpen(false);
    router.push(ROUTES.auth.login);
    router.refresh();
  }

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
    <main className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.16),_transparent_30%),linear-gradient(180deg,#020617_0%,#0f172a_100%)] text-white">
      <section className="mx-auto w-full max-w-7xl space-y-6 px-4 pb-6 pt-0 sm:px-6 lg:px-8 lg:pb-8 lg:pt-0">
        <section className="relative left-1/2 w-[100dvw] max-w-none -translate-x-1/2 overflow-visible rounded-none border-y border-cyan-100/18 bg-[radial-gradient(circle_at_16%_0%,rgba(34,211,238,0.22),transparent_34%),radial-gradient(circle_at_88%_12%,rgba(251,191,36,0.14),transparent_30%),linear-gradient(135deg,rgba(15,23,42,0.88),rgba(2,6,23,0.72))] p-0 shadow-[0_34px_120px_rgba(0,0,0,0.42),0_0_52px_rgba(34,211,238,0.10)] backdrop-blur-xl">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-8 h-[calc(100%-4rem)] w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-cyan-200/22 to-transparent"
          />
          <div className="relative z-[100] flex min-h-[84px] items-center gap-4 border-b border-cyan-100/18 bg-slate-950/70 px-3 py-3 shadow-[0_20px_70px_rgba(0,0,0,0.34),0_0_34px_rgba(34,211,238,0.10)] backdrop-blur-xl sm:px-4 sm:py-4">
            <Link
              aria-label="Open Sound Fitness dashboard"
              className="flex min-h-[62px] min-w-0 shrink-0 items-center gap-3 rounded-[24px] border border-transparent bg-transparent px-2.5 py-2 transition hover:border-cyan-100/24 hover:bg-cyan-300/8"
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
              className="flex w-fit max-w-[calc(100vw-7.5rem)] shrink-0 cursor-grab select-none items-center gap-1.5 bg-transparent p-0 shadow-none [touch-action:pan-y] active:cursor-grabbing md:max-w-[min(56vw,520px)] lg:max-w-none"
              onPointerCancel={(event) =>
                finishHorizontalOrbitDrag(
                  event,
                  sessionsDashboardPointerStartRef,
                )
              }
              onPointerDown={(event) =>
                startHorizontalOrbitDrag(
                  event,
                  sessionsDashboardPointerStartRef,
                  sessionsDashboardPointerMovedRef,
                )
              }
              onPointerMove={(event) =>
                moveHorizontalOrbitDrag(
                  event,
                  sessionsDashboardPointerStartRef,
                  sessionsDashboardPointerMovedRef,
                  rotateSessionsDashboardRail,
                  58,
                )
              }
              onPointerUp={(event) =>
                finishHorizontalOrbitDrag(
                  event,
                  sessionsDashboardPointerStartRef,
                )
              }
            >
              <button
                aria-label="Previous dashboard"
                className="grid h-11 w-9 shrink-0 place-items-center rounded-2xl border border-transparent bg-transparent text-xs font-black text-cyan-100/80 transition hover:-translate-x-0.5 hover:border-amber-200/28 hover:bg-amber-300/8 hover:text-amber-100 active:scale-95"
                onClick={() => rotateSessionsDashboardRail("left")}
                onPointerDown={(event) => event.stopPropagation()}
                type="button"
              >
                &lt;
              </button>
              <Link
                aria-current={
                  activeSessionsDashboardLink.href === ROUTES.dashboard.sessions
                    ? "page"
                    : undefined
                }
                className={`flex min-h-[58px] w-auto min-w-max shrink-0 items-center gap-3 rounded-[22px] border border-transparent bg-transparent px-2.5 py-2 text-left text-cyan-50 shadow-none transition hover:-translate-y-0.5 hover:bg-white/[0.04] ${
                  sessionsDashboardSlideDirection === "right"
                    ? "animate-[sessions-dashboard-chip-slide-from-right_220ms_ease-out]"
                    : "animate-[sessions-dashboard-chip-slide-from-left_220ms_ease-out]"
                }`}
                draggable={false}
                href={activeSessionsDashboardLink.href}
                key={`${activeSessionsDashboardLink.label}-${sessionsDashboardSlideDirection}`}
                onClick={(event) => {
                  if (sessionsDashboardPointerMovedRef.current) {
                    event.preventDefault();
                    sessionsDashboardPointerMovedRef.current = false;
                  }
                }}
                onDragStart={(event) => event.preventDefault()}
              >
                <span
                  aria-hidden="true"
                  className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl border text-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_16px_rgba(255,255,255,0.06)] ${activeSessionsDashboardLink.tone}`}
                >
                  {activeSessionsDashboardLink.icon}
                </span>
                <span className="shrink-0 whitespace-nowrap">
                  <span className="block text-[8px] font-black uppercase tracking-[0.14em] opacity-70">
                    {activeSessionsDashboardLink.meta}
                  </span>
                  <span className="mt-0.5 block text-[10px] font-black uppercase tracking-[0.12em] sm:text-[11px]">
                    {activeSessionsDashboardLink.label}
                  </span>
                </span>
                <span className={`shrink-0 rounded-2xl border px-3 py-2 text-right ${activeSessionsDashboardLink.tone}`}>
                  <span className="block text-[8px] font-black uppercase tracking-[0.1em] opacity-75">
                    ⚡ pts
                  </span>
                  <span className="block text-sm font-black leading-none [text-shadow:0_1px_12px_rgba(0,0,0,0.34)]">
                    {activeSessionsDashboardLink.points.toLocaleString()}
                  </span>
                </span>
              </Link>
              <button
                aria-label="Next dashboard"
                className="grid h-11 w-9 shrink-0 place-items-center rounded-2xl border border-transparent bg-transparent text-xs font-black text-cyan-100/80 transition hover:translate-x-0.5 hover:border-amber-200/28 hover:bg-amber-300/8 hover:text-amber-100 active:scale-95"
                onClick={() => rotateSessionsDashboardRail("right")}
                onPointerDown={(event) => event.stopPropagation()}
                type="button"
              >
                &gt;
              </button>
            </div>

            <div
              className="relative hidden shrink-0 md:block"
              ref={sessionsProfileHubRef}
            >
              <button
                aria-expanded={sessionsProfileHubOpen}
                aria-haspopup="menu"
                aria-label="Open profile hub"
                className={`flex min-h-[58px] items-center gap-3 rounded-[22px] border border-transparent bg-transparent px-2 py-2 text-left shadow-none transition hover:-translate-y-0.5 ${
                  sessionsProfileHubOpen
                    ? "text-cyan-50"
                    : "text-slate-200 hover:bg-white/[0.04]"
                }`}
                onClick={() => setSessionsProfileHubOpen((open) => !open)}
                type="button"
              >
                <Image
                  alt="Profile"
                  className="h-10 w-10 rounded-full border border-cyan-200/28 bg-slate-950 object-contain p-0.5 shadow-[0_0_18px_rgba(34,211,238,0.14)]"
                  height={40}
                  src="/sound-fitness-logo.png"
                  width={40}
                />
                <span className="hidden min-w-0 leading-none lg:block">
                  <span className="block max-w-[110px] truncate text-[10px] font-black uppercase tracking-[0.12em] text-white">
                    Joey Bell
                  </span>
                  <span className="mt-1 block text-[8px] font-black uppercase tracking-[0.14em] text-cyan-200/70">
                    Profile Hub
                  </span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="rounded-2xl border border-amber-200/20 bg-amber-300/10 px-2.5 py-2">
                    <span className="block text-[8px] font-black uppercase tracking-[0.12em] text-amber-100/70">
                      ⚡ Pts
                    </span>
                    <span className="block text-sm font-black leading-none text-white">
                      {workoutRewardStats.soundPoints.toLocaleString()}
                    </span>
                  </span>
                  <span className="rounded-2xl border border-cyan-200/18 bg-cyan-300/10 px-2.5 py-2">
                    <span className="flex items-center gap-1 text-[8px] font-black uppercase tracking-[0.12em] text-cyan-100/70">
                      <Image
                        alt=""
                        aria-hidden="true"
                        className="h-3.5 w-3.5 rounded-full object-contain"
                        height={14}
                        src="/sound-fitness-logo.png"
                        width={14}
                      />
                      Tok
                    </span>
                    <span className="block text-sm font-black leading-none text-white">
                      {workoutRewardStats.soundTokens.toLocaleString()}
                    </span>
                  </span>
                </span>
                <span
                  aria-hidden="true"
                  className={`text-sm font-black text-cyan-100/70 transition ${
                    sessionsProfileHubOpen ? "rotate-180" : ""
                  }`}
                >
                  ▾
                </span>
              </button>

              {sessionsProfileHubOpen && typeof document !== "undefined"
                ? createPortal(
                    <>
                      <button
                        aria-label="Close profile hub overlay"
                        className="fixed inset-x-0 bottom-0 top-[84px] z-[80] cursor-default bg-black/85 backdrop-blur-[10px] transition before:pointer-events-none before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_50%_0%,rgba(34,211,238,0.16),transparent_28%),radial-gradient(circle_at_78%_26%,rgba(250,204,21,0.10),transparent_24%)]"
                        onClick={() => setSessionsProfileHubOpen(false)}
                        type="button"
                      />

              <div
                className={`pointer-events-none fixed inset-x-0 bottom-0 top-[84px] z-[90] w-screen overflow-hidden bg-transparent px-0 pb-0 pt-0 transition-all duration-300 [perspective:1500px] [transform-style:preserve-3d] ${
                  sessionsProfileHubOpen
                    ? "visible scale-100 opacity-100"
                    : "invisible scale-[0.985] opacity-0"
                }`}
                ref={sessionsProfileHubOverlayRef}
                role="menu"
              >
                <button
                  aria-label="Close profile hub"
                  className="pointer-events-auto absolute right-4 top-4 z-40 grid h-10 w-10 place-items-center rounded-2xl border border-white/10 bg-slate-950/70 text-sm font-black text-slate-200 shadow-[0_0_24px_rgba(0,0,0,0.24)] transition hover:border-red-200/35 hover:bg-red-500/12 hover:text-red-100"
                  onClick={() => setSessionsProfileHubOpen(false)}
                  type="button"
                >
                  X
                </button>
                <div className="hidden">
                  <p className="relative z-20 text-[10px] font-black uppercase tracking-[0.22em] text-amber-100">
                    Profile Row
                  </p>
                  <div className="relative z-10 mt-3 flex items-center justify-between gap-4 rounded-[28px] border border-cyan-100/20 bg-slate-950/58 p-4 shadow-[0_24px_64px_rgba(0,0,0,0.34)] [transform:translateZ(34px)]">
                    <div className="flex min-w-0 items-center gap-4">
                      <Image
                        alt="Profile"
                        className="h-12 w-12 rounded-full border border-cyan-100/30 bg-slate-950 object-contain p-1 shadow-[0_0_28px_rgba(34,211,238,0.18)]"
                        height={48}
                        src="/sound-fitness-logo.png"
                        width={48}
                      />
                      <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-100">
                          Profile Reward Hub
                        </p>
                        <p className="mt-1 truncate text-lg font-black text-white">
                          Joey Bell
                        </p>
                        <p className="mt-0.5 truncate text-sm font-semibold text-slate-400">
                          My Hub, rewards, and account controls.
                        </p>
                      </div>
                    </div>
                    <div className="grid shrink-0 gap-2 sm:grid-cols-2">
                      <div className="rounded-2xl border border-amber-200/22 bg-amber-300/10 px-3 py-2">
                        <div className="text-[8px] font-black uppercase tracking-[0.14em] text-amber-100/70">
                          ⚡ Sound Points
                        </div>
                        <div className="text-lg font-black text-white">
                          {workoutRewardStats.soundPoints.toLocaleString()}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-cyan-200/18 bg-cyan-300/10 px-3 py-2">
                        <div className="text-[8px] font-black uppercase tracking-[0.14em] text-cyan-100/70">
                          Sound Tokens
                        </div>
                        <div className="flex items-center gap-2 text-lg font-black text-white">
                          <Image
                            alt=""
                            aria-hidden="true"
                            className="h-5 w-5 rounded-full object-contain"
                            height={20}
                            src="/sound-fitness-logo.png"
                            width={20}
                          />
                          {workoutRewardStats.soundTokens.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  className="pointer-events-auto relative mt-0 h-[calc(100dvh-84px)] w-screen cursor-grab select-none overflow-hidden rounded-none border-0 bg-transparent p-0 shadow-none [perspective:1500px] [touch-action:none] [transform-style:preserve-3d] active:cursor-grabbing"
                  onPointerCancel={handleSessionsProfileLayerPointerEnd}
                  onPointerDown={handleSessionsProfileLayerPointerDown}
                  onPointerMove={handleSessionsProfileLayerPointerMove}
                  onPointerUp={handleSessionsProfileLayerPointerEnd}
                  onWheel={handleSessionsProfileLayerWheel}
                >
                  <div className="absolute right-3 top-1/2 z-50 flex -translate-y-1/2 flex-col items-center gap-2">
                    <button
                      aria-label="Move profile hub layer up"
                      className={`grid h-10 w-10 place-items-center rounded-full border text-lg font-black shadow-[0_0_24px_rgba(0,0,0,0.28)] transition active:scale-95 ${
                        activeSessionsProfileLayer > 0
                          ? "border-cyan-100/45 bg-cyan-300/18 text-cyan-50 shadow-[0_0_24px_rgba(34,211,238,0.22)]"
                          : "border-white/12 bg-slate-950/72 text-slate-500 opacity-60"
                      }`}
                      onClick={() => rotateSessionsProfileLayer("up")}
                      onPointerDown={(event) => event.stopPropagation()}
                      type="button"
                    >
                      ^
                    </button>
                    <span className="rounded-full border border-white/10 bg-slate-950/72 px-2 py-1 text-[8px] font-black uppercase tracking-[0.16em] text-slate-300 [writing-mode:vertical-rl]">
                      {["Profile", "My Hub", "Account"][activeSessionsProfileLayer]}
                    </span>
                    <button
                      aria-label="Move profile hub layer down"
                      className={`grid h-10 w-10 place-items-center rounded-full border text-lg font-black shadow-[0_0_24px_rgba(0,0,0,0.28)] transition active:scale-95 ${
                        activeSessionsProfileLayer < 2
                          ? "border-amber-100/45 bg-amber-300/18 text-amber-50 shadow-[0_0_24px_rgba(250,204,21,0.20)]"
                          : "border-white/12 bg-slate-950/72 text-slate-500 opacity-60"
                      }`}
                      onClick={() => rotateSessionsProfileLayer("down")}
                      onPointerDown={(event) => event.stopPropagation()}
                      type="button"
                    >
                      v
                    </button>
                  </div>
                  <div
                    className={`absolute inset-0 h-full overflow-hidden rounded-none border-0 bg-transparent p-4 shadow-none transition-all duration-500 [transform-style:preserve-3d] ${
                      activeSessionsProfileLayer === 0
                        ? "z-30 translate-y-0 scale-100 opacity-100 blur-0"
                        : activeSessionsProfileLayer === 1
                          ? "pointer-events-none z-10 -translate-y-[12%] scale-[0.9] opacity-40 blur-[1px]"
                          : "pointer-events-none z-0 -translate-y-[64%] scale-[0.84] opacity-0 blur-sm"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute left-1/2 top-[35%] h-[210px] w-[min(86vw,1040px)] -translate-x-1/2 -translate-y-1/2 rounded-[42px] bg-[radial-gradient(ellipse_at_center,rgba(34,211,238,0.13),rgba(15,23,42,0.16)_44%,transparent_72%)] blur-xl"
                    />
                    <div className="absolute inset-x-0 top-[34%] z-20 flex -translate-y-1/2 justify-center px-6 [transform:translateY(-50%)_translateZ(58px)]">
                      <div className="relative w-[min(90vw,1040px)]">
                      <Link
                        className="grid w-full gap-5 rounded-[32px] border border-cyan-100/22 bg-slate-950/76 p-6 text-left shadow-[0_28px_74px_rgba(0,0,0,0.44),0_0_34px_rgba(34,211,238,0.12)] transition hover:scale-[1.01] hover:border-cyan-100/40 md:grid-cols-[minmax(0,1fr)_auto] md:items-center"
                        href={ROUTES.dashboard.profile}
                        onClick={(event) => {
                          if (sessionsProfileLayerPointerMovedRef.current) {
                            event.preventDefault();
                            sessionsProfileLayerPointerMovedRef.current = false;
                            return;
                          }

                          setSessionsProfileHubOpen(false);
                        }}
                        role="menuitem"
                      >
                        <div className="flex min-w-0 items-center gap-5">
                          <Image
                            alt="Profile"
                            className="h-16 w-16 rounded-full border border-cyan-100/30 bg-slate-950 object-contain p-1 shadow-[0_0_28px_rgba(34,211,238,0.18)]"
                            height={64}
                            src="/sound-fitness-logo.png"
                            width={64}
                          />
                          <div className="min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-100">
                              Profile Reward Hub
                            </p>
                            <p className="mt-1 truncate text-xl font-black text-white">
                              Joey Bell
                            </p>
                            <p className="mt-0.5 line-clamp-2 text-sm font-semibold text-slate-400">
                              My Hub, rewards, and account controls.
                            </p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {[
                                "Member since May 2026",
                                `${workoutStats.loggedEntries} logs`,
                                `Latest: ${workoutStats.latestExercise}`,
                                activePlan.weeklyTarget,
                              ].map((reference) => (
                                <span
                                  className="rounded-2xl border border-white/10 bg-white/[0.045] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.1em] text-slate-200"
                                  key={reference}
                                >
                                  {reference}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="grid w-full shrink-0 gap-2 sm:grid-cols-2 md:w-[264px]">
                          <div className="rounded-2xl border border-amber-200/22 bg-amber-300/10 px-4 py-3">
                            <div className="text-[8px] font-black uppercase tracking-[0.14em] text-amber-100/70">
                              Sound Points
                            </div>
                            <div className="text-xl font-black text-white">
                              {workoutRewardStats.soundPoints.toLocaleString()}
                            </div>
                          </div>
                          <div className="rounded-2xl border border-cyan-200/18 bg-cyan-300/10 px-4 py-3">
                            <div className="text-[8px] font-black uppercase tracking-[0.14em] text-cyan-100/70">
                              Sound Tokens
                            </div>
                            <div className="flex items-center gap-2 text-xl font-black text-white">
                              <Image
                                alt=""
                                aria-hidden="true"
                                className="h-5 w-5 rounded-full object-contain"
                                height={20}
                                src="/sound-fitness-logo.png"
                                width={20}
                              />
                              {workoutRewardStats.soundTokens.toLocaleString()}
                            </div>
                          </div>
                        </div>
                      </Link>
                      <div
                        aria-hidden={activeSessionsProfileLayer !== 0}
                        className={`pointer-events-none absolute left-0 right-0 top-full mt-3 overflow-hidden transition-[max-height,opacity,transform] duration-[850ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
                          activeSessionsProfileLayer === 0
                            ? "max-h-44 translate-y-0 opacity-100"
                            : "max-h-0 -translate-y-3 opacity-0"
                        }`}
                      >
                        <div className="rounded-2xl border border-cyan-100/18 bg-slate-950/72 px-4 py-3 shadow-[0_18px_44px_rgba(0,0,0,0.30),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur">
                          <div className="flex items-center justify-between gap-3">
                            <div className="text-[8px] font-black uppercase tracking-[0.14em] text-cyan-100/72">
                              Recent Achievement
                            </div>
                            <div
                              aria-hidden="true"
                              className="text-[10px] font-black text-cyan-100"
                            >
                              v
                            </div>
                          </div>
                          <div className="mt-3 flex items-center gap-3 border-t border-white/10 pt-3">
                            <SoundLogoAchievementBadge
                              compact
                              item={recentProfileHubAchievement}
                            />
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-[10px] font-black uppercase tracking-[0.12em] text-white">
                                {recentProfileHubAchievement.label}
                              </div>
                              <div className="mt-1 truncate text-[10px] font-semibold text-slate-300">
                                {recentProfileHubAchievement.meta}
                              </div>
                              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-950/70">
                                <div
                                  className="h-full rounded-full bg-cyan-200 shadow-[0_0_12px_rgba(103,232,249,0.45)]"
                                  style={{
                                    width: `${recentProfileHubAchievementProgress}%`,
                                  }}
                                />
                              </div>
                              <div className="mt-1 text-[8px] font-black uppercase tracking-[0.12em] text-cyan-100/70">
                                {recentProfileHubAchievement.statusLabel}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      </div>
                    </div>
                  </div>
                  <div
                    className={`absolute inset-0 h-full cursor-grab select-none overflow-hidden rounded-none border-0 bg-transparent p-4 shadow-none transition-all duration-500 [touch-action:none] [transform-style:preserve-3d] active:cursor-grabbing ${
                      activeSessionsProfileLayer === 1
                        ? "z-30 translate-y-0 scale-100 opacity-100 blur-0"
                        : activeSessionsProfileLayer < 1
                          ? "pointer-events-none z-10 translate-y-[42%] scale-[0.9] opacity-40 blur-[1px]"
                          : "pointer-events-none z-10 -translate-y-[42%] scale-[0.9] opacity-40 blur-[1px]"
                    }`}
                    data-profile-horizontal-orbit="true"
                    onPointerCancel={(event) =>
                      finishHorizontalOrbitDrag(
                        event,
                        sessionsHubOrbitPointerStartRef,
                      )
                    }
                    onPointerDown={(event) =>
                      startHorizontalOrbitDrag(
                        event,
                        sessionsHubOrbitPointerStartRef,
                        sessionsHubOrbitPointerMovedRef,
                        false,
                      )
                    }
                    onPointerMove={(event) =>
                      moveHorizontalOrbitDrag(
                        event,
                        sessionsHubOrbitPointerStartRef,
                        sessionsHubOrbitPointerMovedRef,
                        rotateSessionsHubOrbit,
                        68,
                      )
                    }
                    onPointerUp={(event) =>
                      finishHorizontalOrbitDrag(
                        event,
                        sessionsHubOrbitPointerStartRef,
                      )
                    }
                  >
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute left-1/2 top-[55%] h-[230px] w-[min(88vw,1120px)] -translate-x-1/2 -translate-y-1/2 rounded-[46px] bg-[radial-gradient(ellipse_at_center,rgba(34,211,238,0.11),rgba(99,102,241,0.08)_42%,transparent_74%)] blur-xl"
                    />
                    {sessionsHubOrbitItems.map((item, index) => {
                      const distance = getSessionsHubOrbitDistance(index);
                      const absDistance = Math.abs(distance);
                      const clampedDistance = Math.max(
                        -3,
                        Math.min(3, distance),
                      );
                      const isActive = distance === 0;
                      const orbitXSlots = [0, 235, 375, 490];
                      const x =
                        Math.sign(clampedDistance) *
                        orbitXSlots[
                          Math.min(absDistance, orbitXSlots.length - 1)
                        ];
                      const y = absDistance * 18 + (absDistance > 1 ? 8 : 0);
                      const scale = isActive
                        ? 1.04
                        : absDistance === 1
                          ? 0.82
                          : absDistance === 2
                            ? 0.64
                            : 0.52;
                      const opacity = isActive
                        ? 1
                        : absDistance === 1
                          ? 0.76
                          : absDistance === 2
                            ? 0.44
                            : 0.24;
                      const depth = isActive ? 64 : 28 - absDistance * 11;
                      const rotateY = clampedDistance * -18;
                      const zIndex = 40 - absDistance;
                      const detailsKey = `hub-${item.label}`;
                      const detailsOpen =
                        openSessionsProfileDetailKey === detailsKey;
                      const detailsId = `sessions-profile-hub-details-${item.label
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, "-")}`;
                      const visibleReferences = item.references.slice(
                        0,
                        isActive ? 3 : 2,
                      );

                      return (
                        <div
                          aria-current={isActive ? "page" : undefined}
                          className={`absolute left-1/2 top-[55%] cursor-pointer rounded-[28px] border text-left shadow-[0_18px_44px_rgba(0,0,0,0.38)] outline-none backdrop-blur transition-all duration-300 hover:scale-[1.02] focus-visible:ring-2 focus-visible:ring-cyan-100/50 ${
                            isActive
                              ? "w-[min(82vw,300px)] p-5 ring-2 ring-cyan-100/30"
                              : "w-[180px] p-4"
                          } ${item.tone}`}
                          key={item.label}
                          onClick={() => {
                            if (
                              sessionsHubOrbitPointerMovedRef.current ||
                              sessionsProfileLayerPointerMovedRef.current
                            ) {
                              sessionsHubOrbitPointerMovedRef.current = false;
                              sessionsProfileLayerPointerMovedRef.current = false;
                              return;
                            }

                            if (!isActive) {
                              setActiveSessionsHubIndex(index);
                              return;
                            }

                            if ("action" in item && item.action === "logout") {
                              void signOutFromSessionsHub();
                              return;
                            }

                            setSessionsProfileHubOpen(false);
                            router.push(item.href);
                          }}
                          onKeyDown={(event) => {
                            if (event.key !== "Enter" && event.key !== " ") {
                              return;
                            }

                            event.preventDefault();

                            if (!isActive) {
                              setActiveSessionsHubIndex(index);
                              return;
                            }

                            if ("action" in item && item.action === "logout") {
                              void signOutFromSessionsHub();
                              return;
                            }

                            setSessionsProfileHubOpen(false);
                            router.push(item.href);
                          }}
                          role="menuitem"
                          style={{
                            filter:
                              absDistance > 2 ? "blur(1.5px)" : "none",
                            opacity,
                            transform: `translate(-50%, -50%) translateX(${x}px) translateY(${y}px) rotateY(${rotateY}deg) translateZ(${depth}px) scale(${scale})`,
                            zIndex,
                          }}
                          tabIndex={0}
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={`grid shrink-0 place-items-center rounded-2xl border border-white/12 bg-slate-950/42 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] ${
                                isActive
                                  ? "h-12 w-12 text-2xl"
                                  : "h-10 w-10 text-xl"
                              }`}
                              aria-hidden="true"
                            >
                              {"iconType" in item &&
                              item.iconType === "logout" ? (
                                <svg
                                  className={isActive ? "h-6 w-6" : "h-5 w-5"}
                                  fill="none"
                                  stroke="currentColor"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2.2"
                                  viewBox="0 0 24 24"
                                >
                                  <path d="M10 17l5-5-5-5" />
                                  <path d="M15 12H3" />
                                  <path d="M21 5v14a2 2 0 0 1-2 2h-7" />
                                  <path d="M12 3h7a2 2 0 0 1 2 2" />
                                </svg>
                              ) : (
                                item.icon
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="text-[10px] font-black uppercase tracking-[0.12em] text-white">
                                {item.label}
                              </div>
                              <div className="mt-1 truncate text-[10px] font-black uppercase tracking-[0.12em] text-current/80">
                                {item.stat}
                              </div>
                            </div>
                          </div>
                          <div
                            className={`mt-3 font-semibold text-slate-300 ${
                              isActive
                                ? "line-clamp-3 text-xs leading-5"
                                : "line-clamp-2 text-[10px] leading-4"
                            }`}
                          >
                            {item.helper}
                          </div>
                          <div className="mt-3">
                            <button
                              aria-controls={detailsId}
                              aria-expanded={detailsOpen}
                              className={`flex w-full items-center justify-between rounded-2xl border border-white/10 bg-slate-950/34 font-black uppercase tracking-[0.12em] text-slate-100 transition hover:border-cyan-100/34 hover:bg-slate-950/52 ${
                                isActive
                                  ? "px-3 py-2 text-[9px]"
                                  : "px-2.5 py-1.5 text-[8px]"
                              }`}
                              onClick={(event) => {
                                event.stopPropagation();
                                setOpenSessionsProfileDetailKey((openKey) =>
                                  openKey === detailsKey ? null : detailsKey,
                                );
                              }}
                              onKeyDown={(event) => event.stopPropagation()}
                              onPointerDown={(event) => event.stopPropagation()}
                              type="button"
                            >
                              <span>Details</span>
                              <span
                                aria-hidden="true"
                                className={`text-[10px] transition ${
                                  detailsOpen ? "rotate-180" : ""
                                }`}
                              >
                                v
                              </span>
                            </button>
                            <div
                              className={`overflow-hidden transition-all duration-300 ${
                                detailsOpen
                                  ? "mt-2 max-h-44 opacity-100"
                                  : "max-h-0 opacity-0"
                              }`}
                              id={detailsId}
                            >
                              <div className="grid gap-2">
                                {visibleReferences.map((reference) => (
                                  <span
                                    className={`rounded-2xl border border-white/10 bg-slate-950/34 font-black text-slate-100 ${
                                      isActive
                                        ? "px-3 py-2 text-[10px]"
                                        : "truncate px-2.5 py-1.5 text-[8px]"
                                    }`}
                                    key={reference}
                                  >
                                    {reference}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                          {isActive ? (
                            <button
                              className="mt-4 w-full rounded-2xl border border-white/10 bg-slate-950/36 px-3 py-2 text-center text-[9px] font-black uppercase tracking-[0.14em] text-white transition hover:border-cyan-100/34 hover:bg-cyan-300/10"
                              onClick={(event) => {
                                event.stopPropagation();

                                if ("action" in item && item.action === "logout") {
                                  void signOutFromSessionsHub();
                                  return;
                                }

                                setSessionsProfileHubOpen(false);
                                router.push(item.href);
                              }}
                              onPointerDown={(event) => event.stopPropagation()}
                              type="button"
                            >
                              {"action" in item && item.action === "logout"
                                ? "Log Out"
                                : "Open Hub"}
                            </button>
                          ) : null}
                        </div>
                      );
                    })}
                    {activeSessionsProfileLayer === 1 ? (
                      <div
                        className="pointer-events-auto absolute left-1/2 z-30 flex -translate-x-1/2 items-center gap-2"
                        style={{ top: "calc(55% + 180px)" }}
                      >
                        {sessionsHubOrbitItems.map((item, index) => (
                          <button
                            aria-label={`Show ${item.label}`}
                            className={`h-2 rounded-full transition ${
                              index === activeSessionsHubIndex
                                ? "w-8 bg-cyan-200 shadow-[0_0_14px_rgba(103,232,249,0.58)]"
                                : "w-2 bg-slate-500/55 hover:bg-amber-200/75"
                            }`}
                            key={item.label}
                            onClick={() => setActiveSessionsHubIndex(index)}
                            type="button"
                          />
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div
                    className={`absolute inset-0 h-full cursor-grab select-none overflow-hidden rounded-none border-0 bg-transparent p-4 shadow-none transition-all duration-500 [touch-action:none] [transform-style:preserve-3d] active:cursor-grabbing ${
                      activeSessionsProfileLayer === 2
                        ? "z-30 translate-y-0 scale-100 opacity-100 blur-0"
                        : activeSessionsProfileLayer === 1
                          ? "pointer-events-none z-10 translate-y-[42%] scale-[0.9] opacity-40 blur-[1px]"
                          : "pointer-events-none z-0 translate-y-[64%] scale-[0.84] opacity-0 blur-sm"
                    }`}
                    data-profile-horizontal-orbit="true"
                    onPointerCancel={(event) =>
                      finishHorizontalOrbitDrag(
                        event,
                        sessionsAccountOrbitPointerStartRef,
                      )
                    }
                    onPointerDown={(event) =>
                      startHorizontalOrbitDrag(
                        event,
                        sessionsAccountOrbitPointerStartRef,
                        sessionsAccountOrbitPointerMovedRef,
                        false,
                      )
                    }
                    onPointerMove={(event) =>
                      moveHorizontalOrbitDrag(
                        event,
                        sessionsAccountOrbitPointerStartRef,
                        sessionsAccountOrbitPointerMovedRef,
                        rotateSessionsAccountOrbit,
                        68,
                      )
                    }
                    onPointerUp={(event) =>
                      finishHorizontalOrbitDrag(
                        event,
                        sessionsAccountOrbitPointerStartRef,
                      )
                    }
                  >
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute left-1/2 top-[54%] h-[204px] w-[min(84vw,1000px)] -translate-x-1/2 -translate-y-1/2 rounded-[42px] bg-[radial-gradient(ellipse_at_center,rgba(250,204,21,0.10),rgba(34,211,238,0.07)_44%,transparent_74%)] blur-xl"
                    />
                    {sessionsAccountOrbitItems.map((item, index) => {
                      const distance = getSessionsAccountOrbitDistance(index);
                      const absDistance = Math.abs(distance);
                      const clampedDistance = Math.max(
                        -2,
                        Math.min(2, distance),
                      );
                      const isActive = distance === 0;
                      const orbitXSlots = [0, 232, 365];
                      const x =
                        Math.sign(clampedDistance) *
                        orbitXSlots[
                          Math.min(absDistance, orbitXSlots.length - 1)
                        ];
                      const y = absDistance * 18 + (absDistance > 1 ? 8 : 0);
                      const scale = isActive
                        ? 1.04
                        : absDistance === 1
                          ? 0.84
                          : 0.66;
                      const opacity = isActive
                        ? 1
                        : absDistance === 1
                          ? 0.78
                          : 0.38;
                      const depth = isActive ? 58 : 26 - absDistance * 10;
                      const rotateY = clampedDistance * -18;
                      const zIndex = 40 - absDistance;
                      const detailsKey = `account-${item.label}`;
                      const detailsOpen =
                        openSessionsProfileDetailKey === detailsKey;
                      const detailsId = `sessions-profile-account-details-${item.label
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, "-")}`;
                      const visibleReferences = item.references.slice(
                        0,
                        isActive ? 3 : 2,
                      );

                      return (
                        <div
                          aria-current={isActive ? "page" : undefined}
                          className={`absolute left-1/2 top-[54%] cursor-pointer rounded-[28px] border text-left shadow-[0_18px_44px_rgba(0,0,0,0.38)] outline-none backdrop-blur transition-all duration-300 hover:scale-[1.02] focus-visible:ring-2 focus-visible:ring-amber-100/50 ${
                            isActive
                              ? "w-[min(82vw,294px)] p-5 ring-2 ring-amber-100/30"
                              : "w-[176px] p-4"
                          } ${item.tone}`}
                          key={item.label}
                          onClick={() => {
                            if (
                              sessionsAccountOrbitPointerMovedRef.current ||
                              sessionsProfileLayerPointerMovedRef.current
                            ) {
                              sessionsAccountOrbitPointerMovedRef.current = false;
                              sessionsProfileLayerPointerMovedRef.current = false;
                              return;
                            }

                            if (!isActive) {
                              setActiveSessionsAccountIndex(index);
                              return;
                            }

                            if ("action" in item && item.action === "logout") {
                              void signOutFromSessionsHub();
                              return;
                            }

                            setSessionsProfileHubOpen(false);
                            router.push(item.href);
                          }}
                          onKeyDown={(event) => {
                            if (event.key !== "Enter" && event.key !== " ") {
                              return;
                            }

                            event.preventDefault();

                            if (!isActive) {
                              setActiveSessionsAccountIndex(index);
                              return;
                            }

                            if ("action" in item && item.action === "logout") {
                              void signOutFromSessionsHub();
                              return;
                            }

                            setSessionsProfileHubOpen(false);
                            router.push(item.href);
                          }}
                          role="menuitem"
                          style={{
                            filter:
                              absDistance > 1 ? "blur(1.25px)" : "none",
                            opacity,
                            transform: `translate(-50%, -50%) translateX(${x}px) translateY(${y}px) rotateY(${rotateY}deg) translateZ(${depth}px) scale(${scale})`,
                            zIndex,
                          }}
                          tabIndex={0}
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={`grid shrink-0 place-items-center rounded-2xl border border-white/12 bg-slate-950/42 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] ${
                                isActive
                                  ? "h-12 w-12 text-2xl"
                                  : "h-10 w-10 text-lg"
                              }`}
                              aria-hidden="true"
                            >
                              {"iconType" in item &&
                              item.iconType === "logout" ? (
                                <svg
                                  className={isActive ? "h-6 w-6" : "h-5 w-5"}
                                  fill="none"
                                  stroke="currentColor"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2.2"
                                  viewBox="0 0 24 24"
                                >
                                  <path d="M10 17l5-5-5-5" />
                                  <path d="M15 12H3" />
                                  <path d="M21 5v14a2 2 0 0 1-2 2h-7" />
                                  <path d="M12 3h7a2 2 0 0 1 2 2" />
                                </svg>
                              ) : (
                                item.icon
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="text-[10px] font-black uppercase tracking-[0.12em] text-white">
                                {item.label}
                              </div>
                              <div className="mt-1 truncate text-[10px] font-black uppercase tracking-[0.12em] text-current/80">
                                {item.stat}
                              </div>
                            </div>
                          </div>
                          <div
                            className={`mt-3 font-semibold text-slate-300 ${
                              isActive
                                ? "line-clamp-3 text-xs leading-5"
                                : "line-clamp-2 text-[10px] leading-4"
                            }`}
                          >
                            {item.helper}
                          </div>
                          <div className="mt-3">
                            <button
                              aria-controls={detailsId}
                              aria-expanded={detailsOpen}
                              className={`flex w-full items-center justify-between rounded-2xl border border-white/10 bg-slate-950/34 font-black uppercase tracking-[0.12em] text-slate-100 transition hover:border-amber-100/34 hover:bg-slate-950/52 ${
                                isActive
                                  ? "px-3 py-2 text-[9px]"
                                  : "px-2.5 py-1.5 text-[8px]"
                              }`}
                              onClick={(event) => {
                                event.stopPropagation();
                                setOpenSessionsProfileDetailKey((openKey) =>
                                  openKey === detailsKey ? null : detailsKey,
                                );
                              }}
                              onKeyDown={(event) => event.stopPropagation()}
                              onPointerDown={(event) => event.stopPropagation()}
                              type="button"
                            >
                              <span>Details</span>
                              <span
                                aria-hidden="true"
                                className={`text-[10px] transition ${
                                  detailsOpen ? "rotate-180" : ""
                                }`}
                              >
                                v
                              </span>
                            </button>
                            <div
                              className={`overflow-hidden transition-all duration-300 ${
                                detailsOpen
                                  ? "mt-2 max-h-44 opacity-100"
                                  : "max-h-0 opacity-0"
                              }`}
                              id={detailsId}
                            >
                              <div className="grid gap-2">
                                {visibleReferences.map((reference) => (
                                  <span
                                    className={`rounded-2xl border border-white/10 bg-slate-950/34 font-black text-slate-100 ${
                                      isActive
                                        ? "px-3 py-2 text-[10px]"
                                        : "truncate px-2.5 py-1.5 text-[8px]"
                                    }`}
                                    key={reference}
                                  >
                                    {reference}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                          {isActive ? (
                            <button
                              className="mt-4 w-full rounded-2xl border border-white/10 bg-slate-950/36 px-3 py-2 text-center text-[9px] font-black uppercase tracking-[0.14em] text-white transition hover:border-amber-100/34 hover:bg-amber-300/10"
                              onClick={(event) => {
                                event.stopPropagation();

                                if ("action" in item && item.action === "logout") {
                                  void signOutFromSessionsHub();
                                  return;
                                }

                                setSessionsProfileHubOpen(false);
                                router.push(item.href);
                              }}
                              onPointerDown={(event) => event.stopPropagation()}
                              type="button"
                            >
                              {"action" in item && item.action === "logout"
                                ? "Log Out"
                                : item.label === "Edit Profile"
                                  ? "Open Profile"
                                  : "Open Account"}
                            </button>
                          ) : null}
                        </div>
                      );
                    })}
                    {activeSessionsProfileLayer === 2 ? (
                    <div
                      className="pointer-events-auto absolute left-1/2 z-30 flex -translate-x-1/2 items-center"
                      style={{ top: "calc(54% + 176px)" }}
                    >
                      <div className="flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/34 px-3 py-2">
                        {sessionsAccountOrbitItems.map((item, index) => (
                          <button
                            aria-label={`Show ${item.label}`}
                            className={`h-2 rounded-full transition ${
                              index === activeSessionsAccountIndex
                                ? "w-8 bg-amber-200 shadow-[0_0_14px_rgba(253,230,138,0.58)]"
                                : "w-2 bg-slate-500/55 hover:bg-cyan-200/75"
                            }`}
                            key={item.label}
                            onClick={() => setActiveSessionsAccountIndex(index)}
                            type="button"
                          />
                        ))}
                      </div>
                    </div>
                    ) : null}
                    <div className="hidden">
                      <Link
                        className="rounded-2xl border border-cyan-200/22 bg-cyan-300/10 px-4 py-3 text-center text-xs font-black uppercase tracking-[0.14em] text-cyan-100 transition hover:bg-cyan-300/16"
                        href={ROUTES.dashboard.profile}
                        onClick={() => setSessionsProfileHubOpen(false)}
                      >
                        Edit Profile
                      </Link>
                      <button
                        className="rounded-2xl border border-red-300/22 bg-red-500/10 px-4 py-3 text-left text-xs font-black uppercase tracking-[0.14em] text-red-100 transition hover:bg-red-500/16"
                        onClick={signOutFromSessionsHub}
                        type="button"
                      >
                        🚪 Logout
                      </button>
                    </div>
                  </div>
                </div>
              </div>
                    </>,
                    document.body,
                  )
                : null}
            </div>
          </div>
          <div className="relative z-10 py-0 [perspective:1600px]">

            <section
              className="relative overflow-visible rounded-[34px] transition-all duration-700 ease-out [transform-style:preserve-3d]"
              id="sessions-orbit-journey"
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute left-1/2 top-[48%] h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-300/10 blur-3xl"
              />

            {!isTrainingJourneyHeroActive ? (
              <button
                aria-label="Move training journey orbit up toward the hero command center"
                className="absolute left-1/2 top-[154px] z-30 flex h-10 w-10 -translate-x-1/2 items-center justify-center rounded-full border border-amber-200/28 bg-slate-950/70 text-xl font-black text-amber-100 shadow-[0_0_30px_rgba(250,204,21,0.14)] backdrop-blur transition hover:-translate-y-0.5 hover:border-cyan-200/45 hover:bg-cyan-300/10 hover:text-cyan-50 active:scale-95 sm:h-12 sm:w-12 sm:text-2xl"
                onClick={() => rotateTrainingJourney("up")}
                type="button"
              >
                ^
              </button>
            ) : null}
            <button
              aria-label="Move training journey orbit down to core systems"
              className="absolute bottom-[108px] left-1/2 z-30 flex h-10 w-10 -translate-x-1/2 items-center justify-center rounded-full border border-amber-200/28 bg-slate-950/70 text-xl font-black text-amber-100 shadow-[0_0_30px_rgba(250,204,21,0.14)] backdrop-blur transition hover:translate-y-0.5 hover:border-cyan-200/45 hover:bg-cyan-300/10 hover:text-cyan-50 active:scale-95 sm:h-12 sm:w-12 sm:text-2xl"
              onClick={() => rotateTrainingJourney("down")}
              type="button"
            >
              v
            </button>

            <button
              aria-label="Previous training journey stage"
              className={`absolute left-1 top-[68%] z-30 h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-cyan-200/24 bg-slate-950/64 text-2xl font-black text-cyan-100 shadow-[0_0_30px_rgba(34,211,238,0.16)] backdrop-blur transition hover:-translate-x-0.5 hover:border-amber-200/45 hover:bg-amber-300/10 hover:text-amber-100 active:scale-95 sm:left-3 sm:h-14 sm:w-14 sm:text-3xl ${
                isTrainingJourneyHeroActive ? "hidden" : "flex"
              }`}
              onClick={() => rotateTrainingJourney("left")}
              type="button"
            >
              ‹
            </button>
            <button
              aria-label="Next training journey stage"
              className={`absolute right-1 top-[68%] z-30 h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-cyan-200/24 bg-slate-950/64 text-2xl font-black text-cyan-100 shadow-[0_0_30px_rgba(34,211,238,0.16)] backdrop-blur transition hover:translate-x-0.5 hover:border-amber-200/45 hover:bg-amber-300/10 hover:text-amber-100 active:scale-95 sm:right-3 sm:h-14 sm:w-14 sm:text-3xl ${
                isTrainingJourneyHeroActive ? "hidden" : "flex"
              }`}
              onClick={() => rotateTrainingJourney("right")}
              type="button"
            >
              ›
            </button>

            <div
              aria-label="Training journey orbit selector"
              className="relative z-10 h-[880px] w-full cursor-grab select-none overflow-visible outline-none [perspective:1500px] [touch-action:none] active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-cyan-200/45 sm:h-[920px]"
              onClickCapture={(event) => {
                if (trainingJourneyPointerMovedRef.current) {
                  event.preventDefault();
                  event.stopPropagation();
                  trainingJourneyPointerMovedRef.current = false;
                }
              }}
              onKeyDown={handleTrainingJourneyKeyDown}
              onPointerCancel={(event) => {
                trainingJourneyPointerStartRef.current = null;
                if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
                  event.currentTarget.releasePointerCapture?.(event.pointerId);
                }
              }}
              onPointerDown={handleTrainingJourneyPointerDown}
              onPointerMove={handleTrainingJourneyPointerMove}
              onPointerUp={handleTrainingJourneyPointerUp}
              onWheel={handleTrainingJourneyWheel}
              onBlur={() => {
                trainingJourneyWheelCaptureRef.current = false;
              }}
              onFocus={() => {
                trainingJourneyWheelCaptureRef.current = true;
              }}
              ref={trainingJourneyOrbitRef}
              tabIndex={0}
            >
              <article
                aria-current={isTrainingJourneyHeroActive ? "step" : undefined}
                aria-label="Workout hero command center"
                className={`absolute left-1/2 top-1/2 z-50 w-[min(96%,1500px)] overflow-hidden rounded-[34px] border bg-[radial-gradient(circle_at_16%_0%,rgba(34,211,238,0.22),transparent_34%),radial-gradient(circle_at_88%_12%,rgba(251,191,36,0.14),transparent_30%),linear-gradient(135deg,rgba(15,23,42,0.9),rgba(2,6,23,0.74))] p-4 text-left shadow-2xl backdrop-blur-xl transition-[border-color,background-color,box-shadow] duration-300 [--sessions-hero-active-y:30px] sm:p-4 sm:[--sessions-hero-active-y:-38px] lg:p-5 lg:[--sessions-hero-active-y:-92px] ${
                  isTrainingJourneyHeroActive
                    ? "border-cyan-100/34 ring-2 ring-cyan-100/20 shadow-[0_34px_120px_rgba(0,0,0,0.50),0_0_52px_rgba(34,211,238,0.18)]"
                    : "border-cyan-200/14 shadow-[0_24px_70px_rgba(0,0,0,0.36)]"
                }`}
                onClick={() =>
                  setActiveTrainingJourneyLayer(TRAINING_JOURNEY_HERO_LAYER)
                }
                style={{
                  filter: isTrainingJourneyHeroActive
                    ? "blur(0px)"
                    : "blur(1.4px)",
                  opacity: trainingJourneyHeroOpacity,
                  pointerEvents: isTrainingJourneyHeroActive ? "auto" : "none",
                  transform: `translate(-50%, -50%) translateY(${
                    isTrainingJourneyHeroActive
                      ? "var(--sessions-hero-active-y)"
                      : `${trainingJourneyHeroOffset - 80}px`
                  }) scale(${isTrainingJourneyHeroActive ? 1 : 0.58})`,
                  transition:
                    "transform 560ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 360ms ease, filter 360ms ease",
                }}
              >
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute right-8 top-8 h-44 w-44 rounded-full bg-cyan-300/10 blur-3xl"
                />
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute -bottom-24 left-[18%] h-56 w-56 rounded-full bg-cyan-300/8 blur-3xl"
                />
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-16 bottom-8 h-52 w-52 rounded-full bg-amber-300/10 blur-3xl"
                />
                <div className="relative z-10 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 max-w-4xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-cyan-200/24 bg-cyan-300/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100">
                        Workout OS
                      </span>
                      <span className="rounded-full border border-amber-200/20 bg-amber-300/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-amber-100">
                        Current focus: {currentWorkoutStage.title}
                      </span>
                      <span className="rounded-full border border-emerald-200/18 bg-emerald-300/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-emerald-100">
                        {workoutJourneyProgress}% journey
                      </span>
                    </div>

                    <h1 className="mt-3 max-w-4xl text-3xl font-black leading-tight text-white sm:text-5xl">
                      Everything you need to work out.
                    </h1>
                    <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-slate-300 sm:text-base">
                      Start the logger, build sessions, follow the training
                      journey, collect workout achievements, and turn each
                      session into progress.
                    </p>

                    <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                      <Link
                        href={ROUTES.dashboard.sessionWorkout}
                        className="min-h-[46px] rounded-2xl bg-cyan-300 px-5 py-3 text-center text-xs font-black uppercase tracking-[0.14em] text-slate-950 shadow-[0_0_32px_rgba(34,211,238,0.26)] transition hover:-translate-y-0.5 hover:bg-cyan-200"
                      >
                        Start / Resume Workout
                      </Link>
                      <Link
                        href={ROUTES.workoutBuilder.home}
                        className="min-h-[46px] rounded-2xl border border-white/10 bg-white/[0.045] px-5 py-3 text-center text-xs font-black uppercase tracking-[0.14em] text-slate-200 transition hover:-translate-y-0.5 hover:border-amber-300/40 hover:bg-amber-300/10"
                      >
                        Build Workout
                      </Link>
                      <Link
                        href={ROUTES.dashboard.exerciseLibrary}
                        className="min-h-[46px] rounded-2xl border border-white/10 bg-white/[0.045] px-5 py-3 text-center text-xs font-black uppercase tracking-[0.14em] text-slate-200 transition hover:-translate-y-0.5 hover:border-cyan-300/40 hover:bg-cyan-400/10"
                      >
                        Exercise Library
                      </Link>
                    </div>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2 xl:w-[380px] xl:grid-cols-1">
                    <div className="rounded-[24px] border border-white/10 bg-slate-950/55 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                            Active Workout Source
                          </p>
                          <h2 className="mt-2 text-lg font-black text-white">
                            {activeSessionTemplate?.title ||
                              "Default workout logger"}
                          </h2>
                        </div>
                        <span className="rounded-full border border-cyan-200/24 bg-cyan-300/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-cyan-100">
                          {activeSessionTemplate ? "Loaded" : "Ready"}
                        </span>
                      </div>
                      <p className="mt-2 line-clamp-2 text-xs font-semibold leading-5 text-slate-400">
                        {activeSessionTemplate
                          ? `${activeSessionTemplate.exercises.length} exercise${
                              activeSessionTemplate.exercises.length === 1
                                ? ""
                                : "s"
                            } loaded from your saved templates.`
                          : "No saved template is active. The logger opens with the default workout fallback."}
                      </p>
                      {launcherMessage ? (
                        <p className="mt-3 rounded-2xl border border-emerald-300/20 bg-emerald-400/10 px-3 py-2 text-xs font-semibold text-emerald-100">
                          {launcherMessage}
                        </p>
                      ) : null}
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-2">
                      {[
                        {
                          icon: "⚡",
                          label: "Sound Points",
                          tone:
                            "border-cyan-300/20 bg-cyan-300/10 text-cyan-100",
                          value: workoutRewardStats.soundPoints.toLocaleString(),
                        },
                        {
                          icon: "🏋️",
                          label: "Workout XP",
                          tone:
                            "border-amber-300/24 bg-amber-300/10 text-amber-100",
                          value: workoutRewardStats.workoutXp.toLocaleString(),
                        },
                        {
                          icon: "🔥",
                          label: "Training Streak",
                          tone:
                            "border-orange-300/22 bg-orange-300/10 text-orange-100",
                          value: `${workoutRewardStats.trainingStreak} days`,
                        },
                        {
                          icon: "token",
                          label: "Sound Tokens",
                          tone:
                            "border-amber-300/24 bg-slate-950/50 text-amber-100",
                          value: workoutRewardStats.soundTokens.toLocaleString(),
                        },
                      ].map((reward) => (
                        <div
                          key={reward.label}
                          className={`rounded-2xl border p-3 shadow-[0_0_18px_rgba(0,0,0,0.16)] ${reward.tone}`}
                        >
                          <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.13em]">
                            {reward.icon === "token" ? (
                              <span className="relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-amber-200/35 bg-slate-950/70 shadow-[0_0_14px_rgba(250,204,21,0.25)]">
                                <Image
                                  src="/sound-fitness-logo.png"
                                  alt="Sound Fitness token"
                                  width={18}
                                  height={18}
                                  className="rounded-full"
                                />
                              </span>
                            ) : (
                              <span className="text-base" aria-hidden="true">
                                {reward.icon}
                              </span>
                            )}
                            {reward.label}
                          </div>
                          <div className="mt-1 text-xl font-black tracking-tight text-white">
                            {reward.value}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="relative z-10 -mx-4 mt-4 overflow-hidden border-y border-white/10 bg-[radial-gradient(circle_at_8%_0%,rgba(250,204,21,0.12),transparent_32%),radial-gradient(circle_at_92%_20%,rgba(34,211,238,0.10),transparent_34%),rgba(2,6,23,0.24)] py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] sm:-mx-4 lg:-mx-5">
                  <div
                    aria-label="Workout achievement orbit"
                    className="relative z-10 h-[210px] cursor-grab select-none overflow-hidden [perspective:1100px] [touch-action:pan-y] active:cursor-grabbing sm:h-[226px]"
                    onPointerCancel={(event) =>
                      finishHorizontalOrbitDrag(
                        event,
                        heroAchievementPointerStartRef,
                      )
                    }
                    onPointerDown={(event) =>
                      startHorizontalOrbitDrag(
                        event,
                        heroAchievementPointerStartRef,
                        heroAchievementPointerMovedRef,
                      )
                    }
                    onPointerMove={(event) =>
                      moveHorizontalOrbitDrag(
                        event,
                        heroAchievementPointerStartRef,
                        heroAchievementPointerMovedRef,
                        rotateHeroAchievement,
                        58,
                      )
                    }
                    onPointerUp={(event) =>
                      finishHorizontalOrbitDrag(
                        event,
                        heroAchievementPointerStartRef,
                      )
                    }
                    onWheel={handleHeroAchievementWheel}
                    onWheelCapture={handleHeroAchievementWheel}
                  >
                    <button
                      aria-label="Previous workout achievement"
                      className="absolute left-2 top-1/2 z-40 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-cyan-200/24 bg-slate-950/72 text-lg font-black text-cyan-100 shadow-[0_0_22px_rgba(34,211,238,0.14)] backdrop-blur transition hover:-translate-x-0.5 hover:border-amber-200/45 hover:bg-amber-300/10 hover:text-amber-100"
                      onClick={(event) => {
                        event.stopPropagation();
                        rotateHeroAchievement("left");
                      }}
                      type="button"
                    >
                      &lt;
                    </button>
                    <button
                      aria-label="Next workout achievement"
                      className="absolute right-2 top-1/2 z-40 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-cyan-200/24 bg-slate-950/72 text-lg font-black text-cyan-100 shadow-[0_0_22px_rgba(34,211,238,0.14)] backdrop-blur transition hover:translate-x-0.5 hover:border-amber-200/45 hover:bg-amber-300/10 hover:text-amber-100"
                      onClick={(event) => {
                        event.stopPropagation();
                        rotateHeroAchievement("right");
                      }}
                      type="button"
                    >
                      &gt;
                    </button>

                    {workoutAchievements.map((achievement, index) => {
                      const distance = getHeroAchievementOrbitDistance(index);
                      const absDistance = Math.abs(distance);
                      const direction = Math.sign(distance);
                      const slot =
                        heroAchievementOrbitSlots[
                          Math.min(absDistance, heroAchievementOrbitSlots.length - 1)
                        ];
                      const isActiveAchievement =
                        index === activeHeroAchievementIndex;

                      return (
                        <article
                          aria-current={isActiveAchievement ? "step" : undefined}
                          aria-label={`Open ${achievement.label} achievements`}
                          className={`group/hero-achievement absolute left-1/2 top-1/2 flex min-h-[148px] w-[min(56vw,190px)] cursor-pointer flex-col items-center justify-center text-center transition duration-300 ${
                            isActiveAchievement
                              ? "drop-shadow-[0_20px_44px_rgba(34,211,238,0.26)]"
                              : "hover:drop-shadow-[0_14px_34px_rgba(34,211,238,0.14)]"
                          }`}
                          key={`${achievement.label}-hero-orbit`}
                          onClick={(event) => {
                            event.stopPropagation();
                            if (heroAchievementPointerMovedRef.current) {
                              event.preventDefault();
                              heroAchievementPointerMovedRef.current = false;
                              return;
                            }

                            router.push(achievement.href || ROUTES.dashboard.achievements);
                          }}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              router.push(achievement.href || ROUTES.dashboard.achievements);
                            }
                          }}
                          role="link"
                          style={{
                            filter: `blur(${slot.blur}px)`,
                            opacity: slot.opacity,
                            pointerEvents: absDistance > 2 ? "none" : "auto",
                            transform: `translate(-50%, -50%) translateX(${
                              direction * slot.x
                            }px) translateY(${slot.y}px) scale(${slot.scale}) rotateY(${
                              direction * slot.rotateY
                            }deg)`,
                            transition:
                              "transform 520ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 320ms ease, filter 320ms ease",
                            zIndex: slot.zIndex,
                          }}
                          tabIndex={0}
                        >
                          <span
                            aria-hidden="true"
                            className={`pointer-events-none absolute left-1/2 top-[42%] h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full blur-2xl transition ${
                              isActiveAchievement
                                ? "bg-cyan-300/20"
                                : "bg-cyan-300/8"
                            }`}
                          />
                          <div
                            className={`relative z-10 grid place-items-center transition duration-300 ${
                              isActiveAchievement ? "scale-110" : "scale-95"
                            }`}
                          >
                            <SoundLogoAchievementBadge
                              compact={!isActiveAchievement}
                              item={achievement}
                            />
                          </div>
                          <h3
                            className={`relative z-10 mt-4 max-w-[170px] text-center font-black uppercase leading-tight tracking-[0.1em] ${
                              isActiveAchievement
                                ? "text-sm text-white drop-shadow-[0_0_16px_rgba(34,211,238,0.24)]"
                                : "text-[10px] text-slate-300"
                            }`}
                          >
                            {achievement.label}
                          </h3>
                        </article>
                      );
                    })}
                  </div>
                </div>
              </article>

              {[
                {
                  helper: "Profile + Goals, My Plan, Builder, Exercise Library, Session History",
                  label: "Core Flow Row",
                  layer: 0,
                  tone: "border-cyan-200/26 bg-cyan-300/10 text-cyan-100",
                },
                {
                  helper: "Insights, Performance, Achievements",
                  label: "Upper Systems Row",
                  layer: 1,
                  tone: "border-amber-200/26 bg-amber-300/10 text-amber-100",
                },
              ].map((row) => {
                const isActiveRow = row.layer === activeTrainingJourneyLayer;
                const rowLayerOffset =
                  row.layer - activeTrainingJourneyLayer;
                const previewShift =
                  isTrainingJourneyHeroActive && row.layer >= 0 ? 120 : 0;
                const rowCenterOffset =
                  -8 +
                  rowLayerOffset * TRAINING_JOURNEY_LAYER_SPACING +
                  previewShift;
                const unclampedLabelOffset =
                  rowCenterOffset - (isActiveRow ? 252 : 220);
                const labelOffset = Math.max(
                  -560,
                  Math.min(360, unclampedLabelOffset),
                );
                const isRowAboveActive = rowLayerOffset < 0;

                return (
                  <div
                    aria-hidden="true"
                    className={`pointer-events-none absolute left-1/2 top-1/2 z-40 w-[min(90%,440px)] rounded-2xl border px-3 py-2 text-center shadow-[0_16px_44px_rgba(0,0,0,0.30)] backdrop-blur ${row.tone}`}
                    key={row.label}
                    style={{
                      opacity: isTrainingJourneyHeroActive
                        ? 0
                        : isActiveRow
                          ? 1
                          : isRowAboveActive
                            ? 0.08
                            : 0.5,
                      transform: `translate(-50%, ${labelOffset}px)`,
                      transition:
                        "opacity 360ms ease, transform 560ms cubic-bezier(0.2, 0.8, 0.2, 1)",
                    }}
                  >
                    <div className="text-[9px] font-black uppercase tracking-[0.16em]">
                      {row.label}
                    </div>
                    <div className="mt-1 text-[10px] font-bold leading-4 text-slate-300">
                      {row.helper}
                    </div>
                  </div>
                );
              })}

              {combinedTrainingJourneyStages.map((stage, index) => {
                const styles = workoutJourneyStatusStyles[stage.status];
                const isCurrent = stage.status === "Current";
                const isNext = stage.status === "Next";
                const isComplete = stage.status === "Complete";
                const isFoundation = stage.title === "Profile + Goals";
                const isAchievements = stage.title === "Achievements";
                const isUpperSystem = UPPER_TRAINING_JOURNEY_TITLES.has(
                  stage.title,
                );
                const distance = getTrainingJourneyOrbitDistance(index);
                const absDistance = Math.abs(distance);
                const direction = Math.sign(distance);
                const layerOffset = getTrainingJourneyLayerOffset(index);
                const absLayerOffset = Math.abs(layerOffset);
                const orbitSlots = [
                  { blur: 0, opacity: 1, rotateY: 0, scale: 1, x: 0, y: -8, zIndex: 44 },
                  { blur: 0.1, opacity: 0.8, rotateY: -16, scale: 0.74, x: 342, y: 34, zIndex: 32 },
                  { blur: 0.95, opacity: 0.34, rotateY: -30, scale: 0.5, x: 520, y: 106, zIndex: 18 },
                  { blur: 1.8, opacity: 0.16, rotateY: -40, scale: 0.38, x: 390, y: 150, zIndex: 10 },
                  { blur: 2.4, opacity: 0.08, rotateY: -50, scale: 0.32, x: 180, y: 180, zIndex: 6 },
                ];
                const slot =
                  orbitSlots[Math.min(absDistance, orbitSlots.length - 1)];
                const isActiveOrbit = index === activeTrainingJourneyIndex;
                const isLayerLeadCard = absDistance === 0;
                const isFocusedLayer = absLayerOffset === 0;
                const isLayerAboveActive = layerOffset < 0;
                const layerScale = isActiveOrbit
                  ? 1.04
                  : isLayerLeadCard
                    ? isFocusedLayer
                      ? 1
                      : isLayerAboveActive
                        ? 0.48
                        : 0.68
                  : absLayerOffset === 0
                    ? 1
                    : isLayerAboveActive
                      ? 0.44
                      : 0.62;
                const baseLayerOpacity = isActiveOrbit
                  ? 1
                  : isLayerLeadCard
                  ? isFocusedLayer
                    ? 1
                    : isLayerAboveActive
                      ? 0.06
                      : 0.44
                  : absLayerOffset === 0
                    ? slot.opacity
                    : isLayerAboveActive
                    ? Math.min(slot.opacity, 0.05)
                    : Math.min(slot.opacity, 0.22);
                const hideLayerBehindHero =
                  isTrainingJourneyHeroActive && layerOffset > 0;
                const layerOpacity = hideLayerBehindHero
                  ? 0
                  : baseLayerOpacity;
                const layerBlur = isLayerLeadCard
                  ? absLayerOffset * (isLayerAboveActive ? 1.4 : 0.55)
                  : slot.blur + absLayerOffset * (isLayerAboveActive ? 1.8 : 1.1);
                const previewShift =
                  isTrainingJourneyHeroActive && layerOffset > 0 ? 120 : 0;
                const layerY =
                  slot.y +
                  layerOffset * TRAINING_JOURNEY_LAYER_SPACING +
                  previewShift;

                return (
                  <article
                    aria-current={isCurrent ? "step" : undefined}
                    aria-label={`Open ${stage.title}`}
                    className={`group absolute left-1/2 top-1/2 flex min-h-[304px] w-[270px] flex-col justify-between overflow-hidden rounded-[28px] border p-4 text-left shadow-2xl transition-[border-color,background-color,box-shadow] duration-300 sm:w-[340px] ${
                      isActiveOrbit
                        ? `${styles.card} !border-cyan-100/75 !bg-slate-950/92 ring-2 ring-cyan-100/45 shadow-[0_30px_94px_rgba(0,0,0,0.58),0_0_48px_rgba(34,211,238,0.34)]`
                        : styles.card
                    } ${
                      isLayerLeadCard && !isActiveOrbit
                        ? "ring-1 ring-white/15 shadow-[0_26px_78px_rgba(0,0,0,0.46),0_0_34px_rgba(34,211,238,0.18)]"
                        : ""
                    }`}
                    key={stage.title}
                    onClick={() => {
                      if (trainingJourneyPointerMovedRef.current) {
                        trainingJourneyPointerMovedRef.current = false;
                        return;
                      }

                      router.push(stage.href);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        router.push(stage.href);
                      }
                    }}
                    role="link"
                    style={{
                      filter: `blur(${layerBlur}px)`,
                      opacity: layerOpacity,
                      pointerEvents: hideLayerBehindHero ? "none" : "auto",
                      transform: `translate(-50%, -50%) translateX(${
                        direction * slot.x
                      }px) translateY(${layerY}px) scale(${slot.scale * layerScale}) rotateY(${
                        direction * slot.rotateY
                      }deg)`,
                      transition:
                        "transform 560ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 360ms ease, filter 360ms ease",
                      zIndex: slot.zIndex - absLayerOffset * 14,
                    }}
                    tabIndex={0}
                    title={`${stage.title} - ${stage.nextAction}`}
                  >
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none absolute inset-0 ${
                        isLayerLeadCard
                          ? isActiveOrbit
                            ? "bg-[radial-gradient(circle_at_18%_0%,rgba(34,211,238,0.20),transparent_34%),linear-gradient(180deg,rgba(2,6,23,0.88),rgba(2,6,23,0.72))]"
                            : "bg-slate-950/52"
                          : "bg-slate-950/16"
                      }`}
                    />
                    <div className="relative z-10">
                      <div className="flex items-start justify-between gap-3">
                        <span
                          className={`grid h-12 w-12 place-items-center rounded-2xl border text-xl ${styles.marker}`}
                          aria-hidden="true"
                        >
                          {isFoundation ? (
                            <span className="relative grid h-full w-full place-items-center">
                              <span className="text-lg leading-none">👤</span>
                              <span className="absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full border border-amber-100/40 bg-slate-950 text-[11px] shadow-[0_0_12px_rgba(250,204,21,0.22)]">
                                🎯
                              </span>
                            </span>
                          ) : isComplete ? (
                            "✓"
                          ) : (
                            stage.icon
                          )}
                        </span>
                        <span
                          className={`rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] ${styles.badge}`}
                        >
                          {stage.status}
                        </span>
                      </div>

                      <h3
                        className={`mt-4 font-black uppercase tracking-tight ${
                          isActiveOrbit
                            ? "text-xl text-white drop-shadow-[0_0_14px_rgba(34,211,238,0.18)]"
                            : "text-lg text-white"
                        }`}
                      >
                        {stage.title}
                      </h3>
                      <span
                        className={`mt-2 inline-flex rounded-full border px-2 py-1 text-[8px] font-black uppercase tracking-[0.12em] ${
                          isUpperSystem
                            ? "border-amber-200/24 bg-amber-300/10 text-amber-100"
                            : "border-cyan-200/24 bg-cyan-300/10 text-cyan-100"
                        }`}
                      >
                        {isUpperSystem ? "Upper System" : "Core Flow"}
                      </span>
                      <p
                        className={`mt-2 font-semibold ${
                          isActiveOrbit
                            ? "line-clamp-3 text-sm leading-6 text-slate-100"
                            : isLayerLeadCard
                              ? "line-clamp-2 text-xs leading-5 text-slate-200"
                              : "line-clamp-2 text-xs leading-5 text-slate-400"
                        }`}
                      >
                        {stage.helper}
                      </p>

                      {isFoundation ? (
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          {[
                            ["Goal", activePlan.primaryFocus],
                            ["Style", activePlan.split],
                            ["Readiness", activePlan.recovery],
                            ["Experience", activePlan.phase],
                          ].map(([label, value]) => (
                            <span
                              key={label}
                              className="rounded-2xl border border-cyan-200/14 bg-slate-950/52 px-2.5 py-2"
                            >
                              <span className="block text-[8px] font-black uppercase tracking-[0.12em] text-slate-500">
                                {label}
                              </span>
                              <span className="mt-1 block truncate text-[10px] font-black text-cyan-50">
                                {value}
                              </span>
                            </span>
                          ))}
                        </div>
                      ) : null}

                      {isAchievements ? (
                        <div className="mt-3 rounded-2xl border border-amber-200/18 bg-amber-300/8 p-3">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-[9px] font-black uppercase tracking-[0.14em] text-amber-100">
                              Sound Points
                            </span>
                            <span className="text-sm font-black text-white">
                              {workoutRewardStats.soundPoints.toLocaleString()}
                            </span>
                          </div>
                          <div className="mt-2 flex gap-1.5 overflow-hidden">
                            {workoutAchievements.slice(0, 3).map((achievement) => (
                              <span
                                key={achievement.label}
                                className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-white/10 bg-slate-950/58 text-sm shadow-[0_0_12px_rgba(250,204,21,0.10)]"
                                title={achievement.label}
                              >
                                {achievement.icon}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>

                    <div className="relative z-10 mt-4">
                      <div className="flex items-center justify-between gap-3 text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">
                        <span>{stage.progress}%</span>
                        {isCurrent ? (
                          <span className="rounded-full border border-cyan-200/30 bg-cyan-300/12 px-2 py-1 text-cyan-100">
                            Current Focus
                          </span>
                        ) : isNext ? (
                          <span className="rounded-full border border-amber-200/30 bg-amber-300/12 px-2 py-1 text-amber-100">
                            Next
                          </span>
                        ) : (
                          <span className="rounded-full border border-white/10 bg-white/[0.045] px-2 py-1 text-slate-300">
                            {stage.nextAction}
                          </span>
                        )}
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-950/80">
                        <span
                          className={`block h-full rounded-full ${
                            isComplete
                              ? "bg-emerald-300"
                              : isCurrent
                                ? "bg-cyan-300 shadow-[0_0_16px_rgba(34,211,238,0.38)]"
                                : isNext
                                  ? "bg-amber-300"
                                  : "bg-white/20"
                          }`}
                          style={{ width: `${stage.progress}%` }}
                        />
                      </div>

                      {isActiveOrbit ? (
                        <Link
                          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-cyan-200/35 bg-cyan-300/14 px-4 py-3 text-[10px] font-black uppercase tracking-[0.14em] text-cyan-50 shadow-[0_0_24px_rgba(34,211,238,0.16)] transition hover:-translate-y-0.5 hover:bg-cyan-300/20 active:scale-[0.98]"
                          href={stage.href}
                          onClick={(event) => event.stopPropagation()}
                        >
                          Open Stage
                          <span aria-hidden="true">→</span>
                        </Link>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="relative z-10 mt-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center justify-center gap-2 lg:justify-start">
                <button
                  aria-label="Select Hero Command Center"
                  className={`h-2.5 rounded-full transition-all duration-300 ${
                    isTrainingJourneyHeroActive
                      ? "w-8 bg-amber-200 shadow-[0_0_14px_rgba(250,204,21,0.55)]"
                      : "w-2.5 bg-white/18 hover:bg-white/36"
                  }`}
                  onClick={() =>
                    setActiveTrainingJourneyLayer(TRAINING_JOURNEY_HERO_LAYER)
                  }
                  type="button"
                />
                {combinedTrainingJourneyStages.map((stage, index) => {
                  const isActive = index === activeTrainingJourneyIndex;

                  return (
                    <button
                      aria-label={`Select ${stage.title}`}
                      className={`h-2.5 rounded-full transition-all duration-300 ${
                        isActive
                          ? "w-8 bg-cyan-200 shadow-[0_0_14px_rgba(34,211,238,0.55)]"
                          : "w-2.5 bg-white/18 hover:bg-white/36"
                      }`}
                      key={`${stage.title}-dot`}
                      onClick={() => {
                        const targetLayer = getTrainingJourneyLayer(index);
                        const targetPosition =
                          index % TRAINING_JOURNEY_LAYER_SIZE;

                        setActiveTrainingJourneyLayer(targetLayer);
                        setActiveTrainingJourneyPositions((currentPositions) => {
                          const nextPositions = [...currentPositions];

                          nextPositions[targetLayer] = targetPosition;

                          return nextPositions;
                        });
                      }}
                      type="button"
                    />
                  );
                })}
              </div>

              <div className="flex flex-col gap-3 rounded-[24px] border border-white/10 bg-white/[0.035] p-3 sm:flex-row sm:items-center sm:justify-between lg:min-w-[430px]">
                <div className="min-w-0">
                  <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                    Active Journey Stage
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-sm font-black text-white">
                    <span aria-hidden="true">
                      {isTrainingJourneyHeroActive
                        ? "OS"
                        : activeTrainingJourneyStage.icon}
                    </span>
                    <span className="truncate">
                      {isTrainingJourneyHeroActive
                        ? "Hero Command Center"
                        : activeTrainingJourneyStage.title}
                    </span>
                  </div>
                </div>
                <Link
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-amber-200/35 bg-amber-300/12 px-4 py-3 text-xs font-black uppercase tracking-[0.14em] text-amber-50 shadow-[0_0_24px_rgba(250,204,21,0.14)] transition hover:-translate-y-0.5 hover:bg-amber-300/18 active:scale-[0.98]"
                  href={
                    isTrainingJourneyHeroActive
                      ? ROUTES.dashboard.sessionWorkout
                      : activeTrainingJourneyStage.href
                  }
                >
                  {isTrainingJourneyHeroActive
                    ? "Start Workout"
                    : "Open Journey Page"}
                  <span aria-hidden="true">→</span>
                </Link>
              </div>
            </div>
            </section>

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

        <section className="grid min-w-0 gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="min-w-0 rounded-[32px] border border-white/10 bg-white/[0.05] p-5 shadow-2xl shadow-black/20 backdrop-blur sm:p-6">
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

          <div className="min-w-0 overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.05] p-5 shadow-2xl shadow-black/20 backdrop-blur sm:p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-emerald-300">
                  Recent Completed Sessions
                </p>
                <h2 className="mt-2 text-2xl font-black">Workout log</h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-fit rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-2 text-[11px] font-black uppercase tracking-[0.14em] text-emerald-200">
                  {logSourceLabel}
                </span>
                {recentWorkoutSummaries.length > 0 ? (
                  <div className="flex items-center gap-1.5 rounded-2xl border border-emerald-200/12 bg-slate-950/42 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                    <button
                      aria-label="Scroll recently completed sessions left"
                      className="grid h-9 w-9 place-items-center rounded-xl border border-emerald-200/16 bg-emerald-300/8 text-sm font-black text-emerald-100 transition hover:-translate-x-0.5 hover:border-emerald-100/42 hover:bg-emerald-300/14 active:scale-95"
                      onClick={() => scrollRecentSessions("left")}
                      type="button"
                    >
                      &lt;
                    </button>
                    <button
                      aria-label="Scroll recently completed sessions right"
                      className="grid h-9 w-9 place-items-center rounded-xl border border-emerald-200/16 bg-emerald-300/8 text-sm font-black text-emerald-100 transition hover:translate-x-0.5 hover:border-emerald-100/42 hover:bg-emerald-300/14 active:scale-95"
                      onClick={() => scrollRecentSessions("right")}
                      type="button"
                    >
                      &gt;
                    </button>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="mt-5 max-w-full overflow-hidden">
              {recentWorkoutSummaries.length > 0 ? (
                <div
                  className="flex max-w-full snap-x snap-mandatory cursor-grab select-none gap-3 overflow-x-auto overscroll-x-contain pb-1 scroll-smooth [scrollbar-color:rgba(52,211,153,0.46)_rgba(15,23,42,0.42)] [scrollbar-width:thin] [touch-action:pan-y] active:cursor-grabbing [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-emerald-300/40 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-slate-950/40"
                  onClickCapture={(event) => {
                    if (recentSessionsScrollDragRef.current.moved) {
                      event.preventDefault();
                      event.stopPropagation();
                      recentSessionsScrollDragRef.current.moved = false;
                    }
                  }}
                  onPointerCancel={(event) =>
                    finishHorizontalScrollDrag(
                      event,
                      recentSessionsScrollDragRef,
                    )
                  }
                  onPointerDown={(event) =>
                    startHorizontalScrollDrag(
                      event,
                      recentSessionsScrollRef,
                      recentSessionsScrollDragRef,
                    )
                  }
                  onPointerMove={(event) =>
                    moveHorizontalScrollDrag(
                      event,
                      recentSessionsScrollRef,
                      recentSessionsScrollDragRef,
                    )
                  }
                  onPointerUp={(event) =>
                    finishHorizontalScrollDrag(
                      event,
                      recentSessionsScrollDragRef,
                    )
                  }
                  ref={recentSessionsScrollRef}
                >
                  {recentWorkoutSummaries.map((session) => (
                    <article
                      key={session.id}
                      className="min-w-full snap-start overflow-hidden rounded-[26px] border border-emerald-200/14 bg-[radial-gradient(circle_at_0%_0%,rgba(16,185,129,0.11),transparent_34%),rgba(15,23,42,0.62)] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.18)]"
                    >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <h3 className="text-base font-black text-white">
                          {session.title}
                        </h3>
                        <p className="mt-1 text-xs font-semibold text-slate-400">
                          {formatDateTime(session.date)}
                        </p>
                      </div>
                      <span className="w-fit rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-xs font-black text-emerald-200">
                        Completed
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-full border border-cyan-200/16 bg-cyan-300/8 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-cyan-100">
                        Latest: {session.latestExercise}
                      </span>
                      {session.patterns.slice(0, 2).map((pattern) => (
                        <span
                          className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-bold text-slate-300"
                          key={`${session.id}-${pattern}`}
                        >
                          {pattern}
                        </span>
                      ))}
                      {session.equipment.slice(0, 2).map((equipment) => (
                        <span
                          className="rounded-full border border-amber-200/16 bg-amber-300/8 px-3 py-1 text-[10px] font-bold text-amber-100"
                          key={`${session.id}-${equipment}`}
                        >
                          {equipment}
                        </span>
                      ))}
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
                      {[
                        ["Movements", String(session.exerciseCount)],
                        ["Sets", String(session.totalSets)],
                        ["Reps", session.totalReps ? String(session.totalReps) : "Not logged"],
                        [
                          session.totalVolume ? "Volume" : "Top Load",
                          session.totalVolume
                            ? `${session.totalVolume.toLocaleString()} lb`
                            : session.topLoad
                              ? `${formatCompactNumber(session.topLoad)} lb`
                              : "Unweighted",
                        ],
                      ].map(([label, value]) => (
                        <div
                          className="rounded-2xl border border-white/10 bg-white/[0.04] p-3"
                          key={label}
                        >
                          <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">
                            {label}
                          </p>
                          <p className="mt-1 break-words text-lg font-black text-white">
                            {value}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-200/80">
                          Movement Detail
                        </p>
                        {session.bodyFocus.length > 0 ? (
                          <span className="truncate text-[10px] font-bold text-slate-500">
                            Focus: {session.bodyFocus.slice(0, 2).join(" / ")}
                          </span>
                        ) : null}
                      </div>

                      {session.movements.slice(0, 4).map((movement) => (
                        <div
                          className="rounded-2xl border border-white/10 bg-slate-950/48 p-3"
                          key={`${session.id}-${movement.name}`}
                        >
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-black text-white">
                                {movement.name}
                              </p>
                              <p className="mt-1 text-xs font-semibold text-slate-500">
                                {movement.pattern || "Pattern not logged"}
                                {movement.equipment
                                  ? ` / ${movement.equipment}`
                                  : ""}
                              </p>
                            </div>
                            <div className="flex shrink-0 flex-wrap gap-1.5">
                              <span className="rounded-full border border-cyan-200/16 bg-cyan-300/8 px-2.5 py-1 text-[9px] font-black text-cyan-100">
                                {movement.sets || 0} sets
                              </span>
                              <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[9px] font-black text-slate-300">
                                {movement.repsLabel}
                              </span>
                              <span className="rounded-full border border-amber-200/16 bg-amber-300/8 px-2.5 py-1 text-[9px] font-black text-amber-100">
                                {movement.loadLabel}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}

                      {session.movements.length > 4 ? (
                        <div className="rounded-2xl border border-white/10 bg-white/[0.035] px-3 py-2 text-xs font-bold text-slate-400">
                          +{session.movements.length - 4} more movement
                          {session.movements.length - 4 === 1 ? "" : "s"} in
                          this session.
                        </div>
                      ) : null}
                    </div>
                    <Link
                      href={ROUTES.dashboard.sessionHistory}
                      className="mt-4 inline-flex min-h-[40px] items-center justify-center rounded-2xl border border-emerald-200/24 bg-emerald-300/10 px-4 text-xs font-black uppercase tracking-[0.14em] text-emerald-100 transition hover:-translate-y-0.5 hover:bg-emerald-300/16"
                    >
                      Review Session
                    </Link>
                    </article>
                  ))}
                </div>
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
