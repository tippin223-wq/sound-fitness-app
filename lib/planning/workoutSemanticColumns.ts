import { exerciseSemanticMetadata, type ExerciseSemanticMetadata } from "./exerciseSemanticMetadata";
export const WORKOUT_SEMANTIC_FIELDS = ["coreMovementPattern", "semanticVariationId", "semanticVariationName", "generatedTitle", "selectedModifierIds"] as const;
export const hasWorkoutSemantics = (value: object) => WORKOUT_SEMANTIC_FIELDS.some(field => Object.hasOwn(value, field));
export function workoutSemanticColumns(exercise: unknown): { semantic_metadata?: ExerciseSemanticMetadata } {
  const metadata = exerciseSemanticMetadata(exercise);
  return Object.keys(metadata).length ? { semantic_metadata: metadata } : {};
}
/** Explicit cloud metadata can clear older fields; missing legacy columns cannot. */
export function workoutSemanticOverride(exercise: ExerciseSemanticMetadata): ExerciseSemanticMetadata {
  if (!hasWorkoutSemantics(exercise)) return {};
  const metadata = exerciseSemanticMetadata(exercise);
  return Object.fromEntries(WORKOUT_SEMANTIC_FIELDS.map(field => [field, metadata[field]])) as ExerciseSemanticMetadata;
}
export function workoutSemanticsFromRow(row: { semantic_metadata?: unknown }, explicitClear = false): ExerciseSemanticMetadata {
  if (!Object.hasOwn(row, "semantic_metadata")) return {};
  const metadata = row.semantic_metadata;
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata) || Object.keys(metadata).some(key => !(WORKOUT_SEMANTIC_FIELDS as readonly string[]).includes(key)))
    throw new Error("Cloud exercise variation metadata needs review. Saved originals are preserved.");
  const known = exerciseSemanticMetadata(metadata);
  if (!Object.keys(known).length && !explicitClear) return {};
  return Object.fromEntries(WORKOUT_SEMANTIC_FIELDS.map(field => [field, known[field]])) as ExerciseSemanticMetadata;
}
