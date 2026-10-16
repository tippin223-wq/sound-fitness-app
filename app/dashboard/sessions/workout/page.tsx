"use client";

import { exerciseSemanticMetadata, type ExerciseSemanticMetadata } from "@/lib/planning/exerciseSemanticMetadata";
import { readWorkoutTargets } from "@/lib/planning/workoutTargets";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import {
  type LocalWorkoutBuilderTemplate,
  type LocalWorkoutBuilderSessionTemplate,
  startSavedWorkoutBuilderSession,
} from "@/lib/localData/workoutBuilderData";
import {
  loadWorkoutTemplatesWithFallback,
  saveCompletedWorkoutLogWithFallback,
} from "@/lib/data/workoutPersistence";
import { getActiveWorkoutSessionContext, inspectWorkoutPlans } from "@/lib/localData/workoutPlanData";
import { activateDefaultWorkout } from "@/lib/planning/workoutLaunch";
import { exerciseLogStatus, workoutCompletionIssue, plannedAssignmentSetTarget, workoutTargetLabel } from "@/lib/planning/workoutEntryDraft";
import { assertWorkoutDraftEditor, captureWorkoutDraftEditor, writeWorkoutDraft, finalizeWorkoutDraft, unfinishedWorkoutDrafts, resumeWorkoutDraft, exportWorkoutDraft, preserveCompletedDefaultDraft, workoutDraftKey as sessionDraftKey, type WorkoutDraftEditor } from "@/lib/planning/workoutDrafts";
import { assertWorkoutNotCompleted, readPlanningLogs, workoutSaveFailureMessage } from "@/lib/planning/logs";
import { workoutStartedAt } from "@/lib/planning/history";
import { planningOwner, planningAccountGeneration, planningSnapshot, subscribePlanning, readPlanning } from "@/lib/planning/store";
import { ROUTES } from "@/lib/routes";
import { captureWorkoutHistoryRecovery } from "@/lib/planning/workoutHistoryRecovery";
import WorkoutHistoryReviewNotice from "@/components/dashboard/WorkoutHistoryReviewNotice";
import { captureActiveSessionRecovery, exportActiveSessionRecovery } from "@/lib/planning/activeSessionRecovery";
import { captureWorkoutLaunchEditor, assertWorkoutLaunchEditor, reviewWorkoutLaunchEditor } from "@/lib/planning/workoutLaunchEditor";
import type { LocalExerciseStatEntry } from "@/types";

type ExerciseLogDraft = {
  weight: string;
  weightUnit?: string;
  reps: string;
  sets: string;
};
type SessionDraft = { id: string; logs: Record<number, ExerciseLogDraft>; completedAt?: string };
function plannedSets(template: LocalWorkoutBuilderSessionTemplate) {
  const context = getActiveWorkoutSessionContext();
  if (context?.source !== "plan" || context.templateId !== template.id) return null;
  const inspected = inspectWorkoutPlans();
  if (inspected.issue) return null;
  const assignment = inspected.plans.find(plan => plan.id === context.planId)?.days.find(day => day.id === context.planDayId && day.date === context.planDayDate)?.assignments.find(assignment => assignment.id === context.assignmentId && assignment.templateId === template.id);
  return plannedAssignmentSetTarget(assignment);
}

type SessionExerciseMeta = ExerciseSemanticMetadata & {
  exerciseId: string;
  exerciseName: string;
  body: string;
  pattern: string;
  equipment: string;
  targetSets: number | null;
  targetReps: string;
  defaultWeight: string;
};

type SessionTimelineStep = {
  id: number;
  type: string;
  title: string;
  subtitle?: string;
  duration: number;
  videoLabel?: string;
  cue?: string;
  note?: string;
  coach?: string;
};

const sessionExerciseMeta: Record<number, SessionExerciseMeta> = {
  2: {
    exerciseId: "glute-bridge",
    exerciseName: "Glute Bridge",
    body: "Glutes",
    pattern: "Hip Extension",
    equipment: "Bodyweight",
    targetSets: 2,
    targetReps: "10",
    defaultWeight: "",
  },
  3: {
    exerciseId: "dead-bug",
    exerciseName: "Dead Bug",
    body: "Core",
    pattern: "Core",
    equipment: "Bodyweight",
    targetSets: 2,
    targetReps: "8",
    defaultWeight: "",
  },
  4: {
    exerciseId: "bodyweight-squat",
    exerciseName: "Bodyweight Squat",
    body: "Legs",
    pattern: "Squat",
    equipment: "Bodyweight",
    targetSets: 2,
    targetReps: "8",
    defaultWeight: "",
  },
  5: {
    exerciseId: "goblet-squat",
    exerciseName: "Goblet Squat",
    body: "Legs",
    pattern: "Squat",
    equipment: "Dumbbell",
    targetSets: 3,
    targetReps: "8",
    defaultWeight: "",
  },
  6: {
    exerciseId: "db-romanian-deadlift",
    exerciseName: "DB Romanian Deadlift",
    body: "Hamstrings",
    pattern: "Hinge",
    equipment: "Dumbbell",
    targetSets: 3,
    targetReps: "10",
    defaultWeight: "",
  },
  7: {
    exerciseId: "step-up",
    exerciseName: "Step-Up",
    body: "Legs",
    pattern: "Squat",
    equipment: "Box",
    targetSets: 2,
    targetReps: "10",
    defaultWeight: "",
  },
  8: {
    exerciseId: "one-arm-db-row",
    exerciseName: "One Arm DB Row",
    body: "Back",
    pattern: "Pull",
    equipment: "Dumbbell",
    targetSets: 2,
    targetReps: "12",
    defaultWeight: "",
  },
  9: {
    exerciseId: "plank",
    exerciseName: "Plank",
    body: "Core",
    pattern: "Core",
    equipment: "Bodyweight",
    targetSets: 2,
    targetReps: "30",
    defaultWeight: "",
  },
};

const createTemplateWorkout = (template: LocalWorkoutBuilderSessionTemplate) => {
  const exerciseSteps: SessionTimelineStep[] = template.exercises.map(
    (exercise, index) => ({
      id: index + 2,
      type: index === 0 ? "compound" : "accessory",
      title: exercise.name,
      subtitle: `Template exercise ${index + 1} · ${workoutTargetLabel(readWorkoutTargets(exercise, plannedSets(template)).sets, readWorkoutTargets(exercise).reps)}`,
      duration: 75,
      videoLabel: `${exercise.name} Notes`,
      cue: readWorkoutTargets(exercise).issue || readWorkoutTargets(exercise).notes || "Move with control, keep the setup clean, and log your working sets.",
      note: [exercise.body, exercise.pattern, exercise.equipment, readWorkoutTargets(exercise).restSeconds === null ? "" : `Planned rest: ${readWorkoutTargets(exercise).restSeconds} seconds`].filter(Boolean).join(" · "),
    }),
  );

  return {
    title: template.title,
    subtitle: `Builder template â€¢ ${template.exercises.length} exercise${
      template.exercises.length === 1 ? "" : "s"
    }`,
    soundscape: "Builder Template",
    timeline: [
      {
        id: 1,
        type: "intro",
        title: "Template Session Start",
        duration: 30,
        coach:
          "This workout was started from your saved builder template. Review the exercise list, then log each movement.",
      },
      ...exerciseSteps,
      {
        id: exerciseSteps.length + 2,
        type: "finish",
        title: "Workout Complete",
        duration: 20,
        coach:
          "Nice work. Finish the workout to save these logged sets into your stats.",
      },
    ] as SessionTimelineStep[],
  };
};

const createTemplateSessionExerciseMeta = (
  template: LocalWorkoutBuilderSessionTemplate,
) =>
  Object.fromEntries(
    template.exercises.map((exercise, index) => [
      index + 2,
      {
        ...exerciseSemanticMetadata(exercise),
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        body: exercise.body,
        pattern: exercise.pattern,
        equipment: exercise.equipment,
        targetSets: readWorkoutTargets(exercise, plannedSets(template)).sets,
        targetReps: readWorkoutTargets(exercise).reps,
        defaultWeight: "",
      },
    ]),
  ) as Record<number, SessionExerciseMeta>;

const createInitialExerciseLogs = (
  timeline: SessionTimelineStep[],
  exerciseMeta: Record<number, SessionExerciseMeta>,
) =>
  Object.fromEntries(
    timeline
      .filter((step) => exerciseMeta[step.id])
      .map((step) => {
        return [
          step.id,
          {
            weight: "",
            weightUnit: "",
            reps: "",
            sets: "",
          },
        ];
      }),
  ) as Record<number, ExerciseLogDraft>;

const isCompleteExerciseLog = (log?: ExerciseLogDraft) =>
  exerciseLogStatus(log) === "complete";

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

const defaultWorkout = {
    title: "Lower Body Strength Day",
    subtitle: "Beginner • Dumbbells • 35 min",
    soundscape: "Rain + Soft Pulse",
    timeline: [
      {
        id: 1,
        type: "intro",
        title: "Session Start",
        duration: 30,
        coach:
          "Set your dumbbells nearby, clear your space, and get ready to move.",
      },
      {
        id: 2,
        type: "warmup",
        title: "Glute Bridge",
        subtitle: "Warm-Up 1 • 2 sets x 10 reps",
        duration: 60,
        videoLabel: "Bridge Demo",
        cue: "Drive through your heels and squeeze at the top.",
        note: "Slow and controlled.",
      },
      {
        id: 3,
        type: "warmup",
        title: "Dead Bug",
        subtitle: "Warm-Up 2 • 2 sets x 8/side",
        duration: 60,
        videoLabel: "Dead Bug Demo",
        cue: "Keep your lower back gently pressed down.",
        note: "Exhale as the leg reaches long.",
      },
      {
        id: 4,
        type: "warmup",
        title: "Bodyweight Squat",
        subtitle: "Warm-Up 3 • 2 sets x 8 reps",
        duration: 60,
        videoLabel: "Squat Demo",
        cue: "Sit between your hips and keep your chest tall.",
        note: "Use this to groove the pattern for the main lift.",
      },
      {
        id: 5,
        type: "compound",
        title: "DB Goblet Squat",
        subtitle: "Compound 1 • 3 sets x 8 reps",
        duration: 90,
        videoLabel: "Goblet Squat Demo",
        cue: "Brace first, then descend with control.",
        note: "Rest 60–90 sec between sets.",
      },
      {
        id: 6,
        type: "compound",
        title: "DB Romanian Deadlift",
        subtitle: "Compound 2 • 3 sets x 10 reps",
        duration: 90,
        videoLabel: "RDL Demo",
        cue: "Push the hips back and keep the weights close.",
        note: "Feel hamstrings load before standing tall.",
      },
      {
        id: 7,
        type: "accessory",
        title: "Step-Up",
        subtitle: "Accessory 1 • 2 sets x 10/side",
        duration: 75,
        videoLabel: "Step-Up Demo",
        cue: "Drive through the whole foot on the box.",
        note: "Control the lowering phase.",
      },
      {
        id: 8,
        type: "accessory",
        title: "1-Arm DB Row",
        subtitle: "Accessory 2 • 2 sets x 12/side",
        duration: 75,
        videoLabel: "Row Demo",
        cue: "Pull your elbow toward your hip, not your shoulder.",
        note: "Keep the torso stable.",
      },
      {
        id: 9,
        type: "core",
        title: "Plank",
        subtitle: "Core • 2 rounds x 30 seconds",
        duration: 45,
        videoLabel: "Plank Demo",
        cue: "Squeeze glutes and keep ribs stacked over pelvis.",
        note: "Breathe calmly.",
      },
      {
        id: 10,
        type: "finish",
        title: "Workout Complete",
        duration: 20,
        coach:
          "Nice work. Log how the session felt, then move on with your day stronger than before.",
      },
    ],
  };

export default function WorkoutBuilderPage() {
  const router = useRouter();
  useSyncExternalStore(subscribePlanning, planningSnapshot, () => null);
  const historyRecovery = captureWorkoutHistoryRecovery();
  const historyNeedsReview = historyRecovery.issues.length > 0;
  const activeRecovery = captureActiveSessionRecovery();
  const activeNeedsReview = activeRecovery.issues.length > 0;
  const unfinishedDrafts = historyNeedsReview ? [] : unfinishedWorkoutDrafts();
  const loadedAccount = useRef(planningOwner());
  const launchEditorRef = useRef(captureWorkoutLaunchEditor());
  const draftEditor = useRef<WorkoutDraftEditor | null>(null);
  const [activeSessionTemplate, setActiveSessionTemplate] =
    useState<LocalWorkoutBuilderSessionTemplate | null>(null);
  const [savedSessionTemplates, setSavedSessionTemplates] = useState<
    LocalWorkoutBuilderTemplate[]
  >([]);
  const [launcherMessage, setLauncherMessage] = useState("");
  const [templateSourceLabel, setTemplateSourceLabel] =
    useState("Loading templates");
  const workout = activeSessionTemplate && !activeNeedsReview
    ? createTemplateWorkout(activeSessionTemplate)
    : defaultWorkout;
  const activeSessionExerciseMeta = activeSessionTemplate && !activeNeedsReview
    ? createTemplateSessionExerciseMeta(activeSessionTemplate)
    : sessionExerciseMeta;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [saveMessage, setSaveMessage] = useState("");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const savingRef = useRef(false);
  const completionViewRef = useRef({ active: false, revision: 0, timer: null as number | null });
  useEffect(() => {
    const view = completionViewRef.current;
    view.active = true;
    view.revision++;
    return () => {
      view.active = false;
      view.revision++;
      if (view.timer !== null) window.clearTimeout(view.timer);
      view.timer = null;
    };
  }, []);
  const sessionKeyRef = useRef<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [exerciseLogs, setExerciseLogs] = useState<
    Record<number, ExerciseLogDraft>
  >(() => createInitialExerciseLogs(defaultWorkout.timeline, sessionExerciseMeta));

  useEffect(() => {
    let isActive = true;

    const loadSavedSessionTemplates = async () => {
      const result = await loadWorkoutTemplatesWithFallback();

      if (!isActive) return;

      setSavedSessionTemplates(result.data);
      setTemplateSourceLabel(getTemplateSourceLabel(result));
    };

    loadSavedSessionTemplates();

    const reviewed = captureActiveSessionRecovery();
    const activeTemplate = reviewed.issues.length ? null : reviewed.template;

    if (activeTemplate?.exercises?.length) {
      setActiveSessionTemplate(activeTemplate);
    }

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (historyNeedsReview || activeNeedsReview) return;
    const templateWorkout = activeSessionTemplate ? createTemplateWorkout(activeSessionTemplate) : defaultWorkout;
    const templateExerciseMeta =
      activeSessionTemplate ? createTemplateSessionExerciseMeta(activeSessionTemplate) : sessionExerciseMeta;
    const saved = readPlanning<SessionDraft | string | null>(sessionDraftKey(activeSessionTemplate), null);
    draftEditor.current = captureWorkoutDraftEditor(activeSessionTemplate, loadedAccount.current);
    const draft = saved && typeof saved === "object" ? saved : null;
    const id = draft?.id || (typeof saved === "string" ? saved : null);
    const completed = id ? readPlanningLogs().find(log => log.id === id) : null;

    sessionKeyRef.current = id; savingRef.current = false;
    setCurrentIndex(0);
    setSaveMessage("");
    setLastSavedAt(completed?.completedAt || draft?.completedAt || null);
    setIsSaving(false);
    setExerciseLogs(
      draft?.logs || createInitialExerciseLogs(
        templateWorkout.timeline,
        templateExerciseMeta,
      ),
    );
  }, [activeSessionTemplate, historyNeedsReview, activeNeedsReview]);

  const resetDefaultWorkoutSession = (preserveVersion?: string) => {
    if (planningOwner() !== loadedAccount.current) throw new Error("Your account changed. Reload the workout before switching sessions.");
    assertWorkoutLaunchEditor(launchEditorRef.current);
    let reset: boolean;
    if (preserveVersion !== undefined) {
      if (!draftEditor.current) throw new Error("Reload the workout before starting a new session.");
      preserveCompletedDefaultDraft(preserveVersion, draftEditor.current);
      reset = true;
    } else {
      reset = activateDefaultWorkout().reset;
    }
    launchEditorRef.current = captureWorkoutLaunchEditor();
    draftEditor.current = captureWorkoutDraftEditor(null, loadedAccount.current);
    setActiveSessionTemplate(null);
    const saved = readPlanning<SessionDraft | string | null>(sessionDraftKey(null), null);
    const draft = saved && typeof saved === "object" ? saved : null;
    const id = draft?.id || (typeof saved === "string" ? saved : null);
    const completed = id ? readPlanningLogs().find(log => log.id === id) : null;
    sessionKeyRef.current = id; savingRef.current = false;
    setCurrentIndex(0);
    setSaveMessage("");
    setLastSavedAt(completed?.completedAt || draft?.completedAt || null);
    setIsSaving(false);
    const nextLogs = reset ? createInitialExerciseLogs(defaultWorkout.timeline, sessionExerciseMeta) : draft?.logs || createInitialExerciseLogs(defaultWorkout.timeline, sessionExerciseMeta);
    setExerciseLogs(JSON.parse(JSON.stringify(nextLogs)) as Record<number, ExerciseLogDraft>);
  };

  const startDefaultWorkout = () => {
    if (savingRef.current) return;
    try {
      resetDefaultWorkoutSession();
      setLauncherMessage("Default workout ready. Any unfinished default draft is retained.");
    } catch (cause) {
      setLauncherMessage(cause instanceof Error ? cause.message : "The workout could not be opened. Try again.");
    }
  };

  const resumeActiveTemplate = () => {
    if (planningOwner() !== loadedAccount.current) { setLauncherMessage("Your account changed. Reload the workout before resuming."); return; }
    try { launchEditorRef.current = reviewWorkoutLaunchEditor(launchEditorRef.current).editor; }
    catch (cause) { setLauncherMessage(cause instanceof Error ? cause.message : "The current workout could not be reviewed."); return; }
    const review = captureActiveSessionRecovery();
    if (review.issues.length) { setLauncherMessage(review.issues.join(" ")); return; }
    const activeTemplate = review.template;

    if (!activeTemplate?.exercises?.length) {
      setLauncherMessage("No active builder template to resume.");
      return;
    }

    setActiveSessionTemplate(activeTemplate);
    setLauncherMessage(`${activeTemplate.title} ready.`);
  };

  const startSavedTemplate = (template: LocalWorkoutBuilderTemplate) => {
    if (template.exercises.length === 0) {
      setLauncherMessage("This template has no exercises to start.");
      return;
    }

    if (savingRef.current) return;
    try {
      if (planningOwner() !== loadedAccount.current) throw new Error("Your account changed. Reload the workout before switching sessions.");
      assertWorkoutLaunchEditor(launchEditorRef.current);
      const sessionTemplate = startSavedWorkoutBuilderSession(template);
      launchEditorRef.current = captureWorkoutLaunchEditor();
      setActiveSessionTemplate(sessionTemplate);
      setLauncherMessage(`${sessionTemplate.title} ready.`);
    } catch (cause) {
      setLauncherMessage(cause instanceof Error ? cause.message : "The workout could not be opened. Try again.");
    }
  };

  const clearActiveTemplate = () => {
    startDefaultWorkout();
  };

  function reviewLoggerLaunchControls() {
    if (savingRef.current) return;
    try {
      const reviewed = reviewWorkoutLaunchEditor(launchEditorRef.current);
      launchEditorRef.current = reviewed.editor;
      setLauncherMessage(`Current workout: ${reviewed.title}. Launch controls reviewed. Choose a session when ready; logged entries are unchanged.`);
    } catch (cause) { setLauncherMessage(cause instanceof Error ? cause.message : "Workout controls could not be reviewed."); }
  }

  function resumeSavedLoggerDraft(draft: { key: string; version: string; generation: number }) {
    if (savingRef.current) return;
    try {
      assertWorkoutLaunchEditor(launchEditorRef.current);
      const template = resumeWorkoutDraft(draft.key, draft.version, loadedAccount.current, draft.generation);
      launchEditorRef.current = captureWorkoutLaunchEditor();
      setActiveSessionTemplate({ ...template });
      setLauncherMessage(`${template.title} restored with its saved entries.`);
    } catch (cause) { setLauncherMessage(cause instanceof Error ? cause.message : "This draft could not be resumed."); }
  }

  const current = workout.timeline[currentIndex] || workout.timeline[0];
  const currentExerciseMeta = activeSessionExerciseMeta[current.id];
  const currentExerciseLog = exerciseLogs[current.id];
  const loggableSteps = workout.timeline.filter(
    (step) => activeSessionExerciseMeta[step.id],
  );
  const loggedExerciseCount = loggableSteps.filter((step) =>
    isCompleteExerciseLog(exerciseLogs[step.id]),
  ).length;

  const progress = Math.round(((currentIndex + 1) / workout.timeline.length) * 100);

  const canGoBack = currentIndex > 0;
  const canGoNext = currentIndex < workout.timeline.length - 1;

  const nextStep = () => canGoNext && setCurrentIndex((i) => i + 1);
  const prevStep = () => canGoBack && setCurrentIndex((i) => i - 1);
  const updateExerciseLog = (
    stepId: number,
    field: keyof ExerciseLogDraft,
    value: string,
  ) => {
    if (lastSavedAt || savingRef.current) return;
    const nextLogs = { ...exerciseLogs, [stepId]: { ...exerciseLogs[stepId], [field]: value } };
    const id = sessionKeyRef.current || getActiveWorkoutSessionContext()?.id || crypto.randomUUID();
    try {
      if (!draftEditor.current) throw new Error("The workout is still loading. Try again.");
      draftEditor.current = writeWorkoutDraft(draftEditor.current, { id, logs: nextLogs });
    }
    catch (cause) { setSaveMessage(cause instanceof Error ? cause.message : "Your draft could not be saved. Try again."); return; }
    sessionKeyRef.current = id;
    setSaveMessage("");
    setLastSavedAt(null);
    setIsSaving(false);
    setExerciseLogs(nextLogs);
  };

  const saveWorkoutStats = async () => {
    if (!completionViewRef.current.active || savingRef.current || lastSavedAt) return;
    try {
      if (!draftEditor.current) throw new Error("The workout is still loading. Try again.");
      assertWorkoutDraftEditor(draftEditor.current);
    } catch (cause) { setSaveMessage(cause instanceof Error ? cause.message : "Reload the workout before saving."); return; }
    const entryIssue = workoutCompletionIssue(loggableSteps.map(step => ({ name: activeSessionExerciseMeta[step.id].exerciseName, log: exerciseLogs[step.id] })));
    if (entryIssue) { setSaveMessage(entryIssue); return; }
    const context = getActiveWorkoutSessionContext();
    const linkedContext = context && context.templateId === activeSessionTemplate?.id ? context : null;
    try { assertWorkoutNotCompleted(sessionKeyRef.current, linkedContext?.assignmentId); }
    catch (cause) { setSaveMessage(cause instanceof Error ? cause.message : "Review the completed workout in History before continuing."); return; }
    if (!sessionKeyRef.current) {
      const nextSessionId = linkedContext?.id || crypto.randomUUID();
      try { draftEditor.current = writeWorkoutDraft(draftEditor.current!, { id: nextSessionId, logs: exerciseLogs }); } catch (cause) { setSaveMessage(cause instanceof Error ? cause.message : "This browser could not save the session. Try again."); return; }
      sessionKeyRef.current = nextSessionId;
    }
    const completedAt = new Date().toISOString();
    const completedEntries: LocalExerciseStatEntry[] = [];

    loggableSteps.forEach((step) => {
      const meta = activeSessionExerciseMeta[step.id];
      const log = exerciseLogs[step.id];

      if (meta && isCompleteExerciseLog(log)) {
        completedEntries.push({
          ...exerciseSemanticMetadata(meta),
          exerciseId: meta.exerciseId,
          exerciseName: meta.exerciseName,
          body: meta.body,
          pattern: meta.pattern,
          equipment: meta.equipment,
          weight: log.weight.trim(),
          ...(log.weightUnit === "lb" || log.weightUnit === "kg" ? { weightUnit: log.weightUnit } : {}),
          reps: log.reps.trim(),
          sets: log.sets.trim(),
          date: completedAt,
          source: "workout-session",
        });
      }
    });

    if (completedEntries.length === 0) {
      setSaveMessage(
        "Log weight, reps, and sets for at least one movement before finishing.",
      );
      setLastSavedAt(null);
      setIsSaving(false);
      return;
    }

    const account = planningOwner();
    const savedSessionId = sessionKeyRef.current;
    if (!savedSessionId) return;
    const generation = planningAccountGeneration();
    const viewRevision = completionViewRef.current.revision;
    const stillCurrent = () => completionViewRef.current.active && completionViewRef.current.revision === viewRevision
      && planningOwner() === account && planningAccountGeneration() === generation && sessionKeyRef.current === savedSessionId;
    try {
      savingRef.current = true;
      setIsSaving(true);
      const result = await saveCompletedWorkoutLogWithFallback({
        sessionId: savedSessionId,
        planId: linkedContext?.planId, planDayId: linkedContext?.planDayId, assignmentId: linkedContext?.assignmentId,
        title: workout.title,
        templateId: activeSessionTemplate?.id ?? null,
        startedAt: workoutStartedAt(completedAt, linkedContext?.startedAt, activeSessionTemplate?.startedAt),
        completedAt,
        entries: completedEntries,
      });
      if (!stillCurrent() || getActiveWorkoutSessionContext()?.id !== context?.id) return;
      const sourceLabel =
        result.source === "supabase" ? "Supabase" : "localStorage fallback";

      if (!result.success) throw new Error(result.error || "Workout could not be saved.");
      assertWorkoutDraftEditor(draftEditor.current!);
      finalizeWorkoutDraft(draftEditor.current!, savedSessionId, exerciseLogs, completedAt);
      setLastSavedAt(completedAt);
      setSaveMessage(
        `Saved ${completedEntries.length} exercise ${
          completedEntries.length === 1 ? "entry" : "entries"
        } via ${sourceLabel}. Opening your saved workout...`,
      );
      completionViewRef.current.timer = window.setTimeout(() => {
        completionViewRef.current.timer = null;
        if (stillCurrent()) router.push(`${ROUTES.dashboard.workoutComplete}#${encodeURIComponent(savedSessionId)}`);
      }, 650);
    } catch (cause) {
      if (!stillCurrent() || getActiveWorkoutSessionContext()?.id !== context?.id) return;
      savingRef.current = false;
      setIsSaving(false);
      setLastSavedAt(null);
      setSaveMessage(
        workoutSaveFailureMessage(savedSessionId, cause),
      );
    }
  };

  const badgeStyles = {
    intro: "bg-sky-500/15 text-sky-300 border-sky-400/20",
    warmup: "bg-emerald-500/15 text-emerald-300 border-emerald-400/20",
    compound: "bg-orange-500/15 text-orange-300 border-orange-400/20",
    accessory: "bg-violet-500/15 text-violet-300 border-violet-400/20",
    core: "bg-pink-500/15 text-pink-300 border-pink-400/20",
    finish: "bg-cyan-500/15 text-cyan-300 border-cyan-400/20",
  };

  const formatSeconds = (value: number) => {
    const minutes = Math.floor(value / 60);
    const seconds = value % 60;
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  };

  if (historyNeedsReview) return <WorkoutHistoryReviewNotice area="Workout logging and draft recovery" issues={historyRecovery.issues} />;
  if (activeNeedsReview) return <main className="mx-auto max-w-3xl space-y-4 p-6 text-slate-100">
    <h1 className="text-2xl font-bold">Review the active workout</h1>
    <p role="status">Workout logging is paused. Your original session, plan link and draft entries are preserved.</p>
    <ul className="list-disc space-y-2 pl-5">{activeRecovery.issues.map(issue => <li key={issue}>{issue}</li>)}</ul>
    <button type="button" className="rounded-xl bg-cyan-300 px-4 py-3 font-semibold text-slate-950" onClick={() => {
      let url: string | null = null;
      try {
        const json = exportActiveSessionRecovery(activeRecovery);
        url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
        const link = document.createElement("a"); link.href = url; link.download = "sound-fitness-active-workout-originals.json"; link.click();
        setLauncherMessage("Original session and drafts exported. Saved data is unchanged.");
      } catch (cause) { setLauncherMessage(cause instanceof Error ? cause.message : "Originals could not be exported. Saved data is preserved."); }
      finally { if (url) { const downloadUrl = url; window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000); } }
    }}>Export original session and drafts</button>
    <p className="text-slate-300">Review the exported records before making changes. Reload after restoring a verified snapshot.</p>
    {launcherMessage ? <p role="status">{launcherMessage}</p> : null}
    <a className="inline-block underline" href={ROUTES.dashboard.sessionHistory}>Open workout History</a>
  </main>;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.12),_transparent_30%),linear-gradient(180deg,#020617_0%,#0f172a_100%)] text-white">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-5 px-3 py-5 sm:gap-6 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
        <header className="rounded-[24px] border border-white/10 bg-white/[0.05] p-4 shadow-2xl shadow-black/25 backdrop-blur sm:rounded-[28px] sm:p-5">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-[0.22em] text-sky-300">
                Sound Fitness Workout Logger
              </div>
              <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-4xl">
                {workout.title}
              </h1>
              <p className="mt-2 text-sm text-slate-300">{workout.subtitle}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3">
                <div className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                  Current Step
                </div>
                <div className="mt-1 text-sm font-semibold text-white">
                  {currentIndex + 1} of {workout.timeline.length}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3">
                <div className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                  Mode
                </div>
                <div className="mt-1 text-sm font-semibold text-white">
                  {activeSessionTemplate ? "Builder Template" : "Logger"}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3">
                <div className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                  Step Duration
                </div>
                <div className="mt-1 text-sm font-semibold text-white">
                  {formatSeconds(current.duration)}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3">
                <div className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                  Logged
                </div>
                <div className="mt-1 text-sm font-semibold text-white">
                  {loggedExerciseCount} of {loggableSteps.length}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
              <span>Session progress</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 rounded-full bg-white/10">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-sky-400 to-cyan-300 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </header>

        <section className="rounded-[24px] border border-white/10 bg-white/[0.05] p-4 shadow-2xl shadow-black/20 backdrop-blur sm:rounded-[28px] sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-[0.22em] text-cyan-300">
                Session Launcher
              </div>
              <h2 className="mt-2 text-2xl font-bold tracking-tight">
                Choose workout source
              </h2>
              <p className="mt-2 text-sm text-slate-400">
                {activeSessionTemplate
                  ? `${activeSessionTemplate.title} - ${activeSessionTemplate.exercises.length} exercise${
                      activeSessionTemplate.exercises.length === 1 ? "" : "s"
                    } active`
                  : "Default workout is active"}
              </p>
              <div className="mt-3 inline-flex rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-cyan-200">
                {templateSourceLabel}
              </div>
              {launcherMessage ? (
                <p className="mt-3 rounded-2xl border border-cyan-300/20 bg-cyan-400/10 px-4 py-3 text-sm font-semibold text-cyan-100">
                  {launcherMessage}
                </p>
              ) : null}
            </div>

            <div className="grid gap-2 sm:grid-cols-2 lg:min-w-[380px]">
              <button
                type="button"
                onClick={startDefaultWorkout}
                className="min-h-[48px] rounded-2xl bg-sky-500 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-sky-400"
              >
                Start Default Workout
              </button>
              <button
                type="button"
                onClick={resumeActiveTemplate}
                disabled={!activeRecovery.template}
                className="min-h-[48px] rounded-2xl border border-emerald-300/20 bg-emerald-400/10 px-4 py-3 text-sm font-bold text-emerald-200 transition hover:bg-emerald-400 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-emerald-400/10 disabled:hover:text-emerald-200"
              >
                Resume Active Template
              </button>
              <button
                type="button"
                onClick={clearActiveTemplate}
                disabled={!activeSessionTemplate}
                className="min-h-[48px] rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-45"
              >
                Clear Active Template
              </button>
              <button type="button" onClick={reviewLoggerLaunchControls} disabled={isSaving} className="min-h-[48px] rounded-2xl border border-cyan-300/20 px-4 py-3 text-sm font-bold text-cyan-100 disabled:opacity-40">
                Review current workout controls
              </button>
            </div>
          </div>

          {unfinishedDrafts.length > 0 && <section className="mt-5 rounded-2xl border border-cyan-300/20 p-4" aria-label="Saved workout drafts">
            <h3 className="font-bold text-cyan-100">Saved workout drafts</h3>
            <p className="mt-1 text-sm text-slate-400">Resume the original workout and saved entries. Switching leaves other drafts saved.</p>
            <ul className="mt-3 space-y-3">
              {unfinishedDrafts.map(draft => <li key={draft.key} className="rounded-xl border border-white/10 p-3">
                <p className="font-semibold">{draft.title}</p>
                {draft.startedAt && <p className="text-sm text-slate-400">Started {new Date(draft.startedAt).toLocaleString()}</p>}
                {draft.resumable ? <button type="button" disabled={isSaving} className="mt-2 rounded-xl border border-cyan-300/30 px-4 py-2 text-sm text-cyan-100 disabled:opacity-40" onClick={() => resumeSavedLoggerDraft(draft)}>Resume saved draft</button> : <p className="mt-2 text-sm text-amber-200">{draft.completionRecorded ? "This workout is recorded in History. Additional draft values are preserved here for review and export; they have not changed the completed workout." : draft.recoveryIssue || "Original values are preserved. This draft needs review before it can be resumed automatically."}</p>}
                {draft.key === "loggerDraft:default" && draft.completionRecorded && <button type="button" disabled={isSaving} className="mt-2 rounded-xl border border-cyan-300/30 px-4 py-2 text-sm text-cyan-100 disabled:opacity-40" onClick={() => {
                  if (savingRef.current) return;
                  try {
                    resetDefaultWorkoutSession(draft.version);
                    setLauncherMessage("New default workout ready. The previous draft is kept below for review and export.");
                  } catch (cause) { setLauncherMessage(cause instanceof Error ? cause.message : "The draft could not be preserved. Try again before starting a new workout."); }
                }}>Keep draft and start new default workout</button>}
                <details className="mt-3 text-sm text-slate-300">
                  <summary className="cursor-pointer text-cyan-100">Review saved values</summary>
                  <p className="my-2 text-slate-400">These are the stored draft values. Older drafts may identify steps without exercise names.</p>
                  <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-slate-950/70 p-3">{draft.preview}</pre>
                  {draft.previewTruncated && <p className="mt-2 text-amber-200">Preview shortened. Export includes the complete saved draft.</p>}
                </details>
                <button type="button" className="mt-3 rounded-xl border border-white/20 px-4 py-2 text-sm text-slate-200" onClick={() => {
                  let url: string | null = null;
                  try {
                    const json = exportWorkoutDraft(draft.key, draft.version, loadedAccount.current, draft.generation);
                    url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
                    const link = document.createElement("a");
                    link.href = url; link.download = `sound-fitness-workout-draft-${Date.now()}.json`; link.click();
                    setLauncherMessage("Draft export requested. The saved draft is unchanged.");
                  } catch (cause) { setLauncherMessage(cause instanceof Error ? cause.message : "The draft could not be exported."); }
                  finally { if (url) { const downloadUrl = url; window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000); } }
                }}>Export draft as JSON</button>
              </li>)}
            </ul>
          </section>}

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {savedSessionTemplates.length > 0 ? (
              savedSessionTemplates.map((template) => (
                <article
                  key={template.id}
                  className="rounded-[22px] border border-white/10 bg-slate-950/55 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-white">{template.title}</h3>
                      <p className="mt-1 text-xs text-slate-400">
                        {template.exercises.length} exercise
                        {template.exercises.length === 1 ? "" : "s"}
                      </p>
                    </div>
                    {activeSessionTemplate?.id === template.id ? (
                      <span className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1 text-xs font-bold text-cyan-200">
                        Active
                      </span>
                    ) : null}
                  </div>

                  <p className="mt-3 text-sm leading-5 text-slate-400">
                    {template.exercises
                      .slice(0, 3)
                      .map((exercise) => exercise.name)
                      .join(" / ")}
                    {template.exercises.length > 3 ? " / ..." : ""}
                  </p>

                  <button
                    type="button"
                    onClick={() => startSavedTemplate(template)}
                    className="mt-4 min-h-[44px] w-full rounded-2xl bg-gradient-to-r from-yellow-300 to-yellow-500 px-4 py-3 text-sm font-bold text-slate-950 transition hover:scale-[1.01]"
                  >
                    Start Template
                  </button>
                </article>
              ))
            ) : (
              <div className="rounded-[22px] border border-dashed border-white/15 bg-slate-950/35 p-4 text-sm text-slate-400 md:col-span-2 xl:col-span-3">
                No saved templates yet. Build and save a workout template to
                start it from here.
              </div>
            )}
          </div>
        </section>

        <div className="grid flex-1 gap-6 lg:grid-cols-[0.95fr_1.3fr]">
          <aside className="rounded-[24px] border border-white/10 bg-white/[0.05] p-3 shadow-2xl shadow-black/20 backdrop-blur sm:rounded-[28px] sm:p-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold">Workout Timeline</div>
                <div className="text-sm text-slate-400">
                  Each step leads directly into the next.
                </div>
              </div>
            </div>

            <div className="space-y-2">
              {workout.timeline.map((step, index) => {
                const active = index === currentIndex;
                return (
                  <button
                    key={step.id}
                    onClick={() => setCurrentIndex(index)}
                    className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                      active
                        ? "border-sky-400/40 bg-sky-500/10 shadow-lg shadow-sky-500/10"
                        : "border-white/10 bg-slate-950/45 hover:bg-slate-900/70"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-xs text-slate-500">
                          Step {index + 1}
                        </div>
                        <div className="mt-1 text-sm font-semibold text-white">
                          {step.title}
                        </div>
                        {step.subtitle ? (
                          <div className="mt-1 text-xs text-slate-400">
                            {step.subtitle}
                          </div>
                        ) : null}
                      </div>
                      <div className="text-xs text-slate-400">
                        {formatSeconds(step.duration)}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          <main className="rounded-[24px] border border-white/10 bg-white/[0.05] p-4 shadow-2xl shadow-black/20 backdrop-blur sm:rounded-[28px] sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${badgeStyles[current.type as keyof typeof badgeStyles]}`}
                >
                  {current.type}
                </span>
                <span className="text-xs uppercase tracking-[0.18em] text-slate-400">
                  {formatSeconds(current.duration)}
                </span>
              </div>

              <div className="min-h-[44px] rounded-2xl border border-sky-300/20 bg-sky-400/10 px-4 py-3 text-center text-xs font-semibold uppercase tracking-[0.18em] text-sky-200 sm:w-auto">
                Log sets below
              </div>
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-[24px] border border-white/10 bg-slate-950/55 p-3 sm:rounded-[26px] sm:p-4">
                <div className="aspect-video rounded-[20px] border border-dashed border-white/15 bg-[linear-gradient(135deg,rgba(14,165,233,0.12),rgba(15,23,42,0.5))] p-3 sm:rounded-[22px] sm:p-5">
                  <div className="flex h-full flex-col justify-between rounded-[18px] bg-black/20 p-4 sm:p-5">
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.22em] text-sky-300">
                        Movement notes
                      </div>
                      <div className="mt-3 text-2xl font-bold text-white">
                        {current.videoLabel || current.title}
                      </div>
                    </div>
                    <div className="text-sm text-slate-300">
                      Use the cues beside this panel, then log weight, reps,
                      and sets in the workout table.
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-[26px] border border-white/10 bg-slate-950/55 p-5">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400">
                    Current movement
                  </div>
                  <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                    {current.title}
                  </h2>
                  {current.subtitle ? (
                    <p className="mt-2 text-sm text-slate-300">
                      {current.subtitle}
                    </p>
                  ) : null}
                </div>

                {current.cue ? (
                  <div className="rounded-[26px] border border-white/10 bg-slate-950/55 p-5">
                    <div className="text-[11px] uppercase tracking-[0.22em] text-emerald-300">
                      Coach cue
                    </div>
                    <p className="mt-2 text-base text-white">{current.cue}</p>
                  </div>
                ) : null}

                {current.note ? (
                  <div className="rounded-[26px] border border-white/10 bg-slate-950/55 p-5">
                    <div className="text-[11px] uppercase tracking-[0.22em] text-violet-300">
                      Focus
                    </div>
                    <p className="mt-2 text-base text-white">{current.note}</p>
                  </div>
                ) : null}

                {current.coach ? (
                  <div className="rounded-[26px] border border-white/10 bg-slate-950/55 p-5">
                    <div className="text-[11px] uppercase tracking-[0.22em] text-cyan-300">
                      Guidance
                    </div>
                    <p className="mt-2 text-base text-white">{current.coach}</p>
                  </div>
                ) : null}

                {currentExerciseMeta && currentExerciseLog ? (
                  <div className="rounded-[26px] border border-yellow-300/20 bg-yellow-400/10 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.22em] text-yellow-300">
                          Log this movement
                        </div>
                        <p className="mt-2 text-sm text-slate-300">
                          Target: {workoutTargetLabel(currentExerciseMeta.targetSets, currentExerciseMeta.targetReps)}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          isCompleteExerciseLog(currentExerciseLog)
                            ? "bg-emerald-400/15 text-emerald-300"
                            : "bg-slate-900/70 text-slate-400"
                        }`}
                      >
                        {isCompleteExerciseLog(currentExerciseLog)
                          ? "Ready"
                          : "Needs log"}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-4">
                      {(["weight", "reps", "sets"] as const).map((field) => (
                        <label key={field} className="block">
                          <span className="text-xs font-semibold capitalize text-slate-400">
                            {field}
                          </span>
                          <input
                            type="number"
                            min={field === "weight" ? "0" : "1"}
                            inputMode="decimal"
                            value={currentExerciseLog[field]}
                            onChange={(event) =>
                              updateExerciseLog(
                                current.id,
                                field,
                                event.target.value,
                              )
                            }
                            className="mt-1 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-3 text-sm font-semibold text-white outline-none placeholder:text-slate-500 focus:border-yellow-300"
                          />
                        </label>
                      ))}
                      <label className="block">
                        <span className="text-xs font-semibold text-slate-400">Load unit</span>
                        <select aria-label="Current movement load unit" value={currentExerciseLog.weightUnit ?? ""} onChange={event => updateExerciseLog(current.id, "weightUnit", event.target.value)} className="mt-1 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-3 text-sm text-white">
                          <option value="">{Object.hasOwn(currentExerciseLog, "weightUnit") ? "Choose unit" : "Not recorded in older draft"}</option>
                          <option value="lb">lb</option><option value="kg">kg</option>
                        </select>
                      </label>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <section className="mt-6 rounded-[24px] border border-white/10 bg-slate-950/55 p-4 sm:rounded-[28px] sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.22em] text-emerald-300">
                    Workout log
                  </div>
                  <h3 className="mt-2 text-2xl font-bold text-white">
                    Save weight, reps, and sets
                  </h3>
                  <p className="mt-1 text-sm text-slate-400">
                    Completed movements stay available in your local stats and
                    sync to Supabase when available. Use 0 for bodyweight
                    movements. Choose the unit used for each load. Changing the unit does not convert the number.
                  </p>
                </div>

                <div className="rounded-2xl border border-emerald-300/20 bg-emerald-400/10 px-4 py-3 text-sm font-semibold text-emerald-300">
                  {loggedExerciseCount} / {loggableSteps.length} ready
                </div>
              </div>

              <div className="mt-5 grid gap-3 lg:grid-cols-2">
                {loggableSteps.map((step) => {
                  const meta = activeSessionExerciseMeta[step.id];
                  const log = exerciseLogs[step.id];
                  const complete = isCompleteExerciseLog(log);

                  return (
                    <article
                      key={step.id}
                      className={`rounded-[24px] border p-4 ${
                        complete
                          ? "border-emerald-300/20 bg-emerald-400/10"
                          : "border-white/10 bg-black/20"
                      }`}
                    >
                      <div className="flex flex-col items-start gap-3 sm:flex-row sm:justify-between">
                        <button
                          type="button"
                          onClick={() =>
                            setCurrentIndex(
                              workout.timeline.findIndex(
                                (item) => item.id === step.id,
                              ),
                            )
                          }
                          className="text-left"
                        >
                          <p className="text-sm font-semibold text-white">
                            {meta.exerciseName}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            {meta.body} | {meta.pattern} | Target{" "}
                            {workoutTargetLabel(meta.targetSets, meta.targetReps)}
                          </p>
                        </button>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            complete
                              ? "bg-emerald-400/20 text-emerald-200"
                              : "bg-white/5 text-slate-400"
                          }`}
                        >
                          {complete ? "Logged" : "Open"}
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-4">
                        {(["weight", "reps", "sets"] as const).map(
                          (field) => (
                            <label key={field} className="block">
                              <span className="text-xs font-semibold capitalize text-slate-500">
                                {field}
                              </span>
                              <input
                                type="number"
                                min={field === "weight" ? "0" : "1"}
                                inputMode="decimal"
                                value={log?.[field] || ""}
                                onChange={(event) =>
                                  updateExerciseLog(
                                    step.id,
                                    field,
                                    event.target.value,
                                  )
                                }
                                className="mt-1 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-3 text-sm font-semibold text-white outline-none placeholder:text-slate-500 focus:border-emerald-300"
                              />
                            </label>
                          ),
                        )}
                        <label className="block">
                          <span className="text-xs font-semibold text-slate-500">Load unit</span>
                          <select aria-label={`${meta.exerciseName} load unit`} value={log?.weightUnit ?? ""} onChange={event => updateExerciseLog(step.id, "weightUnit", event.target.value)} className="mt-1 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-3 text-sm text-white">
                            <option value="">{log && Object.hasOwn(log, "weightUnit") ? "Choose unit" : "Not recorded in older draft"}</option>
                            <option value="lb">lb</option><option value="kg">kg</option>
                          </select>
                        </label>
                      </div>
                    </article>
                  );
                })}
              </div>

              {saveMessage ? (
                <p
                  className={`mt-4 rounded-2xl border px-4 py-3 text-sm font-semibold ${
                    lastSavedAt
                      ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-100"
                      : "border-yellow-300/20 bg-yellow-400/10 text-yellow-200"
                  }`}
                >
                  {saveMessage}
                  {lastSavedAt ? (
                    <span className="mt-1 block text-xs font-bold uppercase tracking-[0.16em] text-emerald-200/80">
                      Last saved {new Date(lastSavedAt).toLocaleTimeString()}
                    </span>
                  ) : null}
                </p>
              ) : null}

              <button
                type="button"
                onClick={saveWorkoutStats}
                disabled={isSaving}
                className="mt-5 min-h-[48px] w-full rounded-2xl bg-gradient-to-r from-yellow-300 to-yellow-500 px-5 py-4 text-sm font-bold text-slate-950 shadow-lg shadow-yellow-500/20 transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:from-emerald-300 disabled:to-emerald-400 disabled:hover:scale-100"
              >
                {isSaving ? "Saved - opening stats..." : "Finish Workout and View Stats"}
              </button>
            </section>

            <div className="mt-6 flex flex-col gap-3 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <button
                onClick={prevStep}
                disabled={!canGoBack}
                className="min-h-[48px] rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-slate-200 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                ← Previous step
              </button>

              <div className="text-center text-xs uppercase tracking-[0.22em] text-slate-500">
                {currentIndex + 1 === workout.timeline.length
                  ? "Final step"
                  : "Advance when ready"}
              </div>

              <button
                onClick={nextStep}
                disabled={!canGoNext}
                className="min-h-[48px] rounded-2xl bg-sky-500 px-4 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-sky-500/20 hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {canGoNext ? "Next step →" : "Session complete"}
              </button>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
