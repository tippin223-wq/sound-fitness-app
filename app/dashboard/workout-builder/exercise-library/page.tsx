"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { useRouter } from "next/navigation";
import { loadWorkoutLogEntriesWithFallback } from "@/lib/data/workoutPersistence";
import {
  readWorkoutBuilderSelectedExercises,
  writeWorkoutBuilderSelectedExercises,
} from "@/lib/localData/workoutBuilderData";
import {
  prependExerciseStats,
  readCustomExercises,
  subscribeToLocalWorkoutData,
  writeCustomExercises,
} from "@/lib/localData/workoutData";
import {
  getExerciseCatalogWithLegacyFallback,
  getNormalizedExerciseCatalog,
  type NormalizedExerciseCatalogItem,
} from "@/lib/training/normalizedExerciseCatalog";
import { getCompatibleModifiersForMovement } from "@/lib/training/movementCompatibility";
import {
  CORE_MOVEMENT_BY_ID,
  EXERCISE_MODIFIER_BY_ID,
  EXERCISE_MODIFIER_CATEGORY_BY_ID,
  MOVEMENT_PATTERN_BY_ID,
} from "@/lib/training/movementTaxonomy";
import { createExerciseVariation } from "@/lib/training/movementGeneration";
import { ROUTES } from "@/lib/routes";
import type {
  CoreMovementId,
  ExerciseCatalogItem,
  ExerciseModifier,
  ExerciseModifierCategoryId,
  ExerciseModifierId,
  LocalExerciseStatEntry,
  MovementPatternId,
} from "@/types";

type Exercise = {
  id: string;
  name: string;
  body: string;
  muscles: string;
  pattern: string;
  goal: string;
  equipment: string;
  level: string;
  image?: string;
  cue?: string;
  custom?: boolean;
};

type ExerciseLibraryViewMode = "detail" | "grid";

const viewModeLabels: Record<ExerciseLibraryViewMode, string> = {
  detail: "Detail View",
  grid: "Grid View",
};

const exerciseLibraryDropdownOpenEvent =
  "sound-fitness:exercise-library-dropdown-open";

const announceExerciseLibraryDropdownOpen = (id: string) => {
  window.dispatchEvent(
    new CustomEvent<{ id: string }>(exerciseLibraryDropdownOpenEvent, {
      detail: { id },
    }),
  );
};

const levelSegments = [
  {
    value: "Beginner",
    label: "Beginner",
    tone:
      "border-cyan-200/25 bg-cyan-300/10 text-cyan-100 hover:border-cyan-200/45 hover:bg-cyan-300/18",
    active:
      "border-cyan-200 bg-cyan-300 text-slate-950 shadow-[0_0_28px_rgba(34,211,238,0.28)]",
  },
  {
    value: "Intermediate",
    label: "Intermediate",
    tone:
      "border-emerald-200/25 bg-emerald-300/10 text-emerald-100 hover:border-emerald-200/45 hover:bg-emerald-300/18",
    active:
      "border-emerald-200 bg-emerald-300 text-slate-950 shadow-[0_0_28px_rgba(16,185,129,0.28)]",
  },
  {
    value: "Advanced",
    label: "Advanced",
    tone:
      "border-violet-200/25 bg-violet-300/10 text-violet-100 hover:border-violet-200/45 hover:bg-violet-300/18",
    active:
      "border-violet-200 bg-violet-300 text-slate-950 shadow-[0_0_30px_rgba(167,139,250,0.28)]",
  },
];

const normalizedCatalog = getNormalizedExerciseCatalog();

type FilterMenuOption = {
  value: string;
  label: string;
  group?: string;
  helper?: string;
};

type MovementTypeGroup =
  | "Main Strength"
  | "Upper Body"
  | "Lower Body"
  | "Core"
  | "Accessory / Rehab"
  | "Power / Athletic";

type MovementTypeOption = {
  value: string;
  label: string;
  group: MovementTypeGroup;
  coreMovementIds: CoreMovementId[];
  movementPatternIds: MovementPatternId[];
  count: number;
};

const movementTypeGroupOrder: MovementTypeGroup[] = [
  "Main Strength",
  "Upper Body",
  "Lower Body",
  "Core",
  "Accessory / Rehab",
  "Power / Athletic",
];

const movementTypeDefinitions: Array<
  Omit<MovementTypeOption, "count"> & { helper?: string }
> = [
  {
    value: "strength:chest-press",
    label: "Chest Press",
    group: "Main Strength",
    coreMovementIds: ["chest-press"],
    movementPatternIds: ["horizontal-push"],
  },
  {
    value: "strength:row",
    label: "Row",
    group: "Main Strength",
    coreMovementIds: ["row"],
    movementPatternIds: ["horizontal-pull"],
  },
  {
    value: "strength:squat",
    label: "Squat",
    group: "Main Strength",
    coreMovementIds: ["squat"],
    movementPatternIds: ["squat"],
  },
  {
    value: "strength:hinge",
    label: "Hinge",
    group: "Main Strength",
    coreMovementIds: ["hinge"],
    movementPatternIds: ["hinge"],
  },
  {
    value: "strength:lunge",
    label: "Lunge",
    group: "Main Strength",
    coreMovementIds: ["lunge"],
    movementPatternIds: ["lunge"],
  },
  {
    value: "strength:shoulder-press",
    label: "Shoulder Press",
    group: "Main Strength",
    coreMovementIds: ["shoulder-press"],
    movementPatternIds: ["vertical-push"],
  },
  {
    value: "upper:vertical-pull",
    label: "Pulldown / Pull-Up",
    group: "Upper Body",
    coreMovementIds: ["pulldown", "pull-up"],
    movementPatternIds: ["vertical-pull"],
  },
  {
    value: "upper:biceps-curl",
    label: "Biceps Curl",
    group: "Upper Body",
    coreMovementIds: ["biceps-curl"],
    movementPatternIds: ["elbow-flexion"],
  },
  {
    value: "upper:triceps-extension",
    label: "Triceps Extension",
    group: "Upper Body",
    coreMovementIds: ["triceps-extension"],
    movementPatternIds: ["elbow-extension"],
  },
  {
    value: "upper:lateral-raise",
    label: "Lateral Raise",
    group: "Upper Body",
    coreMovementIds: ["lateral-raise"],
    movementPatternIds: ["shoulder-abduction"],
  },
  {
    value: "upper:rear-delt-raise",
    label: "Rear Delt Raise",
    group: "Upper Body",
    coreMovementIds: ["rear-delt-raise"],
    movementPatternIds: [],
  },
  {
    value: "upper:face-pull",
    label: "Face Pull",
    group: "Upper Body",
    coreMovementIds: ["face-pull"],
    movementPatternIds: [],
  },
  {
    value: "upper:shrug",
    label: "Shrug",
    group: "Upper Body",
    coreMovementIds: ["shrug"],
    movementPatternIds: [],
  },
  {
    value: "lower:knee-extension",
    label: "Knee Extension",
    group: "Lower Body",
    coreMovementIds: ["leg-extension"],
    movementPatternIds: ["knee-extension"],
  },
  {
    value: "lower:knee-flexion",
    label: "Knee Flexion",
    group: "Lower Body",
    coreMovementIds: ["leg-curl"],
    movementPatternIds: ["knee-flexion"],
  },
  {
    value: "lower:hip-extension",
    label: "Hip Extension",
    group: "Lower Body",
    coreMovementIds: ["hip-thrust-glute-bridge"],
    movementPatternIds: ["hip-extension"],
  },
  {
    value: "lower:calf-raise",
    label: "Calf Raise / Plantar Flexion",
    group: "Lower Body",
    coreMovementIds: ["calf-raise"],
    movementPatternIds: ["plantarflexion"],
  },
  {
    value: "lower:tibialis-raise",
    label: "Ankle Dorsiflexion / Tibialis Raise",
    group: "Lower Body",
    coreMovementIds: ["tibialis-raise"],
    movementPatternIds: ["dorsiflexion"],
  },
  {
    value: "lower:step-up",
    label: "Step-Up",
    group: "Lower Body",
    coreMovementIds: ["step-up"],
    movementPatternIds: [],
  },
  {
    value: "lower:step-down",
    label: "Step-Down",
    group: "Lower Body",
    coreMovementIds: ["step-down"],
    movementPatternIds: [],
  },
  {
    value: "lower:split-squat",
    label: "Split Squat",
    group: "Lower Body",
    coreMovementIds: ["split-squat"],
    movementPatternIds: [],
  },
  {
    value: "core:rotation",
    label: "Rotation",
    group: "Core",
    coreMovementIds: ["rotation"],
    movementPatternIds: ["rotation"],
  },
  {
    value: "core:anti-rotation",
    label: "Anti-Rotation",
    group: "Core",
    coreMovementIds: ["anti-rotation"],
    movementPatternIds: ["anti-rotation"],
  },
  {
    value: "core:brace",
    label: "Brace / Plank",
    group: "Core",
    coreMovementIds: ["brace-plank"],
    movementPatternIds: ["brace"],
  },
  {
    value: "core:carry",
    label: "Carry",
    group: "Core",
    coreMovementIds: ["carry"],
    movementPatternIds: ["carry"],
  },
  {
    value: "rehab:hip-abduction",
    label: "Hip Abduction",
    group: "Accessory / Rehab",
    coreMovementIds: ["hip-abduction"],
    movementPatternIds: ["hip-abduction"],
  },
  {
    value: "rehab:hip-adduction",
    label: "Hip Adduction",
    group: "Accessory / Rehab",
    coreMovementIds: ["hip-adduction"],
    movementPatternIds: ["hip-adduction"],
  },
  {
    value: "rehab:hip-external-rotation",
    label: "Hip External Rotation",
    group: "Accessory / Rehab",
    coreMovementIds: [],
    movementPatternIds: ["hip-external-rotation"],
  },
  {
    value: "rehab:hip-internal-rotation",
    label: "Hip Internal Rotation",
    group: "Accessory / Rehab",
    coreMovementIds: [],
    movementPatternIds: ["hip-internal-rotation"],
  },
  {
    value: "rehab:scapular-retraction",
    label: "Scapular Retraction",
    group: "Accessory / Rehab",
    coreMovementIds: [],
    movementPatternIds: ["scapular-retraction"],
  },
  {
    value: "rehab:shoulder-external-rotation",
    label: "Shoulder External Rotation",
    group: "Accessory / Rehab",
    coreMovementIds: [],
    movementPatternIds: ["shoulder-external-rotation"],
  },
  {
    value: "rehab:shoulder-internal-rotation",
    label: "Shoulder Internal Rotation",
    group: "Accessory / Rehab",
    coreMovementIds: [],
    movementPatternIds: ["shoulder-internal-rotation"],
  },
  {
    value: "power:clean-pull",
    label: "Clean Pull",
    group: "Power / Athletic",
    coreMovementIds: ["clean-pull"],
    movementPatternIds: ["olympic-pull-catch"],
  },
  {
    value: "power:high-pull",
    label: "High Pull",
    group: "Power / Athletic",
    coreMovementIds: ["high-pull"],
    movementPatternIds: [],
  },
  {
    value: "power:kettlebell-swing",
    label: "Kettlebell Swing",
    group: "Power / Athletic",
    coreMovementIds: ["kettlebell-swing"],
    movementPatternIds: ["ballistic-hinge"],
  },
  {
    value: "power:kettlebell-clean",
    label: "Kettlebell Clean",
    group: "Power / Athletic",
    coreMovementIds: ["kettlebell-clean"],
    movementPatternIds: [],
  },
  {
    value: "power:kettlebell-snatch",
    label: "Kettlebell Snatch",
    group: "Power / Athletic",
    coreMovementIds: ["kettlebell-snatch"],
    movementPatternIds: [],
  },
  {
    value: "power:turkish-get-up",
    label: "Turkish Get-Up",
    group: "Power / Athletic",
    coreMovementIds: ["turkish-get-up"],
    movementPatternIds: [],
  },
  {
    value: "power:kettlebell-halo",
    label: "Kettlebell Halo",
    group: "Power / Athletic",
    coreMovementIds: ["kettlebell-halo"],
    movementPatternIds: [],
  },
  {
    value: "power:bottoms-up-press",
    label: "Bottoms-Up Press",
    group: "Power / Athletic",
    coreMovementIds: ["bottoms-up-press"],
    movementPatternIds: [],
  },
  {
    value: "power:jump-landing",
    label: "Jump / Landing",
    group: "Power / Athletic",
    coreMovementIds: ["jump-landing"],
    movementPatternIds: ["step-gait-jump"],
  },
  {
    value: "power:medicine-ball-slam",
    label: "Medicine Ball Slam",
    group: "Power / Athletic",
    coreMovementIds: ["medicine-ball-slam"],
    movementPatternIds: ["ballistic-throw-slam"],
  },
  {
    value: "power:burpee",
    label: "Burpee",
    group: "Power / Athletic",
    coreMovementIds: ["burpee"],
    movementPatternIds: ["locomotion-conditioning"],
  },
  {
    value: "power:sled-drive",
    label: "Sled Drive",
    group: "Power / Athletic",
    coreMovementIds: ["sled-drive"],
    movementPatternIds: ["sled-drive"],
  },
];

const movementTypeGroupByCoreMovementId: Partial<
  Record<CoreMovementId, MovementTypeGroup>
> = {
  "chest-press": "Main Strength",
  row: "Main Strength",
  squat: "Main Strength",
  hinge: "Main Strength",
  lunge: "Main Strength",
  "shoulder-press": "Main Strength",
  pulldown: "Upper Body",
  "pull-up": "Upper Body",
  carry: "Core",
  rotation: "Core",
  "anti-rotation": "Core",
  "brace-plank": "Core",
  "leg-extension": "Lower Body",
  "leg-curl": "Lower Body",
  "hip-thrust-glute-bridge": "Lower Body",
  "calf-raise": "Lower Body",
  "tibialis-raise": "Lower Body",
  "hip-abduction": "Accessory / Rehab",
  "hip-adduction": "Accessory / Rehab",
  "biceps-curl": "Upper Body",
  "triceps-extension": "Upper Body",
  "lateral-raise": "Upper Body",
  "rear-delt-raise": "Upper Body",
  "face-pull": "Upper Body",
  shrug: "Upper Body",
  "step-up": "Lower Body",
  "step-down": "Lower Body",
  "split-squat": "Lower Body",
  "clean-pull": "Power / Athletic",
  "high-pull": "Power / Athletic",
  "kettlebell-swing": "Power / Athletic",
  "kettlebell-clean": "Power / Athletic",
  "kettlebell-snatch": "Power / Athletic",
  "turkish-get-up": "Power / Athletic",
  "kettlebell-halo": "Power / Athletic",
  "bottoms-up-press": "Power / Athletic",
  "mobility-flow": "Accessory / Rehab",
  "jump-landing": "Power / Athletic",
  "medicine-ball-slam": "Power / Athletic",
  burpee: "Power / Athletic",
  "sled-drive": "Power / Athletic",
};

const movementTypeGroupByPatternId: Partial<
  Record<MovementPatternId, MovementTypeGroup>
> = {
  "horizontal-push": "Main Strength",
  "horizontal-pull": "Main Strength",
  "vertical-push": "Main Strength",
  "vertical-pull": "Upper Body",
  squat: "Main Strength",
  hinge: "Main Strength",
  lunge: "Main Strength",
  gait: "Core",
  "knee-extension": "Lower Body",
  "knee-flexion": "Lower Body",
  "hip-extension": "Lower Body",
  "hip-abduction": "Accessory / Rehab",
  "hip-adduction": "Accessory / Rehab",
  "hip-external-rotation": "Accessory / Rehab",
  "hip-internal-rotation": "Accessory / Rehab",
  plantarflexion: "Lower Body",
  dorsiflexion: "Lower Body",
  "elbow-flexion": "Upper Body",
  "elbow-extension": "Upper Body",
  "shoulder-abduction": "Upper Body",
  "shoulder-external-rotation": "Accessory / Rehab",
  "shoulder-internal-rotation": "Accessory / Rehab",
  "scapular-retraction": "Accessory / Rehab",
  "scapular-protraction": "Accessory / Rehab",
  "step-gait-jump": "Power / Athletic",
  "ballistic-hinge": "Power / Athletic",
  "ballistic-throw-slam": "Power / Athletic",
  "olympic-pull-catch": "Power / Athletic",
  "mobility-flow": "Accessory / Rehab",
  "locomotion-conditioning": "Power / Athletic",
  "sled-drive": "Power / Athletic",
  rotation: "Core",
  "anti-rotation": "Core",
  carry: "Core",
  brace: "Core",
};

const friendlyMovementPatternLabels: Partial<Record<MovementPatternId, string>> = {
  plantarflexion: "Calf Raise / Plantar Flexion",
  dorsiflexion: "Ankle Dorsiflexion / Tibialis Raise",
  "hip-external-rotation": "Hip External Rotation",
  "hip-internal-rotation": "Hip Internal Rotation",
  "shoulder-external-rotation": "Shoulder External Rotation",
  "shoulder-internal-rotation": "Shoulder Internal Rotation",
};

const movementTypeMatchesItem = (
  option: Pick<MovementTypeOption, "coreMovementIds" | "movementPatternIds">,
  item: NormalizedExerciseCatalogItem,
) =>
  option.coreMovementIds.includes(item.coreMovementId) ||
  option.movementPatternIds.includes(item.movementPatternId);

const countMovementTypeItems = (
  option: Pick<MovementTypeOption, "coreMovementIds" | "movementPatternIds">,
) => {
  const matchedIds = new Set(
    normalizedCatalog.items
      .filter((item) => movementTypeMatchesItem(option, item))
      .map((item) => item.id),
  );

  return matchedIds.size;
};

const createMovementTypeOptions = (): MovementTypeOption[] => {
  const supportedDefinitions = movementTypeDefinitions
    .map((definition) => ({
      ...definition,
      count: countMovementTypeItems(definition),
    }))
    .filter((definition) => definition.count > 0);
  const coveredCoreMovementIds = new Set(
    supportedDefinitions.flatMap((option) => option.coreMovementIds),
  );
  const coveredPatternIds = new Set(
    supportedDefinitions.flatMap((option) => option.movementPatternIds),
  );
  const fallbackCoreOptions = normalizedCatalog.filterOptions.coreMovements
    .filter((option) => !coveredCoreMovementIds.has(option.id))
    .map<MovementTypeOption>((option) => ({
      value: `core:${option.id}`,
      label: CORE_MOVEMENT_BY_ID[option.id]?.label || option.label,
      group:
        movementTypeGroupByCoreMovementId[option.id] || "Accessory / Rehab",
      coreMovementIds: [option.id],
      movementPatternIds: [],
      count: option.count,
    }));
  const fallbackPatternOptions = normalizedCatalog.filterOptions.movementPatterns
    .filter((option) => !coveredPatternIds.has(option.id))
    .map<MovementTypeOption>((option) => ({
      value: `pattern:${option.id}`,
      label:
        friendlyMovementPatternLabels[option.id] ||
        MOVEMENT_PATTERN_BY_ID[option.id]?.label ||
        option.label,
      group: movementTypeGroupByPatternId[option.id] || "Accessory / Rehab",
      coreMovementIds: [],
      movementPatternIds: [option.id],
      count: option.count,
    }));

  return [
    ...supportedDefinitions,
    ...fallbackCoreOptions,
    ...fallbackPatternOptions,
  ].sort((left, right) => {
    const groupDelta =
      movementTypeGroupOrder.indexOf(left.group) -
      movementTypeGroupOrder.indexOf(right.group);

    return groupDelta || left.label.localeCompare(right.label);
  });
};

const movementTypeOptions = createMovementTypeOptions();
const movementTypeOptionByValue = new Map(
  movementTypeOptions.map((option) => [option.value, option]),
);
const movementTypeFilterOptions: FilterMenuOption[] = [
  {
    value: "All",
    label: "All Movement Types",
    group: "All",
    helper: `${movementTypeOptions.length} supported types`,
  },
  ...movementTypeOptions.map((option) => ({
    value: option.value,
    label: option.label,
    group: option.group,
    helper: `${option.count} movement${option.count === 1 ? "" : "s"}`,
  })),
];

// Internal migration marker: system exercises now come from the normalized
// catalog service, converted back to the current Exercise shape for this page.
const normalizedSystemExercises =
  getExerciseCatalogWithLegacyFallback() as Exercise[];

const normalizedMetadataByExerciseId = new Map(
  normalizedCatalog.items.map((item) => [item.legacyExerciseId, item]),
);

const defaultImage =
  "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=900";

type BuilderSelectableExercise = Pick<
  Exercise,
  "id" | "name" | "body" | "pattern" | "goal" | "equipment"
> &
  Partial<Pick<Exercise, "muscles" | "level" | "image" | "cue">>;

const toBuilderCatalogExercise = (
  exercise: BuilderSelectableExercise,
): ExerciseCatalogItem => ({
  id: exercise.id,
  name: exercise.name,
  body: exercise.body,
  muscles: exercise.muscles || "",
  pattern: exercise.pattern,
  goal: exercise.goal,
  equipment: exercise.equipment,
  level: exercise.level || "",
  image: exercise.image || defaultImage,
  cue:
    exercise.cue ||
    "Move with control, own the position, and make every rep count.",
});

const baseGoals = [
  "Strength",
  "Hypertrophy",
  "Stability",
  "Mobility",
  "Recovery",
  "Power",
  "Conditioning",
];

const getUniqueOptions = (items: Exercise[], key: keyof Exercise) => {
  return [
    "All",
    ...Array.from(
      new Set(
        items
          .map((item) => item[key])
          .filter(Boolean)
          .map((value) => String(value)),
      ),
    ).sort(),
  ];
};

const labelize = (value: string) =>
  value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const getModifierLabel = (modifierId: string) =>
  EXERCISE_MODIFIER_BY_ID[modifierId as keyof typeof EXERCISE_MODIFIER_BY_ID]
    ?.label || labelize(modifierId.split(":").pop() || modifierId);

const getModifierCategoryLabel = (categoryId: ExerciseModifierCategoryId) =>
  categoryId === "apparatus"
    ? "Equipment"
    : EXERCISE_MODIFIER_CATEGORY_BY_ID[categoryId]?.label || labelize(categoryId);

const getMetadataForExercise = (exercise: Exercise) =>
  exercise.custom
    ? null
    : normalizedMetadataByExerciseId.get(exercise.id) || null;

const getModifierLabelsByCategory = (
  metadata: NormalizedExerciseCatalogItem | null,
  categoryId: ExerciseModifierCategoryId,
) =>
  (metadata?.modifiersByCategory[categoryId] || [])
    .map(getModifierLabel)
    .filter(Boolean);

const getCompatibleModifierGroups = (
  metadata: NormalizedExerciseCatalogItem | null,
) => {
  if (!metadata) return [];

  const groups = getCompatibleModifiersForMovement(metadata.coreMovementId)
    .reduce<
      Partial<
        Record<
        ExerciseModifierCategoryId,
        {
          categoryId: ExerciseModifierCategoryId;
          label: string;
          displayOrder: number;
          modifiers: ExerciseModifier[];
        }
        >
      >
    >((acc, modifier) => {
      const category = EXERCISE_MODIFIER_CATEGORY_BY_ID[modifier.categoryId];

      if (!acc[modifier.categoryId]) {
        acc[modifier.categoryId] = {
          categoryId: modifier.categoryId,
          label: getModifierCategoryLabel(modifier.categoryId),
          displayOrder: category?.displayOrder || 999,
          modifiers: [],
        };
      }

      const group = acc[modifier.categoryId];
      if (group) group.modifiers.push(modifier);
      return acc;
    }, {});

  return Object.values(groups)
    .filter(Boolean)
    .map((group) => ({
      ...group,
      modifiers: group.modifiers.sort(
        (a, b) => a.displayOrder - b.displayOrder,
      ),
    }))
    .sort((a, b) => a.displayOrder - b.displayOrder);
};

const getModifierCategoryId = (modifierId: string) =>
  EXERCISE_MODIFIER_BY_ID[modifierId as keyof typeof EXERCISE_MODIFIER_BY_ID]
    ?.categoryId || null;

const getSelectedModifiersByCategory = (
  modifierIds: ExerciseModifierId[],
  categoryId: ExerciseModifierCategoryId,
) =>
  modifierIds
    .map((modifierId) => EXERCISE_MODIFIER_BY_ID[modifierId])
    .filter(
      (modifier): modifier is ExerciseModifier =>
        Boolean(modifier) && modifier.categoryId === categoryId,
    );

const getGeneratedVariationName = (
  exercise: Exercise,
  metadata: NormalizedExerciseCatalogItem | null,
  selectedModifierIds: ExerciseModifierId[],
) => {
  if (!metadata) return exercise.name;

  try {
    return createExerciseVariation(
      {
        coreMovementId: metadata.coreMovementId,
        modifierIds: selectedModifierIds,
      },
      { apparatusLabel: "full" },
    ).displayName;
  } catch {
    return metadata.coreMovementLabel;
  }
};

const getSelectedEquipmentLabel = (
  exercise: Exercise,
  metadata: NormalizedExerciseCatalogItem | null,
  selectedModifierIds: ExerciseModifierId[],
) => {
  const selectedApparatus = getSelectedModifiersByCategory(
    selectedModifierIds,
    "apparatus",
  );
  const mappedApparatus = getModifierLabelsByCategory(metadata, "apparatus");

  return (
    selectedApparatus.map((modifier) => modifier.label).join(", ") ||
    mappedApparatus.join(", ") ||
    exercise.equipment
  );
};

const getSelectedGoalLabel = (
  exercise: Exercise,
  selectedModifierIds: ExerciseModifierId[],
) => {
  const selectedIntent = getSelectedModifiersByCategory(
    selectedModifierIds,
    "training-intent",
  );

  return selectedIntent.map((modifier) => modifier.label).join(", ") || exercise.goal;
};

const getStatTime = (stat: LocalExerciseStatEntry) => {
  const time = new Date(stat.date).getTime();
  return Number.isFinite(time) ? time : 0;
};

const parseStatNumber = (value: string | number | undefined) => {
  const parsed = Number.parseFloat(String(value || "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatMetric = (value: number) =>
  value > 0 ? value.toLocaleString(undefined, { maximumFractionDigits: 0 }) : "--";

const getStatVolume = (stat: LocalExerciseStatEntry) =>
  parseStatNumber(stat.weight) *
  parseStatNumber(stat.reps) *
  parseStatNumber(stat.sets);

const getRecentExerciseStats = (
  stats: LocalExerciseStatEntry[],
  exercise: Exercise,
  variationName: string,
) => {
  const normalizedNames = new Set(
    [exercise.name, variationName]
      .filter(Boolean)
      .map((name) => name.trim().toLowerCase()),
  );

  return stats
    .filter((stat) => {
      const statName = stat.exerciseName?.trim().toLowerCase();
      return (
        stat.exerciseId === exercise.id ||
        (statName ? normalizedNames.has(statName) : false)
      );
    })
    .sort((a, b) => getStatTime(b) - getStatTime(a))
    .slice(0, 3);
};

const getFocusedExerciseCards = (exercises: Exercise[]) => {
  const seenCoreMovements = new Set<string>();

  return exercises.filter((exercise) => {
    if (exercise.custom) return true;

    const metadata = getMetadataForExercise(exercise);
    const key = metadata?.coreMovementId || exercise.id;

    if (seenCoreMovements.has(key)) return false;
    seenCoreMovements.add(key);
    return true;
  });
};

const formatCountLabel = (count: number, singular: string, plural?: string) =>
  `${count} ${count === 1 ? singular : plural || `${singular}s`}`;

const createCountedFilterOptions = ({
  allHelper,
  group,
  items,
}: {
  allHelper: string;
  group: string;
  items: Array<{ label: string; count?: number }>;
}): FilterMenuOption[] => [
  {
    value: "All",
    label: "All",
    helper: allHelper,
  },
  ...items.map((option) => ({
    value: option.label,
    label: option.label,
    group,
    helper:
      typeof option.count === "number"
        ? formatCountLabel(option.count, "movement")
        : undefined,
  })),
];

const loadBehaviorFilterOptions = createCountedFilterOptions({
  allHelper: formatCountLabel(
    normalizedCatalog.filterOptions.modifiers.filter((option) =>
      option.id.startsWith("load-behavior:"),
    ).length,
    "behavior",
  ),
  group: "Load Behavior",
  items: normalizedCatalog.filterOptions.modifiers.filter((option) =>
    option.id.startsWith("load-behavior:"),
  ),
});

const levelRank = (level?: string) => {
  const normalized = (level || "").toLowerCase();
  if (normalized.includes("advanced")) return 3;
  if (normalized.includes("intermediate")) return 2;
  if (normalized.includes("beginner")) return 1;
  return 1;
};

type MovementSuggestion = {
  id: string;
  name: string;
  reason: string;
  level: string;
  equipment: string;
};

const dedupeSuggestions = (suggestions: MovementSuggestion[]) => {
  const seen = new Set<string>();

  return suggestions.filter((suggestion) => {
    if (seen.has(suggestion.id)) return false;
    seen.add(suggestion.id);
    return true;
  });
};

const toSuggestion = (
  item: NormalizedExerciseCatalogItem,
  reason: string,
): MovementSuggestion => ({
  id: item.legacyExerciseId,
  name: item.legacyExerciseName,
  reason,
  level: item.legacyExercise.level,
  equipment: item.legacyExercise.equipment,
});

const getMovementSuggestions = (
  exercise: Exercise,
  metadata: NormalizedExerciseCatalogItem | null,
) => {
  const otherItems = normalizedCatalog.items.filter(
    (item) => item.legacyExerciseId !== exercise.id,
  );
  const sameCore = metadata
    ? otherItems.filter(
        (item) => item.coreMovementId === metadata.coreMovementId,
      )
    : [];
  const samePattern = metadata
    ? otherItems.filter(
        (item) => item.movementPatternId === metadata.movementPatternId,
      )
    : otherItems.filter(
        (item) => item.legacyExercise.pattern === exercise.pattern,
      );
  const sameRegionOrEquipment = otherItems.filter(
    (item) =>
      item.legacyExercise.body === exercise.body ||
      item.legacyExercise.equipment === exercise.equipment,
  );
  const substitutions = dedupeSuggestions([
    ...sameCore.map((item) => toSuggestion(item, "Same core movement")),
    ...samePattern.map((item) => toSuggestion(item, "Same movement pattern")),
    ...sameRegionOrEquipment.map((item) =>
      toSuggestion(item, "Same region/equipment"),
    ),
  ]).slice(0, 3);
  const currentRank = levelRank(exercise.level);
  const progressionPool = sameCore.length ? sameCore : samePattern;
  const progressions = progressionPool
    .filter((item) => levelRank(item.legacyExercise.level) > currentRank)
    .map((item) => toSuggestion(item, "Higher skill/load option"))
    .slice(0, 2);
  const regressions = progressionPool
    .filter((item) => levelRank(item.legacyExercise.level) < currentRank)
    .map((item) => toSuggestion(item, "Lower complexity option"))
    .slice(0, 2);

  return { substitutions, progressions, regressions };
};

function ModifierRail({
  label,
  modifiers,
  selectedModifierIds,
  onToggleModifier,
  priority = false,
}: {
  label: string;
  modifiers: ExerciseModifier[];
  selectedModifierIds: ExerciseModifierId[];
  onToggleModifier: (modifier: ExerciseModifier) => void;
  priority?: boolean;
}) {
  return (
    <div className="min-w-0">
      <p
        className={`text-[10px] font-bold uppercase tracking-[0.12em] ${
          priority ? "text-cyan-100/75" : "text-white/40"
        }`}
      >
        {label}
      </p>
      <div className="relative mt-2">
        <div className="pointer-events-none absolute bottom-1 right-0 top-0 z-10 w-8 rounded-r-2xl bg-gradient-to-l from-slate-950/35 via-slate-950/12 to-transparent" />
        <div className="flex snap-x gap-1.5 overflow-x-auto overflow-y-hidden pb-1 pr-7 [-webkit-overflow-scrolling:touch] [scrollbar-color:rgba(34,211,238,0.38)_transparent] [scrollbar-width:thin]">
          {modifiers.map((modifier) => {
            const isSelected = selectedModifierIds.includes(modifier.id);

            return (
              <button
                key={modifier.id}
                type="button"
                onClick={() => onToggleModifier(modifier)}
                className={`min-h-[36px] shrink-0 snap-start whitespace-nowrap rounded-full border px-3 py-1.5 text-[11px] font-black transition ${
                  isSelected
                    ? "border-emerald-300 bg-emerald-300 text-slate-950"
                    : "border-white/10 bg-white/[0.045] text-slate-300 hover:border-cyan-300/40 hover:text-white"
                }`}
              >
                {modifier.shortLabel || modifier.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function GridModifierSelect({
  label,
  value,
  options,
  fallback,
  onChange,
}: {
  label: string;
  value: string;
  options: ExerciseModifier[];
  fallback: string;
  onChange: (modifierId: string) => void;
}) {
  return (
    <DetailVariationSelect
      label={label}
      value={value}
      options={options}
      fallback={fallback}
      onChange={onChange}
      accent={label === "Equipment" ? "cyan" : "emerald"}
      size="grid"
    />
  );
}

function DetailVariationSelect({
  label,
  value,
  options,
  fallback,
  onChange,
  accent = "cyan",
  size = "detail",
  className = "",
}: {
  label: string;
  value: string;
  options: ExerciseModifier[];
  fallback: string;
  onChange: (modifierId: string) => void;
  accent?: "cyan" | "emerald" | "yellow";
  size?: "detail" | "grid";
  className?: string;
}) {
  const dropdownId = useId();
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const isGrid = size === "grid";
  const selectedOption = options.find((option) => option.id === value);
  const displayValue = selectedOption
    ? selectedOption.shortLabel || selectedOption.label
    : fallback;
  const accentClasses = {
    cyan: {
      focus: "focus:border-cyan-200/55 focus:ring-cyan-200/15",
      selected: "border-cyan-200 bg-cyan-300 text-slate-950",
      hover: "hover:border-cyan-200/40 hover:bg-cyan-300/10 hover:text-white",
      glow: "shadow-[0_0_24px_rgba(34,211,238,0.16)]",
    },
    emerald: {
      focus: "focus:border-emerald-200/55 focus:ring-emerald-200/15",
      selected: "border-emerald-200 bg-emerald-300 text-slate-950",
      hover:
        "hover:border-emerald-200/40 hover:bg-emerald-300/10 hover:text-white",
      glow: "shadow-[0_0_24px_rgba(16,185,129,0.16)]",
    },
    yellow: {
      focus: "focus:border-yellow-200/55 focus:ring-yellow-200/15",
      selected: "border-yellow-200 bg-yellow-300 text-slate-950",
      hover: "hover:border-yellow-200/40 hover:bg-yellow-300/10 hover:text-white",
      glow: "shadow-[0_0_24px_rgba(250,204,21,0.14)]",
    },
  };
  const selectModifier = (modifierId: string) => {
    onChange(modifierId);
    setOpen(false);
  };

  useEffect(() => {
    const closeWhenAnotherDropdownOpens = (event: Event) => {
      const detail = (event as CustomEvent<{ id: string }>).detail;
      if (detail?.id !== dropdownId) setOpen(false);
    };
    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target;
      if (
        target instanceof Node &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };

    window.addEventListener(
      exerciseLibraryDropdownOpenEvent,
      closeWhenAnotherDropdownOpens,
    );
    document.addEventListener("pointerdown", closeOnOutsidePointer);

    return () => {
      window.removeEventListener(
        exerciseLibraryDropdownOpenEvent,
        closeWhenAnotherDropdownOpens,
      );
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
    };
  }, [dropdownId]);

  if (!options.length) {
    return (
      <div
        title={fallback}
        className={`flex min-w-0 flex-col justify-between border border-white/10 bg-[linear-gradient(135deg,rgba(2,6,23,0.92),rgba(15,23,42,0.55))] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_8px_30px_rgba(0,0,0,0.45)] backdrop-blur-2xl ${
          isGrid
            ? "min-h-[58px] rounded-xl px-2.5 py-2"
            : "min-h-[74px] rounded-2xl px-3.5 py-3"
        } ${className}`}
      >
        <p
          className={`font-bold uppercase text-white/35 ${
            isGrid
              ? "text-[9px] tracking-[0.1em]"
              : "text-[10px] tracking-[0.12em]"
          }`}
        >
          {label}
        </p>
        <p
          className={`truncate font-extrabold tracking-wide text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.18)] ${
            isGrid
              ? "mt-1 text-xs leading-4"
              : "mt-1 text-sm leading-5"
          }`}
        >
          {fallback}
        </p>
      </div>
    );
  }

  return (
    <div
      ref={dropdownRef}
      onBlur={(event) => {
        const nextTarget = event.relatedTarget;
        if (
          !(nextTarget instanceof Node) ||
          !event.currentTarget.contains(nextTarget)
        ) {
          setOpen(false);
        }
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") setOpen(false);
      }}
      className={`relative z-[1] flex min-w-0 flex-col justify-between border border-white/10 bg-[linear-gradient(135deg,rgba(2,6,23,0.92),rgba(15,23,42,0.55))] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_8px_30px_rgba(0,0,0,0.45)] backdrop-blur-2xl focus-within:z-[150] ${
        isGrid
          ? "min-h-[58px] rounded-xl px-2.5 py-2"
          : "min-h-[74px] rounded-2xl px-3.5 py-3"
      } ${className}`}
    >
      <span
        className={`block font-bold uppercase text-white/35 ${
          isGrid
            ? "text-[9px] tracking-[0.1em]"
            : "text-[10px] tracking-[0.12em]"
        }`}
      >
        {label}
      </span>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        title={displayValue || "Default"}
        onClick={() => {
          if (!open) announceExerciseLibraryDropdownOpen(dropdownId);
          setOpen((prev) => !prev);
        }}
        className={`flex w-full min-w-0 items-center justify-between gap-2 border border-transparent bg-white/[0.025] pl-0 text-left font-extrabold tracking-wide text-white outline-none transition focus:ring-2 ${
          isGrid
            ? "mt-1 min-h-[30px] rounded-lg pr-6 text-xs leading-4"
            : "mt-1 min-h-[36px] rounded-xl pr-8 text-sm leading-5"
        } ${accentClasses[accent].focus}`}
      >
        <span className="min-w-0 truncate">
          {displayValue || "Default"}
        </span>
      </button>
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute flex items-center justify-center rounded-full border border-white/10 bg-white/[0.055] font-black text-cyan-100 transition ${
          isGrid
            ? "bottom-[11px] right-2 h-4 w-4 text-[9px]"
            : "bottom-[17px] right-3 h-5 w-5 text-[10px]"
        } ${
          open ? "rotate-180 border-cyan-200/35 bg-cyan-300/10" : ""
        }`}
      >
        v
      </span>

      {open ? (
        <div
          className={`absolute left-0 z-[160] w-max min-w-full overflow-hidden border border-cyan-100/15 bg-[radial-gradient(circle_at_15%_0%,rgba(34,211,238,0.18),transparent_36%),linear-gradient(135deg,rgba(15,23,42,0.98),rgba(2,6,23,0.96))] p-1.5 shadow-[0_24px_70px_rgba(0,0,0,0.64),inset_0_1px_0_rgba(255,255,255,0.14)] backdrop-blur-2xl ${
            isGrid
              ? "top-[calc(100%+0.35rem)] max-w-[min(18rem,calc(100vw-2rem))] rounded-xl sm:min-w-[13rem]"
              : "top-[calc(100%+0.5rem)] max-w-[min(26rem,calc(100vw-2rem))] rounded-2xl sm:min-w-[16rem]"
          }`}
        >
          <div
            role="listbox"
            aria-label={label}
            className={`overflow-y-auto pr-1 [scrollbar-color:rgba(34,211,238,0.34)_transparent] [scrollbar-width:thin] ${
              isGrid ? "max-h-44" : "max-h-56"
            }`}
          >
            <button
              type="button"
              role="option"
              aria-selected={!value}
              onClick={() => selectModifier("")}
              title="Default"
              className={`mb-1 flex w-full items-center justify-between gap-3 border text-left font-black transition ${
                isGrid
                  ? "min-h-[36px] rounded-lg px-2.5 py-1.5 text-xs"
                  : "min-h-[40px] rounded-xl px-3 py-2 text-sm"
              } ${
                !value
                  ? `${accentClasses[accent].selected} ${accentClasses[accent].glow}`
                  : `border-white/10 bg-white/[0.045] text-slate-300 ${accentClasses[accent].hover}`
              }`}
            >
              <span className="min-w-0 whitespace-normal break-words leading-4">
                Default
              </span>
              {!value ? <span>✓</span> : null}
            </button>

            {options.map((modifier) => {
              const isSelected = modifier.id === value;

              return (
                <button
                  key={modifier.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => selectModifier(modifier.id)}
                  title={modifier.shortLabel || modifier.label}
                  className={`mb-1 flex w-full items-center justify-between gap-3 border text-left font-black transition ${
                    isGrid
                      ? "min-h-[36px] rounded-lg px-2.5 py-1.5 text-xs"
                      : "min-h-[40px] rounded-xl px-3 py-2 text-sm"
                  } ${
                    isSelected
                      ? `${accentClasses[accent].selected} ${accentClasses[accent].glow}`
                      : `border-white/10 bg-white/[0.045] text-slate-300 ${accentClasses[accent].hover}`
                  }`}
                >
                  <span className="min-w-0 whitespace-normal break-words leading-4">
                    {modifier.shortLabel || modifier.label}
                  </span>
                  {isSelected ? <span>✓</span> : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MovementMetadataPanel({
  metadata,
  selectedModifierIds,
  setSelectedModifierIds,
}: {
  metadata: NormalizedExerciseCatalogItem | null;
  selectedModifierIds: ExerciseModifierId[];
  setSelectedModifierIds: Dispatch<SetStateAction<ExerciseModifierId[]>>;
}) {
  const loadBehaviorLabels = getModifierLabelsByCategory(
    metadata,
    "load-behavior",
  );
  const compatibleModifierGroups = getCompatibleModifierGroups(metadata);
  const compatibleModifierCount = compatibleModifierGroups.reduce(
    (count, group) => count + group.modifiers.length,
    0,
  );
  const coverageValue = metadata
    ? compatibleModifierCount > 0
      ? String(compatibleModifierCount)
      : "Core"
    : "--";
  const coverageLabel = metadata
    ? compatibleModifierCount > 0
      ? "compatible options"
      : "mapped movement"
    : "custom movement";
  const coverageNote = metadata
    ? "validated for this movement"
    : "metadata pending";

  const toggleModifier = (modifier: ExerciseModifier) => {
    setSelectedModifierIds((prev) => {
      if (prev.includes(modifier.id)) {
        return prev.filter((modifierId) => modifierId !== modifier.id);
      }

      return [
        ...prev.filter(
          (modifierId) => getModifierCategoryId(modifierId) !== modifier.categoryId,
        ),
        modifier.id,
      ];
    });
  };

  const selectedModifierLabels = selectedModifierIds
    .map(getModifierLabel)
    .filter(Boolean);
  const selectedLoadBehaviorLabels = getSelectedModifiersByCategory(
    selectedModifierIds,
    "load-behavior",
  ).map((modifier) => modifier.label);
  const displayedLoadBehaviorLabels = selectedLoadBehaviorLabels.length
    ? selectedLoadBehaviorLabels
    : loadBehaviorLabels;
  const remainingModifierGroups = compatibleModifierGroups.filter(
    (group) =>
      !["apparatus", "angle-position", "training-intent"].includes(
        group.categoryId,
      ),
  );

  return (
    <div className="mt-3 rounded-2xl border border-cyan-300/15 bg-cyan-400/[0.06] p-3 backdrop-blur-2xl">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-200">
            Movement Intelligence
          </p>
          <p className="mt-0.5 text-[11px] font-semibold text-slate-400">
            Compatible variation controls
          </p>
        </div>
      </div>

      {metadata ? (
        <div className="mt-2.5 space-y-2">
          <div className="flex w-full flex-wrap items-start gap-1.5">
            {(selectedModifierLabels.length
              ? selectedModifierLabels
              : displayedLoadBehaviorLabels.length
                ? displayedLoadBehaviorLabels
                : ["Select compatible modifiers"]
            ).map((label) => (
              <span
                key={label}
                className="inline-flex max-w-full items-center rounded-full border border-violet-300/20 bg-violet-400/10 px-2.5 py-1 text-[10px] font-bold leading-4 text-violet-100"
              >
                <span className="min-w-0 break-words">{label}</span>
              </span>
            ))}
          </div>

          <div className="rounded-2xl border border-cyan-200/25 bg-[linear-gradient(135deg,rgba(34,211,238,0.22),rgba(16,185,129,0.12))] px-3.5 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_12px_34px_rgba(8,145,178,0.16)]">
            <p className="text-[8px] font-black uppercase leading-3 tracking-[0.16em] text-cyan-100/75">
              Variation Coverage
            </p>

            <div className="mt-1.5 flex flex-wrap items-end gap-x-2 gap-y-1">
              <span className="text-3xl font-black leading-none text-white">
                {coverageValue}
              </span>
              <span className="max-w-[150px] pb-0.5 text-[10px] font-black uppercase leading-3 tracking-[0.08em] text-emerald-100/80">
                {coverageLabel}
              </span>
            </div>

            <p className="mt-1 text-[10px] font-semibold leading-4 text-cyan-50/60">
              {coverageNote}
            </p>
          </div>

          {remainingModifierGroups.length ? (
            <details className="group rounded-2xl border border-white/10 bg-slate-950/35">
              <summary className="flex min-h-[42px] cursor-pointer list-none items-center justify-between gap-3 px-4 py-2.5 text-xs font-black uppercase tracking-[0.14em] text-emerald-200">
                <span>Choose Variation Modifiers</span>
                <span
                  aria-hidden="true"
                  className="text-sm text-emerald-100 transition group-open:rotate-180"
                >
                  v
                </span>
              </summary>

              <div className="space-y-3 border-t border-white/10 p-3">
                {remainingModifierGroups.map((group) => (
                  <ModifierRail
                    key={group.categoryId}
                    label={group.label}
                    modifiers={group.modifiers}
                    selectedModifierIds={selectedModifierIds}
                    onToggleModifier={toggleModifier}
                  />
                ))}
              </div>
            </details>
          ) : null}
        </div>
      ) : (
        <p className="mt-3 text-sm leading-5 text-slate-300">
          Custom exercise. Normalized movement metadata can be added later when
          custom exercise sync expands.
        </p>
      )}
    </div>
  );
}

function RecentStatsStrip({
  stats,
  compact = false,
}: {
  stats: LocalExerciseStatEntry[];
  compact?: boolean;
}) {
  const latest = stats[0];
  const bestReps = stats.reduce(
    (best, stat) => Math.max(best, parseStatNumber(stat.reps)),
    0,
  );
  const recentVolume = stats.reduce(
    (total, stat) => total + getStatVolume(stat),
    0,
  );

  if (!latest) {
    return (
      <div
        className={`rounded-2xl border border-emerald-300/12 bg-[linear-gradient(135deg,rgba(16,185,129,0.08),rgba(34,211,238,0.045))] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] ${
          compact ? "mt-2 px-3 py-2.5" : "mt-2.5 px-3.5 py-3"
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-200">
            Recent Stats
          </p>
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/30">
            Empty
          </p>
        </div>
        <p className="mt-1.5 text-xs font-semibold leading-5 text-slate-400">
          No recent stats yet. Log this movement to build history.
        </p>
      </div>
    );
  }

  const cells = [
    {
      label: "Last Load",
      value: latest.weight || "--",
      detail: `${latest.reps || "--"} reps x ${latest.sets || "--"} sets`,
    },
    {
      label: "Best Reps",
      value: formatMetric(bestReps),
      detail: "from recent entries",
    },
    {
      label: "Recent Volume",
      value: formatMetric(recentVolume),
      detail: "last 3 entries",
    },
  ];

  if (compact) {
    return (
      <div className="mt-3 rounded-2xl border border-emerald-300/15 bg-[linear-gradient(135deg,rgba(16,185,129,0.13),rgba(34,211,238,0.06))] px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.10)]">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-200">
            Recent
          </p>
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/35">
            {new Date(latest.date).toLocaleDateString()}
          </p>
        </div>
        <p className="mt-1 break-words text-xs font-black leading-5 text-white">
          {latest.weight || "--"} load / {latest.reps || "--"} reps /{" "}
          {latest.sets || "--"} sets
        </p>
      </div>
    );
  }

  return (
    <div className="mt-2.5 rounded-2xl border border-emerald-300/15 bg-[linear-gradient(135deg,rgba(16,185,129,0.13),rgba(34,211,238,0.06))] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_10px_30px_rgba(16,185,129,0.08)]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-200">
          Recent Stats
        </p>
        <p className="shrink-0 text-[10px] font-bold uppercase tracking-[0.12em] text-white/35">
          {new Date(latest.date).toLocaleDateString()}
        </p>
      </div>

      <div className="mt-2.5 grid grid-cols-3 gap-1.5">
        {cells.map((cell) => (
          <div
            key={cell.label}
            className="min-w-0 rounded-xl border border-white/10 bg-slate-950/35 px-2 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
          >
            <p className="break-words text-[8px] font-black uppercase leading-[11px] tracking-[0.06em] text-white/35">
              {cell.label}
            </p>
            <p className="mt-1 break-words text-sm font-black leading-4 text-white">
              {cell.value}
            </p>
            <p className="mt-0.5 break-words text-[9px] font-semibold leading-3 text-slate-400">
              {cell.detail}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function MovementSuggestionList({
  title,
  suggestions,
  empty,
}: {
  title: string;
  suggestions: MovementSuggestion[];
  empty: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/45">
        {title}
      </p>

      {suggestions.length ? (
        <div className="mt-2 space-y-2">
          {suggestions.map((suggestion) => (
            <div
              key={`${title}-${suggestion.id}`}
              className="rounded-xl border border-white/10 bg-white/[0.045] px-3 py-2"
            >
              <p className="text-xs font-black text-white">
                {suggestion.name}
              </p>
              <p className="mt-1 text-[11px] font-bold text-cyan-100/75">
                {suggestion.reason} - {suggestion.equipment}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-xs leading-5 text-slate-400">{empty}</p>
      )}
    </div>
  );
}

function MovementSuggestionsPanel({
  suggestions,
}: {
  suggestions: ReturnType<typeof getMovementSuggestions>;
}) {
  return (
    <details className="group mt-3 rounded-2xl border border-white/10 bg-slate-950/45">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
        <span>
          <span className="block text-[10px] font-black uppercase tracking-[0.16em] text-cyan-200">
            Similar / Substitutions
          </span>
          <span className="mt-1 block text-xs leading-5 text-slate-400">
            Same core movement first. Open for alternatives.
          </span>
        </span>
        <span
          aria-hidden="true"
          className="text-sm font-black text-cyan-100 transition group-open:rotate-180"
        >
          v
        </span>
      </summary>

      <div className="border-t border-white/10 p-3">
        <MovementSuggestionList
          title="Best Matches"
          suggestions={suggestions.substitutions}
          empty="No close substitutions found yet."
        />
      </div>
    </details>
  );
}

function MovementProgressPanel({
  suggestions,
}: {
  suggestions: ReturnType<typeof getMovementSuggestions>;
}) {
  return (
    <details className="group mt-3 rounded-2xl border border-emerald-300/15 bg-emerald-400/[0.07]">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
        <span>
          <span className="block text-[10px] font-black uppercase tracking-[0.16em] text-emerald-200">
            Progress / Regress
          </span>
          <span className="mt-1 block text-xs leading-5 text-slate-400">
            Early movement intelligence. Open for simpler or harder options.
          </span>
        </span>
        <span
          aria-hidden="true"
          className="text-sm font-black text-emerald-100 transition group-open:rotate-180"
        >
          v
        </span>
      </summary>

      <div className="grid gap-2 border-t border-white/10 p-3">
        <MovementSuggestionList
          title="Progress"
          suggestions={suggestions.progressions}
          empty="No clear progression mapped yet."
        />
        <MovementSuggestionList
          title="Regress"
          suggestions={suggestions.regressions}
          empty="No simpler regression mapped yet."
        />
      </div>
    </details>
  );
}

function ExerciseLibraryCard({
  exercise,
  metadata,
  suggestions,
  planAddToParam,
  savedExerciseStats,
  viewMode,
  onAddToPlan,
  onDeleteCustom,
  onAddStats,
}: {
  exercise: Exercise;
  metadata: NormalizedExerciseCatalogItem | null;
  suggestions: ReturnType<typeof getMovementSuggestions>;
  planAddToParam: string;
  savedExerciseStats: LocalExerciseStatEntry[];
  viewMode: ExerciseLibraryViewMode;
  onAddToPlan: (exercise: Exercise) => void;
  onDeleteCustom: (id: string) => void;
  onAddStats: (exercise: Exercise) => void;
}) {
  const [selectedModifierIds, setSelectedModifierIds] = useState<
    ExerciseModifierId[]
  >(() => metadata?.modifierIds || []);
  const variationName = getGeneratedVariationName(
    exercise,
    metadata,
    selectedModifierIds,
  );
  const patternLabel = metadata?.movementPatternLabel || exercise.pattern;
  const equipmentLabel = getSelectedEquipmentLabel(
    exercise,
    metadata,
    selectedModifierIds,
  );
  const goalLabel = getSelectedGoalLabel(exercise, selectedModifierIds);
  const recentStats = getRecentExerciseStats(
    savedExerciseStats,
    exercise,
    variationName,
  );
  const isGridView = viewMode === "grid";
  const latestGridStat = recentStats[0];
  const compatibleModifierGroups = getCompatibleModifierGroups(metadata);
  const gridEquipmentModifierGroup = compatibleModifierGroups.find(
    (group) => group.categoryId === "apparatus",
  );
  const gridAngleModifierGroup = compatibleModifierGroups.find(
    (group) => group.categoryId === "angle-position",
  );
  const goalModifierGroup = compatibleModifierGroups.find(
    (group) => group.categoryId === "training-intent",
  );
  const selectedEquipmentModifierId =
    getSelectedModifiersByCategory(selectedModifierIds, "apparatus").find(
      (modifier) =>
        gridEquipmentModifierGroup?.modifiers.some(
          (option) => option.id === modifier.id,
        ),
    )?.id || "";
  const selectedGoalModifierId =
    getSelectedModifiersByCategory(selectedModifierIds, "training-intent").find(
      (modifier) =>
        goalModifierGroup?.modifiers.some((option) => option.id === modifier.id),
    )?.id || "";
  const selectedAngleModifierId =
    getSelectedModifiersByCategory(selectedModifierIds, "angle-position").find(
      (modifier) =>
        gridAngleModifierGroup?.modifiers.some(
          (option) => option.id === modifier.id,
        ),
    )?.id || "";
  const setModifierForCategory = (
    categoryId: ExerciseModifierCategoryId,
    modifierId: string,
  ) => {
    setSelectedModifierIds((prev) => [
      ...prev.filter((id) => getModifierCategoryId(id) !== categoryId),
      ...(modifierId ? [modifierId as ExerciseModifierId] : []),
    ]);
  };
  const handleAddStats = () =>
    onAddStats({
      ...exercise,
      name: variationName,
      pattern: patternLabel,
      equipment: equipmentLabel,
      goal: goalLabel,
    });
  const actionButtons = (
    <div
      className={`grid grid-cols-1 gap-2 ${
        isGridView ? "mt-3" : "mt-4 sm:grid-cols-2"
      }`}
    >
      {planAddToParam ? (
        <button
          type="button"
          onClick={() => onAddToPlan(exercise)}
          className="min-h-[48px] rounded-2xl border border-cyan-300/25 bg-cyan-400/15 px-4 py-3 text-sm font-black text-cyan-200 transition hover:bg-cyan-400 hover:text-slate-950"
        >
          Add to Plan
        </button>
      ) : null}

      {!exercise.custom ? (
        <a
          href={ROUTES.workoutBuilder.exerciseDemo}
          className="flex min-h-[48px] items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-400/10 px-4 py-3 text-center text-sm font-black text-cyan-300 transition hover:bg-cyan-400 hover:text-slate-950"
        >
          View Demo
        </a>
      ) : null}

      <button
        type="button"
        onClick={handleAddStats}
        className="min-h-[48px] rounded-2xl border border-yellow-300/30 bg-yellow-400/15 px-4 py-3 text-sm font-black text-yellow-300 transition hover:bg-yellow-400 hover:text-slate-950"
      >
        Add Stats
      </button>

      {exercise.custom ? (
        <button
          type="button"
          onClick={() => onDeleteCustom(exercise.id)}
          className="min-h-[48px] rounded-2xl border border-red-300/20 bg-red-400/10 px-4 py-3 text-sm font-black text-red-300 transition hover:bg-red-400 hover:text-white"
        >
          Delete Custom
        </button>
      ) : null}
    </div>
  );
  const movementDetails = (
    <details
      className="group mt-2.5 rounded-2xl border border-cyan-300/15 bg-cyan-400/[0.055] shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_14px_40px_rgba(8,145,178,0.12)] backdrop-blur-2xl"
    >
      <summary className="flex min-h-[48px] cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
        <span className="min-w-0">
          <span className="block text-[10px] font-black uppercase tracking-[0.16em] text-cyan-200">
            Movement Details
          </span>
          <span className="mt-0.5 block text-xs font-semibold text-slate-400">
            Modifiers, substitutions, progressions, and coaching cue
          </span>
        </span>
        <span
          aria-hidden="true"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-cyan-100/15 bg-white/[0.06] text-sm font-black text-cyan-100 transition group-open:rotate-180"
        >
          v
        </span>
      </summary>

      <div className="border-t border-white/10 p-3 [&>div:first-child]:mt-0">
        <MovementMetadataPanel
          metadata={metadata}
          selectedModifierIds={selectedModifierIds}
          setSelectedModifierIds={setSelectedModifierIds}
        />

        <MovementSuggestionsPanel suggestions={suggestions} />

        <MovementProgressPanel suggestions={suggestions} />

        <div className="mt-3 rounded-2xl border border-emerald-300/20 bg-[linear-gradient(135deg,rgba(16,185,129,0.18),rgba(16,185,129,0.05))] p-4 backdrop-blur-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-200/80 drop-shadow-[0_0_8px_rgba(16,185,129,0.35)]">
            Coaching Cue
          </p>

          <p className="mt-2 text-sm leading-5 text-emerald-100/80 drop-shadow-[0_0_10px_rgba(16,185,129,0.25)]">
            {exercise.cue}
          </p>
        </div>
      </div>
    </details>
  );

  if (isGridView) {
    return (
      <article className="group relative z-0 overflow-visible rounded-2xl border border-white/15 bg-[linear-gradient(135deg,rgba(255,255,255,0.12),rgba(255,255,255,0.035))] shadow-[0_16px_46px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,255,255,0.16)] backdrop-blur-2xl backdrop-saturate-150 transition hover:z-20 hover:border-cyan-200/25 hover:bg-[linear-gradient(135deg,rgba(255,255,255,0.16),rgba(255,255,255,0.045))] focus-within:z-40">
        <div className="pointer-events-none absolute inset-0 z-0 rounded-2xl bg-[radial-gradient(circle_at_18%_0%,rgba(255,255,255,0.16),transparent_30%),linear-gradient(120deg,rgba(255,255,255,0.12)_0%,rgba(255,255,255,0.035)_42%,transparent_74%)] opacity-70" />

        <div className="relative z-10 h-20 overflow-hidden rounded-t-2xl bg-slate-950/70">
          <img
            src={exercise.image || defaultImage}
            alt={variationName}
            className="h-full w-full object-cover opacity-78 transition duration-500 group-hover:scale-105 group-hover:opacity-95"
          />
          <div className="absolute bottom-2 left-2 rounded-full border border-cyan-300/20 bg-slate-950/65 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-cyan-200 backdrop-blur-xl">
            {exercise.body}
          </div>
        </div>

        <div className="relative z-10 p-3">
          <h2 className="max-h-10 overflow-hidden text-base font-black leading-tight tracking-wide text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.34)]">
            {variationName}
          </h2>

          <div className="mt-2 grid grid-cols-2 gap-1.5">
            <GridModifierSelect
              label="Equipment"
              value={selectedEquipmentModifierId}
              options={gridEquipmentModifierGroup?.modifiers || []}
              fallback={equipmentLabel}
              onChange={(modifierId) =>
                setModifierForCategory("apparatus", modifierId)
              }
            />

            <GridModifierSelect
              label="Position"
              value={selectedAngleModifierId}
              options={gridAngleModifierGroup?.modifiers || []}
              fallback={patternLabel}
              onChange={(modifierId) =>
                setModifierForCategory("angle-position", modifierId)
              }
            />
          </div>

          <div className="mt-2 rounded-xl border border-cyan-100/15 bg-[linear-gradient(135deg,rgba(34,211,238,0.11),rgba(16,185,129,0.075))] px-2.5 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-xl">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[8px] font-black uppercase tracking-[0.12em] text-cyan-100/70">
                Recent Stats
              </p>
              {latestGridStat ? (
                <p className="text-[8px] font-bold uppercase tracking-[0.1em] text-white/35">
                  {new Date(latestGridStat.date).toLocaleDateString()}
                </p>
              ) : null}
            </div>
            <p className="mt-1 break-words text-[11px] font-black leading-4 text-slate-100">
              {latestGridStat
                ? `${latestGridStat.weight || "--"} load / ${
                    latestGridStat.reps || "--"
                  } reps / ${latestGridStat.sets || "--"} sets`
                : "Log stats to build history"}
            </p>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-1.5">
            {!exercise.custom ? (
              <a
                href={ROUTES.workoutBuilder.exerciseDemo}
                className="flex min-h-[38px] items-center justify-center rounded-xl border border-cyan-300/20 bg-cyan-400/10 px-3 py-2 text-center text-[10px] font-black uppercase tracking-[0.12em] text-cyan-200 transition hover:bg-cyan-400 hover:text-slate-950"
              >
                View Demo
              </a>
            ) : (
              <button
                type="button"
                onClick={() => onDeleteCustom(exercise.id)}
                className="min-h-[38px] rounded-xl border border-red-300/20 bg-red-400/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-red-200 transition hover:bg-red-400 hover:text-white"
              >
                Delete
              </button>
            )}

            <button
              type="button"
              onClick={handleAddStats}
              className="min-h-[38px] rounded-xl border border-yellow-300/30 bg-yellow-400/15 px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-yellow-300 transition hover:bg-yellow-400 hover:text-slate-950"
            >
              Add Stats
            </button>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="group relative overflow-visible rounded-[30px] border border-white/20 bg-[linear-gradient(135deg,rgba(255,255,255,0.13),rgba(255,255,255,0.035))] shadow-[0_24px_80px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.20)] backdrop-blur-2xl backdrop-saturate-150 transition hover:z-20 hover:border-white/30 hover:bg-[linear-gradient(135deg,rgba(255,255,255,0.18),rgba(255,255,255,0.055))] hover:shadow-[0_32px_100px_rgba(0,0,0,0.56),inset_0_1px_0_rgba(255,255,255,0.26)] focus-within:z-30">
      <div className="pointer-events-none absolute inset-0 z-0 rounded-[30px] bg-[radial-gradient(circle_at_20%_0%,rgba(255,255,255,0.18),transparent_34%),linear-gradient(120deg,rgba(255,255,255,0.16)_0%,rgba(255,255,255,0.055)_36%,transparent_68%)] opacity-70" />

      <div
        className={`relative z-10 overflow-hidden rounded-t-[30px] bg-slate-950/60 ${
          isGridView ? "h-32" : "h-44"
        }`}
      >
        <img
          src={exercise.image || defaultImage}
          alt={variationName}
          className="h-full w-full object-cover opacity-80 transition duration-500 group-hover:scale-105 group-hover:opacity-100"
        />
      </div>

      <div className="relative z-10 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-cyan-300">
            {exercise.body}
          </span>

          {metadata?.familyLabel ? (
            <span className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-200">
              {metadata.familyLabel}
            </span>
          ) : null}

          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
            {exercise.level}
          </span>
        </div>

        <h2 className="mt-3.5 text-xl font-extrabold leading-7 tracking-wide text-white drop-shadow-[0_0_14px_rgba(255,255,255,0.42)]">
          {variationName}
        </h2>

        <p className="mt-1.5 text-sm leading-5 text-white/55 drop-shadow-[0_0_8px_rgba(255,255,255,0.18)]">
          {exercise.muscles || exercise.body}
        </p>

        <div className="mt-4 grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
          <DetailVariationSelect
            label="Angle / Position"
            value={selectedAngleModifierId}
            options={gridAngleModifierGroup?.modifiers || []}
            fallback={patternLabel}
            onChange={(modifierId) =>
              setModifierForCategory("angle-position", modifierId)
            }
            accent="cyan"
          />

          <DetailVariationSelect
            label="Equipment"
            value={selectedEquipmentModifierId}
            options={gridEquipmentModifierGroup?.modifiers || []}
            fallback={equipmentLabel}
            onChange={(modifierId) =>
              setModifierForCategory("apparatus", modifierId)
            }
            accent="emerald"
          />

          <DetailVariationSelect
            label="Goal"
            value={selectedGoalModifierId}
            options={goalModifierGroup?.modifiers || []}
            fallback={goalLabel}
            onChange={(modifierId) =>
              setModifierForCategory("training-intent", modifierId)
            }
            accent="yellow"
            className="sm:col-span-2"
          />
        </div>

        <RecentStatsStrip stats={recentStats} />

        {movementDetails}
        {actionButtons}
      </div>
    </article>
  );
}

export default function ExerciseLibraryPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] =
    useState<ExerciseLibraryViewMode>("detail");
  const exercisesPerPage = 12;
  const [bodyFilter, setBodyFilter] = useState("All");
  const [goalFilter, setGoalFilter] = useState("All");
  const [levelFilter, setLevelFilter] = useState("All");
  const [movementTypeFilter, setMovementTypeFilter] = useState("All");
  const [apparatusFilter, setApparatusFilter] = useState("All");
  const [loadBehaviorFilter, setLoadBehaviorFilter] = useState("All");
  const [planAddToParam, setPlanAddToParam] = useState("");

  const [customExercises, setCustomExercises] = useState<Exercise[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [statsExercise, setStatsExercise] = useState<Exercise | null>(null);
  const [statWeight, setStatWeight] = useState("");
  const [statReps, setStatReps] = useState("");
  const [statSets, setStatSets] = useState("");
  const [savedExerciseStats, setSavedExerciseStats] = useState<
    LocalExerciseStatEntry[]
  >([]);

  const [newExercise, setNewExercise] = useState({
    name: "",
    body: "",
    muscles: "",
    pattern: "",
    goal: "Stability",
    equipment: "",
    level: "",
    image: "",
    cue: "",
  });

  useEffect(() => {
    setCustomExercises(readCustomExercises<Exercise>());
  }, []);

  useEffect(() => {
    writeCustomExercises(customExercises);
  }, [customExercises]);

  useEffect(() => {
    let isActive = true;

    const syncStats = async () => {
      const result = await loadWorkoutLogEntriesWithFallback();

      if (!isActive) return;

      setSavedExerciseStats(result.data);
    };

    void syncStats();

    const unsubscribe = subscribeToLocalWorkoutData(() => {
      void syncStats();
    });

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setPlanAddToParam(params.get("addTo") || "");
  }, []);

  const allExercises: Exercise[] = useMemo(() => {
    return [...normalizedSystemExercises, ...customExercises];
  }, [customExercises]);

  const apparatusOptions = useMemo(
    () =>
      createCountedFilterOptions({
        allHelper: formatCountLabel(
          normalizedCatalog.filterOptions.apparatus.length,
          "equipment option",
        ),
        group: "Equipment",
        items: normalizedCatalog.filterOptions.apparatus,
      }),
    [],
  );

  const bodyOptions = useMemo(
    () => getUniqueOptions(allExercises, "body"),
    [allExercises],
  );

  const goalOptions = useMemo(() => {
    const goalCounts = allExercises.reduce<Map<string, number>>(
      (counts, exercise) => {
        if (!exercise.goal) return counts;

        counts.set(exercise.goal, (counts.get(exercise.goal) || 0) + 1);
        return counts;
      },
      new Map(),
    );
    const goals = Array.from(
      new Set([...baseGoals, ...Array.from(goalCounts.keys())]),
    ).sort();

    return createCountedFilterOptions({
      allHelper: formatCountLabel(goals.length, "goal"),
      group: "Goal",
      items: goals.map((goal) => ({
        label: goal,
        count: goalCounts.get(goal) || 0,
      })),
    });
  }, [allExercises]);

  const levelAvailabilityBase = useMemo(() => {
    return allExercises.filter((exercise) => {
      const searchValue = search.toLowerCase();
      const metadata = getMetadataForExercise(exercise);
      const loadBehaviorLabels = getModifierLabelsByCategory(
        metadata,
        "load-behavior",
      );
      const normalizedSearchTokens = metadata
        ? [
            metadata.coreMovementLabel,
            metadata.movementPatternLabel,
            metadata.familyLabel,
            metadata.apparatus || "",
            ...metadata.searchTokens,
            ...metadata.modifierIds.map(getModifierLabel),
          ]
        : [];

      const matchesSearch =
        exercise.name?.toLowerCase().includes(searchValue) ||
        exercise.body?.toLowerCase().includes(searchValue) ||
        exercise.muscles?.toLowerCase().includes(searchValue) ||
        exercise.pattern?.toLowerCase().includes(searchValue) ||
        exercise.goal?.toLowerCase().includes(searchValue) ||
        exercise.equipment?.toLowerCase().includes(searchValue) ||
        exercise.level?.toLowerCase().includes(searchValue) ||
        normalizedSearchTokens.some((token) =>
          token.toLowerCase().includes(searchValue),
        );

      const matchesBody = bodyFilter === "All" || exercise.body === bodyFilter;

      const matchesGoal = goalFilter === "All" || exercise.goal === goalFilter;

      const selectedMovementType =
        movementTypeFilter === "All"
          ? null
          : movementTypeOptionByValue.get(movementTypeFilter) || null;
      const matchesMovementType =
        movementTypeFilter === "All" ||
        Boolean(
          metadata &&
            selectedMovementType &&
            movementTypeMatchesItem(selectedMovementType, metadata),
        );
      const matchesApparatus =
        apparatusFilter === "All" ||
        getModifierLabelsByCategory(metadata, "apparatus").includes(
          apparatusFilter,
        );
      const matchesLoadBehavior =
        loadBehaviorFilter === "All" ||
        loadBehaviorLabels.includes(loadBehaviorFilter);

      return (
        matchesSearch &&
        matchesBody &&
        matchesGoal &&
        matchesMovementType &&
        matchesApparatus &&
        matchesLoadBehavior
      );
    });
  }, [
    allExercises,
    search,
    bodyFilter,
    goalFilter,
    movementTypeFilter,
    apparatusFilter,
    loadBehaviorFilter,
  ]);

  const filtered = useMemo(
    () =>
      levelAvailabilityBase.filter(
        (exercise) => levelFilter === "All" || exercise.level === levelFilter,
      ),
    [levelAvailabilityBase, levelFilter],
  );

  const focusedExercises = useMemo(
    () => getFocusedExerciseCards(filtered),
    [filtered],
  );

  const levelCounts = useMemo(
    () =>
      levelSegments.reduce<Record<string, number>>((counts, segment) => {
        counts[segment.value] = getFocusedExerciseCards(
          levelAvailabilityBase.filter(
            (exercise) => exercise.level === segment.value,
          ),
        ).length;

        return counts;
      }, {}),
    [levelAvailabilityBase],
  );

  const totalPages = Math.ceil(focusedExercises.length / exercisesPerPage);

  const paginatedExercises = useMemo(() => {
    const startIndex = (currentPage - 1) * exercisesPerPage;
    return focusedExercises.slice(startIndex, startIndex + exercisesPerPage);
  }, [focusedExercises, currentPage, exercisesPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    search,
    bodyFilter,
    goalFilter,
    levelFilter,
    movementTypeFilter,
    apparatusFilter,
    loadBehaviorFilter,
  ]);

  const resetFilters = () => {
    setSearch("");
    setBodyFilter("All");
    setGoalFilter("All");
    setLevelFilter("All");
    setMovementTypeFilter("All");
    setApparatusFilter("All");
    setLoadBehaviorFilter("All");
  };

  const addExercise = () => {
    if (!newExercise.name.trim()) return;

    const exercise: Exercise = {
      id: `custom-${Date.now()}`,
      name: newExercise.name.trim(),
      body: newExercise.body.trim() || "General",
      muscles: newExercise.muscles.trim() || "General",
      pattern: newExercise.pattern.trim() || "General",
      goal: newExercise.goal.trim() || "Stability",
      equipment: newExercise.equipment.trim() || "Bodyweight",
      level: newExercise.level.trim() || "Beginner",
      image: newExercise.image.trim() || defaultImage,
      cue:
        newExercise.cue.trim() ||
        "Move with control, own the position, and make every rep count.",
      custom: true,
    };

    setCustomExercises((prev) => [exercise, ...prev]);

    setNewExercise({
      name: "",
      body: "",
      muscles: "",
      pattern: "",
      goal: "Stability",
      equipment: "",
      level: "",
      image: "",
      cue: "",
    });

    setShowAddForm(false);
  };

  const deleteCustomExercise = (id: string) => {
    setCustomExercises((prev) => prev.filter((exercise) => exercise.id !== id));
  };

  const addExerciseToBuilder = (exercise: Exercise) => {
    const existingExercises = readWorkoutBuilderSelectedExercises();
    const alreadySelected = existingExercises.some(
      (selectedExercise) => selectedExercise.name === exercise.name,
    );

    if (alreadySelected) {
      return false;
    }

    writeWorkoutBuilderSelectedExercises([
      ...existingExercises.map(toBuilderCatalogExercise),
      toBuilderCatalogExercise(exercise),
    ]);
    return true;
  };

  const addExerciseToPlanBuilder = (exercise: Exercise) => {
    addExerciseToBuilder(exercise);

    if (!planAddToParam) return;

    router.push(
      `${ROUTES.workoutBuilder.home}?addTo=${encodeURIComponent(
        planAddToParam,
      )}`,
    );
  };

  const FilterMenu = ({
    label,
    value,
    options,
    onChange,
    accent = "cyan",
  }: {
    label: string;
    value: string;
    options: Array<string | FilterMenuOption>;
    onChange: (value: string) => void;
    accent?: "cyan" | "emerald" | "blue" | "violet";
  }) => {
    const dropdownId = useId();
    const dropdownRef = useRef<HTMLDivElement | null>(null);
    const [open, setOpen] = useState(false);
    const normalizedOptions: FilterMenuOption[] = options.map((option) =>
      typeof option === "string"
        ? { value: option, label: option }
        : option,
    );
    const selectedOption =
      normalizedOptions.find((option) => option.value === value) ||
      normalizedOptions[0];

    const accentClasses = {
      cyan: "border-cyan-300/30 bg-cyan-400/10 text-cyan-200",
      emerald: "border-emerald-300/30 bg-emerald-400/10 text-emerald-200",
      blue: "border-blue-300/30 bg-blue-400/10 text-blue-200",
      violet: "border-violet-300/30 bg-violet-400/10 text-violet-200",
    };

    useEffect(() => {
      const closeWhenAnotherDropdownOpens = (event: Event) => {
        const detail = (event as CustomEvent<{ id: string }>).detail;
        if (detail?.id !== dropdownId) setOpen(false);
      };
      const closeOnOutsidePointer = (event: PointerEvent) => {
        const target = event.target;
        if (
          target instanceof Node &&
          dropdownRef.current &&
          !dropdownRef.current.contains(target)
        ) {
          setOpen(false);
        }
      };

      window.addEventListener(
        exerciseLibraryDropdownOpenEvent,
        closeWhenAnotherDropdownOpens,
      );
      document.addEventListener("pointerdown", closeOnOutsidePointer);

      return () => {
        window.removeEventListener(
          exerciseLibraryDropdownOpenEvent,
          closeWhenAnotherDropdownOpens,
        );
        document.removeEventListener("pointerdown", closeOnOutsidePointer);
      };
    }, [dropdownId]);

    return (
      <div ref={dropdownRef} className="relative">
        <button
          type="button"
          onClick={() => {
            if (!open) announceExerciseLibraryDropdownOpen(dropdownId);
            setOpen((prev) => !prev);
          }}
          className={`flex min-h-[46px] w-full items-center justify-between rounded-2xl border px-3 py-2.5 text-left shadow-xl transition hover:scale-[1.01] ${accentClasses[accent]}`}
        >
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] opacity-70">
              {label}
            </p>
            <p className="mt-0.5 text-sm font-black text-white">
              {selectedOption?.label || value}
            </p>
            {(selectedOption?.group || selectedOption?.helper) ? (
              <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white/45">
                {[selectedOption.group, selectedOption.helper]
                  .filter(Boolean)
                  .join(" / ")}
              </p>
            ) : null}
          </div>

          <span
            aria-hidden="true"
            className={`relative ml-3 flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-sm font-black text-transparent transition after:absolute after:text-cyan-100 after:content-['v'] ${
              open ? "rotate-180 border-cyan-300/40 text-white" : ""
            }`}
          >
            ↓
          </span>
        </button>

        {open && (
          <div className="absolute left-0 right-0 z-[9999] mt-2 overflow-hidden rounded-[24px] border border-white/10 bg-slate-950/95 p-2 shadow-[0_24px_80px_rgba(0,0,0,0.75)] backdrop-blur-xl">
            <div className="max-h-72 overflow-y-auto pr-1">
              {normalizedOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={`mb-1 flex min-h-[40px] w-full items-center justify-between rounded-2xl px-4 py-2.5 text-left text-sm font-bold transition ${
                    value === option.value
                      ? "bg-cyan-400 text-slate-950"
                      : "text-slate-300 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block">{option.label}</span>
                    {(option.group || option.helper) && (
                      <span
                        className={`mt-0.5 block text-[10px] font-black uppercase tracking-[0.12em] ${
                          value === option.value
                            ? "text-slate-900/65"
                            : "text-white/35"
                        }`}
                      >
                        {[option.group, option.helper]
                          .filter(Boolean)
                          .join(" / ")}
                      </span>
                    )}
                  </span>
                  {value === option.value && <span>✓</span>}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const LevelSegmentedControl = ({
    value,
    onChange,
    counts,
  }: {
    value: string;
    onChange: (value: string) => void;
    counts: Record<string, number>;
  }) => (
    <div
      aria-label="Level"
      className="grid min-h-[46px] grid-cols-3 overflow-hidden rounded-2xl shadow-[0_12px_34px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.10)] backdrop-blur-xl"
    >
        {levelSegments.map((segment, index) => {
          const isActive = value === segment.value;
          const count = counts[segment.value] || 0;
          const radiusClass =
            index === 0
              ? "rounded-l-2xl rounded-r-none"
              : index === levelSegments.length - 1
                ? "rounded-r-2xl rounded-l-none"
                : "rounded-none";

          return (
            <button
              key={segment.value}
              type="button"
              aria-pressed={isActive}
              onClick={() => onChange(isActive ? "All" : segment.value)}
              title={
                isActive
                  ? `Clear level filter (${count} available)`
                  : `Filter ${segment.label} (${count} available)`
              }
              className={`min-w-0 border-y border-l px-1 py-1.5 text-[9px] font-black uppercase leading-3 tracking-[0.04em] transition focus:relative focus:z-10 focus:outline-none focus:ring-2 focus:ring-violet-200/45 sm:px-1.5 sm:text-[10px] ${
                isActive ? segment.active : segment.tone
              } ${radiusClass} ${
                index === levelSegments.length - 1 ? "border-r" : ""
              }`}
            >
              <span className="block truncate">{segment.label}</span>
              <span className="mt-0.5 block truncate text-[8px] font-black leading-3 opacity-70 sm:text-[9px]">
                {count} available
              </span>
            </button>
          );
        })}
    </div>
  );

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.16),_transparent_30%),linear-gradient(180deg,#020617_0%,#0f172a_100%)] text-white">
      <section className="mx-auto w-full max-w-[1240px] space-y-6 px-3 py-6 sm:px-4 sm:py-8">
        <section className="overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_18%_8%,rgba(34,211,238,0.2),transparent_32%),radial-gradient(circle_at_90%_20%,rgba(16,185,129,0.14),transparent_30%),linear-gradient(135deg,rgba(15,23,42,0.96),rgba(2,6,23,0.98))] p-4 shadow-2xl sm:rounded-[42px] sm:p-6 lg:p-8">
          <p className="text-[11px] font-black uppercase tracking-[0.3em] text-cyan-300">
            Exercise Library
          </p>

          <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_320px] lg:items-end">
              <div>
                <h1 className="max-w-3xl text-3xl font-black leading-tight sm:text-4xl lg:text-5xl">
                  Choose the movement first.
                </h1>

                <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300">
                  Start from the core movement pattern, then use compatible
                  modifiers to shape the variation you want to train.
                </p>
              </div>

            <div className="rounded-[28px] border border-cyan-300/20 bg-cyan-400/10 p-5 flex flex-col justify-between">
              <div>
                <p className="text-sm text-slate-300">Library Count</p>
                <p className="mt-2 text-3xl font-black text-white sm:text-4xl">
                  {allExercises.length}
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  {customExercises.length} custom exercises
                </p>
                <p className="mt-2 text-xs font-bold uppercase tracking-[0.14em] text-cyan-200/80">
                  {normalizedCatalog.report.validItems} validated movement
                  mappings
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  (window.location.href = ROUTES.workoutBuilder.home)
                }
                className="mt-4 min-h-[48px] rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm font-black text-slate-300 transition hover:border-cyan-300/40 hover:text-white"
              >
                ← Back to Workout Builder
              </button>
            </div>
          </div>
        </section>

        <section className="relative z-50 overflow-visible rounded-[30px] border border-white/15 bg-white/[0.055] p-4 shadow-[0_18px_58px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-2xl backdrop-saturate-150">
          <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto_auto_auto] lg:items-start">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-emerald-300">
                Movement Filters
              </p>

              <input
                placeholder="Search core movement, muscle, pattern, goal, equipment, or level..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="mt-3 min-h-[44px] w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-cyan-300"
              />
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-2.5">
              <p className="text-xs text-slate-400">Showing</p>
              <p className="mt-1 text-2xl font-black text-cyan-300">
                {focusedExercises.length}
              </p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                Core cards
              </p>
            </div>

            <div className="rounded-2xl border border-cyan-300/15 bg-slate-950/55 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
              <div className="grid grid-cols-2 gap-1">
                {(["detail", "grid"] as ExerciseLibraryViewMode[]).map(
                  (mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setViewMode(mode)}
                      className={`min-h-[44px] rounded-xl px-3 py-2 text-xs font-black uppercase tracking-[0.12em] transition ${
                        viewMode === mode
                          ? "bg-cyan-300 text-slate-950 shadow-[0_0_24px_rgba(34,211,238,0.22)]"
                          : "text-slate-400 hover:bg-white/[0.06] hover:text-white"
                      }`}
                    >
                      {viewModeLabels[mode]}
                    </button>
                  ),
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowAddForm((prev) => !prev)}
              className="min-h-[44px] rounded-2xl border border-emerald-300/20 bg-emerald-400/10 px-5 py-3 text-sm font-black text-emerald-300 transition hover:bg-emerald-400 hover:text-slate-950"
            >
              {showAddForm ? "Close Form" : "+ Add Exercise"}
            </button>

            <button
              type="button"
              onClick={resetFilters}
              className="min-h-[44px] rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-black text-slate-300 transition hover:border-cyan-300/40 hover:text-white"
            >
              Clear
            </button>
          </div>

          {showAddForm && (
            <div className="mt-6 rounded-[28px] border border-emerald-300/20 bg-slate-950/50 p-5">
              <p className="text-lg font-black text-white">
                Add Private Exercise
              </p>
              <p className="mt-1 text-sm text-slate-400">
                This saves to your browser only, so it is only visible to you on
                this device.
              </p>

              <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {[
                  ["name", "Exercise Name"],
                  ["body", "Body Part"],
                  ["muscles", "Smaller Muscles, use • between each"],
                  ["pattern", "Pattern"],
                  ["goal", "Goal"],
                  ["equipment", "Equipment"],
                  ["level", "Level"],
                  ["image", "Image URL"],
                  ["cue", "Coaching Cue"],
                ].map(([key, label]) => (
                  <input
                    key={key}
                    placeholder={label}
                    value={newExercise[key as keyof typeof newExercise]}
                    onChange={(e) =>
                      setNewExercise((prev) => ({
                        ...prev,
                        [key]: e.target.value,
                      }))
                    }
                    className="min-h-[48px] rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-emerald-300"
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={addExercise}
                className="mt-5 min-h-[48px] rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-emerald-300"
              >
                Save Exercise
              </button>
            </div>
          )}

          {planAddToParam ? (
            <div className="mt-4 rounded-2xl border border-emerald-300/20 bg-emerald-400/10 px-4 py-3 text-xs font-black text-emerald-200">
              Plan assignment mode
            </div>
          ) : null}

          <div className="mt-3 rounded-[24px] border border-cyan-200/10 bg-[radial-gradient(circle_at_12%_0%,rgba(34,211,238,0.12),transparent_36%),linear-gradient(135deg,rgba(15,23,42,0.72),rgba(2,6,23,0.56))] p-2.5 shadow-[0_14px_38px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.10)] backdrop-blur-xl">
            <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100/65">
                Body / Region
              </p>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/35">
                Quick filter
              </p>
            </div>

            <div className="flex flex-wrap gap-1.5">
            {bodyOptions.map((body) => (
              <button
                key={body}
                type="button"
                aria-pressed={bodyFilter === body}
                onClick={() => setBodyFilter(body)}
                className={`min-h-[34px] rounded-full border px-3 py-1.5 text-xs font-black transition focus:outline-none focus:ring-2 focus:ring-cyan-200/45 ${
                  bodyFilter === body
                    ? "border-cyan-200 bg-[linear-gradient(135deg,rgba(34,211,238,0.98),rgba(16,185,129,0.88))] text-slate-950 shadow-[0_0_30px_rgba(34,211,238,0.24),inset_0_1px_0_rgba(255,255,255,0.34)]"
                    : "border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.035))] text-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] hover:border-cyan-300/40 hover:bg-cyan-300/10 hover:text-white hover:shadow-[0_0_18px_rgba(34,211,238,0.12)]"
                }`}
              >
                {body}
              </button>
            ))}
            </div>
          </div>

          <div className="mt-3 grid gap-2.5 md:grid-cols-2 xl:grid-cols-5">
              <FilterMenu
                label="Movement Type"
                value={movementTypeFilter}
                options={movementTypeFilterOptions}
                onChange={setMovementTypeFilter}
                accent="emerald"
              />

              <FilterMenu
                label="Equipment"
                value={apparatusFilter}
                options={apparatusOptions}
                onChange={setApparatusFilter}
                accent="blue"
              />

              <FilterMenu
                label="Goal"
                value={goalFilter}
                options={goalOptions}
                onChange={setGoalFilter}
                accent="emerald"
              />

              <LevelSegmentedControl
                value={levelFilter}
                onChange={setLevelFilter}
                counts={levelCounts}
              />

              <FilterMenu
                label="Load Behavior"
                value={loadBehaviorFilter}
                options={loadBehaviorFilterOptions}
                onChange={setLoadBehaviorFilter}
                accent="violet"
              />
          </div>
        </section>

        <section
          className={`relative z-0 grid overflow-visible ${
            viewMode === "grid"
              ? "gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6"
              : "gap-4 sm:grid-cols-2 lg:grid-cols-3"
          }`}
        >
          {paginatedExercises.map((exercise) => {
            const metadata = getMetadataForExercise(exercise);
            const suggestions = getMovementSuggestions(exercise, metadata);

            return (
              <ExerciseLibraryCard
                key={exercise.id}
                exercise={exercise}
                metadata={metadata}
                suggestions={suggestions}
                planAddToParam={planAddToParam}
                savedExerciseStats={savedExerciseStats}
                viewMode={viewMode}
                onAddToPlan={addExerciseToPlanBuilder}
                onDeleteCustom={deleteCustomExercise}
                onAddStats={setStatsExercise}
              />
            );
          })}
        </section>

        {focusedExercises.length > exercisesPerPage && (
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="min-h-[44px] rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 hover:text-white disabled:opacity-40"
            >
              ←
            </button>

            {Array.from({ length: totalPages }).map((_, i) => {
              const page = i + 1;
              return (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`h-11 w-11 rounded-xl text-sm font-bold ${
                    currentPage === page
                      ? "bg-cyan-400 text-black"
                      : "bg-white/5 text-slate-400 hover:text-white"
                  }`}
                >
                  {page}
                </button>
              );
            })}

            <button
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              disabled={currentPage === totalPages}
              className="min-h-[44px] rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 hover:text-white disabled:opacity-40"
            >
              →
            </button>
          </div>
        )}

        {focusedExercises.length === 0 && (
          <section className="rounded-[28px] border border-white/10 bg-white/[0.05] p-6 text-center shadow-2xl sm:rounded-[34px] sm:p-10">
            <p className="text-lg font-black text-white">No exercises found.</p>
            <p className="mt-2 text-sm text-slate-400">
              Try clearing filters or adding a new movement.
            </p>
          </section>
        )}
      </section>

      {statsExercise && (
        <div className="fixed inset-x-2 bottom-3 top-3 z-[9999] mx-auto w-auto max-w-[760px] sm:inset-x-auto sm:bottom-6 sm:right-6 sm:top-auto sm:w-[min(94vw,760px)]">
          <div className="max-h-full max-w-full overflow-hidden rounded-[28px] border border-white/20 bg-white/[0.075] shadow-[0_30px_120px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.16)] backdrop-blur-2xl backdrop-saturate-150 sm:max-h-[86vh] sm:rounded-[34px]">
            <div className="max-h-full overflow-y-auto overflow-x-hidden overscroll-contain px-1 sm:max-h-[86vh]">
              <div className="grid lg:grid-cols-[1.05fr_310px] h-full">
                <div className="min-h-0 overflow-y-auto">
                  <div className="relative h-52 overflow-hidden border-b border-white/10 bg-slate-950 sm:h-[310px]">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.22),transparent_42%),linear-gradient(135deg,rgba(8,13,30,0.95),rgba(2,6,23,0.98))]" />

                    <div className="absolute inset-0 flex items-center justify-center">
                      <button
                        type="button"
                        className="flex h-20 w-20 items-center justify-center rounded-full border border-cyan-300/40 bg-cyan-300/10 text-3xl text-cyan-200 shadow-[0_0_40px_rgba(34,211,238,0.25)] transition hover:scale-105 hover:bg-cyan-300/20"
                      >
                        ▶
                      </button>
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-transparent p-5">
                      <p className="text-[10px] font-black uppercase tracking-[0.28em] text-yellow-300">
                        Add Stats
                      </p>
                      <h3 className="mt-1 text-2xl font-black text-white sm:text-3xl">
                        {statsExercise.name}
                      </h3>
                      <p className="mt-1 text-xs text-slate-300">
                        {statsExercise.body} • {statsExercise.pattern} •{" "}
                        {statsExercise.equipment}
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-cyan-200/15 bg-[radial-gradient(circle_at_12%_0%,rgba(34,211,238,0.16),transparent_34%),radial-gradient(circle_at_88%_18%,rgba(14,165,233,0.12),transparent_32%),linear-gradient(135deg,rgba(15,23,42,0.74),rgba(2,6,23,0.64))] p-5 shadow-[0_18px_56px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.16),inset_0_0_40px_rgba(34,211,238,0.06)] backdrop-blur-2xl backdrop-saturate-150">
                    <p className="mt-2 rounded-2xl border border-cyan-100/20 bg-white/[0.075] p-4 text-sm font-black uppercase tracking-[0.16em] text-cyan-100 shadow-[0_12px_34px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.18),inset_0_0_26px_rgba(34,211,238,0.055)] backdrop-blur-2xl">
                      Coaching Cue
                    </p>
                    <p className="mt-2 rounded-2xl border border-white/12 bg-white/[0.055] p-4 text-sm leading-6 text-slate-100 shadow-[0_10px_30px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-xl">
                      {statsExercise.cue ||
                        "Move with control, own the position, and make every rep count."}
                    </p>
                  </div>
                </div>

                <div className="border-t border-white/10 bg-white/[0.055] p-4 shadow-[inset_1px_0_0_rgba(255,255,255,0.08)] backdrop-blur-xl lg:border-l lg:border-t-0">
                  <div className="mb-4 rounded-2xl border border-emerald-300/15 bg-emerald-400/10 p-3">
                    <p className="text-xs font-black uppercase text-emerald-300">
                      Recent Stats
                    </p>

                    <div className="mt-2 space-y-2">
                      {savedExerciseStats
                        .filter((stat) => stat.exerciseId === statsExercise.id)
                        .slice(0, 3).length > 0 ? (
                        savedExerciseStats
                          .filter(
                            (stat) => stat.exerciseId === statsExercise.id,
                          )
                          .slice(0, 3)
                          .map((stat, index) => (
                            <div
                              key={`${stat.date}-${index}`}
                              className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.10)]"
                            >
                              <p className="text-base font-extrabold tracking-wide text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.35)]">
                                <span className="text-white">
                                  {stat.weight}
                                </span>
                                <span className="mx-2 text-white/30">×</span>
                                <span className="text-white">{stat.reps}</span>
                                <span className="mx-2 text-white/30">×</span>
                                <span className="text-white">{stat.sets}</span>
                              </p>

                              <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/50">
                                {new Date(stat.date).toLocaleDateString()}
                              </p>
                            </div>
                          ))
                      ) : (
                        <p className="text-sm text-slate-300">
                          No recent stats saved yet.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 rounded-[28px] border border-yellow-200/15 bg-[radial-gradient(circle_at_12%_0%,rgba(250,204,21,0.16),transparent_34%),linear-gradient(135deg,rgba(15,23,42,0.92),rgba(2,6,23,0.82))] p-4 shadow-[0_18px_52px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,255,255,0.16),inset_0_0_32px_rgba(250,204,21,0.055)] backdrop-blur-xl">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/80 drop-shadow-[0_0_10px_rgba(255,255,255,0.25)]">
                          Weight × Reps × Sets
                        </p>
                        <p className="mt-1 text-xs text-white/40">
                          Quick set tracking
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setStatsExercise(null)}
                        className="min-h-[44px] rounded-2xl border border-white/10 bg-white/[0.08] px-4 py-2 text-xs font-black text-white/70 transition hover:bg-white/[0.18] hover:text-white"
                      >
                        Close
                      </button>
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                      <input
                        value={statWeight}
                        onChange={(e) => setStatWeight(e.target.value)}
                        placeholder="Weight"
                        className="min-h-[50px] rounded-2xl border border-white/12 bg-[linear-gradient(135deg,rgba(255,255,255,0.12),rgba(255,255,255,0.055))] px-3.5 py-3 text-sm font-bold text-white shadow-[0_10px_28px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-xl outline-none transition placeholder:text-white/35 hover:border-yellow-200/25 hover:bg-white/[0.12] focus:border-yellow-200/45 focus:bg-white/[0.14] focus:shadow-[0_14px_34px_rgba(0,0,0,0.28),0_0_0_3px_rgba(250,204,21,0.08),inset_0_1px_0_rgba(255,255,255,0.18)]"
                      />

                      <input
                        value={statReps}
                        onChange={(e) => setStatReps(e.target.value)}
                        placeholder="Reps"
                        className="min-h-[50px] rounded-2xl border border-white/12 bg-[linear-gradient(135deg,rgba(255,255,255,0.12),rgba(255,255,255,0.055))] px-3.5 py-3 text-sm font-bold text-white shadow-[0_10px_28px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-xl outline-none transition placeholder:text-white/35 hover:border-yellow-200/25 hover:bg-white/[0.12] focus:border-yellow-200/45 focus:bg-white/[0.14] focus:shadow-[0_14px_34px_rgba(0,0,0,0.28),0_0_0_3px_rgba(250,204,21,0.08),inset_0_1px_0_rgba(255,255,255,0.18)]"
                      />

                      <input
                        value={statSets}
                        onChange={(e) => setStatSets(e.target.value)}
                        placeholder="Sets"
                        className="min-h-[50px] rounded-2xl border border-white/12 bg-[linear-gradient(135deg,rgba(255,255,255,0.12),rgba(255,255,255,0.055))] px-3.5 py-3 text-sm font-bold text-white shadow-[0_10px_28px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-xl outline-none transition placeholder:text-white/35 hover:border-yellow-200/25 hover:bg-white/[0.12] focus:border-yellow-200/45 focus:bg-white/[0.14] focus:shadow-[0_14px_34px_rgba(0,0,0,0.28),0_0_0_3px_rgba(250,204,21,0.08),inset_0_1px_0_rgba(255,255,255,0.18)]"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (
                        !statWeight.trim() ||
                        !statReps.trim() ||
                        !statSets.trim()
                      )
                        return;

                      const newStat: LocalExerciseStatEntry = {
                        exerciseId: statsExercise.id,
                        exerciseName: statsExercise.name,
                        body: statsExercise.body,
                        pattern: statsExercise.pattern,
                        equipment: statsExercise.equipment,
                        weight: statWeight.trim(),
                        reps: statReps.trim(),
                        sets: statSets.trim(),
                        date: new Date().toISOString(),
                        source: "exercise-library",
                      };

                      prependExerciseStats(newStat);

                      setSavedExerciseStats((prev) => [newStat, ...prev]);
                      setStatWeight("");
                      setStatReps("");
                      setStatSets("");
                    }}
                    className="mt-3 min-h-[48px] w-full rounded-2xl bg-gradient-to-r from-yellow-300 to-yellow-500 px-4 py-3 text-sm font-black text-slate-950 shadow-[0_0_28px_rgba(250,204,21,0.22)] transition hover:scale-[1.01]"
                  >
                    Save Stats
                  </button>

                  <div className="mt-3 grid gap-2">
                    <a
                      href={ROUTES.dashboard.stats}
                      className="min-h-[48px] rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-center text-sm font-black text-slate-300 transition hover:border-yellow-300/40 hover:text-white"
                    >
                      View Stats Page →
                    </a>

                    <a
                      href={ROUTES.workoutBuilder.exerciseDemo}
                      className="min-h-[48px] rounded-2xl border border-cyan-300/20 bg-cyan-400/10 px-4 py-3 text-center text-sm font-black text-cyan-300 transition hover:bg-cyan-400 hover:text-slate-950"
                    >
                      View Full Demo Page →
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
