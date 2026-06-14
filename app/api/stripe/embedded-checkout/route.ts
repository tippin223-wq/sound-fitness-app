import { NextResponse } from "next/server";
import {
  getAppPlan,
  getPlanPriceEnvName,
  getPlanPriceId,
  isAppPlanId,
} from "@/lib/appPlans";
import { ROUTES } from "@/lib/routes";
import { getStripeClient } from "@/lib/stripe";

export const runtime = "nodejs";

type EmbeddedCheckoutRequest = {
  planId?: string;
};

function getRequestOrigin(request: Request) {
  return (
    request.headers.get("origin") ??
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.APP_URL ??
    "http://localhost:3000"
  );
}

export async function POST(request: Request) {
  let body: EmbeddedCheckoutRequest;

  try {
    body = (await request.json()) as EmbeddedCheckoutRequest;
  } catch {
    return NextResponse.json(
      { error: "Could not read checkout request." },
      { status: 400 },
    );
  }

  if (!isAppPlanId(body.planId)) {
    return NextResponse.json(
      { error: "Choose a valid Sound Fitness plan." },
      { status: 400 },
    );
  }

  const selectedPlan = getAppPlan(body.planId);
  const priceId = getPlanPriceId(selectedPlan.id);

  if (!priceId) {
    return NextResponse.json(
      {
        error: `Stripe Price ID is missing. Add ${getPlanPriceEnvName(
          selectedPlan.id,
        )} to your environment.`,
      },
      { status: 503 },
    );
  }

  try {
    const stripe = getStripeClient();
    const origin = getRequestOrigin(request);
    const returnUrl = `${origin}${ROUTES.onboarding.confirmation}?session_id={CHECKOUT_SESSION_ID}&plan=${selectedPlan.id}`;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      ui_mode: "embedded_page",
      line_items: [{ price: priceId, quantity: 1 }],
      return_url: returnUrl,
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      metadata: {
        planId: selectedPlan.id,
        planName: selectedPlan.name,
      },
      subscription_data: {
        metadata: {
          planId: selectedPlan.id,
          planName: selectedPlan.name,
        },
      },
    });

    if (!session.client_secret) {
      return NextResponse.json(
        { error: "Stripe did not return a checkout client secret." },
        { status: 502 },
      );
    }

    return NextResponse.json({ clientSecret: session.client_secret });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Stripe checkout could not be started.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
