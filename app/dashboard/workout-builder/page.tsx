"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import AppHeader from "@/components/AppHeader";
import { exerciseLibrary } from "@/lib/training/exerciseLibrary";

type Exercise = {
  id: number;
  name: string;
  goal: string;
  equipment: string;
  body?: string;
  pattern?: string;
};

type TemplateSection = {
  title: string;
  accent: string;
  slots: {
    label: string;
    exercise: string;
  }[];
};

export default function WorkoutBuilderPage() {
  const [selectedPlanDay, setSelectedPlanDay] = useState("");
  const [builderMode, setBuilderMode] = useState<"start" | "plan">("start");
  const [workoutType, setWorkoutType] = useState("Strength");
  const [selectedBodyPart, setSelectedBodyPart] = useState("All");
  const [activeSlot, setActiveSlot] = useState<{
    sectionIndex: number;
    slotIndex: number;
  } | null>(null);

  const [exercisePickerOpen, setExercisePickerOpen] = useState(false);

  const [previewExercise, setPreviewExercise] = useState<Exercise | null>(null);
  const [exerciseSearch, setExerciseSearch] = useState("");
  const [exerciseBodyFilter, setExerciseBodyFilter] = useState("All");
  const [exerciseGoalFilter, setExerciseGoalFilter] = useState("All");

  const [templateSections, setTemplateSections] = useState<TemplateSection[]>([
    {
      title: "Warm-Up",
      accent: "text-emerald-300",
      slots: [
        { label: "Movement prep", exercise: "" },
        { label: "Mobility", exercise: "" },
      ],
    },
    {
      title: "Main Work",
      accent: "text-cyan-300",
      slots: [
        { label: "Primary lift", exercise: "" },
        { label: "Secondary lift", exercise: "" },
      ],
    },
    {
      title: "Cool Down",
      accent: "text-violet-300",
      slots: [{ label: "Recovery notes", exercise: "" }],
    },
  ]);

  function addSlot(sectionIndex: number) {
    setTemplateSections((prev) =>
      prev.map((section, index) =>
        index === sectionIndex
          ? {
              ...section,
              slots: [...section.slots, { label: "New slot", exercise: "" }],
            }
          : section,
      ),
    );
  }

  function removeSlot(sectionIndex: number, slotIndex: number) {
    setTemplateSections((prev) =>
      prev.map((section, index) =>
        index === sectionIndex
          ? {
              ...section,
              slots: section.slots.filter((_, i) => i !== slotIndex),
            }
          : section,
      ),
    );
  }

  function updateSlot(
    sectionIndex: number,
    slotIndex: number,
    field: "label" | "exercise",
    value: string,
  ) {
    setTemplateSections((prev) =>
      prev.map((section, index) =>
        index === sectionIndex
          ? {
              ...section,
              slots: section.slots.map((slot, i) =>
                i === slotIndex ? { ...slot, [field]: value } : slot,
              ),
            }
          : section,
      ),
    );
  }

  const activePlans = [
    {
      id: "1",
      name: "Strength Plan",
      createdBy: "Joey",
      week: [
        { day: "Mon", workout: "Lower", detail: "Squat • Core" },
        { day: "Tue", workout: "Rest", detail: "" },
        { day: "Wed", workout: "Upper", detail: "Push • Pull" },
        { day: "Thu", workout: "Rest", detail: "" },
        { day: "Fri", workout: "Full", detail: "Tempo • Core" },
        { day: "Sat", workout: "Mobility", detail: "" },
        { day: "Sun", workout: "Rest", detail: "" },
      ],
    },
  ];

  const activePlanDays = useMemo(
    () =>
      activePlans.flatMap((plan) =>
        plan.week.map((day) => ({
          planId: plan.id,
          planName: plan.name,
          day: day.day,
          workout: day.workout,
          detail: day.detail,
        })),
      ),
    [],
  );

  const exerciseResults: Exercise[] = [
    {
      id: 1,
      name: "Goblet Squat",
      pattern: "Squat",
      goal: "Strength",
      equipment: "DB",
      body: "Legs",
    },
    {
      id: 2,
      name: "RDL",
      pattern: "Hinge",
      goal: "Strength",
      equipment: "DB",
      body: "Hamstrings",
    },
    {
      id: 3,
      name: "Bench Press",
      pattern: "Push",
      goal: "Strength",
      equipment: "Barbell",
      body: "Chest",
    },
    {
      id: 4,
      name: "Pull-Up",
      pattern: "Pull",
      goal: "Strength",
      equipment: "Bodyweight",
      body: "Back",
    },
    {
      id: 5,
      name: "Dead Bug",
      pattern: "Core",
      goal: "Mobility",
      equipment: "Bodyweight",
      body: "Core",
    },
    {
      id: 6,
      name: "Farmer Carry",
      pattern: "Carry",
      goal: "Strength",
      equipment: "DB",
      body: "Full Body",
    },
  ];
  const exerciseBodyOptions = useMemo(() => {
    return [
      "All",
      ...Array.from(
        new Set(exerciseLibrary.map((exercise) => exercise.body)),
      ).sort(),
    ];
  }, []);

  const exerciseGoalOptions = useMemo(() => {
    return [
      "All",
      ...Array.from(
        new Set(exerciseLibrary.map((exercise) => exercise.goal)),
      ).sort(),
    ];
  }, []);

  const filteredExercises = useMemo(() => {
    const q = exerciseSearch.toLowerCase();

    return exerciseLibrary.filter((exercise) => {
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

  const navCards = [
    {
      title: "Build",
      href: "/dashboard/workout-builder/build",
      icon: "🧱",
      text: "Create a full workout from scratch.",
    },
    {
      title: "Exercise Library",
      href: "/dashboard/workout-builder/exercise-library",
      icon: "📚",
      text: "Browse exercises, demos, muscles, and patterns.",
    },
    {
      title: "Saved",
      href: "/dashboard/workout-builder/saved",
      icon: "💾",
      text: "Use templates and saved workouts.",
    },
    {
      title: "Tracking",
      href: "/dashboard/workout-builder/tracking",
      icon: "📈",
      text: "Review sets, volume, and progress.",
    },
    {
      title: "My Plan",
      href: "/dashboard/my-plan",
      icon: "🧭",
      text: "View active plans and weekly layout.",
    },
    {
      title: "Create Plan",
      href: "/dashboard/my-plan/create",
      icon: "✨",
      text: "Build a new training plan.",
    },
    {
      title: "Workout Session",
      href: "/dashboard/sessions/workout",
      icon: "🏋️",
      text: "Start the live workout flow.",
    },
    {
      title: "Saved Workouts",
      href: "/dashboard/sessions/saved-workouts",
      icon: "📦",
      text: "Open session-level saved workouts.",
    },
  ];

  const ExercisePicker = ({
    value,
    onChange,
  }: {
    value: string;
    onChange: (value: string) => void;
  }) => {
    const [open, setOpen] = useState(false);
    const selected = exerciseLibrary.find(
      (exercise) => exercise.name === value,
    );

    return (
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="w-full rounded-2xl border border-white/10 bg-slate-950/80 p-3 text-left transition hover:border-cyan-300/40"
        >
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-300">
            Exercise
          </p>
          <p className="mt-1 text-sm font-black text-white">
            {selected ? selected.name : "Choose exercise"}
          </p>
          {selected && (
            <p className="mt-1 text-xs text-slate-500">
              {selected.pattern} • {selected.equipment} • {selected.goal}
            </p>
          )}
        </button>

        {open && (
          <div className="absolute left-0 right-0 z-50 mt-2 max-h-80 overflow-y-auto rounded-[24px] border border-cyan-300/20 bg-slate-950/95 p-2 shadow-[0_30px_90px_rgba(0,0,0,0.65)] backdrop-blur-xl">
            {exerciseLibrary.map((exercise) => (
              <button
                key={exercise.id}
                type="button"
                onClick={() => {
                  onChange(exercise.name);
                  setOpen(false);
                }}
                className={`mb-1 w-full rounded-2xl p-3 text-left transition ${
                  value === exercise.name
                    ? "bg-cyan-400 text-slate-950"
                    : "hover:bg-white/10"
                }`}
              >
                <p className="text-sm font-black">{exercise.name}</p>
                <p className="mt-1 text-xs opacity-75">
                  {exercise.body} • {exercise.pattern} • {exercise.equipment}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  const ExercisePickerOverlay = ({
    open,
    value,
    onClose,
    onChange,
  }: {
    open: boolean;
    value: string;
    onClose: () => void;
    onChange: (value: string) => void;
  }) => {
    const filteredPickerExercises = useMemo(() => {
      const q = exerciseSearch.trim().toLowerCase();

      return exerciseLibrary.filter((exercise) => {
        const matchesSearch =
          q === "" ||
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

    if (!open) return null;

    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto bg-slate-950/75 p-4 backdrop-blur-md">
        <div className="w-full max-w-3xl rounded-[32px] border border-cyan-300/20 bg-slate-950 p-5 shadow-[0_40px_120px_rgba(0,0,0,0.85)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-cyan-300">
                Exercise Library
              </p>
              <h3 className="mt-2 text-2xl font-black text-white">
                Choose exercise
              </h3>
            </div>

            <button
              type="button"
              onClick={() => {
                setExerciseSearch("");
                setExerciseBodyFilter("All");
                setExerciseGoalFilter("All");
                onClose();
              }}
              className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-black text-slate-300 hover:text-white"
            >
              Close
            </button>
          </div>

          <input
            value={exerciseSearch}
            onChange={(e) => setExerciseSearch(e.target.value)}
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
                onChange={(e) => setExerciseBodyFilter(e.target.value)}
                className="w-full cursor-pointer appearance-none rounded-2xl border border-cyan-300/40 bg-slate-900 bg-[linear-gradient(45deg,transparent_50%,#67e8f9_50%),linear-gradient(135deg,#67e8f9_50%,transparent_50%)] bg-[length:6px_6px,6px_6px] bg-[position:calc(100%-22px)_50%,calc(100%-16px)_50%] bg-no-repeat px-4 py-3 pr-12 text-sm font-black text-white outline-none transition hover:border-cyan-300 focus:border-cyan-300"
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
                onChange={(e) => setExerciseGoalFilter(e.target.value)}
                className="w-full cursor-pointer appearance-none rounded-2xl border border-emerald-300/30 bg-slate-900 bg-[linear-gradient(45deg,transparent_50%,#6ee7b7_50%),linear-gradient(135deg,#6ee7b7_50%,transparent_50%)] bg-[length:6px_6px,6px_6px] bg-[position:calc(100%-22px)_50%,calc(100%-16px)_50%] bg-no-repeat px-4 py-3 pr-12 text-sm font-black text-white outline-none transition hover:border-emerald-300 focus:border-emerald-300"
              >
                {exerciseGoalOptions.map((goal) => (
                  <option key={goal} value={goal}>
                    {goal}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
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
              className="font-black text-cyan-300 hover:text-cyan-200"
            >
              Reset filters
            </button>
          </div>

          <div className="mt-4 max-h-[460px] space-y-2 overflow-y-auto pr-2">
            {filteredPickerExercises.length > 0 ? (
              filteredPickerExercises.map((exercise) => (
                <button
                  key={exercise.id}
                  type="button"
                  onClick={() => {
                    onChange(exercise.name);
                    setExerciseSearch("");
                    setExerciseBodyFilter("All");
                    setExerciseGoalFilter("All");
                    onClose();
                  }}
                  className={`flex w-full gap-3 rounded-2xl p-3 text-left transition ${
                    value === exercise.name
                      ? "bg-cyan-400 text-slate-950"
                      : "bg-white/[0.04] text-slate-200 hover:bg-white/10"
                  }`}
                >
                  <img
                    src={exercise.image}
                    alt={exercise.name}
                    className="h-16 w-16 rounded-xl object-cover"
                  />

                  <div>
                    <p className="text-sm font-black">{exercise.name}</p>
                    <p className="mt-1 text-xs opacity-75">
                      {exercise.body} • {exercise.pattern} •{" "}
                      {exercise.equipment}
                    </p>
                    <p className="mt-1 text-[11px] opacity-60">
                      {exercise.goal} • {exercise.level}
                    </p>
                  </div>
                </button>
              ))
            ) : (
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-center">
                <p className="font-black text-white">No exercises found</p>
                <p className="mt-2 text-sm text-slate-400">
                  Try changing the body, goal, or search text.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.16),_transparent_30%),linear-gradient(180deg,#020617_0%,#0f172a_100%)] text-white">
      <AppHeader />

      {activeSlot && (
        <ExercisePickerOverlay
          open={true}
          value={
            templateSections[activeSlot.sectionIndex]?.slots[
              activeSlot.slotIndex
            ]?.exercise || ""
          }
          onClose={() => setActiveSlot(null)}
          onChange={(value) => {
            updateSlot(
              activeSlot.sectionIndex,
              activeSlot.slotIndex,
              "exercise",
              value,
            );
            setActiveSlot(null);
          }}
        />
      )}

      <section className="mx-auto w-full max-w-[1240px] space-y-6 px-4 py-8">
        {/* BUILDER FORM */}
        <section className="rounded-[40px] border border-white/10 bg-[radial-gradient(circle_at_18%_8%,rgba(34,211,238,0.18),transparent_32%),radial-gradient(circle_at_90%_20%,rgba(16,185,129,0.12),transparent_30%),linear-gradient(135deg,rgba(15,23,42,0.96),rgba(2,6,23,0.98))] p-6 shadow-2xl lg:p-8">
          <p className="text-[11px] font-black uppercase tracking-[0.3em] text-cyan-300">
            Workout Builder
          </p>

          <h1 className="mt-4 text-4xl font-black leading-tight lg:text-5xl">
            Build, start, or assign workouts.
          </h1>

          <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300">
            Choose a workout style, build each section, select exercises from
            the library, then start now or attach it to an active plan day.
          </p>

          <div className="mt-6">
            <p className="mb-3 text-sm font-bold text-slate-300">
              Workout Type
            </p>

            <div className="flex flex-wrap gap-2">
              {[
                "Strength",
                "Hypertrophy",
                "Calisthenics",
                "Mobility",
                "Conditioning",
                "Power",
                "Recovery",
                "Full Body",
              ].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setWorkoutType(type)}
                  className={`rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.12em] transition ${
                    workoutType === type
                      ? "border-cyan-300 bg-cyan-400 text-slate-950 shadow-[0_0_22px_rgba(34,211,238,0.25)]"
                      : "border-white/10 bg-white/[0.04] text-slate-400 hover:border-cyan-300/40 hover:text-white"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 rounded-[30px] border border-white/10 bg-slate-950/45 p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-emerald-300">
                  Template Structure
                </p>
                <h2 className="mt-2 text-2xl font-black">
                  {workoutType} session layout
                </h2>
              </div>

              <span className="w-fit rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1 text-xs font-bold text-cyan-300">
                Editable template
              </span>
            </div>
            <div className="mt-6">
              <div className="mb-4 flex flex-wrap gap-2">
                {templateSections.map((section, sectionIndex) => (
                  <button
                    key={section.title}
                    type="button"
                    onClick={() => addSlot(sectionIndex)}
                    className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-4 py-2 text-xs font-black text-emerald-300 hover:bg-emerald-400/15"
                  >
                    + Add {section.title}
                  </button>
                ))}
              </div>

              <div className="overflow-x-auto pb-5">
                <div className="flex w-max gap-4">
                  {templateSections.flatMap((section, sectionIndex) =>
                    section.slots.map((slot, slotIndex) => {
                      const selected = exerciseLibrary.find(
                        (exercise) => exercise.name === slot.exercise,
                      );

                      const pickerKey = `${sectionIndex}-${slotIndex}`;

                      return (
                        <div
                          key={`${section.title}-${slotIndex}`}
                          className="flex h-[430px] w-[360px] shrink-0 flex-col rounded-[30px] border border-white/10 bg-slate-950/75 p-4 shadow-xl transition duration-300 hover:scale-[1.03] hover:border-cyan-300/40"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={`rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${section.accent}`}
                            >
                              {section.title}
                            </span>

                            <button
                              type="button"
                              onClick={() =>
                                removeSlot(sectionIndex, slotIndex)
                              }
                              className="rounded-lg border border-rose-300/20 bg-rose-400/10 px-2 py-1 text-[10px] font-black text-rose-300 hover:bg-rose-400/15"
                            >
                              −
                            </button>
                          </div>

                          <input
                            value={slot.label}
                            onChange={(e) =>
                              updateSlot(
                                sectionIndex,
                                slotIndex,
                                "label",
                                e.target.value,
                              )
                            }
                            className="mt-4 w-full bg-transparent text-xl font-black text-white outline-none placeholder:text-slate-600"
                            placeholder="Exercise block"
                          />

                          <button
                            type="button"
                            onClick={() =>
                              setActiveSlot({ sectionIndex, slotIndex })
                            }
                            className="mt-4 w-full rounded-2xl border border-cyan-300/20 bg-cyan-400/10 p-4 text-left transition hover:border-cyan-300/60 hover:bg-cyan-400/15"
                          >
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300">
                              Exercise
                            </p>
                            <p className="mt-1 text-sm font-black text-white">
                              {selected
                                ? selected.name
                                : "Choose from exercise library"}
                            </p>

                            {selected && (
                              <p className="mt-2 text-xs text-slate-400">
                                {selected.body} • {selected.pattern} •{" "}
                                {selected.equipment}
                              </p>
                            )}
                          </button>

                          <div className="mt-4 h-[145px] overflow-hidden rounded-2xl border border-white/10 bg-slate-900/80">
                            {selected?.image ? (
                              <img
                                src={selected.image}
                                alt={selected.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.18),transparent_45%),linear-gradient(135deg,rgba(15,23,42,0.95),rgba(2,6,23,0.95))]">
                                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                                  Preview Photo
                                </p>
                              </div>
                            )}
                          </div>

                          {selected && (
                            <div className="mt-4 flex-1 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                                Coaching Cue
                              </p>
                              <p className="mt-2 text-sm leading-5 text-slate-300">
                                {selected.cue}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    }),
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-[30px] border border-cyan-300/20 bg-cyan-400/10 p-5">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-cyan-300">
              Builder Destination
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setBuilderMode("start")}
                className={`rounded-2xl border p-4 text-left transition ${
                  builderMode === "start"
                    ? "border-cyan-300 bg-cyan-400/20"
                    : "border-white/10 bg-slate-950/60 hover:border-cyan-300/40"
                }`}
              >
                <p className="font-black text-white">Start Now</p>
                <p className="mt-1 text-xs text-slate-400">
                  Use this workout immediately.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setBuilderMode("plan")}
                className={`rounded-2xl border p-4 text-left transition ${
                  builderMode === "plan"
                    ? "border-emerald-300 bg-emerald-400/20"
                    : "border-white/10 bg-slate-950/60 hover:border-emerald-300/40"
                }`}
              >
                <p className="font-black text-white">Add to Plan</p>
                <p className="mt-1 text-xs text-slate-400">
                  Attach to an active plan day.
                </p>
              </button>
            </div>

            {builderMode === "plan" && (
              <label className="mt-4 block text-sm font-bold text-slate-300">
                Active plan day
                <select
                  value={selectedPlanDay}
                  onChange={(e) => setSelectedPlanDay(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none focus:border-cyan-300"
                >
                  <option value="">Choose plan day</option>
                  {activePlanDays.map((item) => (
                    <option
                      key={`${item.planId}-${item.day}`}
                      value={`${item.planId}:${item.day}`}
                    >
                      {item.planName} — {item.day} — {item.workout}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href={
                  builderMode === "start"
                    ? "/dashboard/sessions/workout?mode=start"
                    : `/dashboard/sessions/workout?addTo=${
                        selectedPlanDay || "choose"
                      }`
                }
                className="rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-black text-slate-950 hover:bg-cyan-300"
              >
                Continue →
              </Link>

              <Link
                href="/dashboard/my-plan"
                className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-black text-slate-200 hover:border-cyan-300/40"
              >
                View Plans
              </Link>
            </div>
          </div>
        </section>
        <section className="rounded-[34px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-emerald-300">
            Active Plan Days
          </p>

          <h2 className="mt-3 text-2xl font-black">Available destinations</h2>

          <div className="mt-5 space-y-3">
            {activePlanDays.map((item) => (
              <Link
                key={`${item.planId}-${item.day}`}
                href={`/dashboard/workout-builder?addTo=${item.planId}:${item.day}`}
                className="block rounded-2xl border border-white/10 bg-slate-950/60 p-4 transition hover:border-emerald-300/40 hover:bg-emerald-400/10"
              >
                <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-300">
                  {item.planName} • {item.day}
                </p>
                <p className="mt-2 font-black text-white">{item.workout}</p>
                <p className="mt-1 text-sm text-slate-400">
                  {item.detail || "No workout detail yet"}
                </p>
              </Link>
            ))}
          </div>
        </section>
        <section className="rounded-[34px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-emerald-300">
            Builder Navigation
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {navCards.map((card) => (
              <Link
                key={card.href}
                href={card.href}
                className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 transition hover:border-cyan-300/40 hover:bg-cyan-400/10"
              >
                <div className="text-2xl">{card.icon}</div>
                <h3 className="mt-3 text-lg font-black">{card.title}</h3>
                <p className="mt-2 text-sm leading-5 text-slate-400">
                  {card.text}
                </p>
              </Link>
            ))}
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]"></div>
      </section>
    </main>
  );
}
