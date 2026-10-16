import type { LocalExerciseStatEntry } from "@/types";

export type ExerciseSemanticMetadata = Pick<LocalExerciseStatEntry,
  "coreMovementPattern" | "semanticVariationId" | "semanticVariationName" | "generatedTitle" | "selectedModifierIds">;

const fields = ["coreMovementPattern", "semanticVariationId", "semanticVariationName", "generatedTitle"] as const;

/** Validate recorded identity without guessing catalog equivalents or changing original text. */
export function validExerciseSemanticMetadata(value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return fields.every(key => record[key] == null || typeof record[key] === "string")
    && (record.selectedModifierIds == null || Array.isArray(record.selectedModifierIds)
      && record.selectedModifierIds.every(item => typeof item === "string"));
}

/** Only known identity fields belong in results; targets and custom source annotations do not. */
export function exerciseSemanticMetadata(value: unknown): ExerciseSemanticMetadata {
  if (!validExerciseSemanticMetadata(value)) throw new Error("Exercise variation metadata needs review. Original workout data is preserved.");
  const record = value as Record<string, unknown>;
  return {
    ...Object.fromEntries(fields.filter(key => typeof record[key] === "string").map(key => [key, record[key]])),
    ...(Array.isArray(record.selectedModifierIds) ? { selectedModifierIds: [...record.selectedModifierIds] as NonNullable<ExerciseSemanticMetadata["selectedModifierIds"]> } : {}),
  };
}
