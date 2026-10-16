import { NextResponse } from "next/server";
import {
  getAppPlan,
  getPlanPriceEnvName,
  getPlanPriceId,
  isAppPlanId,
} from "@/lib/appPlans";
import { ROUTES } from "@/lib/routes";
import { getStripeClient } from "@/lib/stripe";
import { checkoutOrigin, CheckoutOriginError } from "@/lib/checkoutOrigin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Could not read checkout request." },
      { status: 400 },
    );
  }

  if (!body || typeof body !== "object" || Array.isArray(body) || !("planId" in body) || typeof body.planId !== "string" || !isAppPlanId(body.planId)) {
    return NextResponse.json(
      { error: "Choose a valid Sound Fitness plan." },
      { status: 400 },
    );
  }

  let origin: string;
  try { origin = checkoutOrigin(request); }
  catch (cause) {
    return NextResponse.json({ error: cause instanceof Error ? cause.message : "Checkout address is unavailable." }, { status: cause instanceof CheckoutOriginError ? cause.status : 503 });
  }

  if (body.planId !== "online-coaching") {
    return NextResponse.json(
      {
        error:
          "Online Coaching is the only Sound Fitness enrollment option available right now.",
      },
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
    const returnUrl = `${origin}${ROUTES.onboarding.confirmation}?session_id={CHECKOUT_SESSION_ID}&plan=${selectedPlan.id}`;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      ui_mode: "elements",
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
