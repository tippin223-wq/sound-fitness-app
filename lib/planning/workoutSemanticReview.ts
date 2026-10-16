import { EXERCISE_MODIFIERS, MODIFIER_CATEGORIES } from "../exercise-system/modifiers/modifierCategories";
import { validExerciseSemanticMetadata } from "./exerciseSemanticMetadata";
import { workoutRecordedValue } from "./history";

const modifierLabels = new Map<string, string>(EXERCISE_MODIFIERS.map(item => [item.id,
  (MODIFIER_CATEGORIES.find(category => category.id === item.categoryId)?.label || item.categoryId) + ": " + item.label]));

/** Read-only presentation of recorded details; never rebuild or repair exercise identity. */
export function workoutSemanticReview(value: unknown) {
  const details: Array<{ label: string; value: string }> = [];
  if (!value || typeof value !== "object" || Array.isArray(value)) return { details, issue: "" };
  const record = value as Record<string, unknown>;
  for (const [field, label] of [["generatedTitle", "Recorded title"], ["semanticVariationName", "Recorded variation"], ["coreMovementPattern", "Recorded movement"]]) {
    if (record[field] != null && record[field] !== "") details.push({ label, value: workoutRecordedValue(record[field]) });
  }
  let unknownModifiers = false;
  if (record.selectedModifierIds != null) {
    const selected = record.selectedModifierIds;
    const labels = Array.isArray(selected) ? selected.map(id => {
      if (typeof id === "string" && modifierLabels.has(id)) return modifierLabels.get(id)!;
      unknownModifiers = true;
      return "Unrecognized modifier: " + workoutRecordedValue(id);
    }) : null;
    details.push({ label: "Recorded modifiers", value: labels ? labels.length ? workoutRecordedValue(labels.join(" · ")) : "No modifiers recorded" : workoutRecordedValue(selected) });
  }
  const classificationFields = [["equipment", "Recorded equipment"], ["pattern", "Recorded pattern"], ["body", "Recorded body focus"], ["goal", "Recorded exercise goal"]];
  for (const [field, label] of classificationFields) {
    if (record[field] != null && record[field] !== "") details.push({ label, value: workoutRecordedValue(record[field]) });
  }
  const invalidClassification = classificationFields.some(([field]) => record[field] != null && typeof record[field] !== "string");
  const issue = invalidClassification ? "Recorded exercise classifications need review. Original values remain saved and included in JSON exports."
    : !validExerciseSemanticMetadata(record) ? "Recorded variation details need review. Original values remain saved and included in JSON exports."
    : unknownModifiers ? "Some recorded modifiers are not recognized by the current catalog. Original IDs remain saved and included in JSON exports." : "";
  return { details, issue };
}
