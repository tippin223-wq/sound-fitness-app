import { planningKeys, readPlanning } from "./store";
import { sessionRewardSummary, sessionRewardLabel } from "./sessionRewards";

/** A saved Profile point cache is not an award ledger or a redeemable wallet. */
export function dashboardRewardEvidence(profile: unknown) {
  const points = sessionRewardSummary(profile, []).soundPoints;
  return { points, pointsLabel: points === null ? "Unavailable" : sessionRewardLabel(points) + " recorded", tokensLabel: "Unavailable", emeraldsLabel: "Unavailable", levelLabel: "Unavailable",
    canClaim: false, description: points === null ? "Reward ledger unavailable. Balances, levels and claims are not verified." : "Recorded Profile points only. Award history, redeemable balance, levels and claims are not verified." };
}
export type DashboardRewardEvidence = ReturnType<typeof dashboardRewardEvidence>;
export const dashboardRewardEvidenceSnapshot = () => JSON.stringify(dashboardRewardEvidence(readPlanning(planningKeys.profile, null)));
export const serverDashboardRewardEvidence = () => JSON.stringify(dashboardRewardEvidence(null));
