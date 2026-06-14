import Link from "next/link";
import { CheckCircle2, ClipboardList, UserPlus } from "lucide-react";
import { getAppPlan, isAppPlanId } from "@/lib/appPlans";
import { ROUTES } from "@/lib/routes";

type ConfirmationPageProps = {
  searchParams: Promise<{
    plan?: string | string[];
    session_id?: string | string[];
  }>;
};

export default async function ConfirmationPage({
  searchParams,
}: ConfirmationPageProps) {
  const params = await searchParams;
  const requestedPlan = Array.isArray(params.plan)
    ? params.plan[0]
    : params.plan;
  const sessionId = Array.isArray(params.session_id)
    ? params.session_id[0]
    : params.session_id;
  const selectedPlan = getAppPlan(isAppPlanId(requestedPlan) ? requestedPlan : null);
  const hasCheckoutSession = Boolean(sessionId);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.16),_transparent_30%),linear-gradient(180deg,#020617_0%,#0f172a_100%)] px-5 py-10 text-white">
      <section className="mx-auto max-w-4xl space-y-6">
        <div className="rounded-[32px] border border-emerald-400/20 bg-emerald-500/10 p-8 text-center shadow-2xl">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-400 text-slate-950 shadow-lg">
            <CheckCircle2 aria-hidden="true" className="h-10 w-10" />
          </div>

          <p className="mt-6 text-[11px] font-black uppercase tracking-[0.28em] text-emerald-300">
            {hasCheckoutSession ? "Checkout complete" : "Onboarding received"}
          </p>

          <h1 className="mt-3 text-4xl font-black uppercase tracking-tight sm:text-5xl">
            {hasCheckoutSession
              ? "Your membership is ready for account setup."
              : "You are on the path."}
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-slate-200">
            {hasCheckoutSession
              ? `Stripe returned your ${selectedPlan.name} checkout session. Next, create your account so the private dashboard can attach to the membership.`
              : "Your onboarding step was received. Complete the assessment or create an account when you are ready."}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {[
            [
              "1",
              "Payment confirmed",
              hasCheckoutSession
                ? "Stripe sent the checkout session back to Sound Fitness."
                : "Choose a plan when you are ready for member access.",
            ],
            [
              "2",
              "Create account",
              "Your login connects the membership to a private dashboard.",
            ],
            [
              "3",
              "Dashboard setup",
              "Training, progress, rewards, and coach context live in one place.",
            ],
          ].map(([number, title, text]) => (
            <div
              key={title}
              className="rounded-[24px] border border-white/10 bg-white/[0.05] p-5 shadow-xl"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-500 font-black text-white">
                {number}
              </div>

              <h2 className="mt-4 text-lg font-black uppercase tracking-[0.06em]">
                {title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">{text}</p>
            </div>
          ))}
        </div>

        <div className="rounded-[28px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-sky-300">
            Selected access
          </p>

          <div className="mt-4 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-2xl font-black">{selectedPlan.name}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                {selectedPlan.detail}
              </p>
            </div>
            <div className="shrink-0 text-left sm:text-right">
              <div className="text-3xl font-black text-sky-100">
                {selectedPlan.price}
              </div>
              <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                {selectedPlan.cadence}
              </div>
            </div>
          </div>

          {sessionId ? (
            <div className="mt-5 rounded-xl border border-white/10 bg-slate-950/60 p-4 text-xs font-bold leading-5 text-slate-400">
              Stripe session: <span className="text-slate-200">{sessionId}</span>
            </div>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Link
            href={ROUTES.auth.signup}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-sky-500 px-5 py-4 text-center font-black uppercase tracking-[0.1em] text-white shadow-lg shadow-sky-500/20 hover:bg-sky-400"
          >
            <UserPlus aria-hidden="true" className="h-5 w-5" />
            Create Account
          </Link>

          <Link
            href={ROUTES.onboarding.assessment}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-center font-black uppercase tracking-[0.1em] text-slate-200 hover:bg-white/10"
          >
            <ClipboardList aria-hidden="true" className="h-5 w-5" />
            Complete Assessment
          </Link>
        </div>
      </section>
    </main>
  );
}
