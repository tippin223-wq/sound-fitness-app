"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  const trainingJourneyPointerStartRef = useRef<number | null>(null);
  const trainingJourneyPointerMovedRef = useRef(false);
  const trainingJourneyOrbitRef = useRef<HTMLDivElement | null>(null);
  const trainingJourneyWheelCaptureRef = useRef(false);
  const trainingJourneyWheelLockRef = useRef(0);
  const heroAchievementWheelLockRef = useRef(0);
  const sessionsProfileHubRef = useRef<HTMLDivElement | null>(null);
  const recentSessionsScrollRef = useRef<HTMLDivElement | null>(null);
  const [activeSessionsDashboardIndex, setActiveSessionsDashboardIndex] =
    useState(0);
  const [sessionsProfileHubOpen, setSessionsProfileHubOpen] = useState(false);

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
  const heroAchievementCount = workoutAchievements.length;
  const rotateHeroAchievement = (direction: "left" | "right") => {
    if (heroAchievementCount < 2) return;

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
    trainingJourneyPointerStartRef.current = event.clientX;
    trainingJourneyPointerMovedRef.current = false;
    trainingJourneyWheelCaptureRef.current = true;
    event.currentTarget.focus({ preventScroll: true });
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const handleTrainingJourneyPointerUp = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    const startX = trainingJourneyPointerStartRef.current;
    trainingJourneyPointerStartRef.current = null;

    if (startX === null) {
      return;
    }

    const deltaX = event.clientX - startX;

    if (Math.abs(deltaX) < 44) {
      return;
    }

    trainingJourneyPointerMovedRef.current = true;
    rotateTrainingJourney(deltaX > 0 ? "left" : "right");
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

    if (Math.abs(primaryDelta) < 18) {
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
    if (now - trainingJourneyWheelLockRef.current < 360) return;

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

    const handlePointerDown = (event: MouseEvent) => {
      if (
        sessionsProfileHubRef.current &&
        !sessionsProfileHubRef.current.contains(event.target as Node)
      ) {
        setSessionsProfileHubOpen(false);
      }
    };
    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setSessionsProfileHubOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
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
    setActiveSessionsDashboardIndex((currentIndex) =>
      direction === "left"
        ? (currentIndex - 1 + sessionsOrbitDashboardLinks.length) %
          sessionsOrbitDashboardLinks.length
        : (currentIndex + 1) % sessionsOrbitDashboardLinks.length,
    );
  };
  const scrollRecentSessions = (direction: "left" | "right") => {
    recentSessionsScrollRef.current?.scrollBy({
      behavior: "smooth",
      left: direction === "left" ? -560 : 560,
    });
  };
  const sessionsHubOrbitItems = [
    {
      href: ROUTES.dashboard.stats,
      helper: "Progress, PRs, and training trends.",
      icon: "📈",
      label: "Stats",
      tone: "border-cyan-200/24 bg-cyan-300/10 text-cyan-100",
    },
    {
      href: ROUTES.dashboard.goals,
      helper: "Outcomes and training direction.",
      icon: "🎯",
      label: "Goals",
      tone: "border-amber-200/26 bg-amber-300/10 text-amber-100",
    },
    {
      href: ROUTES.dashboard.insights,
      helper: "Coach intelligence and next actions.",
      icon: "🧠",
      label: "Insights",
      tone: "border-violet-200/24 bg-violet-300/10 text-violet-100",
    },
    {
      href: ROUTES.dashboard.plan,
      helper: "Weekly structure and templates.",
      icon: "📅",
      label: "Plan",
      tone: "border-sky-200/24 bg-sky-300/10 text-sky-100",
    },
    {
      href: ROUTES.dashboard.achievements,
      helper: "Milestones, badges, and wins.",
      icon: "🏆",
      label: "Achievements",
      tone: "border-orange-200/24 bg-orange-300/10 text-orange-100",
    },
    {
      href: ROUTES.dashboard.coachMessaging,
      helper: "Coach messages and questions.",
      icon: "💬",
      label: "Messages",
      tone: "border-emerald-200/24 bg-emerald-300/10 text-emerald-100",
    },
  ] as const;
  const sessionsAccountOrbitItems = [
    {
      href: ROUTES.dashboard.profile,
      helper: "Training identity, body metrics, preferences, and avatar.",
      icon: "👤",
      label: "Profile",
      tone: "border-cyan-200/24 bg-cyan-300/10 text-cyan-100",
    },
    {
      href: ROUTES.dashboard.settings,
      helper: "App preferences and account controls.",
      icon: "⚙️",
      label: "Settings",
      tone: "border-violet-200/24 bg-violet-300/10 text-violet-100",
    },
    {
      href: ROUTES.dashboard.payments,
      helper: "Payments and invoice history.",
      icon: "💳",
      label: "Billing",
      tone: "border-amber-200/24 bg-amber-300/10 text-amber-100",
    },
    {
      href: ROUTES.dashboard.help,
      helper: "Support, FAQs, and app guidance.",
      icon: "💬",
      label: "Help",
      tone: "border-emerald-200/24 bg-emerald-300/10 text-emerald-100",
    },
  ] as const;

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
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-1/2 h-[86%] w-[92%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-200/8 shadow-[0_0_120px_rgba(34,211,238,0.10)]"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-1/2 h-[66%] w-[76%] -translate-x-1/2 -translate-y-1/2 rounded-full border-l border-r border-amber-200/10"
          />
          <div className="relative z-40 flex min-h-[84px] items-center gap-4 border-b border-cyan-100/18 bg-slate-950/70 px-3 py-3 shadow-[0_20px_70px_rgba(0,0,0,0.34),0_0_34px_rgba(34,211,238,0.10)] backdrop-blur-xl sm:px-4 sm:py-4">
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
              className="flex w-[min(62vw,360px)] shrink-0 items-center gap-2 rounded-[28px] border border-transparent bg-transparent p-0 shadow-none backdrop-blur md:w-[380px] lg:w-[440px] xl:w-[490px]"
            >
              <button
                aria-label="Previous dashboard"
                className="grid h-12 w-10 shrink-0 place-items-center rounded-2xl border border-cyan-200/14 bg-slate-950/58 text-xs font-black text-cyan-100 shadow-[0_0_18px_rgba(34,211,238,0.10)] transition hover:-translate-x-0.5 hover:border-amber-200/42 hover:bg-amber-300/10 hover:text-amber-100 active:scale-95"
                onClick={() => rotateSessionsDashboardRail("left")}
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
                className={`flex min-h-[64px] min-w-0 flex-1 items-center gap-3 rounded-[24px] border px-4 py-3 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_26px_rgba(34,211,238,0.08)] transition hover:-translate-y-0.5 ${activeSessionsDashboardLink.tone} ${
                  activeSessionsDashboardLink.href === ROUTES.dashboard.sessions
                    ? "ring-2 ring-cyan-100/22"
                    : ""
                }`}
                href={activeSessionsDashboardLink.href}
                key={activeSessionsDashboardLink.label}
              >
                <span
                  aria-hidden="true"
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-current/22 bg-slate-950/18 text-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_16px_rgba(255,255,255,0.06)]"
                >
                  {activeSessionsDashboardLink.icon}
                </span>
                <span className="min-w-0 flex-1 whitespace-nowrap">
                  <span className="block text-[8px] font-black uppercase tracking-[0.14em] opacity-70">
                    {activeSessionsDashboardLink.meta}
                  </span>
                  <span className="mt-0.5 block text-[10px] font-black uppercase tracking-[0.12em] sm:text-[11px]">
                    {activeSessionsDashboardLink.label}
                  </span>
                </span>
                <span className="shrink-0 rounded-2xl border border-current/20 bg-slate-950/18 px-3 py-2 text-right">
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
                className="grid h-12 w-10 shrink-0 place-items-center rounded-2xl border border-cyan-200/14 bg-slate-950/58 text-xs font-black text-cyan-100 shadow-[0_0_18px_rgba(34,211,238,0.10)] transition hover:translate-x-0.5 hover:border-amber-200/42 hover:bg-amber-300/10 hover:text-amber-100 active:scale-95"
                onClick={() => rotateSessionsDashboardRail("right")}
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
                className={`flex min-h-[66px] items-center gap-3 rounded-[26px] border px-3 py-3 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_0_24px_rgba(34,211,238,0.08)] transition hover:-translate-y-0.5 ${
                  sessionsProfileHubOpen
                    ? "border-cyan-100/44 bg-cyan-300/12 text-cyan-50 shadow-[0_0_34px_rgba(34,211,238,0.16)]"
                    : "border-transparent bg-transparent text-slate-200 hover:border-amber-200/24 hover:bg-amber-300/8"
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

              <div
                className={`absolute right-0 top-full z-50 mt-3 w-[min(94vw,860px)] overflow-hidden rounded-[34px] border border-cyan-100/18 bg-[radial-gradient(circle_at_12%_0%,rgba(34,211,238,0.18),transparent_34%),radial-gradient(circle_at_88%_14%,rgba(250,204,21,0.14),transparent_30%),linear-gradient(135deg,rgba(2,6,23,0.98),rgba(15,23,42,0.96))] p-4 shadow-[0_32px_90px_rgba(0,0,0,0.68),0_0_62px_rgba(34,211,238,0.12)] ring-1 ring-white/[0.04] backdrop-blur-2xl transition-all duration-300 ${
                  sessionsProfileHubOpen
                    ? "visible translate-y-0 scale-100 opacity-100"
                    : "invisible translate-y-2 scale-[0.985] opacity-0"
                }`}
                role="menu"
              >
                <div className="relative overflow-hidden rounded-[28px] border border-amber-200/18 bg-white/[0.035] p-4">
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute left-1/2 top-1/2 h-[180px] w-[92%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-200/10 shadow-[0_0_70px_rgba(34,211,238,0.10)]"
                  />
                  <div className="relative z-10 flex items-center justify-between gap-4">
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

                <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.85fr)]">
                  <div className="relative min-h-[360px] overflow-hidden rounded-[30px] border border-cyan-200/12 bg-slate-950/42 p-4">
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute left-1/2 top-1/2 h-[250px] w-[78%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-200/10 shadow-[0_0_74px_rgba(34,211,238,0.12)]"
                    />
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute left-1/2 top-1/2 h-[136px] w-[50%] -translate-x-1/2 -translate-y-1/2 rounded-full border-t border-amber-200/20"
                    />
                    <div className="absolute left-1/2 top-1/2 z-10 w-[170px] -translate-x-1/2 -translate-y-1/2 rounded-[28px] border border-amber-200/20 bg-[radial-gradient(circle_at_50%_0%,rgba(250,204,21,0.16),transparent_42%),rgba(15,23,42,0.88)] p-4 text-center shadow-[0_22px_56px_rgba(0,0,0,0.44)]">
                      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-100">
                        My Hub Orbit
                      </p>
                      <p className="mt-2 text-lg font-black text-white">
                        Connected Systems
                      </p>
                      <p className="mt-1 text-xs font-semibold leading-5 text-slate-400">
                        Progress, goals, coaching, and rewards.
                      </p>
                    </div>
                    {sessionsHubOrbitItems.map((item, index) => {
                      const angle =
                        (index / sessionsHubOrbitItems.length) * Math.PI * 2 -
                        Math.PI / 2;
                      const x = Math.cos(angle) * 244;
                      const y = Math.sin(angle) * 116;

                      return (
                        <Link
                          className={`absolute z-20 w-[148px] rounded-[22px] border p-3 text-left shadow-[0_16px_38px_rgba(0,0,0,0.34)] backdrop-blur transition hover:-translate-y-1 hover:scale-[1.025] ${item.tone}`}
                          href={item.href}
                          key={item.label}
                          onClick={() => setSessionsProfileHubOpen(false)}
                          role="menuitem"
                          style={{
                            left: `calc(50% + ${x}px)`,
                            top: `calc(50% + ${y}px)`,
                            transform: "translate(-50%, -50%)",
                          }}
                        >
                          <div className="text-xl" aria-hidden="true">
                            {item.icon}
                          </div>
                          <div className="mt-1 text-[10px] font-black uppercase tracking-[0.12em] text-white">
                            {item.label}
                          </div>
                          <div className="mt-1 line-clamp-2 text-[10px] font-semibold leading-4 text-slate-300">
                            {item.helper}
                          </div>
                        </Link>
                      );
                    })}
                  </div>

                  <div className="relative min-h-[360px] overflow-hidden rounded-[30px] border border-amber-200/12 bg-slate-950/42 p-4">
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute left-1/2 top-[44%] h-[214px] w-[82%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-amber-200/10 shadow-[0_0_64px_rgba(250,204,21,0.10)]"
                    />
                    <div className="absolute left-1/2 top-[44%] z-10 w-[148px] -translate-x-1/2 -translate-y-1/2 rounded-[26px] border border-cyan-200/18 bg-slate-950/78 p-4 text-center shadow-[0_20px_50px_rgba(0,0,0,0.40)]">
                      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-cyan-100">
                        Account Orbit
                      </p>
                      <p className="mt-2 text-base font-black text-white">
                        Member Controls
                      </p>
                    </div>
                    {sessionsAccountOrbitItems.map((item, index) => {
                      const angle =
                        (index / sessionsAccountOrbitItems.length) *
                          Math.PI *
                          2 -
                        Math.PI / 2;
                      const x = Math.cos(angle) * 136;
                      const y = Math.sin(angle) * 92;

                      return (
                        <Link
                          className={`absolute z-20 w-[130px] rounded-[22px] border p-3 text-left shadow-[0_16px_38px_rgba(0,0,0,0.34)] backdrop-blur transition hover:-translate-y-1 hover:scale-[1.025] ${item.tone}`}
                          href={item.href}
                          key={item.label}
                          onClick={() => setSessionsProfileHubOpen(false)}
                          role="menuitem"
                          style={{
                            left: `calc(50% + ${x}px)`,
                            top: `calc(44% + ${y}px)`,
                            transform: "translate(-50%, -50%)",
                          }}
                        >
                          <div className="text-lg" aria-hidden="true">
                            {item.icon}
                          </div>
                          <div className="mt-1 text-[10px] font-black uppercase tracking-[0.12em] text-white">
                            {item.label}
                          </div>
                          <div className="mt-1 line-clamp-2 text-[9px] font-semibold leading-4 text-slate-300">
                            {item.helper}
                          </div>
                        </Link>
                      );
                    })}
                    <div className="absolute inset-x-4 bottom-4 z-20 grid gap-2 sm:grid-cols-2">
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
            </div>
          </div>
          <div className="relative z-10 py-0 [perspective:1600px]">

            <section
              className="relative overflow-visible rounded-[34px] transition-all duration-700 ease-out [transform-style:preserve-3d]"
              id="sessions-orbit-journey"
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute left-1/2 top-[54%] h-[310px] w-[112%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-200/10 shadow-[0_0_88px_rgba(34,211,238,0.14)]"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute left-1/2 top-[56%] h-[142px] w-[86%] -translate-x-1/2 -translate-y-1/2 rounded-full border-t border-amber-200/18 opacity-90"
              />
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
              className="absolute left-1 top-[68%] z-30 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-cyan-200/24 bg-slate-950/64 text-2xl font-black text-cyan-100 shadow-[0_0_30px_rgba(34,211,238,0.16)] backdrop-blur transition hover:-translate-x-0.5 hover:border-amber-200/45 hover:bg-amber-300/10 hover:text-amber-100 active:scale-95 sm:left-3 sm:h-14 sm:w-14 sm:text-3xl"
              onClick={() => rotateTrainingJourney("left")}
              type="button"
            >
              ‹
            </button>
            <button
              aria-label="Next training journey stage"
              className="absolute right-1 top-[68%] z-30 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-cyan-200/24 bg-slate-950/64 text-2xl font-black text-cyan-100 shadow-[0_0_30px_rgba(34,211,238,0.16)] backdrop-blur transition hover:translate-x-0.5 hover:border-amber-200/45 hover:bg-amber-300/10 hover:text-amber-100 active:scale-95 sm:right-3 sm:h-14 sm:w-14 sm:text-3xl"
              onClick={() => rotateTrainingJourney("right")}
              type="button"
            >
              ›
            </button>

            <div
              aria-label="Training journey orbit selector"
              className="relative z-10 h-[880px] w-full overflow-visible outline-none [perspective:1500px] focus-visible:ring-2 focus-visible:ring-cyan-200/45 sm:h-[920px]"
              onKeyDown={handleTrainingJourneyKeyDown}
              onPointerCancel={() => {
                trainingJourneyPointerStartRef.current = null;
              }}
              onPointerDown={handleTrainingJourneyPointerDown}
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
              <div
                aria-hidden="true"
                className="absolute left-1/2 top-[52%] h-[240px] w-[92%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-200/12 shadow-[0_0_70px_rgba(34,211,238,0.12)]"
              />
              <div
                aria-hidden="true"
                className="absolute left-1/2 top-[55%] h-[116px] w-[74%] -translate-x-1/2 -translate-y-1/2 rounded-full border-t border-amber-200/20 opacity-80"
              />

              <article
                aria-current={isTrainingJourneyHeroActive ? "step" : undefined}
                aria-label="Workout hero command center"
                className={`absolute left-1/2 top-1/2 z-50 w-[min(96%,1500px)] overflow-hidden rounded-[34px] border bg-[radial-gradient(circle_at_16%_0%,rgba(34,211,238,0.22),transparent_34%),radial-gradient(circle_at_88%_12%,rgba(251,191,36,0.14),transparent_30%),linear-gradient(135deg,rgba(15,23,42,0.9),rgba(2,6,23,0.74))] p-4 text-left shadow-2xl backdrop-blur-xl transition-[border-color,background-color,box-shadow] duration-300 sm:p-5 lg:p-6 ${
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
                      ? -118
                      : trainingJourneyHeroOffset - 80
                  }px) scale(${isTrainingJourneyHeroActive ? 1 : 0.58})`,
                  transition:
                    "transform 560ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 360ms ease, filter 360ms ease",
                }}
              >
                <span className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-cyan-200/70 via-amber-200/35 to-transparent" />
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
                <div className="relative z-10 flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
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

                    <h1 className="mt-4 max-w-4xl text-3xl font-black leading-tight text-white sm:text-5xl">
                      Everything you need to work out.
                    </h1>
                    <p className="mt-4 max-w-3xl text-sm font-semibold leading-6 text-slate-300 sm:text-base">
                      Start the logger, build sessions, follow the training
                      journey, collect workout achievements, and turn each
                      session into progress.
                    </p>

                    <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
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

                  <div className="grid gap-3 sm:grid-cols-2 xl:w-[380px] xl:grid-cols-1">
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

                <div className="relative z-10 -mx-4 mt-5 overflow-hidden border-y border-white/10 bg-[radial-gradient(circle_at_8%_0%,rgba(250,204,21,0.12),transparent_32%),radial-gradient(circle_at_92%_20%,rgba(34,211,238,0.10),transparent_34%),rgba(2,6,23,0.24)] py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] sm:-mx-5 lg:-mx-6">
                  <div
                    aria-label="Workout achievement orbit"
                    className="relative z-10 h-[230px] overflow-hidden [perspective:1100px] sm:h-[246px]"
                    onWheel={handleHeroAchievementWheel}
                    onWheelCapture={handleHeroAchievementWheel}
                  >
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute left-1/2 top-1/2 h-[156px] w-[92%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-200/10 shadow-[0_0_58px_rgba(34,211,238,0.12)]"
                    />
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute left-1/2 top-1/2 h-[72px] w-[68%] -translate-x-1/2 -translate-y-1/2 rounded-full border-t border-amber-200/20"
                    />

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
                    <span className="pointer-events-none absolute inset-x-4 top-0 h-px rounded-full bg-gradient-to-r from-cyan-200/70 via-amber-200/45 to-transparent" />
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
                  className="flex max-w-full gap-3 overflow-x-auto overscroll-x-contain pb-3 scroll-smooth [scrollbar-color:rgba(52,211,153,0.46)_rgba(15,23,42,0.42)] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-emerald-300/40 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-slate-950/40"
                  ref={recentSessionsScrollRef}
                >
                  {recentWorkoutSummaries.map((session) => (
                    <article
                      key={session.id}
                      className="w-[min(88vw,520px)] shrink-0 overflow-hidden rounded-[26px] border border-emerald-200/14 bg-[radial-gradient(circle_at_0%_0%,rgba(16,185,129,0.11),transparent_34%),rgba(15,23,42,0.62)] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.18)]"
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
