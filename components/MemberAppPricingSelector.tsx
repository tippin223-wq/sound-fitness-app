"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import {
  ArrowRight,
  Check,
  Smartphone,
  UsersRound,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import DashboardLightningBolt3D from "@/components/dashboard/DashboardLightningBolt3D";
import DashboardPhone3D from "@/components/dashboard/DashboardPhone3D";
import {
  DashboardEmerald3D,
  DashboardGemStage3D,
} from "@/components/dashboard/DashboardTornadoEmeralds3D";
import DashboardWhistle3D from "@/components/dashboard/DashboardWhistle3D";
import TrainingPurchaseComingSoonModal from "@/components/onboarding/TrainingPurchaseComingSoonModal";

type AppSignupOption = {
  id: "app-only" | "hybrid-app" | "online-coaching";
  title: string;
  price: string;
  cadence: string;
  note: string;
  text: string;
  selectionText: string;
  bestFor: string;
  badge: string;
  asset: string;
  assetAlt: string;
  Icon: LucideIcon;
  benefits: {
    label: string;
    included: boolean;
  }[];
  featured?: boolean;
};

const MEMBER_PRICING_GEM_TONES = ["blue", "green", "yellow", "red"] as const;

const appSignupOptions: AppSignupOption[] = [
  {
    id: "app-only",
    title: "App Only",
    price: "$29",
    cadence: "/mo",
    note: "Self-guided app membership",
    text: "Dashboard access, tracking tools, plan visibility, and self-guided support.",
    selectionText:
      "App Only keeps dashboard access, progress tracking, plan visibility, and self-guided tools focused for independent training.",
    bestFor: "Best for independent training",
    badge: "Most affordable",
    asset: "/sound-fitness-logo.png",
    assetAlt: "Sound Fitness logo",
    Icon: Smartphone,
    benefits: [
      { label: "Dashboard + tracking tools", included: true },
      { label: "Plan visibility and self-guided support", included: true },
      { label: "Sound Sparks, Gems + Treasure Tokens", included: false },
      { label: "Remote coach programming", included: false },
    ],
  },
  {
    id: "hybrid-app",
    title: "Hybrid App",
    price: "$79",
    cadence: "/mo",
    note: "App plus rewards bundle",
    text: "App access with blue Sound Sparks, Gems for technique support, and Treasure Tokens for in-app purchases.",
    selectionText:
      "Hybrid includes blue Sound Sparks, Gems for technique support, and Treasure Tokens for in-app purchases.",
    bestFor: "Rewards + technique support",
    badge: "Most flexible",
    asset: "/sound-coins/sound-coin-gold.png",
    assetAlt: "Treasure Token",
    Icon: Zap,
    benefits: [
      { label: "Everything in App Only", included: true },
      { label: "Blue Sound Sparks bolt rewards", included: true },
      { label: "Gems for technique support", included: true },
      { label: "Treasure Tokens for in-app purchases", included: true },
      { label: "Ongoing online coaching", included: false },
    ],
    featured: true,
  },
  {
    id: "online-coaching",
    title: "Online Coaching",
    price: "$199",
    cadence: "/mo",
    note: "Remote coaching membership",
    text: "Remote coaching, programming, check-ins, messaging, and a larger Sound Sparks, Gems, and Treasure Tokens bundle in the app.",
    selectionText:
      "Online Coaching adds remote programming, check-ins, messaging, and a larger Sound Sparks, Gems, and Treasure Tokens bundle.",
    bestFor: "Coach-led + more rewards",
    badge: "Most guided",
    asset: "/sound-emerald-crystals.png",
    assetAlt: "Sound Fitness gems",
    Icon: UsersRound,
    benefits: [
      { label: "Coach-led programming", included: true },
      { label: "Check-ins and app messaging", included: true },
      { label: "Dashboard + progress tracking", included: true },
      { label: "Larger Sound Sparks, Gems + Treasure Tokens", included: true },
    ],
  },
];

function PricingBlueGemWebGl() {
  return (
    <div aria-hidden="true" className="relative h-16 w-16 shrink-0">
      <div className="absolute inset-1 rounded-full bg-cyan-300/18 blur-xl" />
      <div className="absolute inset-2 rounded-full bg-sky-500/10 blur-md" />
      <DashboardEmerald3D
        className="relative z-10 h-full w-full drop-shadow-[0_0_18px_rgba(56,189,248,0.48)]"
        tone="blue"
      />
    </div>
  );
}

export default function MemberAppPricingSelector() {
  const [selectedPlanId, setSelectedPlanId] =
    useState<AppSignupOption["id"]>("app-only");
  const [comingSoonPlanId, setComingSoonPlanId] =
    useState<AppSignupOption["id"] | null>(null);

  const selectedPlan = useMemo(
    () =>
      appSignupOptions.find((option) => option.id === selectedPlanId) ??
      appSignupOptions[0],
    [selectedPlanId],
  );

  return (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 top-14 hidden h-72 w-[26rem] rotate-[5deg] md:block lg:right-0"
      >
        <div className="absolute inset-y-10 right-2 w-72 rounded-full bg-cyan-300/12 blur-3xl" />
        <div className="absolute inset-y-12 right-16 w-64 rounded-full bg-emerald-200/10 blur-3xl" />
        <div className="member-pricing-gem-cluster relative h-full w-full opacity-60 [mask-image:linear-gradient(to_left,black_0%,black_74%,transparent_100%)]">
          <DashboardGemStage3D
            className="h-full w-full scale-[1.3] mix-blend-screen saturate-[1.22] drop-shadow-[0_0_38px_rgba(52,211,153,0.32)]"
            paused={false}
            tones={MEMBER_PRICING_GEM_TONES}
            vaultOpen
            variant="reserves"
          />
        </div>
      </div>
      <div
        className="pricing-plan-selector relative mx-auto max-w-7xl px-5 sm:px-8"
        data-selected-plan={selectedPlanId}
      >
        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/25 bg-sky-500/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.2em] text-sky-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
              <span className="soft-urgency-dot h-2 w-2 rounded-full bg-amber-200" />
              Sign up for app access
            </div>
            <h2 className="mt-5 max-w-2xl text-4xl font-black uppercase leading-[0.95] tracking-tight text-white sm:text-5xl">
              Choose the support level that fits your next phase.
            </h2>
          </div>
          <div className="rounded-2xl border border-sky-400/15 bg-slate-950/50 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.22)]">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <PricingBlueGemWebGl />
              <div className="pricing-plan-copy text-sm leading-6 text-slate-300">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-200">
                  {selectedPlan.title} preview
                </p>
                <p className="mt-1 text-slate-200">{selectedPlan.selectionText}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="sound-divider-row mt-8 grid gap-4 md:grid-cols-3" role="listbox" aria-label="Preview support plans">
          {appSignupOptions.map((option) => {
            const Icon = option.Icon;
            const isSelected = option.id === selectedPlanId;
            const badgeText = isSelected ? option.badge : "";
            const signupCtaTone =
              option.id === "app-only"
                ? "border-emerald-100/30 bg-[linear-gradient(135deg,#34d399_0%,#22d3ee_100%)] shadow-[0_0_30px_rgba(16,185,129,0.24)] hover:shadow-[0_0_42px_rgba(45,212,191,0.36)]"
                : option.id === "hybrid-app"
                  ? "border-amber-100/36 bg-[linear-gradient(135deg,#22d3ee_0%,#2dd4bf_48%,#facc15_100%)] shadow-[0_0_30px_rgba(34,211,238,0.24)] hover:shadow-[0_0_42px_rgba(250,204,21,0.28)]"
                  : "border-fuchsia-100/32 bg-[linear-gradient(135deg,#38bdf8_0%,#8b5cf6_48%,#f472b6_100%)] shadow-[0_0_30px_rgba(125,211,252,0.22)] hover:shadow-[0_0_42px_rgba(168,85,247,0.34)]";
            const bestForShade =
              option.id === "app-only"
                ? "from-emerald-300/28 via-cyan-300/18 to-transparent"
                : option.id === "hybrid-app"
                  ? "from-amber-200/34 via-cyan-300/18 to-transparent"
                  : "from-fuchsia-300/26 via-sky-300/18 to-transparent";
            const bestForText =
              option.id === "app-only"
                ? "text-emerald-50"
                : option.id === "hybrid-app"
                  ? "text-amber-50"
                  : "text-fuchsia-50";

            return (
              <article
                key={option.id}
                tabIndex={0}
                role="option"
                aria-selected={isSelected}
                aria-label={`${option.title} plan preview`}
                onClick={() => setSelectedPlanId(option.id)}
                onFocus={() => setSelectedPlanId(option.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setSelectedPlanId(option.id);
                  }
                }}
                className={[
                  `pricing-card pricing-card--${option.id}`,
                  "group relative cursor-pointer overflow-hidden rounded-2xl border p-5 shadow-[0_24px_70px_rgba(0,0,0,0.26)] transition hover:-translate-y-1 focus-within:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950",
                  isSelected
                    ? "border-cyan-200/75 bg-sky-500/18 ring-2 ring-cyan-300/65 ring-offset-2 ring-offset-slate-950 shadow-[0_0_0_1px_rgba(186,230,253,0.18),0_28px_86px_rgba(14,165,233,0.28)]"
                    : "border-sky-400/18 bg-slate-950/70 hover:border-sky-300/45 hover:bg-sky-500/12 focus-within:border-sky-300/45 focus-within:bg-sky-500/12",
                ].join(" ")}
              >
                <span
                  aria-hidden="true"
                  className={[
                    "pointer-events-none absolute inset-0 opacity-0 transition",
                    isSelected
                      ? "opacity-100 bg-[radial-gradient(circle_at_14%_10%,rgba(125,211,252,0.18),transparent_34%),linear-gradient(135deg,rgba(34,211,238,0.08),transparent_42%,rgba(250,204,21,0.06))]"
                      : "",
                  ].join(" ")}
                />
                {option.id === "hybrid-app" ? (
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full opacity-[0.11] transition group-hover:scale-110 group-hover:opacity-[0.17]"
                  >
                    <span className="absolute inset-1 rounded-full bg-amber-200/20 blur-xl" />
                    <Image
                      src={option.asset}
                      alt=""
                      width={150}
                      height={150}
                      className="relative h-full w-full rounded-full object-cover [clip-path:circle(47%_at_50%_50%)] [mask-image:radial-gradient(circle_at_center,black_0_66%,transparent_72%)]"
                    />
                  </div>
                ) : (
                  <Image
                    src={option.asset}
                    alt=""
                    width={150}
                    height={150}
                    className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 object-contain opacity-[0.09] transition group-hover:scale-110 group-hover:opacity-[0.14]"
                  />
                )}
                <div className="relative flex h-full min-h-[320px] flex-col justify-between gap-6">
                  {badgeText ? (
                    <div className="pricing-card__badge absolute right-4 top-4 z-20 max-w-[11.5rem] rounded-full border border-amber-100/55 bg-[linear-gradient(135deg,rgba(120,83,18,0.72),rgba(250,204,21,0.3)_48%,rgba(255,237,213,0.18))] px-3.5 py-1 text-center text-[9px] font-black uppercase leading-tight tracking-[0.12em] text-amber-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.32),0_0_20px_rgba(250,204,21,0.22)]">
                      {badgeText}
                    </div>
                  ) : null}
                  <div>
                    {option.id === "app-only" ? (
                      <DashboardPhone3D
                        active
                        className="pricing-card__icon -ml-1 h-14 w-14 drop-shadow-[0_0_22px_rgba(125,211,252,0.36)] transition group-hover:drop-shadow-[0_0_30px_rgba(52,211,153,0.46)]"
                      />
                    ) : option.id === "hybrid-app" ? (
                      <DashboardLightningBolt3D
                        active
                        className="pricing-card__icon -ml-1 h-14 w-14 drop-shadow-[0_0_22px_rgba(56,189,248,0.44)] transition group-hover:drop-shadow-[0_0_30px_rgba(125,211,252,0.58)]"
                      />
                    ) : option.id === "online-coaching" ? (
                      <DashboardWhistle3D
                        active
                        className="pricing-card__icon -ml-3 -mt-1 h-24 w-40 drop-shadow-[0_0_24px_rgba(125,211,252,0.4)] transition group-hover:drop-shadow-[0_0_34px_rgba(186,230,253,0.56)] sm:h-28 sm:w-44"
                      />
                    ) : (
                      <Icon
                        aria-hidden="true"
                        className="pricing-card__icon h-12 w-12 text-sky-100 drop-shadow-[0_0_18px_rgba(125,211,252,0.34)] transition group-hover:text-white group-hover:drop-shadow-[0_0_24px_rgba(125,211,252,0.48)]"
                        strokeWidth={2.15}
                      />
                    )}
                    <div className="sound-energy-divider mt-4 h-1.5 w-20 rounded-full bg-gradient-to-r from-amber-200 via-cyan-300 to-sky-500 shadow-[0_0_18px_rgba(125,211,252,0.34)]" />
                    <div className="mt-5 text-sm font-black uppercase tracking-[0.12em] text-white">
                      {option.title}
                    </div>
                    <div className="mt-4 flex flex-wrap items-end gap-x-2 gap-y-1">
                      <span className="text-5xl font-black leading-none text-sky-100">
                        {option.price}
                      </span>
                      <span className="pb-1 text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                        {option.cadence}
                      </span>
                    </div>
                    <div className="mt-3 text-[10px] font-black uppercase tracking-[0.14em] text-amber-200">
                      {option.note}
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-300">
                      {option.text}
                    </p>
                    <div className="mt-4">
                      <span
                        className={[
                          "pricing-card__best-for relative isolate inline-block max-w-full text-xs font-black uppercase leading-5 tracking-[0.12em]",
                          bestForText,
                        ].join(" ")}
                      >
                        <span
                          aria-hidden="true"
                          className={[
                            "pointer-events-none absolute -inset-x-2 -inset-y-1 -z-10 bg-gradient-to-r blur-md",
                            bestForShade,
                          ].join(" ")}
                        />
                        <span
                          aria-hidden="true"
                          className={[
                            "pointer-events-none absolute -inset-x-1.5 bottom-0 -z-10 h-2 bg-gradient-to-r opacity-70",
                            bestForShade,
                          ].join(" ")}
                        />
                        {option.bestFor}
                      </span>
                    </div>
                    <ul
                      aria-label={`${option.title} benefits`}
                      className="mt-4 grid gap-2.5"
                    >
                      {option.benefits.map((benefit) => {
                        const BenefitIcon = benefit.included ? Check : X;

                        return (
                          <li
                            key={benefit.label}
                            className={[
                              "flex items-start gap-2.5 text-xs font-bold leading-5",
                              benefit.included
                                ? "text-slate-100"
                                : "text-slate-500",
                            ].join(" ")}
                          >
                            <span
                              className={[
                                "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                                benefit.included
                                  ? "border-cyan-200/35 bg-cyan-300/10 text-cyan-100"
                                  : "border-rose-200/20 bg-rose-300/5 text-rose-200/70",
                              ].join(" ")}
                            >
                              <BenefitIcon
                                aria-hidden="true"
                                className="h-3.5 w-3.5"
                                strokeWidth={3}
                              />
                            </span>
                            <span>{benefit.label}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                  <button
                    type="button"
                    aria-label={`Sign up for ${option.title}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      setSelectedPlanId(option.id);
                      setComingSoonPlanId(option.id);
                    }}
                    onFocus={() => setSelectedPlanId(option.id)}
                    className={`group/cta relative isolate inline-flex min-h-14 w-fit max-w-full items-center justify-start gap-4 self-start overflow-hidden rounded-xl border px-5 py-3 text-left text-slate-950 transition duration-300 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-100/80 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 lg:w-full lg:self-stretch lg:justify-between ${signupCtaTone}`}
                  >
                    <span
                      aria-hidden="true"
                      className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/44 to-transparent"
                    />
                    <span
                      aria-hidden="true"
                      className="absolute -left-14 top-0 h-full w-12 skew-x-[-18deg] bg-white/32 blur-sm transition duration-700 group-hover/cta:left-[115%]"
                    />
                    <span className="relative z-10 min-w-0">
                      <span className="block text-sm font-black uppercase leading-none tracking-[0.16em] text-white drop-shadow-[0_1px_0_rgba(2,7,19,0.24)]">
                        Sign Up
                      </span>
                      <span className="mt-1 block truncate text-[9px] font-black uppercase tracking-[0.14em] text-slate-950/68">
                        {option.title}
                      </span>
                    </span>
                    <span className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/35 bg-slate-950/18 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_0_16px_rgba(255,255,255,0.16)] transition group-hover/cta:translate-x-0.5 group-hover/cta:bg-slate-950/26">
                      <ArrowRight
                        aria-hidden="true"
                        className="h-4.5 w-4.5"
                        strokeWidth={2.8}
                      />
                    </span>
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </div>
      <TrainingPurchaseComingSoonModal
        planId={comingSoonPlanId}
        onClose={() => setComingSoonPlanId(null)}
      />
    </>
  );
}
