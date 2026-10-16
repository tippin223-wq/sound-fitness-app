"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { inspectWorkoutPlans, saveWorkoutPlanConfiguration, capturePlanEditor, exportPlanConfigurationDraft, type PlanEditor } from "@/lib/localData/workoutPlanData";
import { readWorkoutBuilderTemplates } from "@/lib/localData/workoutBuilderData";
import { readPlanDraftArchives, exportPlanDraftArchive, planDraftArchiveReviewJson, type PlanDraftArchiveEditor } from "@/lib/planning/planDraftArchives";
import PlanRecommendationCard from "@/components/dashboard/PlanRecommendationCard";
import { readSoundFitnessProfileRecord } from "@/lib/profile-storage";
import { recommendPlan, type RecommendationProfile } from "@/lib/planning/recommendation";
import { readGoals, goalIds, savedGoalsIssue } from "@/lib/planning/goals";
import { planningKeys, planningSnapshot, readPlanning, subscribePlanning } from "@/lib/planning/store";
import { ROUTES } from "@/lib/routes";
import { capturePlanDraftEditor, keepPlanDraft, restorePlanDraft, exportSavedPlanDraft, discardPlanDraft, planDraftPresent, previewPlanDraftImport, confirmPlanDraftImport, type PlanDraftEditor, type PlanFormDraft } from "@/lib/planning/planEditorDraft";
import { createPlanDraftAutosave } from "@/lib/planning/planDraftAutosave";

type Step = "identity" | "structure" | "focus" | "execution" | "rules";

const choices = {
  goal: [...goalIds],
  phase: ["Foundation", "Build", "Peak", "Deload"],
  split: [
    "Full Body",
    "Upper / Lower",
    "Push / Pull / Legs",
    "Strength + Mobility",
    "Flexible",
  ],
  weeklyTarget: [
    "1 workout",
    "2 workouts",
    "3 workouts",
    "4 workouts",
    "5 workouts",
    "6 workouts",
    "7 workouts",
  ],
  progression: [
    "Add Reps First",
    "Add Weight First",
    "Double Progression",
    "Coach Controlled",
  ],
};

const suggestedFocusByGoal: Record<string, string[]> = {
  "Strength": ["Strength", "Technique", "Power", "Core"],
  "Build Muscle": ["Hypertrophy", "Strength", "Volume", "Upper Body"],
  "Lose Fat": ["Conditioning", "Full Body", "Core", "Mobility"],
  "Mobility": ["Mobility", "Recovery", "Core", "Technique"],
  "Performance": ["Power", "Strength", "Conditioning", "Technique"],
  "Recovery": ["Technique", "Mobility", "Recovery", "Strength"],
  "Maintain": ["Full Body", "Strength", "Mobility", "Core"],
  "General Health": ["Full Body", "Mobility", "Conditioning", "Core"],
  "Conditioning": ["Conditioning", "Full Body", "Core", "Mobility"],
};

const workoutFocusOptions = [
  "Strength",
  "Hypertrophy",
  "Mobility",
  "Conditioning",
  "Core",
  "Recovery",
  "Technique",
  "Power",
  "Volume",
  "Upper Body",
  "Full Body",
];

const dayNames = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

  function ChoiceGrid({
    value,
    items,
    onSelect,
  }: {
    value: string;
    items: string[];
    onSelect: (value: string) => void;
  }) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const active = value === item;

          return (
            <button
              key={item}
              type="button"
              onClick={() => onSelect(item)}
              className={`rounded-2xl border p-4 text-left transition ${
                active
                  ? "border-emerald-300 bg-emerald-400/15 shadow-[0_0_28px_rgba(52,211,153,0.18)]"
                  : "border-white/10 bg-slate-950/60 hover:border-cyan-300/40 hover:bg-white/[0.06]"
              }`}
            >
              <p className="font-black text-white">{item}</p>
              <p className="mt-2 text-xs leading-5 text-slate-400">
                {active ? "Selected" : "Tap to choose"}
              </p>
            </button>
          );
        })}
      </div>
    );
  }

export default function CreatePlanPage() {
  useSyncExternalStore(subscribePlanning, planningSnapshot, planningSnapshot);
  const goalsIssue = savedGoalsIssue(readPlanning(planningKeys.goals, {}));
  const planRecovery = inspectWorkoutPlans();
  const [step, setStep] = useState<Step>("identity");
  const [saved, setSaved] = useState(false);
  const [saveSummary, setSaveSummary] = useState<ReturnType<typeof saveWorkoutPlanConfiguration>["assignmentSummary"] | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [weekStart, setWeekStart] = useState("");
  const [error, setError] = useState("");
  const [draftExportStatus, setDraftExportStatus] = useState("");
  const [confirmDiscardDraft, setConfirmDiscardDraft] = useState(false);
  const [assignMatches, setAssignMatches] = useState(false);
  const [importPreview, setImportPreview] = useState<ReturnType<typeof previewPlanDraftImport> | null>(null);
  const importRequestRef = useRef(0);
  const [autosaveEnabled, setAutosaveEnabled] = useState(false);
  const [autosaveStatus, setAutosaveStatus] = useState("Draft autosave is off.");
  const [lastAutosavedForm, setLastAutosavedForm] = useState("");
  const autosaveRef = useRef<ReturnType<typeof createPlanDraftAutosave> | null>(null);
  const editorRef = useRef<PlanEditor | null>(null);
  const draftEditorRef = useRef<PlanDraftEditor | null>(null);
  const recommendationInputsRef = useRef<{ templates: ReturnType<typeof readWorkoutBuilderTemplates>; profile: RecommendationProfile } | null>(null);

  const [plan, setPlan] = useState({
    planName: "Strength + Mobility Plan",
    createdBy: "You",
    goal: "Strength",
    phase: "Foundation",
    split: "Flexible",
    weeklyTarget: "4 workouts",
    primaryFocus: "Strength",
    secondaryFocus: "Core Stability",
    progression: "Double Progression",
    notes:
      "Prioritize clean reps, consistency, and recovery before adding intensity.",
  });

  const weeklyWorkoutCount = Number(plan.weeklyTarget.split(" ")[0]) || 4;

  const [trainingDays, setTrainingDays] = useState(
    dayNames.map((day, index) => ({
      day,
      title:
        index === 0
          ? "Lower Body Strength"
          : index === 1
            ? "Upper Body Strength"
            : index === 2
              ? "Mobility + Core"
              : "Full Body Strength",
      focus: index === 2 ? "Mobility" : "Strength",
      notes: "",
    })),
  );

  const draftFormJson = JSON.stringify({ savedPlanId: savedId, weekStartDate: weekStart, plan, trainingDays, assignMatches, step });
  useEffect(() => {
    if (!autosaveEnabled || !autosaveRef.current || !editorRef.current) return;
    autosaveRef.current.queue(JSON.parse(draftFormJson) as PlanFormDraft, editorRef.current);
  }, [autosaveEnabled, draftFormJson]);

  useEffect(() => {
    if (!autosaveEnabled) return;
    const flush = () => { autosaveRef.current?.flush(); };
    const onVisibility = () => { if (document.visibilityState === "hidden") flush(); };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVisibility);
    return () => { window.removeEventListener("pagehide", flush); document.removeEventListener("visibilitychange", onVisibility); };
  }, [autosaveEnabled]);

  useEffect(() => () => { autosaveRef.current?.flush(); autosaveRef.current?.stop(); }, []);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("plan");
    const inspected = inspectWorkoutPlans();
    const existing = inspected.plans.find(item => item.id === id);
    editorRef.current = capturePlanEditor(existing);
    draftEditorRef.current = capturePlanDraftEditor();
    recommendationInputsRef.current = { templates: readWorkoutBuilderTemplates(), profile: readSoundFitnessProfileRecord() as RecommendationProfile };
    if (inspected.issue) {
      if (id) setSavedId(id);
      setError(inspected.issue);
      return () => { importRequestRef.current += 1; };
    }
    if (id && !existing) { setSavedId(id); setError("This plan is no longer available. Open My Plan to select a current week."); }
    const goals = savedGoalsIssue(readPlanning(planningKeys.goals, {})) ? null : readGoals();
    if (existing) {
      setSavedId(existing.id); setWeekStart(existing.weekStartDate);
      setPlan(current => ({ ...current, ...existing.settings, planName: existing.title, goal: existing.goal }));
      const existingSlots = [...existing.days.filter(day => day.kind !== "rest"), ...existing.days.filter(day => day.kind === "rest")].map(day => ({ day: day.dayOfWeek || dayNames[(new Date(`${day.date}T12:00:00`).getDay() + 6) % 7], title: day.title ?? day.focus, focus: day.focus, notes: day.notes }));
      setTrainingDays([...existingSlots, ...dayNames.filter(day => !existingSlots.some(slot => slot.day === day)).map(day => ({ day, title: "", focus: existing.settings?.primaryFocus || "Strength", notes: "" }))]);
    } else if (goals?.primaryGoal) {
      const rec = recommendPlan(readSoundFitnessProfileRecord() as RecommendationProfile, goals);
      if (new URLSearchParams(window.location.search).get("recommended") === "1") {
        setPlan(current => ({ ...current, planName: rec.title, goal: goals.primaryGoal!, split: rec.split, phase: rec.phase, primaryFocus: rec.primaryFocus, secondaryFocus: rec.secondaryFocus, progression: rec.progression, notes: rec.notes, weeklyTarget: rec.sessions + " workouts" }));
        setTrainingDays([...rec.days.filter(day => day.training), ...rec.days.filter(day => !day.training)].map(day => ({ day: day.day, title: day.focus, focus: day.focus, notes: day.notes })));
      } else setPlan(current => ({ ...current, goal: goals.primaryGoal!, weeklyTarget: (goals.targetWeeklySessions || "4") + " workouts" }));
    }
    return () => { importRequestRef.current += 1; };
  }, []);

  function savePlan() {
    pauseDraftAutosave();
    setImportPreview(null); importRequestRef.current += 1;
    try {
      if (!editorRef.current || !recommendationInputsRef.current) throw new Error("Wait for your saved planning data to load before saving.");
      const result = saveWorkoutPlanConfiguration({
        planId: savedId, title: plan.planName, goal: plan.goal, weekStartDate: weekStart,
        editor: editorRef.current, assignMatches,
        ...recommendationInputsRef.current,
        settings: { createdBy: plan.createdBy, split: plan.split, weeklyTarget: plan.weeklyTarget, primaryFocus: plan.primaryFocus, secondaryFocus: plan.secondaryFocus, progression: plan.progression, phase: plan.phase, notes: plan.notes },
        trainingDays: visibleTrainingDays,
      });
      setSavedId(result.plan.id); setWeekStart(result.plan.weekStartDate);
      editorRef.current = capturePlanEditor(result.plan);
      setSaveSummary(result.assignmentSummary);
      setSaved(true); setError("");
    } catch (cause) { setSaved(false); setError(cause instanceof Error ? cause.message : "Plan could not be saved."); }
  }

  const suggestedPrimaryFocus =
    suggestedFocusByGoal[plan.goal] || suggestedFocusByGoal["Strength"];

  const visibleTrainingDays = trainingDays.slice(0, weeklyWorkoutCount);

  function downloadDraft(json: string) {
    const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
    const anchor = document.createElement("a");
    try { anchor.href = url; anchor.download = "sound-fitness-plan-draft.json"; anchor.click(); }
    finally { URL.revokeObjectURL(url); }
  }

  function handleSavedDraft(action: "keep" | "restore" | "export" | "discard") {
    pauseDraftAutosave();
    setImportPreview(null); importRequestRef.current += 1;
    setConfirmDiscardDraft(false);
    try {
      if (!editorRef.current || !draftEditorRef.current) throw new Error("Wait for your planning account to load.");
      if (action === "keep") {
        draftEditorRef.current = keepPlanDraft({ savedPlanId: savedId, weekStartDate: weekStart, plan, trainingDays, assignMatches, step }, editorRef.current, draftEditorRef.current);
        setDraftExportStatus("Draft kept for this account. Use Restore saved draft after returning. Save Plan remains a separate action.");
      } else if (action === "restore") {
        const draft = restorePlanDraft(draftEditorRef.current);
        const form = draft.form;
        setPlan(form.plan); setTrainingDays(form.trainingDays); setSavedId(form.savedPlanId); setWeekStart(form.weekStartDate);
        setAssignMatches(form.assignMatches); setStep(form.step); editorRef.current = draft.editor;
        setSaved(false); setSaveSummary(null); setError("");
        setDraftExportStatus("Saved draft restored into the form. Review your choices, then Save Plan when ready.");
      } else if (action === "discard") {
        draftEditorRef.current = discardPlanDraft(draftEditorRef.current);
        setConfirmDiscardDraft(false);
        setDraftExportStatus("Saved draft discarded. Your open form and saved plans are unchanged.");
      } else {
        downloadDraft(exportSavedPlanDraft(draftEditorRef.current));
        setDraftExportStatus("Saved draft download requested for review. Your open form and saved plans are unchanged.");
      }
    } catch (cause) { setDraftExportStatus(cause instanceof Error ? cause.message : "Saved draft is unavailable. Your open form is preserved."); }
  }

  function exportDraft() {
    try {
      if (!editorRef.current) throw new Error("Wait for your planning account to load before exporting.");
      const json = exportPlanConfigurationDraft({ savedPlanId: savedId, weekStartDate: weekStart, plan, trainingDays, assignMatches, step }, editorRef.current);
      downloadDraft(json);
      setDraftExportStatus("Draft download requested. This file preserves the open form for review; it does not save or activate a plan.");
    } catch (cause) { setDraftExportStatus(cause instanceof Error ? cause.message : "Draft export is unavailable. Your form is preserved."); }
  }

  function openForm(): PlanFormDraft {
    return { savedPlanId: savedId, weekStartDate: weekStart, plan, trainingDays, assignMatches, step };
  }

  function pauseDraftAutosave() {
    autosaveRef.current?.stop(); autosaveRef.current = null;
    setAutosaveEnabled(false); setAutosaveStatus("Draft autosave is off. Your open form is available to keep or export.");
  }

  function toggleDraftAutosave() {
    if (autosaveEnabled) {
      const savedLatest = autosaveRef.current?.flush();
      autosaveRef.current?.stop(); autosaveRef.current = null; setAutosaveEnabled(false);
      if (savedLatest) setAutosaveStatus("Draft autosave paused. Latest queued edits were kept locally.");
      return;
    }
    try {
      if (!editorRef.current || !draftEditorRef.current) throw new Error("Wait for your planning account to load.");
      setImportPreview(null); importRequestRef.current += 1; setConfirmDiscardDraft(false);
      const controller = createPlanDraftAutosave(draftEditorRef.current, {
        saved: (editor, form) => { draftEditorRef.current = editor; setLastAutosavedForm(JSON.stringify(form)); setAutosaveStatus("Draft kept locally. Cloud sync status appears above."); },
        failed: message => { setAutosaveEnabled(false); setAutosaveStatus(`Autosave stopped: ${message} Your open form is preserved; export it before leaving.`); },
      });
      autosaveRef.current = controller;
      controller.queue(openForm(), editorRef.current);
      if (controller.flush()) setAutosaveEnabled(true);
    } catch (cause) { pauseDraftAutosave(); setAutosaveStatus(cause instanceof Error ? cause.message : "Autosave could not start. Export your open form."); }
  }

  async function previewDraftFile(file: File) {
    pauseDraftAutosave();
    const request = ++importRequestRef.current;
    setImportPreview(null); setConfirmDiscardDraft(false);
    try {
      if (!editorRef.current || !draftEditorRef.current) throw new Error("Wait for your planning account to load.");
      if (file.size > 200000) throw new Error("Choose a plan draft JSON file under 200 KB.");
      const originalForm = openForm();
      const editor = editorRef.current; const draftEditor = draftEditorRef.current;
      const json = await file.text();
      if (request !== importRequestRef.current) return;
      setImportPreview(previewPlanDraftImport(json, originalForm, editor, draftEditor));
      setDraftExportStatus("Import preview ready. Your open form has not changed.");
    } catch (cause) {
      if (request === importRequestRef.current) setDraftExportStatus(cause instanceof Error ? cause.message : "Draft import is unavailable. Your open form is preserved.");
    }
  }

  function handleArchivedDraft(archive: PlanDraftArchiveEditor, action: "export" | "review") {
    pauseDraftAutosave();
    setImportPreview(null); importRequestRef.current += 1;
    setConfirmDiscardDraft(false);
    try {
      if (action === "export") {
        downloadDraft(exportPlanDraftArchive(archive));
        setDraftExportStatus("Exact archived draft download requested. Your open form and saved records are unchanged.");
      } else {
        if (!editorRef.current || !draftEditorRef.current) throw new Error("Wait for your planning account to load.");
        setImportPreview(previewPlanDraftImport(planDraftArchiveReviewJson(archive), openForm(), editorRef.current, draftEditorRef.current, archive));
        setDraftExportStatus("Archived draft preview ready. Review the preview before replacing your open form as a new plan.");
      }
    } catch (cause) { setDraftExportStatus(cause instanceof Error ? cause.message : "Archived draft is unavailable. Your open form is preserved."); }
  }

  function applyImportedDraft() {
    try {
      if (!importPreview) return;
      const form = confirmPlanDraftImport(importPreview, openForm());
      setPlan(form.plan); setTrainingDays(form.trainingDays); setSavedId(null); setWeekStart(form.weekStartDate);
      setAssignMatches(false); setStep(form.step); editorRef.current = { ...importPreview.editor, displayedPlan: undefined };
      setSaved(false); setSaveSummary(null); setError(""); setImportPreview(null);
      setDraftExportStatus("Draft loaded as a new plan. Review current Goals, dates, workouts and workload before Save Plan. Matching workouts is off until you choose it.");
    } catch (cause) { setDraftExportStatus(cause instanceof Error ? cause.message : "Draft could not be loaded. Your open form is preserved."); }
  }

  function update(field: keyof typeof plan, value: string) {
    setSaved(false);

    setPlan((prev) => {
      if (field === "goal") {
        const nextSuggestedFocus =
          suggestedFocusByGoal[value]?.[0] || prev.primaryFocus;

        return {
          ...prev,
          goal: value,
          primaryFocus: nextSuggestedFocus,
        };
      }

      return { ...prev, [field]: value };
    });
  }

  function updateTrainingDay(
    index: number,
    field: "day" | "title" | "focus" | "notes",
    value: string,
  ) {
    setSaved(false);
    setTrainingDays((prev) =>
      prev.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    );
  }

  const archivedDrafts = readPlanDraftArchives();
  const inputClass =
    "mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none focus:border-emerald-400";

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.16),_transparent_30%),linear-gradient(180deg,#020617_0%,#0f172a_100%)] text-white">
      {planRecovery.issue && <aside role="alert" className="rounded-2xl border border-amber-300/30 p-4 text-amber-200">
        <p>{planRecovery.issue}</p><p className="mt-2">Save Plan is paused. Copy or export your unfinished form before leaving; original plan weeks remain saved.</p>
        <Link href="/dashboard/calendar" className="mt-3 block underline">Review and export original plans in Calendar</Link>
      </aside>}
      <section className="mx-auto grid w-full max-w-[1120px] gap-6 px-4 py-8 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <PlanRecommendationCard />
          <label className="flex items-center gap-3 rounded-2xl border border-white/10 p-4 text-sm"><input type="checkbox" checked={assignMatches} onChange={event => { setAssignMatches(event.target.checked); setSaved(false); }} />Assign matching saved workouts to empty training days when saving. Selection requires matching exercise names or tags and confirmed equipment; review exercises and workload before training.</label>
          <section className="rounded-[40px] border border-white/10 bg-[radial-gradient(circle_at_18%_8%,rgba(52,211,153,0.18),transparent_32%),linear-gradient(135deg,rgba(15,23,42,0.96),rgba(2,6,23,0.98))] p-6 shadow-2xl lg:p-8">
            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-emerald-300">
              Create Plan
            </p>

            <h1 className="mt-4 text-4xl font-black lg:text-5xl">
              Build a training week.
            </h1>

            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300">
              Choose the goal first, then the app suggests a smarter focus for
              the plan.
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              {[
                ["identity", "1. Identity"],
                ["structure", "2. Structure"],
                ["focus", "3. Focus"],
                ["execution", "4. Training Week"],
                ["rules", "5. Rules"],
              ].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setStep(key as Step)}
                  className={`rounded-2xl px-4 py-2 text-xs font-black uppercase tracking-[0.13em] transition ${
                    step === key
                      ? "bg-cyan-400 text-slate-950"
                      : "border border-white/10 bg-white/[0.04] text-slate-300 hover:border-cyan-300/40"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-[36px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl">
            {step === "identity" && (
              <div className="space-y-6">
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-cyan-300">
                  Plan Identity
                </p>

                <label className="block text-sm font-bold text-slate-300">
                  Plan Name
                  <input
                    value={plan.planName}
                    onChange={(e) => update("planName", e.target.value)}
                    className={inputClass}
                  />
                </label>

                <label className="block text-sm font-bold text-slate-300">
                  Created By
                  <input
                    value={plan.createdBy}
                    onChange={(e) => update("createdBy", e.target.value)}
                    className={inputClass}
                  />
                </label>

                <div>
                  <p className="mb-3 text-sm font-bold text-slate-300">Goal</p>
                  <ChoiceGrid value={plan.goal} onSelect={value => update("goal", value)} items={choices.goal} />
                </div>

                <div>
                  <p className="mb-3 text-sm font-bold text-slate-300">Phase</p>
                  <ChoiceGrid value={plan.phase} onSelect={value => update("phase", value)} items={choices.phase} />
                </div>
              </div>
            )}

            {step === "structure" && (
              <div className="space-y-6">
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-emerald-300">
                  Weekly Structure
                </p>

                <div>
                  <p className="mb-3 text-sm font-bold text-slate-300">
                    Training Split
                  </p>
                  <ChoiceGrid value={plan.split} onSelect={value => update("split", value)} items={choices.split} />
                </div>

                <div>
                  <p className="mb-3 text-sm font-bold text-slate-300">
                    Workouts Per Week
                  </p>
                  <ChoiceGrid
                    value={plan.weeklyTarget} onSelect={value => update("weeklyTarget", value)}
                    items={choices.weeklyTarget}
                  />
                </div>
              </div>
            )}

            {step === "focus" && (
              <div className="space-y-6">
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-amber-300">
                  Training Focus
                </p>

                <div className="rounded-[28px] border border-cyan-300/15 bg-cyan-400/10 p-5">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">
                    Goal-Based Suggestions
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    Because the goal is{" "}
                    <span className="font-black text-white">{plan.goal}</span>,
                    these are the best focus options to start with.
                  </p>
                </div>

                <div>
                  <p className="mb-3 text-sm font-bold text-slate-300">
                    Suggested Primary Focus
                  </p>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {suggestedPrimaryFocus.map((item) => {
                      const active = plan.primaryFocus === item;

                      return (
                        <button
                          key={item}
                          type="button"
                          onClick={() => update("primaryFocus", item)}
                          className={`rounded-2xl border p-4 text-left transition ${
                            active
                              ? "border-emerald-300 bg-emerald-400/15 shadow-[0_0_28px_rgba(52,211,153,0.18)]"
                              : "border-white/10 bg-slate-950/60 hover:border-cyan-300/40 hover:bg-white/[0.06]"
                          }`}
                        >
                          <p className="font-black text-white">{item}</p>
                          <p className="mt-2 text-xs leading-5 text-slate-400">
                            {active ? "Selected" : "Suggested"}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <label className="block text-sm font-bold text-slate-300">
                  Secondary Focus
                  <input
                    value={plan.secondaryFocus}
                    onChange={(e) => update("secondaryFocus", e.target.value)}
                    className={inputClass}
                    placeholder="Example: core stability, mobility, conditioning"
                  />
                </label>
              </div>
            )}

            {step === "execution" && (
              <div className="space-y-6">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.24em] text-sky-300">
                    Training Week
                  </p>
                  <h2 className="mt-3 text-2xl font-black">
                    {weeklyWorkoutCount} workouts per week
                  </h2>
                  <p className="mt-2 text-sm text-slate-400">
                    Change the workout count in Structure. This section will
                    automatically show the right number of training days.
                  </p>
                </div>

                <div className="space-y-4">
                  {visibleTrainingDays.map((item, index) => (
                    <section
                      key={index}
                      className="rounded-[28px] border border-white/10 bg-slate-950/60 p-5"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">
                            Workout Day {index + 1}
                          </p>
                          <h3 className="mt-2 text-xl font-black">
                            {item.title || "Untitled Workout"}
                          </h3>
                        </div>

                        <select
                          value={item.day}
                          onChange={(e) =>
                            updateTrainingDay(index, "day", e.target.value)
                          }
                          className="rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm font-bold text-white outline-none focus:border-cyan-300"
                        >
                          {dayNames.map((day) => (
                            <option key={day}>{day}</option>
                          ))}
                        </select>
                      </div>

                      <label className="mt-4 block text-sm font-bold text-slate-300">
                        Workout Name
                        <input
                          value={item.title}
                          onChange={(e) =>
                            updateTrainingDay(index, "title", e.target.value)
                          }
                          placeholder="Example: Lower Body Strength"
                          className={inputClass}
                        />
                      </label>

                      <div className="mt-4">
                        <p className="mb-3 text-sm font-bold text-slate-300">
                          Workout Focus
                        </p>

                        <div className="flex flex-wrap gap-2">
                          {workoutFocusOptions.map((focus) => (
                            <button
                              key={focus}
                              type="button"
                              onClick={() =>
                                updateTrainingDay(index, "focus", focus)
                              }
                              className={`rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.12em] transition ${
                                item.focus === focus
                                  ? "border-emerald-300 bg-emerald-400/20 text-emerald-200"
                                  : "border-white/10 bg-white/[0.04] text-slate-400 hover:border-cyan-300/40"
                              }`}
                            >
                              {focus}
                            </button>
                          ))}
                        </div>
                      </div>

                      <label className="mt-4 block text-sm font-bold text-slate-300">
                        Day Notes
                        <textarea
                          value={item.notes}
                          onChange={(e) =>
                            updateTrainingDay(index, "notes", e.target.value)
                          }
                          rows={3}
                          placeholder="Example: Keep RPE moderate. Focus on tempo."
                          className={inputClass}
                        />
                      </label>
                    </section>
                  ))}
                </div>
              </div>
            )}

            {step === "rules" && (
              <div className="space-y-6">
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-rose-300">
                  Rules + Progression
                </p>

                <div>
                  <p className="mb-3 text-sm font-bold text-slate-300">
                    Progression Style
                  </p>
                  <ChoiceGrid value={plan.progression} onSelect={value => update("progression", value)} items={choices.progression} />
                </div>

                <label className="block text-sm font-bold text-slate-300">
                  Notes / Guardrails
                  <textarea
                    value={plan.notes}
                    onChange={(e) => update("notes", e.target.value)}
                    rows={5}
                    className={inputClass}
                  />
                </label>
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-24 lg:h-fit">
          <section className="rounded-[34px] border border-emerald-300/20 bg-emerald-400/10 p-5 shadow-2xl">
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-emerald-300">
              Plan Preview
            </p>

            <h2 className="mt-3 text-2xl font-black">{plan.planName}</h2>
            <p className="mt-1 text-sm text-slate-300">
              Created by {plan.createdBy}
            </p>

            <div className="mt-5 space-y-3">
              {[
                ["Goal", plan.goal],
                ["Phase", plan.phase],
                ["Split", plan.split],
                ["Target", plan.weeklyTarget],
                ["Focus", plan.primaryFocus],
                ["Progression", plan.progression],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-2xl border border-white/10 bg-slate-950/55 p-3"
                >
                  <p className="text-xs text-slate-500">{label}</p>
                  <p className="mt-1 text-sm font-bold text-white">{value}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-2xl border border-white/10 bg-slate-950/55 p-4">
              <p className="text-xs font-black uppercase text-cyan-300">
                Training Week
              </p>

              <div className="mt-3 space-y-3 text-sm text-slate-300">
                {visibleTrainingDays.map((day, index) => (
                  <div key={index}>
                    <p className="font-bold text-white">
                      {day.day}: {day.title}
                    </p>
                    <p className="text-xs text-slate-500">{day.focus}</p>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="button"
              disabled={Boolean(goalsIssue || planRecovery.issue)}
              aria-describedby={goalsIssue ? "plan-goals-issue" : undefined}
              onClick={savePlan}
              className="mt-5 w-full rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-black text-slate-950 hover:bg-emerald-300"
            >
              Save Plan
            </button>

            <button type="button" onClick={exportDraft} className="mt-3 w-full rounded-2xl border border-white/20 px-5 py-3 text-sm font-bold text-cyan-200">Export open draft</button>
            <label className="mt-3 block text-sm text-cyan-200">Import plan draft JSON
              <input type="file" accept=".json,application/json" className="mt-2 block w-full text-xs" onChange={event => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void previewDraftFile(file); }} />
            </label>
            {importPreview && <section aria-label="Plan draft import preview" className="mt-3 space-y-2 rounded-2xl border border-cyan-300/30 p-3 text-sm">
              <p className="font-bold">{importPreview.form.plan.planName || "Untitled draft"}</p>
              <p>Goal: {importPreview.form.plan.goal || "Not set"} · Week: {importPreview.form.weekStartDate || "Not set"} · Target: {importPreview.form.plan.weeklyTarget || "Not set"}</p>
              <p>{importPreview.form.trainingDays.length} day slot(s). This replaces your open form as a new plan. Export your open draft first if you want to keep those edits. Saved plans and your kept draft remain unchanged.</p>
              <p>Review current Goals and schedule after loading. Saved plan identity and automatic workout matching are not imported.</p>
              <details className="max-h-72 overflow-y-auto rounded-lg border border-white/10 p-2">
                <summary className="cursor-pointer text-cyan-200">Review imported choices and notes</summary>
                <dl className="mt-2 space-y-2 break-words text-slate-300">
                  {Object.entries(importPreview.form.plan).map(([key, value]) => <div key={key}><dt className="font-bold">{({ planName: "Plan name", createdBy: "Created by", goal: "Goal", phase: "Phase", split: "Split", weeklyTarget: "Weekly target", primaryFocus: "Primary focus", secondaryFocus: "Secondary focus", progression: "Progression", notes: "Notes" } as Record<string, string>)[key]}</dt><dd className="whitespace-pre-wrap">{value || "Not set"}</dd></div>)}
                </dl>
                <ol className="mt-3 space-y-2 break-words text-slate-300">
                  {importPreview.form.trainingDays.map((day, index) => <li key={index}><p className="font-bold">{index + 1}. {day.day || "Day not set"}: {day.title || "Untitled workout"}</p><p>{day.focus || "Focus not set"}</p><p className="whitespace-pre-wrap">{day.notes || "No day notes"}</p></li>)}
                </ol>
              </details>
              <div className="flex gap-3 text-cyan-200">
                <button type="button" onClick={applyImportedDraft} className="font-bold underline">Replace open form with imported draft</button>
                <button type="button" onClick={() => { setImportPreview(null); importRequestRef.current += 1; setDraftExportStatus("Import cancelled. Your open form is preserved."); }} className="underline">Cancel import</button>
              </div>
            </section>}
            <button type="button" onClick={() => handleSavedDraft("keep")} className="mt-3 w-full rounded-2xl border border-white/20 px-5 py-3 text-sm font-bold text-cyan-200">Keep draft for later</button>
            <button type="button" aria-pressed={autosaveEnabled} onClick={toggleDraftAutosave} className="mt-3 w-full rounded-2xl border border-white/20 px-5 py-3 text-sm font-bold text-cyan-200">{autosaveEnabled ? "Pause draft autosave" : "Keep current draft & enable autosave"}</button>
            <p className="mt-2 text-xs text-slate-400">Enabling keeps your open form, then saves edits after a short pause. The previous kept draft is archived in your account planning backup before its first replacement in this editor. Save Plan remains separate. Import, restore, discard and Save Plan pause autosave.</p>
            <p role="status" className="mt-2 text-sm text-cyan-200">{autosaveEnabled && draftFormJson !== lastAutosavedForm ? "Draft edits pending autosave. Keep draft now or export before leaving if this status persists." : autosaveStatus}{autosaveEnabled ? " Autosave is on." : ""}</p>
            <details className="mt-3 rounded-2xl border border-white/10 p-3 text-sm">
              <summary className="cursor-pointer font-bold text-cyan-200">Archived plan drafts</summary>
              <p className="mt-2 text-slate-400">Review an archive through the import preview before loading it as a new plan, or export its exact original for recovery. Archives stay in this account.</p>
              {archivedDrafts.length ? <ul className="mt-3 max-h-80 space-y-3 overflow-y-auto">
                {archivedDrafts.map(archive => <li key={archive.editor.key} className="border-t border-white/10 pt-3">
                  <p className="font-bold">{archive.title}</p>
                  <p className="text-xs text-slate-400">{archive.archivedAt || "Archive date unavailable"}</p>
                  <div className="mt-2 flex flex-wrap gap-3 text-cyan-200">
                    <button type="button" onClick={() => handleArchivedDraft(archive.editor, "export")} className="underline">Export exact archive</button>
                    <button type="button" disabled={!archive.canReview} onClick={() => handleArchivedDraft(archive.editor, "review")} className="underline disabled:opacity-50">Review archived draft</button>
                  </div>
                </li>)}
              </ul> : <p className="mt-2 text-slate-400">No archived plan drafts in this account.</p>}
            </details>
            {planDraftPresent() && <div className="mt-3 flex flex-wrap gap-3 text-sm text-cyan-200">
              <button type="button" onClick={() => handleSavedDraft("restore")} className="underline">Restore saved draft</button>
              <button type="button" onClick={() => handleSavedDraft("export")} className="underline">Export saved draft</button>
              <button type="button" onClick={() => { pauseDraftAutosave(); setConfirmDiscardDraft(true); }} className="underline">Discard saved draft</button>
            </div>}
            {planDraftPresent() && confirmDiscardDraft && <div className="mt-3 rounded-2xl border border-amber-300/30 p-3 text-sm text-amber-200">
              <p>Discard the saved draft? Export it first if you want a copy. This cannot be undone; your open form and saved plans stay unchanged.</p>
              <div className="mt-2 flex gap-3">
                <button type="button" onClick={() => handleSavedDraft("discard")} className="font-bold underline">Confirm discard saved draft</button>
                <button type="button" onClick={() => setConfirmDiscardDraft(false)} className="underline">Cancel</button>
              </div>
            </div>}
            <p className="mt-2 text-xs text-slate-400">One saved draft per account. Keep draft replaces that draft only; it does not save or activate a plan. Restoration replaces the open form when its planning context is still current.</p>
            <p className="mt-2 text-xs text-slate-400">Before reloading after a conflict, export your unsaved choices and notes for review.</p>
            {draftExportStatus && <p role="status" className="mt-2 text-sm text-cyan-200">{draftExportStatus}</p>}
            {goalsIssue && <p id="plan-goals-issue" role="status" className="mt-3 text-amber-200">{goalsIssue} <Link className="underline" href={ROUTES.dashboard.goals}>Review Goals</Link></p>}
            {error && <p role="alert" className="mt-3 text-rose-300">{error}</p>}
            {saved && <Link className="mt-3 block text-cyan-200" href={ROUTES.dashboard.plan}>Open saved plan</Link>}
            {saved && (
              <p className="mt-3 rounded-2xl border border-emerald-300/20 bg-emerald-400/10 px-4 py-3 text-sm font-bold text-emerald-300">
                Plan saved locally. Cloud sync status appears above.
              </p>
            )}
            {saved && saveSummary && <div role="status" className="mt-3 space-y-2 rounded-2xl border border-white/10 p-4 text-sm text-slate-300">
              <p>Saved week: {saveSummary.scheduledSessions} scheduled session{saveSummary.scheduledSessions === 1 ? "" : "s"} across {saveSummary.trainingDaysWithWorkouts} training day{saveSummary.trainingDaysWithWorkouts === 1 ? "" : "s"}. {saveSummary.addedAssignments} suggested workout{saveSummary.addedAssignments === 1 ? " was" : "s were"} added.</p>
              {saveSummary.retainedDays.length > 0 && <>
                <p className="text-amber-200">Existing workouts were kept on days outside your selected schedule:</p>
                <ul className="list-disc space-y-1 pl-5">{saveSummary.retainedDays.map(day => <li key={day.id}>{day.day}: {day.sessions} session{day.sessions === 1 ? "" : "s"} retained</li>)}</ul>
                <p>Changing the weekly target does not remove saved workouts. <Link className="underline" href={ROUTES.dashboard.plan}>Review the actual schedule in My Plan</Link> to move or remove eligible workouts.</p>
              </>}
              {saveSummary.unfilledDays.length > 0 && <>
                <p className="text-amber-200">{saveSummary.unfilledDays.length} training day{saveSummary.unfilledDays.length === 1 ? " still needs" : "s still need"} a workout:</p>
                <ul className="list-disc space-y-1 pl-5">{saveSummary.unfilledDays.map(day => <li key={day.id}>{day.day}: {day.focus || "Choose a focus"}{day.reason && <span className="block text-slate-400">{day.reason}</span>}</li>)}</ul>
                <p>{assignMatches ? "No eligible reviewed workout matched both the exercise focus and equipment for these days. " : ""}Open My Plan to choose saved workouts and review workload before training.</p>
              </>}
            </div>}

            <Link
              href="/dashboard/my-plan"
              className="mt-3 block text-center text-sm font-bold text-cyan-300 hover:text-cyan-200"
            >
              ← Back to My Plan
            </Link>
          </section>
        </aside>
      </section>
    </main>
  );
}
