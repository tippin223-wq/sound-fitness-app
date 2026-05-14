import Link from "next/link";
import {
  ActionGrid,
  DataTypeBadges,
  ImportCard,
  ImportHero,
  StatsBreadcrumbs,
  StatsShell,
} from "./_components/StatsImportComponents";

export default function StatsHubPage() {
  return (
    <StatsShell>
      <StatsBreadcrumbs items={["Stats"]} />
      <ImportHero
        title="Stats Hub"
        subtitle="Review progress or bring new workout, nutrition, body, recovery, and performance data into the app."
      />

      <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <ImportCard className="border-cyan-300/18 bg-cyan-300/8">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-200">
            Add Stats
          </p>
          <h2 className="mt-3 text-2xl font-black text-white">
            Upload, connect, or manually enter data.
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            The import center is the safe staging area before any data lands in
            progress tracking.
          </p>
          <div className="mt-5">
            <ActionGrid />
          </div>
        </ImportCard>

        <ImportCard>
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-100">
            Progress Pages
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {[
              { label: "Dashboard Stats", href: "/dashboard/stats" },
              { label: "Import Center", href: "/stats/add" },
              { label: "AI Review Queue", href: "/stats/import-review" },
              { label: "Sessions", href: "/dashboard/sessions" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm font-black text-white transition hover:border-cyan-300/35 hover:bg-cyan-300/10"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </ImportCard>
      </section>

      <DataTypeBadges />
    </StatsShell>
  );
}
