import SubscriptionCheckoutClient from "@/components/onboarding/SubscriptionCheckoutClient";
import {
  DEFAULT_APP_PLAN_ID,
  type AppPlanId,
  isAppPlanId,
} from "@/lib/appPlans";

type SubscriptionPageProps = {
  searchParams: Promise<{
    plan?: string | string[];
  }>;
};

export default async function SubscriptionPage({
  searchParams,
}: SubscriptionPageProps) {
  const params = await searchParams;
  const requestedPlan = Array.isArray(params.plan)
    ? params.plan[0]
    : params.plan;
  const initialPlan: AppPlanId = isAppPlanId(requestedPlan)
    ? requestedPlan
    : DEFAULT_APP_PLAN_ID;
  const publishableKey =
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ??
    process.env.STRIPE_PUBLISHABLE_KEY ??
    "";

  return (
    <SubscriptionCheckoutClient
      initialPlan={initialPlan}
      publishableKey={publishableKey}
    />
  );
}
