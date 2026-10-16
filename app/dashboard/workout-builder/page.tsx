"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { planningOwner, subscribePlanning, readPlanning, planningKeys, planningSnapshot } from "@/lib/planning/store";
import { captureBuilderSelectionEditor, commitBuilderSelection, type BuilderSelectionEditor } from "@/lib/planning/builderSelectionEditor";
import { captureBuilderWorkoutLaunch, launchBuilderWorkout, type BuilderWorkoutLaunchEditor } from "@/lib/planning/builderWorkoutLaunch";
import { assertBuilderTemplateEditor, captureBuilderTemplateEditor, type BuilderTemplateEditor } from "@/lib/planning/builderTemplateEditor";
import { readLibraryProfileSummary } from "@/lib/planning/libraryProfile";
import { readEligibleGoals } from "@/lib/planning/goals";
import { readBuilderDraftArchives, exportBuilderDraftArchive, previewBuilderDraftArchive, confirmBuilderDraftArchive, type BuilderDraftArchiveEditor, type BuilderDraftArchivePreview, builderDraftPresent, captureBuilderDraftEditor, keepBuilderDraft, archiveAndKeepBuilderDraft, restoreBuilderDraft, exportBuilderDraft, type BuilderDraftEditor, type BuilderDraftForm, type BuilderDraftSection } from "@/lib/planning/builderDraft";
import { readWorkoutTemplateArchives, exportWorkoutTemplateArchive, recoverWorkoutTemplateArchive, type WorkoutArchiveEditor } from "@/lib/planning/workoutTemplateArchives";
import { builderExerciseOccurrences, bindBuilderTemplateOccurrences, builderOccurrenceDisplay, updateBuilderOccurrenceTarget } from "@/lib/planning/builderExerciseOccurrences";
import { readWorkoutTargets, workoutTargetFieldValue, type WorkoutTargetField } from "@/lib/planning/workoutTargets";
import { builderSuggestionModes, previewBuilderSuggestions, confirmBuilderSuggestions, type BuilderSuggestionMode, type BuilderSuggestionPreview } from "@/lib/planning/builderSuggestions";
import { useRouter } from "next/navigation";
import TrainingJourneyNavigator from "@/components/dashboard/TrainingJourneyNavigator";
import {
  hasWorkoutBuilderSelectedExercises,
  readWorkoutBuilderSelectedExercises,
  toWorkoutBuilderSelectedExercise,
  type LocalWorkoutBuilderSelectedExercise,
  type LocalWorkoutBuilderTemplate,
} from "@/lib/localData/workoutBuilderData";
import {
  assignTemplateToPlanDay,
  assertPlanEditor,
  capturePlanEditor,
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

type TemplateSectionId =
  | "warmUp"
  | "main"
  | "accessories"
  | "coreConditioning"
  | "coolDown";



type TemplateSection = BuilderDraftSection;

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

type BuilderContext = {
  currentFocus: string;
  favoriteCount: number;
  goal: string;
  readinessWarning: string;
  suggestedFocus: string;
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
      title: "Main Lift / Pattern",
      helper: "Primary pattern, strength anchor, or most important work.",
      accent: "text-cyan-300",
      border: "border-cyan-300/20",
      slots: mainSlots,
    },
    {
      id: "accessories",
      title: "Accessories",
      helper: "Target muscles, volume gaps, and supportive movement patterns.",
      accent: "text-amber-300",
      border: "border-amber-300/20",
      slots: [{ id: "accessory-primary", label: "Accessory slot", exercise: "" }],
    },
    {
      id: "coreConditioning",
      title: "Core / Conditioning",
      helper: "Core, carries, conditioning, or athletic finishers.",
      accent: "text-fuchsia-300",
      border: "border-fuchsia-300/20",
      slots: [{ id: "core-conditioning", label: "Core or finisher", exercise: "" }],
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

const createRecordSections = (exercises: LocalWorkoutBuilderSelectedExercise[]): TemplateSection[] => exercises.length
  ? bindBuilderTemplateOccurrences({ id: "builder-open", title: "Open workout", exercises, createdAt: "", updatedAt: "" }, createTemplateSections([])).sections
  : createTemplateSections([]);


const getExerciseImageIsUrl = (exercise: ExerciseCatalogItem | undefined) =>
  Boolean(exercise?.image && /^https?:\/\//i.test(exercise.image));

const readBuilderContext = (): BuilderContext => {
  const profile = readLibraryProfileSummary();
  const goals = readEligibleGoals();
  const favorites = readPlanning<unknown>(planningKeys.libraryFavorites, []);
  return {
    currentFocus: goals?.secondaryGoal || goals?.primaryGoal || "Set goals first",
    favoriteCount: Array.isArray(favorites) ? favorites.length : 0,
    goal: goals?.primaryGoal || "No goal set",
    readinessWarning: profile.readinessLabel,
    suggestedFocus: goals ? "Choose exercises from your saved plan" : "Set goals before planning",
  };
};

export default function WorkoutBuilderPage() {
  const router = useRouter();
  useSyncExternalStore(subscribePlanning, planningSnapshot, planningSnapshot);
  const workoutArchives = readWorkoutTemplateArchives();
  const archivedBuilderDrafts = readBuilderDraftArchives();
  const [builderArchivePreview, setBuilderArchivePreview] = useState<BuilderDraftArchivePreview | null>(null);
  const builderAccount = planningOwner();
  const templateEditorRef = useRef<BuilderTemplateEditor | null>(null);
  const selectionEditorRef = useRef<BuilderSelectionEditor | null>(null);
  const workoutLaunchRef = useRef<BuilderWorkoutLaunchEditor | null>(null);
  const templateSaveBusyRef = useRef(false);
  const builderDraftEditorRef = useRef<BuilderDraftEditor | null>(null);
  const keptDraftAvailable = useSyncExternalStore(subscribePlanning, builderDraftPresent, () => false);
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
  const [suggestionBody, setSuggestionBody] = useState("All");
  const [suggestionPreview, setSuggestionPreview] = useState<BuilderSuggestionPreview | null>(null);
  const [exerciseGoalFilter, setExerciseGoalFilter] = useState("All");
  const [builderContext, setBuilderContext] = useState<BuilderContext>(() =>
    readBuilderContext(),
  );

  useEffect(() => {
    builderDraftEditorRef.current = captureBuilderDraftEditor(builderAccount);
    selectionEditorRef.current = captureBuilderSelectionEditor(builderAccount);
    workoutLaunchRef.current = captureBuilderWorkoutLaunch(builderAccount);
    let isActive = true;

    const loadSavedTemplates = async () => {
      const result = await loadWorkoutTemplatesWithFallback();

      if (!isActive) return;

      setSavedTemplates(result.data);
      setTemplateSourceLabel(getTemplateSourceLabel(result));
      if (!result.success && result.error) setTemplateStatus(result.error);
    };

    loadSavedTemplates();
    setBuilderContext(readBuilderContext());
    const unsubscribeContext = subscribePlanning(() => setBuilderContext(readBuilderContext()));

    try {
      const records = hasWorkoutBuilderSelectedExercises()
        ? readWorkoutBuilderSelectedExercises()
        : getCatalogExercisesByName(defaultSelectedExerciseNames).map(toWorkoutBuilderSelectedExercise);
      const sections = createRecordSections(records);
      setSelected(records.map(exercise => exercise.name));
      setTemplateSections(sections);
    } catch (cause) {
      setTemplateStatus(cause instanceof Error ? cause.message : "Saved selections need review. Originals are preserved.");
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
      unsubscribeContext();
    };
  }, [builderAccount]);

  const occurrenceState = useMemo(() => {
    try {
      const records = builderExerciseOccurrences(templateSections, exerciseOptions);
      if (JSON.stringify(records.map(exercise => exercise.name)) !== JSON.stringify(selected)) throw new Error("Workout slots and selected order differ. Review before saving.");
      return { records, issue: "" };
    } catch (cause) {
      return { records: [], issue: cause instanceof Error ? cause.message : "Review the workout slots before saving." };
    }
  }, [templateSections, selected]);
  const selectedExercises = occurrenceState.records.map(exercise => builderOccurrenceDisplay(exercise, exerciseOptions));



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

  function writeWorkoutBuilderSelectedExercises(exercises: LocalWorkoutBuilderSelectedExercise[]) {
    if (!selectionEditorRef.current) throw new Error("Wait for your Builder selections to load before editing exercises.");
    selectionEditorRef.current = commitBuilderSelection(exercises, selectionEditorRef.current);
  }

  function persistSelection(nextSelected: string[], records?: LocalWorkoutBuilderSelectedExercise[]) {
    try {
      if (!builderAccount || planningOwner() !== builderAccount) throw new Error("Your account changed. Your open workout is preserved; reload before editing exercises.");
      const resolvedSelection = records ? nextSelected : resolveCatalogExerciseNames(nextSelected);
      if (!records && (resolvedSelection.length !== new Set(nextSelected).size || resolvedSelection.some(name => {
        const matches = exerciseOptions.filter(exercise => exercise.name === name);
        return matches.length !== 1 || exerciseOptions.filter(exercise => exercise.id === matches[0].id).length !== 1;
      }))) throw new Error("Selected exercises are unavailable or ambiguous. Your previous selection and open workout are preserved.");
      writeWorkoutBuilderSelectedExercises(records || getCatalogExercisesByName(resolvedSelection).map(toWorkoutBuilderSelectedExercise));
      setSelected(resolvedSelection);
      setTemplateStatus("");
      return true;
    } catch (cause) {
      setTemplateStatus(cause instanceof Error ? cause.message : "Exercise changes could not be kept. Your open workout is preserved.");
      return false;
    }
  }

  function applyTemplateSections(nextSections: TemplateSection[]) {
    try {
      const records = builderExerciseOccurrences(nextSections, exerciseOptions);
      if (!persistSelection(records.map(exercise => exercise.name), records)) return false;
      setTemplateSections(nextSections);
      return true;
    } catch (cause) {
      setTemplateStatus(cause instanceof Error ? cause.message : "Exercise changes could not be kept. Your open workout is preserved.");
      return false;
    }
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
                        : section.id === "accessories"
                          ? "Accessory slot"
                          : section.id === "coreConditioning"
                            ? "Core or conditioning"
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
    exerciseId?: string,
  ) {
    const matches = exerciseName ? exerciseOptions.filter(exercise => exercise.name === exerciseName && (!exerciseId || exercise.id === exerciseId)) : [];
    if (exerciseName && (matches.length !== 1 || exerciseOptions.filter(exercise => exercise.id === matches[0].id).length !== 1)) {
      setTemplateStatus("This exercise identity is unavailable or ambiguous. Your previous slot is preserved.");
      return;
    }
    const exerciseRecord = exerciseName ? toWorkoutBuilderSelectedExercise(matches[0]) : null;
    const nextSections = templateSections.map((section) =>
      section.id === sectionId
        ? {
            ...section,
            slots: section.slots.map((slot) =>
              slot.id === slotId ? { ...slot, exercise: exerciseName, exerciseRecord } : slot,
            ),
          }
        : section,
    );

    if (applyTemplateSections(nextSections)) setActiveSlot(null);
  }

  function updateSlotTarget(sectionId: TemplateSectionId, slotId: string, field: WorkoutTargetField, value: string) {
    try {
      applyTemplateSections(updateBuilderOccurrenceTarget(templateSections, exerciseOptions, sectionId, slotId, field, value));
    } catch (cause) {
      setTemplateStatus(cause instanceof Error ? cause.message : "Targets could not be kept. Previous instructions are preserved.");
    }
  }

  function clearSlotExercise(sectionId: TemplateSectionId, slotId: string) {
    updateSlotExercise(sectionId, slotId, "");
  }

  function clearSelection() {
    if (applyTemplateSections(createTemplateSections([]))) setActiveSlot(null);
  }

  async function refreshSavedTemplates() {
    const result = await loadWorkoutTemplatesWithFallback();

    setSavedTemplates(result.data);
    setTemplateSourceLabel(getTemplateSourceLabel(result));
    if (!result.success && result.error) setTemplateStatus(result.error);

    return result;
  }

  function buildCurrentTemplate(): LocalWorkoutBuilderTemplate {
    const now = new Date().toISOString();
    const normalizedTitle = getNormalizedTemplateTitle(title);
    const existingTemplate = templateEditorRef.current?.template;
    const exercises: LocalWorkoutBuilderSelectedExercise[] =
      builderExerciseOccurrences(templateSections, exerciseOptions);

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
    if (templateSaveBusyRef.current) return null;
    if (selectedExercises.length === 0) {
      setTemplateStatus("Add at least one exercise before saving a template.");
      return null;
    }

    templateSaveBusyRef.current = true;
    const submittedTitle = title;
    const submittedEditor = templateEditorRef.current;
    let committedTemplate: LocalWorkoutBuilderTemplate | null = null;
    setIsSavingTemplate(true);
    setTemplateStatus(
      assignToPlan && planAddToContext
        ? "Saving template and assigning it to your plan..."
        : "Saving template...",
    );

    try {
      assertBuilderTemplateEditor(submittedEditor || captureBuilderTemplateEditor(undefined, builderAccount));
      const planEditor = assignToPlan && planAddToContext ? capturePlanEditor(readWorkoutPlans().find(plan => plan.id === planAddToContext.planId)) : null;
      const result = await saveWorkoutTemplateWithFallback(buildCurrentTemplate());
      if (planningOwner() !== builderAccount) return null;
      const savedTemplate = result.data;
      committedTemplate = savedTemplate;
      const sourceLabel = getTemplateSourceLabel(result);
      let statusMessage = result.error
        ? `${savedTemplate.title} saved locally. Supabase sync can retry later.`
        : `${savedTemplate.title} saved via ${sourceLabel}.`;

      if (assignToPlan && planAddToContext) {
        if (planEditor) assertPlanEditor(planEditor);
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

      if (planningOwner() !== builderAccount) return null;
      if (templateEditorRef.current === submittedEditor) templateEditorRef.current = captureBuilderTemplateEditor(savedTemplate, builderAccount);
      setTitle(current => current === submittedTitle ? savedTemplate.title : current);
      setTemplateSourceLabel(getTemplateSourceLabel(refreshResult));
      setTemplateStatus(!refreshResult.success && refreshResult.error ? `${statusMessage} ${refreshResult.error}` : statusMessage);

      return savedTemplate;
    } catch (cause) {
      if (planningOwner() !== builderAccount) return null;
      const detail = cause instanceof Error ? cause.message : "Template could not be saved. Your unsaved workout is preserved.";
      setTemplateStatus(committedTemplate ? `${committedTemplate.title} saved. ${detail}` : detail);
      return null;
    } finally {
      templateSaveBusyRef.current = false;
      setIsSavingTemplate(false);
    }
  }

  function currentBuilderDraft(): BuilderDraftForm {
    return { title, sections: templateSections, exercises: builderExerciseOccurrences(templateSections, exerciseOptions), templateEditor: templateEditorRef.current };
  }

  function keepOpenBuilderDraft() {
    try {
      const editor = builderDraftEditorRef.current || captureBuilderDraftEditor(builderAccount);
      builderDraftEditorRef.current = keepBuilderDraft(currentBuilderDraft(), editor);
      setTemplateStatus("Open workout draft kept in this account.");
    } catch (cause) { setTemplateStatus(cause instanceof Error ? cause.message : "Draft could not be kept. Your open workout is preserved."); }
  }

  function reviewSuggestions(mode: BuilderSuggestionMode) {
    setSuggestionPreview(null);
    try {
      setSuggestionPreview(previewBuilderSuggestions(mode, exerciseOptions, currentBuilderDraft(), suggestionBody));
      setTemplateStatus("Review suggested additions before applying them.");
    } catch (cause) {
      setTemplateStatus(cause instanceof Error ? cause.message : "Suggestions could not be reviewed. Your workout is preserved.");
    }
  }

  function applySuggestions() {
    if (!suggestionPreview) return;
    try {
      const sections = confirmBuilderSuggestions(suggestionPreview, exerciseOptions, currentBuilderDraft());
      if (!applyTemplateSections(sections)) return;
      setSuggestionPreview(null);
      setTemplateStatus("Reviewed exercises added. Set their targets and review the workout before saving or starting.");
    } catch (cause) {
      setTemplateStatus(cause instanceof Error ? cause.message : "Suggestions could not be added. Your workout is preserved.");
    }
  }

  function restoreKeptBuilderDraft() {
    try {
      const result = restoreBuilderDraft(builderDraftEditorRef.current || captureBuilderDraftEditor(builderAccount), exerciseOptions);
      writeWorkoutBuilderSelectedExercises(result.form.exercises);
      builderDraftEditorRef.current = result.editor;
      templateEditorRef.current = result.form.templateEditor;
      setTitle(result.form.title);
      setSelected(result.form.exercises.map(exercise => exercise.name));
      setTemplateSections(result.form.sections);
      setTemplateStatus("Kept draft restored. Review it before saving a workout.");
    } catch (cause) { setTemplateStatus(cause instanceof Error ? cause.message : "Draft could not be restored. Your open workout is preserved."); }
  }

  function archiveKeptBuilderDraft() {
    try {
      const editor = builderDraftEditorRef.current || captureBuilderDraftEditor(builderAccount);
      builderDraftEditorRef.current = archiveAndKeepBuilderDraft(currentBuilderDraft(), editor);
      setTemplateStatus("Previous kept draft archived in your account planning backup. The open workout is now kept as your current draft.");
    } catch (cause) { setTemplateStatus(cause instanceof Error ? cause.message : "Draft could not be archived. Your originals and open workout are preserved."); }
  }

  function handleBuilderDraftArchive(archive: BuilderDraftArchiveEditor, action: "export" | "review") {
    setBuilderArchivePreview(null);
    try {
      if (action === "export") {
        const json = exportBuilderDraftArchive(archive);
        const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
        const link = document.createElement("a"); link.href = url; link.download = "sound-fitness-builder-draft-archive.json"; link.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        setTemplateStatus("Exact Builder draft archive exported. Your open workout and kept draft are preserved.");
      } else {
        setBuilderArchivePreview(previewBuilderDraftArchive(archive, exerciseOptions, currentBuilderDraft()));
        setTemplateStatus("Archived Builder draft preview ready. Review it before replacing the open workout.");
      }
    } catch (cause) { setTemplateStatus(cause instanceof Error ? cause.message : "Builder archive is unavailable. Your originals are preserved."); }
  }

  function applyBuilderDraftArchive() {
    if (!builderArchivePreview) return;
    try {
      const form = confirmBuilderDraftArchive(builderArchivePreview, exerciseOptions, currentBuilderDraft());
      writeWorkoutBuilderSelectedExercises(form.exercises);
      templateEditorRef.current = null;
      builderDraftEditorRef.current = captureBuilderDraftEditor(builderAccount);
      setTitle(form.title); setSelected(form.exercises.map(exercise => exercise.name)); setTemplateSections(form.sections);
      setBuilderArchivePreview(null);
      setTemplateStatus("Archived draft loaded into the open Builder as a new workout. Your kept draft and archive remain unchanged. Review before saving.");
    } catch (cause) { setTemplateStatus(cause instanceof Error ? cause.message : "Archived draft could not be loaded. Your open workout is preserved."); }
  }

  function exportKeptBuilderDraft() {
    try {
      const json = exportBuilderDraft(builderDraftEditorRef.current || captureBuilderDraftEditor(builderAccount));
      const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
      const link = document.createElement("a"); link.href = url; link.download = "sound-fitness-kept-builder-draft.json"; link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setTemplateStatus("Kept draft exported. The saved original remains in this account.");
    } catch (cause) { setTemplateStatus(cause instanceof Error ? cause.message : "Draft could not be exported."); }
  }

  function handleWorkoutArchive(archive: WorkoutArchiveEditor, action: "export" | "recover") {
    try {
      if (action === "export") {
        const json = exportWorkoutTemplateArchive(archive);
        const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
        const link = document.createElement("a"); link.href = url; link.download = "sound-fitness-workout-archive.json"; link.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        setTemplateStatus("Exact workout archive exported. Saved workouts and your open Builder are preserved.");
      } else {
        const result = recoverWorkoutTemplateArchive(archive);
        setSavedTemplates(readPlanning<LocalWorkoutBuilderTemplate[]>(planningKeys.templates, []));
        setTemplateStatus(result.alreadyRecovered ? "This archive already has a recovered workout in your saved library. Your open Builder is preserved." : "Archived workout recovered as a separate saved copy. Your open Builder and current workouts are preserved. Cloud upload is pending.");
      }
    } catch (cause) { setTemplateStatus(cause instanceof Error ? cause.message : "Workout archive is unavailable. Your originals are preserved."); }
  }

  function loadTemplate(template: LocalWorkoutBuilderTemplate) {
    try {
      const editor = captureBuilderTemplateEditor(template, builderAccount);
      assertBuilderTemplateEditor(editor);
      const prepared = bindBuilderTemplateOccurrences(template, createTemplateSections([]));
      writeWorkoutBuilderSelectedExercises(prepared.exercises);
      templateEditorRef.current = editor;
      setSelected(prepared.exercises.map(exercise => exercise.name));
      setTemplateSections(prepared.sections);
      setTitle(template.title);
      setTemplateStatus(`${template.title} loaded into the builder.`);
    } catch (cause) {
      setTemplateStatus(cause instanceof Error ? cause.message : "The workout could not be loaded. Your current draft is preserved.");
    }
  }

  function startTemplateWorkout(template: LocalWorkoutBuilderTemplate) {
    try {
      if (!builderAccount || builderAccount !== planningOwner()) throw new Error("Your account changed. Reload Builder before starting a workout.");
      if (!workoutLaunchRef.current) throw new Error("Wait for Builder to load before starting a workout.");
      const result = launchBuilderWorkout(template, workoutLaunchRef.current, true);
      workoutLaunchRef.current = result.editor;
    }
    catch (cause) {
      setTemplateStatus(cause instanceof Error ? cause.message : "The saved workout could not be started. Your current session is preserved.");
      return;
    }
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

    let template: LocalWorkoutBuilderTemplate;
    try {
      if (!builderAccount || builderAccount !== planningOwner()) throw new Error("Your account changed. Reload Builder before starting a workout.");
      if (!workoutLaunchRef.current) throw new Error("Wait for Builder to load before starting a workout.");
      if (templateEditorRef.current) assertBuilderTemplateEditor(templateEditorRef.current);
      template = buildCurrentTemplate();
      const result = launchBuilderWorkout(template, workoutLaunchRef.current);
      workoutLaunchRef.current = result.editor;
    }
    catch (cause) {
      setTemplateStatus(cause instanceof Error ? cause.message : "The workout could not be started. Your current session is preserved.");
      return;
    }
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
  const estimatedDuration = Math.max(20, selectedExercises.length * 8 + 12);
  const authoredTargets = occurrenceState.records.map(exercise => readWorkoutTargets(exercise));
  const knownSets = authoredTargets.filter(target => target.sets !== null);
  const missingSetTargets = authoredTargets.length - knownSets.length;
  const plannedSetsLabel = knownSets.length ? `${knownSets.reduce((total, target) => total + target.sets!, 0)}${missingSetTargets ? ` + ${missingSetTargets} unset` : ""}` : "Not set";
  const selectedPatterns = Array.from(
    new Set(selectedExercises.map((exercise) => exercise.pattern)),
  );
  const bodyPartsHit = Array.from(
    new Set(selectedExercises.map((exercise) => exercise.body)),
  );

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
                      exercise.id,
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
              href={ROUTES.dashboard.exerciseLibrary}
              className="mt-5 inline-flex min-h-[44px] items-center justify-center rounded-2xl border border-emerald-300/20 bg-emerald-400/10 px-4 py-3 text-sm font-black text-emerald-200 transition hover:bg-emerald-400 hover:text-slate-950"
            >
              Open Full Exercise Library
            </Link>
          </section>
        </div>
      ) : null}

      <section className="mx-auto w-full max-w-[1240px] space-y-6 px-4 py-8">
        <TrainingJourneyNavigator currentStep="workout-builder" variant="full" />

        <section className="rounded-[40px] border border-white/10 bg-[radial-gradient(circle_at_18%_8%,rgba(34,211,238,0.18),transparent_32%),radial-gradient(circle_at_90%_20%,rgba(16,185,129,0.12),transparent_30%),linear-gradient(135deg,rgba(15,23,42,0.96),rgba(2,6,23,0.98))] p-6 shadow-2xl lg:p-8">
          <div className="grid gap-6 lg:grid-cols-[1fr_320px] lg:items-start">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.3em] text-cyan-300">
                Session Composer
              </p>
              <h1 className="mt-4 text-4xl font-black leading-tight lg:text-5xl">
                🛠 Workout Builder
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300">
                Build sessions from your libraries, goals, and readiness.
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

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            {[
              ["Selected Goal", builderContext.goal],
              ["Current Focus", builderContext.currentFocus],
              ["Draft Count", `${selectedExercises.length} exercises`],
              ["Duration", `${estimatedDuration} min`],
              ["Readiness", builderContext.readinessWarning],
              ["Suggested", builderContext.suggestedFocus],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-2xl border border-white/10 bg-slate-950/50 p-3"
              >
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                  {label}
                </p>
                <p className="mt-2 truncate text-sm font-black text-white">
                  {value}
                </p>
              </div>
            ))}
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
                  href={ROUTES.dashboard.exerciseLibrary}
                  className="min-h-[40px] rounded-full border border-cyan-300/20 bg-cyan-400/10 px-4 py-2 text-xs font-black text-cyan-200 transition hover:bg-cyan-400 hover:text-slate-950"
                >
                  Exercise Library
                </Link>
              </div>

              <div className="overflow-x-auto pb-5">
                <div className="flex w-max gap-4">
                  {templateSections.flatMap((section) =>
                    section.slots.map((slot, slotIndex) => {
                      const selectedExercise = slot.exerciseRecord
                        ? builderOccurrenceDisplay(slot.exerciseRecord, exerciseOptions)
                        : exerciseOptions.filter(exercise => exercise.name === slot.exercise).length === 1
                          ? exerciseOptions.find(exercise => exercise.name === slot.exercise)
                          : undefined;

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
                            {(["sets", "reps", "restSeconds"] as const).map(field => (
                              <input key={field} aria-label={field === "restSeconds" ? "Planned rest in seconds" : `Planned ${field}`}
                                placeholder={field === "restSeconds" ? "Rest (sec)" : field === "sets" ? "Sets" : "Reps"}
                                inputMode={field === "reps" ? "text" : "numeric"} disabled={!slot.exercise}
                                value={workoutTargetFieldValue(slot.exerciseRecord, field)}
                                onChange={event => updateSlotTarget(section.id, slot.id, field, event.target.value)} />
                            ))}
                          </div>

                          <textarea
                            aria-label="Coaching notes" disabled={!slot.exercise}
                            value={workoutTargetFieldValue(slot.exerciseRecord, "notes")}
                            onChange={event => updateSlotTarget(section.id, slot.id, "notes", event.target.value)}
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

          <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_0.8fr]">
            <section className="rounded-[30px] border border-amber-300/20 bg-amber-300/10 p-5">
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-amber-200">
                Smart Add Panel
              </p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {builderSuggestionModes.map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => reviewSuggestions(mode)}
                    className="rounded-2xl border border-white/10 bg-slate-950/45 px-4 py-3 text-left text-sm font-black text-white transition hover:border-amber-200/40 hover:bg-amber-300/10"
                  >
                    {mode}
                  </button>
                ))}
              </div>
              <label className="mt-4 block text-sm text-slate-200">
                Body area for suggestions
                <select value={suggestionBody} onChange={event => { setSuggestionBody(event.target.value); setSuggestionPreview(null); }} className="ml-2 rounded bg-slate-950 p-2">
                  {exerciseBodyOptions.map(body => <option key={body} value={body}>{body}</option>)}
                </select>
              </label>
              <p className="mt-4 text-sm leading-6 text-slate-300">
                Preview catalog matches using saved Goals, confirmed equipment and exact-ID favorites. Base movements fill missing patterns; existing slots stay in place. Review mobility options against your reported readiness.
              </p>
              {suggestionPreview ? <div role="region" aria-label="Suggested exercise additions" className="mt-4 space-y-3">
                <p>{suggestionPreview.context}</p>
                {suggestionPreview.candidates.length ? <ul>{suggestionPreview.candidates.map(candidate => <li key={candidate.exercise.id} className="mt-3">
                  <strong>{candidate.exercise.name}</strong> · {candidate.exercise.equipment}
                  <p className="text-sm text-slate-300">{candidate.reasons.join(" ")}</p>
                </li>)}</ul> : <p>No new matches with confirmed equipment. Review Profile equipment, change the body area, or choose exercises manually.</p>}
                <button type="button" disabled={!suggestionPreview.candidates.length} onClick={applySuggestions} className="mr-4 underline disabled:opacity-50">Add reviewed exercises</button>
                <button type="button" onClick={() => setSuggestionPreview(null)} className="underline">Cancel suggestions</button>
              </div> : null}
            </section>

            <section className="rounded-[30px] border border-cyan-300/20 bg-cyan-300/10 p-5">
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-cyan-200">
                Workout Summary
              </p>
              <div className="mt-4 grid gap-2">
                {[
                  ["Total Exercises", String(selectedExercises.length)],
                  ["Planned Sets", plannedSetsLabel],
                  ["Rep Targets", `${authoredTargets.filter(target => target.reps).length}/${authoredTargets.length} exercises`],
                  ["Body Parts Hit", bodyPartsHit.join(", ") || "None yet"],
                  ["Movement Patterns", selectedPatterns.join(", ") || "None yet"],
                  ["Recovery Risk", builderContext.readinessWarning],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/45 px-4 py-3"
                  >
                    <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                      {label}
                    </span>
                    <span className="min-w-0 truncate text-right text-sm font-bold text-white">
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="mt-4 flex flex-wrap gap-3" aria-label="Builder draft controls">
            <button type="button" onClick={keepOpenBuilderDraft}>Keep draft in this account</button>
            <button type="button" disabled={!keptDraftAvailable} onClick={restoreKeptBuilderDraft}>Restore kept draft</button>
            <button type="button" disabled={!keptDraftAvailable} onClick={exportKeptBuilderDraft}>Export kept draft</button>
            <button type="button" disabled={!keptDraftAvailable} onClick={archiveKeptBuilderDraft}>Archive kept draft and keep open workout</button>
          </div>
          <p className="mt-2 text-xs text-slate-400">Drafts are kept when you choose Keep. Restore an existing draft before replacing it, or archive it to preserve the original in your account planning backup. Saving a workout is a separate action.</p>
          <details className="mt-4 rounded-2xl border border-white/10 p-4 text-sm">
            <summary className="cursor-pointer font-bold text-cyan-200">Archived Builder drafts</summary>
            <p className="mt-2 text-slate-400">Review an archived draft before replacing the open workout, or export its exact original. Loading keeps the archive and current kept draft intact; saving creates a new workout.</p>
            {archivedBuilderDrafts.length ? <ul className="mt-3 max-h-80 space-y-3 overflow-y-auto">
              {archivedBuilderDrafts.map(archive => <li key={archive.editor.key} className="border-t border-white/10 pt-3">
                <p className="font-bold">{archive.title}</p>
                <p className="text-xs text-slate-400">{archive.archivedAt || "Archive date unavailable"}</p>
                <div className="mt-2 flex flex-wrap gap-3 text-cyan-200">
                  <button type="button" onClick={() => handleBuilderDraftArchive(archive.editor, "export")} className="underline">Export exact Builder archive</button>
                  <button type="button" disabled={!archive.canReview} onClick={() => handleBuilderDraftArchive(archive.editor, "review")} className="underline disabled:opacity-50">Review archived Builder draft</button>
                </div>
              </li>)}
            </ul> : <p className="mt-2 text-slate-400">No archived Builder drafts in this account.</p>}
          </details>
          {builderArchivePreview && <section aria-label="Archived Builder draft preview" className="mt-4 rounded-2xl border border-cyan-300/20 p-4 text-sm">
            <h3 className="font-bold text-cyan-200">{builderArchivePreview.form.title || "Untitled archived draft"}</h3>
            <ol className="mt-2 list-decimal space-y-1 pl-5">{builderArchivePreview.form.exercises.map((exercise, index) => <li key={index}>{exercise.name}</li>)}</ol>
            <dl className="mt-3 space-y-2">{builderArchivePreview.form.sections.map(section => <div key={section.id}><dt className="font-bold">{section.title}</dt><dd>{section.slots.map(slot => `${slot.label}: ${slot.exercise || "Empty slot"}`).join(" · ")}</dd></div>)}</dl>
            <p className="mt-2 text-slate-400">The open workout is unchanged until you choose Replace. The saved workout link is cleared so a later save creates a new workout.</p>
            <div className="mt-3 flex flex-wrap gap-3 text-cyan-200">
              <button type="button" onClick={applyBuilderDraftArchive} className="underline">Replace open Builder with archived draft</button>
              <button type="button" onClick={() => setBuilderArchivePreview(null)} className="underline">Cancel archived draft preview</button>
            </div>
          </section>}
          <details className="mt-4 rounded-2xl border border-white/10 p-4 text-sm">
            <summary className="cursor-pointer font-bold text-cyan-200">Workouts archived before cloud refresh</summary>
            <p className="mt-2 text-slate-400">Export an exact archive or recover it as a separate saved workout. Recovery keeps the archived exercises and leaves your open Builder, current workouts and plan unchanged.</p>
            {workoutArchives.length ? <ul className="mt-3 max-h-80 space-y-3 overflow-y-auto">
              {workoutArchives.map(archive => <li key={archive.editor.key} className="border-t border-white/10 pt-3">
                <p className="font-bold">{archive.title}</p>
                <p className="text-xs text-slate-400">{archive.archivedAt || "Archive date unavailable"}</p>
                <div className="mt-2 flex flex-wrap gap-3 text-cyan-200">
                  <button type="button" onClick={() => handleWorkoutArchive(archive.editor, "export")} className="underline">Export exact workout archive</button>
                  <button type="button" disabled={!archive.canRecover} onClick={() => handleWorkoutArchive(archive.editor, "recover")} className="underline disabled:opacity-50">Recover as new workout</button>
                </div>
              </li>)}
            </ul> : <p className="mt-2 text-slate-400">No workouts archived before cloud refresh in this account.</p>}
          </details>
          {(occurrenceState.issue || templateStatus) ? (
            <p role="status" className="mt-4 rounded-2xl border border-cyan-300/20 bg-cyan-400/10 px-4 py-3 text-sm font-bold text-cyan-100">
              {occurrenceState.issue || templateStatus}
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
                href={ROUTES.dashboard.plan}
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
              href={ROUTES.dashboard.plan}
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
