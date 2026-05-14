import Link from "next/link";
import type { ReactNode } from "react";

export const dataTypeGroups = [
  {
    title: "Workout",
    items: ["exercises", "sets", "reps", "weight", "volume", "RPE", "duration", "session notes"],
  },
  {
    title: "Nutrition",
    items: ["calories", "protein", "carbs", "fats", "water", "meal photos", "food logs"],
  },
  {
    title: "Body",
    items: ["body weight", "measurements", "progress photos", "body composition", "pain/soreness"],
  },
  {
    title: "Recovery",
    items: ["sleep", "soreness", "mobility", "readiness", "HRV", "resting heart rate"],
  },
  {
    title: "Performance",
    items: ["steps", "runs", "bike rides", "cardio sessions", "heart rate zones", "distance", "pace"],
  },
];

export const quickAddCards = [
  {
    title: "Workout Log",
    href: "/stats/add/manual",
    helper: "Exercises, sets, reps, load, RPE, duration, and notes.",
  },
  {
    title: "Nutrition Log",
    href: "/stats/add/manual",
    helper: "Calories, macros, water, meal photos, and food logs.",
  },
  {
    title: "Body Metrics",
    href: "/stats/add/manual",
    helper: "Body weight, measurements, progress photos, and soreness.",
  },
  {
    title: "Recovery Check-In",
    href: "/stats/add/manual",
    helper: "Sleep, readiness, soreness, mobility, HRV, and resting HR.",
  },
  {
    title: "Performance Session",
    href: "/stats/add/manual",
    helper: "Steps, runs, rides, cardio, heart-rate zones, distance, and pace.",
  },
];

export const importActions = [
  { label: "Manual Entry", href: "/stats/add/manual", helper: "Type stats into safe forms." },
  { label: "Upload Photo", href: "/stats/add/upload", helper: "Meal, progress, or workout photo." },
  { label: "Upload Screenshot", href: "/stats/add/upload", helper: "Workout app or nutrition screenshot." },
  { label: "Upload Excel / CSV", href: "/stats/add/upload", helper: "Spreadsheet or export file." },
  { label: "Connect Wearable", href: "/stats/add/connect", helper: "OAuth/API placeholders only." },
  { label: "AI Import Review", href: "/stats/import-review", helper: "Review estimates before saving." },
];

export const wearables = [
  { name: "Apple Health", imports: "steps, HRV, sleep, workouts" },
  { name: "Google Fit / Health Connect", imports: "steps, workouts, sleep, body metrics" },
  { name: "Garmin", imports: "runs, rides, readiness, heart rate" },
  { name: "Fitbit", imports: "sleep, HR, steps, workouts" },
  { name: "Samsung Health", imports: "steps, sleep, body metrics" },
  { name: "Strava", imports: "runs, rides, pace, distance" },
  { name: "Whoop", imports: "recovery, HRV, strain, sleep" },
  { name: "Oura", imports: "sleep, readiness, HRV, resting HR" },
];

export const recentImports = [
  {
    source: "Workout screenshot",
    type: "Workout",
    date: "Not imported yet",
    status: "Review required",
  },
  {
    source: "Meal photo",
    type: "Nutrition",
    date: "Placeholder",
    status: "Estimate only",
  },
  {
    source: "Wearable export",
    type: "Recovery",
    date: "Coming soon",
    status: "Not connected",
  },
];

export function StatsShell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-[#020713] px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_18%_0%,rgba(14,165,233,0.2),transparent_32%),radial-gradient(circle_at_82%_8%,rgba(251,191,36,0.13),transparent_28%),linear-gradient(180deg,#020713_0%,#07111f_52%,#020713_100%)]" />
      <div className="mx-auto max-w-7xl space-y-5">{children}</div>
    </main>
  );
}

export function StatsBreadcrumbs({ items }: { items: string[] }) {
  return (
    <nav className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
      <Link href="/stats" className="text-cyan-200 hover:text-white">
        Stats
      </Link>
      {items.slice(1).map((item) => (
        <span className="inline-flex items-center gap-2" key={item}>
          <span className="text-slate-700">/</span>
          <span>{item}</span>
        </span>
      ))}
    </nav>
  );
}

export function ImportHero({
  title = "Add Stats / Import Data",
  subtitle = "Bring in workout, nutrition, recovery, performance, and body data from anywhere.",
}: {
  title?: string;
  subtitle?: string;
}) {
  return (
    <section className="overflow-hidden rounded-[36px] border border-white/10 bg-[radial-gradient(circle_at_18%_0%,rgba(34,211,238,0.22),transparent_36%),radial-gradient(circle_at_88%_8%,rgba(251,191,36,0.15),transparent_32%),linear-gradient(135deg,rgba(15,23,42,0.96),rgba(2,6,23,0.98))] p-6 shadow-[0_35px_130px_rgba(0,0,0,0.62)] lg:p-8">
      <div className="grid gap-6 xl:grid-cols-[1fr_0.42fr] xl:items-end">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.32em] text-cyan-200">
            Import Center
          </p>
          <h1 className="mt-4 text-5xl font-black tracking-tight text-white sm:text-6xl">
            {title}
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300">
            {subtitle}
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
          <Link
            href="/dashboard"
            className="rounded-3xl border border-white/10 bg-white/[0.045] px-5 py-4 text-center text-xs font-black uppercase tracking-[0.14em] text-white transition hover:border-cyan-300/35 hover:bg-cyan-300/10"
          >
            Back to Dashboard
          </Link>
          <Link
            href="/dashboard/stats"
            className="rounded-3xl bg-cyan-300 px-5 py-4 text-center text-xs font-black uppercase tracking-[0.14em] text-slate-950 transition hover:-translate-y-0.5 hover:bg-cyan-200"
          >
            View Progress Stats
          </Link>
        </div>
      </div>
    </section>
  );
}

export function ImportCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-[30px] border border-white/10 bg-slate-950/62 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.36)] backdrop-blur-xl ${className}`}
    >
      {children}
    </section>
  );
}

export function ActionGrid() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {importActions.map((action) => (
        <Link
          href={action.href}
          key={action.label}
          className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-sm font-black text-cyan-100 transition hover:-translate-y-0.5 hover:border-cyan-200/50 hover:bg-cyan-300/15"
        >
          {action.label}
          <span className="mt-1 block text-xs font-semibold leading-5 text-cyan-100/65">
            {action.helper}
          </span>
        </Link>
      ))}
    </div>
  );
}

export function DataTypeBadges() {
  return (
    <div className="grid gap-3 md:grid-cols-5">
      {dataTypeGroups.map((group) => (
        <div
          key={group.title}
          className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"
        >
          <p className="text-sm font-black text-white">{group.title}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {group.items.slice(0, 5).map((item) => (
              <span
                key={item}
                className="rounded-full border border-white/10 bg-slate-950/55 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function UploadZone() {
  return (
    <div className="rounded-[28px] border border-dashed border-cyan-300/35 bg-cyan-300/8 p-6 text-center">
      <p className="text-xl font-black text-white">
        Drop files here or choose upload type
      </p>
      <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-400">
        Safe placeholder UI only. Backend upload storage, AI extraction, and
        file parsing are intentionally not wired yet.
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {[".jpg", ".png", ".webp", ".csv", ".xlsx", ".pdf"].map((type) => (
          <span
            key={type}
            className="rounded-full border border-white/10 bg-slate-950/60 px-3 py-1.5 text-xs font-black uppercase tracking-[0.12em] text-cyan-100"
          >
            {type}
          </span>
        ))}
      </div>
      <input
        type="file"
        multiple
        accept=".jpg,.jpeg,.png,.webp,.csv,.xlsx,.pdf"
        className="mt-6 w-full max-w-md rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-slate-300 file:mr-4 file:rounded-xl file:border-0 file:bg-cyan-300 file:px-4 file:py-2 file:text-xs file:font-black file:uppercase file:tracking-[0.12em] file:text-slate-950"
      />
    </div>
  );
}

export function PipelinePreview() {
  const steps = [
    "Upload received",
    "AI reads file/photo",
    "Extracts possible stats",
    "User reviews imported data",
    "User confirms save to app",
  ];

  return (
    <div className="grid gap-3 md:grid-cols-5">
      {steps.map((step, index) => (
        <div
          key={step}
          className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 text-sm font-black text-cyan-100">
            {index + 1}
          </span>
          <p className="mt-4 text-sm font-black text-white">{step}</p>
        </div>
      ))}
    </div>
  );
}

export function WearableGrid() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {wearables.map((wearable) => (
        <div
          key={wearable.name}
          className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-base font-black text-white">{wearable.name}</p>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                {wearable.imports}
              </p>
            </div>
            <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-amber-100">
              Coming Soon
            </span>
          </div>
          {/* TODO: Wire OAuth/API connection flow for this provider. */}
          <button
            type="button"
            disabled
            className="mt-4 w-full cursor-not-allowed rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-xs font-black uppercase tracking-[0.14em] text-slate-500"
          >
            Connect
          </button>
        </div>
      ))}
    </div>
  );
}
