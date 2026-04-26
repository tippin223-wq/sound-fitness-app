export default function LeadProfilePage() {
  const lead = {
    name: "Marcus T.",
    status: "Intro Booked",
    source: "Website Free Intro Form",
    value: "$1,260 potential",
    phone: "(555) 555-0199",
    email: "marcus@example.com",
    goal: "Build strength, lose 20 lbs, improve energy",
    nextAction: "Confirm free intro time",
  };

  const timeline = [
    "Submitted website form",
    "Replied to first text",
    "Booked free intro",
    "Needs package recommendation after intro",
  ];

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.16),_transparent_30%),linear-gradient(180deg,#020617_0%,#0f172a_100%)] px-5 py-8 text-white">
      <section className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-[36px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl">
          <p className="text-[11px] uppercase tracking-[0.28em] text-sky-300">
            Lead Profile
          </p>

          <h1 className="mt-3 text-4xl font-bold">{lead.name}</h1>

          <p className="mt-3 text-slate-300">{lead.goal}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-4">
          {[
            ["Status", lead.status],
            ["Source", lead.source],
            ["Potential Value", lead.value],
            ["Next Action", lead.nextAction],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-[26px] border border-white/10 bg-white/[0.05] p-5"
            >
              <p className="text-sm text-slate-400">{label}</p>
              <p className="mt-2 text-lg font-bold text-sky-300">{value}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-[32px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl">
            <p className="text-[11px] uppercase tracking-[0.24em] text-emerald-300">
              Contact Info
            </p>

            <div className="mt-5 space-y-3">
              {[
                ["Phone", lead.phone],
                ["Email", lead.email],
                ["Goal", lead.goal],
                ["Preferred Offer", "12 Session Package"],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-2xl border border-white/10 bg-slate-950/60 p-4"
                >
                  <p className="text-xs text-slate-500">{label}</p>
                  <p className="mt-1 font-semibold text-white">{value}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button className="rounded-2xl bg-sky-500 px-5 py-4 font-bold text-slate-950 hover:bg-sky-400">
                Text Lead
              </button>
              <button className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 font-semibold text-slate-200 hover:bg-white/10">
                Send Package
              </button>
            </div>
          </section>

          <section className="rounded-[32px] border border-sky-400/20 bg-sky-500/10 p-6 shadow-2xl">
            <p className="text-[11px] uppercase tracking-[0.24em] text-sky-300">
              Lead Timeline
            </p>

            <h2 className="mt-3 text-2xl font-bold">Sales history</h2>

            <div className="mt-5 space-y-3">
              {timeline.map((item, index) => (
                <div
                  key={item}
                  className="rounded-2xl border border-white/10 bg-slate-950/60 p-4"
                >
                  <p className="text-sm text-slate-400">Step {index + 1}</p>
                  <p className="mt-1 font-semibold text-white">{item}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
