import { PROGRAM_COMMON_REWARDS, PROGRAM_COSMETICS } from "./programRewardCatalog";

export const PROGRAM_REWARD_VERSION = 1;
export const PROGRAM_POINTS_PER_LEVEL = 100;
export type ProgramRewardDefinition = { programId: string; title: string; totalLevels: number };
type CommonAsset = (typeof PROGRAM_COMMON_REWARDS)[number]["asset"];
type CurrencyReward = { kind: "currency"; asset: CommonAsset; amount: number };
type CosmeticReward = { kind: "cosmetic"; cosmeticId: string; amount: 1 };
export type ProgramLevelReward = { id: string; level: number; award: CurrencyReward | CosmeticReward };
export type ProgramRewardTrack = ProgramRewardDefinition & {
  version: 1;
  status: "draft";
  rewards: ProgramLevelReward[];
};

/** A whole-level budget must be achievable from the actual planned activities.
 * Do not silently round up and create an unreachable final level. */
export function programLevelBudget(workouts: number, supportingPoints: number): number {
  if (!Number.isSafeInteger(workouts) || workouts < 1 || !Number.isSafeInteger(supportingPoints) || supportingPoints < 0) {
    throw new Error("A program needs a positive workout count and nonnegative supporting points.");
  }
  const points = workouts * PROGRAM_POINTS_PER_LEVEL + supportingPoints;
  if (!Number.isSafeInteger(points) || points % PROGRAM_POINTS_PER_LEVEL) throw new Error("Balance the planned supporting points to a whole level before publishing.");
  const levels = points / PROGRAM_POINTS_PER_LEVEL;
  if (levels > 1000) throw new Error("Review programs longer than 1000 levels before allocating rewards.");
  return levels;
}

const rewardId = (programId: string, level: number) => `program-reward:v1:${encodeURIComponent(programId)}:${level}`;

function checkDefinition(program: ProgramRewardDefinition) {
  if (!program || typeof program.programId !== "string" || !program.programId.trim() || program.programId !== program.programId.trim() || program.programId.length > 160
    || typeof program.title !== "string" || !program.title.trim() || program.title.length > 200
    || !Number.isSafeInteger(program.totalLevels) || program.totalLevels < 1 || program.totalLevels > 1000) {
    throw new Error("A stable program ID, title, and whole level budget are required.");
  }
}

/** Allocate a draft once in trusted program-authoring code, then persist the
 * entire result. Supply saved tracks on subsequent calls: opening the popup,
 * enrolling another member, or adding a program must never reroll old rewards.
 * This deliberately performs no currency or inventory writes. Live publication
 * still needs asset fulfillment and a server-verified completion award ledger. */
export function allocateProgramRewardTracks(
  programs: readonly ProgramRewardDefinition[],
  savedTracks: readonly ProgramRewardTrack[],
  draw: () => number,
): ProgramRewardTrack[] {
  const tracks = new Map<string, ProgramRewardTrack>();
  const usedCosmetics = new Set<string>();
  const catalog = new Set(PROGRAM_COSMETICS.map(item => item.id));
  for (const track of savedTracks) {
    checkDefinition(track);
    if (tracks.has(track.programId) || track.version !== PROGRAM_REWARD_VERSION || track.status !== "draft"
      || !Array.isArray(track.rewards) || track.rewards.length !== track.totalLevels) throw new Error("Saved reward tracks need review; originals were not changed.");
    track.rewards.forEach((reward, index) => {
      const level = index + 1;
      if (!reward || reward.level !== level || reward.id !== rewardId(track.programId, level) || !reward.award) throw new Error("Saved level rewards need review.");
      if (level % 5 === 0) {
        if (reward.award.kind !== "cosmetic" || reward.award.amount !== 1 || !catalog.has(reward.award.cosmeticId) || usedCosmetics.has(reward.award.cosmeticId)) {
          throw new Error("Every fifth level needs a different catalog item across all programs.");
        }
        usedCosmetics.add(reward.award.cosmeticId);
      } else {
        const award = reward.award;
        if (award.kind !== "currency" || !PROGRAM_COMMON_REWARDS.some(item => item.asset === award.asset && item.amount === award.amount)) {
          throw new Error("Ordinary levels require a standard currency amount.");
        }
      }
    });
    tracks.set(track.programId, structuredClone(track));
  }
  const requested = new Set<string>();
  for (const program of programs) {
    checkDefinition(program);
    if (requested.has(program.programId)) throw new Error("A program appears more than once.");
    requested.add(program.programId);
    const saved = tracks.get(program.programId);
    if (saved && (saved.totalLevels !== program.totalLevels || saved.title !== program.title)) {
      throw new Error("Existing tracks are fixed. Create a new program version rather than changing earned milestones.");
    }
  }
  const pending = programs.filter(program => !tracks.has(program.programId)).sort((a, b) => a.programId.localeCompare(b.programId, "en"));
  const available = PROGRAM_COSMETICS.filter(item => !usedCosmetics.has(item.id));
  const required = pending.reduce((count, program) => count + Math.floor(program.totalLevels / 5), 0);
  if (required > available.length) throw new Error(`Create ${required - available.length} more distinct cosmetic designs before allocating these programs; items will not be recycled.`);
  let nextCosmetic = 0;
  for (const program of pending) {
    const rewards: ProgramLevelReward[] = [];
    for (let level = 1; level <= program.totalLevels; level++) {
      let award: ProgramLevelReward["award"];
      if (level % 5 === 0) {
        award = { kind: "cosmetic", cosmeticId: available[nextCosmetic++].id, amount: 1 };
      } else {
        const roll = draw();
        if (!Number.isFinite(roll) || roll < 0 || roll >= 1) throw new Error("Reward draws must be between zero and one, excluding one.");
        let cumulative = 0;
        const reward = PROGRAM_COMMON_REWARDS.find(item => { cumulative += item.weight; return roll * 100 < cumulative; });
        if (!reward) throw new Error("The currency reward pool needs review.");
        award = { kind: "currency", asset: reward.asset, amount: reward.amount };
      }
      rewards.push({ id: rewardId(program.programId, level), level, award });
    }
    tracks.set(program.programId, { ...program, version: PROGRAM_REWARD_VERSION, status: "draft", rewards });
  }
  return [...tracks.values()];
}
