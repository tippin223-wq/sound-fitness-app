export default function ClientProfilePage() {
  const client = {
    name: "Alex Morgan",
    goal: "Build strength, reduce knee pain, improve consistency",
    plan: "In-Home 2x/week + Online Support",
    sessionsRemaining: 7,
    streak: "4 weeks",
  };

  const bodyZones = [
    { zone: "Chest", intensity: "Moderate", color: "bg-sky-400" },
    { zone: "Core", intensity: "High", color: "bg-emerald-400" },
    { zone: "Left Arm", intensity: "Low", color: "bg-amber-300" },
    { zone: "Right Arm", intensity: "Low", color: "bg-amber-300" },
    { zone: "Left Leg", intensity: "High", color: "bg-emerald-400" },
    { zone: "Right Leg", intensity: "High", color: "bg-emerald-400" },
    { zone: "Back", intensity: "Moderate", color: "bg-sky-400" },
    { zone: "Mobility", intensity: "Recovery", color: "bg-violet-400" },
  ];

  const notes = [
    "Knee pain improving during step-ups",
    "Core stability has been consistent",
    "Add more upper body pulling next week",
    "Keep lower body intensity controlled",
  ];

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.16),_transparent_30%),linear-gradient(180deg,#020617_0%,#0f172a_100%)] px-5 py-8 text-white">
      <section className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-[36px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl">
          <p className="text-[11px] uppercase tracking-[0.28em] text-sky-300">
            Client Profile
          </p>

          <h1 className="mt-3 text-4xl font-bold">{client.name}</h1>

          <p className="mt-3 max-w-3xl text-slate-300">{client.goal}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-4">
          {[
            ["Plan", client.plan],
            ["Sessions Left", client.sessionsRemaining],
            ["Streak", client.streak],
            ["Primary Focus", "Strength + Mobility"],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-[26px] border border-white/10 bg-white/[0.05] p-5 shadow-xl"
            >
              <p className="text-sm text-slate-400">{label}</p>
              <p className="mt-2 text-xl font-bold text-sky-300">{value}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-[36px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl">
            <p className="text-[11px] uppercase tracking-[0.24em] text-emerald-300">
              Training Heat Map
            </p>

            <h2 className="mt-3 text-2xl font-bold">Body area workload</h2>

            <p className="mt-2 text-sm text-slate-400">
              Color intensity shows how much each area has been trained
              recently.
            </p>

            <div className="mt-8 flex justify-center">
              <div className="relative h-[520px] w-[260px]">
                {/* Head */}
                <div className="absolute left-1/2 top-0 h-16 w-16 -translate-x-1/2 rounded-full border border-white/20 bg-slate-800" />

                {/* Chest */}
                <div className="absolute left-1/2 top-20 h-24 w-32 -translate-x-1/2 rounded-[40px] border border-white/20 bg-sky-400 shadow-lg shadow-sky-400/20" />

                {/* Core */}
                <div className="absolute left-1/2 top-42 h-28 w-24 -translate-x-1/2 rounded-[34px] border border-white/20 bg-emerald-400 shadow-lg shadow-emerald-400/20" />

                {/* Left Arm */}
                <div className="absolute left-4 top-24 h-44 w-12 rounded-full border border-white/20 bg-amber-300 shadow-lg shadow-amber-300/20" />

                {/* Right Arm */}
                <div className="absolute right-4 top-24 h-44 w-12 rounded-full border border-white/20 bg-amber-300 shadow-lg shadow-amber-300/20" />

                {/* Left Leg */}
                <div className="absolute left-[70px] top-[285px] h-56 w-14 rounded-full border border-white/20 bg-emerald-400 shadow-lg shadow-emerald-400/20" />

                {/* Right Leg */}
                <div className="absolute right-[70px] top-[285px] h-56 w-14 rounded-full border border-white/20 bg-emerald-400 shadow-lg shadow-emerald-400/20" />

                {/* Labels */}
                <div className="absolute left-1/2 top-[110px] -translate-x-1/2 text-xs font-bold text-slate-950">
                  Chest
                </div>
                <div className="absolute left-1/2 top-[205px] -translate-x-1/2 text-xs font-bold text-slate-950">
                  Core
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-4">
              <div className="rounded-2xl bg-amber-300/10 p-3 text-sm text-amber-300">
                Low
              </div>
              <div className="rounded-2xl bg-sky-400/10 p-3 text-sm text-sky-300">
                Moderate
              </div>
              <div className="rounded-2xl bg-emerald-400/10 p-3 text-sm text-emerald-300">
                High
              </div>
              <div className="rounded-2xl bg-violet-400/10 p-3 text-sm text-violet-300">
                Recovery
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <div className="rounded-[36px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl">
              <p className="text-[11px] uppercase tracking-[0.24em] text-cyan-300">
                Zone Breakdown
              </p>

              <h2 className="mt-3 text-2xl font-bold">
                Recent training emphasis
              </h2>

              <div className="mt-5 space-y-3">
                {bodyZones.map((zone) => (
                  <div
                    key={zone.zone}
                    className="flex items-center justify-between rounded-[24px] border border-white/10 bg-slate-950/60 p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`h-4 w-4 rounded-full ${zone.color}`} />
                      <p className="font-semibold">{zone.zone}</p>
                    </div>

                    <p className="text-sm text-slate-300">{zone.intensity}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[36px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl">
              <p className="text-[11px] uppercase tracking-[0.24em] text-amber-300">
                Coach Notes
              </p>

              <div className="mt-5 space-y-3">
                {notes.map((note) => (
                  <div
                    key={note}
                    className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-sm text-slate-200"
                  >
                    ✅ {note}
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
