export default function WorkoutBuilderPage() {
  const filters = {
    goal: "Strength",
    equipment: "Dumbbell",
    level: "Beginner",
  };

  const exerciseResults = [
    {
      id: 1,
      name: "DB Goblet Squat",
      pattern: "Squat",
      goal: "Strength",
      equipment: "DB",
    },
    {
      id: 2,
      name: "DB RDL",
      pattern: "Hinge",
      goal: "Strength",
      equipment: "DB",
    },
    {
      id: 3,
      name: "DB Bench Press",
      pattern: "Push",
      goal: "Strength",
      equipment: "DB",
    },
    {
      id: 4,
      name: "1-Arm DB Row",
      pattern: "Pull",
      goal: "Hypertrophy",
      equipment: "DB",
    },
    {
      id: 5,
      name: "Dead Bug",
      pattern: "Core",
      goal: "Mobility",
      equipment: "Bodyweight",
    },
    {
      id: 6,
      name: "Farmer Carry",
      pattern: "Carry",
      goal: "Strength",
      equipment: "DB",
    },
  ];

  const workoutSlots = {
    warmup: [null, null, null],
    compounds: [null, null],
    accessories: [null, null],
    core: [null],
  };

  const FilterPill = ({ label, value }) => (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 shadow-sm">
      <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
        {label}
      </div>
      <button className="mt-1 flex w-full items-center justify-between rounded-xl bg-slate-900/70 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-800">
        <span>{value}</span>
        <span className="text-slate-400">▾</span>
      </button>
    </div>
  );

  const SectionTitle = ({ children }) => (
    <div className="mb-3 mt-6 text-xs font-semibold uppercase tracking-[0.22em] text-sky-300 first:mt-0">
      {children}
    </div>
  );

  const EmptySlot = ({ label }) => (
    <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.03] px-4 py-4 text-sm text-slate-400">
      {label}
    </div>
  );

  const ExerciseCard = ({ exercise }) => (
    <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4 shadow-sm transition hover:border-sky-400/40 hover:bg-slate-950">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-white">
            {exercise.name}
          </div>
          <div className="mt-1 text-xs text-slate-400">
            {exercise.pattern} • {exercise.goal} • {exercise.equipment}
          </div>
        </div>
        <button className="rounded-xl border border-sky-400/30 bg-sky-500/10 px-3 py-1.5 text-xs font-semibold text-sky-300 transition hover:bg-sky-500/20">
          + Add
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-[0.22em] text-sky-300">
              Sound Fitness
            </div>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">
              Workout Builder
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">
              Filter the library, review matching exercises, and add the right
              movements into each workout slot.
            </p>
          </div>
          <div className="flex gap-2">
            <button className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-200 hover:bg-white/10">
              Clear
            </button>
            <button className="rounded-2xl bg-sky-500 px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-sky-500/20 hover:bg-sky-400">
              Save Workout
            </button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
          <div className="xl:col-span-2">
            <FilterPill label="Goal" value={filters.goal} />
          </div>
          <div className="xl:col-span-2">
            <FilterPill label="Equipment" value={filters.equipment} />
          </div>
          <div className="xl:col-span-2">
            <FilterPill label="Level" value={filters.level} />
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <div className="text-lg font-semibold">Matching Exercises</div>
                <div className="text-sm text-slate-400">
                  Choose from the filtered library and add them into the
                  workout.
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2 text-xs text-slate-300">
                {exerciseResults.length} results
              </div>
            </div>

            <div className="space-y-3">
              {exerciseResults.map((exercise) => (
                <ExerciseCard key={exercise.id} exercise={exercise} />
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <div className="text-lg font-semibold">Workout Plan</div>
                <div className="text-sm text-slate-400">
                  Build the session one slot at a time.
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2 text-xs text-slate-300">
                0 / 8 filled
              </div>
            </div>

            <SectionTitle>Warm-Up</SectionTitle>
            <div className="space-y-3">
              <EmptySlot label="Warm-Up 1" />
              <EmptySlot label="Warm-Up 2" />
              <EmptySlot label="Warm-Up 3" />
            </div>

            <SectionTitle>Compounds</SectionTitle>
            <div className="space-y-3">
              <EmptySlot label="Compound 1" />
              <EmptySlot label="Compound 2" />
            </div>

            <SectionTitle>Accessories</SectionTitle>
            <div className="space-y-3">
              <EmptySlot label="Accessory 1" />
              <EmptySlot label="Accessory 2" />
            </div>

            <SectionTitle>Core</SectionTitle>
            <div className="space-y-3">
              <EmptySlot label="Core" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
