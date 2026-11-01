import { PLANNING_UPDATED } from "./store";

export type WeeklyRewardBalances = Record<"coins" | "bolts" | "sapphire" | "topaz" | "ruby" | "emerald", number>;
let current: { owner: string; balances: WeeklyRewardBalances } | null = null;

/** Memory only: never trust editable profile/localStorage values as currency. */
export function publishWeeklyRewards(owner: string | null, value: Record<string, number> | null) {
  const assets = ["coins", "bolts", "sapphire", "topaz", "ruby", "emerald"] as const;
  current = owner && value && assets.every(asset => Number.isSafeInteger(value[asset]) && value[asset] >= 0)
    ? { owner, balances: Object.fromEntries(assets.map(asset => [asset, value[asset]])) as WeeklyRewardBalances } : null;
  if (typeof window !== "undefined") window.dispatchEvent(new Event(PLANNING_UPDATED));
}
export const weeklyRewardsForOwner = (owner: string | null) => owner && current?.owner === owner ? current.balances : null;
