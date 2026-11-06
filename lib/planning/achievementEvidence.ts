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
  const recovery = inspectSupportRecords();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  return lifetimeAchievementMilestones({ workouts: sessions.total, trainingDays: sessions.dates.length,
    historyIssue: sessions.issue, recoveryIssue: recovery.issue,
    recoveryDays: new Set(recovery.rows.filter(row => row.kind === "recovery" && row.value > 0 && row.date <= today && new Date(row.recordedAt).getTime() <= now.getTime()).map(row => row.date)).size });
}
export const achievementEvidenceSnapshot = () => JSON.stringify(readAchievementMilestones());
export const serverAchievementEvidence = () => JSON.stringify(lifetimeAchievementMilestones({ workouts: 0, trainingDays: 0, recoveryDays: 0 }));

/** Lifetime counters never reset with a selected week or training plan. */
export function lifetimeAchievementMilestones(input: { workouts: number; trainingDays: number; recoveryDays: number; historyIssue?: string; recoveryIssue?: string }): AchievementBadgeItem[] {
  const tracks = [
    { category: "consistency" as const, count: input.trainingDays, label: "Training days", icon: "📆", unit: "different days trained", issue: input.historyIssue, href: ROUTES.dashboard.sessionHistory },
    { category: "intensity" as const, count: input.workouts, label: "Workouts completed", icon: "🏋️", unit: "completed workouts", issue: input.historyIssue, href: ROUTES.dashboard.sessionHistory },
    { category: "recovery" as const, count: input.recoveryDays, label: "Recovery days", icon: "🌿", unit: "days with recovery logged", issue: input.recoveryIssue, href: ROUTES.dashboard.achievements },
  ];
  return tracks.flatMap(track => [1, 5, 10, 25, 50, 100, 250].map(target => {
    const count = !track.issue && Number.isSafeInteger(track.count) && track.count >= 0 ? track.count : 0;
    return {
      category: track.category, icon: track.icon, href: track.href,
      label: `${track.label}: ${target}`,
      meta: track.issue || `${count} / ${target} ${track.unit}`,
      progress: Math.min(100, count / target * 100),
      status: count >= target ? "completed" as const : "active" as const,
      statusLabel: track.issue ? "Review records" : `${count} / ${target}`,
      description: `Lifetime ${track.unit}. Verified saved records; no weekly reset.`,
    };
  })).sort((a, b) => Number(a.status === "completed") - Number(b.status === "completed") || b.progress - a.progress);
}
