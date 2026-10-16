import { readWorkoutPlans, startPlanWorkout } from "@/lib/localData/workoutPlanData";
import { resolveUniqueSavedWorkoutTemplate } from "@/lib/localData/workoutBuilderData";
import { ROUTES } from "@/lib/routes";
import { assignmentCompleted, readAvailableWorkoutLogs, type PlanningLog } from "./logs";
import { planAssignmentStatus } from "./planCompletionEvidence";
import { workoutHistory } from "./history";
import { captureDevicePlanningRecovery, planningKeys, planningOwner, planningAccountGeneration, planningRecordVersion, planningSnapshot, readPlanning, writePlanningValues } from "./store";
import { validDateOnly } from "./dates";
import { calendarEntryIdentity, type DashboardCalendarItem } from "@/lib/dashboard-calendar";
import { bookedCalendarItems } from "./bookings";
import { validatePlanningImport } from "./importValidation";
import { captureWorkoutLaunchEditor, assertWorkoutLaunchEditor } from "./workoutLaunchEditor";
export type CalendarReflection = {
  difficulty: number | null; energy: number | null;
  soreness: string; painNotes: string; wentWell: string; adjust: string;
};
export const emptyCalendarReflection = (): CalendarReflection => ({ difficulty: null, energy: null, soreness: "", painNotes: "", wentWell: "", adjust: "" });
/** A schedule duration is never evidence of elapsed workout time. */
export function calendarDurationLabel(item: { assignmentId?: string; status: string; duration: number }, logs: PlanningLog[] = readAvailableWorkoutLogs(), now = new Date()) {
  if (!item.assignmentId) return `${item.duration} min planned`;
  if (item.status !== "Completed") return "Duration not set";
  const matches = logs.filter(log => log.assignmentId === item.assignmentId);
  const minutes = matches.length === 1 ? workoutHistory(matches, now)[0]?.durationMinutes : null;
  return minutes == null ? "Duration not recorded" : `${minutes} min recorded`;
}
function assertCalendarReflection(value: unknown) {
  if (value === undefined) return;
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Review the event reflection before saving. Original events are preserved.");
  const reflection = value as Record<string, unknown>;
  for (const field of ["difficulty", "energy"]) {
    const rating = reflection[field];
    if (rating != null && (!Number.isInteger(rating) || Number(rating) < 1 || Number(rating) > 10)) throw new Error("Choose a reflection rating from 1–10 or Not reported.");
  }
  for (const field of ["soreness", "painNotes", "wentWell", "adjust"]) {
    if (reflection[field] !== undefined && typeof reflection[field] !== "string") throw new Error("Reflection notes must be text. Original events are preserved.");
  }
}
/** Preserve answers omitted by a projection; explicit null ratings and empty notes still clear. */
function mergeCalendarEvent<T extends object>(original: unknown, next: T): T {
  const prior = original && typeof original === "object" ? original as Record<string, unknown> : {};
  const changes = next as Record<string, unknown>;
  const merged = { ...prior, ...next };
  if (changes.reflection !== undefined) return { ...merged, reflection: { ...(prior.reflection as Record<string, unknown> | undefined), ...(changes.reflection as Record<string, unknown>) } } as T;
  return prior.reflection !== undefined ? { ...merged, reflection: prior.reflection } as T : merged as T;
}
export type LinkedCalendarItem = {
  id: string; date: string; time: string; title: string; notes: string;
  status: string; planId?: string; planDayId?: string; assignmentId?: string; bookingId?: string;
};
export function captureCalendarEditor() {
  return { account: planningOwner(), generation: planningAccountGeneration(), plans: planningRecordVersion(planningKeys.plans), independent: planningRecordVersion(planningKeys.calendar), personal: planningRecordVersion(planningKeys.dashboardCalendar), bookings: JSON.stringify(bookedCalendarItems()), launch: captureWorkoutLaunchEditor() };
}
export type CalendarEditor = ReturnType<typeof captureCalendarEditor>;
export function assertCalendarEditor(editor: CalendarEditor) {
  const current = captureCalendarEditor();
  if (!editor.account || editor.account !== current.account || editor.generation !== current.generation) throw new Error("Your calendar account changed. Copy your open edits before reloading.");
  if (editor.plans !== current.plans || editor.independent !== current.independent || editor.personal !== current.personal || editor.bookings !== current.bookings) throw new Error("Calendar records changed while you were editing. Copy your open edits, then close and reopen the event to review the latest calendar.");
}
/** Launch the canonical assignment only after checking the calendar the member saw. */
export function startCalendarWorkout(item: LinkedCalendarItem, editor: CalendarEditor) {
  assertCalendarEditor(editor);
  if (item.bookingId || !item.assignmentId || !item.planId || !item.planDayId || item.id !== `plan-assignment:${item.assignmentId}`) throw new Error("Choose a saved workout in My Plan before starting. Website bookings are managed through Sessions & booking.");
  const plan = readWorkoutPlans().find(plan => plan.id === item.planId);
  const day = plan?.days.find(day => day.id === item.planDayId);
  const assignment = day?.assignments.find(assignment => assignment.id === item.assignmentId);
  if (!day || !assignment || day.date !== item.date || assignment.templateTitle !== item.title) throw new Error("This calendar workout changed. Refresh the calendar before starting.");
  const template = resolveUniqueSavedWorkoutTemplate(assignment.templateId);
  if (!template) throw new Error("Saved workout unavailable. Review this assignment in My Plan before starting.");
  assertWorkoutLaunchEditor(editor.launch);
  startPlanWorkout(item.planId, item.planDayId, item.assignmentId, template);
  return `${ROUTES.dashboard.sessionWorkout}?template=${encodeURIComponent(template.id)}`;
}
export function startCalendarEditorWorkout(item: LinkedCalendarItem, saved: LinkedCalendarItem | undefined, editor: CalendarEditor) {
  if (!saved || JSON.stringify(saved) !== JSON.stringify(item)) throw new Error("Save your schedule changes before logging this workout. Your open edits remain here.");
  return startCalendarWorkout(item, editor);
}
export function plannedCalendarItems() {
  return readWorkoutPlans().filter(plan => plan.status !== "archived").flatMap(plan => plan.days.flatMap(day => day.assignments.map(assignment => ({
    id: `plan-assignment:${assignment.id}`, planId: plan.id, planDayId: day.id, assignmentId: assignment.id,
    date: day.date, time: assignment.time || "", title: assignment.templateTitle,
    notes: assignment.notes, linkedPlan: plan.title, linkedWorkout: assignment.templateTitle,
    bodyFocus: day.focus || plan.goal, duration: 45, phase: plan.settings?.phase || "",
    status: planAssignmentStatus(plan.id, day.id, assignment), type: "Strength",
  }))));
}
export function dashboardCalendarType(type: string) {
  return ({ cardio: "Conditioning", "check-in": "Check-In", nutrition: "Nutrition", performance: "Testing/PR", recovery: "Recovery" } as Record<string, string>)[type] || "Strength";
}
function personalDashboardEntries() {
  const entries = readPlanning<DashboardCalendarItem[]>(planningKeys.dashboardCalendar, []);
  const occurrences = new Map<string, number>();
  return (Array.isArray(entries) ? entries : []).filter(entry => entry && typeof entry.title === "string" && typeof entry.type === "string").map(entry => {
    const identity = calendarEntryIdentity(entry);
    const occurrence = occurrences.get(identity) || 0;
    occurrences.set(identity, occurrence + 1);
    return entry.id ? entry : { ...entry, id: `${identity}-${occurrence}` };
  });
}
export function readIndependentCalendar<T>(includeDashboard = true): T[] {
  const stored = readPlanning<T[]>(planningKeys.calendar, []);
  const entries = [...(Array.isArray(stored) ? stored : []), ...bookedCalendarItems()] as T[];
  if (!includeDashboard) return entries;
  const personal = personalDashboardEntries().filter(entry => entry.id && entry.date).map(entry => ({
    ...entry, id: `dashboard-entry:${entry.id}`, type: dashboardCalendarType(entry.type),
    status: /^(done|complete|completed)$/i.test(entry.status || "") || entry.type === "completed" ? "Completed" : entry.status || "Planned", notes: "notes" in entry ? entry.notes : "", time: entry.time || "09:00",
  }));
  return [...entries, ...personal] as T[];
}
function originalCalendarSources() {
  const values = planningSnapshot();
  return Object.fromEntries([planningKeys.plans, planningKeys.calendar, planningKeys.dashboardCalendar].map(key => [key, Object.hasOwn(values, key) ? values[key] : []]));
}
export function requireValidCalendarSources() {
  const values = planningSnapshot();
  const originalPlans = Object.hasOwn(values, planningKeys.plans) ? values[planningKeys.plans] : [];
  const originalIndependent = Object.hasOwn(values, planningKeys.calendar) ? values[planningKeys.calendar] : [];
  const originalPersonal = Object.hasOwn(values, planningKeys.dashboardCalendar) ? values[planningKeys.dashboardCalendar] : [];
  if (!Array.isArray(originalPlans) || validatePlanningImport({ [planningKeys.plans]: originalPlans })) throw new Error("Review the plan's saved dates and assignments before editing the calendar. The original weeks are preserved.");
  if (!Array.isArray(originalIndependent) || validatePlanningImport({ [planningKeys.calendar]: originalIndependent }) || originalIndependent.some(entry => entry.id != null && (typeof entry.id !== "string" || !entry.id.trim())) || !Array.isArray(originalPersonal) || originalPersonal.some(entry => !entry || typeof entry !== "object" || Array.isArray(entry) || typeof entry.title !== "string" || typeof entry.type !== "string" || (entry.id != null && (typeof entry.id !== "string" || !entry.id.trim())))) throw new Error("Personal calendar data needs review before saving. Original events are preserved.");
  if (originalIndependent.some(entry => typeof entry.id !== "string" || !entry.id.trim() || typeof entry.date !== "string" || !validDateOnly(entry.date))) throw new Error("Independent calendar records need review before saving. Original events are preserved; export them before making changes.");
  [...originalIndependent, ...originalPersonal].forEach(entry => assertCalendarReflection(entry.reflection));
  const independentIds = originalIndependent.filter(entry => entry.id != null).map(entry => entry.id);
  if (new Set(independentIds).size !== independentIds.length) throw new Error("Personal calendar identities need review before saving. Original events are preserved.");
  const personal = personalDashboardEntries();
  if (new Set(personal.map(entry => entry.id)).size !== personal.length) throw new Error("Personal calendar identities need review before saving. Original events are preserved.");
  return { originalPlans, originalIndependent, originalPersonal };
}
export function inspectCalendarSources() {
  if (captureDevicePlanningRecovery().blocked) return { issue: "Device planning data needs recovery. Export the preserved originals before making changes. Calendar reporting and editing are paused." };
  try { requireValidCalendarSources(); return { issue: "" }; }
  catch (cause) { return { issue: cause instanceof Error ? cause.message : "Saved calendar sources need review. Original events and plans remain preserved." }; }
}
export const calendarSourcesVersion = () => JSON.stringify({ sources: [planningKeys.plans, planningKeys.calendar, planningKeys.dashboardCalendar].map(key => ({ key, present: Object.hasOwn(planningSnapshot(), key), version: planningRecordVersion(key) })), deviceCache: captureDevicePlanningRecovery() });
export function exportCalendarSources(expected: string, account: string | null, generation: number) {
  if (!account || planningOwner() !== account || planningAccountGeneration() !== generation) throw new Error("Your calendar account changed. Reload the page before exporting.");
  if (calendarSourcesVersion() !== expected) throw new Error("Calendar sources changed. Review the current originals before exporting.");
  return JSON.stringify({ schemaVersion: 1, source: "Sound Fitness calendar recovery", values: originalCalendarSources(), deviceCache: captureDevicePlanningRecovery() }, null, 2);
}
export function saveCalendarItems<T extends LinkedCalendarItem>(items: T[], editor?: CalendarEditor) {
  if (editor) assertCalendarEditor(editor);
  const { originalPersonal, originalIndependent } = requireValidCalendarSources();
  const previous = plannedCalendarItems();
  const plans = readWorkoutPlans();
  const personal = personalDashboardEntries();
  if (new Set(personal.map(entry => entry.id)).size !== personal.length) throw new Error("Personal calendar identities need review before saving. Original events are preserved.");
  const bookings = bookedCalendarItems();
  const byId = new Map(items.map(item => [item.id, item]));
  if (byId.size !== items.length) throw new Error("Calendar entries must have unique IDs.");
  for (const item of items) {
    assertCalendarReflection((item as Record<string, unknown>).reflection);
    const dateOnlyWorkout = item.time === "" && previous.some(old => old.id === item.id && old.assignmentId === item.assignmentId);
    if (!validDateOnly(item.date) || !dateOnlyWorkout && !/^([01]\d|2[0-3]):[0-5]\d$/.test(item.time)) throw new Error("Choose a valid calendar date and time.");
    if (item.id.startsWith("plan-assignment:") || item.assignmentId != null || item.planId != null || item.planDayId != null) {
      const linked = previous.find(old => old.id === item.id);
      if (!linked || item.assignmentId !== linked.assignmentId || item.planId !== linked.planId || item.planDayId !== linked.planDayId) throw new Error("Workout calendar links changed. Reload the calendar; assign workouts through My Plan.");
    }
    if (item.id.startsWith("dashboard-entry:") && !personal.some(entry => `dashboard-entry:${entry.id}` === item.id)) throw new Error("This dashboard event has changed. Reload the calendar before saving.");
    if ((item.id.startsWith("website-booking:") || item.bookingId != null) && !bookings.some(booking => booking.id === item.id && booking.bookingId === item.bookingId)) throw new Error("Website bookings changed. Refresh the calendar before saving.");
  }
  for (const booking of bookings) {
    const next = byId.get(booking.id);
    if (!next || ["date", "time", "title", "notes", "status", "duration", "type"].some(key => (next as Record<string, unknown>)[key] !== (booking as Record<string, unknown>)[key])) throw new Error("Manage booked coaching sessions through Sessions & booking.");
  }
  // Validate all moves before making any change.
  for (const item of previous) {
    const next = byId.get(item.id);
    if (!next) {
      if (assignmentCompleted(item.assignmentId)) throw new Error("Completed workouts remain in history. Archive the plan week instead.");
      continue;
    }
    if (next.status !== item.status) throw new Error("Complete planned workouts in the workout logger. Move or remove a missed assignment instead of changing its status.");
    if (next.title !== item.title) throw new Error("Replace the assigned template in My Plan to change this workout's title.");
    if (next.date !== item.date && !readWorkoutPlans().filter(plan => plan.status !== "archived").flatMap(plan => plan.days).some(day => day.date === next.date && day.kind !== "rest")) throw new Error("Choose a training day in an existing plan week, or create that week in My Plan first.");
    if (assignmentCompleted(item.assignmentId) && (next.date !== item.date || next.time !== item.time || next.notes !== item.notes)) throw new Error("Completed workouts cannot be edited.");
  }
  const now = new Date().toISOString();
  const scheduled = plans.filter(plan => plan.status !== "archived").flatMap(plan => plan.days.flatMap(day => day.assignments.map(assignment => {
    const old = previous.find(item => item.assignmentId === assignment.id)!;
    const next = byId.get(old.id);
    if (!next) return null;
    const changed = next.date !== old.date || next.time !== old.time || next.notes !== old.notes;
    return { date: next.date, assignment: changed ? { ...assignment, time: next.time, notes: next.notes, updatedAt: now } : assignment };
  }))).filter(item => item !== null);
  const updatedPlans = plans.map(plan => {
    if (plan.status === "archived") return plan;
    const days = plan.days.map(day => ({ ...day, assignments: scheduled.filter(item => item.date === day.date).map(item => item.assignment) }));
    return { ...plan, days, updatedAt: JSON.stringify(days) === JSON.stringify(plan.days) ? plan.updatedAt : now };
  });
  const updatedPersonal = personal.flatMap((entry, index) => {
    // Undated legacy records were never offered for deletion by this calendar.
    if (!entry.date) return [originalPersonal[index] as DashboardCalendarItem];
    const next = byId.get(`dashboard-entry:${entry.id}`);
    if (!next) return [];
    const selectedType = "type" in next ? String(next.type) : dashboardCalendarType(entry.type);
    let category = selectedType === dashboardCalendarType(entry.type) ? entry.type : ({ Nutrition: "nutrition", "Check-In": "check-in", Conditioning: "cardio", "Testing/PR": "performance", Recovery: "recovery", Mobility: "recovery" } as Record<string, DashboardCalendarItem["type"]>)[selectedType] || "workout";
    if (category === "completed" && next.status !== "Completed") category = "workout";
    return [{ ...mergeCalendarEvent(entry, next), id: entry.id, type: category }];
  });
  if (validatePlanningImport({ [planningKeys.plans]: updatedPlans })) throw new Error("Review the plan's saved dates and assignments before editing the calendar. The original weeks are preserved.");
  writePlanningValues({ [planningKeys.plans]: updatedPlans, [planningKeys.calendar]: items.filter(item => !item.assignmentId && !item.id.startsWith("plan-assignment:") && !item.id.startsWith("dashboard-entry:") && !item.id.startsWith("website-booking:")).map(item => mergeCalendarEvent(originalIndependent.find(entry => entry.id === item.id), item)), [planningKeys.dashboardCalendar]: updatedPersonal });
}
