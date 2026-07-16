"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, BellRing, CheckCircle2, ShieldCheck } from "lucide-react";
import { useState } from "react";
import {
  APP_PLANS,
  getAppPlan,
  type AppPlanId,
} from "@/lib/appPlans";
import { ROUTES } from "@/lib/routes";
import TrainingPurchaseComingSoonModal from "@/components/onboarding/TrainingPurchaseComingSoonModal";

type PurchaseComingSoonClientProps = {
  initialPlan: AppPlanId;
};

export default function PurchaseComingSoonClient({
  initialPlan,
}: PurchaseComingSoonClientProps) {
  const router = useRouter();
  const [planId, setPlanId] = useState<AppPlanId>(initialPlan);
  const [comingSoonPlanId, setComingSoonPlanId] =
    useState<AppPlanId | null>(initialPlan);
  const selectedPlan = getAppPlan(planId);

  function selectPlan(nextPlanId: AppPlanId) {
    setPlanId(nextPlanId);
    router.replace(`${ROUTES.onboarding.checkout}?plan=${nextPlanId}`, {
      scroll: false,
    });
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_18%_0%,rgba(14,165,233,0.2),transparent_32%),radial-gradient(circle_at_82%_8%,rgba(250,204,21,0.12),transparent_28%),linear-gradient(180deg,#020713_0%,#07111f_52%,#020713_100%)] px-5 py-8 text-white">
      <section className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-col items-center gap-4 border-b border-white/10 pb-5 text-center">
          <Link
            href={ROUTES.public.home}
            className="group"
            aria-label="Sound Fitness home"
          >
            <Image
              src="/sound-fitness-logo.png"
              alt="Sound Fitness"
              width={112}
              height={112}
              className="relative z-30 h-20 w-20 shrink-0 object-contain drop-shadow-[0_0_22px_rgba(125,211,252,0.24)] transition duration-300 group-hover:scale-105 sm:h-24 sm:w-24"
            />
          </Link>

          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-amber-300/25 bg-amber-300/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-amber-100">
            <BellRing aria-hidden="true" className="h-3.5 w-3.5" />
            Purchases coming soon
          </div>
        </header>

        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.26em] text-sky-300">
            Sound Fitness memberships
          </p>
          <h1 className="mt-3 text-3xl font-black uppercase leading-[0.95] tracking-tight sm:text-4xl">
            Preview your training option.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
            Checkout is paused while this launch flow is being finished. You can
            still compare the options, but purchase attempts now show a coming
            soon message instead of opening Stripe.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          <div className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.05] p-5 shadow-2xl shadow-black/30">
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-emerald-300">
              Choose your plan
            </p>
            <div className="mt-4 grid gap-3">
              {APP_PLANS.map((plan) => {
                const isSelected = plan.id === planId;
                const Icon = plan.Icon;

                return (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => selectPlan(plan.id)}
                    aria-pressed={isSelected}
                    className={`w-full rounded-xl border p-4 text-left transition ${
                      isSelected
                        ? "border-sky-400 bg-sky-500/15 shadow-[0_0_24px_rgba(14,165,233,0.16)]"
                        : "border-white/10 bg-slate-950/55 hover:border-white/25 hover:bg-white/[0.07]"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-sky-300/20 bg-sky-400/10 text-sky-100">
                        <Icon aria-hidden="true" className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                          <h2 className="text-base font-black text-white">
                            {plan.name}
                          </h2>
                          <span className="shrink-0 text-lg font-black text-sky-100">
                            {plan.price}
                            <span className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-500">
                              {plan.cadence}
                            </span>
                          </span>
                        </div>
                        <p className="mt-1 text-xs font-bold text-sky-200">
                          {plan.summary}
                        </p>
                      </div>
                      {isSelected ? (
                        <CheckCircle2
                          aria-hidden="true"
                          className="h-4 w-4 shrink-0 text-sky-300"
                        />
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>

            <Link
              href={ROUTES.public.home}
              className="mt-5 inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.14em] text-slate-400 transition hover:text-slate-200"
            >
              <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" />
              Back home
            </Link>
          </div>

          <aside className="min-w-0 rounded-2xl border border-sky-400/25 bg-sky-500/10 p-6 shadow-[0_0_70px_rgba(14,165,233,0.12)]">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-sky-300">
                  Selected option
                </p>
                <h2 className="mt-3 text-2xl font-black text-white">
                  {selectedPlan.name}
                </h2>
                <p className="mt-2 text-xl font-black text-sky-200">
                  {selectedPlan.summary}
                </p>
                <div className="mt-4 flex flex-wrap items-end gap-x-2 gap-y-1">
                  <span className="text-4xl font-black leading-none text-white">
                    {selectedPlan.price}
                  </span>
                  <span className="pb-1 text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                    {selectedPlan.cadence}
                  </span>
                </div>
              </div>

              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-emerald-300/25 bg-emerald-300/10 text-emerald-100">
                <ShieldCheck aria-hidden="true" className="h-6 w-6" />
              </div>
            </div>

            <p className="mt-4 text-sm leading-6 text-slate-300">
              {selectedPlan.detail}
            </p>

            <div className="mt-5 grid gap-3">
              {selectedPlan.benefits.map((benefit) => (
                <div
                  key={benefit}
                  className="flex items-start gap-3 rounded-lg bg-slate-950/60 p-4"
                >
                  <CheckCircle2
                    aria-hidden="true"
                    className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300"
                  />
                  <span className="text-sm font-bold leading-6 text-slate-200">
                    {benefit}
                  </span>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setComingSoonPlanId(selectedPlan.id)}
              className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-cyan-300 px-5 text-xs font-black uppercase tracking-[0.16em] text-slate-950 shadow-[0_0_32px_rgba(34,211,238,0.18)] transition hover:-translate-y-0.5 hover:bg-cyan-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-100"
            >
              Purchase {selectedPlan.name}
            </button>
          </aside>
        </div>
      </section>

      <TrainingPurchaseComingSoonModal
        planId={comingSoonPlanId}
        onClose={() => setComingSoonPlanId(null)}
      />
    </main>
  );
}
