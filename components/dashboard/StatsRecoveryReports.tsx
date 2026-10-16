import Link from "next/link";
import { ROUTES } from "@/lib/routes";
import type { StatsRecoveryReport } from "@/lib/planning/statsSource";

export default function StatsRecoveryReports({ reports }: { reports: StatsRecoveryReport }) {
  const fields = [
    { label: "Pain", value: reports.pain, unit: "/10" },
    { label: "Soreness", value: reports.soreness, unit: "/10" },
    { label: "Sleep", value: reports.sleep, unit: " hours" },
  ];
  return <section className="space-y-5 rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
    <div><h2 className="text-xl font-black text-white">Saved recovery reports</h2><p className="mt-2 text-sm text-slate-300">Saved Profile values. Review and update these reports when your condition changes.</p></div>
    <p role="status" className="text-sm text-slate-300">{reports.reportedCount}/3 Profile reports available.</p>
    <div className="grid gap-4 sm:grid-cols-3">{fields.map(field => <article key={field.label} className="rounded-2xl border border-white/10 p-4"><h3 className="text-sm text-slate-400">{field.label}</h3><p className="mt-2 text-xl font-bold text-white">{field.value === null ? "Not reported" : `${field.value}${field.unit}`}</p></article>)}</div>
    <div className="flex flex-wrap gap-4 text-sm text-cyan-200"><Link href={ROUTES.dashboard.profile} className="underline">Update Profile reports</Link><Link href={ROUTES.dashboard.progressCheckIn} className="underline">Weekly Check-In</Link><Link href={ROUTES.dashboard.painTracking} className="underline">Pain reports</Link></div>
  </section>;
}
