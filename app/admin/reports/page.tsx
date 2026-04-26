export default function ReportsPage() {
  const stats = [
    ["Monthly Revenue", "$5,420", "+18%"],
    ["New Leads", "23", "+7"],
    ["Close Rate", "38%", "+5%"],
    ["Renewals Due", "4", "This week"],
  ];

  const revenue = [
    ["In-Home Training", "$3,600"],
    ["Online Coaching", "$1,195"],
    ["Assisted Stretch", "$625"],
  ];

  const leadSources = [
    ["Website", 9],
    ["Referrals", 6],
    ["Google", 5],
    ["Social", 3],
  ];

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.16),_transparent_30%),linear-gradient(180deg,#020617_0%,#0f172a_100%)] px-5 py-8 text-white">
      <section className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-[36px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl">
          <p className="text-[11px] uppercase tracking-[0.28em] text-sky-300">
            CRM Reports
          </p>

          <h1 className="mt-3 text-4xl font-bold">Know what’s making money.</h1>

          <p className="mt-3 max-w-2xl text-slate-300">
            Track leads, revenue, close rate, renewals, and where your best
            clients are coming from.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map(([label, value, change]) => (
            <div
              key={label}
              className="rounded-[26px] border border-white/10 bg-white/[0.05] p-5 shadow-xl"
            >
              <p className="text-sm text-slate-400">{label}</p>
              <p className="mt-2 text-3xl font-bold text-sky-300">{value}</p>
              <p className="mt-2 text-sm text-emerald-300">{change}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-[32px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl">
            <p className="text-[11px] uppercase tracking-[0.24em] text-emerald-300">
              Revenue Breakdown
            </p>

            <h2 className="mt-3 text-2xl font-bold">Income by offer</h2>

            <div className="mt-6 space-y-4">
              {revenue.map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-center justify-between rounded-[24px] border border-white/10 bg-slate-950/60 p-4"
                >
                  <p className="font-semibold">{label}</p>
                  <p className="text-xl font-bold text-sky-300">{value}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[32px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl">
            <p className="text-[11px] uppercase tracking-[0.24em] text-amber-300">
              Lead Sources
            </p>

            <h2 className="mt-3 text-2xl font-bold">Where clients came from</h2>

            <div className="mt-6 space-y-4">
              {leadSources.map(([source, count]) => (
                <div key={source}>
                  <div className="mb-2 flex justify-between text-sm">
                    <span className="font-semibold text-slate-200">
                      {source}
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
        </div>

        <section className="rounded-[32px] border border-sky-400/20 bg-sky-500/10 p-6 shadow-xl">
          <p className="text-[11px] uppercase tracking-[0.24em] text-sky-300">
            Coach Note
          </p>

          <h2 className="mt-3 text-2xl font-bold">
            What gets measured gets improved.
          </h2>

          <p className="mt-3 max-w-3xl text-slate-200">
            Use reports to see what is actually driving revenue: lead source,
            package size, close rate, renewals, and client retention.
          </p>
        </section>
      </section>
    </main>
  );
}
