import Link from "next/link";

type FuelJourneyStatus = "completed" | "active" | "next" | "locked";

type FuelJourneyStep = {
  cta: string;
  detail: string;
  href: string;
  id: string;
  label: string;
  purpose: string;
  shortLabel: string;
  status: FuelJourneyStatus;
  step: number;
  subtitle: string;
};

const fuelJourneySteps: FuelJourneyStep[] = [
  {
    id: "profile",
    step: 1,
    label: "Profile",
    shortLabel: "Profile",
    subtitle: "Baseline",
    purpose: "Set personal details, preferences, constraints, and baseline info.",
    detail:
      "Your nutrition system starts with body metrics, schedule, limits, and preferences.",
    cta: "Open Profile",
    href: "/dashboard/profile",
    status: "completed",
  },
  {
    id: "goals",
    step: 2,
    label: "Goals",
    shortLabel: "Goals",
    subtitle: "Direction",
    purpose: "Choose your nutrition goal and connect it to training outcomes.",
    detail:
      "Goal direction shapes calories, protein, meal prep, hydration, and recovery support.",
    cta: "Set Goals",
    href: "/nutrition/goals",
    status: "completed",
  },
  {
    id: "fuel-dashboard",
    step: 3,
    label: "Fuel Dashboard",
    shortLabel: "Fuel",
    subtitle: "Daily view",
    purpose: "See today's nutrition status, streaks, recommendations, and summary.",
    detail:
      "The dashboard is the daily command center for fuel status and next actions.",
    cta: "Open Fuel Dashboard",
    href: "/nutrition",
    status: "completed",
  },
  {
    id: "shopping",
    step: 4,
    label: "Shopping / My Fridge",
    shortLabel: "Shopping",
    subtitle: "Groceries",
    purpose: "Build your grocery system and track foods you already have.",
    detail:
      "Turn goals into ingredients. Start with staples you can buy and repeat.",
    cta: "Open Grocery",
    href: "/nutrition/grocery",
    status: "active",
  },
  {
    id: "kitchen",
    step: 5,
    label: "The Kitchen",
    shortLabel: "Kitchen",
    subtitle: "Library",
    purpose: "Browse foods, recipes, templates, and nutrition building blocks.",
    detail:
      "Use the library as your kitchen: recipes, foods, supplements, and reusable building blocks.",
    cta: "Open Kitchen",
    href: "/nutrition/library",
    status: "next",
  },
  {
    id: "menu",
    step: 6,
    label: "My Menu",
    shortLabel: "Menu",
    subtitle: "Meals",
    purpose: "Choose repeatable meals and meal templates that fit your schedule.",
    detail:
      "Menus make nutrition repeatable before you build the week.",
    cta: "Build My Menu",
    href: "/nutrition/meals/templates",
    status: "locked",
  },
  {
    id: "plan",
    step: 7,
    label: "My Plan",
    shortLabel: "Plan",
    subtitle: "Week",
    purpose: "Turn your menu into a weekly nutrition plan.",
    detail:
      "Your weekly meal plan turns groceries, recipes, and menus into a practical routine.",
    cta: "Open Meal Plan",
    href: "/nutrition/meal-plan",
    status: "locked",
  },
  {
    id: "progress",
    step: 8,
    label: "Progress",
    shortLabel: "Progress",
    subtitle: "Review",
    purpose: "Track consistency, body trends, and nutrition momentum.",
    detail:
      "Progress closes the loop so your next nutrition plan adapts to what happened.",
    cta: "Open Progress",
    href: "/nutrition/progress",
    status: "locked",
  },
];

const relatedActions = [
  { label: "Log Meal", href: "/nutrition/meals" },
  { label: "Add Water", href: "/nutrition/hydration" },
  { label: "Build Meal", href: "/nutrition/meals/builder" },
  { label: "Grocery List", href: "/nutrition/shopping-list" },
  { label: "Recipes", href: "/nutrition/recipes" },
  { label: "Progress", href: "/nutrition/progress" },
];

const statusStyles: Record<
  FuelJourneyStatus,
  {
    card: string;
    connector: string;
    marker: string;
    statusChip: string;
  }
> = {
  completed: {
    card: "border-emerald-300/30 bg-emerald-300/9 text-emerald-50 shadow-[0_0_24px_rgba(16,185,129,0.12)]",
    connector: "bg-emerald-300/60 shadow-[0_0_14px_rgba(16,185,129,0.35)]",
    marker: "border-emerald-300/40 bg-emerald-300 text-slate-950",
    statusChip: "border-emerald-300/25 bg-emerald-300/10 text-emerald-100",
  },
  active: {
    card: "border-cyan-300/45 bg-cyan-300/12 text-cyan-50 shadow-[0_0_34px_rgba(34,211,238,0.22)]",
    connector: "bg-cyan-300/65 shadow-[0_0_16px_rgba(34,211,238,0.36)]",
    marker: "border-cyan-200 bg-cyan-300 text-slate-950 shadow-[0_0_28px_rgba(34,211,238,0.35)]",
    statusChip: "border-cyan-300/35 bg-cyan-300/12 text-cyan-100",
  },
  next: {
    card: "border-amber-300/24 bg-amber-300/8 text-amber-50 shadow-[0_0_22px_rgba(251,191,36,0.1)]",
    connector: "bg-white/10",
    marker: "border-amber-300/40 bg-amber-300/18 text-amber-100",
    statusChip: "border-amber-300/25 bg-amber-300/10 text-amber-100",
  },
  locked: {
    card: "border-white/10 bg-white/[0.035] text-slate-400 opacity-75",
    connector: "bg-white/10",
    marker: "border-white/10 bg-slate-950 text-slate-500",
    statusChip: "border-white/10 bg-white/[0.04] text-slate-500",
  },
};

const activeStep =
  fuelJourneySteps.find((step) => step.status === "active") ||
  fuelJourneySteps[0];
const completedCount = fuelJourneySteps.filter(
  (step) => step.status === "completed",
).length;
const completionPercent = Math.round(
  (completedCount / fuelJourneySteps.length) * 100,
);

function FuelJourneyNode({
  index,
  isLast,
  step,
}: {
  index: number;
  isLast: boolean;
  step: FuelJourneyStep;
}) {
  const styles = statusStyles[step.status];

  return (
    <div className="flex min-w-[172px] flex-1 items-center gap-3">
      <Link
        href={step.href}
        className={`group relative flex min-h-[112px] w-full cursor-pointer flex-col overflow-hidden rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:border-cyan-300/30 hover:bg-white/[0.08] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/55 ${styles.card}`}
        title={`${step.label} - ${step.href}`}
      >
        <span
          className={`absolute left-4 right-4 top-0 h-[2px] rounded-full ${
            step.status === "active"
              ? "bg-cyan-200"
              : step.status === "completed"
                ? "bg-emerald-200"
                : "bg-white/10"
          }`}
        />
        <div className="flex items-start justify-between gap-3">
          <span
            className={`flex h-8 w-8 items-center justify-center rounded-xl border text-xs font-black ${styles.marker}`}
          >
            {step.status === "completed" ? "OK" : step.step}
          </span>
          <span
            className={`rounded-full border px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] ${styles.statusChip}`}
          >
            {step.status}
          </span>
        </div>
        <p className="mt-3 text-sm font-black uppercase tracking-[0.14em] text-white">
          {step.shortLabel}
        </p>
        <p className="mt-1 text-xs text-slate-400">{step.subtitle}</p>
      </Link>

      {!isLast ? (
        <div
          className={`hidden h-[2px] w-8 shrink-0 rounded-full 2xl:block ${
            index < completedCount ? styles.connector : "bg-white/10"
          }`}
        />
      ) : null}
    </div>
  );
}

function FuelJourneyStrip() {
  return (
    <section className="overflow-hidden rounded-[28px] border border-white/10 bg-slate-950/58 p-4 shadow-[0_0_44px_rgba(34,211,238,0.08)] backdrop-blur-xl">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-200">
            Fuel Journey
          </p>
          <p className="mt-2 max-w-4xl text-xs leading-5 text-slate-400 sm:text-sm">
            Profile - Goals - Fuel Dashboard - Shopping - Kitchen - Menu - Plan
            - Progress
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/nutrition"
            className="rounded-full border border-white/10 bg-white/[0.045] px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-slate-300 transition hover:border-cyan-200/35 hover:bg-cyan-300/10 hover:text-white"
          >
            Back to Fuel Dashboard
          </Link>
          <Link
            href="/dashboard"
            className="rounded-full border border-white/10 bg-white/[0.045] px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-slate-300 transition hover:border-cyan-200/35 hover:bg-cyan-300/10 hover:text-white"
          >
            Back to Dashboard
          </Link>
          <Link
            href={activeStep.href}
            className="rounded-full border border-amber-300/20 bg-amber-400/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-amber-100 transition hover:border-amber-200/40 hover:bg-amber-300/15"
          >
            Nutrition
          </Link>
        </div>
      </div>

      <div className="mt-4 flex gap-3 overflow-x-auto scroll-smooth overscroll-x-contain px-1 pb-2 [scrollbar-color:rgba(34,211,238,0.35)_transparent] [scrollbar-width:thin]">
        {fuelJourneySteps.map((step, index) => (
          <FuelJourneyNode
            index={index}
            isLast={index === fuelJourneySteps.length - 1}
            key={step.id}
            step={step}
          />
        ))}
      </div>
    </section>
  );
}

export default function NutritionJourneyPage() {
  return (
    <div className="space-y-5">
      <FuelJourneyStrip />

      <section className="grid gap-5 xl:grid-cols-[1.08fr_0.92fr]">
        <div className="rounded-[28px] border border-cyan-300/24 bg-cyan-300/10 p-5 shadow-[0_0_45px_rgba(34,211,238,0.1)] backdrop-blur-xl">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-200">
            Current Step
          </p>
          <h1 className="mt-3 text-3xl font-black text-white">
            {activeStep.label}
          </h1>
          <p className="mt-2 text-sm font-bold leading-6 text-slate-200">
            {activeStep.purpose}
          </p>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
            {activeStep.detail}
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Link
              href={activeStep.href}
              className="rounded-2xl bg-cyan-300 px-5 py-3 text-center text-xs font-black uppercase tracking-[0.14em] text-slate-950 transition hover:bg-cyan-200"
            >
              {activeStep.cta}
            </Link>
            <Link
              href="/nutrition/shopping-list"
              className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-center text-xs font-black uppercase tracking-[0.14em] text-white transition hover:border-cyan-300/35"
            >
              Open Shopping List
            </Link>
          </div>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-slate-950/58 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.34)] backdrop-blur-xl">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">
            Progress Overview
          </p>
          <h2 className="mt-3 text-3xl font-black text-white">
            {completionPercent}% complete
          </h2>
          <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-950/80">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-300 via-cyan-300 to-amber-300 shadow-[0_0_24px_rgba(34,211,238,0.22)]"
              style={{ width: `${completionPercent}%` }}
            />
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {[
              ["Completed", `${completedCount} / ${fuelJourneySteps.length}`],
              ["Current", activeStep.label],
              ["Streak", "5 days"],
              ["Consistency", "Building"],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-2xl border border-white/10 bg-slate-950/55 p-4"
              >
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                  {label}
                </p>
                <p className="mt-2 text-sm font-black text-white">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-white/10 bg-slate-950/58 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.34)] backdrop-blur-xl">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-100">
              Related Actions
            </p>
            <h2 className="mt-2 text-2xl font-black text-white">
              Keep the fuel chain moving.
            </h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-slate-400">
            Quick links for logging, hydration, meal building, groceries,
            recipes, and progress.
          </p>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {relatedActions.map((action) => (
            <Link
              href={action.href}
              key={action.label}
              className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm font-black text-white transition hover:-translate-y-0.5 hover:border-cyan-300/35 hover:bg-cyan-300/10"
            >
              {action.label}
              <span className="mt-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                Open
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
