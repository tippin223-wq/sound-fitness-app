export type PaymentCheck =
  | { state: "paid"; planId: "online-coaching"; email: string | null }
  | { state: "unpaid" }
  | { state: "unverified" };
const record = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === "object" && !Array.isArray(value));
export const validCheckoutSessionId = (value: unknown): value is string => typeof value === "string" && value.length <= 255 && /^cs_(?:(?:test|live)_)?[a-zA-Z0-9]+$/.test(value);

/** A receipt check only; durable account entitlements require webhook fulfillment. */
export function checkEnrollmentSession(session: unknown, priceId: string | undefined): PaymentCheck {
  if (!priceId || !record(session) || session.mode !== "subscription" || !record(session.metadata) || session.metadata.planId !== "online-coaching") return { state: "unverified" };
  const items = session.line_items;
  if (!record(items) || items.has_more !== false || !Array.isArray(items.data) || items.data.length !== 1) return { state: "unverified" };
  const item = items.data[0];
  if (!record(item) || item.quantity !== 1 || !record(item.price) || item.price.id !== priceId) return { state: "unverified" };
  if (session.status !== "complete") return session.status === "open" || session.status === "expired" ? { state: "unpaid" } : { state: "unverified" };
  if (session.payment_status === "unpaid") return { state: "unpaid" };
  if (!["paid", "no_payment_required"].includes(String(session.payment_status))) return { state: "unverified" };
  const subscription = session.subscription;
  if (!(typeof subscription === "string" && subscription.startsWith("sub_")) && !(record(subscription) && typeof subscription.id === "string" && subscription.id.startsWith("sub_"))) return { state: "unverified" };
  const email = record(session.customer_details) && typeof session.customer_details.email === "string" ? session.customer_details.email : null;
  return { state: "paid", planId: "online-coaching", email };
}
