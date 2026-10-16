import type { SessionBalances } from "@/lib/member-services";

export type SessionBillingResult = {
  account: string;
  generation: number;
  balances: SessionBalances | null;
};

/** Remaining credits cannot establish a purchase, pack price, or payment status. */
export function sessionBillingSummary(account: string | null, result: SessionBillingResult | null, generation: number) {
  const authenticated = Boolean(account && account !== "local-preview");
  const current = authenticated && result?.account === account && result.generation === generation ? result : null;
  const loading = authenticated && !current;
  const balances = current?.balances;
  const label = (value: unknown) => loading ? "Loading" : typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value.toLocaleString() : "Unavailable";
  const hasBalance = balances && Object.values(balances).some(value => typeof value === "number" && Number.isSafeInteger(value) && value >= 0);
  return {
    references: [
      `Training credits: ${label(balances?.training)}`,
      `Stretch credits: ${label(balances?.stretch)}`,
      `Nutrition intro credits: ${label(balances?.nutrition)}`,
    ],
    stat: loading ? "Loading credits" : hasBalance ? "Account credits" : "Credits unavailable",
    helper: !authenticated ? "Sign in to view your account credits in Payments." : loading ? "Loading your account credits." : hasBalance ? "View or refresh account credits in Payments. Manage billing in the website client hub." : "Credits could not be loaded. Open Payments to retry.",
  };
}
