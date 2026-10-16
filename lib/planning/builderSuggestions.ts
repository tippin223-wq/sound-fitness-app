import type { ExerciseCatalogItem } from "@/types";
import type { BuilderDraftForm } from "./builderDraft";
import { builderExerciseOccurrences } from "./builderExerciseOccurrences";
import { toWorkoutBuilderSelectedExercise } from "@/lib/localData/workoutBuilderData";
import { rankWorkoutTemplates } from "./templateRecommendations";
import { readEligibleGoals } from "./goals";
import { profileAge, type RecommendationProfile } from "./recommendation";
import { planningKeys, planningOwner, planningAccountGeneration, planningRecordVersion, readPlanning } from "./store";

export const builderSuggestionModes = ["Base movements", "Selected body area", "Strength focus", "Hypertrophy focus", "Mobility options"] as const;
export type BuilderSuggestionMode = typeof builderSuggestionModes[number];
const sourceVersion = (now: Date) => JSON.stringify({ account: planningOwner(), generation: planningAccountGeneration(), goals: planningRecordVersion(planningKeys.goals), profile: planningRecordVersion(planningKeys.profile), favorites: planningRecordVersion(planningKeys.libraryFavorites), age: profileAge(readPlanning<RecommendationProfile>(planningKeys.profile, {}), now) });
const family = (pattern: string) => ["squat", "hinge", "push", "pull"].find(value => pattern.toLowerCase().includes(value)) || pattern.toLowerCase();

export function previewBuilderSuggestions(mode: BuilderSuggestionMode, catalog: ExerciseCatalogItem[], form: BuilderDraftForm, body = "All", now = new Date()) {
  if (!planningOwner()) throw new Error("Load your account before reviewing suggestions.");
  if (!builderSuggestionModes.includes(mode)) throw new Error("Choose a supported suggestion mode.");
  const goals = readEligibleGoals(now);
  if (!goals) throw new Error("Save your Goals and weekly targets before reviewing suggestions.");
  const current = builderExerciseOccurrences(form.sections, catalog);
  if (JSON.stringify(current) !== JSON.stringify(form.exercises)) throw new Error("Workout slots and exercise records differ. Review your open workout first.");
  const profile = readPlanning<RecommendationProfile>(planningKeys.profile, {});
  if (!profile || typeof profile !== "object" || Array.isArray(profile)) throw new Error("Review your saved Profile before using equipment matches.");
  const favorites = readPlanning<unknown>(planningKeys.libraryFavorites, []);
  if (!Array.isArray(favorites) || favorites.some(value => typeof value !== "string")) throw new Error("Saved favorites need review. Original selections are preserved.");
  if (mode === "Selected body area" && (!body || body === "All" || !catalog.some(exercise => exercise.body === body))) throw new Error("Choose a body area for these suggestions.");
  const focus = mode === "Strength focus" ? "Strength" : mode === "Hypertrophy focus" ? "Hypertrophy" : mode === "Mobility options" ? "Mobility" : mode === "Selected body area" ? body : ({ "Build Muscle": "Hypertrophy", "Lose Fat": "Full Body", Maintain: "Full Body", "General Health": "Full Body", Performance: "Power" } as Record<string, string>)[goals.primaryGoal || ""] || goals.primaryGoal || "Full Body";
  const counts = new Map<string, number>();
  for (const exercise of catalog) counts.set(exercise.id, (counts.get(exercise.id) || 0) + 1);
  const currentIds = new Set(current.map(exercise => exercise.id));
  const templates = catalog.filter(exercise => exercise.id && exercise.name && counts.get(exercise.id) === 1 && !currentIds.has(exercise.id) && (mode !== "Selected body area" || exercise.body === body)).map(exercise => ({ id: exercise.id, title: "Catalog candidate", exercises: [toWorkoutBuilderSelectedExercise(exercise)], createdAt: "", updatedAt: "" }));
  const matches = rankWorkoutTemplates(templates, profile, focus).filter(match => match.focusSupported && match.equipmentConfirmed).sort((a, b) => Number(favorites.includes(b.template.id)) - Number(favorites.includes(a.template.id)) || b.score - a.score || a.template.id.localeCompare(b.template.id));
  const covered = new Set(current.map(exercise => family(exercise.pattern || "")));
  const candidates = matches.filter(match => {
    if (mode !== "Base movements") return true;
    const movement = family(match.template.exercises[0].pattern || "");
    if (!["squat", "hinge", "push", "pull"].includes(movement) || covered.has(movement)) return false;
    covered.add(movement);
    return true;
  }).slice(0, 3).map(match => ({ exercise: match.template.exercises[0], reasons: [`Catalog exercise tags match ${focus.toLowerCase()}.`, "Equipment is bodyweight or matches saved Profile equipment.", ...(favorites.includes(match.template.id) ? ["Saved exact-ID favorite."] : [])] }));
  return { mode, body, sourceVersion: sourceVersion(now), catalogVersion: JSON.stringify(catalog), formVersion: JSON.stringify(form), candidates, context: `Saved goal: ${goals.primaryGoal}. Review suitability and instructions before adding; sets, reps and rest are left unset.` };
}
export type BuilderSuggestionPreview = ReturnType<typeof previewBuilderSuggestions>;

export function confirmBuilderSuggestions(preview: BuilderSuggestionPreview, catalog: ExerciseCatalogItem[], form: BuilderDraftForm, now = new Date()) {
  if (sourceVersion(now) !== preview.sourceVersion) throw new Error("Your account, Goals, Profile, favorites or age context changed. Review suggestions again; your workout is preserved.");
  if (JSON.stringify(form) !== preview.formVersion || JSON.stringify(catalog) !== preview.catalogVersion) throw new Error("The open workout or exercise catalog changed. Review suggestions again.");
  const fresh = previewBuilderSuggestions(preview.mode, catalog, form, preview.body, now);
  if (JSON.stringify(fresh.candidates) !== JSON.stringify(preview.candidates) || !fresh.candidates.length) throw new Error("These suggestions are unavailable or changed. Review again before adding.");
  const sections = JSON.parse(JSON.stringify(form.sections)) as BuilderDraftForm["sections"];
  const main = sections.find(section => section.id === "main");
  if (!main) throw new Error("Add a Main section before applying suggestions.");
  const ids = new Set(sections.flatMap(section => section.slots.map(slot => slot.id)));
  for (const [index, candidate] of fresh.candidates.entries()) {
    let id = `suggested-occurrence-${index}`;
    while (ids.has(id)) id += "-copy";
    ids.add(id);
    main.slots.push({ id, label: "Suggested movement", exercise: candidate.exercise.name, exerciseRecord: candidate.exercise });
  }
  builderExerciseOccurrences(sections, catalog);
  return sections;
}
