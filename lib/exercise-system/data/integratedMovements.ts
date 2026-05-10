import type {
  ExerciseModifierId,
  IntegratedMovement,
  MovementPatternId,
  MovementPatternReference,
  MuscleGroup,
} from "../types";

const ref = (
  patternId: MovementPatternId,
  role: MovementPatternReference["role"],
  note?: string,
): MovementPatternReference => ({ patternId, role, note });

const integrated = (input: {
  id: string;
  displayName: string;
  primaryPattern: MovementPatternReference;
  secondaryPattern?: MovementPatternReference;
  tertiaryPattern?: MovementPatternReference;
  requiredModifierIds?: ExerciseModifierId[];
  difficultyTier?: IntegratedMovement["difficultyTier"];
  primaryMuscles: MuscleGroup[];
  secondaryMuscles?: MuscleGroup[];
  aliases?: string[];
  semanticTags?: string[];
}): IntegratedMovement => ({
  primaryPatternId: input.primaryPattern.patternId,
  secondaryPatternIds: [
    input.secondaryPattern?.patternId,
    input.tertiaryPattern?.patternId,
  ].filter(Boolean) as MovementPatternId[],
  requiredModifierIds: input.requiredModifierIds || [],
  difficultyTier: input.difficultyTier || "intermediate",
  patternChain: [
    input.primaryPattern,
    input.secondaryPattern,
    input.tertiaryPattern,
  ].filter(Boolean) as MovementPatternReference[],
  ...input,
});

export const INTEGRATED_MOVEMENTS = [
  integrated({
    id: "burpee",
    displayName: "Burpee",
    primaryPattern: ref("squat", "primary", "Squat/stand transition"),
    secondaryPattern: ref("chest-press", "secondary", "Push-up phase"),
    requiredModifierIds: ["athleticIntent:plyometric"],
    primaryMuscles: ["quads", "glutes", "chest"],
    secondaryMuscles: ["triceps", "shoulders", "abs"],
    semanticTags: ["conditioning", "integrated movement"],
  }),
  integrated({
    id: "thruster",
    displayName: "Thruster",
    primaryPattern: ref("squat", "primary"),
    secondaryPattern: ref("shoulder-press", "secondary"),
    requiredModifierIds: ["structure:integrated"],
    primaryMuscles: ["quads", "glutes", "shoulders"],
    secondaryMuscles: ["triceps", "abs"],
    aliases: ["db thruster", "dumbbell thruster"],
  }),
  integrated({
    id: "turkish-get-up",
    displayName: "Turkish Get-Up",
    primaryPattern: ref("integrated-movement", "primary", "Floor transfer"),
    secondaryPattern: ref("lunge", "secondary", "Half-kneeling to stand"),
    requiredModifierIds: ["structure:floor-transfer"],
    difficultyTier: "advanced",
    primaryMuscles: ["shoulders", "abs", "glutes"],
    secondaryMuscles: ["obliques", "quads", "triceps"],
    aliases: ["tgu"],
  }),
  integrated({
    id: "man-maker",
    displayName: "Man Maker",
    primaryPattern: ref("row", "primary"),
    secondaryPattern: ref("chest-press", "secondary"),
    tertiaryPattern: ref("squat", "tertiary"),
    requiredModifierIds: ["structure:complex"],
    difficultyTier: "advanced",
    primaryMuscles: ["upper-back", "chest", "quads"],
    secondaryMuscles: ["shoulders", "triceps", "abs"],
  }),
  integrated({
    id: "devil-press",
    displayName: "Devil Press",
    primaryPattern: ref("hinge", "primary"),
    secondaryPattern: ref("shoulder-press", "secondary"),
    requiredModifierIds: ["tempo:explosive"],
    difficultyTier: "advanced",
    primaryMuscles: ["glutes", "hamstrings", "shoulders"],
    secondaryMuscles: ["triceps", "abs"],
  }),
  integrated({
    id: "clean-to-press",
    displayName: "Clean to Press",
    primaryPattern: ref("hinge", "primary"),
    secondaryPattern: ref("shoulder-press", "secondary"),
    requiredModifierIds: ["tempo:explosive"],
    difficultyTier: "intermediate",
    primaryMuscles: ["glutes", "hamstrings", "shoulders"],
    secondaryMuscles: ["triceps", "abs", "upper-back"],
  }),
  integrated({
    id: "lunge-to-press",
    displayName: "Lunge to Press",
    primaryPattern: ref("lunge", "primary"),
    secondaryPattern: ref("shoulder-press", "secondary"),
    requiredModifierIds: ["structure:integrated"],
    difficultyTier: "intermediate",
    primaryMuscles: ["quads", "glutes", "shoulders"],
    secondaryMuscles: ["triceps", "abs"],
  }),
] satisfies IntegratedMovement[];
