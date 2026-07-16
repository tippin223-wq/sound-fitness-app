import type { Stripe } from "@stripe/stripe-js";
import { loadStripe } from "@stripe/stripe-js";

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

let stripePromise: Promise<Stripe | null> | null = null;

/** True when the browser has a Stripe publishable key to work with. */
export function isStripeConfigured() {
  return Boolean(publishableKey);
}

/**
 * Lazily load Stripe.js on the client. Returns null (never throws) when no
 * publishable key is configured, so the checkout UI can render a clear
 * "not configured yet" state instead of crashing.
 */
export function getStripe(): Promise<Stripe | null> {
  if (!publishableKey) return Promise.resolve(null);
  stripePromise ??= loadStripe(publishableKey);
  return stripePromise;
}
