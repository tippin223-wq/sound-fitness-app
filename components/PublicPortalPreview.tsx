import Link from "next/link";

type PublicPortalPreviewProps = {
  eyebrow: string;
  title: string;
  subtitle: string;
  dashboardHref: string;
  modules: string[];
};

export default function PublicPortalPreview({
  eyebrow,
  title,
  subtitle,
  dashboardHref,
  modules,
}: PublicPortalPreviewProps) {
  return (
    <main className="min-h-screen bg-[#020713] px-5 py-8 text-white sm:px-8">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_18%_0%,rgba(14,165,233,0.18),transparent_32%),radial-gradient(circle_at_82%_10%,rgba(251,191,36,0.12),transparent_28%),linear-gradient(180deg,#020713_0%,#07111f_52%,#020713_100%)]" />

      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" className="flex items-center gap-3">
            <img
              src="/sound-fitness-logo.png"
              alt="Sound Fitness"
              className="h-11 w-11 object-contain"
            />
            <span className="font-black uppercase tracking-[0.14em]">
              Sound Fitness
            </span>
          </Link>
          <Link
            href="/start"
            className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-center text-xs font-black uppercase tracking-[0.14em] text-white"
          >
            Start
          </Link>
        </header>

        <section className="mt-10 overflow-hidden rounded-[36px] border border-white/10 bg-slate-950/72 p-6 shadow-[0_0_80px_rgba(0,0,0,0.42)] backdrop-blur lg:p-8">
          <p className="text-[11px] font-black uppercase tracking-[0.26em] text-cyan-300">
            {eyebrow}
          </p>
          <h1 className="mt-4 max-w-3xl text-5xl font-black uppercase leading-[0.9] tracking-tight sm:text-6xl">
            {title}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300">
            {subtitle}
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link
              href={dashboardHref}
              className="rounded-2xl bg-cyan-300 px-6 py-4 text-center text-sm font-black uppercase tracking-[0.14em] text-slate-950"
            >
              Open Dashboard Area
            </Link>
            <Link
              href="/onboarding"
              className="rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-4 text-center text-sm font-black uppercase tracking-[0.14em] text-white"
            >
              Start Free Assessment
            </Link>
          </div>
        </section>

        <section className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {modules.map((module) => (
            <div
              key={module}
              className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5"
            >
              <div className="h-2 w-12 rounded-full bg-gradient-to-r from-cyan-300 to-amber-300" />
              <h2 className="mt-5 text-lg font-black text-white">{module}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Placeholder module shell. Deeper tools can connect here without
                disrupting existing dashboard routes.
              </p>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
