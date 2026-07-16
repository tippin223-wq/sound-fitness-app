"use client";

import Image from "next/image";
import Link from "next/link";
import {
  EmbeddedCheckout,
  EmbeddedCheckoutProvider,
} from "@stripe/react-stripe-js";
import {
  ArrowLeft,
  CheckCircle2,
  Info,
  Lock,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import AssessmentWebGlIcon, {
  type AssessmentIconGlyph,
} from "@/components/AssessmentWebGlIcon";
import MarketingHeaderLogo3D from "@/components/MarketingHeaderLogo3D";
import {
  APP_PLANS,
  getAppPlan,
  type AppPlanId,
} from "@/lib/appPlans";
import { ROUTES } from "@/lib/routes";
import { soundFx } from "@/lib/soundFx";
import { getStripe, isStripeConfigured } from "@/lib/stripeClient";

type CheckoutClientProps = {
  initialPlan: AppPlanId;
};

type CheckoutState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; clientSecret: string }
  | { status: "unconfigured"; message: string }
  | { status: "error"; message: string };

const stripePromise = getStripe();

// 3D glyph per plan for the card icons (the lucide icons remain the fallback
// wherever a WebGL context isn't warranted, e.g. the transient info popup).
const PLAN_ICON_GLYPHS: Record<AppPlanId, AssessmentIconGlyph> = {
  "app-only": "phone",
  "hybrid-app": "spark",
  "online-coaching": "users",
};

// Each plan gets its own color so the three tiers read at a glance: cyan for
// the app, emerald for the gem/rewards bundle, amber for top-tier coaching.
// Full literal class strings — Tailwind only generates classes it can see.
type PlanTheme = {
  tone: "sky" | "emerald" | "amber";
  selectedCard: string;
  iconBox: string;
  price: string;
  check: string;
  summaryBox: string;
  summaryLabel: string;
  /** Contrasting accent for the ⓘ — never the same hue as its own box. */
  infoBtn: string;
  checkBadge: string;
  checkIcon: string;
  panelBorder: string;
};

const PLAN_THEMES: Record<AppPlanId, PlanTheme> = {
  "app-only": {
    tone: "sky",
    selectedCard:
      "border-sky-400 bg-sky-500/15 shadow-[0_0_24px_rgba(14,165,233,0.16)]",
    iconBox: "border-sky-300/20 bg-sky-400/10 text-sky-100",
    price: "text-sky-100",
    check: "text-sky-300",
    summaryBox: "border-sky-300/20 bg-sky-500/10",
    summaryLabel: "text-sky-200",
    infoBtn:
      "border-amber-300/40 bg-amber-400/15 text-amber-300 hover:border-amber-200/70 hover:bg-amber-400/30 hover:text-amber-100 focus-visible:ring-amber-300/70",
    checkBadge:
      "border-sky-300/30 bg-sky-400/15 shadow-[0_0_10px_rgba(56,189,248,0.3),inset_0_1px_0_rgba(255,255,255,0.14)]",
    checkIcon: "text-sky-200",
    panelBorder: "border-sky-300/25",
  },
  "hybrid-app": {
    tone: "emerald",
    selectedCard:
      "border-emerald-400 bg-emerald-500/15 shadow-[0_0_24px_rgba(52,211,153,0.16)]",
    iconBox: "border-emerald-300/20 bg-emerald-400/10 text-emerald-100",
    price: "text-emerald-100",
    check: "text-emerald-300",
    summaryBox: "border-emerald-300/20 bg-emerald-500/10",
    summaryLabel: "text-emerald-200",
    infoBtn:
      "border-amber-300/40 bg-amber-400/15 text-amber-300 hover:border-amber-200/70 hover:bg-amber-400/30 hover:text-amber-100 focus-visible:ring-amber-300/70",
    checkBadge:
      "border-emerald-300/30 bg-emerald-400/15 shadow-[0_0_10px_rgba(52,211,153,0.3),inset_0_1px_0_rgba(255,255,255,0.14)]",
    checkIcon: "text-emerald-200",
    panelBorder: "border-emerald-300/25",
  },
  "online-coaching": {
    tone: "amber",
    selectedCard:
      "border-amber-400 bg-amber-500/15 shadow-[0_0_24px_rgba(251,191,36,0.16)]",
    iconBox: "border-amber-300/20 bg-amber-400/10 text-amber-100",
    price: "text-amber-100",
    check: "text-amber-300",
    summaryBox: "border-amber-300/20 bg-amber-500/10",
    summaryLabel: "text-amber-200",
    infoBtn:
      "border-sky-300/40 bg-sky-400/15 text-sky-300 hover:border-sky-200/70 hover:bg-sky-400/30 hover:text-sky-100 focus-visible:ring-sky-300/70",
    checkBadge:
      "border-amber-300/30 bg-amber-400/15 shadow-[0_0_10px_rgba(251,191,36,0.3),inset_0_1px_0_rgba(255,255,255,0.14)]",
    checkIcon: "text-amber-200",
    panelBorder: "border-amber-300/25",
  },
};

// Side-by-side feature matrix for the hidden comparison table.
const PLAN_COMPARISON: {
  label: string;
  cells: Record<AppPlanId, boolean | string>;
}[] = [
  {
    label: "Dashboard + tracking tools",
    cells: { "app-only": true, "hybrid-app": true, "online-coaching": true },
  },
  {
    label: "Plan visibility between sessions",
    cells: { "app-only": true, "hybrid-app": true, "online-coaching": true },
  },
  {
    label: "Blue Sound Points rewards",
    cells: { "app-only": false, "hybrid-app": true, "online-coaching": "More" },
  },
  {
    label: "Gems for technique support",
    cells: { "app-only": false, "hybrid-app": true, "online-coaching": "More" },
  },
  {
    label: "Treasure Tokens for in-app purchases",
    cells: { "app-only": false, "hybrid-app": true, "online-coaching": "More" },
  },
  {
    label: "Coach-led programming",
    cells: { "app-only": false, "hybrid-app": false, "online-coaching": true },
  },
  {
    label: "Check-ins + app messaging",
    cells: { "app-only": false, "hybrid-app": false, "online-coaching": true },
  },
];

const PLAN_SHORT_NAMES: Record<AppPlanId, string> = {
  "app-only": "App",
  "hybrid-app": "Hybrid",
  "online-coaching": "Coaching",
};

const PLAN_COLUMN_BG: Record<AppPlanId, string> = {
  "app-only": "bg-sky-400/10",
  "hybrid-app": "bg-emerald-400/10",
  "online-coaching": "bg-amber-400/10",
};

const CHECKOUT_APP_PLANS = APP_PLANS.filter(
  (plan) => plan.id === "online-coaching",
);

export default function CheckoutClient({ initialPlan }: CheckoutClientProps) {
  const [isFooterLogoHighlighted, setIsFooterLogoHighlighted] = useState(false);
  const [planId, setPlanId] = useState<AppPlanId>(initialPlan);
  const [state, setState] = useState<CheckoutState>({ status: "idle" });
  // Which plan's "more info" popup is open (null = closed).
  const [infoPlanId, setInfoPlanId] = useState<AppPlanId | null>(null);
  const selectedPlan = getAppPlan(planId);

  useEffect(() => {
    if (!infoPlanId) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setInfoPlanId(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [infoPlanId]);

  // The onboarding background song shouldn't follow the user into checkout.
  useEffect(() => {
    soundFx.pauseMusic();
  }, []);

  const startCheckout = useCallback(async (nextPlanId: AppPlanId) => {
    if (!isStripeConfigured()) {
      setState({
        status: "unconfigured",
        message:
          "Payments aren't switched on in this environment yet. Add your Stripe keys to take live enrollments.",
      });
      return;
    }

    setState({ status: "loading" });

    try {
      const response = await fetch("/api/stripe/embedded-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: nextPlanId }),
      });

      const data = (await response.json()) as {
        clientSecret?: string;
        error?: string;
      };

      if (!response.ok || !data.clientSecret) {
        // 503 = Stripe not configured (missing price / secret key).
        const message =
          data.error ?? "We couldn't start checkout. Please try again.";
        setState(
          response.status === 503
            ? { status: "unconfigured", message }
            : { status: "error", message },
        );
        return;
      }

      setState({ status: "ready", clientSecret: data.clientSecret });
    } catch {
      setState({
        status: "error",
        message: "We couldn't reach the payment service. Please try again.",
      });
    }
  }, []);

  useEffect(() => {
    const checkoutStartTimer = window.setTimeout(() => {
      void startCheckout(planId);
    }, 0);

    return () => window.clearTimeout(checkoutStartTimer);
  }, [planId, startCheckout]);

  const embeddedOptions = useMemo(
    () =>
      state.status === "ready" ? { clientSecret: state.clientSecret } : null,
    [state],
  );

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_18%_0%,rgba(14,165,233,0.2),transparent_32%),radial-gradient(circle_at_82%_8%,rgba(250,204,21,0.12),transparent_28%),linear-gradient(180deg,#020713_0%,#07111f_52%,#020713_100%)] px-5 py-8 text-white">
      <style>{`
        @keyframes checkout-crest-shimmer {
          0%,
          100% {
            filter:
              drop-shadow(0 0 14px rgba(125, 211, 252, 0.22))
              drop-shadow(0 0 26px rgba(249, 115, 22, 0.1));
          }
          50% {
            filter:
              drop-shadow(0 0 22px rgba(125, 211, 252, 0.42))
              drop-shadow(0 0 38px rgba(249, 115, 22, 0.2));
          }
        }

        .checkout-crest-glow {
          animation: checkout-crest-shimmer 3.6s ease-in-out infinite;
          display: inline-block;
        }

        @media (prefers-reduced-motion: reduce) {
          .checkout-crest-glow {
            animation: none;
            filter: drop-shadow(0 0 16px rgba(125, 211, 252, 0.28));
          }
        }

        .checkout-footer-logo {
          animation: none;
          border-radius: 0.75rem;
          cursor: pointer;
          filter:
            drop-shadow(0 0 10px rgba(125, 211, 252, 0.18))
            drop-shadow(0 0 20px rgba(56, 189, 248, 0.08));
          transition: transform 220ms ease;
        }

        .checkout-footer-logo:hover,
        .checkout-footer-logo:focus-visible {
          filter:
            drop-shadow(0 0 22px rgba(125, 211, 252, 0.5))
            drop-shadow(0 0 40px rgba(56, 189, 248, 0.24));
          transform: translateY(-2px);
        }

        @media (prefers-reduced-motion: reduce) {
          .checkout-footer-logo,
          .checkout-footer-logo:hover {
            animation: none;
            transform: none;
            filter: drop-shadow(0 0 14px rgba(125, 211, 252, 0.3));
          }
        }
      `}</style>
      <section className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-col items-center gap-4 border-b border-white/10 pb-5 text-center">
          <Link
            href={ROUTES.public.home}
            className="group checkout-crest-glow"
            aria-label="Sound Fitness home"
          >
            <Image
              src="/sound-fitness-logo.png"
              alt="Sound Fitness"
              width={112}
              height={112}
              className="relative z-30 h-20 w-20 shrink-0 object-contain transition duration-300 group-hover:scale-105 sm:h-24 sm:w-24"
            />
          </Link>

          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-100">
            <Lock aria-hidden="true" className="h-3.5 w-3.5" />
            Payment secured by Stripe
          </div>
        </header>

        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.26em] text-sky-300">
            Enroll in Sound Fitness
          </p>
          <h1 className="mt-3 text-3xl font-black uppercase leading-[0.95] tracking-tight sm:text-4xl">
            Online Coaching is available now.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
            The full member app is almost finished. For now, Online Coaching is
            the open enrollment option, with coach-led programming, check-ins,
            messaging, form review, and app access as the final pieces roll out.
          </p>
        </div>

        {/* grid-cols-1 matters below lg: an implicit `auto` column can't
            shrink under its content's min-width, which forced horizontal
            scroll on narrow screens. minmax(0,1fr) lets the cards compress. */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          <div className="min-w-0 space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-5 shadow-2xl shadow-black/30">
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-emerald-300">
                Available plan
              </p>
              <div className="mt-4 grid grid-cols-1 gap-3">
                {CHECKOUT_APP_PLANS.map((plan) => {
                  const isSelected = plan.id === planId;
                  const theme = PLAN_THEMES[plan.id];
                  return (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => setPlanId(plan.id)}
                      aria-pressed={isSelected}
                      className={`w-full rounded-xl border p-4 text-left transition ${
                        isSelected
                          ? theme.selectedCard
                          : "border-white/10 bg-slate-950/55 hover:border-white/25 hover:bg-white/[0.07]"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${theme.iconBox}`}
                        >
                          <AssessmentWebGlIcon
                            active={isSelected}
                            className="h-8 w-8"
                            glyph={PLAN_ICON_GLYPHS[plan.id]}
                            tone={theme.tone}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          {/* flex-wrap: on narrow screens the price drops
                              under the title instead of painting past the
                              card's rounded border. */}
                          <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                            <h2 className="text-base font-black text-white">
                              {plan.name}
                            </h2>
                            <span
                              className={`shrink-0 text-lg font-black ${theme.price}`}
                            >
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
                            className={`h-4 w-4 shrink-0 ${theme.check}`}
                          />
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div
              className={`relative overflow-hidden rounded-2xl border p-5 ${PLAN_THEMES[planId].summaryBox}`}
            >
              {/* Background photo sits under a dark scrim so the summary copy
                  stays readable and the plan tint survives. */}
              <span
                aria-hidden="true"
                className="absolute inset-0 bg-cover bg-[center_42%] opacity-25"
                style={{
                  backgroundImage: "url(/onboarding-goal-planning-photo.jpg)",
                }}
              />
              <span
                aria-hidden="true"
                className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,7,19,0.78),rgba(8,25,48,0.72)_55%,rgba(2,7,19,0.85))]"
              />
              <div className="relative z-10 flex items-center justify-between gap-3">
                <div>
                  <p
                    className={`text-[10px] font-black uppercase tracking-[0.2em] ${PLAN_THEMES[planId].summaryLabel}`}
                  >
                    Order summary
                  </p>
                  <p className="mt-1 flex items-center gap-2 text-lg font-black text-white [text-shadow:0_1px_6px_rgba(2,7,19,0.9)]">
                    {selectedPlan.name}
                    <button
                      type="button"
                      onClick={() => setInfoPlanId(selectedPlan.id)}
                      aria-haspopup="dialog"
                      aria-label={`More about ${selectedPlan.name}`}
                      className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border transition focus:outline-none focus-visible:ring-2 ${PLAN_THEMES[planId].infoBtn}`}
                    >
                      <Info aria-hidden="true" className="h-3.5 w-3.5" />
                    </button>
                  </p>
                </div>
                <p className="text-right text-2xl font-black text-white [text-shadow:0_1px_6px_rgba(2,7,19,0.9)]">
                  {selectedPlan.price}
                  <span className="block text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
                    {selectedPlan.cadence}
                  </span>
                </p>
              </div>
              <div className="relative z-10 mt-4 grid grid-cols-1 gap-2.5 border-t border-white/10 pt-4">
                {selectedPlan.benefits.map((benefit) => (
                  <div key={benefit} className="flex items-start gap-2.5">
                    <span
                      className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border ${PLAN_THEMES[planId].checkBadge}`}
                    >
                      <CheckCircle2
                        aria-hidden="true"
                        className={`h-4 w-4 ${PLAN_THEMES[planId].checkIcon}`}
                      />
                    </span>
                    <span className="pt-1 text-xs font-bold leading-5 text-slate-200 [text-shadow:0_1px_5px_rgba(2,7,19,0.9)]">
                      {benefit}
                    </span>
                  </div>
                ))}
              </div>
              {/* relative z-10 matters: without it this static line paints
                  UNDER the absolutely-positioned photo scrim and goes murky. */}
              <p className="relative z-10 mt-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-200 [text-shadow:0_1px_5px_rgba(2,7,19,0.9)]">
                <ShieldCheck
                  aria-hidden="true"
                  className="h-3.5 w-3.5 text-emerald-300"
                />
                Cancel anytime from your dashboard
              </p>
            </div>

            <div className="hidden">
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-sky-300">
                Compare membership options
              </p>
              {/* One grid for header + every row so the columns stay aligned.
                  Fixed narrow plan columns keep it inside the smallest
                  viewports; the feature label column absorbs the rest. */}
              <div className="mt-4 grid grid-cols-[minmax(0,1fr)_repeat(3,minmax(3.5rem,4.65rem))] gap-y-1">
                <span aria-hidden="true" />
                {APP_PLANS.map((plan) => {
                  const isSelected = plan.id === planId;
                  const isAvailable = plan.id === "online-coaching";
                  const theme = PLAN_THEMES[plan.id];
                  return (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => {
                        if (isAvailable) setPlanId(plan.id);
                      }}
                      disabled={!isAvailable}
                      aria-pressed={isSelected}
                      aria-label={
                        isAvailable
                          ? `Select ${plan.name}`
                          : `${plan.name} coming soon`
                      }
                      className={`relative flex min-h-[3.75rem] flex-col items-center justify-end gap-0.5 rounded-t-lg px-1 pb-2 pt-1.5 text-center transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/70 ${
                        isSelected ? PLAN_COLUMN_BG[plan.id] : "hover:bg-white/[0.05]"
                      } ${isAvailable ? "" : "cursor-not-allowed opacity-70 hover:bg-transparent"}`}
                    >
                      {!isAvailable ? (
                        <span className="mb-1 rounded-full border border-amber-200/35 bg-amber-300/12 px-1.5 py-0.5 text-[6.5px] font-black uppercase leading-none tracking-[0.08em] text-amber-100">
                          Coming soon
                        </span>
                      ) : null}
                      <span
                        className={`text-[9px] font-black uppercase leading-none tracking-[0.08em] ${theme.summaryLabel}`}
                      >
                        {PLAN_SHORT_NAMES[plan.id]}
                      </span>
                      <span className={`text-[10px] font-black leading-none ${theme.price}`}>
                        {plan.price}
                      </span>
                    </button>
                  );
                })}

                {PLAN_COMPARISON.map((row) => (
                  <Fragment key={row.label}>
                    <span className="flex min-w-0 items-center py-1 pr-2 text-[10px] font-bold leading-4 text-slate-300">
                      {row.label}
                    </span>
                    {APP_PLANS.map((plan) => {
                      const cell = row.cells[plan.id];
                      const isSelected = plan.id === planId;
                      const isAvailable = plan.id === "online-coaching";
                      const theme = PLAN_THEMES[plan.id];
                      return (
                        <span
                          key={plan.id}
                          className={`flex items-center justify-center py-1 ${
                            isSelected ? PLAN_COLUMN_BG[plan.id] : ""
                          } ${isAvailable ? "" : "opacity-55"}`}
                        >
                          {cell === false ? (
                            <span aria-label="Not included" className="text-xs text-slate-600">
                              —
                            </span>
                          ) : typeof cell === "string" ? (
                            <span
                              className={`text-[9px] font-black uppercase tracking-[0.06em] ${theme.price}`}
                            >
                              {cell}
                            </span>
                          ) : (
                            <CheckCircle2
                              aria-hidden="true"
                              className={`h-3.5 w-3.5 ${theme.check}`}
                            />
                          )}
                        </span>
                      );
                    })}
                  </Fragment>
                ))}
              </div>
            </div>

            <Link
              href={ROUTES.public.home}
              className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.14em] text-slate-400 transition hover:text-slate-200"
            >
              <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" />
              Back to results
            </Link>
          </div>

          <div className="relative min-h-[26rem] min-w-0 overflow-hidden rounded-lg border border-sky-200/30 bg-[#06101d] p-1 shadow-[0_0_0_1px_rgba(56,189,248,0.08),0_26px_60px_rgba(0,0,0,0.46)]">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-sky-100 to-amber-200/80"
            />
            <div className="relative min-h-[calc(26rem-10px)] overflow-hidden rounded-md border-2 border-orange-400/95 bg-[linear-gradient(155deg,rgba(16,41,71,0.94),rgba(7,17,31,0.98)_48%,rgba(9,18,31,0.96))] p-2 shadow-[inset_0_0_0_1px_rgba(255,237,213,0.5),inset_0_0_22px_rgba(234,88,12,0.14)] sm:p-4">
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-[linear-gradient(180deg,rgba(125,211,252,0.08),transparent)]"
              />
              <div className="relative z-10 min-h-[calc(26rem-30px)] sm:min-h-[calc(26rem-46px)]">
            {state.status === "loading" || state.status === "idle" ? (
              <CheckoutStatus>
                <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-sky-300/40 border-t-sky-200" />
                <p className="mt-4 text-sm font-bold text-slate-300">
                  Preparing secure checkout…
                </p>
              </CheckoutStatus>
            ) : null}

            {state.status === "unconfigured" ? (
              <CheckoutStatus>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-amber-200/25 bg-amber-200/10 text-amber-100">
                  <Sparkles aria-hidden="true" className="h-6 w-6" />
                </div>
                <p className="mt-4 text-[11px] font-black uppercase tracking-[0.18em] text-amber-200">
                  Checkout preview
                </p>
                <p className="mt-2 max-w-sm text-sm leading-6 text-slate-300">
                  {state.message}
                </p>
                <p className="mt-3 max-w-sm text-xs leading-5 text-slate-500">
                  Set <code className="text-slate-300">STRIPE_SECRET_KEY</code>,
                  a price ID per plan, and{" "}
                  <code className="text-slate-300">
                    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
                  </code>{" "}
                  to accept real payments here.
                </p>
              </CheckoutStatus>
            ) : null}

            {state.status === "error" ? (
              <CheckoutStatus>
                <p className="max-w-sm text-sm font-bold leading-6 text-rose-200">
                  {state.message}
                </p>
                <button
                  type="button"
                  onClick={() => void startCheckout(planId)}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-sky-400 px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-slate-950 transition hover:bg-sky-300"
                >
                  Try again
                </button>
              </CheckoutStatus>
            ) : null}

            {embeddedOptions ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 border-b border-orange-300/35 pb-2">
                  <ShieldCheck
                    aria-hidden="true"
                    className="h-4 w-4 text-orange-300"
                  />
                  <h2 className="text-[11px] font-black uppercase tracking-[0.16em] text-orange-100">
                    Secure enrollment
                  </h2>
                </div>
                <EmbeddedCheckoutProvider
                  key={embeddedOptions.clientSecret}
                  stripe={stripePromise}
                  options={embeddedOptions}
                >
                  <EmbeddedCheckout />
                </EmbeddedCheckoutProvider>
              </div>
            ) : null}
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="relative mx-auto mt-10 flex max-w-6xl flex-col items-center gap-3 pt-7 pb-2 text-xs text-slate-500">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 grid grid-cols-[minmax(0,1fr)_15rem_minmax(0,1fr)] items-center gap-3 sm:grid-cols-[minmax(0,1fr)_16rem_minmax(0,1fr)]"
        >
          <span className="h-px bg-gradient-to-r from-transparent via-white/10 to-white/10" />
          <span />
          <span className="h-px bg-gradient-to-l from-transparent via-white/10 to-white/10" />
        </div>
        {/* The footer logo shouldn't lead anyone AWAY from checkout — clicking
            it scrolls back up to the plans instead of navigating home. */}
        <button
          type="button"
          onClick={() => {
            const reduceMotion = window.matchMedia(
              "(prefers-reduced-motion: reduce)",
            ).matches;
            window.scrollTo({
              top: 0,
              behavior: reduceMotion ? "auto" : "smooth",
            });
          }}
          onPointerEnter={() => setIsFooterLogoHighlighted(true)}
          onPointerLeave={() => setIsFooterLogoHighlighted(false)}
          onPointerCancel={() => setIsFooterLogoHighlighted(false)}
          onFocus={() => setIsFooterLogoHighlighted(true)}
          onBlur={() => setIsFooterLogoHighlighted(false)}
          aria-label="Back to checkout"
          className="checkout-footer-logo group flex flex-col items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/70"
        >
          {/* Static footer — no sticky header here, so keep the wordmark open. */}
          <MarketingHeaderLogo3D
            alwaysOpen
            className="!w-[13.37rem] max-w-[calc(100vw-3rem)]"
            highlighted={isFooterLogoHighlighted}
          />
          {/* Only shown while the logo is highlighted (hover/keyboard focus) —
              opacity keeps the space reserved so nothing shifts. */}
          <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-full border border-sky-200/50 bg-sky-400/20 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-sky-50 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
            ↑ Back to checkout
          </span>
        </button>
        <div>© 2026 Sound Fitness. All rights reserved.</div>
      </footer>

      {infoPlanId
        ? (() => {
            const infoPlan = getAppPlan(infoPlanId);
            return (
              <div
                className="fixed inset-0 z-[90] flex items-center justify-center p-4"
                role="dialog"
                aria-modal="true"
                aria-labelledby="plan-info-title"
                onClick={() => setInfoPlanId(null)}
              >
                <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" />
                <div
                  className={`relative z-10 max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl border p-4 shadow-2xl shadow-black/50 sm:p-5 ${PLAN_THEMES[infoPlan.id].panelBorder}`}
                  style={{
                    // The photo rides in the element background (not an
                    // absolute layer) so it doesn't scroll away inside this
                    // overflow-y-auto panel. Gradients above keep copy legible.
                    backgroundImage:
                      "radial-gradient(circle at 14% 0%, rgba(56,189,248,0.12), transparent 46%), linear-gradient(180deg, rgba(15,23,42,0.9), rgba(2,7,19,0.92)), url(/onboarding-goal-planning-photo.jpg)",
                    backgroundSize: "auto, auto, cover",
                    backgroundPosition: "center, center, center 42%",
                  }}
                  onClick={(event) => event.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => setInfoPlanId(null)}
                    aria-label="Close plan details"
                    className="absolute right-2.5 top-2.5 grid h-7 w-7 place-items-center rounded-full border border-white/20 bg-slate-950/55 text-white transition hover:bg-slate-950/85 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/70 sm:right-3 sm:top-3 sm:h-8 sm:w-8"
                  >
                    <X aria-hidden="true" className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </button>

                  <div className="flex items-start gap-2.5 pr-8 sm:gap-3">
                    <span
                      className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg border sm:h-10 sm:w-10 ${PLAN_THEMES[infoPlan.id].iconBox}`}
                    >
                      {/* Shares the card icon's snapshot key, so even if the
                          WebGL budget is full it paints the cached 3D frame
                          instead of a flat icon. */}
                      <AssessmentWebGlIcon
                        active
                        className="h-7 w-7 sm:h-8 sm:w-8"
                        glyph={PLAN_ICON_GLYPHS[infoPlan.id]}
                        tone={PLAN_THEMES[infoPlan.id].tone}
                      />
                    </span>
                    <div className="min-w-0">
                      <h3
                        id="plan-info-title"
                        className="text-sm font-black uppercase leading-tight tracking-tight text-white sm:text-base"
                      >
                        {infoPlan.name}
                      </h3>
                      {/* No price / summary / benefits here — the order
                          summary behind this popup already shows all of that.
                          This dialog carries only what ISN'T on the page:
                          the longer description and who the plan suits. */}
                      <span
                        className={`text-[9px] font-black uppercase tracking-[0.18em] ${PLAN_THEMES[infoPlan.id].summaryLabel}`}
                      >
                        The full picture
                      </span>
                    </div>
                  </div>

                  <p className="mt-3 text-xs leading-5 text-slate-200 sm:text-sm sm:leading-6">
                    {infoPlan.detail}
                  </p>

                  <div className="mt-3 rounded-lg border border-emerald-300/20 bg-emerald-400/[0.07] px-3 py-2">
                    <span className="text-[9px] font-black uppercase tracking-[0.18em] text-emerald-300">
                      Best for
                    </span>
                    <p className="mt-0.5 text-xs font-bold text-emerald-100 sm:text-sm">
                      {infoPlan.bestFor}
                    </p>
                  </div>

                  <div className="mt-4 flex sm:justify-end">
                    <button
                      type="button"
                      onClick={() => setInfoPlanId(null)}
                      className="inline-flex min-h-8 w-full items-center justify-center rounded-lg bg-sky-400 px-3 text-[10px] font-black uppercase tracking-[0.14em] text-slate-950 transition hover:bg-sky-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/70 sm:min-h-10 sm:w-auto sm:px-4 sm:text-[11px]"
                    >
                      Got it
                    </button>
                  </div>
                </div>
              </div>
            );
          })()
        : null}
    </main>
  );
}

function CheckoutStatus({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[24rem] flex-col items-center justify-center px-6 text-center">
      {children}
    </div>
  );
}
