export const REWARD_RARITIES = [
  { id: "common", label: "Common", color: "#cbd5e1", unlockDays: 1 },
  { id: "uncommon", label: "Uncommon", color: "#4ade80", unlockDays: 2 },
  { id: "rare", label: "Rare", color: "#60a5fa", unlockDays: 3 },
  { id: "epic", label: "Epic", color: "#c084fc", unlockDays: 4 },
  { id: "legendary", label: "Legendary", color: "#fbbf24", unlockDays: 5 },
] as const;
export const WEEKLY_REWARDS = [
  { id: "sound-points", label: "Coins", tier: "common", minimum: 0 },
  { id: "recovery-credit", label: "Bolts", tier: "common", minimum: 0 },
  { id: "emerald", label: "Gems", tier: "rare", minimum: 2 },
  { id: "rare-crate", label: "Reward Chest", tier: "rare", minimum: 2 },
  { id: "clothing", label: "Avatar Clothing", tier: "uncommon", minimum: 1 },
  { id: "accessory", label: "Avatar Accessory", tier: "uncommon", minimum: 1 },
  { id: "sonic-surge", label: "Avatar Effect", tier: "epic", minimum: 3 },
  { id: "streak-shield", label: "Streak Shield", tier: "uncommon", minimum: 1, maximum: 1 },
  { id: "boost-chip", label: "Boost Chip", tier: "uncommon", minimum: 1 },
] as const;
// Percentages: each additional distinct workout day shifts probability upward.
// Seven is a weekly cap, not a recommendation to train without recovery days.
export const WEEKLY_RARITY_ODDS = [
  [100, 0, 0, 0, 0],
  [70, 30, 0, 0, 0],
  [50, 32, 18, 0, 0],
  [38, 32, 23, 7, 0],
  [28, 30, 27, 12, 3],
  [20, 29, 31, 15, 5],
  [15, 25, 33, 20, 7],
] as const;
export function weeklyRarityOdds(days: number): readonly number[] {
  if (!Number.isInteger(days) || days < 1) return [0, 0, 0, 0, 0];
  return WEEKLY_RARITY_ODDS[Math.min(days, 7) - 1];
}
export function selectWeeklyTestReward(days: number, tierRoll: number, itemRoll: number) {
  const odds = weeklyRarityOdds(days);
  if (!odds.some(Boolean) || tierRoll < 0 || tierRoll >= 1 || itemRoll < 0 || itemRoll >= 1) throw new Error("A qualifying day and valid rolls are required");
  let cumulative = 0;
  const tier = odds.findIndex(chance => { cumulative += chance / 100; return tierRoll < cumulative; });
  const candidates = WEEKLY_REWARDS.map((reward, index) => ({ ...reward, index })).filter(reward => reward.minimum <= tier && (!("maximum" in reward) || tier <= reward.maximum));
  return { tier, result: candidates[Math.floor(itemRoll * candidates.length)].index };
}

/** Display quantities. Live currency awards are selected and credited by the
 * claim RPC; unfinished inventory prizes remain outside its draw. */
export function weeklyRewardAward(result: number, tier: number) {
  const reward = WEEKLY_REWARDS[result];
  if (!reward || !Number.isInteger(tier) || tier < reward.minimum || tier > 4 || ("maximum" in reward && tier > reward.maximum)) throw new Error("Invalid reward rarity");
  const grade = REWARD_RARITIES[tier].label;
  switch (reward.id) {
    case "sound-points": return { amount: `${[25, 50, 100, 200, 500][tier]} coins`, detail: "Use coins to purchase items after unlocking them with the appropriate gems." };
    case "recovery-credit": return { amount: `${[1, 2, 3, 5, 10][tier]} bolts`, detail: "Bolts cover participation in future fitness brackets after unlocking them with rubies. Current earning challenges remain free." };
    case "emerald": return { amount: `${[0, 0, 1, 2, 5][tier]} gems`, detail: "Gems go directly to your account. Their uses will be defined separately." };
    case "rare-crate": return { amount: ["", "", "100 coins + 3 bolts + 1 gem", "250 coins + 5 bolts + 2 gems", "500 coins + 10 bolts + 5 gems"][tier], detail: "One chest containing all three listed currencies." };
    case "clothing": return { amount: `1 ${grade.toLowerCase()} clothing item`, detail: "One shirt, hat, or pair of shoes from this rarity’s collection. Specific designs are next." };
    case "accessory": return { amount: `1 ${grade.toLowerCase()} accessory`, detail: "One necklace, wristband, or other accessory from this rarity’s collection. Specific items are next." };
    case "sonic-surge": return { amount: `1 ${grade.toLowerCase()} avatar effect`, detail: "One emote, aura, or celebration effect from this rarity’s collection. Specific effects are next." };
    case "streak-shield": return { amount: "1 streak shield", detail: "Uncommon only. Protects against one weekly streak reset. It never adds workout credit or earns another spin." };
    case "boost-chip": return { amount: "1 bonus challenge", detail: `Complete the optional challenge to earn ${[0, 50, 100, 200, 400][tier]} extra coins. The challenge itself will be configured next.` };
  }
}
