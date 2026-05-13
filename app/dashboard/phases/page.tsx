"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import TrainingJourneyNavigator from "@/components/dashboard/TrainingJourneyNavigator";
import { ROUTES } from "@/lib/routes";

type JsonObject = Record<string, unknown>;

type PhaseStatus = "active" | "draft" | "completed";

type PhaseDraft = {
  id: string;
  name: string;
  type: string;
  durationWeeks: string;
  primaryGoal: string;
  weeklyPlanSource: string;
  volumeTarget: string;
  intensityTarget: string;
  deloadWeek: string;
  testingWeek: string;
  status: PhaseStatus;
  createdAt: string;
  updatedAt: string;
};

type PhaseSnapshot = {
  activeGoal: string;
  activePlan: string;
  weeklySets: number;
  weeklyGoal: number;
  hotAreas: number;
  prSignals: number;
};

const phaseTypes = [
  "Foundation",
  "Hypertrophy",
  "Strength",
  "Power",
  "Performance",
  "Fat Loss",
  "Mobility / Recovery",
  "Deload",
  "Testing / PR",
] as const;

const safeJsonParse = (value: string | null): unknown => {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const asRecord = (value: unknown): JsonObject =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : {};

const readLocal = (key: string) =>
  typeof window === "undefined"
    ? null
    : safeJsonParse(window.localStorage.getItem(key));

const writeLocal = (key: string, value: unknown) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
};

const getString = (source: JsonObject, keys: string[], fallback: string) => {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) return value;
    if (typeof value === "number") return String(value);
  }
  return fallback;
};

const getNumber = (source: JsonObject, keys: string[], fallback: number) => {
  for (const key of keys) {
    const value = source[key];
    const parsed = typeof value === "number" ? value : Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
};

const createId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `phase-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

const createDefaultPhase = (snapshot: PhaseSnapshot): PhaseDraft => {
  const now = new Date().toISOString();
  const type =
    snapshot.activeGoal === "Build Muscle"
      ? "Hypertrophy"
      : snapshot.activeGoal === "Strength"
        ? "Strength"
        : snapshot.hotAreas > 0
          ? "Deload"
          : "Foundation";

  return {
    id: createId(),
    name: `${type} Block`,
    type,
    durationWeeks: "6",
    primaryGoal: snapshot.activeGoal,
    weeklyPlanSource: snapshot.activePlan,
    volumeTarget: String(snapshot.weeklyGoal || 48),
    intensityTarget: type === "Strength" ? "8" : type === "Deload" ? "4" : "7",
    deloadWeek: "5",
    testingWeek: "6",
    status: "draft",
    createdAt: now,
    updatedAt: now,
  };
};

const normalizePhase = (value: unknown): PhaseDraft | null => {
  const record = asRecord(value);
  const name = getString(record, ["name", "phaseName", "title"], "");
  if (!name) return null;
  const now = new Date().toISOString();
  const status = getString(record, ["status"], "draft") as PhaseStatus;

  return {
    id: getString(record, ["id"], createId()),
    name,
    type: getString(record, ["type", "phaseType"], "Foundation"),
    durationWeeks: getString(record, ["durationWeeks", "weeks"], "6"),
    primaryGoal: getString(record, ["primaryGoal", "goal"], "General Health"),
    weeklyPlanSource: getString(record, ["weeklyPlanSource", "plan"], "Current My Plan"),
    volumeTarget: getString(record, ["volumeTarget"], "48"),
    intensityTarget: getString(record, ["intensityTarget"], "7"),
    deloadWeek: getString(record, ["deloadWeek"], "5"),
    testingWeek: getString(record, ["testingWeek"], "6"),
    status: ["active", "draft", "completed"].includes(status) ? status : "draft",
    createdAt: getString(record, ["createdAt"], now),
    updatedAt: getString(record, ["updatedAt"], now),
  };
};

const readPhaseSnapshot = (): PhaseSnapshot => {
  const profile = asRecord(readLocal("soundFitnessProfile"));
  const goals = asRecord(readLocal("soundFitnessGoals"));
  const plan = asRecord(readLocal("soundFitnessPlan"));
  const planTitle = getString(plan, ["title", "name"], "Current My Plan");
  const stats = readLocal("soundFitnessExerciseStats");
  const entries = Array.isArray(stats) ? stats : Object.values(asRecord(stats));
  const weeklySets = entries.reduce((total, entry) => {
    const record = asRecord(entry);
    const sets = getNumber(record, ["weeklySets", "sets"], 0);
    return total + sets;
  }, 0);
  const weeklyGoal = getNumber(goals, ["targetWeeklySets"], 48);
  const hotAreas = entries.filter((entry) => {
    const record = asRecord(entry);
    const sets = getNumber(record, ["weeklySets", "sets"], 0);
    const goal = getNumber(record, ["weeklyGoal", "goal"], 12);
    return goal > 0 && sets >= goal;
  }).length;
  const prSignals = entries.filter((entry) => {
    const record = asRecord(entry);
    return Boolean(record.isPr || record.pr || record.personalRecord);
  }).length;

  return {
    activeGoal: getString(goals, ["primaryGoal"], getString(profile, ["primaryGoal", "goalMode"], "General Health")),
    activePlan: planTitle,
    weeklySets,
    weeklyGoal,
    hotAreas,
    prSignals,
  };
};

const readStoredPhases = (): PhaseDraft[] => {
  const stored = readLocal("soundFitnessPhases");
  const rawPhases = Array.isArray(stored)
    ? stored
    : Array.isArray(asRecord(stored).phases)
      ? (asRecord(stored).phases as unknown[])
      : [];

  return rawPhases
    .map(normalizePhase)
    .filter((phase): phase is PhaseDraft => Boolean(phase));
};

const getAdvice = (snapshot: PhaseSnapshot, draft: PhaseDraft) => {
  if (snapshot.hotAreas > 0 || draft.type === "Deload") {
    return "Recovery signal detected. A deload or mobility/recovery phase keeps the long-term plan moving without stacking fatigue.";
  }
  if (snapshot.weeklySets < snapshot.weeklyGoal * 0.4) {
    return "Total volume is still low. A Foundation block is the best first layer before chasing heavier specialization.";
  }
  if (snapshot.activeGoal === "Build Muscle") {
    return "A Hypertrophy block fits your goal: stable weekly volume, repeatable accessories, and enough recovery to adapt.";
  }
  if (snapshot.activeGoal === "Strength") {
    return "A Strength block fits: key patterns, heavier main work, longer recovery spacing, and a planned testing week.";
  }
  if (snapshot.prSignals > 0) {
    return "PR signals exist. Keep a testing week visible, but only after a clean build and recovery week.";
  }
  return "Foundation is the safest default: build consistency, then specialize the next phase from Progress data.";
};

function MetricCard({
  label,
  value,
  helper,
}: {
  helper: string;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 truncate text-lg font-black text-white">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{helper}</p>
    </div>
  );
}

function Field({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200">
        {label}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 min-h-[48px] w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm font-bold text-white outline-none transition focus:border-cyan-300"
      />
    </label>
  );
}

function SelectField({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: readonly string[];
  value: string;
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 min-h-[48px] w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm font-bold text-white outline-none transition focus:border-cyan-300"
      >
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

export default function PhasesPage() {
  const [snapshot, setSnapshot] = useState<PhaseSnapshot>(() => readPhaseSnapshot());
  const [phases, setPhases] = useState<PhaseDraft[]>([]);
  const [draft, setDraft] = useState<PhaseDraft>(() =>
    createDefaultPhase(readPhaseSnapshot()),
  );
  const [message, setMessage] = useState("");

  useEffect(() => {
    const nextSnapshot = readPhaseSnapshot();
    const storedPhases = readStoredPhases();
    setSnapshot(nextSnapshot);
    setPhases(storedPhases);
    setDraft(storedPhases.find((phase) => phase.status === "active") || createDefaultPhase(nextSnapshot));
  }, []);

  const activePhase = phases.find((phase) => phase.status === "active") || draft;
  const duration = Math.max(Number(activePhase.durationWeeks) || 1, 1);
  const activeWeek = Math.min(duration, 1);
  const completion = Math.round((activeWeek / duration) * 100);
  const advice = getAdvice(snapshot, draft);
  const weeks = useMemo(
    () =>
      Array.from({ length: Math.max(Number(draft.durationWeeks) || 1, 1) }, (_, index) => {
        const week = index + 1;
        return {
          week,
          focus:
            String(week) === draft.deloadWeek
              ? "Deload"
              : String(week) === draft.testingWeek
                ? "Testing / PR"
                : week === 1
                  ? "On-ramp"
                  : draft.type,
        };
      }),
    [draft],
  );

  const savePhases = (nextPhases: PhaseDraft[]) => {
    setPhases(nextPhases);
    writeLocal("soundFitnessPhases", nextPhases);
  };

  const updateDraft = <K extends keyof PhaseDraft>(key: K, value: PhaseDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value, updatedAt: new Date().toISOString() }));
    setMessage("");
  };

  const saveDraft = (status: PhaseStatus = draft.status) => {
    const nextDraft = {
      ...draft,
      status,
      updatedAt: new Date().toISOString(),
    };
    const nextPhases = [
      nextDraft,
      ...phases
        .filter((phase) => phase.id !== nextDraft.id)
        .map((phase) =>
          status === "active" && phase.status === "active"
            ? { ...phase, status: "draft" as PhaseStatus }
            : phase,
        ),
    ];
    savePhases(nextPhases);
    setDraft(nextDraft);
    setMessage(status === "active" ? "Phase saved and activated." : "Phase saved as draft.");
  };

  const duplicatePhase = (phase: PhaseDraft) => {
    const copy = {
      ...phase,
      id: createId(),
      name: `${phase.name} Copy`,
      status: "draft" as PhaseStatus,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    savePhases([copy, ...phases]);
    setDraft(copy);
    setMessage(`${copy.name} created.`);
  };

  const activatePhase = (phase: PhaseDraft) => {
    const nextPhase = {
      ...phase,
      status: "active" as PhaseStatus,
      updatedAt: new Date().toISOString(),
    };
    const nextPhases = [
      nextPhase,
      ...phases
        .filter((item) => item.id !== phase.id)
        .map((item) =>
          item.status === "active"
            ? { ...item, status: "draft" as PhaseStatus }
            : item,
        ),
    ];
    savePhases(nextPhases);
    setDraft(nextPhase);
    setMessage(`${phase.name} activated.`);
  };

  const deletePhase = (phaseId: string) => {
    const next = phases.filter((phase) => phase.id !== phaseId);
    savePhases(next);
    if (draft.id === phaseId) setDraft(createDefaultPhase(snapshot));
    setMessage("Phase removed.");
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_10%_0%,rgba(34,211,238,0.18),transparent_34%),radial-gradient(circle_at_88%_8%,rgba(251,191,36,0.15),transparent_32%),linear-gradient(180deg,#020617_0%,#0f172a_48%,#020617_100%)] text-white">
      <section className="mx-auto w-full max-w-[1440px] space-y-5 px-3 py-5 sm:px-5 lg:px-8">
        <TrainingJourneyNavigator currentStep="periodized-plan" variant="full" />

        <section className="overflow-hidden rounded-[34px] border border-white/10 bg-[radial-gradient(circle_at_18%_0%,rgba(34,211,238,0.20),transparent_34%),linear-gradient(135deg,rgba(15,23,42,0.94),rgba(2,6,23,0.98))] p-5 shadow-[0_30px_120px_rgba(0,0,0,0.62)] sm:p-6 lg:p-8">
          <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr] xl:items-stretch">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.3em] text-cyan-200">
                Long-Term Progression
              </p>
              <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
                🧠 Periodized Plan
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-300 sm:text-base">
                Build long-term progression through structured training phases.
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <MetricCard label="Active Phase" value={activePhase.name} helper={activePhase.type} />
                <MetricCard label="Phase Week" value={`${activeWeek} / ${duration}`} helper={`${completion}% complete`} />
                <MetricCard label="Next Deload" value={`Week ${activePhase.deloadWeek}`} helper="Adjust if recovery changes" />
                <MetricCard label="Testing Week" value={`Week ${activePhase.testingWeek}`} helper="PR or movement standard" />
                <MetricCard label="Weekly Volume" value={`${snapshot.weeklySets} / ${snapshot.weeklyGoal}`} helper="From logged stats when available" />
                <MetricCard label="Recovery Risk" value={snapshot.hotAreas ? `${snapshot.hotAreas} hot areas` : "Low"} helper="Feeds phase advice" />
              </div>
            </div>
            <div className="rounded-[30px] border border-amber-300/15 bg-amber-300/10 p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-100">
                Periodization Intelligence
              </p>
              <p className="mt-3 text-xl font-black leading-tight text-white">
                {advice}
              </p>
              <div className="mt-5 grid gap-2">
                <Link href={ROUTES.dashboard.plan} className="rounded-2xl bg-amber-300 px-5 py-3 text-center text-sm font-black uppercase tracking-[0.12em] text-slate-950 transition hover:bg-amber-200">
                  Open My Plan
                </Link>
                <Link href={ROUTES.dashboard.calendar} className="rounded-2xl border border-white/10 bg-white/[0.05] px-5 py-3 text-center text-sm font-black uppercase tracking-[0.12em] text-white transition hover:border-amber-200/40">
                  Send to Calendar
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[0.88fr_1.12fr]">
          <section className="rounded-[30px] border border-white/10 bg-slate-950/58 p-5 shadow-2xl">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-200">
              Phase Builder
            </p>
            <div className="mt-5 grid gap-4">
              <Field label="Phase Name" value={draft.name} onChange={(value) => updateDraft("name", value)} />
              <SelectField label="Phase Type" value={draft.type} options={phaseTypes} onChange={(value) => updateDraft("type", value)} />
              <Field label="Duration Weeks" value={draft.durationWeeks} onChange={(value) => updateDraft("durationWeeks", value)} />
              <Field label="Primary Goal" value={draft.primaryGoal} onChange={(value) => updateDraft("primaryGoal", value)} />
              <Field label="Weekly Plan Source" value={draft.weeklyPlanSource} onChange={(value) => updateDraft("weeklyPlanSource", value)} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Volume Target" value={draft.volumeTarget} onChange={(value) => updateDraft("volumeTarget", value)} />
                <Field label="Intensity Target" value={draft.intensityTarget} onChange={(value) => updateDraft("intensityTarget", value)} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Deload Week" value={draft.deloadWeek} onChange={(value) => updateDraft("deloadWeek", value)} />
                <Field label="Testing Week" value={draft.testingWeek} onChange={(value) => updateDraft("testingWeek", value)} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <button type="button" onClick={() => saveDraft("draft")} className="min-h-[46px] rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-5 py-3 text-sm font-black uppercase tracking-[0.12em] text-cyan-100 transition hover:bg-cyan-300 hover:text-slate-950">
                  Save Draft
                </button>
                <button type="button" onClick={() => saveDraft("active")} className="min-h-[46px] rounded-2xl bg-cyan-300 px-5 py-3 text-sm font-black uppercase tracking-[0.12em] text-slate-950 transition hover:bg-cyan-200">
                  Activate Phase
                </button>
              </div>
              {message ? (
                <p className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-4 py-3 text-sm font-bold text-emerald-100">
                  {message}
                </p>
              ) : null}
            </div>
          </section>

          <section className="rounded-[30px] border border-white/10 bg-slate-950/58 p-5 shadow-2xl">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-200">
              Phase Timeline
            </p>
            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {weeks.map((item) => (
                <article
                  key={item.week}
                  className={`rounded-[24px] border p-4 ${
                    item.focus === "Deload"
                      ? "border-emerald-300/25 bg-emerald-300/10"
                      : item.focus === "Testing / PR"
                        ? "border-amber-300/25 bg-amber-300/10"
                        : "border-white/10 bg-white/[0.045]"
                  }`}
                >
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                    Week {item.week}
                  </p>
                  <h3 className="mt-2 text-lg font-black text-white">{item.focus}</h3>
                  <div className="mt-3 grid gap-2 text-sm text-slate-300">
                    <p>Plan: {draft.weeklyPlanSource}</p>
                    <p>Volume target: {draft.volumeTarget} sets</p>
                    <p>Intensity target: {draft.intensityTarget} / 10</p>
                    <p>{item.focus === "Deload" ? "Recovery notes: reduce heat and restore movement quality." : "Recovery notes: monitor soreness and adjust from Progress."}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </section>

        <section className="grid gap-5 xl:grid-cols-[1fr_0.8fr]">
          <section className="rounded-[30px] border border-white/10 bg-slate-950/58 p-5 shadow-2xl">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-200">
              Phase Library
            </p>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {phases.length > 0 ? (
                phases.map((phase) => (
                  <article key={phase.id} className="rounded-[24px] border border-white/10 bg-white/[0.045] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-black text-white">{phase.name}</h3>
                        <p className="mt-1 text-sm text-slate-400">{phase.type} · {phase.durationWeeks} weeks</p>
                      </div>
                      <span className="rounded-full border border-white/10 bg-slate-950/50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-300">
                        {phase.status}
                      </span>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button type="button" onClick={() => setDraft(phase)} className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-black text-slate-200 transition hover:border-cyan-300/40">Edit</button>
                      <button type="button" onClick={() => activatePhase(phase)} className="rounded-xl border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-xs font-black text-cyan-100 transition hover:bg-cyan-300 hover:text-slate-950">Activate</button>
                      <button type="button" onClick={() => duplicatePhase(phase)} className="rounded-xl border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-xs font-black text-amber-100 transition hover:bg-amber-300 hover:text-slate-950">Duplicate</button>
                      <button type="button" onClick={() => deletePhase(phase.id)} className="rounded-xl border border-rose-300/20 bg-rose-300/10 px-3 py-2 text-xs font-black text-rose-100 transition hover:bg-rose-300 hover:text-slate-950">Delete</button>
                    </div>
                  </article>
                ))
              ) : (
                <div className="rounded-[24px] border border-dashed border-white/15 bg-white/[0.025] p-5 md:col-span-2">
                  <p className="font-black text-white">No saved phases yet</p>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    Save or activate the builder draft to create your first block.
                  </p>
                </div>
              )}
            </div>
          </section>

          <section className="rounded-[30px] border border-cyan-300/20 bg-cyan-300/10 p-5 shadow-2xl">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-100">
              Assign My Plan to Phase
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Pull the current weekly plan into this phase, then send phase weeks to Calendar for execution.
            </p>
            <div className="mt-5 grid gap-3">
              <button type="button" onClick={() => updateDraft("weeklyPlanSource", snapshot.activePlan)} className="min-h-[46px] rounded-2xl bg-cyan-300 px-5 py-3 text-sm font-black uppercase tracking-[0.12em] text-slate-950 transition hover:bg-cyan-200">
                Use Current My Plan
              </button>
              <Link href={ROUTES.dashboard.calendar} className="min-h-[46px] rounded-2xl border border-white/10 bg-white/[0.05] px-5 py-3 text-center text-sm font-black uppercase tracking-[0.12em] text-white transition hover:border-cyan-200/40">
                Send to Calendar
              </Link>
              <Link href={ROUTES.dashboard.stats} className="min-h-[46px] rounded-2xl border border-white/10 bg-white/[0.05] px-5 py-3 text-center text-sm font-black uppercase tracking-[0.12em] text-white transition hover:border-cyan-200/40">
                Open Progress
              </Link>
              <Link href={ROUTES.dashboard.plan} className="min-h-[46px] rounded-2xl border border-white/10 bg-white/[0.05] px-5 py-3 text-center text-sm font-black uppercase tracking-[0.12em] text-white transition hover:border-cyan-200/40">
                Open My Plan
              </Link>
            </div>
          </section>
        </section>
      </section>
    </main>
  );
}
