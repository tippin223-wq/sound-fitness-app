import {
  Gem,
  Smartphone,
  UsersRound,
  Zap,
  type LucideIcon,
} from "lucide-react";

export type AppPlanId = "app-only" | "hybrid-app" | "online-coaching";

export type AppPlan = {
  id: AppPlanId;
  name: string;
  price: string;
  cadence: string;
  summary: string;
  detail: string;
  bestFor: string;
  stripePriceEnv: string;
  Icon: LucideIcon;
  benefits: string[];
};

export const APP_PLANS: AppPlan[] = [
  {
    id: "app-only",
    name: "App Only",
    price: "$29",
    cadence: "/mo",
    summary: "Self-guided app membership",
    detail:
      "Dashboard access, tracking tools, plan visibility, and self-guided support.",
    bestFor: "Independent training",
    stripePriceEnv: "STRIPE_PRICE_APP_ONLY",
    Icon: Smartphone,
    benefits: [
      "Dashboard + tracking tools",
      "Plan visibility between sessions",
      "Self-guided app support",
    ],
  },
  {
    id: "hybrid-app",
    name: "Hybrid App",
    price: "$79",
    cadence: "/mo",
    summary: "App plus rewards bundle",
    detail:
      "App access with blue Sound Points, Gems for technique support, and Treasure Tokens for in-app purchases.",
    bestFor: "Rewards + technique support",
    stripePriceEnv: "STRIPE_PRICE_HYBRID_APP",
    Icon: Zap,
    benefits: [
      "Everything in App Only",
      "Blue Sound Points rewards",
      "Gems for technique support",
      "Treasure Tokens for in-app purchases",
    ],
  },
  {
    id: "online-coaching",
    name: "Online Coaching",
    price: "$199",
    cadence: "/mo",
    summary: "Remote coaching membership",
    detail:
      "Remote coaching, programming, check-ins, messaging, and a larger Sound Points, Gems, and Treasure Tokens bundle in the app.",
    bestFor: "Coach-led + more rewards",
    stripePriceEnv: "STRIPE_PRICE_ONLINE_COACHING",
    Icon: UsersRound,
    benefits: [
      "Coach-led programming",
      "Check-ins and app messaging",
      "Dashboard + progress tracking",
      "Larger Sound Points, Gems, and Treasure Tokens bundle",
    ],
  },
];

export const DEFAULT_APP_PLAN_ID: AppPlanId = "online-coaching";

export function isAppPlanId(value: string | null | undefined): value is AppPlanId {
  return APP_PLANS.some((plan) => plan.id === value);
}

export function getAppPlan(value: string | null | undefined) {
  return (
    APP_PLANS.find((plan) => plan.id === value) ??
    APP_PLANS.find((plan) => plan.id === DEFAULT_APP_PLAN_ID) ??
    APP_PLANS[0]
  );
}

export function getPlanPriceEnvName(planId: AppPlanId) {
  return getAppPlan(planId).stripePriceEnv;
}

export function getPlanPriceId(planId: AppPlanId) {
  return process.env[getPlanPriceEnvName(planId)];
}

export function getPlanIcon(planId: AppPlanId) {
  if (planId === "hybrid-app") {
    return Gem;
  }

  return getAppPlan(planId).Icon;
}
