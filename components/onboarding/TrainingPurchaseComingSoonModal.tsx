"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Sparkles, X } from "lucide-react";
import { getAppPlan, type AppPlanId } from "@/lib/appPlans";
import { ROUTES } from "@/lib/routes";

type TrainingPurchaseComingSoonModalProps = {
  planId: AppPlanId | null;
  onClose: () => void;
};

export default function TrainingPurchaseComingSoonModal({
  planId,
  onClose,
}: TrainingPurchaseComingSoonModalProps) {
  const plan = planId ? getAppPlan(planId) : null;

  useEffect(() => {
    if (!plan) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, plan]);

  if (!plan) return null;

  const isOnlineCoaching = plan.id === "online-coaching";

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="training-purchase-coming-soon-title"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-slate-950/82 backdrop-blur-sm" />
      <div
        className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-sky-300/25 bg-[radial-gradient(circle_at_18%_0%,rgba(56,189,248,0.18),transparent_42%),linear-gradient(180deg,rgba(15,23,42,0.96),rgba(2,7,19,0.98))] p-5 text-white shadow-2xl shadow-black/60 sm:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close coming soon message"
          className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full border border-white/15 bg-slate-950/55 text-white transition hover:bg-slate-950/85 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/70"
        >
          <X aria-hidden="true" className="h-4 w-4" />
        </button>

        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-cyan-200/25 bg-cyan-300/10 text-cyan-100 shadow-[0_0_24px_rgba(34,211,238,0.18)]">
          <Sparkles aria-hidden="true" className="h-6 w-6" />
        </div>

        <p className="mt-5 text-[10px] font-black uppercase tracking-[0.22em] text-cyan-200">
          {isOnlineCoaching ? "Available now" : "App almost ready"}
        </p>
        <h2
          id="training-purchase-coming-soon-title"
          className="mt-2 text-3xl font-black uppercase leading-none tracking-tight text-white"
        >
          {isOnlineCoaching
            ? "Online Coaching is open now."
            : "The app is almost finished."}
        </h2>
        <p className="mt-4 text-sm leading-6 text-slate-300">
          {isOnlineCoaching
            ? "The member app is almost finished, and Online Coaching is already available while the final app pieces come together."
            : `${plan.name} is not open for checkout yet, but Online Coaching is available now while the member app is almost finished.`}
        </p>

        <div className="mt-5">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-100">
            Online coaching includes
          </p>
          <p className="mt-2 text-2xl font-black leading-none text-white">
            {plan.price}
            <span className="ml-1 text-xs font-black uppercase tracking-[0.12em] text-slate-400">
              {plan.cadence}
            </span>
          </p>
          <ul className="mt-3 space-y-2 text-sm font-bold leading-5 text-emerald-50/90">
            {[
              "Coach-led programming",
              "Check-ins and app messaging",
              "Video form review",
              "Training calendar support",
              "Larger Sound rewards bundle",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2.5">
                <CheckCircle2
                  aria-hidden="true"
                  className="mt-0.5 h-4 w-4 shrink-0 text-cyan-200 drop-shadow-[0_0_6px_rgba(34,211,238,0.65)]"
                />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <Link
          href={`${ROUTES.onboarding.checkout}?plan=online-coaching`}
          className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-cyan-300 px-5 text-xs font-black uppercase tracking-[0.16em] text-slate-950 transition hover:bg-cyan-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-100"
        >
          Continue to checkout
          <ArrowRight aria-hidden="true" className="ml-2 h-4 w-4" />
        </Link>
        <button
          type="button"
          onClick={onClose}
          className="mt-3 inline-flex min-h-10 w-full items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] px-5 text-xs font-black uppercase tracking-[0.14em] text-slate-300 transition hover:bg-white/[0.08] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-100"
        >
          Keep previewing
        </button>
      </div>
    </div>
  );
}
