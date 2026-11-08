import type { AchievementBadgeItem } from "@/components/dashboard/SoundAchievementBadgeRow";
import { ROUTES } from "@/lib/routes";
import { inspectSupportRecords } from "./supportSignalRecords";

import { readDashboardSessionEvidence } from "./dashboardSessionEvidence";

/** Observed actions, not awarded points, health outcomes, or predicted completion dates. */
export function achievementMilestones(input: { goals: boolean; plan: boolean; planIssue: string; workouts: number; historyIssue: string }): AchievementBadgeItem[] {
  const rows = [
    { label: "Goals saved", icon: "🎯", href: ROUTES.dashboard.goals, recorded: input.goals, issue: "", meta: "Validated training direction and weekly targets" },
    { label: "Plan activated", icon: "📅", href: ROUTES.dashboard.myPlan, recorded: input.plan, issue: input.planIssue, meta: "Current active plan" },
    { label: "First workout recorded", icon: "🏋️", href: ROUTES.dashboard.sessionHistory, recorded: Number.isSafeInteger(input.workouts) && input.workouts > 0, issue: input.historyIssue, meta: "Completed workout with recorded sets" },
  ];
  return rows.map(row => ({ category: "consistency", label: row.label, icon: row.icon, href: row.href,
    meta: row.issue || row.meta, progress: !row.issue && row.recorded ? 100 : 0,
    status: !row.issue && row.recorded ? "completed" : "default",
    statusLabel: row.issue ? "Review records" : row.recorded ? "Recorded" : "Not yet recorded",
    description: "Based on current saved records. This milestone does not award points or certify a health outcome.",
  }));
}
export function readAchievementMilestones(now = new Date()) {
  const sessions = readDashboardSessionEvidence(now);
  const support = inspectSupportRecords();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const rows = support.rows.filter(row => row.date <= today && new Date(row.recordedAt).getTime() <= now.getTime());
  return lifetimeAchievementMilestones({ workouts: sessions.total, trainingDays: sessions.dates.length,
    dates: sessions.dates, ...sessions.achievementCounts, historyIssue: sessions.issue, recoveryIssue: support.issue,
    supportDays: Object.fromEntries(["recovery", "sleep", "stress", "soreness", "fatigue"].map(kind => [kind, new Set(rows.filter(row => row.kind === kind).map(row => row.date)).size])),
    recoveryDays: new Set(rows.filter(row => row.kind === "recovery").map(row => row.date)).size });
}
export const achievementEvidenceSnapshot = () => JSON.stringify(readAchievementMilestones());
export const serverAchievementEvidence = () => JSON.stringify(lifetimeAchievementMilestones({ workouts: 0, trainingDays: 0, recoveryDays: 0 }));

/** Only the next unfinished milestone from each path belongs in the dashboard orbit. */
export function nextAchievementPaths(items: AchievementBadgeItem[]) {
  const paths = new Map<string, AchievementBadgeItem[]>();
  for (const item of items) { const key = item.pathId || item.label; paths.set(key, [...(paths.get(key) || []), item]); }
  return [...paths.values()].map(path => path.find(item => item.status !== "completed") || path[path.length - 1]);
}

/** Lifetime counters never reset with a selected week or training plan. */
export function lifetimeAchievementMilestones(input: {
  workouts: number; trainingDays: number; recoveryDays: number; historyIssue?: string; recoveryIssue?: string;
  dates?: string[]; sets?: number; exercises?: number; exerciseEntries?: number; substantialWorkouts?: number;
  supportDays?: Record<string, number>;
}): AchievementBadgeItem[] {
  const dates = [...new Set(input.dates || [])].sort();
  const weekKeys = dates.map(value => { const day = new Date(value + "T12:00:00"); day.setDate(day.getDate() - (day.getDay() + 6) % 7); return day.toISOString().slice(0, 10); });
  let streak = 0, longest = 0, previous = 0;
  for (const value of dates) { const time = Date.parse(value + "T00:00:00Z"); streak = time - previous === 86400000 ? streak + 1 : 1; longest = Math.max(longest, streak); previous = time; }
  const tracks = [
    ["consistency", "training-days", "Showing Up", "📆", input.trainingDays, "training days"],
    ["consistency", "active-weeks", "Weekly Rhythm", "🗓️", new Set(weekKeys).size, "active weeks"],
    ["consistency", "active-months", "Long Game", "🌙", new Set(dates.map(day => day.slice(0, 7))).size, "active months"],
    ["consistency", "day-streak", "Momentum", "🔥", longest, "consecutive training days"],
    ["consistency", "weekend-days", "Weekend Warrior", "☀️", dates.filter(day => [0, 6].includes(new Date(day + "T12:00:00").getDay())).length, "weekend training days"],
    ["intensity", "workouts", "Session Builder", "🏋️", input.workouts, "completed workouts"],
    ["intensity", "sets", "Set by Set", "💪", input.sets || 0, "recorded sets"],
    ["intensity", "exercises", "Movement Explorer", "🧭", input.exercises || 0, "different exercises"],
    ["intensity", "exercise-entries", "Putting in Work", "⚡", input.exerciseEntries || 0, "completed exercise entries"],
    ["intensity", "substantial-workouts", "Five Set Foundation", "🧱", input.substantialWorkouts || 0, "workouts with at least five sets"],
    ["recovery", "recovery", "Recovery Ritual", "🌿", input.supportDays?.recovery ?? input.recoveryDays, "days with recovery logged"],
    ["recovery", "sleep", "Sleep Awareness", "🌙", input.supportDays?.sleep || 0, "days with sleep logged"],
    ["recovery", "stress", "Stress Check", "🧘", input.supportDays?.stress || 0, "days with stress logged"],
    ["recovery", "soreness", "Body Awareness", "🩹", input.supportDays?.soreness || 0, "days with soreness logged"],
    ["recovery", "fatigue", "Energy Check", "🔋", input.supportDays?.fatigue || 0, "days with fatigue logged"],
  ] as const;
  return tracks.flatMap(([category, pathId, pathName, icon, rawCount, unit]) => {
    const issue = category === "recovery" ? input.recoveryIssue : input.historyIssue;
    const count = !issue && Number.isSafeInteger(rawCount) && rawCount >= 0 ? rawCount : 0;
    return [1, 2, 5, 10, 25, 50, 100, 250].map((target, index) => ({
      category, pathId, pathName, milestone: index + 1, target, icon,
      href: category === "recovery" ? ROUTES.dashboard.achievements : ROUTES.dashboard.sessionHistory,
      label: `${pathName} · ${target}`, meta: issue || `${count} / ${target} ${unit}`,
      progress: Math.min(100, count / target * 100),
      status: count >= target ? "completed" as const : "active" as const,
      statusLabel: issue ? "Review records" : `${count} / ${target}`,
      description: `Lifetime ${unit}. Based on saved activity, not a health outcome.`,
    }));
  });
}
