"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Apple, CalendarDays, ChevronDown, ChevronUp, ClipboardList, Dumbbell, HeartPulse, Target } from "lucide-react";
import DashboardExperience from "@/components/dashboard/DashboardExperience";
import SharedProgramCatalog from "@/components/dashboard/SharedProgramCatalog";
import { planningSnapshot, subscribePlanning } from "@/lib/planning/store";
import { readEligibleGoals } from "@/lib/planning/goals";
import { getActiveWorkoutPlanId, inspectWorkoutPlans, resolveActiveWorkoutPlan } from "@/lib/localData/workoutPlanData";
import { ROUTES } from "@/lib/routes";

const sections = [
  { title: "Your training plan", label: "Overview", icon: ClipboardList },
  { title: "Choose your program", label: "Programs", icon: Dumbbell },
  { title: "Build your week", label: "Schedule", icon: CalendarDays },
  { title: "Connect your training areas", label: "Domains", icon: Target },
];
const action = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-cyan-100/25 bg-cyan-300/10 px-4 py-3 text-sm font-bold text-cyan-100 hover:bg-cyan-300/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-200";

export default function TrainingPlansPage() {
  const snapshot = useSyncExternalStore(subscribePlanning, () => JSON.stringify(planningSnapshot()), () => "{}");
  const ready = snapshot !== "{}";
  const goals = ready ? readEligibleGoals() : null;
  const records = ready ? inspectWorkoutPlans() : null;
  const plan = records ? resolveActiveWorkoutPlan(records.plans, getActiveWorkoutPlanId()) : null;
  const [active, setActive] = useState(0);
  const [catalogOpened, setCatalogOpened] = useState(false);
  const rail = useRef<HTMLDivElement>(null);
  const choose = (index: number) => {
    const next = Math.max(0, Math.min(sections.length - 1, index));
    setActive(next);
    if (next === 1) setCatalogOpened(true);
    (rail.current?.children[next] as HTMLElement | undefined)?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" });
  };
  return <DashboardExperience headerOnly headerOnlyViewport>
    <div className="flex h-[calc(100dvh-4.48rem)] min-h-0 flex-col px-3 py-3 text-white sm:px-6">
      <nav aria-label="Training plan sections" className="mb-3 flex shrink-0 items-center gap-2 overflow-x-auto [scrollbar-width:none]">
        {sections.map((section,index) => <button key={section.label} type="button" aria-current={active === index ? "step" : undefined} onClick={() => choose(index)} className={`flex min-h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-xs font-bold ${active === index ? "border-cyan-200/50 bg-cyan-300/15 text-cyan-100" : "border-white/10 text-slate-400"}`}><section.icon className="h-4 w-4" />{section.label}</button>)}
        <button type="button" aria-label="Previous plan section" disabled={active === 0} className="ml-auto p-2 disabled:opacity-25" onClick={() => choose(active-1)}><ChevronUp className="h-4 w-4" /></button>
        <button type="button" aria-label="Next plan section" disabled={active === sections.length-1} className="p-2 disabled:opacity-25" onClick={() => choose(active+1)}><ChevronDown className="h-4 w-4" /></button>
      </nav>
      <div ref={rail} tabIndex={0} aria-label="Training plans scrolling shell" className="min-h-0 flex-1 snap-y snap-mandatory overflow-y-auto overscroll-contain rounded-[28px] [scrollbar-width:none]" onScroll={() => {
        const el = rail.current; if (!el?.clientHeight) return;
        const next = Math.max(0, Math.min(sections.length-1, Math.round(el.scrollTop/el.clientHeight)));
        setActive(next); if (next === 1) setCatalogOpened(true);
      }}>
        {sections.map((section,index) => <section key={section.label} aria-label={section.title} className="flex h-full min-h-0 snap-start flex-col overflow-hidden rounded-[28px] border border-cyan-100/20 bg-[radial-gradient(ellipse_at_85%_0%,rgba(34,211,238,.12),transparent_55%),linear-gradient(145deg,#0b1d30,#030b17)] p-5 sm:p-7">
          <header className="mb-5 shrink-0"><p className="text-[9px] font-black uppercase tracking-[.2em] text-cyan-200/60">Profile → Goals → Training Plans</p><h1 className="mt-2 flex items-center gap-3 text-2xl font-black text-cyan-100"><section.icon className="h-6 w-6 shrink-0" />{section.title}</h1></header>
          <div className="min-h-0 flex-1 overflow-y-auto pb-3 [scrollbar-width:thin]">
            {index === 0 ? <div className="space-y-5">
              {records?.issue ? <p role="alert" className="rounded-xl border border-amber-200/30 p-3 text-sm text-amber-100">{records.issue}</p> : null}
              <p className="max-w-xl text-sm leading-relaxed text-slate-300">Bring your goals, program and weekly schedule together before starting your sessions.</p>
              <div className="grid gap-3 sm:grid-cols-2"><div className="rounded-2xl border border-white/10 p-4"><p className="text-xs text-slate-400">Goal direction</p><p className="mt-2 font-bold">{goals?.primaryGoal || "Choose your training goals"}</p><Link href={ROUTES.dashboard.goals} className="mt-3 inline-block text-xs text-amber-200">Review goals →</Link></div><div className="rounded-2xl border border-white/10 p-4"><p className="text-xs text-slate-400">Active weekly plan</p><p className="mt-2 font-bold">{plan?.title || "No active plan selected"}</p><p className="mt-1 text-xs text-slate-400">{plan ? `Week of ${plan.weekStartDate}` : "Build or select a plan to establish your schedule."}</p></div></div>
              <div className="flex flex-wrap gap-3"><button type="button" className={action} onClick={() => choose(1)}>Explore programs</button><Link href={ROUTES.dashboard.createMyPlan} className={action}>Build a weekly plan</Link><Link href={ROUTES.dashboard.myPlan} className={action}>Manage saved plans</Link></div>
            </div> : index === 1 ? <>{catalogOpened ? <SharedProgramCatalog /> : null}<p className="mt-4 text-xs text-slate-400">Program availability and review status come from the shared website/app catalog.</p></> : index === 2 ? <div className="space-y-5"><p className="text-sm leading-relaxed text-slate-300">Use the existing planner to assign workouts, set training days and manage progression. Your saved plans remain the source for scheduled sessions.</p><div className="flex flex-wrap gap-3"><Link href={ROUTES.dashboard.createMyPlan} className={action}><CalendarDays className="h-4 w-4" />Build your week</Link><Link href={ROUTES.dashboard.myPlan} className={action}>Open plan manager</Link><Link href={ROUTES.dashboard.sessions} className={action}>Open Sessions</Link></div></div> : <div className="grid gap-3 sm:grid-cols-2">{[{label:"Sessions",icon:Dumbbell,href:ROUTES.dashboard.myPlan,detail:"Workouts, training days and progression."},{label:"Fuel",icon:Apple,href:ROUTES.nutritionPortal.home,detail:"Nutrition direction, meals and hydration."},{label:"Performance",icon:Target,href:ROUTES.performance.home,detail:"Cardio, benchmarks and personal records."},{label:"Recovery",icon:HeartPulse,href:ROUTES.dashboard.recovery,detail:"Recovery, mobility and check-ins."}].map(domain => <Link key={domain.label} href={domain.href} className="rounded-2xl border border-white/10 bg-white/[.025] p-4 hover:border-cyan-100/40"><domain.icon className="mb-3 h-6 w-6 text-cyan-200" /><h2 className="font-black">{domain.label}</h2><p className="mt-2 text-xs leading-relaxed text-slate-400">{domain.detail}</p></Link>)}</div>}
          </div>
        </section>)}
      </div>
    </div>
  </DashboardExperience>;
}
