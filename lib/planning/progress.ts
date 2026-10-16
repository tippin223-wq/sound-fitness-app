import type { PlanningLog } from "./logs";
import type { GoalState } from "./goals";
import type { LocalWeeklyPlan } from "@/lib/localData/workoutPlanData";
import type { WeeklyCheckIn } from "./checkIns";
import type { JournalEntry } from "./journal";
import type { PainLog } from "./painLogs";
import { checkInWeek } from "./checkIns";
import { activityTimestamp, localDate } from "./dates";
import { assignmentStatusFromRecords } from "./planCompletionEvidence";
import { workoutEntries, workoutEntriesIssue, workoutEntryIssues, workoutRecordedValue, workoutHistory, workoutSetCount as sets } from "./history";
import { normalizeGoals, savedGoalsIssue } from "./goals";

import { validExerciseSemanticMetadata } from "./exerciseSemanticMetadata";
import { validatePlanningImport } from "./importValidation";

/** Known set counts remain reportable while unsupported original values are flagged for review. */
function workoutNeedsEntryReview(log: PlanningLog, now: Date) {
  return log.title != null && typeof log.title !== "string" || Boolean(workoutEntriesIssue(log)) || workoutEntries(log).some(entry => {
    if (workoutEntryIssues(entry).length || !validExerciseSemanticMetadata(entry)) return true;
    const value = entry as unknown as Record<string, unknown>;
    return ["exerciseId", "exerciseName", "body", "pattern", "equipment"].some(field => value[field] != null && typeof value[field] !== "string")
      || value.date != null && value.date !== "" && (!Number.isFinite(activityTimestamp(value.date)) || activityTimestamp(value.date) > now.getTime());
  });
}

const percent = (value: number, target: number) => target > 0 ? Math.min(100, Math.round(value / target * 100)) : 0;
export function buildProgressSummary(input: { logs: PlanningLog[]; goals: Partial<GoalState>; plans: LocalWeeklyPlan[]; planIssue?: string; checkIns: WeeklyCheckIn[]; journal: JournalEntry[]; painLogs?: PainLog[]; feedbackIssues?: Partial<Record<"checkIns" | "journal" | "painLogs", string>> }, now = new Date()) {
  const weekStart = checkInWeek(now);
  const end = new Date(now); end.setDate(end.getDate() + 6 - (end.getDay() + 6) % 7);
  const weekEnd = localDate(end);
  const logs = workoutHistory(input.logs, now);
  const recordedWorkouts = logs.filter(log => log.loggedSets > 0);
  const needsSetReview = logs.length - recordedWorkouts.length;
  const entryReview = recordedWorkouts.filter(log => workoutNeedsEntryReview(log, now));
  const inWeek = (date: string) => date >= weekStart && date <= weekEnd;
  const weeklyLogs = recordedWorkouts.filter(log => inWeek(localDate(new Date(activityTimestamp(log.completedAt)))));
  const weeklySetReview = logs.filter(log => inWeek(log.date) && log.loggedSets === 0).length;
  const weeklyEntryReview = entryReview.filter(log => inWeek(log.date)).length;
  const weeklySets = weeklyLogs.reduce((total, log) => total + workoutEntries(log).reduce((sum, entry) => sum + sets(entry?.sets), 0), 0);
  const planReview = input.planIssue || (!Array.isArray(input.plans) || validatePlanningImport({ soundFitnessWorkoutPlans: input.plans }) ? "Saved plan weeks need review. Original plans and assignments remain preserved." : "");
  const plans = planReview ? [] : input.plans;
  const plannedDays = plans.filter(plan => plan.status !== "archived").flatMap(plan => plan.days.map(day => ({ planId: plan.id, day }))).filter(item => inWeek(item.day.date));
  const planned = plannedDays.flatMap(({ planId, day }) => day.assignments.map(assignment => ({ assignment, date: day.date, status: assignmentStatusFromRecords(planId, day.id, assignment, input.logs, now) })));
  const completed = planned.filter(item => item.status === "Completed").length;
  const needsReview = planned.filter(item => item.status === "Needs history review").length;
  const savedGoals = savedGoalsIssue(input.goals, now) ? null : normalizeGoals(input.goals);
  const sessionTarget = savedGoals ? Number(savedGoals.targetWeeklySessions) : 0;
  const setTarget = savedGoals ? Number(savedGoals.targetWeeklySets) : 0;
  const validFeedback = (key: string, records: unknown) => Array.isArray(records) && !validatePlanningImport({ [key]: records });
  const checkInIssue = input.feedbackIssues?.checkIns || (!validFeedback("soundFitnessWeeklyCheckIns", input.checkIns) ? "Saved weekly feedback needs review. Original records remain preserved." : "");
  const journalIssue = input.feedbackIssues?.journal || (!validFeedback("soundFitnessJournalEntries", input.journal) ? "Saved journal entries need review. Original records remain preserved." : "");
  const painIssue = input.feedbackIssues?.painLogs || (!validFeedback("soundFitnessPainLogs", input.painLogs === undefined ? [] : input.painLogs) ? "Saved pain reports need review. Original records remain preserved." : "");
  const checkIns = checkInIssue ? [] : input.checkIns;
  const journal = journalIssue ? [] : input.journal;
  const painLogs = painIssue ? [] : input.painLogs || [];
  const feedbackReview = [
    { label: "Weekly Check-Ins", href: "/dashboard/progress/check-in", issue: checkInIssue },
    { label: "Journal Entries", href: "/dashboard/progress/journal", issue: journalIssue },
    { label: "Pain Reports", href: "/dashboard/progress/pain-tracking", issue: painIssue },
  ].filter(item => item.issue);
  const latestCheckIn = [...checkIns].sort((a, b) => b.weekStart.localeCompare(a.weekStart))[0];
  const workoutSnapshot = [
    { label: "This Week", value: sessionTarget ? `${weeklyLogs.length}/${sessionTarget}` : String(weeklyLogs.length), sub: (sessionTarget ? "Logged workouts / saved goal" : "Logged workouts · set a goal") + (weeklySetReview ? ` · ${weeklySetReview} records need set review` : "") + (weeklyEntryReview ? ` · ${weeklyEntryReview} records need entry review` : "") },
    { label: "Logged Sets", value: setTarget ? `${weeklySets}/${setTarget}` : String(weeklySets), sub: setTarget ? "This week / saved set goal" : "This week" },
    { label: "Last Workout", value: recordedWorkouts[0] ? workoutRecordedValue(recordedWorkouts[0].title) : "None logged", sub: recordedWorkouts[0] ? recordedWorkouts[0].date : "Complete a workout to begin" },
    { label: "Plan Completion", value: planReview ? "Needs plan review" : planned.length ? `${completed}/${planned.length}` : "No assignments", sub: planReview ? "Review and export original plan weeks in Calendar" : needsReview ? `${needsReview} need history review · completed / scheduled this week` : "Completed / scheduled this week" },
    { label: "Weekly Feedback", value: checkInIssue ? "Needs review" : latestCheckIn ? `Energy ${latestCheckIn.energy}/10` : "Not reported", sub: checkInIssue ? "Review and export original weekly feedback" : latestCheckIn ? `Reported week of ${latestCheckIn.weekStart}` : "Save a weekly check-in" },
    { label: "Journal", value: journalIssue ? "Needs review" : String(journal.length), sub: journalIssue ? "Review and export original journal entries" : "Saved entries" },
  ];
  const weeklyTraining = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(now); date.setDate(date.getDate() - (date.getDay() + 6) % 7 + i);
    const day = localDate(date); const entries = planned.filter(item => item.date === day);
    const logged = weeklyLogs.filter(log => localDate(new Date(activityTimestamp(log.completedAt))) === day);
    return { day: date.toLocaleDateString(undefined, { weekday: "short" }), date: day, title: [...new Set([...entries.map(item => item.assignment.templateTitle), ...logged.map(log => workoutRecordedValue(log.title))])].join(", ") || (planReview ? "Plan schedule needs review" : "No workout scheduled"), status: planReview ? "Needs plan review" : entries.length ? entries.some(item => item.status === "Needs history review") ? "Needs history review" : entries.every(item => item.status === "Completed") ? "Completed" : "Planned" : logged.length ? "Logged" : "Unscheduled", score: planReview ? `${logged.length} logged · plan schedule needs review` : `${logged.length} logged · ${entries.length} scheduled` };
  });
  const exerciseSets = new Map<string, { name: string; count: number }>();
  weeklyLogs.forEach(log => workoutEntries(log).forEach(entry => { if (!entry || typeof entry.exerciseId !== "string" || typeof entry.exerciseName !== "string") return; const old = exerciseSets.get(entry.exerciseId); exerciseSets.set(entry.exerciseId, { name: entry.exerciseName, count: (old?.count || 0) + sets(entry.sets) }); }));
  const bodyFocus = [...exerciseSets].filter(([, value]) => value.count > 0).map(([id, value]) => ({ id, area: value.name, volume: percent(value.count, weeklySets), note: `${value.count} logged sets · share of this week's logged sets` }));
  const goals = [
    ...(sessionTarget ? [{ title: `${sessionTarget} workouts this week`, progress: percent(weeklyLogs.length, sessionTarget), status: `${weeklyLogs.length} logged` }] : []),
    ...(setTarget ? [{ title: `${setTarget} sets this week`, progress: percent(weeklySets, setTarget), status: `${weeklySets} logged` }] : []),
  ];
  const feedbackProgress = [{ label: "Weekly Check-Ins", value: checkInIssue ? "Needs review" : String(checkIns.length), sub: checkInIssue ? "Original feedback preserved · totals paused" : "Saved weekly feedback" }, { label: "Journal Entries", value: journalIssue ? "Needs review" : String(journal.length), sub: journalIssue ? "Original entries preserved · totals paused" : "Saved personal reflections" }, { label: "Pain Reports", value: painIssue ? "Needs review" : String(painLogs.length), sub: painIssue ? "Original reports preserved · totals paused" : "Saved reports · no recovery status inferred" }];
  const nextAction = planReview ? "Review and export original plan weeks in Calendar before counting scheduled completion. Logged workout totals remain available." : needsReview ? "Review linked workout records in History before counting plan completion. Original records remain saved." : needsSetReview ? "Review workout records without valid logged sets in History. They do not count toward workout goals; original records remain saved." : entryReview.length ? "Review saved workout entries in History. Valid recorded sets remain included; unsupported values and original records are preserved for review and export." : feedbackReview.length ? "Review and export the original feedback records using the links below. Workout totals remain based on recorded workouts." : !sessionTarget ? "Save your goals and weekly targets to start tracking progress." : !planned.length ? "Schedule workouts in My Plan to track assignment completion." : "Review your scheduled workouts and your reported feedback before choosing your next session.";
  const recentWorkouts = logs.slice(0, 8).map(log => ({ id: log.id, title: workoutRecordedValue(log.title), date: localDate(new Date(activityTimestamp(log.completedAt))), sets: workoutEntries(log).reduce((total, entry) => total + sets(entry?.sets), 0) }));
  return { weekStart, weekEnd, workoutSnapshot, weeklyTraining, bodyFocus, goals, feedbackProgress, feedbackReview, planReview, nextAction, recentWorkouts, weeklySets, weeklySessions: weeklyLogs.length };
}
