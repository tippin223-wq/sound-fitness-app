"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import WorkoutHistoryReviewNotice from "@/components/dashboard/WorkoutHistoryReviewNotice";
import { captureWorkoutHistoryRecovery } from "@/lib/planning/workoutHistoryRecovery";
import TrainingJourneyNavigator from "@/components/dashboard/TrainingJourneyNavigator";
import { ROUTES } from "@/lib/routes";
import { activityTimestamp, validDateOnly } from "@/lib/planning/dates";
import { savedPhaseContext } from "@/lib/planning/phaseContext";
import { readEligibleGoals } from "@/lib/planning/goals";
import { emptyCalendarReflection, startCalendarWorkout, startCalendarEditorWorkout, calendarDurationLabel, type CalendarReflection } from "@/lib/planning/calendar";
import { reviewWorkoutLaunchEditor } from "@/lib/planning/workoutLaunchEditor";

type CalendarViewMode = "week" | "month" | "agenda";
type CalendarStatus = "Planned" | "Completed" | "Missed" | "Moved" | "Pending Approval";
type WorkoutType =
  | "Strength"
  | "Hypertrophy"
  | "Mobility"
  | "Recovery"
  | "Conditioning"
  | "Testing/PR"
  | "Nutrition"
  | "Check-In";

type ProfileSnapshot = {
  displayName: string;
  goalMode: string;
  primaryGoal: string;
  sessionsPerWeek: number;
  preferredSplit: string;
};

type PlanContext = {
  activePhase: string;
  activePlan: string;
  deloadWeek: boolean;
  phaseWeek: number;
  phaseWeeks: number;
  planFocus: string;
  testingWeek: boolean;
};


type WorkoutLog = {
  bodyParts: string[];
  date: string;
  exercises: string[];
  id: string;
  name: string;
  notes: string;
  patterns: string[];
  timestamp: number;
  totalReps: number;
  totalSets: number;
  totalVolume: number;
};

type DraftWorkout = {
  duration: number;
  exerciseCount: number;
  focus: string;
  title: string;
};

type CalendarItem = {
  bookingId?: string;
  planId?: string; planDayId?: string; assignmentId?: string;
  bodyFocus: string;
  date: string;
  duration: number;
  id: string;
  linkedPlan: string;
  linkedWorkout: string;
  notes: string;
  phase: string;
  reflection: CalendarReflection;
  reminder: string;
  status: CalendarStatus;
  time: string;
  title: string;
  type: WorkoutType;
};

import { getActiveWorkoutPlan } from "@/lib/localData/workoutPlanData";
import { subscribePlanning, planningSnapshot, planningOwner, planningAccountGeneration, readAccountRecord } from "@/lib/planning/store";
import { inspectCalendarSources, calendarSourcesVersion, exportCalendarSources, plannedCalendarItems, readIndependentCalendar, saveCalendarItems, captureCalendarEditor, type CalendarEditor } from "@/lib/planning/calendar";
import { readAvailableWorkoutLogs, setsInPlanWeek, workoutsInWeek } from "@/lib/planning/logs";
import { workoutExerciseSetSummary } from "@/lib/planning/history";

const STORAGE_KEYS = {
  profile: "soundFitnessProfile",
  plan: "soundFitnessPlan",
  phases: "soundFitnessPhases",
  workoutLogs: "soundFitnessWorkoutLogs",
  exerciseStats: "soundFitnessExerciseStats",
  draftWorkout: "soundFitnessDraftWorkout",
  calendar: "soundFitnessCalendar",
} as const;

const WORKOUT_TYPES: WorkoutType[] = [
  "Strength",
  "Hypertrophy",
  "Mobility",
  "Recovery",
  "Conditioning",
  "Testing/PR",
  "Nutrition",
  "Check-In",
];

const STATUS_OPTIONS: CalendarStatus[] = ["Planned", "Completed", "Missed", "Moved"];
const BODY_FOCUS_OPTIONS = [
  "Full Body",
  "Upper Body",
  "Lower Body",
  "Core",
  "Push",
  "Pull",
  "Glutes / Hips",
  "Recovery",
];

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const TYPE_STYLES: Record<
  WorkoutType,
  { bg: string; border: string; chip: string; dot: string; text: string }
> = {
  Strength: {
    bg: "bg-blue-400/10",
    border: "border-blue-300/25",
    chip: "bg-blue-400/15 text-blue-100 border-blue-300/25",
    dot: "bg-blue-300",
    text: "text-blue-100",
  },
  Hypertrophy: {
    bg: "bg-violet-400/10",
    border: "border-violet-300/25",
    chip: "bg-violet-400/15 text-violet-100 border-violet-300/25",
    dot: "bg-violet-300",
    text: "text-violet-100",
  },
  Mobility: {
    bg: "bg-emerald-400/10",
    border: "border-emerald-300/25",
    chip: "bg-emerald-400/15 text-emerald-100 border-emerald-300/25",
    dot: "bg-emerald-300",
    text: "text-emerald-100",
  },
  Recovery: {
    bg: "bg-cyan-400/10",
    border: "border-cyan-300/25",
    chip: "bg-cyan-400/15 text-cyan-100 border-cyan-300/25",
    dot: "bg-cyan-300",
    text: "text-cyan-100",
  },
  Conditioning: {
    bg: "bg-orange-400/10",
    border: "border-orange-300/25",
    chip: "bg-orange-400/15 text-orange-100 border-orange-300/25",
    dot: "bg-orange-300",
    text: "text-orange-100",
  },
  "Testing/PR": {
    bg: "bg-amber-400/10",
    border: "border-amber-300/30",
    chip: "bg-amber-400/15 text-amber-100 border-amber-300/30",
    dot: "bg-amber-300",
    text: "text-amber-100",
  },
  Nutrition: {
    bg: "bg-lime-400/10", border: "border-lime-300/25", chip: "bg-lime-400/15 text-lime-100 border-lime-300/25", dot: "bg-lime-300", text: "text-lime-100",
  },
  "Check-In": {
    bg: "bg-pink-400/10", border: "border-pink-300/25", chip: "bg-pink-400/15 text-pink-100 border-pink-300/25", dot: "bg-pink-300", text: "text-pink-100",
  },
};



const emptyReflection = emptyCalendarReflection();

const defaultEditorItem = (date: Date): CalendarItem => ({
  bodyFocus: "Full Body",
  date: toDateInput(date),
  duration: 45,
  id: "",
  linkedPlan: "",
  linkedWorkout: "",
  notes: "",
  phase: "",
  reflection: { ...emptyReflection },
  reminder: "Morning of",
  status: "Planned",
  time: "07:00",
  title: "Training Session",
  type: "Strength",
});

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const safeJson = (value: string | null) => {
  if (!value) return null;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
};

const readLocal = (key: string) => {
  if (typeof window === "undefined") return null;
  return readAccountRecord(key);
};

const writeLocal = (key: string, value: unknown) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
};

const coerceArray = (value: unknown): unknown[] => {
  if (Array.isArray(value)) return value;
  const record = asRecord(value);
  if (!record) return [];
  for (const key of ["items", "entries", "sessions", "workouts", "logs", "data"]) {
    const candidate = record[key];
    if (Array.isArray(candidate)) return candidate;
  }
  return Object.values(record).filter((item) => Boolean(asRecord(item)));
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
        .map((item) =>
          typeof item === "string"
            ? item
            : getString(asRecord(item), ["label", "name", "bodyPart", "region"]),
        )
        .filter(Boolean);
    }
    if (typeof value === "string" && value.trim()) {
      return value
        .split(/[,|]/)
        .map((part) => part.trim())
        .filter(Boolean);
    }
  }
  return [];
};

const getTimestamp = activityTimestamp;

const clampNumber = (value: number, min = 0, max = Number.POSITIVE_INFINITY) =>
  Math.min(Math.max(Number.isFinite(value) ? value : min, min), max);

const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const startOfWeek = (date: Date) => {
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return startOfDay(addDays(date, diff));
};

const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);

const toDateInput = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseDateInput = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return startOfDay(new Date());
  return new Date(year, month - 1, day);
};

const sameDate = (date: Date, input: string) => toDateInput(date) === input;

const formatDayLabel = (date: Date) =>
  new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(date);

const formatShortDate = (date: Date | number) =>
  new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(
    typeof date === "number" ? new Date(date) : date,
  );

const formatFullDate = (date: Date | number) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(typeof date === "number" ? new Date(date) : date);

const formatWeekRange = (weekStart: Date) =>
  `${formatShortDate(weekStart)}-${formatShortDate(addDays(weekStart, 6))}`;



const inferWorkoutType = (record: Record<string, unknown> | null): WorkoutType => {
  const raw = [
    getString(record, ["type", "workoutType", "goal", "focus"]),
    getString(record, ["title", "name"]),
  ]
    .join(" ")
    .toLowerCase();

  if (raw.includes("recover")) return "Recovery";
  if (raw.includes("mobil")) return "Mobility";
  if (raw.includes("conditioning") || raw.includes("cardio")) return "Conditioning";
  if (raw.includes("test") || raw.includes("pr")) return "Testing/PR";
  if (raw.includes("hypertrophy") || raw.includes("muscle")) return "Hypertrophy";
  return "Strength";
};


const normalizeProfile = (raw: unknown): ProfileSnapshot => {
  const profile = asRecord(raw);
  const goals = readEligibleGoals();
  const sessionsPerWeek = goals ? Number(goals.targetWeeklySessions) : 0;

  return {
    displayName: getString(profile, ["displayName", "name", "firstName"], "Member"),
    goalMode: goals?.primaryGoal || "Goals not set",
    primaryGoal: goals?.primaryGoal || "Goals not set",
    sessionsPerWeek,
    preferredSplit: getString(profile, ["preferredSplit"], "Strength + Mobility"),
  };
};

const normalizePlanContext = savedPhaseContext;


const normalizeWorkoutLog = (item: unknown, index: number): WorkoutLog | null => {
  const record = asRecord(item);
  if (!record) return null;
  const timestamp = getTimestamp(record.date ?? record.completedAt ?? record.createdAt ?? record.timestamp);
  if (!Number.isFinite(timestamp)) return null;
  const rawExercises = coerceArray(record.exercises ?? record.items ?? record.entries);
  const exerciseNames = rawExercises
    .map((exercise) => getString(asRecord(exercise), ["exerciseName", "name", "title"]))
    .filter(Boolean);

  return {
    bodyParts: getStringArray(record, ["bodyParts", "bodyFocus"]),
    date: new Date(timestamp).toISOString(),
    exercises: exerciseNames,
    id: getString(record, ["id", "workoutLogId"], `workout-log-${index}`),
    name: getString(record, ["name", "title", "workoutName"], `Completed Workout ${index + 1}`),
    notes: getString(record, ["notes", "note"]),
    patterns: getStringArray(record, ["patterns", "movementPatterns"]),
    timestamp,
    totalReps: Math.round(clampNumber(getNumber(record, ["totalReps", "reps"], 0))),
    totalSets: Math.round(clampNumber(getNumber(record, ["totalSets", "sets"], 0))),
    totalVolume: clampNumber(getNumber(record, ["totalVolume", "volume", "weightVolume"], 0)),
  };
};

const normalizeDraftWorkout = (raw: unknown): DraftWorkout => {
  const draft = asRecord(raw);
  const exercises = coerceArray(draft?.exercises ?? draft?.items);
  return {
    duration: Math.round(clampNumber(getNumber(draft, ["duration", "estimatedDuration"], 45), 10, 180)),
    exerciseCount: exercises.length || Math.round(clampNumber(getNumber(draft, ["exerciseCount"], 0))),
    focus: getString(draft, ["bodyFocus", "focus", "goal"], "Full Body"),
    title: getString(draft, ["title", "name"], "Draft Workout"),
  };
};

const normalizeCalendarItem = (item: unknown, index: number): CalendarItem | null => {
  const record = asRecord(item);
  if (!record) return null;
  const timestamp = getTimestamp(record.date ?? record.scheduledAt ?? record.timestamp);
  if (!Number.isFinite(timestamp)) return null;
  const date = typeof record.date === "string" && validDateOnly(record.date) ? record.date : toDateInput(new Date(timestamp));
  const status = getString(record, ["status"], "Planned");
  const type = getString(record, ["type", "workoutType"], "Strength");

  return {
    bookingId: getString(record, ["bookingId"]) || undefined,
    planId: getString(record, ["planId"]) || undefined, planDayId: getString(record, ["planDayId"]) || undefined, assignmentId: getString(record, ["assignmentId"]) || undefined,
    bodyFocus: getString(record, ["bodyFocus", "focus"], "Full Body"),
    date,
    duration: Math.round(clampNumber(getNumber(record, ["duration", "durationMinutes"], 45), 5, 240)),
    id: getString(record, ["id"], `calendar-${timestamp}-${index}`),
    linkedPlan: getString(record, ["linkedPlan", "plan"]),
    linkedWorkout: getString(record, ["linkedWorkout", "workout"]),
    notes: getString(record, ["notes", "note"]),
    phase: getString(record, ["phase", "phaseName"]),
    reflection: {
      ...emptyReflection,
      ...(asRecord(record.reflection) || {}),
    },
    reminder: getString(record, ["reminder"], "Morning of"),
    status: status === "Pending Approval" || STATUS_OPTIONS.includes(status as CalendarStatus)
      ? (status as CalendarStatus)
      : "Planned",
    time: getString(record, ["time"], "07:00"),
    title: getString(record, ["title", "name"], "Training Session"),
    type: WORKOUT_TYPES.includes(type as WorkoutType) ? (type as WorkoutType) : "Strength",
  };
};

const createGeneratedCalendarItems = ({
  profile,
  planContext,
  workoutLogs,
  draftWorkout,
}: {
  draftWorkout: DraftWorkout;
  planContext: PlanContext;
  profile: ProfileSnapshot;
  workoutLogs: WorkoutLog[];
}) => {
  const today = startOfDay(new Date());
  const weekStart = startOfWeek(today);
  const preferredDays = [1, 3, 5, 6].slice(0, profile.sessionsPerWeek);
  const planned = preferredDays.map((offset, index) => {
    const date = addDays(weekStart, offset);
    return {
      ...defaultEditorItem(date),
      bodyFocus: index % 2 === 0 ? "Lower Body" : "Upper Body",
      duration: draftWorkout.duration || 45,
      id: `generated-${toDateInput(date)}-${index}`,
      linkedPlan: planContext.activePlan,
      linkedWorkout: draftWorkout.title,
      phase: planContext.activePhase,
      status: "Planned",
      time: index % 2 === 0 ? "07:00" : "18:00",
      title:
        draftWorkout.title !== "Draft Workout"
          ? draftWorkout.title
          : index % 2 === 0
            ? "Lower Body Strength"
            : "Upper Body Strength",
      type: index === 1 ? "Hypertrophy" : "Strength",
    } satisfies CalendarItem;
  });

  const completed = workoutLogs.slice(0, 6).map((log, index) => ({
    ...defaultEditorItem(new Date(log.timestamp)),
    bodyFocus: log.bodyParts[0] || "Full Body",
    duration: 45,
    id: `completed-log-${log.id}-${index}`,
    linkedPlan: planContext.activePlan,
    linkedWorkout: log.name,
    notes: log.notes,
    phase: planContext.activePhase,
    status: "Completed" as CalendarStatus,
    time: "17:30",
    title: log.name,
    type: "Strength" as WorkoutType,
  }));

  return [...planned, ...completed].sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
};


const getCalendarCoachInsight = ({
  completedThisWeek,
  loggedWorkouts,
  plannedThisWeek,
  weeklySets,
}: {
  completedThisWeek: number;
  loggedWorkouts: number;
  plannedThisWeek: number;
  weeklySets: number;
}) => {
  if (!weeklySets && !plannedThisWeek && !completedThisWeek && !loggedWorkouts) return "No training recorded for this week. Save your goals, plan sessions, and log completed workouts to build your training history.";
  return `${plannedThisWeek} planned sessions, ${completedThisWeek} schedule items marked complete, ${loggedWorkouts} logged workouts, and ${weeklySets} logged sets this week. Review your goals and reported readiness before changing training demand.`;
};

const getItemsForDate = (items: CalendarItem[], date: Date) =>
  items
    .filter((item) => sameDate(date, item.date))
    .sort((a, b) => a.time.localeCompare(b.time));

const getWeekDays = (anchor: Date) => {
  const start = startOfWeek(anchor);
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
};

const getMonthDays = (anchor: Date) => {
  const first = startOfMonth(anchor);
  const offset = first.getDay();
  const gridStart = addDays(first, -offset);
  return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
};

const hasTimeConflict = (items: CalendarItem[], target: CalendarItem) =>
  Boolean(
    target.time &&
      items.some(
        (item) =>
          item.id !== target.id &&
          item.date === target.date &&
          item.time === target.time &&
          item.status !== "Completed",
      ),
  );

function MetricCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <article className="rounded-[24px] border border-white/10 bg-white/[0.045] p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-black text-white">{value}</p>
      <p className="mt-1 text-xs leading-5 text-slate-400">{helper}</p>
    </article>
  );
}

function Pill({
  children,
  tone = "cyan",
}: {
  children: ReactNode;
  tone?: "cyan" | "amber" | "rose" | "emerald";
}) {
  const classes = {
    amber: "border-amber-300/20 bg-amber-400/10 text-amber-100",
    cyan: "border-cyan-300/20 bg-cyan-400/10 text-cyan-100",
    emerald: "border-emerald-300/20 bg-emerald-400/10 text-emerald-100",
    rose: "border-rose-300/20 bg-rose-400/10 text-rose-100",
  };

  return (
    <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${classes[tone]}`}>
      {children}
    </span>
  );
}

function SessionCard({
  item,
  onComplete,
  onEdit,
  onReflect,
  compact = false,
}: {
  compact?: boolean;
  item: CalendarItem;
  onComplete: (item: CalendarItem) => void;
  onEdit: (item: CalendarItem) => void;
  onReflect: (item: CalendarItem) => void;
}) {
  const styles = TYPE_STYLES[item.type];
  const router = useRouter();
  const [launchError, setLaunchError] = useState("");
  const [launchEditor, setLaunchEditor] = useState(captureCalendarEditor);
  const [launchReviewMessage, setLaunchReviewMessage] = useState("");
  function reviewCardLaunchControls() {
    try {
      const reviewed = reviewWorkoutLaunchEditor(launchEditor.launch);
      setLaunchEditor({ ...captureCalendarEditor(), launch: reviewed.editor });
      setLaunchError(""); setLaunchReviewMessage(`Current workout: ${reviewed.title}. Controls reviewed; choose Start when ready.`);
    } catch (cause) { setLaunchError(cause instanceof Error ? cause.message : "Workout controls could not be reviewed."); }
  }
  const start = () => {
    try { const destination = startCalendarWorkout(item, launchEditor); setLaunchError(""); router.push(destination); }
    catch (cause) { setLaunchError(cause instanceof Error ? cause.message : "Workout could not be opened. Your active session is preserved."); }
  };
  const statusTone =
    item.status === "Completed"
      ? "emerald"
      : item.status === "Missed"
        ? "rose"
        : item.status === "Moved"
          ? "amber"
          : "cyan";

  return (
    <article className={`rounded-2xl border ${styles.border} ${styles.bg} p-3`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className={`truncate text-sm font-black ${styles.text}`}>{item.title}</p>
          <p className="mt-1 text-[11px] text-slate-400">
            {item.time || "Time not set"} - {calendarDurationLabel(item)} - {item.bodyFocus}
          </p>
        </div>
        <Pill tone={statusTone}>{item.status}</Pill>
      </div>
      {!compact ? (
        <p className="mt-2 text-xs leading-5 text-slate-400">
          {item.phase || "Phase not linked"} - {item.linkedWorkout || item.type}
        </p>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        {item.bookingId ? <Link href={ROUTES.dashboard.sessionBooking} className="rounded-xl border border-white/10 px-3 py-2 text-xs font-bold">Manage booking</Link> : <>
        {item.assignmentId ? item.status === "Completed" ? <Link href={ROUTES.dashboard.sessionHistory} className="rounded-xl border border-white/10 px-3 py-2 text-xs text-white">View in History</Link> : <button
          onClick={start}
          type="button"
          className="rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-white transition hover:bg-white/10"
        >Start assigned workout</button> : <Link
          href={ROUTES.dashboard.myPlan}
          className="rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-white transition hover:bg-white/10"
        >
          Choose workout in My Plan
        </Link>}
        <button
          className="rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-slate-200 transition hover:bg-white/10"
          onClick={() => onEdit(item)}
          type="button"
        >
          Move
        </button>
        {(!item.assignmentId || item.status !== "Completed") && <button
          className="rounded-xl border border-emerald-300/20 bg-emerald-400/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-emerald-100 transition hover:bg-emerald-300 hover:text-slate-950"
          onClick={() => item.assignmentId ? start() : onComplete(item)}
          type="button"
        >
          {item.assignmentId ? "Log workout" : "Complete"}
        </button>}
        {item.assignmentId ? <Link
          className="rounded-xl border border-amber-300/20 bg-amber-400/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-amber-100 transition hover:bg-amber-300 hover:text-slate-950"
          href={ROUTES.dashboard.journal}
        >Reflect in Journal</Link> : <button
          className="rounded-xl border border-amber-300/20 bg-amber-400/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-amber-100 transition hover:bg-amber-300 hover:text-slate-950"
          onClick={() => onReflect(item)}
          type="button"
        >
          Reflect
        </button>}
        </>}
      </div>
      {launchError && <p role="alert" className="mt-3 text-sm text-rose-300">{launchError}</p>}
      {launchError && item.assignmentId ? <div className="mt-2 flex flex-wrap gap-3 text-sm text-cyan-200">
        <Link href={ROUTES.dashboard.sessionWorkout} target="_blank" rel="noreferrer">Open current workout</Link>
        <button type="button" onClick={reviewCardLaunchControls} className="underline">Review current workout controls</button>
      </div> : null}
      {launchReviewMessage ? <p role="status" className="mt-2 text-sm text-cyan-200">{launchReviewMessage}</p> : null}
    </article>
  );
}

function CalendarButton({
  children,
  onClick,
  active = false,
}: {
  active?: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      className={`min-h-[42px] rounded-2xl border px-4 py-2 text-xs font-black uppercase tracking-[0.12em] transition ${
        active
          ? "border-cyan-300/40 bg-cyan-300/15 text-cyan-50 shadow-[0_0_22px_rgba(34,211,238,0.14)]"
          : "border-white/10 bg-white/[0.045] text-slate-300 hover:border-cyan-300/25 hover:bg-white/[0.08]"
      }`}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function Field({
  label,
  children,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
        {label}
      </span>
      <div className="mt-2">{children}</div>
    </label>
  );
}

const inputClass =
  "min-h-[44px] w-full rounded-2xl border border-white/10 bg-slate-950/65 px-3 py-2 text-sm font-semibold text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300/40 focus:ring-2 focus:ring-cyan-300/10";

export default function CalendarPage() {
  const router = useRouter();
  useSyncExternalStore(subscribePlanning, planningSnapshot, () => null);
  const historyRecovery = captureWorkoutHistoryRecovery();
  const calendarRecovery = inspectCalendarSources();
  const sourcesVersion = calendarSourcesVersion();
  const exportOwner = useRef({ account: planningOwner(), generation: planningAccountGeneration() });
  const [exportStatus, setExportStatus] = useState("");
  const [profile, setProfile] = useState<ProfileSnapshot>(() => normalizeProfile(null));
  const [planContext, setPlanContext] = useState<PlanContext>(() =>
    normalizePlanContext(null, null),
  );
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutLog[]>([]);
  const [draftWorkout, setDraftWorkout] = useState<DraftWorkout>(() =>
    normalizeDraftWorkout(null),
  );
  const [calendarItems, setCalendarItems] = useState<CalendarItem[]>([]);
  const [calendarEditor, setCalendarEditor] = useState(captureCalendarEditor);
  const [openEditor, setOpenEditor] = useState<CalendarEditor | null>(null);
  const [viewMode, setViewMode] = useState<CalendarViewMode>("week");
  const [anchorDate, setAnchorDate] = useState(() => startOfDay(new Date()));
  const [selectedDate, setSelectedDate] = useState(() => toDateInput(new Date()));
  const [calendarError, setCalendarError] = useState("");
  const [editorItem, setEditorItem] = useState<CalendarItem | null>(null);

  useEffect(() => {
    const loadData = () => {
      if (captureWorkoutHistoryRecovery().issues.length || inspectCalendarSources().issue) return;
      const nextProfile = normalizeProfile(readLocal(STORAGE_KEYS.profile));
      const nextPlanContext = normalizePlanContext(
        getActiveWorkoutPlan(),
        readLocal(STORAGE_KEYS.phases),
      );
      const nextLogs = coerceArray(readLocal(STORAGE_KEYS.workoutLogs))
        .map((item, index) => normalizeWorkoutLog(item, index))
        .filter((item): item is WorkoutLog => Boolean(item))
        .sort((a, b) => b.timestamp - a.timestamp);
      const nextDraftWorkout = normalizeDraftWorkout(readLocal(STORAGE_KEYS.draftWorkout));
      const storedCalendar = [...readIndependentCalendar(), ...plannedCalendarItems()]
        .map((item, index) => normalizeCalendarItem(item, index))
        .filter((item): item is CalendarItem => Boolean(item));

      setProfile(nextProfile);
      setPlanContext(nextPlanContext);
      setWorkoutLogs(nextLogs);
      setDraftWorkout(nextDraftWorkout);
      setCalendarItems(storedCalendar);
      setCalendarEditor(captureCalendarEditor());
    };

    loadData();
    window.addEventListener("storage", loadData);
    const unsubscribe = subscribePlanning(loadData);
    return () => { window.removeEventListener("storage", loadData); unsubscribe(); };
  }, []);

  const weekDays = useMemo(() => getWeekDays(anchorDate), [anchorDate]);
  const monthDays = useMemo(() => getMonthDays(anchorDate), [anchorDate]);
  const weekStart = useMemo(() => startOfWeek(anchorDate), [anchorDate]);
  const weekItems = useMemo(
    () =>
      calendarItems.filter((item) => {
        const itemDate = parseDateInput(item.date).getTime();
        return itemDate >= weekStart.getTime() && itemDate <= addDays(weekStart, 6).getTime();
      }),
    [calendarItems, weekStart],
  );
  const todaysItems = useMemo(
    () => getItemsForDate(calendarItems, new Date()),
    [calendarItems],
  );
  const selectedDayItems = useMemo(
    () => getItemsForDate(calendarItems, parseDateInput(selectedDate)),
    [calendarItems, selectedDate],
  );
  const upcomingItems = useMemo(
    () =>
      calendarItems
        .filter((item) => parseDateInput(item.date).getTime() >= startOfDay(new Date()).getTime())
        .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))
        .slice(0, 10),
    [calendarItems],
  );

  const exportOriginals = () => {
    try {
      const json = exportCalendarSources(sourcesVersion, exportOwner.current.account, exportOwner.current.generation);
      const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
      try { const link = document.createElement("a"); link.href = url; link.download = "sound-fitness-calendar-originals.json"; link.click(); }
      finally { URL.revokeObjectURL(url); }
      setCalendarError(""); setExportStatus("Calendar originals exported. Saved plans and events are unchanged.");
    } catch (cause) { setExportStatus(""); setCalendarError(cause instanceof Error ? cause.message : "Could not export calendar originals."); }
  };
  if (calendarRecovery.issue) return <main className="mx-auto max-w-3xl space-y-4 p-6 text-slate-100">
    <h1 className="text-2xl font-bold">Review saved calendar sources</h1>
    <p role="alert" className="text-amber-200">{calendarRecovery.issue}</p>
    <p>Calendar reporting and editing are paused. Export original plan weeks and personal events before making changes.</p>
    <button type="button" onClick={exportOriginals} className="rounded-xl bg-cyan-300 px-4 py-3 text-slate-950">Export calendar originals</button>
    {calendarError && <p role="alert">{calendarError}</p>}{exportStatus && <p role="status">{exportStatus}</p>}
    <Link href="/dashboard/sessions" className="block text-cyan-200">Review website bookings in Sessions</Link>
  </main>;

  if (historyRecovery.issues.length) return <WorkoutHistoryReviewNotice area="Training calendar completion reporting and editing" issues={historyRecovery.issues} />;

  const trainingWeekItems = weekItems.filter(item => item.type !== "Nutrition" && item.type !== "Check-In");
  const completedThisWeek = trainingWeekItems.filter((item) => item.status === "Completed").length;
  const plannedThisWeek = trainingWeekItems.filter((item) => item.status === "Planned").length;
  const recoveryDays = weekItems.filter((item) => item.type === "Recovery").length;
  const weeklySets = setsInPlanWeek(toDateInput(weekStart));
  const loggedWorkouts = workoutsInWeek(toDateInput(weekStart), toDateInput(addDays(weekStart, 6))).length;
  const exerciseVolume = workoutExerciseSetSummary(readAvailableWorkoutLogs(), toDateInput(weekStart), toDateInput(addDays(weekStart, 6)));
  const coachInsight = getCalendarCoachInsight({
    completedThisWeek,
    loggedWorkouts,
    plannedThisWeek,
    weeklySets,
  });

  const saveItems = (items: CalendarItem[], editor = calendarEditor) => {
    const sorted = [...items].sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
    try { saveCalendarItems(sorted, editor); setCalendarItems(sorted); setCalendarEditor(captureCalendarEditor()); setCalendarError(""); return true; }
    catch (cause) { setCalendarError(cause instanceof Error ? cause.message : "Calendar changes could not be saved."); return false; }
  };

  const openNewEditor = (type: WorkoutType, date = parseDateInput(selectedDate)) => {
    setOpenEditor(calendarEditor);
    setEditorItem({
      ...defaultEditorItem(date),
      bodyFocus: type === "Recovery" ? "Recovery" : "Full Body",
      linkedPlan: planContext.activePlan,
      linkedWorkout: type === "Nutrition" || type === "Check-In" ? "" : draftWorkout.title,
      phase: planContext.activePhase,
      title:
        type === "Nutrition" ? "Nutrition reminder" : type === "Check-In" ? "Progress check-in" : type === "Recovery"
          ? "Recovery Day"
          : type === "Mobility"
            ? "Mobility Session"
            : draftWorkout.title !== "Draft Workout"
              ? draftWorkout.title
              : "Training Session",
      type,
    });
  };

  const saveEditorItem = () => {
    if (!editorItem) return;
    const nextItem = {
      ...editorItem,
      id: editorItem.id || `calendar-${crypto.randomUUID()}`,
    };
    const nextItems = calendarItems.some((item) => item.id === nextItem.id)
      ? calendarItems.map((item) => (item.id === nextItem.id ? nextItem : item))
      : [...calendarItems, nextItem];
    if (!saveItems(nextItems, openEditor ?? calendarEditor)) return;
    setSelectedDate(nextItem.date);
    setEditorItem(null);
  };

  const deleteEditorItem = () => {
    if (!editorItem?.id) {
      setEditorItem(null);
      return;
    }
    if (!saveItems(calendarItems.filter((item) => item.id !== editorItem.id), openEditor ?? calendarEditor)) return;
    setEditorItem(null);
  };

  const updateItemStatus = (item: CalendarItem, status: CalendarStatus) => {
    const nextItems = calendarItems.map((candidate) =>
      candidate.id === item.id ? { ...candidate, status } : candidate,
    );
    saveItems(nextItems);
  };

  const openReflect = (item: CalendarItem) => {
    setOpenEditor(calendarEditor);
    setEditorItem({ ...item });
  };
  const logEditorWorkout = () => {
    if (!editorItem) return;
    try {
      const saved = calendarItems.find(item => item.id === editorItem.id);
      const destination = startCalendarEditorWorkout(editorItem, saved, openEditor ?? calendarEditor);
      setCalendarError(""); router.push(destination);
    } catch (cause) { setCalendarError(cause instanceof Error ? cause.message : "Workout could not be opened. Your edits remain here."); }
  };
  function reviewOpenWorkoutControls() {
    try {
      const editor = openEditor ?? calendarEditor;
      const reviewed = reviewWorkoutLaunchEditor(editor.launch);
      setOpenEditor({ ...editor, launch: reviewed.editor });
      setCalendarError(`Current workout: ${reviewed.title}. Launch controls reviewed. Your schedule edits remain open.`);
    } catch (cause) { setCalendarError(cause instanceof Error ? cause.message : "Workout controls could not be reviewed. Your edits remain open."); }
  }

  const navigateDate = (direction: -1 | 1) => {
    const days = viewMode === "month" ? 31 : 7;
    setAnchorDate((current) => addDays(current, direction * days));
  };

  const renderWeekView = () => (
    <section className="grid gap-3 lg:grid-cols-7">
      {weekDays.map((date) => {
        const items = getItemsForDate(calendarItems, date);
        const isToday = sameDate(date, toDateInput(new Date()));
        const hasConflict = items.some((item) => hasTimeConflict(items, item));

        return (
          <article
            key={date.toISOString()}
            className={`min-h-[280px] rounded-[28px] border p-3 ${
              isToday
                ? "border-cyan-300/35 bg-cyan-300/10 shadow-[0_0_30px_rgba(34,211,238,0.14)]"
                : "border-white/10 bg-slate-950/50"
            }`}
          >
            <button
              className="w-full text-left"
              onClick={() => setSelectedDate(toDateInput(date))}
              type="button"
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                    {formatDayLabel(date)}
                  </p>
                  <p className="mt-1 text-2xl font-black text-white">{date.getDate()}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {planContext.phaseWeek > 0 && <Pill tone={isToday ? "cyan" : "amber"}>W{planContext.phaseWeek}</Pill>}
                  {hasConflict ? <Pill tone="rose">Conflict</Pill> : null}
                </div>
              </div>
            </button>

            <div className="mt-3 space-y-3">
              {items.length > 0 ? (
                items.map((item) => (
                  <SessionCard
                    compact
                    item={item}
                    key={item.id}
                    onComplete={(target) => updateItemStatus(target, "Completed")}
                    onEdit={setEditorItem}
                    onReflect={openReflect}
                  />
                ))
              ) : (
                <button
                  className="w-full rounded-2xl border border-dashed border-white/15 bg-white/[0.025] p-4 text-left text-xs text-slate-500 transition hover:border-cyan-300/25 hover:text-cyan-100"
                  onClick={() => openNewEditor("Strength", date)}
                  type="button"
                >
                  Add training, recovery, or reflection.
                </button>
              )}
            </div>
          </article>
        );
      })}
    </section>
  );

  const renderMonthView = () => (
    <section className="grid grid-cols-7 gap-2">
      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
        <div
          key={day}
          className="rounded-2xl border border-white/10 bg-white/[0.035] px-2 py-2 text-center text-[10px] font-black uppercase tracking-[0.16em] text-slate-500"
        >
          {day}
        </div>
      ))}
      {monthDays.map((date) => {
        const items = getItemsForDate(calendarItems, date);
        const outside = date.getMonth() !== anchorDate.getMonth();

        return (
          <button
            className={`min-h-[112px] rounded-2xl border p-2 text-left transition ${
              sameDate(date, selectedDate)
                ? "border-cyan-300/40 bg-cyan-300/12"
                : "border-white/10 bg-slate-950/48 hover:border-cyan-300/25"
            } ${outside ? "opacity-45" : ""}`}
            key={date.toISOString()}
            onClick={() => setSelectedDate(toDateInput(date))}
            type="button"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-black text-white">{date.getDate()}</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {items.slice(0, 4).map((item) => (
                <span
                  className={`h-2 w-2 rounded-full ${TYPE_STYLES[item.type].dot}`}
                  key={item.id}
                  title={`${item.title} - ${item.status}`}
                />
              ))}
              {items.some((item) => item.status === "Completed") ? (
                <span className="rounded-full bg-emerald-300/20 px-1.5 text-[9px] font-black text-emerald-100">
                  done
                </span>
              ) : null}
              {items.some((item) => item.type === "Recovery") ? (
                <span className="rounded-full bg-cyan-300/20 px-1.5 text-[9px] font-black text-cyan-100">
                  rec
                </span>
              ) : null}
            </div>
          </button>
        );
      })}
    </section>
  );

  const renderAgendaView = () => (
    <section className="grid gap-3">
      {upcomingItems.length > 0 ? (
        upcomingItems.map((item) => (
          <div
            className="rounded-[28px] border border-white/10 bg-slate-950/52 p-4"
            key={item.id}
          >
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200">
                  {formatFullDate(parseDateInput(item.date))} - {item.time || "Time not set"}
                </p>
                <h3 className="mt-2 text-xl font-black text-white">{item.title}</h3>
                <p className="mt-1 text-sm text-slate-400">
                  {item.phase || planContext.activePhase} - {item.bodyFocus} - {calendarDurationLabel(item)}
                </p>
              </div>
              <SessionCard
                compact
                item={item}
                onComplete={(target) => updateItemStatus(target, "Completed")}
                onEdit={setEditorItem}
                onReflect={openReflect}
              />
            </div>
          </div>
        ))
      ) : (
        <EmptyPanel>No upcoming sessions. Add a workout, recovery day, or reflection.</EmptyPanel>
      )}
    </section>
  );

  const todayPrimary = todaysItems[0];

  return (
    <><p role="alert" className="bg-slate-950 px-4 text-amber-200">{calendarError}</p><main className="min-h-screen bg-[radial-gradient(circle_at_10%_0%,rgba(34,211,238,0.18),transparent_34%),radial-gradient(circle_at_88%_5%,rgba(251,191,36,0.16),transparent_30%),linear-gradient(180deg,#020617_0%,#0f172a_50%,#020617_100%)] pb-10 text-white">
      <section className="mx-auto w-full max-w-[1500px] space-y-5 px-3 py-5 sm:px-5 lg:px-8">
        <TrainingJourneyNavigator currentStep="calendar" variant="full" />

        <section className="overflow-hidden rounded-[34px] border border-white/10 bg-[radial-gradient(circle_at_12%_0%,rgba(34,211,238,0.2),transparent_32%),radial-gradient(circle_at_85%_12%,rgba(251,146,60,0.16),transparent_30%),linear-gradient(135deg,rgba(15,23,42,0.9),rgba(2,6,23,0.96))] p-4 shadow-[0_30px_120px_rgba(0,0,0,0.62)] sm:p-6 lg:p-7">
          <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr] xl:items-stretch">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.3em] text-cyan-200">
                Schedule Operating System
              </p>
              <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
                📅 Calendar
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-300 sm:text-base">
                Schedule, complete, recover, and reflect.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Pill>{profile.goalMode}</Pill>
                <Pill tone="amber">{planContext.activePhase}</Pill>
                <Pill tone="cyan">
                  {weeklySets} logged sets
                </Pill>
              </div>
            </div>
            <div className="rounded-[30px] border border-cyan-300/15 bg-slate-950/58 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-200">
                Planning Note
              </p>
              <p className="mt-3 text-xl font-black leading-tight text-white">
                {coachInsight}
              </p>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                Current week: {formatWeekRange(weekStart)}. Next workout:{" "}
                {upcomingItems[0]?.title || "No scheduled session yet"}.
              </p>
            </div>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <MetricCard
              helper={formatWeekRange(weekStart)}
              label="Current Week"
              value={planContext.phaseWeek ? `W${planContext.phaseWeek}` : "Calendar week"}
            />
            <MetricCard
              helper={planContext.planFocus}
              label="Active Phase"
              value={planContext.activePhase}
            />
            <MetricCard
              helper={profile.sessionsPerWeek ? `${profile.sessionsPerWeek} target sessions` : "Set weekly sessions in Goals"}
              label="Planned"
              value={plannedThisWeek.toLocaleString()}
            />
            <MetricCard
              helper={`${completedThisWeek} schedule items marked complete`}
              label="Logged Workouts"
              value={loggedWorkouts.toLocaleString()}
            />
            <MetricCard
              helper="Recovery / mobility sessions"
              label="Recovery Days"
              value={recoveryDays.toLocaleString()}
            />
            <MetricCard
              helper="Logged workout sets in the selected week"
              label="Training Volume"
              value={`${weeklySets} sets`}
            />
          </div>
        </section>

        <section className="flex flex-col gap-3 rounded-[28px] border border-white/10 bg-slate-950/58 p-3 shadow-[0_24px_80px_rgba(0,0,0,0.4)] backdrop-blur-xl lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            <CalendarButton onClick={() => {
              const today = startOfDay(new Date());
              setAnchorDate(today);
              setSelectedDate(toDateInput(today));
            }}>
              Today
            </CalendarButton>
            <CalendarButton onClick={() => navigateDate(-1)}>Previous</CalendarButton>
            <CalendarButton onClick={() => navigateDate(1)}>Next</CalendarButton>
          </div>
          <div className="flex flex-wrap gap-2">
            {(["week", "month", "agenda"] as CalendarViewMode[]).map((mode) => (
              <CalendarButton
                active={viewMode === mode}
                key={mode}
                onClick={() => setViewMode(mode)}
              >
                {mode}
              </CalendarButton>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <CalendarButton onClick={() => openNewEditor("Strength")}>Add Session</CalendarButton>
            <CalendarButton onClick={() => openNewEditor("Recovery")}>Add Recovery Day</CalendarButton>
            <DashboardLink href={ROUTES.dashboard.journal}>Add Reflection</DashboardLink>
          </div>
        </section>

        <div className="grid gap-5 xl:grid-cols-[1fr_370px]">
          <div className="space-y-5">
            <section className="rounded-[32px] border border-white/10 bg-slate-950/58 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.42)]">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-200">
                    {viewMode === "month" ? "Month View" : viewMode === "agenda" ? "Agenda View" : "Week View"}
                  </p>
                  <h2 className="mt-1 text-2xl font-black text-white">
                    {viewMode === "month"
                      ? new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(anchorDate)
                      : formatWeekRange(weekStart)}
                  </h2>
                </div>
                <p className="text-xs text-slate-500">
                  Phase: {planContext.activePhase}{planContext.phaseWeek ? ` - Week ${planContext.phaseWeek} of ${planContext.phaseWeeks || "unspecified"}` : ""}
                </p>
              </div>
              {viewMode === "week" ? renderWeekView() : null}
              {viewMode === "month" ? renderMonthView() : null}
              {viewMode === "agenda" ? renderAgendaView() : null}
            </section>

            <section className="grid gap-4 lg:grid-cols-2">
              <TodayTrainingCard
                item={todayPrimary}
                onAdd={() => openNewEditor("Strength", new Date())}
                onComplete={(target) => updateItemStatus(target, "Completed")}
                onEdit={setEditorItem}
                onRecovery={() => openNewEditor("Recovery", new Date())}
                onReflect={openReflect}
              />

              <PhaseContextCard planContext={planContext} />
            </section>

            <section className="rounded-[32px] border border-white/10 bg-slate-950/58 p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-200">
                    Upcoming Sessions
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    Move, complete, or reflect from the schedule stream.
                  </p>
                </div>
                <Pill tone="amber">{upcomingItems.length} items</Pill>
              </div>
              <div className="grid gap-3 lg:grid-cols-2">
                {upcomingItems.length > 0 ? (
                  upcomingItems.slice(0, 6).map((item) => (
                    <SessionCard
                      item={item}
                      key={item.id}
                      onComplete={(target) => updateItemStatus(target, "Completed")}
                      onEdit={setEditorItem}
                      onReflect={openReflect}
                    />
                  ))
                ) : (
                  <EmptyPanel>No upcoming sessions yet.</EmptyPanel>
                )}
              </div>
            </section>
          </div>

          <aside className="space-y-5">
            <WorkoutVolumeRail exercises={exerciseVolume} weekLabel={formatWeekRange(weekStart)} />
            <SelectedDayPanel
              date={parseDateInput(selectedDate)}
              items={selectedDayItems}
              onAdd={() => openNewEditor("Strength", parseDateInput(selectedDate))}
              onComplete={(target) => updateItemStatus(target, "Completed")}
              onEdit={setEditorItem}
              onReflect={openReflect}
            />
            <ReflectionPrompt />
            <section className="rounded-[32px] border border-white/10 bg-slate-950/58 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-200">
                Connected Pages
              </p>
              <div className="mt-4 grid gap-2">
                <DashboardLink href={ROUTES.workoutBuilder.home}>Build Workout</DashboardLink>
                <DashboardLink href={ROUTES.dashboard.myPlan}>View Plan</DashboardLink>
                <DashboardLink href={ROUTES.dashboard.phases}>View Phases</DashboardLink>
                <DashboardLink href={ROUTES.dashboard.stats}>Open Stats</DashboardLink>
                <DashboardLink href={ROUTES.dashboard.recovery}>Recovery Portal</DashboardLink>
              </div>
            </section>
          </aside>
        </div>
      </section>

      {editorItem ? (
        <ScheduleEditor
          error={calendarError}
          conflict={hasTimeConflict(calendarItems, editorItem)}
          item={editorItem}
          onChange={setEditorItem}
          onClose={() => setEditorItem(null)}
          onDelete={deleteEditorItem}
          onSave={saveEditorItem}
          onLogWorkout={logEditorWorkout}
          onReviewLaunch={reviewOpenWorkoutControls}
        />
      ) : null}
    </main></>
  );
}

function TodayTrainingCard({
  item,
  onAdd,
  onComplete,
  onEdit,
  onRecovery,
  onReflect,
}: {
  item?: CalendarItem;
  onAdd: () => void;
  onComplete: (item: CalendarItem) => void;
  onEdit: (item: CalendarItem) => void;
  onRecovery: () => void;
  onReflect: (item: CalendarItem) => void;
}) {
  return (
    <section className="rounded-[32px] border border-cyan-300/15 bg-cyan-400/10 p-5">
      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-100">
        Today&apos;s Training
      </p>
      {item ? (
        <div className="mt-4">
          <h3 className="text-2xl font-black text-white">{item.title}</h3>
          <p className="mt-2 text-sm text-slate-300">
            {item.bodyFocus} - {calendarDurationLabel(item)} - {item.type}
          </p>
          <SessionCard
            item={item}
            onComplete={onComplete}
            onEdit={onEdit}
            onReflect={onReflect}
          />
        </div>
      ) : (
        <div className="mt-4">
          <h3 className="text-2xl font-black text-white">No workout planned.</h3>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Add a workout, schedule recovery, or use the suggested focus from
            profile and stats.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <CalendarButton onClick={onAdd}>Add Workout</CalendarButton>
            <CalendarButton onClick={onRecovery}>Recovery Day</CalendarButton>
          </div>
        </div>
      )}
    </section>
  );
}

function PhaseContextCard({ planContext }: { planContext: PlanContext }) {
  return (
    <section className="rounded-[32px] border border-amber-300/15 bg-amber-400/10 p-5">
      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-100">
        Phase + Plan Context
      </p>
      <h3 className="mt-4 text-2xl font-black text-white">{planContext.activePhase}</h3>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <MetricCard
          helper={planContext.planFocus}
          label="Plan Focus"
          value={planContext.activePlan}
        />
        <MetricCard
          helper={planContext.phaseWeeks ? `${planContext.phaseWeeks} total weeks` : "Activate a saved phase to track its schedule"}
          label="Phase Week"
          value={planContext.phaseWeek ? `${planContext.phaseWeek} / ${planContext.phaseWeeks || "unspecified"}` : "Not scheduled"}
        />
        <MetricCard
          helper="Recovery load management"
          label="Deload Week"
          value={planContext.deloadWeek ? "Yes" : "No"}
        />
        <MetricCard
          helper="PR / benchmark emphasis"
          label="Testing Week"
          value={planContext.testingWeek ? "Yes" : "No"}
        />
      </div>
    </section>
  );
}

function WorkoutVolumeRail({ exercises, weekLabel }: { exercises: ReturnType<typeof workoutExerciseSetSummary>; weekLabel: string }) {
  return (
    <section className="rounded-[32px] border border-white/10 bg-slate-950/58 p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-200">Logged Exercise Sets</p>
      <p className="mt-2 text-xs text-slate-400">{weekLabel} · Completed workout history</p>
      <div className="mt-4 space-y-3">
        {exercises.map(item => (
          <div className="rounded-2xl border border-cyan-300/15 bg-cyan-300/5 p-3" key={item.id}>
            <div className="flex items-center justify-between gap-3">
              <p className="font-black text-white">{item.name}</p>
              <span className="text-xs font-black text-cyan-200">{item.sets} sets</span>
            </div>
            <p className="mt-1 text-xs text-slate-500">Last logged: {formatShortDate(activityTimestamp(item.lastCompletedAt))}</p>
          </div>
        ))}
        {exercises.length === 0 ? <p className="text-sm leading-6 text-slate-500">No valid workout sets logged in this week.</p> : null}
      </div>
    </section>
  );
}
function SelectedDayPanel({
  date,
  items,
  onAdd,
  onComplete,
  onEdit,
  onReflect,
}: {
  date: Date;
  items: CalendarItem[];
  onAdd: () => void;
  onComplete: (item: CalendarItem) => void;
  onEdit: (item: CalendarItem) => void;
  onReflect: (item: CalendarItem) => void;
}) {
  return (
    <section className="rounded-[32px] border border-white/10 bg-slate-950/58 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-200">
            Day Detail
          </p>
          <h3 className="mt-2 text-xl font-black text-white">{formatFullDate(date)}</h3>
        </div>
        <button
          className="rounded-2xl border border-cyan-300/20 bg-cyan-400/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-cyan-100"
          onClick={onAdd}
          type="button"
        >
          Add
        </button>
      </div>
      <div className="mt-4 space-y-3">
        {items.length > 0 ? (
          items.map((item) => (
            <SessionCard
              compact
              item={item}
              key={item.id}
              onComplete={onComplete}
              onEdit={onEdit}
              onReflect={onReflect}
            />
          ))
        ) : (
          <EmptyPanel>No session on this date yet.</EmptyPanel>
        )}
      </div>
    </section>
  );
}

function ReflectionPrompt() {
  return (
    <section className="rounded-[32px] border border-amber-300/15 bg-amber-400/10 p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-100">
        Reflection Prompts
      </p>
      <div className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
        <p>After completion, capture difficulty, energy, soreness, pain notes, what went well, and what to adjust.</p>
        <p>Save personal-event feedback in the event editor, or use Journal and Weekly Check-In for workout feedback. Reflections do not automatically complete sessions or change your plan.</p>
        <div className="flex flex-wrap gap-3"><Link href={ROUTES.dashboard.journal} className="text-amber-100 underline">Open Journal</Link><Link href={ROUTES.dashboard.progressCheckIn} className="text-amber-100 underline">Weekly Check-In</Link></div>
      </div>
    </section>
  );
}

function DashboardLink({ children, href }: { children: ReactNode; href: string }) {
  return (
    <Link
      className="rounded-2xl border border-cyan-300/20 bg-cyan-400/10 px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-cyan-100 transition hover:border-cyan-200/45 hover:bg-cyan-300/15"
      href={href}
    >
      {children}
    </Link>
  );
}

function DisabledLink({ label, title }: { label: string; title: string }) {
  return (
    <button
      className="cursor-not-allowed rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-slate-500"
      disabled
      title={title}
      type="button"
    >
      {label}
    </button>
  );
}

function EmptyPanel({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.025] p-4 text-sm leading-6 text-slate-500">
      {children}
    </div>
  );
}

function ScheduleEditor({
  error,
  conflict,
  item,
  onChange,
  onClose,
  onDelete,
  onSave,
  onLogWorkout,
  onReviewLaunch,
}: {
  error: string;
  conflict: boolean;
  item: CalendarItem;
  onChange: (item: CalendarItem) => void;
  onClose: () => void;
  onDelete: () => void;
  onSave: () => void;
  onLogWorkout: () => void;
  onReviewLaunch: () => void;
}) {
  const linked = Boolean(item.assignmentId || item.bookingId);
  const scheduleLocked = Boolean(item.bookingId || item.assignmentId && item.status === "Completed");
  const update = <K extends keyof CalendarItem>(key: K, value: CalendarItem[K]) =>
    onChange({ ...item, [key]: value });
  const updateReflection = <K extends keyof CalendarReflection>(
    key: K,
    value: CalendarReflection[K],
  ) => onChange({ ...item, reflection: { ...item.reflection, [key]: value } });

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-3 backdrop-blur-sm lg:items-center">
      <section className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-[32px] border border-white/10 bg-slate-950/95 p-4 shadow-[0_30px_120px_rgba(0,0,0,0.75)] sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-200">
              Schedule Editor
            </p>
            <h2 className="mt-2 text-3xl font-black text-white">
              {item.id ? "Edit Session" : "Add Session"}
            </h2>
            {conflict ? (
              <p className="mt-2 text-sm font-bold text-rose-200">
                Conflict detected at this date and time.
              </p>
            ) : null}
          </div>
          <button
            className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-slate-300"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </div>

        {error && <p role="alert" className="mt-4 text-sm text-rose-200">{error}</p>}
        {error && item.assignmentId ? <div className="mt-2 flex flex-wrap gap-4 text-sm text-cyan-200">
          <Link href={ROUTES.dashboard.sessionWorkout} target="_blank" rel="noreferrer">Open current workout</Link>
          <button type="button" onClick={onReviewLaunch} className="underline">Review current workout controls</button>
        </div> : null}
        {linked && <p className="mt-4 text-sm text-slate-300">{item.bookingId ? "Manage booked sessions through Sessions & booking." : scheduleLocked ? "Completed workout details remain in History." : "Move this assignment by changing its date, time or notes. Manage its workout and plan settings in My Plan; record completion in the logger."}</p>}
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Field label="Session Title">
            <input
              disabled={linked}
              className={inputClass}
              onChange={(event) => update("title", event.target.value)}
              value={item.title}
            />
          </Field>
          <Field label="Date">
            <input
              disabled={scheduleLocked}
              className={inputClass}
              onChange={(event) => update("date", event.target.value)}
              type="date"
              value={item.date}
            />
          </Field>
          <Field label="Time">
            <input
              disabled={scheduleLocked}
              className={inputClass}
              onChange={(event) => update("time", event.target.value)}
              type="time"
              value={item.time}
            />
          </Field>
          <Field label={item.assignmentId ? "Workout duration" : "Scheduled duration (minutes)"}>
            {item.assignmentId ? <p className="py-3 text-sm text-slate-300">{calendarDurationLabel(item)}</p> : <input
              disabled={linked}
              className={inputClass}
              min={5}
              onChange={(event) => update("duration", Number(event.target.value))}
              type="number"
              value={item.duration}
            />}
          </Field>
          <Field label="Workout Type">
            <select
              disabled={linked}
              className={inputClass}
              onChange={(event) => update("type", event.target.value as WorkoutType)}
              value={item.type}
            >
              {WORKOUT_TYPES.map((type) => (
                <option key={type}>{type}</option>
              ))}
            </select>
          </Field>
          <Field label="Body Focus">
            <select
              disabled={linked}
              className={inputClass}
              onChange={(event) => update("bodyFocus", event.target.value)}
              value={item.bodyFocus}
            >
              {BODY_FOCUS_OPTIONS.map((focus) => (
                <option key={focus}>{focus}</option>
              ))}
            </select>
          </Field>
          <Field label="Linked Workout">
            <input
              disabled={linked}
              className={inputClass}
              onChange={(event) => update("linkedWorkout", event.target.value)}
              value={item.linkedWorkout}
            />
          </Field>
          <Field label="Linked Plan">
            <input
              disabled={linked}
              className={inputClass}
              onChange={(event) => update("linkedPlan", event.target.value)}
              value={item.linkedPlan}
            />
          </Field>
          <Field label="Phase">
            <input
              disabled={linked}
              className={inputClass}
              onChange={(event) => update("phase", event.target.value)}
              value={item.phase}
            />
          </Field>
          <Field label="Status">
            <select
              disabled={linked}
              className={inputClass}
              onChange={(event) => update("status", event.target.value as CalendarStatus)}
              value={item.status}
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </Field>
          <Field label="Reminder">
            <select
              disabled={linked}
              className={inputClass}
              onChange={(event) => update("reminder", event.target.value)}
              value={item.reminder}
            >
              {["None", "15 min before", "1 hour before", "Morning of", "Night before"].map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
            <p className="mt-2 text-xs text-slate-400">Saved preference only. Calendar reminders do not send notifications yet.</p>
          </Field>
          <Field label="Notes">
            <textarea
              disabled={scheduleLocked}
              className={`${inputClass} min-h-[96px]`}
              onChange={(event) => update("notes", event.target.value)}
              value={item.notes}
            />
          </Field>
        </div>

        <div className="mt-6 rounded-[28px] border border-amber-300/15 bg-amber-400/10 p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-100">
            Reflection
          </p>
          {item.assignmentId || item.bookingId ? <div className="mt-3 space-y-3 text-sm text-amber-100"><p>Calendar reflections are available for personal events. Use Weekly Check-In or Journal to record feedback about planned workouts and booked sessions.</p><div className="flex gap-3"><Link href={ROUTES.dashboard.journal} className="underline">Open Journal</Link><Link href={ROUTES.dashboard.progressCheckIn} className="underline">Weekly Check-In</Link></div></div> : <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Field label="Session Difficulty 1-10">
              <select
                className={inputClass}
                onChange={(event) => updateReflection("difficulty", event.target.value === "" ? null : Number(event.target.value))}
                value={item.reflection.difficulty ?? ""}
              ><option value="">Not reported</option>{Array.from({ length: 10 }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}/10</option>)}</select>
            </Field>
            <Field label="Energy 1-10">
              <select
                className={inputClass}
                onChange={(event) => updateReflection("energy", event.target.value === "" ? null : Number(event.target.value))}
                value={item.reflection.energy ?? ""}
              ><option value="">Not reported</option>{Array.from({ length: 10 }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}/10</option>)}</select>
            </Field>
            <Field label="Soreness">
              <input
                className={inputClass}
                onChange={(event) => updateReflection("soreness", event.target.value)}
                value={item.reflection.soreness}
              />
            </Field>
            <Field label="Pain Notes">
              <input
                className={inputClass}
                onChange={(event) => updateReflection("painNotes", event.target.value)}
                value={item.reflection.painNotes}
              />
            </Field>
            <Field label="What Went Well">
              <textarea
                className={`${inputClass} min-h-[96px]`}
                onChange={(event) => updateReflection("wentWell", event.target.value)}
                value={item.reflection.wentWell}
              />
            </Field>
            <Field label="What To Adjust">
              <textarea
                className={`${inputClass} min-h-[96px]`}
                onChange={(event) => updateReflection("adjust", event.target.value)}
                value={item.reflection.adjust}
              />
            </Field>
          </div>}
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <button
            className="rounded-2xl bg-cyan-300 px-5 py-3 text-xs font-black uppercase tracking-[0.12em] text-slate-950 transition hover:bg-cyan-200"
            onClick={onSave}
            disabled={scheduleLocked}
            type="button"
          >
            Save
          </button>
          {item.bookingId ? <DashboardLink href={ROUTES.dashboard.sessionBooking}>Manage booking</DashboardLink> : item.assignmentId ? item.status === "Completed" ? <DashboardLink href={ROUTES.dashboard.sessionHistory}>View in History</DashboardLink> : <button type="button" onClick={onLogWorkout} className="rounded-2xl border border-emerald-300/20 bg-emerald-400/10 px-5 py-3 text-xs font-black uppercase tracking-[0.12em] text-emerald-100">Log workout</button> : <button
            className="rounded-2xl border border-emerald-300/20 bg-emerald-400/10 px-5 py-3 text-xs font-black uppercase tracking-[0.12em] text-emerald-100 transition hover:bg-emerald-300 hover:text-slate-950"
            onClick={() => onChange({ ...item, status: "Completed" })}
            type="button"
          >
            Mark Complete
          </button>}
          <button
            className="rounded-2xl border border-rose-300/20 bg-rose-400/10 px-5 py-3 text-xs font-black uppercase tracking-[0.12em] text-rose-100 transition hover:bg-rose-300 hover:text-slate-950"
            onClick={onDelete}
            disabled={scheduleLocked}
            type="button"
          >
            Delete
          </button>
        </div>
      </section>
    </div>
  );
}
