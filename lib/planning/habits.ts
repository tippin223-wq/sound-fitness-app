import { captureDevicePlanningRecovery, planningRecordVersion, planningAccountGeneration, planningOwner, planningSnapshot, planningStatus, readPlanning, writePlanning } from "./store";
import { localDate, validDateOnly } from "./dates";
import { validatePlanningImport } from "./importValidation";

export const HABITS_KEY = "soundFitnessHabits";
export const HABIT_DAYS_KEY = "soundFitnessHabitDays";
export type Habit = { id: string; title: string; createdOn: string; archived: boolean };
export type HabitDay = { habitId: string; date: string; done: boolean; updatedAt: string };
const EMPTY_HABITS: Habit[] = []; const EMPTY_DAYS: HabitDay[] = [];
export const readHabits = () => readPlanning<Habit[]>(HABITS_KEY, EMPTY_HABITS);
export const readHabitDays = () => readPlanning<HabitDay[]>(HABIT_DAYS_KEY, EMPTY_DAYS);
function originalHabitRecords() {
  const values = planningSnapshot();
  return { habits: Object.hasOwn(values, HABITS_KEY) ? values[HABITS_KEY] : EMPTY_HABITS, days: Object.hasOwn(values, HABIT_DAYS_KEY) ? values[HABIT_DAYS_KEY] : EMPTY_DAYS };
}
function supportedHabitRecords(records: ReturnType<typeof originalHabitRecords>) {
  return Array.isArray(records.habits) && Array.isArray(records.days) && !validatePlanningImport({ [HABITS_KEY]: records.habits, [HABIT_DAYS_KEY]: records.days });
}
export function requireValidHabitRecords(action = "changing habits") {
  const records = originalHabitRecords();
  if (!supportedHabitRecords(records)) throw new Error(`Review the saved habit collection before ${action}. Original habits and daily answers are preserved.`);
  return { habits: records.habits as Habit[], days: records.days as HabitDay[] };
}
export function inspectHabitRecords() {
  const records = originalHabitRecords();
  const issue = captureDevicePlanningRecovery().blocked ? "Device planning data needs recovery. Export the preserved originals before making changes. Habit summaries are paused." : !supportedHabitRecords(records) ? "Saved habit collection needs review. Export the originals before making changes. Habit summaries are paused; original habits and daily answers are preserved." : "";
  return issue ? { habits: EMPTY_HABITS, days: EMPTY_DAYS, issue } : { habits: records.habits as Habit[], days: records.days as HabitDay[], issue };
}
export const habitRecordsVersion = () => JSON.stringify({ habitsPresent: Object.hasOwn(planningSnapshot(), HABITS_KEY), habits: planningRecordVersion(HABITS_KEY), daysPresent: Object.hasOwn(planningSnapshot(), HABIT_DAYS_KEY), days: planningRecordVersion(HABIT_DAYS_KEY), deviceCache: captureDevicePlanningRecovery() });
export function exportHabitRecords(expected: string, account: string | null, generation: number) {
  verifyOwner(account, generation);
  if (habitRecordsVersion() !== expected) throw new Error("Habits or daily answers changed. Review the current originals before exporting.");
  return JSON.stringify({ schemaVersion: 1, source: "Sound Fitness habit records recovery", ...originalHabitRecords(), deviceCache: captureDevicePlanningRecovery() }, null, 2);
}
export const habitVersion = (id: string) => { const habit = readHabits().find(item => item.id === id); return JSON.stringify(habit && { id: habit.id, title: habit.title, createdOn: habit.createdOn, archived: habit.archived }); };
export const habitDayVersion = (id: string, date: string) => { const day = readHabitDays().find(item => item.habitId === id && item.date === date); return JSON.stringify(day && { habitId: day.habitId, date: day.date, done: day.done, updatedAt: day.updatedAt }); };
function verifyOwner(account: string | null, generation: number) {
  if (!account || planningOwner() !== account || planningAccountGeneration() !== generation) throw new Error("Your account changed. Reload the page before saving habits.");
}
function verifyAccount(account: string | null, generation: number) {
  verifyOwner(account, generation);
  if (planningStatus.startsWith("Sync conflict")) throw new Error("Resolve the account sync conflict above before changing habits.");
}
function verifyCapacity(habits: Habit[]) {
  if (habits.filter(habit => !habit.archived).length >= 20) throw new Error("Keep up to 20 active habits. Archive one before adding or restoring another.");
}
export function addHabit(id: string, title: string, account: string | null, generation: number, now = new Date()) {
  verifyAccount(account, generation);
  const { habits } = requireValidHabitRecords();
  if (typeof id !== "string" || !id.trim() || typeof title !== "string" || !title.trim() || title.trim().length > 80) throw new Error("Enter a habit name of 1–80 characters.");
  const existing = habits.find(habit => habit.id === id);
  if (existing) { if (existing.title !== title.trim()) throw new Error("This habit was already saved with a different name. Reload before adding it again."); return existing; }
  if (habits.some(habit => !habit.archived && habit.title.toLowerCase() === title.trim().toLowerCase())) throw new Error("You already have an active habit with this name.");
  verifyCapacity(habits);
  const habit: Habit = { id, title: title.trim(), createdOn: localDate(now), archived: false };
  writePlanning(HABITS_KEY, [...habits, habit]); return habit;
}
export function renameHabit(id: string, title: string, expected: string | undefined, account: string | null, generation: number) {
  verifyAccount(account, generation);
  const { habits } = requireValidHabitRecords("renaming");
  if (typeof title !== "string" || !title.trim() || title.trim().length > 80) throw new Error("Enter a habit name of 1–80 characters.");
  if (habitVersion(id) !== expected) throw new Error("This habit changed. Review the latest version before renaming it.");
  const habit = habits.find(item => item.id === id);
  if (!habit) throw new Error("This habit no longer exists.");
  const name = title.trim();
  if (!habit.archived && habits.some(item => item.id !== id && !item.archived && item.title.toLowerCase() === name.toLowerCase())) throw new Error("You already have an active habit with this name.");
  if (habit.title === name) return habit;
  const renamed = { ...habit, title: name };
  writePlanning(HABITS_KEY, habits.map(item => item.id === id ? renamed : item));
  return renamed;
}
export function archiveHabit(id: string, archived: boolean, expected: string | undefined, account: string | null, generation: number) {
  verifyAccount(account, generation);
  const { habits } = requireValidHabitRecords();
  if (typeof archived !== "boolean" || habitVersion(id) !== expected) throw new Error("This habit changed. Review the latest version before changing it.");
  const habit = habits.find(item => item.id === id);
  if (!habit) throw new Error("This habit no longer exists.");
  if (!archived && habit.archived) {
    verifyCapacity(habits);
    if (habits.some(item => !item.archived && item.title.toLowerCase() === habit.title.toLowerCase())) throw new Error("An active habit already has this name.");
  }
  writePlanning(HABITS_KEY, habits.map(item => item.id === id ? { ...item, archived } : item));
}
export function markHabitDay(id: string, date: string, done: boolean | null, expectedDay: string | undefined, expectedHabit: string | undefined, account: string | null, generation: number, now = new Date()) {
  verifyAccount(account, generation);
  const { habits, days } = requireValidHabitRecords();
  if (habitVersion(id) !== expectedHabit || habitDayVersion(id, date) !== expectedDay) throw new Error("This habit or daily answer changed. Review the latest answers before saving.");
  const habit = habits.find(item => item.id === id);
  if (!habit || habit.archived) throw new Error("Restore the habit before changing daily answers.");
  if (!validDateOnly(date) || date < habit.createdOn || date > localDate(now)) throw new Error("Choose a real date from when this habit was added through today.");
  if (done !== null && typeof done !== "boolean") throw new Error("Choose Done, Not done, or Not reported.");
  const current = days.find(item => item.habitId === id && item.date === date);
  const remaining = days.filter(item => item.habitId !== id || item.date !== date);
  writePlanning(HABIT_DAYS_KEY, done === null ? remaining : [...remaining, { ...current, habitId: id, date, done, updatedAt: now.toISOString() }]);
}
export function habitHistory(days: HabitDay[], through: string) {
  if (!validDateOnly(through)) throw new Error("Choose a real date.");
  const start = new Date(`${through}T12:00:00`); start.setDate(start.getDate() - 6);
  return days.filter(day => validDateOnly(day.date) && day.date >= localDate(start) && day.date <= through).sort((a, b) => b.date.localeCompare(a.date) || a.habitId.localeCompare(b.habitId));
}
