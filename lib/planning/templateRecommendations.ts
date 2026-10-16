import type { LocalWorkoutBuilderTemplate } from "@/lib/localData/workoutBuilderData";
import { profileEquipmentPreferences, profileEquipmentSelectionReported, profileEquipmentSelectionIssue, type RecommendationProfile } from "./recommendation";
import { validatePlanningImport } from "./importValidation";
import { EXERCISE_MODIFIERS } from "../exercise-system/modifiers/modifierCategories";
import { MOVEMENT_PATTERNS } from "../exercise-system/patterns/coreMovementPatterns";
import { MAX_WORKOUT_SESSION_EXERCISES } from "./activeSessionRecovery";

export type TemplateMatch = { template: LocalWorkoutBuilderTemplate; score: number; reasons: string[]; equipmentConfirmed: boolean; focusSupported: boolean };
const equipmentAliases = new Map([
  ["none", "bodyweight"],
  ["dumbbells", "dumbbell"], ["barbells", "barbell"], ["kettlebells", "kettlebell"],
  ["bands", "band"], ["resistanceband", "band"], ["resistancebands", "band"],
  ["machines", "machine"], ["cables", "cable"], ["medball", "medicineball"],
  ["pullup", "pullupbar"], ["suspension", "suspensiontrainer"], ["cardioequipment", "cardio"],
]);
const equipmentName = (value: string) => {
  const name = value.toLowerCase().replace(/[^a-z0-9]/g, "");
  return equipmentAliases.get(name) ?? name;
};
const text = (value: unknown) => typeof value === "string" ? value.trim() : "";
/** Pending offline saves remain usable; unresolved version conflicts require review. */
export function workoutTemplateRecommendationIssue(template: unknown): string | null {
  if (validatePlanningImport({ soundFitnessWorkoutBuilderSavedTemplates: [template] })) return "Saved workout data needs review before it can be recommended.";
  const record = template as LocalWorkoutBuilderTemplate;
  if (record.exercises.length > MAX_WORKOUT_SESSION_EXERCISES) return `Saved workout exceeds the supported ${MAX_WORKOUT_SESSION_EXERCISES}-exercise session limit. Review its size before recommending it.`;
  return record.syncPending && record.syncError?.toLowerCase().includes("sync conflict")
    ? "Resolve this workout's sync conflict before using it in automatic recommendations." : null;
}
/** Count identity evidence before filtering malformed rows; never choose a duplicate by order. */
export function ambiguousWorkoutTemplateIds(templates: unknown): Set<string> {
  const counts = new Map<string, number>();
  if (Array.isArray(templates)) for (const template of templates) {
    const id = template && typeof template === "object" ? text(template.id) : "";
    if (id) counts.set(id, (counts.get(id) || 0) + 1);
  }
  return new Set([...counts].filter(([, count]) => count > 1).map(([id]) => id));
}
const equipmentList = (value: unknown) => Array.isArray(value) ? [...new Set(value.map(item => equipmentName(text(item))).filter(Boolean))] : [];
const searchText = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const matchesTerm = (value: string, term: string) => {
  const words = ` ${searchText(value)} `;
  const target = searchText(term);
  return Boolean(target) && (words.includes(` ${target} `) || words.includes(` ${target}s `));
};
const movementIntentLabels = new Map<string, string>(EXERCISE_MODIFIERS.filter(item => item.categoryId === "movementIntent").map(item => [item.id, item.label]));
const focusTerms: Record<string, string[]> = {
  Strength: ["strength", "squat", "hinge", "push", "pull"],
  Hypertrophy: ["hypertrophy", "muscle", "upper", "lower"],
  "Upper Body": ["upper", "push", "pull", "chest", "back", "shoulder", "arm"],
  "Lower Body": ["lower", "leg", "squat", "hinge", "glute"],
  Push: ["push", "chest", "shoulder", "triceps"], Pull: ["pull", "back", "biceps"],
  Legs: ["leg", "lower", "squat", "hinge", "glute"], Mobility: ["mobility", "stretch"],
  Recovery: ["mobility", "stretch", "recovery"], Conditioning: ["conditioning", "cardio", "aerobic", "endurance"],
  Power: ["power", "performance", "explosive"], "Full Body": ["full body", "upper", "lower", "squat", "hinge", "push", "pull", "chest", "back", "shoulder", "arm", "leg", "glute"],
  Balance: ["balance"],
};

/** Additive focuses require each component; slash-separated focuses offer alternatives. */
function focusEvidenceGroups(focus: string) {
  return focus.split(/\s*(?:\+|&|\band\b)\s*/i).map(component => component.split("/").map(alternative => {
    const name = searchText(alternative).replace(/^easy /, "");
    return Object.entries(focusTerms).find(([key]) => searchText(key) === name)?.[1] || (name ? [name] : []);
  }));
}

function supportsFocusAlternative(terms: string[], exerciseText: string) {
  if (terms.includes("full body")) {
    return matchesTerm(exerciseText, "full body")
      || focusTerms["Upper Body"].some(term => matchesTerm(exerciseText, term))
        && focusTerms["Lower Body"].some(term => matchesTerm(exerciseText, term));
  }
  return terms.some(term => matchesTerm(exerciseText, term));
}

/** Rank existing workouts only; uncertain equipment is never automatically assigned. */
export function rankWorkoutTemplates(templates: LocalWorkoutBuilderTemplate[], profile: RecommendationProfile, focus: string): TemplateMatch[] {
  if (!Array.isArray(templates) || !text(focus)) return [];
  if (!profile || typeof profile !== "object" || Array.isArray(profile)) profile = {};
  focus = focus.trim();
  const available = equipmentList(profileEquipmentPreferences(profile));
  const equipmentReported = profileEquipmentSelectionReported(profile);
  const equipmentIssue = profileEquipmentSelectionIssue(profile);
  const groups = focusEvidenceGroups(focus);
  const terms = [...new Set(groups.flat(2))];
  const ambiguousIds = ambiguousWorkoutTemplateIds(templates);
  return templates.filter(template => !workoutTemplateRecommendationIssue(template) && template && text(template.id) && !ambiguousIds.has(text(template.id)) && text(template.title) && Array.isArray(template.exercises) && template.exercises.length > 0 && template.exercises.every(exercise => exercise && text(exercise.id) && text(exercise.name))).flatMap(template => {
    const evidence = template.exercises.map(exercise => {
      const reported = equipmentName(text(exercise.equipment));
      const selected = (exercise.selectedModifierIds || []).filter(id => id.startsWith("equipment:")).map(id => equipmentName(id.slice("equipment:".length)));
      return { reported, conflict: selected.some(item => !item || item !== reported) };
    });
    const equipmentConflict = evidence.some(item => item.conflict);
    const required = [...new Set(evidence.map(item => item.reported))];
    const missing = required.filter(item => item && item !== "bodyweight" && item !== "none" && !available.includes(item));
    if (equipmentReported && missing.length) return [];
    const movementEvidence = template.exercises.map(exercise => {
      const intents = (exercise.selectedModifierIds || []).filter(id => id.startsWith("movementIntent:"));
      const intentText = intents.map(id => movementIntentLabels.get(id) || "").join(" ");
      const intentConflict = intents.some(id => !movementIntentLabels.has(id));
      const core = text(exercise.coreMovementPattern).toLowerCase();
      if (!core) return { value: [exercise.name, exercise.body, exercise.pattern, exercise.goal, intentText].map(text).join(" "), conflict: intentConflict };
      const resolve = (value: string) => MOVEMENT_PATTERNS.find(pattern => pattern.id === value || pattern.label.toLowerCase() === value);
      const current = resolve(core), legacy = resolve(text(exercise.pattern).toLowerCase());
      return { value: current ? current.label + " " + current.group + " " + intentText : intentText, conflict: intentConflict || !current || Boolean(legacy && legacy.id !== current.id) };
    });
    const focusConflict = movementEvidence.some(item => item.conflict);
    const exerciseText = movementEvidence.map(item => item.value.toLowerCase()).join(" ");
    const titleMatches = terms.filter(term => matchesTerm(template.title, term)).length;
    const movementMatches = terms.filter(term => matchesTerm(exerciseText, term)).length;
    const score = titleMatches * 4 + movementMatches;
    if (!score) return [];
    const equipmentConfirmed = !equipmentIssue && !equipmentConflict && required.every(item => Boolean(item) && (item === "bodyweight" || item === "none" || available.includes(item)));
    const focusSupported = !focusConflict && groups.every(group => group.some(alternative => supportsFocusAlternative(alternative, exerciseText)));
    const focusReason = focusConflict ? "Recorded movement classifications or intent disagree or need review. Review the original exercise details before assigning; this workout will not be auto-assigned." : focusSupported ? `Exercise names or tags support ${focus.toLowerCase()}; review the full workout before training.`
      : movementMatches ? `Exercise evidence covers only part of ${focus.toLowerCase()}. Review its exercises before manually assigning; it will not be auto-assigned.`
      : `Only the workout title matches ${focus.toLowerCase()}. Review its exercises before manually assigning; it will not be auto-assigned.`;
    return [{ template, score, equipmentConfirmed, focusSupported, reasons: [focusReason, equipmentIssue || (equipmentConflict ? "Saved workout equipment and selected variation equipment disagree. Review the original exercise details before assigning; equipment is not confirmed." : equipmentConfirmed ? "Required equipment matches your Profile." : "Confirm equipment before assigning this workout."), "Saved workout duration is unavailable. Review its fit with your session-length preference before training."] }];
  }).sort((a, b) => Number(b.focusSupported) - Number(a.focusSupported) || b.score - a.score || a.template.title.localeCompare(b.template.title) || a.template.id.localeCompare(b.template.id));
}
