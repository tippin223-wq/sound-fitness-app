"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { getActiveWorkoutPlan, readWorkoutPlans } from "@/lib/localData/workoutPlanData";
import { readGoals, requireSavedGoals, goalIds, normalizeGoalId } from "@/lib/planning/goals";
import { savedPhaseContext, validatePhaseSchedule, phasePlanReference, validatePhasePlanLink, phaseRecordVersion, phaseWeeklyVolume, reviewedPhaseGoal, phaseRecoverySignals } from "@/lib/planning/phaseContext";
import { readAvailableWorkoutLogs } from "@/lib/planning/logs";
import { planningAccountGeneration, subscribePlanning, readAccountRecord, planningOwner, planningKeys, planningRecordVersion } from "@/lib/planning/store";
import { phaseRecords } from "@/lib/planning/phaseRecords";
import { commitPhaseRecords, undoPhaseRemoval, capturePhaseGoalEditor, assertPhaseGoalEditor, type PhaseUndo } from "@/lib/planning/phaseMutations";
import TrainingJourneyNavigator from "@/components/dashboard/TrainingJourneyNavigator";
import { ROUTES } from "@/lib/routes";

type JsonObject = Record<string, unknown>;

type PhaseStatus = "active" | "draft" | "completed";

type PhaseDraft = {
  startedAt?: string;
  id: string;
  name: string;
  type: string;
  durationWeeks: string;
  primaryGoal: string;
  weeklyPlanSource: string;
  weeklyPlanId?: string;
  volumeTarget: string;
  intensityTarget: string;
  deloadWeek: string;
  testingWeek: string;
  status: PhaseStatus;
  createdAt: string;
  updatedAt: string;
};

type PhaseSnapshot = {
  readinessReported: boolean;
  activeGoal: string;
  activePlan: string;
  activePlanId: string | null;
  weeklyPlans: ReturnType<typeof readWorkoutPlans>;
  weeklySets: number;
  weeklyGoal: number;
  hotAreas: number;
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

const readLocal = readAccountRecord;

const getString = (source: JsonObject, keys: string[], fallback: string) => {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) return value;
    if (typeof value === "number") return String(value);
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
        : "Foundation";

  return {
    id: createId(),
    name: `${type} Block`,
    type,
    durationWeeks: "6",
    primaryGoal: snapshot.activeGoal,
    weeklyPlanSource: snapshot.activePlan,
    weeklyPlanId: snapshot.activePlanId || undefined,
    volumeTarget: snapshot.weeklyGoal ? String(snapshot.weeklyGoal) : "",
    intensityTarget: type === "Strength" ? "8" : "7",
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
  const status = getString(record, ["status"], record.active === true ? "active" : "draft") as PhaseStatus;

  return {
    ...record,
    id: getString(record, ["id"], ""),
    startedAt: getString(record, ["startedAt", "startDate"], "") || undefined,
    weeklyPlanId: getString(record, ["weeklyPlanId"], "") || undefined,
    name,
    type: getString(record, ["type", "phaseType"], "Foundation"),
    durationWeeks: getString(record, ["durationWeeks", "weeks", "totalWeeks"], "6"),
    primaryGoal: normalizeGoalId(record.primaryGoal ?? record.goal) || getString(record, ["primaryGoal", "goal"], ""),
    weeklyPlanSource: getString(record, ["weeklyPlanSource", "plan"], "No active plan yet"),
    volumeTarget: getString(record, ["volumeTarget"], ""),
    intensityTarget: getString(record, ["intensityTarget"], "7"),
    deloadWeek: getString(record, ["deloadWeek"], "5"),
    testingWeek: getString(record, ["testingWeek"], "6"),
    status: ["active", "draft", "completed"].includes(status) ? status : "draft",
    createdAt: getString(record, ["createdAt"], ""),
    updatedAt: getString(record, ["updatedAt"], ""),
  };
};

const readPhaseSnapshot = (): PhaseSnapshot => {
  const profile = asRecord(readLocal("soundFitnessProfile"));
  const goals = readGoals();
  const plan = asRecord(getActiveWorkoutPlan());
  const planTitle = getString(plan, ["title", "name"], "No active plan yet");
  const { weeklySets, weeklyGoal } = phaseWeeklyVolume(readAvailableWorkoutLogs(), readLocal(planningKeys.goals) as Partial<ReturnType<typeof readGoals>>);
  const { readinessReported, hotAreas } = phaseRecoverySignals(profile.bodyStatus);

  return {
    readinessReported,
    activeGoal: weeklyGoal ? goals.primaryGoal || "" : "",
    activePlan: planTitle,
    activePlanId: typeof plan.id === "string" ? plan.id : null,
    weeklyPlans: readWorkoutPlans(),
    weeklySets,
    weeklyGoal,
    hotAreas,
  };
};

const readStoredPhases = (): PhaseDraft[] => {
  const stored = readLocal("soundFitnessPhases");
  return phaseRecords(stored)
    .map(normalizePhase)
    .filter((phase): phase is PhaseDraft => Boolean(phase));
};

const storedPhaseVersion = (id: string) => {
  return phaseRecordVersion(readLocal("soundFitnessPhases"), id);
};

const getAdvice = (snapshot: PhaseSnapshot, draft: PhaseDraft) => {
  if (!snapshot.weeklyGoal) return "Save your goals and weekly targets before choosing a training phase.";
  if (snapshot.hotAreas > 0 || draft.type === "Deload") {
    return "Review reported pain, soreness, and sleep with your coach before choosing phase demands. Logged set totals alone do not establish recovery needs.";
  }
  if (snapshot.weeklySets < snapshot.weeklyGoal * 0.4) {
    return "This week's logged volume is below the saved target. Review missing logs and your current plan before changing phase demands.";
  }
  if (snapshot.activeGoal === "Build Muscle") {
    return "A Hypertrophy block fits your goal: stable weekly volume, repeatable accessories, and enough recovery to adapt.";
  }
  if (snapshot.activeGoal === "Strength") {
    return "A Strength block fits: key patterns, heavier main work, longer recovery spacing, and a planned testing week.";
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
  const [libraryVersion, setLibraryVersion] = useState(() => planningRecordVersion(planningKeys.phases));
  const [undo, setUndo] = useState<PhaseUndo | null>(null);
  const account = planningOwner();
  const generation = planningAccountGeneration();
  const editedVersion = useRef<string | undefined>(undefined);
  const goalEditor = useRef(capturePhaseGoalEditor());

  useEffect(() => subscribePlanning(() => {
    setSnapshot(readPhaseSnapshot());
    setPhases(readStoredPhases());
    const version = planningRecordVersion(planningKeys.phases);
    setLibraryVersion(version);
    setUndo(current => current?.version === version && current.generation === planningAccountGeneration() ? current : null);
    // Keep the open builder intact while the saved library updates from sync.
  }), []);

  useEffect(() => {
    const nextSnapshot = readPhaseSnapshot();
    const storedPhases = readStoredPhases();
    setSnapshot(nextSnapshot);
    setPhases(storedPhases);
    setLibraryVersion(planningRecordVersion(planningKeys.phases));
    const initial = storedPhases.find((phase) => phase.status === "active") || createDefaultPhase(nextSnapshot);
    setDraft(initial);
    editedVersion.current = storedPhaseVersion(initial.id);
    goalEditor.current = capturePhaseGoalEditor();
  }, []);

  const savedActivePhase = phases.find((phase) => phase.status === "active");
  const activePhase = savedActivePhase || draft;
  const duration = Math.min(52, Math.max(Number(activePhase.durationWeeks) || 1, 1));
  const activeWeek = savedPhaseContext(null, phases).phaseWeek;
  const completion = Math.min(100, Math.round((activeWeek / duration) * 100));
  const advice = getAdvice(snapshot, draft);
  const draftReference = phasePlanReference(draft, snapshot.weeklyPlans);
  const weeks = useMemo(
    () =>
      Array.from({ length: Math.min(52, Math.max(Number(draft.durationWeeks) || 1, 1)) }, (_, index) => {
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
    try {
      const saved = commitPhaseRecords(nextPhases, account, libraryVersion, generation);
      setLibraryVersion(saved.version); setPhases(nextPhases); setUndo(null);
      return saved;
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Phase changes could not be saved. Your builder draft is still here.");
      return null;
    }
  };

  const updateDraft = <K extends keyof PhaseDraft>(key: K, value: PhaseDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value, updatedAt: new Date().toISOString() }));
    setMessage("");
  };

  const linkDraftPlan = (id: string) => {
    const plan = readWorkoutPlans().find(item => item.id === id && item.status !== "archived");
    setDraft(current => ({ ...current, weeklyPlanId: plan?.id, weeklyPlanSource: plan?.title || current.weeklyPlanSource, updatedAt: new Date().toISOString() }));
    setMessage("");
  };

  const useSavedGoals = () => {
    try {
      if (!goalEditor.current.account || goalEditor.current.account !== planningOwner() || goalEditor.current.generation !== planningAccountGeneration()) throw new Error("Your account changed. Reload Phases before updating this draft.");
      const editor = capturePhaseGoalEditor();
      const savedGoals = assertPhaseGoalEditor(editor);
      setDraft(current => ({ ...current, primaryGoal: savedGoals.primaryGoal || "", volumeTarget: savedGoals.targetWeeklySets || "", updatedAt: new Date().toISOString() }));
      goalEditor.current = editor;
      setMessage("Saved goal and weekly volume copied into this draft. Review its schedule before saving.");
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : "Save valid Goals before updating this draft."); }
  };

  const saveDraft = (status: PhaseStatus = draft.status) => {
    if (storedPhaseVersion(draft.id) !== editedVersion.current) { setMessage("This saved phase changed while you were editing. Your draft is preserved; use Edit in the Phase Library to review the latest saved version before replacing it."); return; }
    let primaryGoal: string;
    try { assertPhaseGoalEditor(goalEditor.current); primaryGoal = reviewedPhaseGoal(draft.primaryGoal); } catch (cause) { setMessage(cause instanceof Error ? cause.message : "Review your saved goals first."); return; }
    const error = validatePhaseSchedule(draft) || (status === "active" ? validatePhasePlanLink(draft, readWorkoutPlans()) : null);
    if (error) { setMessage(error); return; }
    const nextDraft = {
      ...draft,
      primaryGoal,
      weeklyPlanSource: phasePlanReference(draft, readWorkoutPlans()).status === "linked" ? phasePlanReference(draft, readWorkoutPlans()).label : draft.weeklyPlanSource,
      status,
      startedAt: status === "active" ? draft.status === "active" && draft.startedAt ? draft.startedAt : new Date().toISOString() : draft.startedAt,
      updatedAt: new Date().toISOString(),
    };
    const nextPhases = [
      nextDraft,
      ...readStoredPhases()
        .filter((phase) => phase.id !== nextDraft.id)
        .map((phase) =>
          status === "active" && phase.status === "active"
            ? { ...phase, status: "draft" as PhaseStatus }
            : phase,
        ),
    ];
    if (!savePhases(nextPhases)) return;
    setDraft(nextDraft);
    editedVersion.current = storedPhaseVersion(nextDraft.id);
    setMessage(status === "active" ? "Phase saved and activated." : "Phase saved as draft.");
  };

  const duplicatePhase = (phase: PhaseDraft) => {
    const copy = {
      ...phase,
      id: createId(),
      name: `${phase.name} Copy`,
      status: "draft" as PhaseStatus,
      startedAt: undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    if (!savePhases([copy, ...readStoredPhases()])) return;
    setDraft(copy);
    editedVersion.current = storedPhaseVersion(copy.id);
    goalEditor.current = capturePhaseGoalEditor();
    setMessage(`${copy.name} created.`);
  };

  const activatePhase = (phase: PhaseDraft) => {
    let primaryGoal: string;
    try { requireSavedGoals(); primaryGoal = reviewedPhaseGoal(phase.primaryGoal); } catch (cause) { setMessage(cause instanceof Error ? cause.message : "Save your goals first."); return; }
    const error = validatePhaseSchedule(phase) || validatePhasePlanLink(phase, readWorkoutPlans());
    if (error) { setMessage(error); return; }
    const nextPhase = {
      ...phase,
      primaryGoal,
      weeklyPlanSource: phasePlanReference(phase, readWorkoutPlans()).status === "linked" ? phasePlanReference(phase, readWorkoutPlans()).label : phase.weeklyPlanSource,
      status: "active" as PhaseStatus,
      startedAt: phase.status === "active" && phase.startedAt ? phase.startedAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const nextPhases = [
      nextPhase,
      ...readStoredPhases()
        .filter((item) => item.id !== phase.id)
        .map((item) =>
          item.status === "active"
            ? { ...item, status: "draft" as PhaseStatus }
            : item,
        ),
    ];
    if (!savePhases(nextPhases)) return;
    setDraft(nextPhase);
    editedVersion.current = storedPhaseVersion(nextPhase.id);
    goalEditor.current = capturePhaseGoalEditor();
    setMessage(`${phase.name} activated.`);
  };

  const deletePhase = (phaseId: string) => {
    const next = readStoredPhases().filter((phase) => phase.id !== phaseId);
    const saved = savePhases(next);
    if (!saved) return;
    setUndo(saved);
    if (draft.id === phaseId) { setDraft(createDefaultPhase(snapshot)); editedVersion.current = undefined; goalEditor.current = capturePhaseGoalEditor(); }
    setMessage("Phase removed. Undo is available on this page until reload or another saved phase change.");
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_10%_0%,rgba(34,211,238,0.18),transparent_34%),radial-gradient(circle_at_88%_8%,rgba(251,191,36,0.15),transparent_32%),linear-gradient(180deg,#020617_0%,#0f172a_48%,#020617_100%)] text-white">
      <section className="mx-auto w-full max-w-[1440px] space-y-5 px-3 py-5 sm:px-5 lg:px-8">
        <TrainingJourneyNavigator currentStep="periodized-plan" variant="full" />
        {undo && <div className="rounded-xl border border-amber-300/25 p-3 text-sm text-amber-100"><p>Phase removed. Undo restores the saved phase library before removal.</p><button type="button" className="mt-2 rounded-lg border border-white/20 px-3 py-2" onClick={() => {
          try { undoPhaseRemoval(undo); setUndo(null); setMessage("Phase removal undone. Review the builder before saving it again."); }
          catch (cause) { setMessage(cause instanceof Error ? cause.message : "Undo could not be saved. Try again."); }
        }}>Undo phase removal</button></div>}

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
                <MetricCard label="Active Phase" value={savedActivePhase?.name || "No active phase"} helper={savedActivePhase?.type || "Draft below is a preview"} />
                <MetricCard label="Phase Week" value={activeWeek ? `${activeWeek} / ${duration}` : "Not scheduled"} helper={activeWeek ? `${completion}% of scheduled duration elapsed` : "Activate a phase to start tracking"} />
                <MetricCard label="Next Deload" value={savedActivePhase?.deloadWeek ? `Week ${activePhase.deloadWeek}` : "Not scheduled"} helper="Saved phase schedule" />
                <MetricCard label="Testing Week" value={savedActivePhase?.testingWeek ? `Week ${activePhase.testingWeek}` : "Not scheduled"} helper="Saved phase schedule" />
                <MetricCard label="Weekly Volume" value={snapshot.weeklyGoal ? `${snapshot.weeklySets} / ${snapshot.weeklyGoal}` : `${snapshot.weeklySets} logged sets`} helper={snapshot.weeklyGoal ? "Current week / saved Goals target" : "Set your weekly target in Goals"} />
                <MetricCard label="Reported Readiness" value={!snapshot.readinessReported ? "Not reported" : snapshot.hotAreas ? "Review reported flags" : "No reported flags"} helper="Profile pain, soreness, and sleep" />
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
                <Link href={ROUTES.dashboard.myPlan} className="rounded-2xl bg-amber-300 px-5 py-3 text-center text-sm font-black uppercase tracking-[0.12em] text-slate-950 transition hover:bg-amber-200">
                  Open My Plan
                </Link>
                <Link href={ROUTES.dashboard.calendar} className="rounded-2xl border border-white/10 bg-white/[0.05] px-5 py-3 text-center text-sm font-black uppercase tracking-[0.12em] text-white transition hover:border-amber-200/40">
                  View Calendar
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
              <label className="block">
                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200">Primary Goal</span>
                <select value={draft.primaryGoal} onChange={event => updateDraft("primaryGoal", event.target.value)} className="mt-2 min-h-[48px] w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm font-bold text-white">
                  <option value="">Choose a goal</option>
                  {draft.primaryGoal && !normalizeGoalId(draft.primaryGoal) && <option value={draft.primaryGoal}>Needs review: {draft.primaryGoal}</option>}
                  {goalIds.map(goal => <option key={goal} value={goal}>{goal}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200">Linked Weekly Plan</span>
                <select value={draft.weeklyPlanId || ""} onChange={event => linkDraftPlan(event.target.value)} className="mt-2 min-h-[48px] w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm font-bold text-white">
                  <option value="">No linked plan · reference only</option>
                  {snapshot.weeklyPlans.filter(plan => plan.status !== "archived" || plan.id === draft.weeklyPlanId).map(plan => <option key={plan.id} value={plan.id}>{plan.title} · {plan.weekStartDate}{plan.status === "archived" ? " · archived" : ""}</option>)}
                  {draftReference.status === "missing" && <option value={draft.weeklyPlanId}>Unavailable saved plan</option>}
                </select>
              </label>
              {!draft.weeklyPlanId && <Field label="Plan Reference" value={draft.weeklyPlanSource} onChange={value => updateDraft("weeklyPlanSource", value)} />}
              <p className="text-xs text-slate-400">{draftReference.label} · {draftReference.status === "reference" ? "Name reference only; choose a saved plan to link it" : draftReference.status}</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Volume Target" value={draft.volumeTarget} onChange={(value) => updateDraft("volumeTarget", value)} />
                <Field label="Intensity Target" value={draft.intensityTarget} onChange={(value) => updateDraft("intensityTarget", value)} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Deload Week" value={draft.deloadWeek} onChange={(value) => updateDraft("deloadWeek", value)} />
                <Field label="Testing Week" value={draft.testingWeek} onChange={(value) => updateDraft("testingWeek", value)} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <button type="button" onClick={useSavedGoals} className="min-h-[46px] rounded-2xl border border-white/20 px-5 py-3 text-sm font-bold text-cyan-100 sm:col-span-2">Use saved Goals in this draft</button>
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
                    <p>Plan: {draftReference.label}</p>
                    <p>Volume target: {draft.volumeTarget ? `${draft.volumeTarget} sets` : "Not set"}</p>
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
                        <p className="mt-1 text-xs text-slate-400">Plan: {phasePlanReference(phase, snapshot.weeklyPlans).label} · {phasePlanReference(phase, snapshot.weeklyPlans).status}</p>
                      </div>
                      <span className="rounded-full border border-white/10 bg-slate-950/50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-300">
                        {phase.status}
                      </span>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button type="button" onClick={() => { setDraft(phase); editedVersion.current = storedPhaseVersion(phase.id); goalEditor.current = capturePhaseGoalEditor(); }} className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-black text-slate-200 transition hover:border-cyan-300/40">Edit</button>
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
              Link a saved weekly plan to this phase. The link follows plan renames and shows archived or removed plans. Schedule workouts in My Plan; scheduled assignments appear in Calendar.
            </p>
            <div className="mt-5 grid gap-3">
              <button type="button" disabled={!snapshot.activePlanId} onClick={() => linkDraftPlan(snapshot.activePlanId || "")} className="min-h-[46px] rounded-2xl bg-cyan-300 px-5 py-3 text-sm font-black uppercase tracking-[0.12em] text-slate-950 transition hover:bg-cyan-200">
                Use Current My Plan
              </button>
              <Link href={ROUTES.dashboard.calendar} className="min-h-[46px] rounded-2xl border border-white/10 bg-white/[0.05] px-5 py-3 text-center text-sm font-black uppercase tracking-[0.12em] text-white transition hover:border-cyan-200/40">
                View Calendar
              </Link>
              <Link href={ROUTES.dashboard.progress} className="min-h-[46px] rounded-2xl border border-white/10 bg-white/[0.05] px-5 py-3 text-center text-sm font-black uppercase tracking-[0.12em] text-white transition hover:border-cyan-200/40">
                Open Progress
              </Link>
              <Link href={ROUTES.dashboard.myPlan} className="min-h-[46px] rounded-2xl border border-white/10 bg-white/[0.05] px-5 py-3 text-center text-sm font-black uppercase tracking-[0.12em] text-white transition hover:border-cyan-200/40">
                Open My Plan
              </Link>
            </div>
          </section>
        </section>
      </section>
    </main>
  );
}
