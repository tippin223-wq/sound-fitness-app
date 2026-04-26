export default function CRMDashboardPage() {
  const stats = [
    ["New Leads", "8", "This week"],
    ["Follow-Ups Due", "5", "Today"],
    ["Free Intros Booked", "3", "Next 7 days"],
    ["Renewals at Risk", "2", "Needs attention"],
  ];

  const pipeline = [
    ["New Lead", 8],
    ["Contacted", 6],
    ["Intro Booked", 3],
    ["Package Offered", 2],
    ["Closed", 1],
  ];

  const tasks = [
    "Text Marcus about free intro availability",
    "Follow up with Jenna after assessment",
    "Send 12-session package link to Ravi",
    "Check in with Claude before renewal",
  ];

  const clients = [
    { name: "Marcus T.", status: "New Lead", value: "$1,260 potential" },
    { name: "Jenna R.", status: "Intro Booked", value: "$440 potential" },
    { name: "Claude", status: "Renewal Soon", value: "$1,380 previous" },
  ];

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.16),_transparent_30%),linear-gradient(180deg,#020617_0%,#0f172a_100%)] px-5 py-8 text-white">
      <section className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-[36px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl">
          <p className="text-[11px] uppercase tracking-[0.28em] text-sky-300">
            Sound Fitness CRM
          </p>

          <h1 className="mt-3 text-4xl font-bold">Business command center.</h1>

          <p className="mt-3 max-w-2xl text-slate-300">
            Track leads, follow-ups, intro bookings, renewals, and sales
            opportunities in one simple coach dashboard.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map(([label, value, detail]) => (
            <div
              key={label}
              className="rounded-[28px] border border-white/10 bg-white/[0.05] p-5 shadow-xl"
            >
              <p className="text-sm text-slate-400">{label}</p>
              <p className="mt-2 text-3xl font-bold text-sky-300">{value}</p>
              <p className="mt-2 text-sm text-slate-500">{detail}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="rounded-[32px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl">
            <p className="text-[11px] uppercase tracking-[0.24em] text-emerald-300">
              Sales Pipeline
            </p>

            <h2 className="mt-3 text-2xl font-bold">
              Where prospects are right now
            </h2>

            <div className="mt-6 space-y-4">
              {pipeline.map(([stage, count]) => (
                <div key={stage}>
                  <div className="mb-2 flex justify-between text-sm">
                    <span className="font-semibold text-slate-200">
                      {stage}
                    </span>
                    <span className="text-sky-300">{count}</span>
                  </div>

                  <div className="h-3 overflow-hidden rounded-full bg-slate-950/80">
                    <div
                      className="h-full rounded-full bg-sky-400"
                      style={{ width: `${Number(count) * 10}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[32px] border border-sky-400/20 bg-sky-500/10 p-6 shadow-2xl">
            <p className="text-[11px] uppercase tracking-[0.24em] text-sky-300">
              Today’s Follow-Ups
            </p>

            <h2 className="mt-3 text-2xl font-bold">
              Money is in the next action.
            </h2>

            <div className="mt-5 space-y-3">
              {tasks.map((task) => (
                <div
                  key={task}
                  className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-sm text-slate-200"
                >
                  ✅ {task}
                </div>
              ))}
            </div>

            <button className="mt-5 w-full rounded-2xl bg-sky-500 px-5 py-4 font-bold text-slate-950 hover:bg-sky-400">
              Add Follow-Up Task
            </button>
          </section>
        </div>

        <section className="rounded-[32px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl">
          <p className="text-[11px] uppercase tracking-[0.24em] text-amber-300">
            Hot Opportunities
          </p>

          <h2 className="mt-3 text-2xl font-bold">
            Leads and clients to prioritize
          </h2>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {clients.map((client) => (
              <div
                key={client.name}
                className="rounded-[26px] border border-white/10 bg-slate-950/60 p-5"
              >
                <h3 className="text-xl font-bold">{client.name}</h3>
                <p className="mt-2 text-sm text-sky-300">{client.status}</p>
                <p className="mt-3 text-sm text-slate-400">{client.value}</p>

                <button className="mt-5 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-200 hover:bg-white/10">
                  Open Profile
                </button>
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
