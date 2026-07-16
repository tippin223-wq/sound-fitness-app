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

  return <SubscriptionCheckoutClient initialPlan={initialPlan} />;
}
