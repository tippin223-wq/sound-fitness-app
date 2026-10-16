import Link from "next/link";
import { ROUTES } from "@/lib/routes";

export default function WorkoutHistoryReviewNotice({ area, issues }: { area: string; issues: string[] }) {
  return <main className="mx-auto max-w-3xl space-y-4 p-6 text-slate-100">
    <h1 className="text-2xl font-bold">Review saved workout history</h1>
    <p role="status" className="text-amber-200">{area} is paused because saved workout records need review. Your original workouts and plans are preserved.</p>
    <ul className="list-disc space-y-2 pl-5 text-slate-300">{issues.map(issue => <li key={issue}>{issue}</li>)}</ul>
    <p className="text-slate-300">Open History to inspect and export the complete original records before making changes.</p>
    <Link className="inline-block rounded-xl bg-cyan-300 px-4 py-3 font-semibold text-slate-950" href={ROUTES.dashboard.sessionHistory}>Review and export in History</Link>
  </main>;
}
