export type Point = { x: number; y: number; z?: number; visibility?: number; presence?: number };
export type Result = { id: string; startedAt: number; completedAt: number; mode: "Assessment" | "Workout"; reps: number; minKneeAngle: number; maxKneeAngle: number; reliableSamples: number };

export function kneeAngle(a: Point, b: Point, c: Point, width: number, height: number): number | null {
  if (!(width > 0 && height > 0)) return null;
  const ax = (a.x - b.x) * width, ay = (a.y - b.y) * height;
  const bx = (c.x - b.x) * width, by = (c.y - b.y) * height;
  const length = Math.hypot(ax, ay) * Math.hypot(bx, by);
  if (!Number.isFinite(length) || length <= 0.000001) return null;
  return Math.acos(Math.max(-1, Math.min(1, (ax * bx + ay * by) / length))) * 180 / Math.PI;
}

/** Port of the Android counter: sustained standing → depth → standing; gaps reset partial reps. */
export class SquatCounter {
  reps = 0;
  phase = "Stand tall to begin";
  private stage: "standing" | "ready" | "down" = "standing";
  private since: number | null = null;
  private last: number | null = null;
  invalidate() { this.stage = "standing"; this.since = null; this.last = null; this.phase = "Stand tall to begin"; }
  update(angle: number | null, reliable: boolean, now: number) {
    if (!reliable || angle === null || !Number.isFinite(angle) || angle < 0 || angle > 180 ||
        (this.last !== null && (now <= this.last || now - this.last > 1000))) { this.invalidate(); return; }
    this.last = now;
    if (!(this.stage === "ready" ? angle < 105 : angle > 155)) { this.since = null; return; }
    if (this.since === null) { this.since = now; return; }
    if (now - this.since < 200) return;
    if (this.stage === "standing") this.stage = "ready";
    else if (this.stage === "ready") this.stage = "down";
    else { this.reps++; this.stage = "ready"; }
    this.phase = this.stage === "down" ? "Controlled depth" : "Ready position";
    this.since = null;
  }
}

export function analyzePose(points: Point[], width: number, height: number) {
  const reliable = [11, 12, 23, 24, 25, 26, 27, 28].every(i => {
    const p = points[i];
    return p && p.x >= 0.02 && p.x <= 0.98 && p.y >= 0.02 && p.y <= 0.98 &&
      (p.visibility ?? 0) >= 0.65 && (p.presence ?? 0) >= 0.65;
  });
  const left = points.length >= 33 ? kneeAngle(points[23], points[25], points[27], width, height) : null;
  const right = points.length >= 33 ? kneeAngle(points[24], points[26], points[28], width, height) : null;
  return { reliable: reliable && left !== null && right !== null, left, right };
}

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export function isResult(value: unknown): value is Result {
  if (!value || typeof value !== "object") return false;
  const r = value as Result;
  return Object.keys(r).length === 8 && typeof r.id === "string" && uuid.test(r.id) && (r.mode === "Assessment" || r.mode === "Workout") &&
    [r.startedAt, r.completedAt, r.reps, r.minKneeAngle, r.maxKneeAngle, r.reliableSamples].every(n => Number.isSafeInteger(n) && n >= 0) &&
    r.completedAt >= r.startedAt && r.minKneeAngle <= r.maxKneeAngle && r.maxKneeAngle <= 180 &&
    r.reps <= 2147483647 && r.reliableSamples > 0 && r.reliableSamples <= 2147483647;
}

export function historyKey(owner: string | null) {
  if (owner !== null && !uuid.test(owner)) throw Error("Invalid account identity.");
  return `sf-angles-web-v1:${owner ?? "guest"}`;
}
export function readHistory(storage: Pick<Storage, "getItem">, owner: string | null): Result[] {
  const raw = storage.getItem(historyKey(owner));
  if (!raw) return [];
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed) || !parsed.every(isResult) || new Set(parsed.map(r => r.id)).size !== parsed.length) {
    throw Error("History could not be read. Its original data has been preserved.");
  }
  return parsed;
}
export function saveResult(storage: Pick<Storage, "getItem" | "setItem">, owner: string | null, result: Result) {
  if (!isResult(result)) throw Error("No reliable assessment result to save.");
  const rows = readHistory(storage, owner);
  const existing = rows.find(r => r.id === result.id);
  if (existing) {
    if (!(Object.keys(result) as (keyof Result)[]).every(key => existing[key] === result[key])) throw Error("This session already has a different result.");
    return rows;
  }
  rows.push({ ...result });
  storage.setItem(historyKey(owner), JSON.stringify(rows));
  return rows;
}
