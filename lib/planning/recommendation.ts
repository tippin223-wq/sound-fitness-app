import { normalizeGoals, type GoalState } from "./goals";
import { validDateOnly } from "./dates";
import { goalNumber } from "./goalNumbers";
export type RecommendationProfile = {
  birthday?: string; age?: string; trainingAge?: string; experienceLevel?: string;
  preferredDays?: string[]; sessionLength?: string; availableEquipment?: string[]; equipment?: string[];
  preferredSplits?: string[]; preferredSplit?: string; split?: string;
  bodyStatus?: { painLevel?: number; sorenessLevel?: number; hoursSlept?: string; averageSleepHours?: string };
  injuries?: Array<{ painLevel?: number }>;
};
export type PlanRecommendation = {
  title: string; split: string; phase: string; primaryFocus: string; secondaryFocus: string;
  progression: string; notes: string; sessions: number; age: number | null;
  days: Array<{ day: string; focus: string; notes: string; training: boolean }>;
  reasons: string[];
};
export const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const text = (value: unknown) => typeof value === "string" ? value.trim() : "";
const textList = (value: unknown) => Array.isArray(value) ? [...new Set(value.filter((item): item is string => typeof item === "string").map(item => item.trim()).filter(Boolean))] : [];
/** Current answers take precedence; malformed answers cannot confirm equipment. */
export function profileEquipmentSelectionIssue(profile: { availableEquipment?: unknown; equipment?: unknown }): string | null {
  if (!profile || typeof profile !== "object" || Array.isArray(profile)) return null;
  const selected = profile.availableEquipment ?? profile.equipment;
  return selected != null && (!Array.isArray(selected) || selected.some(item => typeof item !== "string" || !item.trim()))
    ? "Profile equipment answers need review. Confirm equipment in Profile before assigning suggested workouts; original answers are preserved." : null;
}
/** An explicitly cleared current selection must not resurrect legacy equipment. */
export function profileEquipmentPreferences(profile: { availableEquipment?: unknown; equipment?: unknown }): string[] {
  if (!profile || typeof profile !== "object" || Array.isArray(profile)) return [];
  if (profileEquipmentSelectionIssue(profile)) return [];
  if (Array.isArray(profile.availableEquipment) && profile.availableEquipment.length === 0) return [];
  const current = textList(profile.availableEquipment);
  return current.length ? current : textList(profile.equipment);
}
/** An explicit empty selection differs from an unanswered equipment question. */
export function profileEquipmentSelectionReported(profile: { availableEquipment?: unknown; equipment?: unknown }): boolean {
  if (!profile || typeof profile !== "object" || Array.isArray(profile)) return false;
  return profileEquipmentPreferences(profile).length > 0
    || Array.isArray(profile.availableEquipment) && profile.availableEquipment.length === 0
    || profile.availableEquipment == null && Array.isArray(profile.equipment) && profile.equipment.length === 0;
}
/** The current multi-select is authoritative, including an explicitly empty selection. */
export function profileSplitPreferences(profile: { preferredSplits?: unknown; preferredSplit?: unknown; split?: unknown }): string[] {
  const values = Array.isArray(profile.preferredSplits) ? textList(profile.preferredSplits) : [text(profile.preferredSplit) || text(profile.split)].filter(Boolean);
  return values.filter((value, index) => values.findIndex(other => other.toLowerCase() === value.toLowerCase()) === index);
}
const reportedNumber = (value: unknown, max: number) => { const number = goalNumber(value); return number !== null && number >= 0 && number <= max ? number : null; };
/** Only valid positive recorded injury pain qualifies as a readiness flag. */
export function profileHasReportedInjuryPain(value: unknown): boolean {
  return Array.isArray(value) && value.some(item => item && typeof item === "object" && !Array.isArray(item)
    && (reportedNumber(item.painLevel, 10) ?? 0) > 0);
}
/** Unknown or malformed reports stay unknown; explicit zero remains reported. */
export function profileRecoveryReports(value: unknown) {
  const body = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  return {
    pain: reportedNumber(body.painLevel, 10),
    soreness: reportedNumber(body.sorenessLevel, 10),
    sleep: reportedNumber(body.averageSleepHours, 24) ?? reportedNumber(body.hoursSlept, 24),
  };
}
/** Exact Profile choices only; conflicting reports use the earlier experience stage. */
export function profileTrainingExperience(profile: RecommendationProfile) {
  const choices = ["Beginner", "Returning", "Intermediate", "Advanced", "Competitive Athlete"];
  const reports = [profile?.trainingAge, profile?.experienceLevel].map(value => choices.find(choice => choice.toLowerCase() === text(value).toLowerCase())).filter((value): value is string => Boolean(value));
  const distinct = [...new Set(reports)];
  return { level: choices.find(choice => distinct.includes(choice)) ?? null, conflicting: distinct.length > 1 };
}
export function profileAge(profile: RecommendationProfile, today = new Date()): number | null {
  if (!profile || typeof profile !== "object" || Array.isArray(profile)) return null;
  if (profile.birthday) {
    if (typeof profile.birthday !== "string" || !validDateOnly(profile.birthday)) return null;
    const birth = new Date(`${profile.birthday}T00:00:00`);
    if (Number.isNaN(birth.getTime()) || birth > today) return null;
    const years = today.getFullYear() - birth.getFullYear() - (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate()) ? 1 : 0);
    return years > 0 && years <= 120 ? years : null;
  }
  const age = goalNumber(profile.age);
  return age !== null && Number.isInteger(age) && age > 0 && age <= 120 ? age : null;
}
/** Maximize preferred-day coverage before spreading any weekly target cyclically. */
function spreadTrainingDays(preferred: number[], sessions: number, defaults: number[], baseline: number[]) {
  if (!preferred.length) return baseline;
  const candidates: number[][] = [];
  function choose(days: number[], next: number) {
    if (days.length === sessions) { candidates.push(days); return; }
    for (let day = next; day < 7; day++) choose([...days, day], day + 1);
  }
  choose([], 0);
  const preferenceCount = (days: number[]) => days.filter(day => preferred.includes(day)).length;
  const spacing = (days: number[]) => days.reduce((sum, day, index) => sum + ((days[(index + 1) % days.length] - day + 7) % 7 || 7) ** 2, 0);
  const defaultCount = (days: number[]) => days.filter(day => defaults.includes(day)).length;
  return candidates.sort((a, b) => preferenceCount(b) - preferenceCount(a) || spacing(a) - spacing(b) || defaultCount(b) - defaultCount(a) || a.join("").localeCompare(b.join("")))[0];
}
export function recommendPlan(profile: RecommendationProfile, goals: Partial<GoalState>, today = new Date()): PlanRecommendation {
  if (!profile || typeof profile !== "object" || Array.isArray(profile)) profile = {};
  goals = normalizeGoals(goals);
  const age = profileAge(profile, today);
  const ageValue = goalNumber(profile.age);
  const reportedAge = ageValue !== null && Number.isInteger(ageValue) && ageValue > 0 && ageValue <= 120 ? ageValue : null;
  const hasReportedAge = profile.age != null && (typeof profile.age !== "string" || Boolean(profile.age.trim()));
  const hasBirthday = Boolean(profile.birthday);
  const goal = goals.primaryGoal || "General Health";
  const requested = goalNumber(goals.targetWeeklySessions);
  const validSessions = requested !== null && Number.isInteger(requested) && requested >= 1 && requested <= 7;
  const sessions = validSessions ? requested : 3;
  const experienceReport = profileTrainingExperience(profile);
  const experience = experienceReport.level;
  const beginner = experience === "Beginner" || experience === "Returning";
  const { pain, soreness, sleep } = profileRecoveryReports(profile.bodyStatus);
  const lowRecovery = pain !== null && pain >= 4 || soreness !== null && soreness >= 5 || sleep !== null && sleep < 6.5
    || profileHasReportedInjuryPain(profile.injuries);
  let split = sessions >= 4 && experience !== null && !beginner ? "Upper / Lower" : "Full Body";
  if (sessions >= 6 && experience === "Advanced" && (goal === "Build Muscle" || goal === "Strength")) split = "Push / Pull / Legs";
  if (goal === "Mobility" || goal === "Recovery") split = "Strength + Mobility";
  if (lowRecovery) split = "Flexible";
  const primaryFocus = ({ "Build Muscle": "Hypertrophy", Strength: "Strength", "Lose Fat": "Strength", Mobility: "Mobility", Recovery: "Recovery", Conditioning: "Conditioning", Performance: "Power", Maintain: "Full Body", "General Health": "Full Body" })[goal];
  const secondaryFocus = goals.secondaryGoal === "Mobility" || age !== null && age >= 65 ? "Mobility + Balance" : goals.secondaryGoal || "Conditioning";
  const reasons = [goals.planDirections?.length ? `${goal} is your saved primary goal${goals.secondaryGoal ? `, supported by ${goals.secondaryGoal}` : ""}.` : "No supported primary goal is available. This is a General Health preview; save your Goals before creating a plan.", validSessions ? `${sessions} weekly sessions matches your saved availability target.` : "Your weekly session target is unavailable or invalid. This preview uses 3 sessions; save valid Goals before creating a plan.", experience ? `${experience} training experience informs the suggested split; age alone does not limit training frequency.` : "Training experience is unknown. This is a general starting structure; review your experience in Profile before applying it."];
  if (experienceReport.conflicting) reasons.push(`Profile training experience answers differ. This preview uses ${experience}; review both answers before applying the plan.`);
  const splitPreferences = profileSplitPreferences(profile);
  if (!splitPreferences.length) reasons.push("No training split preference is recorded. Review the suggested structure before applying it.");
  else {
    const matchesPreference = splitPreferences.some(preference => preference.toLowerCase() === split.toLowerCase());
    reasons.push(`Your recorded split preferences: ${splitPreferences.join(", ")}. The suggested ${split} structure ${matchesPreference ? "matches one of these preferences" : "differs from these preferences"}. Preferences do not automatically select the structure; review the suggestion before applying it.`);
  }
  if (hasBirthday && age !== null && reportedAge !== null && age !== reportedAge) reasons.push(`Profile age answers differ: birthday gives age ${age}, while the age field reports ${reportedAge}. This preview uses your birthday; review both answers in Profile before applying it.`);
  if (hasReportedAge && reportedAge === null) reasons.push("The age field is invalid. Review it in Profile; it is not used to personalize this preview.");
  if (age === null) reasons.push(hasBirthday ? "Your birthday is invalid or outside the supported age range. This is a general starting structure; review your birthday in Profile before applying it." : hasReportedAge ? "A valid age is unavailable. This is a general starting structure; review your age in Profile before applying it." : "Age is missing. This is a general starting structure; add your birthday or age in Profile to personalize it.");
  else if (age >= 65) reasons.push("At age 65+, include balance practice alongside strength and aerobic activity; the week includes a mobility/balance focus.");
  else if (age < 18) reasons.push("For members under 18, review exercise choices and progression with a coach before applying adult training targets.");
  else reasons.push(`Age ${age}: prioritize goal, experience, and recovery when choosing your training structure.`);
  if (lowRecovery) reasons.push("Reported pain, soreness, sleep, or injury context calls for reviewing session demands; no exercise substitutions or load changes are applied automatically.");
  const equipment = profileEquipmentPreferences(profile);
  const equipmentIssue = profileEquipmentSelectionIssue(profile);
  if (equipmentIssue) reasons.push(equipmentIssue);
  else if (equipment.length) reasons.push(`Available equipment: ${equipment.join(", ")}. Choose matching saved workouts when assigning sessions.`);
  else reasons.push(profileEquipmentSelectionReported(profile)
    ? "No equipment is selected in Profile. Equipment-dependent workouts are excluded from suggestions; confirm bodyweight or no-equipment requirements before assigning workouts."
    : "Equipment availability is unreported. Confirm each workout's equipment before assigning it.");
  const sessionLength = goalNumber(typeof profile.sessionLength === "string" ? profile.sessionLength.trim().replace(/\s*(?:minutes?|mins?)$/i, "") : profile.sessionLength);
  if (sessionLength !== null && Number.isInteger(sessionLength) && sessionLength >= 15 && sessionLength <= 120) reasons.push(`Your session preference is ${sessionLength} minutes. Workout duration has not been estimated; review exercise count, rest and warmup time before assigning workouts.`);
  else reasons.push("A valid session-length preference is unavailable. Review Session Length in Profile; workout duration has not been estimated.");
  const preferred = [...new Set(textList(profile.preferredDays).map(day => weekdays.findIndex(name => name.toLowerCase() === day.toLowerCase() || name.slice(0, 3).toLowerCase() === day.toLowerCase())).filter(index => index >= 0))];
  const defaults: Record<number, number[]> = { 1: [2], 2: [0, 3], 3: [0, 2, 4], 4: [0, 1, 3, 4], 5: [0, 1, 2, 4, 5], 6: [0, 1, 2, 3, 4, 5], 7: [0, 1, 2, 3, 4, 5, 6] };
  const baselineDays = [...preferred, ...defaults[sessions], ...weekdays.map((_, index) => index)].filter((day, index, all) => all.indexOf(day) === index).slice(0, sessions).sort((a,b) => a-b);
  const selected = spreadTrainingDays(preferred, sessions, defaults[sessions], baselineDays);
  if (preferred.length) reasons.push("Suggested training days prioritize your recorded availability, then favor spacing across the week. The order you selected weekdays is not treated as a priority ranking; review the schedule before applying it.");
  const addedDays = selected.filter(day => !preferred.includes(day)).map(day => weekdays[day]);
  const unusedDays = preferred.filter(day => !selected.includes(day)).map(day => weekdays[day]);
  if (!preferred.length) reasons.push(`No valid preferred training days are recorded. Suggested days: ${selected.map(day => weekdays[day]).join(", ")}. Review your availability before applying this structure.`);
  else if (addedDays.length) reasons.push(`Your ${preferred.length} preferred training day${preferred.length === 1 ? " is" : "s are"} included. Suggested additional days: ${addedDays.join(", ")} to reach ${sessions} weekly sessions. Review your availability before applying this structure.`);
  else if (unusedDays.length) reasons.push(`This preview uses ${sessions} of your ${preferred.length} preferred training days. Not selected: ${unusedDays.join(", ")}. Review this subset before applying the structure.`);
  else reasons.push(`Training days match your recorded preferences: ${selected.map(day => weekdays[day]).join(", ")}.`);
  const days = weekdays.map((day, index) => {
    const slot = selected.indexOf(index);
    let focus = split === "Upper / Lower" ? (slot % 2 ? "Lower Body" : "Upper Body") : split === "Push / Pull / Legs" ? ["Push", "Pull", "Legs"][slot % 3] : primaryFocus;
    if (slot >= 3 && (beginner || lowRecovery)) focus = "Mobility / Easy Conditioning";
    if (age !== null && age >= 65 && slot === sessions - 1) focus += " + Balance";
    return { day, training: slot >= 0, focus: slot >= 0 ? focus : "Rest", notes: slot >= 0 ? (goals.secondaryGoal ? `Supporting goal: ${goals.secondaryGoal}. ` : "") + (lowRecovery ? "Review current readiness before selecting workout demand." : "Assign a saved workout and review its planned sets.") : "Recovery day" };
  });
  return { title: `${goal}${goals.secondaryGoal ? " + " + goals.secondaryGoal : ""} · ${split}`, split, phase: experience === null || beginner || lowRecovery ? "Foundation" : "Build", primaryFocus, secondaryFocus,
    progression: "Double Progression", notes: reasons.join(" "), sessions, age, days, reasons };
}
