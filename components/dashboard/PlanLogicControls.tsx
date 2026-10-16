"use client";
import Link from "next/link";
import { useState } from "react";
import { assignTemplateToPlanDay, assignmentTemplateIssue, planWorkoutTemplateChoices, removeAssignmentFromPlanDay, updatePlanDay, updatePlanAssignment, updateWorkoutPlan, markPlanGoalsReviewed, planGoalsNeedReview, capturePlanEditor, assertPlanEditor, type LocalWeeklyPlan } from "@/lib/localData/workoutPlanData";
import type { LocalWorkoutBuilderTemplate } from "@/lib/localData/workoutBuilderData";
import { readGoals, requireSavedGoals, goalAdvice } from "@/lib/planning/goals";
import { assignmentCompleted, readPlanningLogs, setsInPlanWeek } from "@/lib/planning/logs";
import { ROUTES } from "@/lib/routes";
import { planAssignmentStatus } from "@/lib/planning/planCompletionEvidence";
import { resolvedPlannedWorkload } from "@/lib/planning/plannedWorkload";

const field = "rounded-lg border border-white/20 bg-slate-950 p-2 text-sm text-white";
export default function PlanLogicControls({ plan, templates }: { plan: LocalWeeklyPlan; templates: LocalWorkoutBuilderTemplate[] }) {
  const [error, setError] = useState("");
  const choices = planWorkoutTemplateChoices(templates);
  const excludedCount = templates.length - choices.length;
  const goals = readGoals();
  const editor = capturePlanEditor(plan);
  let goalIssue = "";
  try { requireSavedGoals(); } catch (cause) { goalIssue = cause instanceof Error ? cause.message : "Review your saved Goals."; }
  const assignments = plan.days.flatMap(day => day.assignments);
  const statuses = plan.days.flatMap(day => day.assignments.map(item => planAssignmentStatus(plan.id, day.id, item)));
  const done = statuses.filter(status => status === "Completed").length;
  const needsHistoryReview = statuses.filter(status => status === "Needs history review").length;
  const workload = resolvedPlannedWorkload(assignments, templates);
  const plannedSets = workload.totalSets;
  const completedSets = setsInPlanWeek(plan.weekStartDate);
  const training = plan.days.filter(day => day.assignments.length > 0).length;
  const remainingSessions = goalIssue ? null : Math.max(0, Number(goals.targetWeeklySessions) - assignments.length);
  const overdue = plan.days.filter(day => day.date < new Date().toLocaleDateString("en-CA") && day.assignments.some(item => planAssignmentStatus(plan.id, day.id, item) === "Planned")).length;
  const act = (action: () => unknown) => { try { assertPlanEditor(editor); action(); setError(""); } catch (cause) { setError(cause instanceof Error ? cause.message : "Change could not be saved."); } };
  const locked = plan.status === "archived";
  const goalsNeedReview = planGoalsNeedReview(plan);
  return <section aria-label="Plan editing and progress" className="mb-5 space-y-4 rounded-2xl border border-white/10 p-4">
    <div className="flex flex-wrap items-center gap-3">
      <Link className="text-cyan-200" href={`${ROUTES.dashboard.createMyPlan}?plan=${encodeURIComponent(plan.id)}`}>Edit plan details & rules</Link>
      <button type="button" onClick={() => act(() => updateWorkoutPlan(plan.id, { status: locked ? "draft" : "archived" }))}>{locked ? "Restore draft" : "Archive week"}</button>
      {!goalIssue && goalsNeedReview && <button type="button" disabled={locked} onClick={() => act(() => markPlanGoalsReviewed(plan.id, goals.updatedAt, editor))}>Mark current goals reviewed</button>}
    </div>
    <p>{done}/{assignments.length} scheduled workouts completed · {assignments.length}/{goalIssue ? "—" : goals.targetWeeklySessions} scheduled sessions · {training} {training === 1 ? "day" : "days"} with workouts · {plan.days.filter(day => day.kind === "rest").length} rest days</p>
    <p>{plannedSets === null ? `${workload.knownSets} known planned sets; ${workload.unknownAssignments} workout(s) need target review` : `${plannedSets} planned sets`} · {completedSets} completed sets · Weekly target: {goalIssue ? "not confirmed" : goals.targetWeeklySets}. Exercise-specific saved targets take priority. The fallback sets/exercise below fills unset targets (default 3).</p>
    {plannedSets === null ? <p role="status" className="text-amber-200">Review missing, changed, or unsupported workouts before comparing weekly workload with your goal. Existing workouts have not changed.</p> : null}
    {goalIssue ? <p role="status" className="text-amber-200">{goalIssue} <Link className="text-cyan-200" href="/dashboard/goals">Open Goals</Link></p> : <p className="text-cyan-200">{goals.primaryGoal ? goalAdvice[goals.primaryGoal] : "Save your goals to receive planning guidance."}{goals.secondaryGoal ? ` Supporting focus: ${goals.secondaryGoal}.` : ""}</p>}
    {!goalIssue && goalsNeedReview && <p className="text-amber-200">Review current saved Goals against this plan. Workout assignments have not been changed.</p>}
    {remainingSessions !== null && remainingSessions > 0 && <p className="text-amber-200">Schedule {remainingSessions} more {remainingSessions === 1 ? "workout" : "workouts"} to reach your session target.</p>}
    {!goalIssue && plannedSets !== null && plannedSets !== Number(goals.targetWeeklySets) && <p className="text-slate-300">Planned sets are {plannedSets < Number(goals.targetWeeklySets) ? "below" : "above"} your saved weekly target. Review the difference before changing workload.</p>}
    {needsHistoryReview > 0 && <p role="status" className="text-amber-200">{needsHistoryReview} workout(s) need history review before they can count as completed. Their records remain protected. <Link className="text-cyan-200" href={ROUTES.dashboard.sessionHistory}>Review History</Link></p>}
    {overdue > 0 && <p className="text-amber-200">{overdue} day(s) have overdue workouts. Reschedule individually rather than stacking missed work.</p>}
    {plan.settings && <p className="text-slate-300">Progression preference: {plan.settings.progression}. Review logged reps and load before applying changes. {plan.settings.notes}</p>}
    {excludedCount > 0 && <p role="status" className="text-amber-200">{excludedCount} saved workout(s) need review and are unavailable for assignment. Original workouts and existing assignments are preserved. <Link className="underline" href={ROUTES.workoutBuilder.home}>Review saved workouts</Link></p>}
    {error && <p role="alert" className="text-rose-300">{error}</p>}
    {plan.days.map(day => <fieldset disabled={locked} key={day.id} className="space-y-2 border-t border-white/10 pt-3">
      <legend className="font-bold">{day.dayOfWeek} · {day.date}</legend>
      <div className="flex flex-wrap gap-2">
        <label>Day type <select aria-label={`${day.dayOfWeek} day type`} className={field} value={day.kind || (day.assignments.length ? "training" : "open")} onChange={e => { const kind = e.target.value; if (kind === "training" || kind === "rest") act(() => updatePlanDay(plan.id, day.id, { kind })); }}><option value="open" disabled>Choose day type</option><option value="training">Training</option><option value="rest">Rest</option></select></label>
        <label>Focus <input aria-label={`${day.dayOfWeek} focus`} className={field} key={day.focus} defaultValue={day.focus} onBlur={e => { if (e.target.value !== day.focus) act(() => updatePlanDay(plan.id, day.id, { focus: e.target.value })); }} /></label>
        <label>Notes <input aria-label={`${day.dayOfWeek} notes`} className={field} key={day.notes} defaultValue={day.notes} onBlur={e => { if (e.target.value !== day.notes) act(() => updatePlanDay(plan.id, day.id, { notes: e.target.value })); }} /></label>
        {day.kind !== "rest" && <select aria-label={`Assign workout to ${day.dayOfWeek}`} className={field} value="" onChange={e => act(() => { const template = choices.find(item => item.id === e.target.value); if (template) assignTemplateToPlanDay({ planId: plan.id, dayId: day.id, template }); })}><option value="">Assign saved workout…</option>{choices.map(template => <option key={template.id} value={template.id}>{template.title}</option>)}</select>}
      </div>
      {day.assignments.map(assignment => {
        const recorded = assignmentCompleted(assignment.id);
        const status = planAssignmentStatus(plan.id, day.id, assignment);
        const completed = status === "Completed";
        const templateIssue = completed ? null : assignmentTemplateIssue(assignment, choices.find(item => item.id === assignment.templateId));
        const log = completed ? readPlanningLogs().find(item => item.assignmentId === assignment.id) : undefined;
        return <div key={assignment.id} className="flex flex-wrap items-center gap-2 text-sm">
          <span>{assignment.templateTitle} · {status}{log ? ` ${new Date(log.completedAt).toLocaleDateString()}` : ""}</span>
          {templateIssue ? <span role="status" className="text-amber-200">{templateIssue}</span> : null}
          <label>Fallback sets/exercise <input aria-label={`${assignment.templateTitle} sets per exercise`} disabled={recorded} type="number" min={1} max={20} className={`${field} w-20`} key={assignment.setsPerExercise} defaultValue={assignment.setsPerExercise || 3} onBlur={e => { if (Number(e.target.value) !== (assignment.setsPerExercise || 3)) act(() => updatePlanAssignment(plan.id, day.id, assignment.id, { setsPerExercise: Number(e.target.value) })); }} /></label>
          <label>Date <input aria-label={`${assignment.templateTitle} date`} disabled={completed} type="date" className={field} value={day.date} onChange={e => act(() => updatePlanAssignment(plan.id, day.id, assignment.id, {}, e.target.value))} /></label>
          <label>Time <input aria-label={`${assignment.templateTitle} time`} disabled={completed} type="time" className={field} value={assignment.time || ""} onChange={e => act(() => updatePlanAssignment(plan.id, day.id, assignment.id, { time: e.target.value }))} /></label>
          {!recorded && <button type="button" onClick={() => act(() => removeAssignmentFromPlanDay({ planId: plan.id, dayId: day.id, assignmentId: assignment.id }))}>Remove workout</button>}
          {!choices.some(item => item.id === assignment.templateId) && <Link className="text-amber-200" href={ROUTES.workoutBuilder.home}>Template unavailable · open Builder to replace</Link>}
        </div>;
      })}
    </fieldset>)}
  </section>;
}
