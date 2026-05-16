"use client";

import Link from "next/link";
import { useState } from "react";
import { ROUTES } from "@/lib/routes";

type JourneyCompletionKey =
  | "fuel"
  | "goals"
  | "performance"
  | "profile"
  | "recovery"
  | "training";

type JourneyStep = {
  href: string;
  label: string;
  status: string;
};

type JourneyRow = {
  accent: string;
  completion: number;
  description: string;
  id: string;
  steps: JourneyStep[];
  title: string;
};

type MasterTrainingJourneyProps = {
  completions?: Partial<Record<JourneyCompletionKey, number>>;
};

const clampPercent = (value: number | undefined) => {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value || 0)));
};

const averagePercent = (...values: Array<number | undefined>) =>
  clampPercent(
    values.reduce<number>((total, value) => total + clampPercent(value), 0) /
      Math.max(values.length, 1),
  );

export default function MasterTrainingJourney({
  completions = {},
}: MasterTrainingJourneyProps) {
  const [expanded, setExpanded] = useState(false);
  const [openJourney, setOpenJourney] = useState<string | null>(null);
  const profile = clampPercent(completions.profile);
  const goals = clampPercent(completions.goals);
  const training = clampPercent(completions.training);
  const fuel = clampPercent(completions.fuel);
  const performance = clampPercent(completions.performance);
  const recovery = clampPercent(completions.recovery);

  const journeyRows: JourneyRow[] = [
    {
      accent: "from-cyan-300 to-blue-400",
      completion: averagePercent(profile, goals, training),
      description: "Build sessions from profile, goals, libraries, and plans.",
      id: "training",
      title: "Training Journey",
      steps: [
        { href: ROUTES.dashboard.profile, label: "Profile", status: "Foundation" },
        { href: ROUTES.dashboard.goals, label: "Goals", status: "Direction" },
        { href: ROUTES.dashboard.sessions, label: "Sessions", status: "Start" },
        { href: ROUTES.dashboard.exerciseLibrary, label: "Exercise Library", status: "Tools" },
        { href: ROUTES.dashboard.goals, label: "Goal Planning", status: "Goals" },
        { href: ROUTES.dashboard.plan, label: "My Plan", status: "Organize" },
        { href: ROUTES.dashboard.phases, label: "Periodized Plan", status: "Phase" },
        { href: ROUTES.dashboard.calendar, label: "Calendar", status: "Schedule" },
        { href: ROUTES.dashboard.stats, label: "Progress", status: "Reflect" },
      ],
    },
    {
      accent: "from-emerald-300 to-teal-400",
      completion: averagePercent(profile, goals, fuel),
      description: "Turn fuel decisions into meals, menus, and weekly nutrition plans.",
      id: "fuel",
      title: "Fuel Journey",
      steps: [
        { href: ROUTES.dashboard.profile, label: "Profile", status: "Foundation" },
        { href: "/nutrition/goals", label: "Goals", status: "Fuel goal" },
        { href: ROUTES.nutritionPortal.home, label: "Fuel Dashboard", status: "Today" },
        { href: ROUTES.nutritionPortal.grocery, label: "Shopping / My Fridge", status: "Stock" },
        { href: ROUTES.nutritionPortal.library, label: "Kitchen", status: "Library" },
        { href: ROUTES.nutritionPortal.meals, label: "My Menu", status: "Meals" },
        { href: "/nutrition/meal-plan", label: "My Plan", status: "Week" },
        { href: "/nutrition/progress", label: "Progress", status: "Track" },
      ],
    },
    {
      accent: "from-orange-300 to-amber-300",
      completion: averagePercent(goals, training, performance),
      description: "Develop conditioning, athletic metrics, and performance trends.",
      id: "performance",
      title: "Performance Pathway",
      steps: [
        { href: "/performance", label: "Baseline", status: "Check" },
        { href: "/performance", label: "Cardio", status: "Engine" },
        { href: "/performance", label: "Conditioning", status: "Capacity" },
        { href: "/performance", label: "Metrics", status: "Measure" },
        { href: "/performance", label: "Athletic Tests", status: "Test" },
        { href: ROUTES.dashboard.stats, label: "Progress", status: "Track" },
      ],
    },
    {
      accent: "from-violet-300 to-cyan-300",
      completion: averagePercent(profile, goals, recovery),
      description: "Connect readiness, mobility, pain/soreness, and recovery planning.",
      id: "recovery",
      title: "Recovery Roadmap",
      steps: [
        { href: ROUTES.dashboard.profile, label: "Readiness", status: "Profile" },
        { href: ROUTES.dashboard.mobilityLibrary, label: "Mobility", status: "Move" },
        { href: ROUTES.dashboard.painTracking, label: "Pain/Soreness", status: "Log" },
        { href: ROUTES.dashboard.profile, label: "Sleep/Stress", status: "Signals" },
        { href: "/recovery", label: "Recovery Plan", status: "Recover" },
        { href: ROUTES.dashboard.stats, label: "Progress", status: "Track" },
      ],
    },
  ];

  const foundationItems = [
    {
      href: ROUTES.dashboard.profile,
      label: "Profile",
      status: "Foundation",
    },
    {
      href: ROUTES.dashboard.goals,
      label: "Goals",
      status: "Direction",
    },
  ];

  const getJourneySummary = (row: JourneyRow) => {
    const completedCount = Math.min(
      row.steps.length,
      Math.floor((row.completion / 100) * row.steps.length),
    );
    const currentIndex = Math.min(completedCount, row.steps.length - 1);
    const currentStep =
      row.steps[currentIndex]?.label || row.steps[0]?.label || "Profile";
    const nextAction =
      row.steps[Math.min(currentIndex + 1, row.steps.length - 1)]?.label ||
      currentStep;

    return { completedCount, currentIndex, currentStep, nextAction };
  };

  const overallJourneyCompletion = averagePercent(
    ...journeyRows.map((row) => row.completion),
  );
  const currentJourney =
    journeyRows.find((row) => row.id === openJourney) ||
    journeyRows.find((row) => row.completion < 100) ||
    journeyRows[0];
  const currentJourneySummary = getJourneySummary(currentJourney);

  return (
    <section className="overflow-hidden rounded-[30px] border border-white/10 bg-slate-950/58 shadow-2xl">
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((current) => !current)}
        className="group w-full p-5 text-left transition hover:bg-white/[0.035] sm:p-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200/70">
              Master Journey
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-black text-white">
                Master Training Journey
              </h2>
              <span className="rounded-full border border-cyan-200/28 bg-cyan-300/12 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-cyan-100">
                {overallJourneyCompletion}% complete
              </span>
            </div>
            <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-400">
              Profile and goals are the foundation. Training, fuel, performance,
              and recovery journeys build from there.
            </p>
            <div className="mt-3 flex max-w-full flex-wrap gap-2">
              <span className="rounded-full border border-emerald-200/20 bg-emerald-300/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.1em] text-emerald-100">
                {overallJourneyCompletion}% Complete
              </span>
              <span className="rounded-full border border-cyan-200/20 bg-cyan-300/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.1em] text-cyan-100">
                Current: {currentJourney.title}
              </span>
              <span className="rounded-full border border-orange-200/18 bg-orange-300/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.1em] text-orange-100">
                Next: {currentJourneySummary.nextAction}
              </span>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <span className="hidden h-2 w-24 rounded-full bg-gradient-to-r from-cyan-300 via-emerald-300 to-orange-300 shadow-[0_0_20px_rgba(34,211,238,0.16)] sm:block">
              <span
                className="block h-full rounded-full bg-white/35 transition-[width] duration-500"
                style={{ width: `${overallJourneyCompletion}%` }}
              />
            </span>
            <span
              className={`grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-white/[0.045] text-lg font-black text-slate-300 transition group-hover:border-cyan-200/35 group-hover:text-cyan-100 ${
                expanded ? "rotate-90" : ""
              }`}
            >
              &gt;
            </span>
          </div>
        </div>
      </button>

      <div
        className={`grid transition-all duration-300 ease-out ${
          expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="border-t border-white/10 p-5 sm:p-6">
            <div className="mx-auto grid max-w-2xl gap-3 sm:grid-cols-2">
              {foundationItems.map((item, index) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="group relative rounded-[26px] border border-cyan-200/22 bg-[radial-gradient(circle_at_20%_0%,rgba(34,211,238,0.18),transparent_44%),rgba(15,23,42,0.68)] p-4 text-center shadow-[0_0_28px_rgba(34,211,238,0.08)] transition hover:-translate-y-1 hover:border-cyan-200/42 hover:bg-cyan-300/10"
                >
                  {index === 0 ? (
                    <span className="pointer-events-none absolute -right-5 top-1/2 hidden h-px w-10 bg-gradient-to-r from-cyan-300/60 to-orange-300/60 sm:block" />
                  ) : null}
                  <span className="mx-auto grid h-10 w-10 place-items-center rounded-2xl border border-cyan-100/25 bg-cyan-300/14 text-sm font-black text-cyan-100">
                    {index + 1}
                  </span>
                  <p className="mt-3 text-lg font-black text-white">{item.label}</p>
                  <p className="mt-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
                    {item.status}
                  </p>
                  <span className="mt-3 inline-flex rounded-full border border-cyan-100/25 bg-cyan-300/12 px-3 py-1 text-xs font-black text-cyan-100">
                    Start here
                  </span>
                </Link>
              ))}
            </div>

            <div className="my-5 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />

            <div className="space-y-5">
              {journeyRows.map((row) => {
                const isOpen = openJourney === row.id;
                const { completedCount, currentIndex, currentStep, nextAction } =
                  getJourneySummary(row);

                return (
                  <section
                    key={row.id}
                    className="overflow-hidden rounded-[28px] border border-white/10 bg-slate-950/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                  >
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      onClick={() =>
                        setOpenJourney((current) =>
                          current === row.id ? null : row.id,
                        )
                      }
                      className="group w-full p-4 text-left transition hover:bg-white/[0.035]"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-3">
                            <p className="text-lg font-black text-white">{row.title}</p>
                            <span className="rounded-full border border-white/10 bg-white/[0.045] px-3 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-slate-300">
                              {row.completion}% complete
                            </span>
                          </div>
                          <p className="mt-1 text-xs font-semibold leading-5 text-slate-400">
                            {row.description}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <span className="rounded-full border border-cyan-200/20 bg-cyan-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-cyan-100">
                              Current: {currentStep}
                            </span>
                            <span className="rounded-full border border-orange-200/18 bg-orange-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-orange-100">
                              Next: {nextAction}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span
                            className={`hidden h-2 w-24 rounded-full bg-gradient-to-r ${row.accent} shadow-[0_0_18px_rgba(34,211,238,0.14)] sm:block`}
                          />
                          <span
                            className={`grid h-10 w-10 place-items-center rounded-2xl border border-white/10 bg-white/[0.045] text-lg font-black text-slate-300 transition group-hover:border-cyan-200/35 group-hover:text-cyan-100 ${
                              isOpen ? "rotate-90" : ""
                            }`}
                          >
                            &gt;
                          </span>
                        </div>
                      </div>
                    </button>

                    <div
                      className={`grid transition-all duration-300 ease-out ${
                        isOpen
                          ? "grid-rows-[1fr] opacity-100"
                          : "grid-rows-[0fr] opacity-0"
                      }`}
                    >
                      <div className="overflow-hidden">
                        <div className="border-t border-white/10 p-4 pt-5">
                          <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                            {row.steps.map((step, index) => {
                              const stepState =
                                index < completedCount
                                  ? "Completed"
                                  : index === currentIndex
                                    ? "Active"
                                    : "Next";
                              const isActive = stepState === "Active";
                              const isComplete = stepState === "Completed";

                              return (
                                <div
                                  key={`${row.title}-${step.label}`}
                                  className="flex shrink-0 snap-start items-center gap-3"
                                >
                                  <Link
                                    href={step.href}
                                    className={`group min-h-[128px] w-[190px] rounded-[24px] border p-4 transition hover:-translate-y-1 active:scale-[0.98] ${
                                      isActive
                                        ? "border-cyan-200/45 bg-cyan-300/14 shadow-[0_0_28px_rgba(34,211,238,0.16)]"
                                        : isComplete
                                          ? "border-emerald-200/35 bg-emerald-300/10 shadow-[0_0_22px_rgba(52,211,153,0.12)]"
                                          : "border-white/10 bg-white/[0.045] hover:border-cyan-200/30 hover:bg-cyan-300/10"
                                    }`}
                                  >
                                    <div className="flex items-center justify-between gap-3">
                                      <span
                                        className={`grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br ${row.accent} text-xs font-black text-slate-950`}
                                      >
                                        {index + 1}
                                      </span>
                                      <span className="rounded-full border border-white/10 bg-slate-950/58 px-2 py-1 text-[9px] font-black uppercase tracking-[0.1em] text-slate-400 group-hover:text-cyan-100">
                                        {stepState}
                                      </span>
                                    </div>
                                    <p className="mt-4 text-sm font-black leading-tight text-white">
                                      {step.label}
                                    </p>
                                    <p className="mt-2 text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
                                      {step.status}
                                    </p>
                                  </Link>
                                  {index < row.steps.length - 1 ? (
                                    <span className="h-px w-10 shrink-0 bg-gradient-to-r from-white/18 to-cyan-300/30" />
                                  ) : null}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
