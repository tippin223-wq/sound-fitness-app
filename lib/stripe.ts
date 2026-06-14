import Stripe from "stripe";

let stripeClient: Stripe | null = null;

export function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured.");
  }

  stripeClient ??= new Stripe(secretKey, {
    appInfo: {
      name: "Sound Fitness",
      version: "0.1.0",
    },
  });

  return stripeClient;
}
