import type {
  ExerciseModifierId,
  ExerciseVariation,
  IntegratedMovement,
  MuscleGroup,
  MovementPatternId,
  NestedExerciseFilterGroup,
} from "../types";

const unique = <T,>(items: T[]) => Array.from(new Set(items));

export const getAllPatternIds = (
  variation: ExerciseVariation | IntegratedMovement,
): MovementPatternId[] =>
  unique([
    variation.primaryPatternId,
    ...(variation.secondaryPatternIds || []),
    ...(variation.tertiaryPatternIds || []),
  ]);

export const getAllModifierIds = (
  variation: ExerciseVariation | IntegratedMovement,
): ExerciseModifierId[] =>
  unique([
    ...variation.requiredModifierIds,
    ...(variation.requiredModifierOptions || []).flatMap((option) => option.anyOf),
    ...(variation.optionalModifierIds || []),
  ]);

export const getAllMuscleGroups = (
  variation: ExerciseVariation | IntegratedMovement,
): MuscleGroup[] =>
  unique([
    ...variation.primaryMuscles,
    ...(variation.secondaryMuscles || []),
  ]);

export const matchesModifierFilters = (
  variation: ExerciseVariation | IntegratedMovement,
  modifierIds: ExerciseModifierId[],
  logic: "and" | "or" = "and",
) => {
  if (!modifierIds.length) return true;
  const available = new Set(getAllModifierIds(variation));
  return logic === "and"
    ? modifierIds.every((modifierId) => available.has(modifierId))
    : modifierIds.some((modifierId) => available.has(modifierId));
};

const matchesFilterGroup = (
  variation: ExerciseVariation | IntegratedMovement,
  group: NestedExerciseFilterGroup,
): boolean => {
  const checks: boolean[] = [];
  const patternIds = getAllPatternIds(variation);
  const modifierIds = getAllModifierIds(variation);
  const muscleGroups = getAllMuscleGroups(variation);

  if (group.patternIds?.length) {
    checks.push(group.patternIds.some((patternId) => patternIds.includes(patternId)));
  }

  if (group.modifierIds?.length) {
    checks.push(group.modifierIds.every((modifierId) => modifierIds.includes(modifierId)));
  }

  if (group.muscleGroups?.length) {
    checks.push(group.muscleGroups.some((muscle) => muscleGroups.includes(muscle)));
  }

  if (group.includeIntegrated === false) {
    checks.push(variation.primaryPatternId !== "integrated-movement");
  }

  if (group.groups?.length) {
    checks.push(...group.groups.map((child) => matchesFilterGroup(variation, child)));
  }

  if (!checks.length) return true;
  return group.operator === "and" ? checks.every(Boolean) : checks.some(Boolean);
};

export const filterExerciseVariations = (
  variations: Array<ExerciseVariation | IntegratedMovement>,
  filter: NestedExerciseFilterGroup,
) => variations.filter((variation) => matchesFilterGroup(variation, filter));

export const detectMovementOverlap = (
  left: ExerciseVariation | IntegratedMovement,
  right: ExerciseVariation | IntegratedMovement,
) => {
  const leftPatterns = new Set(getAllPatternIds(left));
  const rightPatterns = new Set(getAllPatternIds(right));
  const sharedPatterns = [...leftPatterns].filter((patternId) =>
    rightPatterns.has(patternId),
  );
  const leftMuscles = new Set(getAllMuscleGroups(left));
  const sharedMuscles = getAllMuscleGroups(right).filter((muscle) =>
    leftMuscles.has(muscle),
  );
  const patternScore = sharedPatterns.length / Math.max(leftPatterns.size, 1);
  const muscleScore = sharedMuscles.length / Math.max(leftMuscles.size, 1);

  return {
    sharedPatterns,
    sharedMuscles,
    score: Number(((patternScore * 0.62 + muscleScore * 0.38) * 100).toFixed(1)),
  };
};

export const detectFatigueOverlap = (
  left: ExerciseVariation | IntegratedMovement,
  right: ExerciseVariation | IntegratedMovement,
) => {
  const movementOverlap = detectMovementOverlap(left, right);
  const sharedModifiers = getAllModifierIds(left).filter((modifierId) =>
    getAllModifierIds(right).includes(modifierId),
  );
  const highFatigueOverlap = sharedModifiers.some((modifierId) =>
    [
      "tempo:explosive",
      "athleticIntent:plyometric",
      "athleticIntent:ballistic",
      "loadPosition:back-loaded",
    ].includes(modifierId),
  );

  return {
    ...movementOverlap,
    sharedModifiers,
    highFatigueOverlap,
    fatigueScore: Math.min(
      100,
      movementOverlap.score + sharedModifiers.length * 4 + (highFatigueOverlap ? 12 : 0),
    ),
  };
};

export const findSubstitutionCandidates = (
  exercise: ExerciseVariation | IntegratedMovement,
  candidates: Array<ExerciseVariation | IntegratedMovement>,
) =>
  candidates
    .filter((candidate) => candidate.id !== exercise.id)
    .map((candidate) => ({
      exercise: candidate,
      overlap: detectMovementOverlap(exercise, candidate),
    }))
    .filter(({ overlap }) => overlap.score >= 38)
    .sort((left, right) => right.overlap.score - left.overlap.score);
