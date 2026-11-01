import { planningKeys, planningOwner, planningStatus, readPlanning } from "./store";
import { sessionRewardSummary, sessionRewardLabel } from "./sessionRewards";
import { weeklyRewardsForOwner } from "./weeklyRewardBalances";

/** A saved Profile point cache is not an award ledger or a redeemable wallet. */
export function dashboardRewardEvidence(profile: unknown, account?: { signedIn: boolean; synced: boolean }) {
  const record = profile && typeof profile === "object" && !Array.isArray(profile) ? profile as Record<string, unknown> : null;
  const accountBalance = (key: string) => {
    if (!account?.signedIn) return null;
    if (!record && profile != null) return null;
    if (!record || !Object.prototype.hasOwnProperty.call(record, key)) return account.synced ? 0 : null;
    const value = record?.[key];
    const number = typeof value === "number" ? value : typeof value === "string" && /^\d+$/.test(value.trim()) ? Number(value) : null;
    return number !== null && Number.isSafeInteger(number) && number >= 0 ? number : null;
  };
  const points = sessionRewardSummary(profile, []).soundPoints;
  const accountPoints = account?.signedIn ? accountBalance("soundPoints") : points;
  const weekly = account?.signedIn ? weeklyRewardsForOwner(planningOwner()) : null;
  return { accountLinked: !!account?.signedIn, points: weekly?.bolts ?? accountPoints, pointsLabel: sessionRewardLabel(weekly?.bolts ?? accountPoints), tokensLabel: sessionRewardLabel(weekly?.coins ?? accountBalance("soundTokens")), emeraldsLabel: sessionRewardLabel(weekly?.emerald ?? accountBalance("emeralds")), sapphireLabel: sessionRewardLabel(weekly?.sapphire ?? null), topazLabel: sessionRewardLabel(weekly?.topaz ?? null), rubyLabel: sessionRewardLabel(weekly?.ruby ?? null), levelLabel: "Unavailable",
    canClaim: !!weekly, description: weekly ? "Verified weekly reward balances. Gems unlock, coins purchase, and bolts cover future bracket participation. Current earning challenges remain free." : account?.signedIn
      ? `${account.synced ? "Connected to your account." : "Showing saved account rewards; reconnect to refresh."} Award history and redeemable balances are not verified. Claims are not connected.`
      : points === null ? "Reward ledger unavailable. Balances, levels and claims are not verified." : "Recorded Profile points only. Award history, redeemable balance, levels and claims are not verified." };
}
export type DashboardRewardEvidence = ReturnType<typeof dashboardRewardEvidence>;
export const dashboardRewardEvidenceSnapshot = () => {
  const owner = planningOwner();
  return JSON.stringify(dashboardRewardEvidence(readPlanning(planningKeys.profile, null), {
    signedIn: !!owner && owner !== "local-preview",
    synced: planningStatus === "Synced",
  }));
};
export const serverDashboardRewardEvidence = () => JSON.stringify(dashboardRewardEvidence(null));
