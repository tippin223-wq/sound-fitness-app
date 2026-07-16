import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  UserPlus,
} from "lucide-react";
import { getAppPlan, isAppPlanId } from "@/lib/appPlans";
import { ROUTES } from "@/lib/routes";
import { getStripeClient } from "@/lib/stripe";

type ConfirmationPageProps = {
  searchParams: Promise<{
    plan?: string | string[];
    session_id?: string | string[];
  }>;
};

type PaymentCheck =
  | { state: "paid"; email: string | null }
  | { state: "unpaid" }
  | { state: "unverified" }; // no session, or Stripe not configured

async function verifyPayment(
  sessionId: string | undefined,
): Promise<PaymentCheck> {
  if (!sessionId) return { state: "unverified" };
  if (!process.env.STRIPE_SECRET_KEY) return { state: "unverified" };

  try {
    const stripe = getStripeClient();
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    // A Checkout Session can be complete while an asynchronous payment is
    // still processing. `payment_status` is Stripe's fulfillment signal.
    const isPaid =
      session.payment_status === "paid" ||
      session.payment_status === "no_payment_required";

    return isPaid
      ? { state: "paid", email: session.customer_details?.email ?? null }
      : { state: "unpaid" };
  } catch {
    // Couldn't reach Stripe — fall back to the neutral state rather than
    // blocking a member who may have genuinely paid.
    return { state: "unverified" };
  }
}

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
  const selectedPlan = getAppPlan(
    isAppPlanId(requestedPlan) ? requestedPlan : null,
  );

  const payment = await verifyPayment(sessionId);
  const isPaid = payment.state === "paid";
  const isUnpaid = payment.state === "unpaid";

  const signupHref = sessionId
    ? (`${ROUTES.auth.signup}?session_id=${encodeURIComponent(
        sessionId,
      )}&plan=${selectedPlan.id}` as const)
    : ROUTES.auth.signup;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.16),_transparent_30%),linear-gradient(180deg,#020617_0%,#0f172a_100%)] px-5 py-10 text-white">
      <section className="mx-auto max-w-4xl space-y-6">
        <div
          className={`rounded-[32px] border p-8 text-center shadow-2xl ${
            isUnpaid
              ? "border-amber-400/25 bg-amber-500/10"
              : "border-emerald-400/20 bg-emerald-500/10"
          }`}
        >
          <div
            className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full text-slate-950 shadow-lg ${
              isUnpaid ? "bg-amber-400" : "bg-emerald-400"
            }`}
          >
            {isUnpaid ? (
              <AlertTriangle aria-hidden="true" className="h-10 w-10" />
            ) : (
              <CheckCircle2 aria-hidden="true" className="h-10 w-10" />
            )}
          </div>

          <p
            className={`mt-6 text-[11px] font-black uppercase tracking-[0.28em] ${
              isUnpaid ? "text-amber-300" : "text-emerald-300"
            }`}
          >
            {isPaid
              ? "Payment confirmed"
              : isUnpaid
                ? "Payment not completed"
                : "Checkout received"}
          </p>

          <h1 className="mt-3 text-4xl font-black uppercase tracking-tight sm:text-5xl">
            {isPaid
              ? "You're enrolled — create your account."
              : isUnpaid
                ? "Finish payment to enroll."
                : "You're almost there."}
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-slate-200">
            {isPaid
              ? `Your ${selectedPlan.name} membership is active${
                  payment.state === "paid" && payment.email
                    ? ` for ${payment.email}`
                    : ""
                }. Create your account to open your private dashboard.`
              : isUnpaid
                ? "Your checkout session didn't complete payment. Head back to checkout to finish enrolling in your plan."
                : "Complete checkout to activate your membership, then create your account to open your dashboard."}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {[
            [
              "1",
              "Payment",
              isPaid
                ? "Confirmed by Stripe — your membership is active."
                : "Complete secure checkout to activate your plan.",
            ],
            [
              "2",
              "Create account",
              "Your login connects the membership to a private dashboard.",
            ],
            [
              "3",
              "Dashboard setup",
              "Training, progress, rewards, and coach context in one place.",
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
            Selected membership
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
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {isUnpaid ? (
            <Link
              href={`${ROUTES.onboarding.checkout}?plan=${selectedPlan.id}`}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-400 px-5 py-4 text-center font-black uppercase tracking-[0.1em] text-slate-950 shadow-lg shadow-amber-500/20 hover:bg-amber-300"
            >
              <AlertTriangle aria-hidden="true" className="h-5 w-5" />
              Return to Checkout
            </Link>
          ) : (
            <Link
              href={signupHref}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-sky-500 px-5 py-4 text-center font-black uppercase tracking-[0.1em] text-white shadow-lg shadow-sky-500/20 hover:bg-sky-400"
            >
              <UserPlus aria-hidden="true" className="h-5 w-5" />
              Create Account
            </Link>
          )}

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
