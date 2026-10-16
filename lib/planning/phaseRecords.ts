export type PhaseRecord = Record<string, unknown> & { id: string };
const object = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === "object" && !Array.isArray(value));
export function rawPhaseRecords(value: unknown): unknown[] {
  return Array.isArray(value) ? value : object(value) && Array.isArray(value.phases) ? value.phases : [];
}
export function phaseHasName(value: Record<string, unknown>) {
  return [value.name, value.phaseName, value.title].some(item => typeof item === "string" && item.trim().length > 0 || typeof item === "number" && Number.isFinite(item));
}
/** Read-only legacy identity projection. Ids become durable on the next successful save. */
export function phaseRecords(value: unknown): PhaseRecord[] {
  const rows = rawPhaseRecords(value);
  const reserved = new Set(rows.flatMap(row => object(row) && typeof row.id === "string" && row.id.trim() ? [row.id] : []));
  return rows.flatMap((row, index) => {
    if (!object(row)) return [];
    if (typeof row.id === "string" && row.id.trim()) return [{ ...row, id: row.id }];
    let id = `legacy-phase:${index}`;
    while (reserved.has(id)) id += ":legacy";
    reserved.add(id);
    return [{ ...row, id }];
  });
}
export function mergePhaseRecords(previous: unknown, next: unknown) {
  const originals = rawPhaseRecords(previous);
  if (previous != null && !object(previous) && !Array.isArray(previous) || object(previous) && previous.phases != null && !Array.isArray(previous.phases) || originals.some(row => !object(row) || row.id != null && typeof row.id !== "string") || !Array.isArray(next) || next.some(row => !object(row) || typeof row.id !== "string" || !row.id.trim())) {
    throw new Error("Phase records need review. Nothing was replaced; the original data is preserved.");
  }
  const source = phaseRecords(previous);
  if (new Set(source.map(row => row.id)).size !== source.length || new Set(next.map(row => row.id)).size !== next.length) {
    throw new Error("Phase identities need review. Nothing was replaced; the original data is preserved.");
  }
  const byId = new Map(source.map(row => [row.id, row]));
  const nextIds = new Set(next.map(row => row.id));
  // The page cannot edit unnamed records; their absence is not a deletion request.
  const hidden = source.filter(row => !phaseHasName(row) && !nextIds.has(row.id));
  const merged = [...next.map(row => ({ ...byId.get(row.id), ...row })), ...hidden];
  if (merged.filter(row => row.status === "active" || row.status == null && row.active === true).length > 1) throw new Error("More than one active phase needs review. Nothing was replaced; the original data is preserved.");
  return object(previous) ? { ...previous, phases: merged } : merged;
}
