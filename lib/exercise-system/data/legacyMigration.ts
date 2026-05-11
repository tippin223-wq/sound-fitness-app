import type { ExerciseCatalogItem } from "@/types";
import type {
  ExerciseModifierId,
  ExerciseVariation,
  IntegratedMovement,
  MovementPatternId,
} from "../types";
import { EXERCISE_SYSTEM_VARIATIONS } from "./catalog";
import { normalizeSemanticText } from "../search/semanticSearch";
import { getAllModifierIds, getAllPatternIds } from "../utils/matching";

export type LegacyExerciseSystemMigration = {
  legacyExercise: ExerciseCatalogItem;
  matchedVariation: ExerciseVariation | IntegratedMovement | null;
  inferredPatternIds: MovementPatternId[];
  inferredModifierIds: ExerciseModifierId[];
  confidence: "high" | "medium" | "low";
  notes: string[];
};

const legacyPatternMap: Record<string, MovementPatternId> = {
  squat: "squat",
  hinge: "hinge",
  lunge: "lunge",
  "horizontal push": "chest-press",
  "vertical push": "shoulder-press",
  "horizontal pull": "row",
  "vertical pull": "vertical-pull",
  "anti rotation": "anti-rotation",
  "anti extension": "anti-extension",
  "anti lateral flexion": "anti-lateral-flexion",
  rotation: "rotation",
  carry: "carry",
  jump: "jump",
  conditioning: "integrated-movement",
  mobility: "mobility",
  "power push": "throw",
  "squat to press": "integrated-movement",
};

const legacyEquipmentMap: Record<string, ExerciseModifierId> = {
  bodyweight: "equipment:bodyweight",
  dumbbell: "equipment:dumbbell",
  db: "equipment:dumbbell",
  kettlebell: "equipment:kettlebell",
  kb: "equipment:kettlebell",
  barbell: "equipment:barbell",
  bb: "equipment:barbell",
  "ez bar": "equipment:ez-bar",
  "ez-bar": "equipment:ez-bar",
  "ez curl bar": "equipment:ez-bar",
  "curl bar": "equipment:ez-bar",
  cable: "equipment:cable",
  machine: "equipment:machine",
  band: "equipment:band",
  box: "equipment:box",
  landmine: "equipment:landmine",
  "smith machine": "equipment:smith-machine",
  "medicine ball": "equipment:medicine-ball",
  "med ball": "equipment:medicine-ball",
  "slam ball": "equipment:slam-ball",
  "dead ball": "equipment:slam-ball",
  plate: "equipment:weight-plate",
  "weight plate": "equipment:weight-plate",
  "olympic plate": "equipment:weight-plate",
  "iron plate": "equipment:weight-plate",
  "bumper plate": "equipment:weight-plate",
  sandbag: "equipment:sandbag",
  "sand bag": "equipment:sandbag",
  "safety bar": "equipment:safety-bar",
  "safety squat bar": "equipment:safety-bar",
  ssb: "equipment:safety-bar",
  "trap bar": "equipment:trap-bar",
  sled: "equipment:sled",
  "pull up bar": "equipment:pull-up-bar",
  "pull-up bar": "equipment:pull-up-bar",
  trx: "equipment:trx",
  suspension: "equipment:trx",
  "suspension trainer": "equipment:trx",
  "suspension training": "equipment:trx",
  slider: "equipment:sliders",
  sliders: "equipment:sliders",
  glider: "equipment:sliders",
  gliders: "equipment:sliders",
  "furniture slider": "equipment:sliders",
  "furniture sliders": "equipment:sliders",
  bosu: "stability:bosu",
  "bosu ball": "stability:bosu",
  chaotic: "assistanceResistance:chaotic",
  "chaotic load": "assistanceResistance:chaotic",
  chaos: "assistanceResistance:chaotic",
  "oscillating load": "assistanceResistance:chaotic",
  "hanging plates": "assistanceResistance:chaotic",
  "band-suspended weight": "assistanceResistance:chaotic",
  "band suspended weight": "assistanceResistance:chaotic",
  "hanging kettlebells": "assistanceResistance:chaotic",
  "earthquake bar": "assistanceResistance:chaotic",
  chain: "assistanceResistance:chains",
  chains: "assistanceResistance:chains",
  "chain loaded": "assistanceResistance:chains",
  "chain resistance": "assistanceResistance:chains",
  "variable resistance": "assistanceResistance:variable-resistance",
  contralateral: "assistanceResistance:contralateral",
  ipsilateral: "assistanceResistance:ipsilateral",
  "box rom": "rom:rom-limiter",
  "box rom modifier": "rom:rom-limiter",
  "limited rom": "rom:rom-limiter",
  "limited range": "rom:rom-limiter",
  "range limiter": "rom:rom-limiter",
  pins: "rom:rom-limiter",
  "pin press": "rom:rom-limiter",
  blocks: "rom:rom-limiter",
  "block pull": "rom:rom-limiter",
  boards: "rom:rom-limiter",
  "board press": "rom:rom-limiter",
  "rack pull": "rom:rom-limiter",
  "safety bars": "rom:rom-limiter",
};

const findDirectSystemMatch = (exerciseName: string) => {
  const normalizedName = normalizeSemanticText(exerciseName);

  return (
    EXERCISE_SYSTEM_VARIATIONS.find((variation) =>
      [
        variation.displayName,
        variation.id,
        ...(variation.aliases || []),
      ]
        .map(normalizeSemanticText)
        .includes(normalizedName),
    ) || null
  );
};

export const mapLegacyExerciseToExerciseSystem = (
  legacyExercise: ExerciseCatalogItem,
): LegacyExerciseSystemMigration => {
  const matchedVariation = findDirectSystemMatch(legacyExercise.name);
  const normalizedPattern = normalizeSemanticText(legacyExercise.pattern);
  const normalizedEquipment = normalizeSemanticText(legacyExercise.equipment);
  const inferredPatternIds = matchedVariation
    ? getAllPatternIds(matchedVariation)
    : [legacyPatternMap[normalizedPattern]].filter(Boolean);
  const inferredModifierIds = matchedVariation
    ? getAllModifierIds(matchedVariation)
    : [legacyEquipmentMap[normalizedEquipment]].filter(Boolean);
  const notes = [
    matchedVariation
      ? "Direct semantic system match found."
      : "No exact system seed match; using inferred pattern/equipment mapping.",
    inferredModifierIds.some((modifierId) => modifierId.startsWith("stability:"))
      ? "Surface/control item mapped as stability, not equipment."
      : "",
  ].filter(Boolean);

  return {
    legacyExercise,
    matchedVariation,
    inferredPatternIds,
    inferredModifierIds,
    confidence: matchedVariation ? "high" : inferredPatternIds.length ? "medium" : "low",
    notes,
  };
};

export const migrateLegacyExercisesToExerciseSystem = (
  exercises: ExerciseCatalogItem[],
) => exercises.map(mapLegacyExerciseToExerciseSystem);
