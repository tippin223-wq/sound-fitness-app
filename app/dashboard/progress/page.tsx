import TrainingJourneyNavigator from "@/components/dashboard/TrainingJourneyNavigator";

const workoutSnapshot = [
  { label: "Streak", value: "6 days", sub: "Keep it alive" },
  { label: "This Week", value: "3/4", sub: "One workout left" },
  { label: "Last Workout", value: "Lower Body", sub: "35 min" },
  { label: "Completion", value: "92%", sub: "Strong effort" },
  { label: "Top Progress", value: "+5 lb", sub: "Goblet squat" },
  { label: "Recovery", value: "Good", sub: "Ready to train" },
];

const movementProgress = [
  {
    movement: "Goblet Squat",
    category: "Lower Body",
    previous: "40 lb",
    current: "45 lb",
    change: "+5 lb",
    note: "Cleaner depth and better tempo.",
  },
  {
    movement: "Plank",
    category: "Core",
    previous: "40 sec",
    current: "50 sec",
    change: "+10 sec",
    note: "Better bracing and less hip drop.",
  },
  {
    movement: "RDL Control",
    category: "Hinge",
    previous: "Moderate",
    current: "Improved",
    change: "Cleaner reps",
    note: "More hamstring tension, less back compensation.",
  },
  {
    movement: "Push-Up",
    category: "Upper Body",
    previous: "8 reps",
    current: "10 reps",
    change: "+2 reps",
    note: "Stronger lockout and better body line.",
  },
];

const weeklyTraining = [
  { day: "Mon", title: "Upper Body", status: "Complete", score: "100%" },
  { day: "Tue", title: "Mobility Reset", status: "Complete", score: "100%" },
  { day: "Wed", title: "Recovery", status: "Done", score: "Light" },
  { day: "Thu", title: "Lower Body", status: "Complete", score: "92%" },
  { day: "Fri", title: "Optional Core", status: "Planned", score: "-" },
  { day: "Sat", title: "Walk / Stretch", status: "Optional", score: "-" },
  { day: "Sun", title: "Mobility", status: "Planned", score: "-" },
];

const bodyFocus = [
  { area: "Legs", volume: 78, note: "Strong week" },
  { area: "Core", volume: 64, note: "Improving control" },
  { area: "Back", volume: 52, note: "Steady work" },
  { area: "Chest", volume: 38, note: "Needs one more touch" },
  { area: "Shoulders", volume: 44, note: "Balanced" },
  { area: "Mobility", volume: 71, note: "Great consistency" },
];

const socialProgress = [
  { label: "Momentum Points", value: "85", sub: "15 from next reward" },
  { label: "Workout Wins Posted", value: "3", sub: "+30 points earned" },
  { label: "Replies Given", value: "4", sub: "+12 points earned" },
  { label: "Challenges Tried", value: "1", sub: "+15 points earned" },
];

const goals = [
  {
    title: "Complete 4 workouts this week",
    progress: 75,
    status: "Almost there",
  },
  {
    title: "Post 2 workout wins",
    progress: 50,
    status: "1 more post",
  },
  {
    title: "Improve goblet squat control",
    progress: 85,
    status: "Strong progress",
  },
];

export default function DashboardProgressPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.14),_transparent_30%),linear-gradient(180deg,#020617_0%,#0f172a_100%)] text-white">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <TrainingJourneyNavigator currentStep="progress" variant="full" />

        <section className="overflow-hidden rounded-[36px] border border-white/10 bg-white/[0.05] shadow-2xl shadow-black/20 backdrop-blur">
          <div className="grid gap-6 p-6 lg:grid-cols-[1.1fr_0.9fr] lg:p-8">
            <div>
              <div className="text-[11px] uppercase tracking-[0.26em] text-sky-300">
                Dashboard / Progress
              </div>

              <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
                Your progress is stacking up.
              </h1>

              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
                Track workouts, consistency, strength improvements, recovery,
                body focus, Momentum Points, and the wins you’ve shared in the
                social hub.
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <a
                  href="/dashboard"
                  className="rounded-2xl bg-sky-500 px-5 py-3 text-center text-sm font-semibold text-slate-950 shadow-lg shadow-sky-500/20 hover:bg-sky-400"
                >
                  Start Next Workout
                </a>

                <a
                  href="/dashboard/social"
                  className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-center text-sm font-medium text-slate-200 hover:bg-white/10"
                >
                  Open Social Hub
                </a>

                <a
                  href="/dashboard/social/post"
                  className="rounded-2xl border border-yellow-400/20 bg-yellow-500/10 px-5 py-3 text-center text-sm font-medium text-yellow-300 hover:bg-yellow-500/15"
                >
                  Post Win +10
                </a>
              </div>
            </div>

            <div className="rounded-[30px] border border-sky-400/20 bg-sky-500/10 p-5">
              <div className="text-[11px] uppercase tracking-[0.22em] text-sky-300">
                Recent Workout Snapshot
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                {workoutSnapshot.map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-[22px] border border-white/10 bg-slate-950/55 p-4"
                  >
                    <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">
                      {stat.label}
                    </div>
                    <div className="mt-2 text-xl font-bold text-white">
                      {stat.value}
                    </div>
                    <div className="mt-1 text-xs text-slate-400">
                      {stat.sub}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          {workoutSnapshot.map((stat) => (
            <div
              key={stat.label}
              className="rounded-[28px] border border-white/10 bg-white/[0.05] p-5 shadow-xl shadow-black/15 backdrop-blur"
            >
              <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">
                {stat.label}
              </div>
              <div className="mt-2 text-2xl font-bold text-white">
                {stat.value}
              </div>
              <div className="mt-1 text-xs text-slate-400">{stat.sub}</div>
            </div>
          ))}
        </section>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <section className="rounded-[32px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl shadow-black/20 backdrop-blur">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.22em] text-emerald-300">
                    Movement Progress
                  </div>
                  <h2 className="mt-2 text-2xl font-bold tracking-tight">
                    What’s improving
                  </h2>
                </div>

                <div className="text-sm text-slate-400">
                  Compared to recent sessions
                </div>
              </div>

              <div className="mt-5 grid gap-4">
                {movementProgress.map((item) => (
                  <div
                    key={item.movement}
                    className="rounded-[28px] border border-white/10 bg-slate-950/55 p-5"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-semibold text-white">
                            {item.movement}
                          </h3>
                          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-sky-300">
                            {item.category}
                          </span>
                        </div>

                        <p className="mt-2 text-sm leading-6 text-slate-400">
                          {item.note}
                        </p>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center sm:min-w-[280px]">
                        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                          <div className="text-[10px] uppercase tracking-[0.14em] text-slate-500">
                            Before
                          </div>
                          <div className="mt-1 text-sm font-semibold text-slate-300">
                            {item.previous}
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                          <div className="text-[10px] uppercase tracking-[0.14em] text-slate-500">
                            Now
                          </div>
                          <div className="mt-1 text-sm font-semibold text-white">
                            {item.current}
                          </div>
                        </div>

                        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-3">
                          <div className="text-[10px] uppercase tracking-[0.14em] text-emerald-300">
                            Change
                          </div>
                          <div className="mt-1 text-sm font-semibold text-emerald-300">
                            {item.change}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[32px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl shadow-black/20 backdrop-blur">
              <div>
                <div className="text-[11px] uppercase tracking-[0.22em] text-violet-300">
                  Weekly Rhythm
                </div>
                <h2 className="mt-2 text-2xl font-bold tracking-tight">
                  Training week at a glance
                </h2>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-7">
                {weeklyTraining.map((day) => (
                  <div
                    key={day.day}
                    className="rounded-[24px] border border-white/10 bg-slate-950/55 p-4"
                  >
                    <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
                      {day.day}
                    </div>

                    <div className="mt-3 text-sm font-semibold text-white">
                      {day.title}
                    </div>

                    <div className="mt-2 rounded-full border border-sky-400/20 bg-sky-500/10 px-3 py-1 text-xs text-sky-300">
                      {day.status}
                    </div>

                    <div className="mt-3 text-xs text-slate-400">
                      {day.score}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[32px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl shadow-black/20 backdrop-blur">
              <div>
                <div className="text-[11px] uppercase tracking-[0.22em] text-cyan-300">
                  Body Focus
                </div>
                <h2 className="mt-2 text-2xl font-bold tracking-tight">
                  Training balance by area
                </h2>
              </div>

              <div className="mt-5 space-y-4">
                {bodyFocus.map((area) => (
                  <div
                    key={area.area}
                    className="rounded-[24px] border border-white/10 bg-slate-950/55 p-4"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <div>
                        <div className="text-sm font-semibold text-white">
                          {area.area}
                        </div>
                        <div className="text-xs text-slate-500">
                          {area.note}
                        </div>
                      </div>

                      <div className="text-sm font-bold text-sky-300">
                        {area.volume}%
                      </div>
                    </div>

                    <div className="h-2 w-full rounded-full bg-white/10">
                      <div
                        className="h-2 rounded-full bg-sky-400"
                        style={{ width: `${area.volume}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-[32px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl shadow-black/20 backdrop-blur xl:sticky xl:top-6">
              <div className="text-[11px] uppercase tracking-[0.22em] text-yellow-300">
                Momentum + Social Progress
              </div>

              <h2 className="mt-2 text-2xl font-bold tracking-tight">
                Earned through consistency
              </h2>

              <div className="mt-5 grid gap-3">
                {socialProgress.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-[24px] border border-white/10 bg-slate-950/55 p-4"
                  >
                    <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">
                      {item.label}
                    </div>
                    <div className="mt-2 text-2xl font-bold text-yellow-300">
                      {item.value}
                    </div>
                    <div className="mt-1 text-xs text-slate-400">
                      {item.sub}
                    </div>
                  </div>
                ))}
              </div>

              <a
                href="/dashboard/social/post"
                className="mt-5 block rounded-2xl bg-sky-500 px-4 py-3 text-center text-sm font-semibold text-slate-950 shadow-lg shadow-sky-500/20 hover:bg-sky-400"
              >
                Post a Win +10
              </a>
            </section>

            <section className="rounded-[32px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl shadow-black/20 backdrop-blur">
              <div className="text-[11px] uppercase tracking-[0.22em] text-amber-300">
                Active Goals
              </div>

              <h2 className="mt-2 text-2xl font-bold tracking-tight">
                What to focus on next
              </h2>

              <div className="mt-5 space-y-4">
                {goals.map((goal) => (
                  <div
                    key={goal.title}
                    className="rounded-[24px] border border-white/10 bg-slate-950/55 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-white">
                          {goal.title}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          {goal.status}
                        </div>
                      </div>

                      <div className="text-sm font-bold text-sky-300">
                        {goal.progress}%
                      </div>
                    </div>

                    <div className="mt-3 h-2 w-full rounded-full bg-white/10">
                      <div
                        className="h-2 rounded-full bg-sky-400"
                        style={{ width: `${goal.progress}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[32px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl shadow-black/20 backdrop-blur">
              <div className="text-[11px] uppercase tracking-[0.22em] text-rose-300">
                Coach Note
              </div>

              <h2 className="mt-2 text-2xl font-bold tracking-tight">
                Your next best move
              </h2>

              <p className="mt-4 text-sm leading-6 text-slate-300">
                You’re already close to your weekly training goal. Finish one
                more workout, post a simple win, and keep the streak moving.
              </p>

              <div className="mt-5 grid gap-3">
                <a
                  href="/dashboard"
                  className="rounded-[22px] border border-white/10 bg-slate-950/55 px-4 py-4 text-sm font-medium text-white hover:border-sky-400/40 hover:bg-sky-500/10"
                >
                  Start Next Workout
                </a>

                <a
                  href="/dashboard/social"
                  className="rounded-[22px] border border-white/10 bg-slate-950/55 px-4 py-4 text-sm font-medium text-white hover:border-sky-400/40 hover:bg-sky-500/10"
                >
                  View Community Feed
                </a>

                <a
                  href="/dashboard/sessions"
                  className="rounded-[22px] border border-white/10 bg-slate-950/55 px-4 py-4 text-sm font-medium text-white hover:border-sky-400/40 hover:bg-sky-500/10"
                >
                  View Session History
                </a>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
