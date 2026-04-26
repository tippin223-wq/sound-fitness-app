export default function RecoveryPortalPage() {
  const summary = {
    readiness: "72%",
    soreness: "Moderate",
    sleep: "7.5 hrs",
    nextFocus: "Mobility + Core Reset",
  };

  const recoveryActions = [
    {
      title: "Mobility Reset",
      detail: "12 min guided flow for hips, shoulders, and T-spine.",
      badge: "Recommended",
    },
    {
      title: "Breathing Downshift",
      detail: "5 min calming session to lower tension and reset breathing.",
      badge: "Quick Reset",
    },
    {
      title: "Light Recovery Walk",
      detail: "20 min low-stress movement suggestion for today.",
      badge: "Low Intensity",
    },
  ];

  const checkins = [
    { label: "Sleep Quality", value: "Good" },
    { label: "Stress", value: "Medium" },
    { label: "Energy", value: "Steady" },
    { label: "Soreness", value: "Legs + upper back" },
  ];

  const sorenessMap = [
    { area: "Neck / Shoulders", level: "Low" },
    { area: "Upper Back", level: "Moderate" },
    { area: "Low Back", level: "Low" },
    { area: "Hips / Glutes", level: "Moderate" },
    { area: "Quads / Hamstrings", level: "High" },
  ];

  const habits = [
    { name: "Hydration", status: "On Track" },
    { name: "Protein Intake", status: "Needs Attention" },
    { name: "Sleep Routine", status: "On Track" },
    { name: "Walk / Light Movement", status: "Planned" },
  ];

  const habitStyles: Record<string, string> = {
    "On Track": "border-emerald-400/20 bg-emerald-500/10 text-emerald-300",
    "Needs Attention": "border-amber-400/20 bg-amber-500/10 text-amber-300",
    Planned: "border-sky-400/20 bg-sky-500/10 text-sky-300",
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(34,197,94,0.10),_transparent_28%),linear-gradient(180deg,#020617_0%,#0f172a_100%)] text-white">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
          <div className="space-y-6">
            <section className="rounded-[32px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl shadow-black/20 backdrop-blur lg:p-8">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.24em] text-emerald-300">
                    Recovery Portal
                  </div>
                  <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
                    Recover with purpose
                  </h1>
                  <p className="mt-3 max-w-2xl text-base text-slate-300">
                    This is where recovery becomes part of the plan — not an
                    afterthought. Check readiness, calm the system down, and
                    choose the right reset for today.
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-slate-200 hover:bg-white/10">
                    Log Recovery
                  </button>
                  <button className="rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/20 hover:bg-emerald-400">
                    Start Reset Session
                  </button>
                </div>
              </div>
            </section>

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-[28px] border border-white/10 bg-white/[0.05] p-5 shadow-xl shadow-black/15 backdrop-blur">
                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                  Readiness
                </div>
                <div className="mt-3 text-3xl font-bold tracking-tight">
                  {summary.readiness}
                </div>
                <div className="mt-2 text-sm text-slate-400">
                  Based on recent check-ins.
                </div>
              </div>
              <div className="rounded-[28px] border border-white/10 bg-white/[0.05] p-5 shadow-xl shadow-black/15 backdrop-blur">
                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                  Soreness
                </div>
                <div className="mt-3 text-3xl font-bold tracking-tight">
                  {summary.soreness}
                </div>
                <div className="mt-2 text-sm text-slate-400">
                  Mainly lower body today.
                </div>
              </div>
              <div className="rounded-[28px] border border-white/10 bg-white/[0.05] p-5 shadow-xl shadow-black/15 backdrop-blur">
                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                  Sleep
                </div>
                <div className="mt-3 text-3xl font-bold tracking-tight">
                  {summary.sleep}
                </div>
                <div className="mt-2 text-sm text-slate-400">
                  Recovery is trending up.
                </div>
              </div>
              <div className="rounded-[28px] border border-white/10 bg-white/[0.05] p-5 shadow-xl shadow-black/15 backdrop-blur">
                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                  Suggested Focus
                </div>
                <div className="mt-3 text-xl font-bold tracking-tight">
                  Reset
                </div>
                <div className="mt-2 text-sm text-slate-400">
                  {summary.nextFocus}
                </div>
              </div>
            </section>

            <section className="rounded-[32px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl shadow-black/20 backdrop-blur">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.22em] text-emerald-300">
                    Recovery Actions
                  </div>
                  <h2 className="mt-2 text-2xl font-bold tracking-tight">
                    Best next move today
                  </h2>
                </div>
                <button className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-white/10">
                  View all
                </button>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-3">
                {recoveryActions.map((item) => (
                  <div
                    key={item.title}
                    className="rounded-[26px] border border-white/10 bg-slate-950/55 p-5"
                  >
                    <div className="inline-flex rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-emerald-300">
                      {item.badge}
                    </div>
                    <div className="mt-4 text-lg font-semibold text-white">
                      {item.title}
                    </div>
                    <div className="mt-2 text-sm text-slate-400">
                      {item.detail}
                    </div>
                    <button className="mt-5 rounded-2xl bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-white/10">
                      Start
                    </button>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[32px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl shadow-black/20 backdrop-blur">
              <div className="text-[11px] uppercase tracking-[0.22em] text-violet-300">
                Body Check-In
              </div>
              <h2 className="mt-2 text-2xl font-bold tracking-tight">
                Where you feel it today
              </h2>

              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {sorenessMap.map((item) => (
                  <div
                    key={item.area}
                    className="rounded-[24px] border border-white/10 bg-slate-950/55 p-4"
                  >
                    <div className="text-base font-semibold text-white">
                      {item.area}
                    </div>
                    <div className="mt-2 text-sm text-slate-400">
                      Soreness level: {item.level}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-[32px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl shadow-black/20 backdrop-blur">
              <div className="text-[11px] uppercase tracking-[0.22em] text-cyan-300">
                Daily Check-In
              </div>
              <h2 className="mt-2 text-2xl font-bold tracking-tight">
                How you’re doing
              </h2>

              <div className="mt-5 space-y-3">
                {checkins.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-[24px] border border-white/10 bg-slate-950/55 px-4 py-4"
                  >
                    <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                      {item.label}
                    </div>
                    <div className="mt-2 text-base font-semibold text-white">
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[32px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl shadow-black/20 backdrop-blur">
              <div className="text-[11px] uppercase tracking-[0.22em] text-amber-300">
                Recovery Habits
              </div>
              <h2 className="mt-2 text-2xl font-bold tracking-tight">
                Small things that move the needle
              </h2>

              <div className="mt-5 space-y-3">
                {habits.map((habit) => (
                  <div
                    key={habit.name}
                    className="flex items-center justify-between gap-3 rounded-[24px] border border-white/10 bg-slate-950/55 px-4 py-4"
                  >
                    <div>
                      <div className="text-base font-semibold text-white">
                        {habit.name}
                      </div>
                    </div>
                    <div
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${habitStyles[habit.status]}`}
                    >
                      {habit.status}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[32px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl shadow-black/20 backdrop-blur">
              <div className="text-[11px] uppercase tracking-[0.22em] text-sky-300">
                Next Best Step
              </div>
              <h2 className="mt-2 text-2xl font-bold tracking-tight">
                Recommended today
              </h2>

              <div className="mt-5 rounded-[26px] border border-emerald-400/20 bg-emerald-500/10 p-5">
                <div className="text-lg font-semibold text-white">
                  Mobility + Core Reset
                </div>
                <div className="mt-2 text-sm text-slate-100">
                  Your readiness and soreness suggest a lighter reset-focused
                  day instead of another heavy session.
                </div>
              </div>

              <div className="mt-5 flex flex-col gap-3">
                <button className="rounded-[24px] bg-emerald-500 px-5 py-4 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/20 hover:bg-emerald-400">
                  Start Recommended Recovery
                </button>
                <button className="rounded-[24px] border border-white/10 bg-white/5 px-5 py-4 text-sm font-medium text-slate-200 hover:bg-white/10">
                  View Training Calendar
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
