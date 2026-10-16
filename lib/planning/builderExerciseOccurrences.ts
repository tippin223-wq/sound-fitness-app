import { validWorkoutTargets, type WorkoutTargetField } from "./workoutTargets";
import type { ExerciseCatalogItem } from "@/types";
import { toWorkoutBuilderSelectedExercise, workoutTemplateContentVersion, type LocalWorkoutBuilderSelectedExercise, type LocalWorkoutBuilderTemplate } from "@/lib/localData/workoutBuilderData";
import type { BuilderDraftForm, BuilderDraftSection } from "./builderDraft";
import { validatePlanningImport } from "./importValidation";
import { planningKeys } from "./store";

const record = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === "object" && !Array.isArray(value));
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
function assertSections(value: unknown): asserts value is BuilderDraftSection[] {
  if (!Array.isArray(value) || value.length > 5) throw new Error("Review the Builder sections. Original exercise records are preserved.");
  const sections = new Set<string>(), slots = new Set<string>();
  for (const section of value) {
    if (!record(section) || typeof section.id !== "string" || !["warmUp", "main", "accessories", "coreConditioning", "coolDown"].includes(section.id)
      || sections.has(section.id) || ["title", "helper", "accent", "border"].some(key => typeof section[key] !== "string") || !Array.isArray(section.slots) || section.slots.length > 100) throw new Error("Review the Builder section identity and fields. Originals are preserved.");
    sections.add(section.id);
    for (const slot of section.slots) {
      if (!record(slot) || typeof slot.id !== "string" || !slot.id.trim() || slots.has(slot.id) || typeof slot.label !== "string" || typeof slot.exercise !== "string") throw new Error("Review the Builder slot identity and fields. Originals are preserved.");
      slots.add(slot.id);
    }
  }
}
function assertExercise(value: unknown): asserts value is LocalWorkoutBuilderSelectedExercise {
  if (!record(value) || validatePlanningImport({ [planningKeys.selectedExercises]: [value] })) throw new Error("Review this slot's exercise record. Original metadata is preserved.");
}
function exerciseVersion(exercises: LocalWorkoutBuilderSelectedExercise[]) {
  return workoutTemplateContentVersion({ id: "builder-occurrences", title: "Builder occurrences", exercises });
}

/** Ordered slot occurrences are authoritative; repeated exercise IDs and custom metadata are never deduplicated. */
export function builderExerciseOccurrences(sections: BuilderDraftSection[], catalog: ExerciseCatalogItem[] = []) {
  assertSections(sections);
  const exercises: LocalWorkoutBuilderSelectedExercise[] = [];
  for (const section of sections) for (const slot of section.slots) {
    if (!slot.exercise) {
      if (slot.exerciseRecord != null) throw new Error("An empty slot still has an exercise record. Review it before saving; originals are preserved.");
      continue;
    }
    if (Object.hasOwn(slot, "exerciseRecord")) {
      assertExercise(slot.exerciseRecord);
      if (slot.exerciseRecord.name !== slot.exercise) throw new Error("Slot label and exercise identity differ. Review the original before saving.");
      exercises.push(clone(slot.exerciseRecord));
    } else {
      const matches = catalog.filter(exercise => exercise.name === slot.exercise);
      if (matches.length !== 1 || catalog.filter(exercise => exercise.id === matches[0].id).length !== 1) throw new Error("A legacy slot has an unavailable or ambiguous exercise. Its original name is preserved for review.");
      const exercise = toWorkoutBuilderSelectedExercise(matches[0]);
      assertExercise(exercise);
      exercises.push(exercise);
    }
  }
  if (exercises.length > 100) throw new Error("Review the workout's exercise count before saving. Original records are preserved.");
  return exercises;
}

/** Load a saved workout into distinct slots and prove full metadata/order round-trip. */
export function bindBuilderTemplateOccurrences(template: LocalWorkoutBuilderTemplate, layout: BuilderDraftSection[]) {
  if (validatePlanningImport({ [planningKeys.templates]: [template] }) || !template.exercises.length || template.exercises.length > 100) throw new Error("Review the saved workout before loading its original exercises.");
  assertSections(layout);
  if (!layout.some(section => section.id === "main") || layout.some(section => section.id !== "main" && section.slots.some(slot => slot.exercise || slot.exerciseRecord != null))) throw new Error("Load this workout into an empty section layout so no other exercises are replaced implicitly.");
  const reserved = new Set(layout.filter(section => section.id !== "main").flatMap(section => section.slots.map(slot => slot.id)));
  const sections = clone(layout).map(section => section.id !== "main" ? section : { ...section, slots: template.exercises.map((exercise, index) => {
    let id = `main-occurrence-${index}`;
    while (reserved.has(id)) id += "-copy";
    reserved.add(id);
    return { id, label: index === 0 ? "Primary lift" : `Main slot ${index + 1}`, exercise: exercise.name, exerciseRecord: clone(exercise) };
  }) });
  const exercises = builderExerciseOccurrences(sections);
  if (exerciseVersion(exercises) !== exerciseVersion(template.exercises)) throw new Error("This workout cannot round-trip its original metadata. Saved originals are preserved.");
  return { sections, exercises };
}

/** Upgrade only a draft whose ordered saved exercise evidence agrees with every occupied slot. */
export function bindLegacyBuilderDraftOccurrences(form: BuilderDraftForm) {
  assertSections(form.sections);
  if (validatePlanningImport({ [planningKeys.selectedExercises]: form.exercises }) || !Array.isArray(form.exercises) || form.exercises.length > 100) throw new Error("Review the saved draft's original exercises before loading.");
  const filled = form.sections.flatMap(section => section.slots.filter(slot => slot.exercise));
  if (filled.length !== form.exercises.length || filled.some((slot, index) => slot.exercise !== form.exercises[index].name)) throw new Error("Draft slots and saved exercise order differ. Export its original rather than guessing identities.");
  let index = 0;
  const copy = clone(form);
  for (const section of copy.sections) for (const slot of section.slots) {
    if (!slot.exercise) {
      if (slot.exerciseRecord != null) throw new Error("An empty archived slot retains exercise metadata. Review its original.");
      continue;
    }
    const exercise = form.exercises[index++];
    if (Object.hasOwn(slot, "exerciseRecord") && exerciseVersion([slot.exerciseRecord as LocalWorkoutBuilderSelectedExercise]) !== exerciseVersion([exercise])) throw new Error("Draft slot metadata differs from its saved exercise record. Export the original for review.");
    slot.exerciseRecord = clone(exercise);
  }
  if (exerciseVersion(builderExerciseOccurrences(copy.sections)) !== exerciseVersion(form.exercises)) throw new Error("Draft exercise metadata cannot round-trip. The original is preserved.");
  return copy;
}

/** Display fields never become saved exercise evidence. Only an exact ID/name match may supply artwork. */
export function builderOccurrenceDisplay(exercise: LocalWorkoutBuilderSelectedExercise, catalog: ExerciseCatalogItem[]): ExerciseCatalogItem {
  const candidates = catalog.filter(item => item.id === exercise.id && item.name === exercise.name);
  const match = candidates.length === 1 ? candidates[0] : undefined;
  const source = exercise as unknown as Record<string, unknown>;
  const field = (key: string) => typeof source[key] === "string" ? source[key] as string : "";
  return { id: exercise.id, name: exercise.name, body: field("body"), pattern: field("pattern"), goal: field("goal"), equipment: field("equipment"), muscles: field("muscles") || match?.muscles || "", level: field("level") || match?.level || "", cue: field("cue") || match?.cue || "", image: field("image") || match?.image || "" };
}

/** Edit one occurrence; callers persist before replacing the open form. */
export function updateBuilderOccurrenceTarget(sections: BuilderDraftSection[], catalog: ExerciseCatalogItem[], sectionId: string, slotId: string, field: WorkoutTargetField, value: string) {
  if (!["sets", "reps", "restSeconds", "notes"].includes(field) || typeof value !== "string") throw new Error("Review the target field before saving.");
  builderExerciseOccurrences(sections, catalog);
  const section = sections.find(item => item.id === sectionId);
  const source = section?.slots.find(slot => slot.id === slotId);
  if (!section || !source?.exercise) throw new Error("Choose an exercise before adding targets or coaching notes.");
  const exercise = builderExerciseOccurrences([{ ...section, slots: [source] }], catalog)[0];
  const targets = { ...exercise.workoutTargets, schemaVersion: 1 as const, [field]: value };
  if (!validWorkoutTargets(targets)) throw new Error("Use 1–20 sets, 0–3600 rest seconds, up to 80 characters for reps and 2000 for notes. Previous instructions are preserved.");
  const next = clone(sections).map(item => item.id !== sectionId ? item : { ...item, slots: item.slots.map(slot => slot.id !== slotId ? slot : { ...slot, exerciseRecord: { ...exercise, workoutTargets: targets } }) });
  builderExerciseOccurrences(next, catalog);
  return next;
}
