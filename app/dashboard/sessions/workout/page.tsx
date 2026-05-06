"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/lib/routes";
import type { LocalExerciseStatEntry } from "@/types";

const EXERCISE_STATS_STORAGE_KEY = "soundFitnessExerciseStats";

type ExerciseLogDraft = {
  weight: string;
  reps: string;
  sets: string;
};

type SessionExerciseMeta = {
  exerciseId: string;
  exerciseName: string;
  body: string;
  pattern: string;
  equipment: string;
  targetSets: number;
  targetReps: string;
  defaultWeight: string;
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

const hasNonNegativeNumber = (value: string) =>
  value.trim() !== "" && Number(value) >= 0;

const hasPositiveNumber = (value: string) =>
  value.trim() !== "" && Number(value) > 0;

const isCompleteExerciseLog = (log?: ExerciseLogDraft) =>
  Boolean(
    log &&
      hasNonNegativeNumber(log.weight) &&
      hasPositiveNumber(log.reps) &&
      hasPositiveNumber(log.sets),
  );

const readSavedExerciseStats = () => {
  const saved = localStorage.getItem(EXERCISE_STATS_STORAGE_KEY);

  if (!saved) return [];

  try {
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? (parsed as LocalExerciseStatEntry[]) : [];
  } catch {
    return [];
  }
};

export default function WorkoutBuilderPage() {
  const router = useRouter();

  const workout = {
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

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [saveMessage, setSaveMessage] = useState("");
  const [exerciseLogs, setExerciseLogs] = useState<
    Record<number, ExerciseLogDraft>
  >(() =>
    Object.fromEntries(
      workout.timeline
        .filter((step) => sessionExerciseMeta[step.id])
        .map((step) => {
          const meta = sessionExerciseMeta[step.id];

          return [
            step.id,
            {
              weight: meta.defaultWeight,
              reps: meta.targetReps,
              sets: String(meta.targetSets),
            },
          ];
        }),
    ),
  );

  const current = workout.timeline[currentIndex];
  const currentExerciseMeta = sessionExerciseMeta[current.id];
  const currentExerciseLog = exerciseLogs[current.id];
  const loggableSteps = workout.timeline.filter(
    (step) => sessionExerciseMeta[step.id],
  );
  const loggedExerciseCount = loggableSteps.filter((step) =>
    isCompleteExerciseLog(exerciseLogs[step.id]),
  ).length;

  const progress = useMemo(
    () => Math.round(((currentIndex + 1) / workout.timeline.length) * 100),
    [currentIndex, workout.timeline.length],
  );

  const canGoBack = currentIndex > 0;
  const canGoNext = currentIndex < workout.timeline.length - 1;

  const nextStep = () => canGoNext && setCurrentIndex((i) => i + 1);
  const prevStep = () => canGoBack && setCurrentIndex((i) => i - 1);
  const updateExerciseLog = (
    stepId: number,
    field: keyof ExerciseLogDraft,
    value: string,
  ) => {
    setSaveMessage("");
    setExerciseLogs((prev) => ({
      ...prev,
      [stepId]: {
        ...prev[stepId],
        [field]: value,
      },
    }));
  };

  const saveWorkoutStats = () => {
    const completedAt = new Date().toISOString();
    const completedEntries: LocalExerciseStatEntry[] = [];

    loggableSteps.forEach((step) => {
      const meta = sessionExerciseMeta[step.id];
      const log = exerciseLogs[step.id];

      if (meta && isCompleteExerciseLog(log)) {
        completedEntries.push({
          exerciseId: meta.exerciseId,
          exerciseName: meta.exerciseName,
          body: meta.body,
          pattern: meta.pattern,
          equipment: meta.equipment,
          weight: log.weight.trim(),
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
      return;
    }

    try {
      const existingStats = readSavedExerciseStats();
      const updatedStats = [...completedEntries, ...existingStats];

      localStorage.setItem(
        EXERCISE_STATS_STORAGE_KEY,
        JSON.stringify(updatedStats),
      );

      router.push(ROUTES.dashboard.stats);
    } catch {
      setSaveMessage(
        "The workout could not be saved in this browser. Try again before leaving the page.",
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

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.12),_transparent_30%),linear-gradient(180deg,#020617_0%,#0f172a_100%)] text-white">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <header className="rounded-[28px] border border-white/10 bg-white/[0.05] p-5 shadow-2xl shadow-black/25 backdrop-blur">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-[0.22em] text-sky-300">
                Sound Fitness Session Player
              </div>
              <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
                {workout.title}
              </h1>
              <p className="mt-2 text-sm text-slate-300">{workout.subtitle}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
                  Sound
                </div>
                <div className="mt-1 text-sm font-semibold text-white">
                  {soundOn ? workout.soundscape : "Muted"}
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

        <div className="grid flex-1 gap-6 lg:grid-cols-[0.95fr_1.3fr]">
          <aside className="rounded-[28px] border border-white/10 bg-white/[0.05] p-4 shadow-2xl shadow-black/20 backdrop-blur">
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

          <main className="rounded-[28px] border border-white/10 bg-white/[0.05] p-5 shadow-2xl shadow-black/20 backdrop-blur">
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

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSoundOn((v) => !v)}
                  className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-900"
                >
                  {soundOn ? "Mute sound" : "Play sound"}
                </button>
                <button
                  onClick={() => setIsPlaying((v) => !v)}
                  className="rounded-2xl bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-sky-500/20 hover:bg-sky-400"
                >
                  {isPlaying ? "Pause" : "Start"}
                </button>
              </div>
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-[26px] border border-white/10 bg-slate-950/55 p-4">
                <div className="aspect-video rounded-[22px] border border-dashed border-white/15 bg-[linear-gradient(135deg,rgba(14,165,233,0.12),rgba(15,23,42,0.5))] p-5">
                  <div className="flex h-full flex-col justify-between rounded-[18px] bg-black/20 p-5">
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.22em] text-sky-300">
                        Video
                      </div>
                      <div className="mt-3 text-2xl font-bold text-white">
                        {current.videoLabel || current.title}
                      </div>
                    </div>
                    <div className="text-sm text-slate-300">
                      This area is ready for your movement demo, timer overlay,
                      subtitles, and audio track.
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-[26px] border border-white/10 bg-slate-950/55 p-5">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400">
                    Current movement
                  </div>
                  <h2 className="mt-2 text-3xl font-bold tracking-tight">
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
                          Target: {currentExerciseMeta.targetSets} x{" "}
                          {currentExerciseMeta.targetReps}
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

                    <div className="mt-4 grid grid-cols-3 gap-2">
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
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <section className="mt-6 rounded-[28px] border border-white/10 bg-slate-950/55 p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.22em] text-emerald-300">
                    Workout log
                  </div>
                  <h3 className="mt-2 text-2xl font-bold text-white">
                    Save weight, reps, and sets
                  </h3>
                  <p className="mt-1 text-sm text-slate-400">
                    Completed movements are saved to your local stats when you
                    finish the workout. Use 0 for bodyweight movements.
                  </p>
                </div>

                <div className="rounded-2xl border border-emerald-300/20 bg-emerald-400/10 px-4 py-3 text-sm font-semibold text-emerald-300">
                  {loggedExerciseCount} / {loggableSteps.length} ready
                </div>
              </div>

              <div className="mt-5 grid gap-3 lg:grid-cols-2">
                {loggableSteps.map((step) => {
                  const meta = sessionExerciseMeta[step.id];
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
                      <div className="flex items-start justify-between gap-3">
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
                            {meta.targetSets} x {meta.targetReps}
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

                      <div className="mt-4 grid grid-cols-3 gap-2">
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
                      </div>
                    </article>
                  );
                })}
              </div>

              {saveMessage ? (
                <p className="mt-4 rounded-2xl border border-yellow-300/20 bg-yellow-400/10 px-4 py-3 text-sm font-semibold text-yellow-200">
                  {saveMessage}
                </p>
              ) : null}

              <button
                type="button"
                onClick={saveWorkoutStats}
                className="mt-5 w-full rounded-2xl bg-gradient-to-r from-yellow-300 to-yellow-500 px-5 py-4 text-sm font-bold text-slate-950 shadow-lg shadow-yellow-500/20 transition hover:scale-[1.01]"
              >
                Finish Workout and View Stats
              </button>
            </section>

            <div className="mt-6 flex flex-col gap-3 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <button
                onClick={prevStep}
                disabled={!canGoBack}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-slate-200 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
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
                className="rounded-2xl bg-sky-500 px-4 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-sky-500/20 hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-40"
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
