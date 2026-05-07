"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  hasWorkoutBuilderSelectedExercises,
  readWorkoutBuilderSelectedExerciseNames,
  toWorkoutBuilderSelectedExercise,
  type LocalWorkoutBuilderSelectedExercise,
  type LocalWorkoutBuilderTemplate,
  writeActiveWorkoutBuilderSessionTemplate,
  writeWorkoutBuilderSelectedExercises,
} from "@/lib/localData/workoutBuilderData";
import {
  assignTemplateToPlanDay,
  readWorkoutPlans,
} from "@/lib/localData/workoutPlanData";
import {
  loadWorkoutTemplatesWithFallback,
  saveWorkoutTemplateWithFallback,
} from "@/lib/data/workoutPersistence";
import { ROUTES, workoutBuilderAddToPlan } from "@/lib/routes";
import { getExerciseCatalogWithLegacyFallback } from "@/lib/training/normalizedExerciseCatalog";
import type { ExerciseCatalogItem } from "@/types";

const exerciseOptions: ExerciseCatalogItem[] =
  getExerciseCatalogWithLegacyFallback();
const defaultSelectedExerciseNames = ["Goblet Squat", "DB Romanian Deadlift"];

type PlanAddToContext = {
  planId: string;
  dayId: string;
  planTitle: string;
  dayLabel: string;
  dateLabel: string;
  focus: string;
  isResolved: boolean;
};

type TemplateSectionId = "warmUp" | "main" | "coolDown";

type TemplateSlot = {
  id: string;
  label: string;
  exercise: string;
};

type TemplateSection = {
  id: TemplateSectionId;
  title: string;
  helper: string;
  accent: string;
  border: string;
  slots: TemplateSlot[];
};

type ActiveSlot = {
  sectionId: TemplateSectionId;
  slotId: string;
};

type PlanWeekRow = {
  id: string;
  title: string;
  weekStartDate: string;
  days: Array<{
    id: string;
    dayOfWeek: string;
    date: string;
    focus: string;
    assignments: number;
  }>;
};

const resolveCatalogExerciseNames = (names: string[]) => {
  const catalogNames = new Set(exerciseOptions.map((exercise) => exercise.name));

  return Array.from(new Set(names)).filter((name) => catalogNames.has(name));
};

const getCatalogExercisesByName = (names: string[]) => {
  const exerciseByName = new Map(
    exerciseOptions.map((exercise) => [exercise.name, exercise]),
  );

  return names
    .map((name) => exerciseByName.get(name))
    .filter(Boolean) as ExerciseCatalogItem[];
};

const createLocalTemplateId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `template-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

const createSlotId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const getNormalizedTemplateTitle = (value: string) =>
  value.trim() || "Untitled Workout Template";

const getTemplateSourceLabel = ({
  source,
  error,
}: {
  source: "supabase" | "localStorage";
  error: string | null;
}) => {
  if (source === "supabase") return "Supabase";

  return error && !error.includes("No authenticated Supabase user")
    ? "error fallback"
    : "localStorage fallback";
};

const formatPlanDate = (value: string) => {
  if (!value) return "Plan day";

  const parsed = new Date(`${value}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) return value;

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(parsed);
};

const getPlanAddToContext = (rawValue: string | null): PlanAddToContext | null => {
  if (!rawValue) return null;

  const [planId, dayId] = rawValue.split(":");

  if (!planId || !dayId) return null;

  const plan = readWorkoutPlans().find((item) => item.id === planId);
  const day = plan?.days.find((item) => item.id === dayId);

  return {
    planId,
    dayId,
    planTitle: plan?.title || "Selected plan",
    dayLabel: day?.dayOfWeek || "Selected day",
    dateLabel: day?.date ? formatPlanDate(day.date) : "Plan day",
    focus: day?.focus || "",
    isResolved: Boolean(plan && day),
  };
};

const createTemplateSections = (exerciseNames: string[] = []): TemplateSection[] => {
  const resolvedNames = resolveCatalogExerciseNames(exerciseNames);
  const mainSlots =
    resolvedNames.length > 0
      ? resolvedNames.map((exercise, index) => ({
          id: `main-${index}-${exercise}`,
          label: index === 0 ? "Primary lift" : `Main slot ${index + 1}`,
          exercise,
        }))
      : [
          { id: "main-primary", label: "Primary lift", exercise: "" },
          { id: "main-secondary", label: "Secondary lift", exercise: "" },
        ];

  return [
    {
      id: "warmUp",
      title: "Warm-Up",
      helper: "Prep tissue, pattern the movement, and raise readiness.",
      accent: "text-emerald-300",
      border: "border-emerald-300/20",
      slots: [
        { id: "warmup-prep", label: "Movement prep", exercise: "" },
        { id: "warmup-mobility", label: "Mobility", exercise: "" },
      ],
    },
    {
      id: "main",
      title: "Main Workout",
      helper: "Primary work, accessories, and the core training dose.",
      accent: "text-cyan-300",
      border: "border-cyan-300/20",
      slots: mainSlots,
    },
    {
      id: "coolDown",
      title: "Cool-Down",
      helper: "Recovery, breathing, tissue quality, and notes for next time.",
      accent: "text-blue-300",
      border: "border-blue-300/20",
      slots: [{ id: "cooldown-recovery", label: "Recovery notes", exercise: "" }],
    },
  ];
};

const getExerciseNamesFromSections = (sections: TemplateSection[]) =>
  sections.flatMap((section) =>
    section.slots.map((slot) => slot.exercise).filter(Boolean),
  );

const getExerciseImageIsUrl = (exercise: ExerciseCatalogItem | undefined) =>
  Boolean(exercise?.image && /^https?:\/\//i.test(exercise.image));

export default function WorkoutBuilderPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>(
    resolveCatalogExerciseNames(defaultSelectedExerciseNames),
  );
  const [templateSections, setTemplateSections] = useState<TemplateSection[]>(
    () => createTemplateSections(defaultSelectedExerciseNames),
  );
  const [title, setTitle] = useState("Lower Body Strength Template");
  const [savedTemplates, setSavedTemplates] = useState<
    LocalWorkoutBuilderTemplate[]
  >([]);
  const [templateStatus, setTemplateStatus] = useState("");
  const [templateSourceLabel, setTemplateSourceLabel] =
    useState("Loading templates");
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [planAddToContext, setPlanAddToContext] =
    useState<PlanAddToContext | null>(null);
  const [planWeeks, setPlanWeeks] = useState<PlanWeekRow[]>([]);
  const [activeSlot, setActiveSlot] = useState<ActiveSlot | null>(null);
  const [exerciseSearch, setExerciseSearch] = useState("");
  const [exerciseBodyFilter, setExerciseBodyFilter] = useState("All");
  const [exerciseGoalFilter, setExerciseGoalFilter] = useState("All");

  useEffect(() => {
    let isActive = true;

    const loadSavedTemplates = async () => {
      const result = await loadWorkoutTemplatesWithFallback();

      if (!isActive) return;

      setSavedTemplates(result.data);
      setTemplateSourceLabel(getTemplateSourceLabel(result));
    };

    loadSavedTemplates();

    const initialNames = hasWorkoutBuilderSelectedExercises()
      ? readWorkoutBuilderSelectedExerciseNames()
      : defaultSelectedExerciseNames;
    const resolvedNames = resolveCatalogExerciseNames(initialNames);

    setSelected(resolvedNames);
    setTemplateSections(createTemplateSections(resolvedNames));

    if (!hasWorkoutBuilderSelectedExercises()) {
      writeWorkoutBuilderSelectedExercises(getCatalogExercisesByName(resolvedNames));
    }

    const params = new URLSearchParams(window.location.search);
    setPlanAddToContext(getPlanAddToContext(params.get("addTo")));

    const plans = readWorkoutPlans();
    setPlanWeeks(
      plans.slice(0, 4).map((plan) => ({
        id: plan.id,
        title: plan.title,
        weekStartDate: plan.weekStartDate,
        days: plan.days.map((day) => ({
          id: day.id,
          dayOfWeek: day.dayOfWeek,
          date: day.date,
          focus: day.focus,
          assignments: day.assignments.length,
        })),
      })),
    );

    return () => {
      isActive = false;
    };
  }, []);

  const selectedExercises = useMemo(
    () => getCatalogExercisesByName(selected),
    [selected],
  );

  const exerciseBodyOptions = useMemo(
    () => [
      "All",
      ...Array.from(
        new Set(exerciseOptions.map((exercise) => exercise.body)),
      ).sort(),
    ],
    [],
  );

  const exerciseGoalOptions = useMemo(
    () => [
      "All",
      ...Array.from(
        new Set(exerciseOptions.map((exercise) => exercise.goal)),
      ).sort(),
    ],
    [],
  );

  const filteredPickerExercises = useMemo(() => {
    const q = exerciseSearch.toLowerCase();

    return exerciseOptions.filter((exercise) => {
      const matchesSearch =
        exercise.name.toLowerCase().includes(q) ||
        exercise.body.toLowerCase().includes(q) ||
        exercise.muscles.toLowerCase().includes(q) ||
        exercise.pattern.toLowerCase().includes(q) ||
        exercise.goal.toLowerCase().includes(q) ||
        exercise.equipment.toLowerCase().includes(q) ||
        exercise.level.toLowerCase().includes(q);
      const matchesBody =
        exerciseBodyFilter === "All" || exercise.body === exerciseBodyFilter;
      const matchesGoal =
        exerciseGoalFilter === "All" || exercise.goal === exerciseGoalFilter;

      return matchesSearch && matchesBody && matchesGoal;
    });
  }, [exerciseSearch, exerciseBodyFilter, exerciseGoalFilter]);

  const activePlanDays = useMemo(
    () =>
      planWeeks.flatMap((week) =>
        week.days.map((day) => ({
          planId: week.id,
          planTitle: week.title,
          dayId: day.id,
          dayOfWeek: day.dayOfWeek,
          date: day.date,
          focus: day.focus,
          assignments: day.assignments,
        })),
      ),
    [planWeeks],
  );

  function persistSelection(nextSelected: string[]) {
    const resolvedSelection = resolveCatalogExerciseNames(nextSelected);

    setSelected(resolvedSelection);
    writeWorkoutBuilderSelectedExercises(
      getCatalogExercisesByName(resolvedSelection),
    );
    setTemplateStatus("");
  }

  function applyTemplateSections(nextSections: TemplateSection[]) {
    setTemplateSections(nextSections);
    persistSelection(getExerciseNamesFromSections(nextSections));
  }

  function addSlot(sectionId: TemplateSectionId) {
    setTemplateSections((current) =>
      current.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              slots: [
                ...section.slots,
                {
                  id: createSlotId(sectionId),
                  label:
                    section.id === "warmUp"
                      ? "Warm-up slot"
                      : section.id === "coolDown"
                        ? "Recovery slot"
                        : "Main slot",
                  exercise: "",
                },
              ],
            }
          : section,
      ),
    );
  }

  function removeSlot(sectionId: TemplateSectionId, slotId: string) {
    const nextSections = templateSections.map((section) =>
      section.id === sectionId
        ? {
            ...section,
            slots: section.slots.filter((slot) => slot.id !== slotId),
          }
        : section,
    );

    applyTemplateSections(nextSections);
  }

  function updateSlotExercise(
    sectionId: TemplateSectionId,
    slotId: string,
    exerciseName: string,
  ) {
    const nextSections = templateSections.map((section) =>
      section.id === sectionId
        ? {
            ...section,
            slots: section.slots.map((slot) =>
              slot.id === slotId ? { ...slot, exercise: exerciseName } : slot,
            ),
          }
        : section,
    );

    applyTemplateSections(nextSections);
    setActiveSlot(null);
  }

  function clearSlotExercise(sectionId: TemplateSectionId, slotId: string) {
    updateSlotExercise(sectionId, slotId, "");
  }

  function clearSelection() {
    setTemplateSections(createTemplateSections([]));
    persistSelection([]);
  }

  async function refreshSavedTemplates() {
    const result = await loadWorkoutTemplatesWithFallback();

    setSavedTemplates(result.data);
    setTemplateSourceLabel(getTemplateSourceLabel(result));

    return result;
  }

  function buildCurrentTemplate(): LocalWorkoutBuilderTemplate {
    const now = new Date().toISOString();
    const normalizedTitle = getNormalizedTemplateTitle(title);
    const existingTemplate = savedTemplates.find(
      (template) =>
        template.title.trim().toLowerCase() === normalizedTitle.toLowerCase(),
    );
    const exercises: LocalWorkoutBuilderSelectedExercise[] =
      selectedExercises.map(toWorkoutBuilderSelectedExercise);

    return {
      id: existingTemplate?.id || createLocalTemplateId(),
      title: normalizedTitle,
      exercises,
      createdAt: existingTemplate?.createdAt || now,
      updatedAt: now,
    };
  }

  async function saveCurrentTemplate({
    assignToPlan = false,
  }: {
    assignToPlan?: boolean;
  } = {}) {
    if (selectedExercises.length === 0) {
      setTemplateStatus("Add at least one exercise before saving a template.");
      return null;
    }

    setIsSavingTemplate(true);
    setTemplateStatus(
      assignToPlan && planAddToContext
        ? "Saving template and assigning it to your plan..."
        : "Saving template...",
    );

    try {
      const result = await saveWorkoutTemplateWithFallback(
        buildCurrentTemplate(),
      );
      const savedTemplate = result.data;
      const sourceLabel = getTemplateSourceLabel(result);
      let statusMessage = result.error
        ? `${savedTemplate.title} saved locally. Supabase sync can retry later.`
        : `${savedTemplate.title} saved via ${sourceLabel}.`;

      if (assignToPlan && planAddToContext) {
        const assignment = assignTemplateToPlanDay({
          planId: planAddToContext.planId,
          dayId: planAddToContext.dayId,
          template: savedTemplate,
          source: "builder-template",
          focus: planAddToContext.focus || savedTemplate.title,
          notes: "Assigned from Workout Builder.",
        });

        statusMessage = assignment
          ? `${savedTemplate.title} saved and assigned to ${planAddToContext.dayLabel}.`
          : `${savedTemplate.title} saved, but this plan day could not be found.`;
      }

      const refreshResult = await refreshSavedTemplates();

      setTitle(savedTemplate.title);
      setTemplateSourceLabel(getTemplateSourceLabel(refreshResult));
      setTemplateStatus(statusMessage);

      return savedTemplate;
    } catch {
      setTemplateStatus("Template could not be saved. Try again.");
      return null;
    } finally {
      setIsSavingTemplate(false);
    }
  }

  function loadTemplate(template: LocalWorkoutBuilderTemplate) {
    const exerciseNames = resolveCatalogExerciseNames(
      template.exercises.map((exercise) => exercise.name),
    );

    setSelected(exerciseNames);
    setTemplateSections(createTemplateSections(exerciseNames));
    setTitle(template.title);
    writeWorkoutBuilderSelectedExercises(getCatalogExercisesByName(exerciseNames));
    setTemplateStatus(`${template.title} loaded into the builder.`);
  }

  function startTemplateWorkout(template: LocalWorkoutBuilderTemplate) {
    const exerciseNames = resolveCatalogExerciseNames(
      template.exercises.map((exercise) => exercise.name),
    );
    const catalogExercises = getCatalogExercisesByName(exerciseNames);

    if (catalogExercises.length === 0) {
      setTemplateStatus(
        "This template has no available exercises to start right now.",
      );
      return;
    }

    writeWorkoutBuilderSelectedExercises(catalogExercises);
    writeActiveWorkoutBuilderSessionTemplate({
      ...template,
      exercises: catalogExercises.map(toWorkoutBuilderSelectedExercise),
    });
    router.push(
      `${ROUTES.dashboard.sessionWorkout}?template=${encodeURIComponent(
        template.id,
      )}`,
    );
  }

  function startCurrentWorkout() {
    if (selectedExercises.length === 0) {
      setTemplateStatus("Add at least one exercise before starting a workout.");
      return;
    }

    const template = buildCurrentTemplate();

    writeWorkoutBuilderSelectedExercises(selectedExercises);
    writeActiveWorkoutBuilderSessionTemplate(template);
    router.push(
      `${ROUTES.dashboard.sessionWorkout}?template=${encodeURIComponent(
        template.id,
      )}`,
    );
  }

  const activeSlotLabel = activeSlot
    ? templateSections
        .find((section) => section.id === activeSlot.sectionId)
        ?.slots.find((slot) => slot.id === activeSlot.slotId)?.label
    : null;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_18%_0%,rgba(34,211,238,0.14),transparent_32%),radial-gradient(circle_at_88%_12%,rgba(16,185,129,0.13),transparent_34%),linear-gradient(180deg,#020617_0%,#0f172a_48%,#020617_100%)] text-white">
      {activeSlot ? (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto bg-slate-950/75 p-4 backdrop-blur-md">
          <section className="w-full max-w-3xl rounded-[32px] border border-cyan-300/20 bg-slate-950 p-5 shadow-[0_40px_120px_rgba(0,0,0,0.85)]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-cyan-300">
                  Exercise Picker
                </p>
                <h2 className="mt-2 text-2xl font-black text-white">
                  Choose exercise for {activeSlotLabel || "slot"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setActiveSlot(null)}
                className="min-h-[44px] rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-black text-slate-200 transition hover:border-cyan-300/40"
              >
                Close
              </button>
            </div>

            <input
              value={exerciseSearch}
              onChange={(event) => setExerciseSearch(event.target.value)}
              placeholder="Search by exercise, body, muscle, pattern, goal, or equipment..."
              className="mt-5 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-300"
            />

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300">
                  Body Area
                </span>
                <select
                  value={exerciseBodyFilter}
                  onChange={(event) => setExerciseBodyFilter(event.target.value)}
                  className="w-full rounded-2xl border border-cyan-300/40 bg-slate-900 px-4 py-3 text-sm font-black text-white outline-none transition hover:border-cyan-300 focus:border-cyan-300"
                >
                  {exerciseBodyOptions.map((body) => (
                    <option key={body} value={body}>
                      {body}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-emerald-300">
                  Training Goal
                </span>
                <select
                  value={exerciseGoalFilter}
                  onChange={(event) => setExerciseGoalFilter(event.target.value)}
                  className="w-full rounded-2xl border border-emerald-300/30 bg-slate-900 px-4 py-3 text-sm font-black text-white outline-none transition hover:border-emerald-300 focus:border-emerald-300"
                >
                  {exerciseGoalOptions.map((goal) => (
                    <option key={goal} value={goal}>
                      {goal}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-4 flex flex-col gap-3 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
              <span>
                Showing{" "}
                <strong className="text-cyan-300">
                  {filteredPickerExercises.length}
                </strong>{" "}
                exercises
              </span>
              <button
                type="button"
                onClick={() => {
                  setExerciseSearch("");
                  setExerciseBodyFilter("All");
                  setExerciseGoalFilter("All");
                }}
                className="text-left font-black text-cyan-300 hover:text-cyan-200"
              >
                Reset filters
              </button>
            </div>

            <div className="mt-5 max-h-[52vh] space-y-2 overflow-y-auto pr-1">
              {filteredPickerExercises.map((exercise) => (
                <button
                  key={exercise.id}
                  type="button"
                  onClick={() =>
                    updateSlotExercise(
                      activeSlot.sectionId,
                      activeSlot.slotId,
                      exercise.name,
                    )
                  }
                  className="flex w-full gap-3 rounded-2xl bg-white/[0.04] p-3 text-left text-slate-200 transition hover:bg-cyan-400/10"
                >
                  {getExerciseImageIsUrl(exercise) ? (
                    <img
                      src={exercise.image}
                      alt=""
                      className="h-14 w-14 rounded-2xl object-cover"
                    />
                  ) : (
                    <div className="grid h-14 w-14 place-items-center rounded-2xl border border-cyan-300/20 bg-cyan-400/10 text-xs font-black text-cyan-200">
                      Demo
                    </div>
                  )}
                  <span>
                    <span className="block text-sm font-black text-white">
                      {exercise.name}
                    </span>
                    <span className="mt-1 block text-xs text-slate-400">
                      {exercise.pattern} - {exercise.equipment}
                    </span>
                  </span>
                </button>
              ))}
            </div>

            <Link
              href={ROUTES.workoutBuilder.exerciseLibrary}
              className="mt-5 inline-flex min-h-[44px] items-center justify-center rounded-2xl border border-emerald-300/20 bg-emerald-400/10 px-4 py-3 text-sm font-black text-emerald-200 transition hover:bg-emerald-400 hover:text-slate-950"
            >
              Open Full Exercise Library
            </Link>
          </section>
        </div>
      ) : null}

      <section className="mx-auto w-full max-w-[1240px] space-y-6 px-4 py-8">
        <section className="rounded-[40px] border border-white/10 bg-[radial-gradient(circle_at_18%_8%,rgba(34,211,238,0.18),transparent_32%),radial-gradient(circle_at_90%_20%,rgba(16,185,129,0.12),transparent_30%),linear-gradient(135deg,rgba(15,23,42,0.96),rgba(2,6,23,0.98))] p-6 shadow-2xl lg:p-8">
          <div className="grid gap-6 lg:grid-cols-[1fr_320px] lg:items-start">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.3em] text-cyan-300">
                Workout Builder
              </p>
              <h1 className="mt-4 text-4xl font-black leading-tight lg:text-5xl">
                Build, start, or assign workouts.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300">
                Shape warm-up, main work, and cool-down in a horizontal session
                slider. Save it as a template, start it now, or attach it to a
                weekly plan day.
              </p>
            </div>

            <aside className="rounded-[30px] border border-cyan-300/20 bg-cyan-400/10 p-5">
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-cyan-200">
                Current Draft
              </p>
              <p className="mt-3 text-3xl font-black text-white">
                {selectedExercises.length}
              </p>
              <p className="mt-1 text-sm text-cyan-50/80">
                selected exercises
              </p>
              <p className="mt-4 text-sm font-bold text-white">{title}</p>
              <p className="mt-2 rounded-full border border-white/10 bg-slate-950/50 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100">
                {templateSourceLabel}
              </p>
            </aside>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-end">
            <label className="block">
              <span className="text-sm font-bold text-slate-300">
                Workout Name
              </span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm font-bold text-white outline-none focus:border-cyan-300"
              />
            </label>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => saveCurrentTemplate()}
                disabled={selectedExercises.length === 0 || isSavingTemplate}
                className="min-h-[48px] rounded-2xl bg-emerald-400 px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-45"
              >
                {isSavingTemplate ? "Saving" : "Save"}
              </button>
              <button
                type="button"
                onClick={startCurrentWorkout}
                disabled={selectedExercises.length === 0}
                className="min-h-[48px] rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-45"
              >
                Start
              </button>
            </div>
          </div>

          {planAddToContext ? (
            <div className="mt-6 rounded-[30px] border border-emerald-300/20 bg-emerald-400/10 p-5">
              <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.22em] text-emerald-200">
                    Plan Link Active
                  </p>
                  <h2 className="mt-2 text-2xl font-black text-white">
                    Add this workout to {planAddToContext.dayLabel}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-emerald-50/80">
                    {planAddToContext.planTitle} -{" "}
                    {planAddToContext.dateLabel}
                    {planAddToContext.focus
                      ? ` - ${planAddToContext.focus}`
                      : ""}
                    {!planAddToContext.isResolved
                      ? " - open from My Plan again if this looks stale"
                      : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => saveCurrentTemplate({ assignToPlan: true })}
                  disabled={
                    selectedExercises.length === 0 ||
                    isSavingTemplate ||
                    !planAddToContext.isResolved
                  }
                  className="min-h-[48px] rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  Save & Assign
                </button>
              </div>
            </div>
          ) : null}

          <div className="mt-6 rounded-[30px] border border-white/10 bg-slate-950/45 p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-emerald-300">
                  Template Structure
                </p>
                <h2 className="mt-2 text-2xl font-black">
                  Warm-up, main work, and cool-down
                </h2>
              </div>
              <span className="w-fit rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1 text-xs font-bold text-cyan-300">
                Horizontal slider
              </span>
            </div>

            <div className="mt-6">
              <div className="mb-4 flex flex-wrap gap-2">
                {templateSections.map((section) => (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => addSlot(section.id)}
                    className="min-h-[40px] rounded-full border border-emerald-300/20 bg-emerald-400/10 px-4 py-2 text-xs font-black text-emerald-300 transition hover:bg-emerald-400/15"
                  >
                    Add {section.title}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={clearSelection}
                  disabled={selectedExercises.length === 0}
                  className="min-h-[40px] rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-black text-slate-300 transition hover:border-cyan-300/40 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  Clear
                </button>
                <Link
                  href={ROUTES.workoutBuilder.exerciseLibrary}
                  className="min-h-[40px] rounded-full border border-cyan-300/20 bg-cyan-400/10 px-4 py-2 text-xs font-black text-cyan-200 transition hover:bg-cyan-400 hover:text-slate-950"
                >
                  Exercise Library
                </Link>
              </div>

              <div className="overflow-x-auto pb-5">
                <div className="flex w-max gap-4">
                  {templateSections.flatMap((section) =>
                    section.slots.map((slot, slotIndex) => {
                      const selectedExercise = exerciseOptions.find(
                        (exercise) => exercise.name === slot.exercise,
                      );

                      return (
                        <article
                          key={`${section.id}-${slot.id}`}
                          className={`flex h-[480px] w-[360px] shrink-0 flex-col rounded-[30px] border ${section.border} bg-slate-950/75 p-4 shadow-xl transition duration-300 hover:scale-[1.02] hover:border-cyan-300/40`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={`rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${section.accent}`}
                            >
                              {section.title}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeSlot(section.id, slot.id)}
                              className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-black text-slate-400 transition hover:text-white"
                            >
                              Remove
                            </button>
                          </div>

                          <label className="mt-4 block">
                            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                              Slot Label
                            </span>
                            <input
                              value={slot.label}
                              onChange={(event) => {
                                const nextSections = templateSections.map(
                                  (item) =>
                                    item.id === section.id
                                      ? {
                                          ...item,
                                          slots: item.slots.map((slotItem) =>
                                            slotItem.id === slot.id
                                              ? {
                                                  ...slotItem,
                                                  label: event.target.value,
                                                }
                                              : slotItem,
                                          ),
                                        }
                                      : item,
                                );

                                setTemplateSections(nextSections);
                              }}
                              className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm font-black text-white outline-none focus:border-cyan-300"
                            />
                          </label>

                          <button
                            type="button"
                            onClick={() =>
                              setActiveSlot({
                                sectionId: section.id,
                                slotId: slot.id,
                              })
                            }
                            className="mt-4 w-full rounded-2xl border border-cyan-300/20 bg-cyan-400/10 p-4 text-left transition hover:border-cyan-300/60 hover:bg-cyan-400/15"
                          >
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300">
                              Exercise
                            </p>
                            <p className="mt-1 text-sm font-black text-white">
                              {selectedExercise
                                ? selectedExercise.name
                                : "Choose exercise"}
                            </p>
                            <p className="mt-1 text-xs text-slate-400">
                              {selectedExercise
                                ? `${selectedExercise.pattern} - ${selectedExercise.equipment}`
                                : "Search the normalized catalog."}
                            </p>
                          </button>

                          <div className="mt-4 aspect-video overflow-hidden rounded-[24px] border border-cyan-300/15 bg-[linear-gradient(135deg,rgba(14,165,233,0.14),rgba(16,185,129,0.08))]">
                            {selectedExercise &&
                            getExerciseImageIsUrl(selectedExercise) ? (
                              <img
                                src={selectedExercise.image}
                                alt=""
                                className="h-full w-full object-cover opacity-80"
                              />
                            ) : (
                              <div className="grid h-full place-items-center p-4 text-center">
                                <div>
                                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200">
                                    Video Section
                                  </p>
                                  <p className="mt-2 text-sm font-black text-white">
                                    {selectedExercise
                                      ? `${selectedExercise.name} demo`
                                      : "Choose an exercise"}
                                  </p>
                                  <p className="mt-1 text-xs text-slate-400">
                                    Demo video or coach cue preview.
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="mt-4 grid grid-cols-3 gap-2">
                            <input placeholder="Sets" />
                            <input placeholder="Reps" />
                            <input placeholder="Rest" />
                          </div>

                          <textarea
                            placeholder="Coaching notes..."
                            className="mt-3 min-h-[76px] resize-none rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-300"
                          />

                          {slot.exercise ? (
                            <button
                              type="button"
                              onClick={() =>
                                clearSlotExercise(section.id, slot.id)
                              }
                              className="mt-auto rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-xs font-black text-slate-300 transition hover:border-cyan-300/40 hover:text-white"
                            >
                              Clear Exercise
                            </button>
                          ) : null}
                        </article>
                      );
                    }),
                  )}
                </div>
              </div>
            </div>
          </div>

          {templateStatus ? (
            <p className="mt-4 rounded-2xl border border-cyan-300/20 bg-cyan-400/10 px-4 py-3 text-sm font-bold text-cyan-100">
              {templateStatus}
            </p>
          ) : null}

          <div className="mt-6 rounded-[30px] border border-cyan-300/20 bg-cyan-400/10 p-5">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-cyan-300">
              Builder Destination
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={startCurrentWorkout}
                disabled={selectedExercises.length === 0}
                className="rounded-2xl border border-cyan-300 bg-cyan-400/20 p-4 text-left transition hover:bg-cyan-400/30 disabled:cursor-not-allowed disabled:opacity-45"
              >
                <p className="font-black text-white">Start Now</p>
                <p className="mt-1 text-xs text-slate-300">
                  Use this workout immediately in the session logger.
                </p>
              </button>
              <button
                type="button"
                onClick={() => saveCurrentTemplate({ assignToPlan: true })}
                disabled={
                  selectedExercises.length === 0 ||
                  isSavingTemplate ||
                  !planAddToContext?.isResolved
                }
                className="rounded-2xl border border-emerald-300 bg-emerald-400/20 p-4 text-left transition hover:bg-emerald-400/30 disabled:cursor-not-allowed disabled:opacity-45"
              >
                <p className="font-black text-white">Save & Assign</p>
                <p className="mt-1 text-xs text-slate-300">
                  Attach to the active plan day when opened from My Plan.
                </p>
              </button>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => saveCurrentTemplate()}
                disabled={selectedExercises.length === 0 || isSavingTemplate}
                className="rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-45"
              >
                Save Template
              </button>
              <Link
                href={ROUTES.dashboard.myPlan}
                className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-black text-slate-200 transition hover:border-cyan-300/40"
              >
                View Plans
              </Link>
              <Link
                href={ROUTES.dashboard.sessions}
                className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-black text-slate-200 transition hover:border-cyan-300/40"
              >
                Sessions
              </Link>
            </div>
          </div>
        </section>

        <section className="rounded-[34px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-emerald-300">
                Monthly Plan
              </p>
              <h2 className="mt-3 text-2xl font-black">
                Week rows and plan links
              </h2>
            </div>
            <Link
              href={ROUTES.dashboard.myPlan}
              className="w-fit rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-black text-slate-200 transition hover:border-emerald-300/40"
            >
              Open My Plan
            </Link>
          </div>

          <div className="mt-5 space-y-3">
            {planWeeks.length > 0 ? (
              planWeeks.map((week, index) => (
                <div
                  key={week.id}
                  className="rounded-[28px] border border-white/10 bg-slate-950/60 p-4"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-300">
                        Week {index + 1} - {formatPlanDate(week.weekStartDate)}
                      </p>
                      <h3 className="mt-1 text-lg font-black text-white">
                        {week.title}
                      </h3>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-2 md:grid-cols-7">
                    {week.days.map((day) => (
                      <Link
                        key={day.id}
                        href={workoutBuilderAddToPlan(week.id, day.id)}
                        className="min-h-[92px] rounded-2xl border border-white/10 bg-white/[0.035] p-3 transition hover:border-emerald-300/40 hover:bg-emerald-400/10"
                      >
                        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-200">
                          {day.dayOfWeek.slice(0, 3)}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          {formatPlanDate(day.date)}
                        </p>
                        <p className="mt-2 text-sm font-black text-white">
                          {day.focus || "Plan day"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {day.assignments} assignment
                          {day.assignments === 1 ? "" : "s"}
                        </p>
                      </Link>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[28px] border border-dashed border-white/15 bg-slate-950/40 p-5">
                <p className="font-black text-white">No local plan weeks yet</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Create a weekly plan in My Plan, then return here to assign
                  builder workouts into week rows.
                </p>
              </div>
            )}
          </div>
        </section>

        <section className="rounded-[34px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-cyan-300">
            Saved Templates
          </p>
          <h2 className="mt-3 text-2xl font-black">Load or start saved work</h2>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {savedTemplates.length > 0 ? (
              savedTemplates.map((template) => (
                <article
                  key={template.id}
                  className="rounded-2xl border border-white/10 bg-slate-950/60 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-black text-white">{template.title}</h3>
                      <p className="mt-1 text-xs text-slate-400">
                        {template.exercises.length} exercise
                        {template.exercises.length === 1 ? "" : "s"}
                      </p>
                    </div>
                    <span className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1 text-[10px] font-black text-cyan-200">
                      Template
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-400">
                    {template.exercises
                      .slice(0, 3)
                      .map((exercise) => exercise.name)
                      .join(" / ")}
                    {template.exercises.length > 3 ? " / more" : ""}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => loadTemplate(template)}
                      className="min-h-[42px] rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-black text-slate-200 transition hover:border-cyan-300/40"
                    >
                      Load
                    </button>
                    <button
                      type="button"
                      onClick={() => startTemplateWorkout(template)}
                      className="min-h-[42px] rounded-2xl bg-cyan-400 px-4 py-2 text-xs font-black text-slate-950 transition hover:bg-cyan-300"
                    >
                      Start
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-white/15 bg-slate-950/40 p-5 md:col-span-2">
                <p className="font-black text-white">No saved templates yet</p>
                <p className="mt-2 text-sm text-slate-400">
                  Build a sectioned workout, then save it as a template.
                </p>
              </div>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}
