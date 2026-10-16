import { planningOwner, planningAccountGeneration, planningRecordVersion } from "./store";

/** Each mounted consumer owns a guard; callbacks never write planning data. */
export function createPlanningRefreshGuard(keys: readonly string[]) {
  let sequence = 0;
  let active = true;
  let displayedSource: string | null = null;
  const sourceVersion = () => JSON.stringify(keys.map(planningRecordVersion));
  return {
    begin() {
      const account = planningOwner(), generation = planningAccountGeneration(), version = sourceVersion();
      const source = JSON.stringify([account, generation, version]);
      const localChanged = active && source !== displayedSource;
      displayedSource = source;
      return { sequence: ++sequence, account, generation, version, localChanged };
    },
    current(ticket: { sequence: number; account: string | null; generation: number; version: string }) {
      return active && ticket.sequence === sequence && ticket.account === planningOwner() && ticket.generation === planningAccountGeneration() && ticket.version === sourceVersion();
    },
    cancel() { active = false; sequence++; },
    activate() { active = true; sequence++; },
  };
}
