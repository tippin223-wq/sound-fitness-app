import type { LocalExerciseStatEntry } from "@/types";
import { activityTimestamp } from "./dates";
import { libraryRecordedCount } from "./libraryCounts";
import { statsHistoryIncludes } from "./statsEvidence";

type HistoryScope = { exerciseId: unknown; variationId?: unknown; variationName?: unknown; scope?: "exercise" | "variation" };
const id = (value: unknown) => typeof value === "string" ? value.trim() : "";
const name = (value: unknown) => id(value).replace(/\s+/g, " ").toLowerCase();

/** Exercise identity precedes variation identity; no pattern/name fallback across exercises. */
export function libraryExerciseHistory(entries: readonly LocalExerciseStatEntry[], target: HistoryScope, now = new Date()) {
  const exerciseId = id(target.exerciseId); const variationId = id(target.variationId); const variationName = name(target.variationName);
  if (!exerciseId || target.scope === "variation" && !variationId && !variationName) return [];
  if (target.variationId != null && typeof target.variationId !== "string" || target.variationName != null && typeof target.variationName !== "string") return [];
  return entries.filter(entry => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry) || id(entry.exerciseId) !== exerciseId || !statsHistoryIncludes(activityTimestamp(entry.date), "Lifetime", now) || (libraryRecordedCount(entry.sets) ?? 0) <= 0) return false;
    if (target.scope !== "variation") return true;
    if (variationId) return id(entry.semanticVariationId) === variationId;
    if (entry.semanticVariationId != null && (typeof entry.semanticVariationId !== "string" || entry.semanticVariationId.trim())) return false;
    // Name-only variation evidence is confined to an exact recorded exercise ID.
    const raw = entry.semanticVariationName != null && entry.semanticVariationName !== "" ? entry.semanticVariationName : entry.generatedTitle;
    return typeof raw === "string" && name(raw) === variationName;
  }).sort((left, right) => activityTimestamp(right.date) - activityTimestamp(left.date));
}

/** A base exercise title is an aggregate request, not evidence of a variation. */
export function librarySelectedExerciseHistory(entries: readonly LocalExerciseStatEntry[], exercise: { id: unknown; name?: unknown; semanticVariationId?: unknown }, variationName?: unknown, variationId?: unknown, now = new Date()) {
  if (variationId != null && typeof variationId !== "string" || !id(variationId) && exercise.semanticVariationId != null && typeof exercise.semanticVariationId !== "string") return [];
  const selectedId = id(variationId) || exercise.semanticVariationId;
  const selectedName = name(variationName);
  const specific = Boolean(selectedId) || Boolean(selectedName && selectedName !== name(exercise.name));
  if (variationName != null && typeof variationName !== "string") return [];
  return libraryExerciseHistory(entries, { exerciseId: exercise.id, variationId: selectedId, variationName, scope: specific ? "variation" : "exercise" }, now);
}
