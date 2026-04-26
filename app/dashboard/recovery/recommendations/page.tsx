export default function RecoveryRecommendationsPage() {
  const recommendations = [
    {
      title: "Mobility Reset",
      priority: "High",
      detail: "Spend 8–10 minutes on hips, ankles, and thoracic rotation.",
      action: "Open Mobility Library",
    },
    {
      title: "Hydration Push",
      priority: "Medium",
      detail: "Finish 24–32 oz of water before the end of the day.",
      action: "Log Hydration",
    },
    {
      title: "Easy Walk",
      priority: "Low",
      detail: "Take a relaxed 15–20 minute walk to improve circulation.",
      action: "Add Walk",
    },
  ];

  const priorityStyles = {
    High: "border-rose-400/20 bg-rose-500/10 text-rose-300",
    Medium: "border-amber-400/20 bg-amber-500/10 text-amber-300",
    Low: "border-emerald-400/20 bg-emerald-500/10 text-emerald-300",
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.16),_transparent_30%),linear-gradient(180deg,#020617_0%,#0f172a_100%)] px-5 py-8 text-white">
      <section className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-[36px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl backdrop-blur">
          <p className="text-[11px] uppercase tracking-[0.28em] text-sky-300">
            Recovery Recommendations
          </p>

          <h1 className="mt-3 text-4xl font-bold">
            Know what your body needs next.
          </h1>

          <p className="mt-3 max-w-2xl text-slate-300">
            Use soreness, pain level, sleep, hydration, and training load to
            guide the best recovery move for today.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {[
            ["Readiness", "76%"],
            ["Sleep", "6.8 hrs"],
            ["Soreness", "Moderate"],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-[26px] border border-white/10 bg-white/[0.05] p-5 shadow-xl"
            >
              <p className="text-sm text-slate-400">{label}</p>
              <p className="mt-2 text-3xl font-bold text-sky-300">{value}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-[32px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl">
            <p className="text-[11px] uppercase tracking-[0.24em] text-emerald-300">
              Today’s Best Moves
            </p>

            <h2 className="mt-3 text-2xl font-bold">
              Recommended recovery actions
            </h2>

            <div className="mt-5 space-y-4">
              {recommendations.map((item) => (
                <div
                  key={item.title}
                  className="rounded-[26px] border border-white/10 bg-slate-950/60 p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-xl font-bold">{item.title}</h3>
                      <p className="mt-2 text-sm text-slate-400">
                        {item.detail}
                      </p>
                    </div>

                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                        priorityStyles[
                          item.priority as keyof typeof priorityStyles
                        ]
                      }`}
                    >
                      {item.priority}
                    </span>
                  </div>

                  <button className="mt-5 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-200 hover:bg-white/10">
                    {item.action}
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[32px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl">
            <p className="text-[11px] uppercase tracking-[0.24em] text-amber-300">
              Recovery Score
            </p>

            <h2 className="mt-3 text-2xl font-bold">
              Today’s readiness snapshot
            </h2>

            <div className="mt-6 rounded-[30px] border border-sky-400/20 bg-sky-500/10 p-6 text-center">
              <p className="text-7xl font-bold text-sky-300">76</p>
              <p className="mt-2 text-sm text-slate-300">out of 100</p>
            </div>

            <div className="mt-5 space-y-3">
              {[
                ["Training Load", "Manageable"],
                ["Pain Level", "Low"],
                ["Mobility Need", "Moderate"],
                ["Nutrition Support", "Good"],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/60 p-4"
                >
                  <span className="text-sm text-slate-300">{label}</span>
                  <span className="font-semibold text-sky-300">{value}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className="rounded-[32px] border border-sky-400/20 bg-sky-500/10 p-6 shadow-xl">
          <p className="text-[11px] uppercase tracking-[0.24em] text-sky-300">
            Coach Note
          </p>

          <h2 className="mt-3 text-2xl font-bold">
            Recovery is part of the program.
          </h2>

          <p className="mt-3 max-w-3xl text-slate-200">
            The goal is not to avoid effort. The goal is to recover well enough
            to train consistently, keep pain low, and keep progress moving.
          </p>
        </section>
      </section>
    </main>
  );
}
