import Link from "next/link";

type PlaceholderSection = {
  description: string;
  items: string[];
  title: string;
};

type UserMenuPlaceholderPageProps = {
  badge: string;
  description: string;
  sections: PlaceholderSection[];
  title: string;
};

export default function UserMenuPlaceholderPage({
  badge,
  description,
  sections,
  title,
}: UserMenuPlaceholderPageProps) {
  return (
    <main className="min-h-screen bg-[#020713] text-white">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_18%_0%,rgba(34,211,238,0.18),transparent_30%),radial-gradient(circle_at_84%_8%,rgba(251,191,36,0.12),transparent_28%),linear-gradient(180deg,#020713_0%,#07111f_52%,#020713_100%)]" />

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-8 lg:py-8">
        <section className="overflow-hidden rounded-[34px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_34px_120px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.26em] text-cyan-200">
                {badge}
              </p>
              <h1 className="mt-3 text-4xl font-black tracking-tight text-white sm:text-5xl">
                {title}
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-300 sm:text-base sm:leading-7">
                {description}
              </p>
            </div>

            <Link
              href="/dashboard"
              className="rounded-2xl border border-cyan-300/25 bg-cyan-300/10 px-5 py-3 text-center text-xs font-black uppercase tracking-[0.14em] text-cyan-100 transition hover:border-cyan-200/50 hover:bg-cyan-300 hover:text-slate-950"
            >
              Back to Dashboard
            </Link>
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sections.map((section) => (
            <article
              key={section.title}
              className="rounded-[28px] border border-white/10 bg-slate-950/58 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl"
            >
              <div className="h-[2px] w-20 rounded-full bg-cyan-300/70 shadow-[0_0_18px_rgba(34,211,238,0.28)]" />
              <h2 className="mt-4 text-xl font-black tracking-tight text-white">
                {section.title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                {section.description}
              </p>
              <div className="mt-5 space-y-2">
                {section.items.map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-slate-200"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
