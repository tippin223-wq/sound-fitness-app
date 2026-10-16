export type LibraryCatalogIdentity = { id: string; name?: unknown; exerciseName?: unknown; generatedTitle?: unknown; semanticVariationName?: unknown; semanticVariation?: unknown };
const nameKey = (value: unknown) => typeof value === "string" ? value.trim().replace(/\s+/g, " ").toLowerCase() : "";
const idKey = (value: unknown) => typeof value === "string" ? value.trim() : "";

/** Null marks collisions; catalog order must never decide ownership of activity. */
export function createLibraryExerciseLookup<T extends LibraryCatalogIdentity>(exercises: readonly T[]) {
  const byId = new Map<string, T | null>(); const byName = new Map<string, T | null>();
  const add = (map: Map<string, T | null>, key: string, exercise: T) => {
    if (!key) return;
    if (!map.has(key)) map.set(key, exercise);
    else if (map.get(key) !== exercise) map.set(key, null);
  };
  for (const exercise of exercises) {
    if (!exercise || typeof exercise !== "object" || !idKey(exercise.id)) continue;
    add(byId, idKey(exercise.id), exercise);
    for (const name of [exercise.name, exercise.exerciseName, exercise.generatedTitle, exercise.semanticVariationName, exercise.semanticVariation]) add(byName, nameKey(name), exercise);
  }
  return { byId, byName };
}

export function resolveLibraryStatExercise<T extends LibraryCatalogIdentity>(value: unknown, lookup: ReturnType<typeof createLibraryExerciseLookup<T>>): T | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const stat = value as Record<string, unknown>;
  if (stat.exerciseId != null && (typeof stat.exerciseId !== "string" || stat.exerciseId.trim())) {
    // An explicit unknown or malformed ID cannot be replaced by a plausible name.
    return lookup.byId.get(idKey(stat.exerciseId)) || null;
  }
  let candidate: T | null = null;
  for (const field of ["exerciseName", "generatedTitle", "semanticVariationName"]) {
    const raw = stat[field];
    if (raw == null || typeof raw === "string" && !raw.trim()) continue;
    if (typeof raw !== "string") return null;
    const match = lookup.byName.get(nameKey(raw));
    if (!match || candidate && match !== candidate || lookup.byId.get(idKey(match.id)) !== match) return null;
    candidate = match;
  }
  return candidate;
}
