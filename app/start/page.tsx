import Link from "next/link";

const pillars = [
  {
    title: "Workouts",
    text: "Build sessions, weekly plans, and long-term phases around your goals.",
  },
  {
    title: "Nutrition",
    text: "Connect protein, hydration, meals, grocery planning, and body-composition support.",
  },
  {
    title: "Recovery",
    text: "Use readiness, soreness, mobility, and pain-aware signals before adding more load.",
  },
  {
    title: "Performance",
    text: "Track strength, conditioning, athletic qualities, progress, and next-best actions.",
  },
];

export default function StartPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#020713] text-white">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_18%_0%,rgba(14,165,233,0.24),transparent_32%),radial-gradient(circle_at_82%_10%,rgba(251,191,36,0.15),transparent_30%),linear-gradient(180deg,#020713_0%,#07111f_52%,#020713_100%)]" />

      <header className="relative z-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <Link href="/" className="flex items-center gap-3">
            <img
              src="/sound-fitness-logo.png"
              alt="Sound Fitness"
              className="h-12 w-12 object-contain"
            />
            <div>
              <div className="text-2xl font-black uppercase tracking-[0.1em]">
                Sound Fitness
              </div>
              <div className="text-[10px] font-black uppercase tracking-[0.28em] text-cyan-300">
                Command Center
              </div>
            </div>
          </Link>
          <Link
            href="/login"
            className="rounded-2xl border border-white/10 bg-white/[0.045] px-5 py-3 text-center text-xs font-black uppercase tracking-[0.16em] text-white transition hover:border-cyan-300/40 hover:bg-cyan-300/10"
          >
            Log In
          </Link>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-8 px-5 pb-12 pt-6 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:pt-12">
        <div>
          <div className="inline-flex rounded-full border border-cyan-300/25 bg-cyan-300/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-cyan-100">
            New Visitor Entry
          </div>
          <h1 className="mt-7 max-w-4xl text-5xl font-black uppercase leading-[0.9] tracking-tight sm:text-7xl">
            Train with a system,
            <span className="block text-cyan-300">not guesswork.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
            Sound Fitness connects workouts, nutrition, recovery, performance,
            and progress tracking into one premium coaching dashboard.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/onboarding"
              className="rounded-2xl bg-cyan-300 px-6 py-4 text-center text-sm font-black uppercase tracking-[0.16em] text-slate-950 shadow-[0_0_35px_rgba(34,211,238,0.25)] transition hover:-translate-y-0.5 hover:bg-cyan-200"
            >
              Start Free Assessment
            </Link>
            <Link
              href="/login"
              className="rounded-2xl border border-white/10 bg-white/[0.045] px-6 py-4 text-center text-sm font-black uppercase tracking-[0.16em] text-white transition hover:border-amber-300/35 hover:bg-amber-300/10"
            >
              Log In
            </Link>
          </div>
        </div>

        <div className="rounded-[36px] border border-white/10 bg-slate-950/72 p-5 shadow-[0_0_80px_rgba(0,0,0,0.4)] backdrop-blur">
          <div className="grid gap-4 sm:grid-cols-2">
            {pillars.map((pillar) => (
              <div
                key={pillar.title}
                className="rounded-[28px] border border-white/10 bg-white/[0.045] p-5"
              >
                <div className="h-2 w-16 rounded-full bg-gradient-to-r from-cyan-300 to-amber-300" />
                <h2 className="mt-5 text-xl font-black text-white">
                  {pillar.title}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  {pillar.text}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-[28px] border border-amber-300/20 bg-amber-300/10 p-5">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-amber-200">
              First step
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-200">
              The assessment stores locally today and can be connected to
              account setup once Supabase onboarding persistence is finalized.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
