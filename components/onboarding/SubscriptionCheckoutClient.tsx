"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BellRing,
  CalendarClock,
  CheckCircle2,
  Mail,
  Send,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { type FormEvent, useState } from "react";
import {
  APP_PLANS,
  type AppPlan,
  type AppPlanId,
  getAppPlan,
} from "@/lib/appPlans";
import { ROUTES } from "@/lib/routes";

type SubscriptionCheckoutClientProps = {
  initialPlan: AppPlanId;
};

type AppWaitingListInterest = {
  planId: AppPlanId;
  planName: string;
  name: string;
  email: string;
  notes: string;
  submittedAt: string;
};

const appWaitingListStorageKey = "sound_app_waiting_list_interest";

const checkoutSteps = [
  ["1", "Choose plan"],
  ["2", "Join waiting list"],
  ["3", "Get invite"],
] as const;

export default function SubscriptionCheckoutClient({
  initialPlan,
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
        <header className="flex flex-col gap-5 border-b border-white/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href={ROUTES.public.home}
            className="group flex w-fit max-w-full min-w-0 items-center gap-3 text-left"
            aria-label="Sound Fitness home"
          >
            <Image
              src="/sound-fitness-logo.png"
              alt="Sound Fitness"
              width={72}
              height={72}
              className="h-14 w-14 shrink-0 object-contain drop-shadow-[0_0_20px_rgba(125,211,252,0.18)] transition duration-300 group-hover:scale-105 sm:h-16 sm:w-16"
            />
            <span className="min-w-0">
              <span className="block bg-gradient-to-r from-white via-slate-200 to-sky-100 bg-clip-text text-2xl font-black uppercase leading-none tracking-[0.13em] text-transparent sm:text-3xl">
                Sound Fitness
              </span>
              <span className="mt-1 block text-[9px] font-black uppercase leading-none tracking-[0.2em] text-sky-300 sm:text-[10px]">
                In-home training & assisted stretch
              </span>
              <span className="mt-1.5 block h-px w-full bg-gradient-to-r from-sky-400 via-amber-200 to-transparent opacity-70" />
              <span className="mt-1.5 inline-flex rounded-full border border-sky-400/25 bg-sky-500/10 px-3 py-1 text-[8px] font-black uppercase tracking-[0.15em] text-sky-100 sm:text-[9px]">
                In-home training + app
              </span>
            </span>
          </Link>

          <Link
            href={ROUTES.onboarding.assessment}
            className="group inline-flex min-h-12 w-fit items-center justify-center rounded-xl border border-white/15 bg-white/[0.05] px-6 py-3 text-center text-xs font-black uppercase tracking-[0.14em] text-white shadow-[0_18px_42px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.08)] transition duration-200 hover:-translate-y-0.5 hover:border-sky-300/45 hover:bg-sky-500/10 hover:shadow-[0_22px_54px_rgba(14,165,233,0.16),inset_0_1px_0_rgba(255,255,255,0.12)] focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/60 sm:self-center"
          >
            Free Intro Form
          </Link>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1fr_0.78fr] lg:items-stretch">
          <div className="rounded-2xl border border-sky-300/20 bg-white/[0.05] p-6 shadow-2xl shadow-black/30">
            <p className="text-[11px] font-black uppercase tracking-[0.26em] text-sky-300">
              Member app preview
            </p>

            <h1 className="mt-4 max-w-3xl text-4xl font-black uppercase leading-[0.95] tracking-tight sm:text-5xl">
              Choose your support level.
            </h1>

            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
              Pick the support level you are interested in first, then join the
              waiting list at the bottom. We will send the setup invite when the
              member app is ready. No payment is collected today.
            </p>
          </div>

          <aside className="rounded-2xl border border-emerald-300/25 bg-emerald-300/10 p-6 shadow-[0_0_70px_rgba(16,185,129,0.12)]">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-emerald-200/25 bg-emerald-300/10 text-emerald-100">
              <ShieldCheck aria-hidden="true" className="h-6 w-6" />
            </div>
            <p className="mt-5 text-[11px] font-black uppercase tracking-[0.24em] text-emerald-200">
              Early access preview
            </p>
            <h2 className="mt-3 text-2xl font-black uppercase leading-none text-white">
              Plan first. Invite later.
            </h2>
            <p className="mt-3 text-sm leading-6 text-emerald-50/80">
              This temporary flow collects the app plan a member wants and the
              best email for the invite. The full payment and account setup flow
              can come back when the app is ready.
            </p>

            <div className="mt-5 grid gap-3">
              {checkoutSteps.map(([number, label]) => (
                <div
                  key={label}
                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-slate-950/45 p-3"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-300 text-xs font-black text-slate-950">
                    {number}
                  </div>
                  <span className="text-xs font-black uppercase tracking-[0.14em] text-emerald-50">
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </aside>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <PlanChooser selectedPlanId={planId} onSelect={selectPlan} />
          <InterestPreviewPanel key={selectedPlan.id} plan={selectedPlan} />
        </section>

        <section className="rounded-2xl border border-sky-300/20 bg-white/[0.05] p-6 shadow-2xl shadow-black/30">
          <p className="text-[11px] font-black uppercase tracking-[0.26em] text-sky-300">
            Member app waiting list
          </p>

          <h2 className="mt-4 max-w-3xl text-4xl font-black uppercase leading-[0.95] tracking-tight sm:text-5xl">
            Join the waiting list.
          </h2>

          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
            Leave your email and we will send the setup invite when the member
            app is ready. Your current plan interest stays attached to the
            request.
          </p>

          <EmailCollectionForm plan={selectedPlan} />
        </section>
      </section>
    </main>
  );
}

function EmailCollectionForm({ plan }: { plan: AppPlan }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [submittedEmail, setSubmittedEmail] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const payload: AppWaitingListInterest = {
      planId: plan.id,
      planName: plan.name,
      name: name.trim(),
      email: email.trim(),
      notes: notes.trim(),
      submittedAt: new Date().toISOString(),
    };

    try {
      if (typeof window !== "undefined") {
        const raw = window.localStorage.getItem(appWaitingListStorageKey);
        const parsed = raw ? (JSON.parse(raw) as unknown) : [];
        const existing = Array.isArray(parsed) ? parsed : [];
        window.localStorage.setItem(
          appWaitingListStorageKey,
          JSON.stringify([payload, ...existing].slice(0, 25)),
        );
      }
    } catch {
      // The visible confirmation still keeps the preview flow usable.
    }

    setSubmittedEmail(payload.email);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-6 rounded-2xl border border-white/10 bg-slate-950/60 p-4 shadow-inner shadow-black/35"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200">
            <Mail aria-hidden="true" className="h-4 w-4" />
            Waiting list
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Current plan interest:{" "}
            <span className="font-black text-white">
              {plan.name} {plan.price}
              {plan.cadence}
            </span>
          </p>
        </div>
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-amber-200/25 bg-amber-200/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-amber-100">
          <BellRing aria-hidden="true" className="h-3.5 w-3.5" />
          No payment today
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <label className="grid gap-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
          Name
          <input
            type="text"
            name="name"
            autoComplete="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Your name"
            className="min-h-12 rounded-xl border border-white/10 bg-white/[0.06] px-4 text-sm font-bold normal-case tracking-normal text-white outline-none transition placeholder:text-slate-500 focus:border-sky-300/60 focus:bg-sky-400/10"
          />
        </label>

        <label className="grid gap-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
          Email
          <input
            required
            type="email"
            name="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            className="min-h-12 rounded-xl border border-white/10 bg-white/[0.06] px-4 text-sm font-bold normal-case tracking-normal text-white outline-none transition placeholder:text-slate-500 focus:border-sky-300/60 focus:bg-sky-400/10"
          />
        </label>
      </div>

      <label className="mt-3 grid gap-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
        What should we prioritize?
        <textarea
          name="notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Goals, schedule, equipment, coaching preferences..."
          rows={3}
          className="rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm font-bold normal-case leading-6 tracking-normal text-white outline-none transition placeholder:text-slate-500 focus:border-sky-300/60 focus:bg-sky-400/10"
        />
      </label>

      <button
        type="submit"
        className="mt-4 inline-flex w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-emerald-300 via-cyan-300 to-sky-400 px-5 py-4 text-sm font-black uppercase tracking-[0.16em] text-slate-950 shadow-[0_0_32px_rgba(34,211,238,0.18)] transition hover:-translate-y-0.5 hover:shadow-[0_0_42px_rgba(34,211,238,0.28)] active:translate-y-0"
      >
        Join waiting list
        <Send aria-hidden="true" className="h-4 w-4" />
      </button>

      {submittedEmail ? (
        <div className="mt-4 rounded-xl border border-emerald-200/25 bg-emerald-300/10 p-4 text-sm font-bold leading-6 text-emerald-50">
          Got it. {submittedEmail} is on the {plan.name} waiting list in this
          preview flow.
        </div>
      ) : (
        <p className="mt-3 text-xs leading-5 text-slate-500">
          Temporary waiting-list capture. Connect this form to the live email list
          or CRM before launch.
        </p>
      )}
    </form>
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

function InterestPreviewPanel({ plan }: { plan: AppPlan }) {
  return (
    <div className="rounded-2xl border border-sky-400/25 bg-sky-500/10 p-6 shadow-[0_0_70px_rgba(14,165,233,0.12)]">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-sky-300">
            Selected interest
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
          <Sparkles aria-hidden="true" className="h-6 w-6" />
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

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-slate-950/60 p-4">
          <CalendarClock aria-hidden="true" className="h-5 w-5 text-cyan-200" />
          <p className="mt-3 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-200">
            Next step
          </p>
          <p className="mt-2 text-sm font-bold leading-6 text-slate-300">
            We send setup details when private dashboard access opens.
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-slate-950/60 p-4">
          <Mail aria-hidden="true" className="h-5 w-5 text-emerald-200" />
          <p className="mt-3 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-200">
            Contact
          </p>
          <p className="mt-2 text-sm font-bold leading-6 text-slate-300">
            Email stays the handoff until full checkout returns.
          </p>
        </div>
      </div>
    </div>
  );
}
