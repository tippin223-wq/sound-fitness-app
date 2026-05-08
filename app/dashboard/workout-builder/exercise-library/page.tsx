"use client";

import {
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { useRouter } from "next/navigation";
import {
  readWorkoutBuilderSelectedExercises,
  writeWorkoutBuilderSelectedExercises,
} from "@/lib/localData/workoutBuilderData";
import {
  prependExerciseStats,
  readCustomExercises,
  readExerciseStats,
  writeCustomExercises,
} from "@/lib/localData/workoutData";
import {
  getExerciseCatalogWithLegacyFallback,
  getNormalizedExerciseCatalog,
  type NormalizedExerciseCatalogItem,
} from "@/lib/training/normalizedExerciseCatalog";
import { getCompatibleModifiersForMovement } from "@/lib/training/movementCompatibility";
import {
  EXERCISE_MODIFIER_BY_ID,
  EXERCISE_MODIFIER_CATEGORY_BY_ID,
} from "@/lib/training/movementTaxonomy";
import { createExerciseVariation } from "@/lib/training/movementGeneration";
import { ROUTES } from "@/lib/routes";
import type {
  ExerciseCatalogItem,
  ExerciseModifier,
  ExerciseModifierCategoryId,
  ExerciseModifierId,
  LocalExerciseStatEntry,
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

const normalizedCatalog = getNormalizedExerciseCatalog();

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
  EXERCISE_MODIFIER_CATEGORY_BY_ID[categoryId]?.label || labelize(categoryId);

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
          label: category?.label || getModifierCategoryLabel(modifier.categoryId),
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

const optionLabels = (options: Array<{ label: string }>) => [
  "All",
  ...options.map((option) => option.label),
];

const loadBehaviorOptions = [
  "All",
  ...normalizedCatalog.filterOptions.modifiers
    .filter((option) => option.id.startsWith("load-behavior:"))
    .map((option) => option.label),
];

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

function MovementMetadataPanel({
  exercise,
  metadata,
  selectedModifierIds,
  setSelectedModifierIds,
}: {
  exercise: Exercise;
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
  const selectedEquipmentLabel = getSelectedEquipmentLabel(
    exercise,
    metadata,
    selectedModifierIds,
  );

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

  return (
    <div className="mt-3 rounded-2xl border border-cyan-300/15 bg-cyan-400/[0.07] p-4 backdrop-blur-2xl">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-200">
          Movement Intelligence
        </p>
        <span className="rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-2 text-right text-[10px] font-bold text-slate-300">
          <span className="block uppercase tracking-[0.14em] text-cyan-200">
            Variation Coverage
          </span>
          <span className="mt-0.5 block text-white/80">
            {metadata
              ? compatibleModifierCount > 0
                ? `${compatibleModifierCount} compatible modifiers`
                : "Core movement mapped"
              : "Custom movement"}
          </span>
        </span>
      </div>

      {metadata ? (
        <div className="mt-3 space-y-3">
          <div className="grid gap-2 text-xs sm:grid-cols-3">
            <div>
              <span className="text-white/35">Pattern</span>
              <p className="mt-1 font-black text-white">
                {metadata.movementPatternLabel}
              </p>
            </div>
            <div>
              <span className="text-white/35">Region</span>
              <p className="mt-1 font-black text-white">
                {exercise.body}
              </p>
            </div>
            <div>
              <span className="text-white/35">Equipment</span>
              <p className="mt-1 font-black text-white">
                {selectedEquipmentLabel}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {(selectedModifierLabels.length
              ? selectedModifierLabels
              : displayedLoadBehaviorLabels.length
                ? displayedLoadBehaviorLabels
                : ["Select compatible modifiers"]
            ).map((label) => (
              <span
                key={label}
                className="rounded-full border border-violet-300/20 bg-violet-400/10 px-2.5 py-1 text-[10px] font-bold text-violet-100"
              >
                {label}
              </span>
            ))}
          </div>

          <details className="group rounded-2xl border border-white/10 bg-slate-950/35">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-xs font-black uppercase tracking-[0.14em] text-emerald-200">
              <span>Choose Variation Modifiers</span>
              <span
                aria-hidden="true"
                className="text-sm text-emerald-100 transition group-open:rotate-180"
              >
                v
              </span>
            </summary>

            <div className="space-y-3 border-t border-white/10 p-3">
              {compatibleModifierGroups.map((group) => (
                <div key={group.categoryId}>
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/40">
                    {group.label}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {group.modifiers.map((modifier) => {
                      const isSelected = selectedModifierIds.includes(
                        modifier.id,
                      );

                      return (
                        <button
                          key={modifier.id}
                          type="button"
                          onClick={() => toggleModifier(modifier)}
                          className={`min-h-[36px] rounded-full border px-3 py-1.5 text-[11px] font-black transition ${
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
              ))}
            </div>
          </details>
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
  onAddToPlan,
  onDeleteCustom,
  onAddStats,
}: {
  exercise: Exercise;
  metadata: NormalizedExerciseCatalogItem | null;
  suggestions: ReturnType<typeof getMovementSuggestions>;
  planAddToParam: string;
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

  return (
    <article className="group relative overflow-hidden rounded-[30px] border border-white/20 bg-[linear-gradient(135deg,rgba(255,255,255,0.13),rgba(255,255,255,0.035))] shadow-[0_24px_80px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.20)] backdrop-blur-2xl backdrop-saturate-150 transition hover:border-white/30 hover:bg-[linear-gradient(135deg,rgba(255,255,255,0.18),rgba(255,255,255,0.055))] hover:shadow-[0_32px_100px_rgba(0,0,0,0.56),inset_0_1px_0_rgba(255,255,255,0.26)]">
      <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(circle_at_20%_0%,rgba(255,255,255,0.18),transparent_34%),linear-gradient(120deg,rgba(255,255,255,0.16)_0%,rgba(255,255,255,0.055)_36%,transparent_68%)] opacity-70" />

      <div className="relative z-10 h-44 overflow-hidden bg-slate-950/60">
        <img
          src={exercise.image || defaultImage}
          alt={variationName}
          className="h-full w-full object-cover opacity-80 transition duration-500 group-hover:scale-105 group-hover:opacity-100"
        />
      </div>

      <div className="relative z-10 p-5">
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-cyan-300">
            {exercise.body}
          </span>

          <span className="text-xs font-bold text-slate-500">
            {exercise.level}
          </span>
        </div>

        <h2 className="mt-4 text-xl font-extrabold text-white/90 tracking-wide drop-shadow-[0_0_12px_rgba(255,255,255,0.35)]">
          {variationName}
        </h2>

        <p className="mt-2 text-sm leading-5 text-white/55 drop-shadow-[0_0_8px_rgba(255,255,255,0.18)]">
          {exercise.muscles || exercise.body}
        </p>

        <div className="mt-4 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-[linear-gradient(135deg,rgba(2,6,23,0.92),rgba(15,23,42,0.55))] p-3 backdrop-blur-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_8px_30px_rgba(0,0,0,0.45)]">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/35">
              Pattern
            </p>
            <p className="mt-1 text-sm font-extrabold tracking-wide text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.18)]">
              {patternLabel}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[linear-gradient(135deg,rgba(2,6,23,0.92),rgba(15,23,42,0.55))] p-3 backdrop-blur-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_8px_30px_rgba(0,0,0,0.45)]">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/35">
              Equipment
            </p>
            <p className="mt-1 text-sm font-extrabold tracking-wide text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.18)]">
              {equipmentLabel}
            </p>
          </div>
        </div>

        <div className="mt-2 rounded-2xl border border-white/10 bg-[linear-gradient(135deg,rgba(2,6,23,0.92),rgba(15,23,42,0.55))] p-3 backdrop-blur-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_8px_30px_rgba(0,0,0,0.45)] text-xs">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/35">
            Goal
          </p>
          <p className="mt-1 text-sm font-extrabold tracking-wide text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.18)]">
            {goalLabel}
          </p>
        </div>

        <MovementMetadataPanel
          exercise={exercise}
          metadata={metadata}
          selectedModifierIds={selectedModifierIds}
          setSelectedModifierIds={setSelectedModifierIds}
        />

        <MovementSuggestionsPanel suggestions={suggestions} />

        <MovementProgressPanel suggestions={suggestions} />

        <div className="mt-4 rounded-2xl border border-emerald-300/20 bg-[linear-gradient(135deg,rgba(16,185,129,0.18),rgba(16,185,129,0.05))] p-4 backdrop-blur-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-200/80 drop-shadow-[0_0_8px_rgba(16,185,129,0.35)]">
            Coaching Cue
          </p>

          <p className="mt-2 text-sm leading-5 text-emerald-100/80 drop-shadow-[0_0_10px_rgba(16,185,129,0.25)]">
            {exercise.cue}
          </p>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
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
            onClick={() => onAddStats(exercise)}
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
      </div>
    </article>
  );
}

export default function ExerciseLibraryPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const exercisesPerPage = 12;
  const [bodyFilter, setBodyFilter] = useState("All");
  const [goalFilter, setGoalFilter] = useState("All");
  const [levelFilter, setLevelFilter] = useState("All");
  const [coreMovementFilter, setCoreMovementFilter] = useState("All");
  const [apparatusFilter, setApparatusFilter] = useState("All");
  const [movementPatternFilter, setMovementPatternFilter] = useState("All");
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
    setSavedExerciseStats(readExerciseStats());
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setPlanAddToParam(params.get("addTo") || "");
  }, []);

  const allExercises: Exercise[] = useMemo(() => {
    return [...normalizedSystemExercises, ...customExercises];
  }, [customExercises]);

  const coreMovementOptions = useMemo(
    () => optionLabels(normalizedCatalog.filterOptions.coreMovements),
    [],
  );

  const apparatusOptions = useMemo(
    () => optionLabels(normalizedCatalog.filterOptions.apparatus),
    [],
  );

  const movementPatternOptions = useMemo(
    () => optionLabels(normalizedCatalog.filterOptions.movementPatterns),
    [],
  );

  const bodyOptions = useMemo(
    () => getUniqueOptions(allExercises, "body"),
    [allExercises],
  );

  const goalOptions = useMemo(() => {
    const existingGoals = allExercises
      .map((exercise) => exercise.goal)
      .filter(Boolean);

    return [
      "All",
      ...Array.from(new Set([...baseGoals, ...existingGoals])).sort(),
    ];
  }, [allExercises]);

  const levelOptions = useMemo(
    () => getUniqueOptions(allExercises, "level"),
    [allExercises],
  );

  const filtered = useMemo(() => {
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

      const matchesLevel =
        levelFilter === "All" || exercise.level === levelFilter;
      const matchesCoreMovement =
        coreMovementFilter === "All" ||
        metadata?.coreMovementLabel === coreMovementFilter;
      const matchesApparatus =
        apparatusFilter === "All" ||
        getModifierLabelsByCategory(metadata, "apparatus").includes(
          apparatusFilter,
        );
      const matchesMovementPattern =
        movementPatternFilter === "All" ||
        metadata?.movementPatternLabel === movementPatternFilter;
      const matchesLoadBehavior =
        loadBehaviorFilter === "All" ||
        loadBehaviorLabels.includes(loadBehaviorFilter);

      return (
        matchesSearch &&
        matchesBody &&
        matchesGoal &&
        matchesLevel &&
        matchesCoreMovement &&
        matchesApparatus &&
        matchesMovementPattern &&
        matchesLoadBehavior
      );
    });
  }, [
    allExercises,
    search,
    bodyFilter,
    goalFilter,
    levelFilter,
    coreMovementFilter,
    apparatusFilter,
    movementPatternFilter,
    loadBehaviorFilter,
  ]);

  const focusedExercises = useMemo(() => {
    const seenCoreMovements = new Set<string>();

    return filtered.filter((exercise) => {
      if (exercise.custom) return true;

      const metadata = getMetadataForExercise(exercise);
      const key = metadata?.coreMovementId || exercise.id;

      if (seenCoreMovements.has(key)) return false;
      seenCoreMovements.add(key);
      return true;
    });
  }, [filtered]);

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
    coreMovementFilter,
    apparatusFilter,
    movementPatternFilter,
    loadBehaviorFilter,
  ]);

  const resetFilters = () => {
    setSearch("");
    setBodyFilter("All");
    setGoalFilter("All");
    setLevelFilter("All");
    setCoreMovementFilter("All");
    setApparatusFilter("All");
    setMovementPatternFilter("All");
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
    options: string[];
    onChange: (value: string) => void;
    accent?: "cyan" | "emerald" | "blue" | "violet";
  }) => {
    const [open, setOpen] = useState(false);

    const accentClasses = {
      cyan: "border-cyan-300/30 bg-cyan-400/10 text-cyan-200",
      emerald: "border-emerald-300/30 bg-emerald-400/10 text-emerald-200",
      blue: "border-blue-300/30 bg-blue-400/10 text-blue-200",
      violet: "border-violet-300/30 bg-violet-400/10 text-violet-200",
    };

    return (
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className={`flex w-full items-center justify-between rounded-2xl border px-3 py-3 text-left shadow-xl transition hover:scale-[1.01] ${accentClasses[accent]}`}
        >
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] opacity-70">
              {label}
            </p>
            <p className="mt-0.5 text-sm font-black text-white">{value}</p>
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
              {options.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    onChange(option);
                    setOpen(false);
                  }}
                  className={`mb-1 flex min-h-[40px] w-full items-center justify-between rounded-2xl px-4 py-2.5 text-left text-sm font-bold transition ${
                    value === option
                      ? "bg-cyan-400 text-slate-950"
                      : "text-slate-300 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <span>{option}</span>
                  {value === option && <span>✓</span>}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

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

        <section className="relative z-50 overflow-visible rounded-[34px] border border-white/15 bg-white/[0.055] p-5 shadow-[0_20px_70px_rgba(0,0,0,0.38),inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-2xl backdrop-saturate-150">
          <div className="grid gap-4 lg:grid-cols-[1fr_auto_auto_auto] lg:items-start">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-emerald-300">
                Movement Filters
              </p>

              <input
                placeholder="Search core movement, muscle, pattern, goal, equipment, or level..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="mt-4 min-h-[48px] w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-4 text-white outline-none placeholder:text-slate-500 focus:border-cyan-300"
              />
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3">
              <p className="text-xs text-slate-400">Showing</p>
              <p className="mt-1 text-2xl font-black text-cyan-300">
                {focusedExercises.length}
              </p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                Core cards
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowAddForm((prev) => !prev)}
              className="min-h-[48px] rounded-2xl border border-emerald-300/20 bg-emerald-400/10 px-5 py-4 text-sm font-black text-emerald-300 transition hover:bg-emerald-400 hover:text-slate-950"
            >
              {showAddForm ? "Close Form" : "+ Add Exercise"}
            </button>

            <button
              type="button"
              onClick={resetFilters}
              className="min-h-[48px] rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-sm font-black text-slate-300 transition hover:border-cyan-300/40 hover:text-white"
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

          <div className="mt-4 flex flex-wrap gap-2">
            {bodyOptions.map((body) => (
              <button
                key={body}
                type="button"
                onClick={() => setBodyFilter(body)}
                className={`min-h-[36px] rounded-full border px-3 py-1.5 text-xs font-black transition ${
                  bodyFilter === body
                    ? "border-cyan-300 bg-cyan-300 text-slate-950"
                    : "border-white/10 bg-white/[0.04] text-slate-300 hover:border-cyan-300/40 hover:text-white"
                }`}
              >
                {body}
              </button>
            ))}
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <FilterMenu
                label="Body / Region"
                value={bodyFilter}
                options={bodyOptions}
                onChange={setBodyFilter}
                accent="cyan"
              />

              <FilterMenu
                label="Core Movement"
                value={coreMovementFilter}
                options={coreMovementOptions}
                onChange={setCoreMovementFilter}
                accent="emerald"
              />

              <FilterMenu
                label="Pattern"
                value={movementPatternFilter}
                options={movementPatternOptions}
                onChange={setMovementPatternFilter}
                accent="cyan"
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

              <FilterMenu
                label="Level"
                value={levelFilter}
                options={levelOptions}
                onChange={setLevelFilter}
                accent="violet"
              />

              <FilterMenu
                label="Load Behavior"
                value={loadBehaviorFilter}
                options={loadBehaviorOptions}
                onChange={setLoadBehaviorFilter}
                accent="violet"
              />
          </div>
        </section>

        <section className="relative z-0 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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

                  <div className="border-t border-white/10 bg-white/[0.055] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl">
                    <p className="mt-2 rounded-2xl border border-white/10 bg-white/[0.06] p-4 text-sm leading-6 text-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl">
                      Coaching Cue
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-300">
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

                  <div className="mt-4 rounded-[28px] border border-white/10 bg-white/[0.05] p-4 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
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

                    <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
                      <input
                        value={statWeight}
                        onChange={(e) => setStatWeight(e.target.value)}
                        placeholder="Weight"
                        className="min-h-[48px] rounded-2xl border border-white/10 bg-white/[0.08] px-3 py-3 text-sm font-semibold text-white backdrop-blur-xl outline-none placeholder:text-white/30 focus:border-white/30 focus:bg-white/[0.12]"
                      />

                      <input
                        value={statReps}
                        onChange={(e) => setStatReps(e.target.value)}
                        placeholder="Reps"
                        className="min-h-[48px] rounded-2xl border border-white/10 bg-white/[0.08] px-3 py-3 text-sm font-semibold text-white backdrop-blur-xl outline-none placeholder:text-white/30 focus:border-white/30 focus:bg-white/[0.12]"
                      />

                      <input
                        value={statSets}
                        onChange={(e) => setStatSets(e.target.value)}
                        placeholder="Sets"
                        className="min-h-[48px] rounded-2xl border border-white/10 bg-white/[0.08] px-3 py-3 text-sm font-semibold text-white backdrop-blur-xl outline-none placeholder:text-white/30 focus:border-white/30 focus:bg-white/[0.12]"
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

                      const updated = prependExerciseStats(newStat);

                      setSavedExerciseStats(updated);
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
