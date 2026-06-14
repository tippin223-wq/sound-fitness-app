import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripeClient } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return NextResponse.json(
      { error: "STRIPE_WEBHOOK_SECRET is not configured." },
      { status: 503 },
    );
  }

  const payload = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing Stripe signature." },
      { status: 400 },
    );
  }

  let event: Stripe.Event;

  try {
    event = getStripeClient().webhooks.constructEvent(
      payload,
      signature,
      webhookSecret,
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Stripe webhook signature verification failed.";

    return NextResponse.json({ error: message }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      console.info("Stripe checkout completed", {
        sessionId: session.id,
        customerId: session.customer,
        subscriptionId: session.subscription,
        planId: session.metadata?.planId,
      });
      break;
    }
    case "invoice.payment_succeeded": {
      const invoice = event.data.object as Stripe.Invoice;
      console.info("Stripe invoice paid", {
        invoiceId: invoice.id,
        customerId: invoice.customer,
      });
      break;
    }
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      console.info("Stripe subscription canceled", {
        subscriptionId: subscription.id,
        customerId: subscription.customer,
      });
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
