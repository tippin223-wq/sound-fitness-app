"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  EmbeddedCheckout,
  EmbeddedCheckoutProvider,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import {
  CheckCircle2,
  CreditCard,
  LockKeyhole,
  Settings,
  ShieldCheck,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import {
  APP_PLANS,
  type AppPlan,
  type AppPlanId,
  getAppPlan,
} from "@/lib/appPlans";
import { ROUTES } from "@/lib/routes";

type SubscriptionCheckoutClientProps = {
  initialPlan: AppPlanId;
  publishableKey: string;
};

const checkoutSteps = [
  ["1", "Choose plan"],
  ["2", "Pay securely"],
  ["3", "Create account"],
] as const;

export default function SubscriptionCheckoutClient({
  initialPlan,
  publishableKey,
}: SubscriptionCheckoutClientProps) {
  const router = useRouter();
  const [planId, setPlanId] = useState<AppPlanId>(initialPlan);
  const selectedPlan = getAppPlan(planId);

  function selectPlan(nextPlanId: AppPlanId) {
    setPlanId(nextPlanId);
    router.replace(`${ROUTES.onboarding.subscription}?plan=${nextPlanId}`, {
      scroll: false,
    });
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_18%_0%,rgba(14,165,233,0.2),transparent_32%),radial-gradient(circle_at_82%_8%,rgba(250,204,21,0.13),transparent_28%),linear-gradient(180deg,#020713_0%,#07111f_52%,#020713_100%)] px-5 py-8 text-white">
      <section className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <Link href={ROUTES.public.home} className="flex items-center gap-3">
            <Image
              src="/sound-fitness-logo.png"
              alt="Sound Fitness"
              width={44}
              height={44}
              className="h-11 w-11 object-contain"
            />
            <span className="text-sm font-black uppercase tracking-[0.16em]">
              Sound Fitness
            </span>
          </Link>

          <Link
            href={ROUTES.onboarding.assessment}
            className="rounded-xl border border-white/15 bg-white/[0.04] px-5 py-3 text-center text-xs font-black uppercase tracking-[0.14em] text-white transition hover:border-sky-300/45 hover:bg-sky-500/10"
          >
            Free Intro Form
          </Link>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1fr_0.78fr] lg:items-stretch">
          <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-6 shadow-2xl shadow-black/30">
            <p className="text-[11px] font-black uppercase tracking-[0.26em] text-sky-300">
              Member signup
            </p>

            <h1 className="mt-4 max-w-3xl text-4xl font-black uppercase leading-[0.95] tracking-tight sm:text-5xl">
              Pay securely. Then create your member account.
            </h1>

            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
              Choose App Only, Hybrid App, or Online Coaching. Payment stays on
              this page through Stripe Embedded Checkout, then account setup
              creates the private dashboard for your plan, progress, messages,
              and billing.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {checkoutSteps.map(([number, label]) => (
                <div
                  key={label}
                  className="rounded-lg border border-white/10 bg-slate-950/54 p-4"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-500 text-xs font-black text-white">
                    {number}
                  </div>
                  <div className="mt-3 text-xs font-black uppercase tracking-[0.13em] text-slate-200">
                    {label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <aside className="rounded-2xl border border-emerald-300/25 bg-emerald-300/10 p-6 shadow-[0_0_70px_rgba(16,185,129,0.12)]">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-emerald-200/25 bg-emerald-300/10 text-emerald-100">
              <ShieldCheck aria-hidden="true" className="h-6 w-6" />
            </div>
            <p className="mt-5 text-[11px] font-black uppercase tracking-[0.24em] text-emerald-200">
              Embedded Stripe Checkout
            </p>
            <h2 className="mt-3 text-2xl font-black uppercase leading-none text-white">
              Secure payment without leaving Sound Fitness.
            </h2>
            <p className="mt-3 text-sm leading-6 text-emerald-50/80">
              Stripe handles card entry, subscription billing, Link, and payment
              security. Sound Fitness receives confirmation after payment so the
              account can be created against the right membership.
            </p>
          </aside>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <PlanChooser selectedPlanId={planId} onSelect={selectPlan} />
          <CheckoutPanel
            key={selectedPlan.id}
            plan={selectedPlan}
            publishableKey={publishableKey}
          />
        </section>
      </section>
    </main>
  );
}

function PlanChooser({
  selectedPlanId,
  onSelect,
}: {
  selectedPlanId: AppPlanId;
  onSelect: (planId: AppPlanId) => void;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-6 shadow-2xl shadow-black/30">
      <p className="text-[11px] font-black uppercase tracking-[0.24em] text-emerald-300">
        Available plans
      </p>

      <div className="mt-5 grid gap-4">
        {APP_PLANS.map((item) => {
          const isSelected = selectedPlanId === item.id;
          const Icon = item.Icon;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              className={`w-full rounded-xl border p-5 text-left transition ${
                isSelected
                  ? "border-sky-400 bg-sky-500/15 shadow-[0_0_28px_rgba(14,165,233,0.16)]"
                  : "border-white/10 bg-slate-950/60 hover:bg-white/10"
              }`}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-sky-300/20 bg-sky-400/10 text-sky-100">
                    <Icon aria-hidden="true" className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                      {item.bestFor}
                    </p>
                    <h3 className="mt-2 text-xl font-black text-white">
                      {item.name}
                    </h3>
                    <div className="mt-3 flex flex-wrap items-end gap-x-2 gap-y-1">
                      <span className="text-3xl font-black leading-none text-sky-100">
                        {item.price}
                      </span>
                      <span className="pb-1 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                        {item.cadence}
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-bold text-sky-200">
                      {item.summary}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      {item.detail}
                    </p>
                  </div>
                </div>

                <p className="text-sm font-black uppercase tracking-[0.12em] text-sky-300">
                  {isSelected ? "Selected" : "Select"}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CheckoutPanel({
  plan,
  publishableKey,
}: {
  plan: AppPlan;
  publishableKey: string;
}) {
  return (
    <div className="rounded-2xl border border-sky-400/25 bg-sky-500/10 p-6 shadow-[0_0_70px_rgba(14,165,233,0.12)]">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-sky-300">
            Checkout summary
          </p>

          <h2 className="mt-3 text-2xl font-black text-white">{plan.name}</h2>
          <p className="mt-2 text-xl font-black text-sky-200">
            {plan.summary}
          </p>
          <div className="mt-4 flex flex-wrap items-end gap-x-2 gap-y-1">
            <span className="text-4xl font-black leading-none text-white">
              {plan.price}
            </span>
            <span className="pb-1 text-xs font-black uppercase tracking-[0.12em] text-slate-400">
              {plan.cadence}
            </span>
          </div>
        </div>

        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-sky-300/25 bg-slate-950/50 text-sky-100">
          <CreditCard aria-hidden="true" className="h-6 w-6" />
        </div>
      </div>

      <p className="mt-3 text-sm leading-6 text-slate-300">{plan.detail}</p>

      <div className="mt-5 grid gap-3">
        {plan.benefits.map((benefit) => (
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

      <div className="mt-6 rounded-2xl border border-white/10 bg-slate-950/72 p-4">
        <div className="mb-4 flex items-center gap-3 border-b border-white/10 pb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-200/25 bg-cyan-300/10 text-cyan-100">
            <LockKeyhole aria-hidden="true" className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-200">
              Secure embedded payment
            </p>
            <p className="mt-1 text-sm text-slate-400">
              Powered by Stripe Checkout.
            </p>
          </div>
        </div>

        {publishableKey ? (
          <StripeCheckoutEmbed planId={plan.id} publishableKey={publishableKey} />
        ) : (
          <StripeSetupNotice />
        )}
      </div>

      <div className="mt-3 rounded-xl border border-white/15 bg-white/[0.04] px-5 py-4 text-center text-sm font-black uppercase tracking-[0.14em] text-slate-300">
        Account setup unlocks after payment
      </div>
    </div>
  );
}

function StripeCheckoutEmbed({
  planId,
  publishableKey,
}: {
  planId: AppPlanId;
  publishableKey: string;
}) {
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const stripePromise = useMemo(
    () => loadStripe(publishableKey),
    [publishableKey],
  );

  const fetchClientSecret = useCallback(async () => {
    setCheckoutError(null);

    const response = await fetch("/api/stripe/embedded-checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId }),
    });
    const data = (await response.json().catch(() => ({}))) as {
      clientSecret?: string;
      error?: string;
    };

    if (!response.ok || !data.clientSecret) {
      const message =
        data.error ?? "Stripe checkout could not be started for this plan.";
      setCheckoutError(message);
      throw new Error(message);
    }

    return data.clientSecret;
  }, [planId]);

  const options = useMemo(
    () => ({
      fetchClientSecret,
    }),
    [fetchClientSecret],
  );

  return (
    <div className="min-h-[520px]">
      <EmbeddedCheckoutProvider
        key={planId}
        stripe={stripePromise}
        options={options}
      >
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>

      {checkoutError ? (
        <div className="mt-4 rounded-xl border border-amber-300/30 bg-amber-300/10 p-4 text-sm font-bold leading-6 text-amber-100">
          {checkoutError}
        </div>
      ) : null}
    </div>
  );
}

function StripeSetupNotice() {
  return (
    <div className="rounded-xl border border-amber-300/30 bg-amber-300/10 p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-200/25 bg-amber-200/10 text-amber-100">
          <Settings aria-hidden="true" className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-black uppercase tracking-[0.12em] text-amber-100">
            Stripe setup needed
          </p>
          <p className="mt-2 text-sm leading-6 text-amber-50/80">
            Add Stripe keys and plan price IDs to the environment to mount the
            live embedded checkout form.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-2 text-xs font-bold leading-5 text-amber-50/80">
        {[
          "STRIPE_SECRET_KEY",
          "STRIPE_WEBHOOK_SECRET",
          "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
          "STRIPE_PRICE_APP_ONLY",
          "STRIPE_PRICE_HYBRID_APP",
          "STRIPE_PRICE_ONLINE_COACHING",
        ].map((key) => (
          <code
            key={key}
            className="rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-amber-100"
          >
            {key}
          </code>
        ))}
      </div>
    </div>
  );
}
