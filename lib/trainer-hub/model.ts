export const HUB_BRAND = { name: "Trainer Hub", parent: "Sound Fitness", href: "/trainer-hub" } as const;
// Working offer; payment collection and access entitlements are not activated.
export const HUB_OFFER = { name: "The coaching foundation", price: 500, accessMonths: 24 } as const;
export const LESSON_IDS = ["first-client", "exercise-library", "program-design", "check-in", "coaching-offer", "weekly-review"] as const;

export type HubClient = { id: string; name: string; email: string; goal: string; status: "active" | "archived"; monthlyRate: number; notes: string };
export type HubMovement = { exerciseId: string; name: string; sets: number; reps: string; notes: string };
export type HubProgram = { id: string; title: string; description: string; movements: HubMovement[] };
export type HubAssignment = { id: string; clientId: string; programId: string; assignedAt: string };
export type HubCheckIn = { id: string; clientId: string; date: string; summary: string; nextAction: string };
export type HubDocument = {
  version: 1;
  business: { name: string; audience: string; offer: string; monthlyPrice: number };
  clients: HubClient[];
  programs: HubProgram[];
  assignments: HubAssignment[];
  checkIns: HubCheckIn[];
  completedLessons: string[];
  favoriteExercises: string[];
};
export type HubSnapshot = { document: HubDocument; revision: number };

export function emptyHub(): HubDocument {
  return { version: 1, business: { name: "", audience: "", offer: "", monthlyPrice: 0 }, clients: [], programs: [], assignments: [], checkIns: [], completedLessons: [], favoriteExercises: [] };
}

const record = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const text = (v: unknown, max: number, required = false): v is string => typeof v === "string" && v.length <= max && (!required || v.trim().length > 0);
const money = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 100000 && Math.abs(Math.round(v * 100) - v * 100) < 0.00001;
const id = (v: unknown): v is string => typeof v === "string" && /^[a-zA-Z0-9_-]{1,80}$/.test(v);
const rows = (v: unknown, max: number): v is Record<string, unknown>[] => Array.isArray(v) && v.length <= max && v.every(record);
const unique = (items: Record<string, unknown>[]) => new Set(items.map(v => v.id)).size === items.length;

/** Validate persisted originals; never repair or silently drop user records. */
export function hubDocumentIssue(value: unknown): string | null {
  if (!record(value) || value.version !== 1 || !record(value.business)) return "This workspace format is not supported.";
  const b = value.business;
  if (!text(b.name, 100) || !text(b.audience, 500) || !text(b.offer, 1500) || !money(b.monthlyPrice)) return "Check your practice name, offer, and monthly price.";
  if (!rows(value.clients, 1000) || !unique(value.clients)) return "The client list is invalid or has duplicate records.";
  for (const c of value.clients) {
    if (!id(c.id) || !text(c.name, 100, true) || !text(c.email, 254) || (c.email !== "" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email)) || !text(c.goal, 1000) || !text(c.notes, 3000) || !["active", "archived"].includes(c.status as string) || !money(c.monthlyRate)) return "Check the name, email, and monthly rate on each client.";
  }
  if (!rows(value.programs, 200) || !unique(value.programs)) return "The program list is invalid or has duplicate records.";
  for (const p of value.programs) {
    if (!id(p.id) || !text(p.title, 120, true) || !text(p.description, 2000) || !rows(p.movements, 50) || !p.movements.length) return "Programs need a title and at least one movement.";
    for (const m of p.movements) {
      if (!id(m.exerciseId) || !text(m.name, 160, true) || !Number.isInteger(m.sets) || Number(m.sets) < 1 || Number(m.sets) > 50 || !text(m.reps, 60, true) || !text(m.notes, 1000)) return "Each movement needs an exercise, 1–50 sets, and a reps or duration target.";
    }
  }
  const clients = new Set(value.clients.map(c => c.id));
  const programs = new Set(value.programs.map(p => p.id));
  if (!rows(value.assignments, 2000) || !unique(value.assignments)) return "The assignment list is invalid.";
  const pairs = new Set<string>();
  for (const a of value.assignments) {
    const pair = `${a.clientId}:${a.programId}`;
    if (!id(a.id) || !clients.has(a.clientId) || !programs.has(a.programId) || !text(a.assignedAt, 40) || !Number.isFinite(Date.parse(a.assignedAt)) || pairs.has(pair)) return "Assignments must link a saved client and program without duplicates.";
    pairs.add(pair);
  }
  if (!rows(value.checkIns, 2000) || !unique(value.checkIns)) return "The check-in list is invalid.";
  for (const c of value.checkIns) {
    if (!id(c.id) || !clients.has(c.clientId) || !text(c.date, 10) || !/^\d{4}-\d{2}-\d{2}$/.test(c.date) || !Number.isFinite(Date.parse(c.date)) || new Date(c.date).toISOString().slice(0, 10) !== c.date || !text(c.summary, 3000, true) || !text(c.nextAction, 1000)) return "Check-ins need a saved client, a real date, and a summary.";
  }
  if (!Array.isArray(value.completedLessons) || value.completedLessons.length > LESSON_IDS.length || new Set(value.completedLessons).size !== value.completedLessons.length || !value.completedLessons.every(v => LESSON_IDS.includes(v))) return "The lesson progress is invalid.";
  if (!Array.isArray(value.favoriteExercises) || value.favoriteExercises.length > 1000 || !value.favoriteExercises.every(id) || new Set(value.favoriteExercises).size !== value.favoriteExercises.length) return "The saved exercise list is invalid.";
  return null;
}

export function hubStats(document: HubDocument) {
  const active = document.clients.filter(c => c.status === "active");
  const assigned = new Set(document.assignments.map(a => a.clientId));
  return { activeClients: active.length, monthlyServiceValue: active.reduce((sum, c) => sum + c.monthlyRate, 0), clientsWithoutProgram: active.filter(c => !assigned.has(c.id)), completedLessons: document.completedLessons.length };
}

export function previewHub(): HubDocument {
  return {
    ...emptyHub(),
    business: { name: "Your coaching studio", audience: "Busy people building a consistent training routine", offer: "Personal programming and a weekly coaching check-in", monthlyPrice: 200 },
    clients: [
      { id: "preview-maya", name: "Maya Chen", email: "", goal: "Build a consistent strength routine", status: "active", monthlyRate: 200, notes: "Sample client. Prefers short sessions and dumbbells." },
      { id: "preview-jordan", name: "Jordan Ellis", email: "", goal: "Return to a regular gym schedule", status: "active", monthlyRate: 200, notes: "Sample client. Discuss available equipment before programming." },
      { id: "preview-sam", name: "Sam Rivera", email: "", goal: "Get comfortable with foundational movements", status: "active", monthlyRate: 150, notes: "Sample client. Start by agreeing on a realistic weekly schedule." },
    ],
    programs: [{ id: "preview-foundations", title: "Strength foundations", description: "Example template for reviewing the builder. Adapt it to the client before use.", movements: [{ exerciseId: "goblet-squat", name: "Goblet Squat", sets: 3, reps: "8–10", notes: "Choose an appropriate load with the client." }, { exerciseId: "incline-push-up", name: "Incline Push-Up", sets: 3, reps: "6–10", notes: "Adjust the incline to the client." }, { exerciseId: "dead-bug", name: "Dead Bug", sets: 2, reps: "6 each side", notes: "Prioritize control." }] }],
    assignments: [{ id: "preview-assignment", clientId: "preview-maya", programId: "preview-foundations", assignedAt: "2026-10-12T12:00:00Z" }],
    completedLessons: ["first-client"], favoriteExercises: ["goblet-squat", "dead-bug"],
  };
}
