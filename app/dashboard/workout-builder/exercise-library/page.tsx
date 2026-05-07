"use client";

import { useEffect, useMemo, useState } from "react";
import {
  prependExerciseStats,
  readCustomExercises,
  readExerciseStats,
  writeCustomExercises,
} from "@/lib/localData/workoutData";
import { getExerciseCatalogWithLegacyFallback } from "@/lib/training/normalizedExerciseCatalog";
import { ROUTES } from "@/lib/routes";
import type { LocalExerciseStatEntry } from "@/types";

type Exercise = {
  id: string;
  name: string;
  body: string;
  muscles: string;
  pattern: string;
  goal: string;
  equipment: string;
  level: string;
  image?: string;
  cue?: string;
  custom?: boolean;
};

// Internal migration marker: system exercises now come from the normalized
// catalog service, converted back to the current Exercise shape for this page.
const normalizedSystemExercises =
  getExerciseCatalogWithLegacyFallback() as Exercise[];

const defaultImage =
  "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=900";

const baseGoals = [
  "Strength",
  "Hypertrophy",
  "Stability",
  "Mobility",
  "Recovery",
  "Power",
  "Conditioning",
];

const getUniqueOptions = (items: Exercise[], key: keyof Exercise) => {
  return [
    "All",
    ...Array.from(
      new Set(
        items
          .map((item) => item[key])
          .filter(Boolean)
          .map((value) => String(value)),
      ),
    ).sort(),
  ];
};

const splitMuscles = (muscles?: string) => {
  if (!muscles) return [];

  return muscles
    .split("•")
    .map((muscle) => muscle.trim())
    .filter(Boolean);
};

export default function ExerciseLibraryPage() {
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const exercisesPerPage = 12;
  const [bodyFilter, setBodyFilter] = useState("All");
  const [muscleFilter, setMuscleFilter] = useState("All");
  const [patternFilter, setPatternFilter] = useState("All");
  const [goalFilter, setGoalFilter] = useState("All");
  const [equipmentFilter, setEquipmentFilter] = useState("All");
  const [levelFilter, setLevelFilter] = useState("All");
  const [openFilter, setOpenFilter] = useState<string | null>(null);

  const [customExercises, setCustomExercises] = useState<Exercise[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [statsExercise, setStatsExercise] = useState<Exercise | null>(null);
  const [statWeight, setStatWeight] = useState("");
  const [statReps, setStatReps] = useState("");
  const [statSets, setStatSets] = useState("");
  const [savedExerciseStats, setSavedExerciseStats] = useState<
    LocalExerciseStatEntry[]
  >([]);

  const [newExercise, setNewExercise] = useState({
    name: "",
    body: "",
    muscles: "",
    pattern: "",
    goal: "Stability",
    equipment: "",
    level: "",
    image: "",
    cue: "",
  });

  useEffect(() => {
    setCustomExercises(readCustomExercises<Exercise>());
  }, []);

  useEffect(() => {
    writeCustomExercises(customExercises);
  }, [customExercises]);

  useEffect(() => {
    setSavedExerciseStats(readExerciseStats());
  }, []);

  const allExercises: Exercise[] = useMemo(() => {
    return [...normalizedSystemExercises, ...customExercises];
  }, [customExercises]);

  const bodyOptions = useMemo(
    () => getUniqueOptions(allExercises, "body"),
    [allExercises],
  );

  const bodyScopedExercises = useMemo(() => {
    if (bodyFilter === "All") return allExercises;

    return allExercises.filter((exercise) => exercise.body === bodyFilter);
  }, [allExercises, bodyFilter]);

  const muscleOptions = useMemo(() => {
    const muscles = bodyScopedExercises
      .flatMap((exercise) => splitMuscles(exercise.muscles))
      .filter(Boolean);

    return ["All", ...Array.from(new Set(muscles)).sort()];
  }, [bodyScopedExercises]);

  const patternOptions = useMemo(
    () => getUniqueOptions(allExercises, "pattern"),
    [allExercises],
  );

  const goalOptions = useMemo(() => {
    const existingGoals = allExercises
      .map((exercise) => exercise.goal)
      .filter(Boolean);

    return [
      "All",
      ...Array.from(new Set([...baseGoals, ...existingGoals])).sort(),
    ];
  }, [allExercises]);

  const equipmentOptions = useMemo(
    () => getUniqueOptions(allExercises, "equipment"),
    [allExercises],
  );

  const levelOptions = useMemo(
    () => getUniqueOptions(allExercises, "level"),
    [allExercises],
  );

  const handleBodyChange = (body: string) => {
    setBodyFilter(body);
    setMuscleFilter("All");
  };

  const filtered = useMemo(() => {
    return allExercises.filter((exercise) => {
      const searchValue = search.toLowerCase();

      const matchesSearch =
        exercise.name?.toLowerCase().includes(searchValue) ||
        exercise.body?.toLowerCase().includes(searchValue) ||
        exercise.muscles?.toLowerCase().includes(searchValue) ||
        exercise.pattern?.toLowerCase().includes(searchValue) ||
        exercise.goal?.toLowerCase().includes(searchValue) ||
        exercise.equipment?.toLowerCase().includes(searchValue) ||
        exercise.level?.toLowerCase().includes(searchValue);

      const matchesBody = bodyFilter === "All" || exercise.body === bodyFilter;

      const exerciseMuscles = splitMuscles(exercise.muscles);

      const matchesMuscle =
        muscleFilter === "All" || exerciseMuscles.includes(muscleFilter);

      const matchesPattern =
        patternFilter === "All" || exercise.pattern === patternFilter;

      const matchesGoal = goalFilter === "All" || exercise.goal === goalFilter;

      const matchesEquipment =
        equipmentFilter === "All" || exercise.equipment === equipmentFilter;

      const matchesLevel =
        levelFilter === "All" || exercise.level === levelFilter;

      return (
        matchesSearch &&
        matchesBody &&
        matchesMuscle &&
        matchesPattern &&
        matchesGoal &&
        matchesEquipment &&
        matchesLevel
      );
    });
  }, [
    allExercises,
    search,
    bodyFilter,
    muscleFilter,
    patternFilter,
    goalFilter,
    equipmentFilter,
    levelFilter,
  ]);

  const totalPages = Math.ceil(filtered.length / exercisesPerPage);

  const paginatedExercises = useMemo(() => {
    const startIndex = (currentPage - 1) * exercisesPerPage;
    return filtered.slice(startIndex, startIndex + exercisesPerPage);
  }, [filtered, currentPage, exercisesPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    search,
    bodyFilter,
    muscleFilter,
    patternFilter,
    goalFilter,
    equipmentFilter,
    levelFilter,
  ]);

  const resetFilters = () => {
    setSearch("");
    setBodyFilter("All");
    setMuscleFilter("All");
    setPatternFilter("All");
    setGoalFilter("All");
    setEquipmentFilter("All");
    setLevelFilter("All");
  };

  const addExercise = () => {
    if (!newExercise.name.trim()) return;

    const exercise: Exercise = {
      id: `custom-${Date.now()}`,
      name: newExercise.name.trim(),
      body: newExercise.body.trim() || "General",
      muscles: newExercise.muscles.trim() || "General",
      pattern: newExercise.pattern.trim() || "General",
      goal: newExercise.goal.trim() || "Stability",
      equipment: newExercise.equipment.trim() || "Bodyweight",
      level: newExercise.level.trim() || "Beginner",
      image: newExercise.image.trim() || defaultImage,
      cue:
        newExercise.cue.trim() ||
        "Move with control, own the position, and make every rep count.",
      custom: true,
    };

    setCustomExercises((prev) => [exercise, ...prev]);

    setNewExercise({
      name: "",
      body: "",
      muscles: "",
      pattern: "",
      goal: "Stability",
      equipment: "",
      level: "",
      image: "",
      cue: "",
    });

    setShowAddForm(false);
  };

  const deleteCustomExercise = (id: string) => {
    setCustomExercises((prev) => prev.filter((exercise) => exercise.id !== id));
  };

  const FilterButtons = ({
    title,
    subtitle,
    options,
    value,
    setValue,
    color = "cyan",
  }: {
    title: string;
    subtitle?: string;
    options: string[];
    value: string;
    setValue: (value: string) => void;
    color?: "cyan" | "emerald" | "blue";
  }) => {
    const activeClass =
      color === "emerald"
        ? "border-emerald-300 bg-emerald-400 text-slate-950 shadow-[0_0_22px_rgba(52,211,153,0.2)]"
        : color === "blue"
          ? "border-blue-300 bg-blue-400 text-slate-950 shadow-[0_0_22px_rgba(96,165,250,0.2)]"
          : "border-cyan-300 bg-cyan-400 text-slate-950 shadow-[0_0_22px_rgba(34,211,238,0.22)]";

    return (
      <div>
        <div className="mb-3">
          <p className="text-sm font-bold text-slate-300">{title}</p>
          {subtitle && (
            <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {options.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setValue(option)}
              className={`min-h-[44px] rounded-full border px-3 py-2.5 text-xs font-black uppercase tracking-[0.1em] transition sm:px-4 sm:tracking-[0.12em] ${
                value === option
                  ? activeClass
                  : "border-white/10 bg-white/[0.04] text-slate-400 hover:border-cyan-300/40 hover:text-white"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
    );
  };

  const FilterMenu = ({
    label,
    value,
    options,
    onChange,
    accent = "cyan",
  }: {
    label: string;
    value: string;
    options: string[];
    onChange: (value: string) => void;
    accent?: "cyan" | "emerald" | "blue" | "violet";
  }) => {
    const [open, setOpen] = useState(false);

    const accentClasses = {
      cyan: "border-cyan-300/30 bg-cyan-400/10 text-cyan-200",
      emerald: "border-emerald-300/30 bg-emerald-400/10 text-emerald-200",
      blue: "border-blue-300/30 bg-blue-400/10 text-blue-200",
      violet: "border-violet-300/30 bg-violet-400/10 text-violet-200",
    };

    return (
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className={`flex w-full items-center justify-between rounded-[22px] border px-4 py-4 text-left shadow-xl transition hover:scale-[1.01] ${accentClasses[accent]}`}
        >
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] opacity-70">
              {label}
            </p>
            <p className="mt-1 text-sm font-black text-white">{value}</p>
          </div>

          <span className={`text-lg transition ${open ? "rotate-180" : ""}`}>
            ↓
          </span>
        </button>

        {open && (
          <div className="absolute left-0 right-0 z-[9999] mt-2 overflow-hidden rounded-[24px] border border-white/10 bg-slate-950/95 p-2 shadow-[0_24px_80px_rgba(0,0,0,0.75)] backdrop-blur-xl">
            <div className="max-h-72 overflow-y-auto pr-1">
              {options.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    onChange(option);
                    setOpen(false);
                  }}
                  className={`mb-1 flex min-h-[44px] w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-bold transition ${
                    value === option
                      ? "bg-cyan-400 text-slate-950"
                      : "text-slate-300 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <span>{option}</span>
                  {value === option && <span>✓</span>}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.16),_transparent_30%),linear-gradient(180deg,#020617_0%,#0f172a_100%)] text-white">
      <section className="mx-auto w-full max-w-[1240px] space-y-6 px-3 py-6 sm:px-4 sm:py-8">
        <section className="overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_18%_8%,rgba(34,211,238,0.2),transparent_32%),radial-gradient(circle_at_90%_20%,rgba(16,185,129,0.14),transparent_30%),linear-gradient(135deg,rgba(15,23,42,0.96),rgba(2,6,23,0.98))] p-4 shadow-2xl sm:rounded-[42px] sm:p-6 lg:p-8">
          <p className="text-[11px] font-black uppercase tracking-[0.3em] text-cyan-300">
            Exercise Library
          </p>

          <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_320px] lg:items-end">
            <div>
              <h1 className="max-w-3xl text-3xl font-black leading-tight sm:text-4xl lg:text-5xl">
                Train with clarity.
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300">
                Start broad with body part, then narrow down by the smaller
                muscle group, goal, pattern, equipment, and level.
              </p>
            </div>

            <div className="rounded-[28px] border border-cyan-300/20 bg-cyan-400/10 p-5 flex flex-col justify-between">
              <div>
                <p className="text-sm text-slate-300">Library Count</p>
                <p className="mt-2 text-3xl font-black text-white sm:text-4xl">
                  {allExercises.length}
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  {customExercises.length} custom exercises
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  (window.location.href = ROUTES.workoutBuilder.home)
                }
                className="mt-4 min-h-[48px] rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm font-black text-slate-300 transition hover:border-cyan-300/40 hover:text-white"
              >
                ← Back to Workout Builder
              </button>
            </div>
          </div>
        </section>

        <section className="relative z-50 overflow-visible rounded-[34px] border border-white/15 bg-white/[0.055] p-5 shadow-[0_20px_70px_rgba(0,0,0,0.38),inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-2xl backdrop-saturate-150">
          <div className="grid gap-4 lg:grid-cols-[1fr_auto_auto] lg:items-start">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-emerald-300">
                Find Movement
              </p>

              <input
                placeholder="Search exercise, muscle, pattern, goal, equipment, or level..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="mt-4 min-h-[48px] w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-4 text-white outline-none placeholder:text-slate-500 focus:border-cyan-300"
              />
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3">
              <p className="text-xs text-slate-400">Showing</p>
              <p className="mt-1 text-2xl font-black text-cyan-300">
                {filtered.length}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowAddForm((prev) => !prev)}
              className="min-h-[48px] rounded-2xl border border-emerald-300/20 bg-emerald-400/10 px-5 py-4 text-sm font-black text-emerald-300 transition hover:bg-emerald-400 hover:text-slate-950"
            >
              {showAddForm ? "Close Form" : "+ Add Exercise"}
            </button>
          </div>

          {showAddForm && (
            <div className="mt-6 rounded-[28px] border border-emerald-300/20 bg-slate-950/50 p-5">
              <p className="text-lg font-black text-white">
                Add Private Exercise
              </p>
              <p className="mt-1 text-sm text-slate-400">
                This saves to your browser only, so it is only visible to you on
                this device.
              </p>

              <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {[
                  ["name", "Exercise Name"],
                  ["body", "Body Part"],
                  ["muscles", "Smaller Muscles, use • between each"],
                  ["pattern", "Pattern"],
                  ["goal", "Goal"],
                  ["equipment", "Equipment"],
                  ["level", "Level"],
                  ["image", "Image URL"],
                  ["cue", "Coaching Cue"],
                ].map(([key, label]) => (
                  <input
                    key={key}
                    placeholder={label}
                    value={newExercise[key as keyof typeof newExercise]}
                    onChange={(e) =>
                      setNewExercise((prev) => ({
                        ...prev,
                        [key]: e.target.value,
                      }))
                    }
                    className="min-h-[48px] rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-emerald-300"
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={addExercise}
                className="mt-5 min-h-[48px] rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-emerald-300"
              >
                Save Exercise
              </button>
            </div>
          )}

          <div className="mt-6 space-y-4">
            <div className="rounded-[28px] border border-white/10 bg-slate-950/40 p-4">
              <FilterButtons
                title="1. Body Part"
                subtitle="Choose the main area first."
                options={bodyOptions}
                value={bodyFilter}
                setValue={handleBodyChange}
              />

              {bodyFilter !== "All" && (
                <div className="mt-5 border-t border-white/10 pt-5">
                  <FilterButtons
                    title="2. Smaller Muscle Group"
                    subtitle={`Showing muscles inside ${bodyFilter}.`}
                    options={muscleOptions}
                    value={muscleFilter}
                    setValue={setMuscleFilter}
                    color="blue"
                  />
                </div>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <FilterMenu
                label="Goal"
                value={goalFilter}
                options={goalOptions}
                onChange={setGoalFilter}
                accent="emerald"
              />

              <FilterMenu
                label="Pattern"
                value={patternFilter}
                options={patternOptions}
                onChange={setPatternFilter}
                accent="cyan"
              />

              <FilterMenu
                label="Equipment"
                value={equipmentFilter}
                options={equipmentOptions}
                onChange={setEquipmentFilter}
                accent="blue"
              />

              <FilterMenu
                label="Level"
                value={levelFilter}
                options={levelOptions}
                onChange={setLevelFilter}
                accent="violet"
              />
            </div>

            <button
              type="button"
              onClick={resetFilters}
              className="min-h-[48px] w-full rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-black text-slate-300 transition hover:border-cyan-300/40 hover:text-white sm:w-auto"
            >
              Clear Filters
            </button>
          </div>
        </section>

        <section className="relative z-0 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {paginatedExercises.map((exercise) => (
            <article
              key={exercise.id}
              className="group relative overflow-hidden rounded-[30px] border border-white/20 bg-[linear-gradient(135deg,rgba(255,255,255,0.13),rgba(255,255,255,0.035))] shadow-[0_24px_80px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.20)] backdrop-blur-2xl backdrop-saturate-150 transition hover:border-white/30 hover:bg-[linear-gradient(135deg,rgba(255,255,255,0.18),rgba(255,255,255,0.055))] hover:shadow-[0_32px_100px_rgba(0,0,0,0.56),inset_0_1px_0_rgba(255,255,255,0.26)]"
            >
              <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(circle_at_20%_0%,rgba(255,255,255,0.18),transparent_34%),linear-gradient(120deg,rgba(255,255,255,0.16)_0%,rgba(255,255,255,0.055)_36%,transparent_68%)] opacity-70" />

              <div className="relative z-10 h-44 overflow-hidden bg-slate-950/60">
                <img
                  src={exercise.image || defaultImage}
                  alt={exercise.name}
                  className="h-full w-full object-cover opacity-80 transition duration-500 group-hover:scale-105 group-hover:opacity-100"
                />
              </div>

              <div className="relative z-10 p-5">
                <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <span className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-cyan-300">
                    {exercise.body}
                  </span>

                  <span className="text-xs font-bold text-slate-500">
                    {exercise.level}
                  </span>
                </div>

                <h2 className="mt-4 text-xl font-extrabold text-white/90 tracking-wide drop-shadow-[0_0_12px_rgba(255,255,255,0.35)]">
                  {exercise.name}
                </h2>

                <p className="mt-2 text-sm leading-5 text-white/55 drop-shadow-[0_0_8px_rgba(255,255,255,0.18)]">
                  {exercise.muscles}
                </p>

                <div className="mt-4 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-[linear-gradient(135deg,rgba(2,6,23,0.92),rgba(15,23,42,0.55))] p-3 backdrop-blur-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_8px_30px_rgba(0,0,0,0.45)]">
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/35">
                      Pattern
                    </p>
                    <p className="mt-1 text-sm font-extrabold tracking-wide text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.18)]">
                      {exercise.pattern}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-[linear-gradient(135deg,rgba(2,6,23,0.92),rgba(15,23,42,0.55))] p-3 backdrop-blur-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_8px_30px_rgba(0,0,0,0.45)]">
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/35">
                      Equipment
                    </p>
                    <p className="mt-1 text-sm font-extrabold tracking-wide text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.18)]">
                      {exercise.equipment}
                    </p>
                  </div>
                </div>

                <div className="mt-2 rounded-2xl border border-white/10 bg-[linear-gradient(135deg,rgba(2,6,23,0.92),rgba(15,23,42,0.55))] p-3 backdrop-blur-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_8px_30px_rgba(0,0,0,0.45)] text-xs">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/35">
                    Goal
                  </p>
                  <p className="mt-1 text-sm font-extrabold tracking-wide text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.18)]">
                    {exercise.goal}
                  </p>
                </div>

                <div className="mt-4 rounded-2xl border border-emerald-300/20 bg-[linear-gradient(135deg,rgba(16,185,129,0.18),rgba(16,185,129,0.05))] p-4 backdrop-blur-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-200/80 drop-shadow-[0_0_8px_rgba(16,185,129,0.35)]">
                    Coaching Cue
                  </p>

                  <p className="mt-2 text-sm leading-5 text-emerald-100/80 drop-shadow-[0_0_10px_rgba(16,185,129,0.25)]">
                    {exercise.cue}
                  </p>
                </div>

                {exercise.custom ? (
                  <button
                    type="button"
                    onClick={() => deleteCustomExercise(exercise.id)}
                    className="mt-4 min-h-[48px] w-full rounded-2xl border border-red-300/20 bg-red-400/10 px-4 py-3 text-sm font-black text-red-300 transition hover:bg-red-400 hover:text-white"
                  >
                    Delete Custom Exercise
                  </button>
                ) : (
                  <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <a
                      href={ROUTES.workoutBuilder.exerciseDemo}
                      className="flex min-h-[48px] items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-400/10 px-4 py-3 text-center text-sm font-black text-cyan-300 transition hover:bg-cyan-400 hover:text-slate-950"
                    >
                      View Demo →
                    </a>

                    <button
                      type="button"
                      onClick={() => setStatsExercise(exercise)}
                      className="min-h-[48px] rounded-2xl border border-yellow-300/30 bg-yellow-400/15 px-4 py-3 text-sm font-black text-yellow-300 transition hover:bg-yellow-400 hover:text-slate-950"
                    >
                      Add Stats ✦
                    </button>
                  </div>
                )}
              </div>
            </article>
          ))}
        </section>

        {filtered.length > exercisesPerPage && (
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="min-h-[44px] rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 hover:text-white disabled:opacity-40"
            >
              ←
            </button>

            {Array.from({ length: totalPages }).map((_, i) => {
              const page = i + 1;
              return (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`h-11 w-11 rounded-xl text-sm font-bold ${
                    currentPage === page
                      ? "bg-cyan-400 text-black"
                      : "bg-white/5 text-slate-400 hover:text-white"
                  }`}
                >
                  {page}
                </button>
              );
            })}

            <button
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              disabled={currentPage === totalPages}
              className="min-h-[44px] rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 hover:text-white disabled:opacity-40"
            >
              →
            </button>
          </div>
        )}

        {filtered.length === 0 && (
          <section className="rounded-[28px] border border-white/10 bg-white/[0.05] p-6 text-center shadow-2xl sm:rounded-[34px] sm:p-10">
            <p className="text-lg font-black text-white">No exercises found.</p>
            <p className="mt-2 text-sm text-slate-400">
              Try clearing filters or adding a new movement.
            </p>
          </section>
        )}
      </section>

      {statsExercise && (
        <div className="fixed inset-x-2 bottom-3 top-3 z-[9999] mx-auto w-auto max-w-[760px] sm:inset-x-auto sm:bottom-6 sm:right-6 sm:top-auto sm:w-[min(94vw,760px)]">
          <div className="max-h-full max-w-full overflow-hidden rounded-[28px] border border-white/20 bg-white/[0.075] shadow-[0_30px_120px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.16)] backdrop-blur-2xl backdrop-saturate-150 sm:max-h-[86vh] sm:rounded-[34px]">
            <div className="max-h-full overflow-y-auto overflow-x-hidden overscroll-contain px-1 sm:max-h-[86vh]">
              <div className="grid lg:grid-cols-[1.05fr_310px] h-full">
                <div className="min-h-0 overflow-y-auto">
                  <div className="relative h-52 overflow-hidden border-b border-white/10 bg-slate-950 sm:h-[310px]">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.22),transparent_42%),linear-gradient(135deg,rgba(8,13,30,0.95),rgba(2,6,23,0.98))]" />

                    <div className="absolute inset-0 flex items-center justify-center">
                      <button
                        type="button"
                        className="flex h-20 w-20 items-center justify-center rounded-full border border-cyan-300/40 bg-cyan-300/10 text-3xl text-cyan-200 shadow-[0_0_40px_rgba(34,211,238,0.25)] transition hover:scale-105 hover:bg-cyan-300/20"
                      >
                        ▶
                      </button>
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-transparent p-5">
                      <p className="text-[10px] font-black uppercase tracking-[0.28em] text-yellow-300">
                        Add Stats
                      </p>
                      <h3 className="mt-1 text-2xl font-black text-white sm:text-3xl">
                        {statsExercise.name}
                      </h3>
                      <p className="mt-1 text-xs text-slate-300">
                        {statsExercise.body} • {statsExercise.pattern} •{" "}
                        {statsExercise.equipment}
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-white/10 bg-white/[0.055] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl">
                    <p className="mt-2 rounded-2xl border border-white/10 bg-white/[0.06] p-4 text-sm leading-6 text-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl">
                      Coaching Cue
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-300">
                      {statsExercise.cue ||
                        "Move with control, own the position, and make every rep count."}
                    </p>
                  </div>
                </div>

                <div className="border-t border-white/10 bg-white/[0.055] p-4 shadow-[inset_1px_0_0_rgba(255,255,255,0.08)] backdrop-blur-xl lg:border-l lg:border-t-0">
                  <div className="mb-4 rounded-2xl border border-emerald-300/15 bg-emerald-400/10 p-3">
                    <p className="text-xs font-black uppercase text-emerald-300">
                      Recent Stats
                    </p>

                    <div className="mt-2 space-y-2">
                      {savedExerciseStats
                        .filter((stat) => stat.exerciseId === statsExercise.id)
                        .slice(0, 3).length > 0 ? (
                        savedExerciseStats
                          .filter(
                            (stat) => stat.exerciseId === statsExercise.id,
                          )
                          .slice(0, 3)
                          .map((stat, index) => (
                            <div
                              key={`${stat.date}-${index}`}
                              className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.10)]"
                            >
                              <p className="text-base font-extrabold tracking-wide text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.35)]">
                                <span className="text-white">
                                  {stat.weight}
                                </span>
                                <span className="mx-2 text-white/30">×</span>
                                <span className="text-white">{stat.reps}</span>
                                <span className="mx-2 text-white/30">×</span>
                                <span className="text-white">{stat.sets}</span>
                              </p>

                              <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/50">
                                {new Date(stat.date).toLocaleDateString()}
                              </p>
                            </div>
                          ))
                      ) : (
                        <p className="text-sm text-slate-300">
                          No recent stats saved yet.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 rounded-[28px] border border-white/10 bg-white/[0.05] p-4 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/80 drop-shadow-[0_0_10px_rgba(255,255,255,0.25)]">
                          Weight × Reps × Sets
                        </p>
                        <p className="mt-1 text-xs text-white/40">
                          Quick set tracking
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setStatsExercise(null)}
                        className="min-h-[44px] rounded-2xl border border-white/10 bg-white/[0.08] px-4 py-2 text-xs font-black text-white/70 transition hover:bg-white/[0.18] hover:text-white"
                      >
                        Close
                      </button>
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
                      <input
                        value={statWeight}
                        onChange={(e) => setStatWeight(e.target.value)}
                        placeholder="Weight"
                        className="min-h-[48px] rounded-2xl border border-white/10 bg-white/[0.08] px-3 py-3 text-sm font-semibold text-white backdrop-blur-xl outline-none placeholder:text-white/30 focus:border-white/30 focus:bg-white/[0.12]"
                      />

                      <input
                        value={statReps}
                        onChange={(e) => setStatReps(e.target.value)}
                        placeholder="Reps"
                        className="min-h-[48px] rounded-2xl border border-white/10 bg-white/[0.08] px-3 py-3 text-sm font-semibold text-white backdrop-blur-xl outline-none placeholder:text-white/30 focus:border-white/30 focus:bg-white/[0.12]"
                      />

                      <input
                        value={statSets}
                        onChange={(e) => setStatSets(e.target.value)}
                        placeholder="Sets"
                        className="min-h-[48px] rounded-2xl border border-white/10 bg-white/[0.08] px-3 py-3 text-sm font-semibold text-white backdrop-blur-xl outline-none placeholder:text-white/30 focus:border-white/30 focus:bg-white/[0.12]"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (
                        !statWeight.trim() ||
                        !statReps.trim() ||
                        !statSets.trim()
                      )
                        return;

                      const newStat: LocalExerciseStatEntry = {
                        exerciseId: statsExercise.id,
                        exerciseName: statsExercise.name,
                        body: statsExercise.body,
                        pattern: statsExercise.pattern,
                        equipment: statsExercise.equipment,
                        weight: statWeight.trim(),
                        reps: statReps.trim(),
                        sets: statSets.trim(),
                        date: new Date().toISOString(),
                        source: "exercise-library",
                      };

                      const updated = prependExerciseStats(newStat);

                      setSavedExerciseStats(updated);
                      setStatWeight("");
                      setStatReps("");
                      setStatSets("");
                    }}
                    className="mt-3 min-h-[48px] w-full rounded-2xl bg-gradient-to-r from-yellow-300 to-yellow-500 px-4 py-3 text-sm font-black text-slate-950 shadow-[0_0_28px_rgba(250,204,21,0.22)] transition hover:scale-[1.01]"
                  >
                    Save Stats
                  </button>

                  <div className="mt-3 grid gap-2">
                    <a
                      href={ROUTES.dashboard.stats}
                      className="min-h-[48px] rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-center text-sm font-black text-slate-300 transition hover:border-yellow-300/40 hover:text-white"
                    >
                      View Stats Page →
                    </a>

                    <a
                      href={ROUTES.workoutBuilder.exerciseDemo}
                      className="min-h-[48px] rounded-2xl border border-cyan-300/20 bg-cyan-400/10 px-4 py-3 text-center text-sm font-black text-cyan-300 transition hover:bg-cyan-400 hover:text-slate-950"
                    >
                      View Full Demo Page →
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
