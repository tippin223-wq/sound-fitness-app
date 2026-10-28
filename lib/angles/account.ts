import { supabase } from "@/lib/supabaseClient";
import { historyKey, isResult, readHistory, type Result } from "./assessment";

export async function verifiedAccount() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { user: null, factor: null as string | null };
  const assurance = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (assurance.error) throw assurance.error;
  if (assurance.data.nextLevel === "aal2" && assurance.data.currentLevel !== "aal2") {
    const factors = await supabase.auth.mfa.listFactors();
    if (factors.error) throw factors.error;
    return { user: null, factor: factors.data.totp.find(f => f.status === "verified")?.id ?? "unsupported" };
  }
  return { user: { id: data.user.id, email: data.user.email ?? "Sound Fitness member" }, factor: null };
}

function equal(a: Result, b: Result) {
  return (Object.keys(a) as (keyof Result)[]).every(key => a[key] === b[key]);
}

/** Explicit summary sync only. Frames and videos are never sent to Supabase. */
export async function syncHistory(owner: string) {
  if ((await verifiedAccount()).user?.id !== owner) throw Error("Sign in to this account before syncing.");
  const local = readHistory(localStorage, owner);
  const remote = new Map<string, Result>();
  const deleted = new Set<string>();
  const seen = new Set<string>();
  for (let page = 0; ; page++) {
    if (page >= 100) throw Error("History is too large to sync in one visit. No local data was replaced.");
    const { data, error } = await supabase.from("angles_assessments").select("profile_id,id,summary,deleted")
      .eq("profile_id", owner).order("id").range(page * 500, page * 500 + 499);
    if (error) throw error;
    for (const row of data) {
      if (row.profile_id !== owner || seen.has(row.id) || typeof row.deleted !== "boolean") throw Error("Invalid cloud History response.");
      seen.add(row.id);
      if (row.deleted) deleted.add(row.id);
      else {
        if (!isResult(row.summary) || row.summary.id !== row.id) throw Error("Invalid cloud summary. Browser History was preserved.");
        remote.set(row.id, row.summary);
      }
    }
    if (data.length < 500) break;
  }
  for (const result of local) {
    if (deleted.has(result.id)) continue;
    const existing = remote.get(result.id);
    if (existing && !equal(result, existing)) throw Error("Conflicting session summaries require review. Originals were preserved.");
    if (existing) continue;
    const { data, error } = await supabase.rpc("save_angles_assessment", { expected_owner: owner, assessment: result });
    if (error) throw error;
    if (data?.id !== result.id || data?.profile_id !== owner || typeof data.deleted !== "boolean") throw Error("Cloud save was not confirmed.");
    if (data.deleted) deleted.add(result.id);
    else {
      if (!isResult(data.summary) || !equal(result, data.summary)) throw Error("Cloud summary did not match the saved result.");
      remote.set(result.id, data.summary);
    }
  }
  if ((await verifiedAccount()).user?.id !== owner) throw Error("Account changed during sync. Browser History was preserved.");
  // Re-read before the synchronous commit so results saved while the network was busy survive.
  for (const result of readHistory(localStorage, owner)) {
    if (deleted.has(result.id)) continue;
    const existing = remote.get(result.id);
    if (existing && !equal(existing, result)) throw Error("History changed during sync. Originals were preserved.");
    remote.set(result.id, result);
  }
  const merged = [...remote.values()].filter(r => !deleted.has(r.id));
  localStorage.setItem(historyKey(owner), JSON.stringify(merged));
  return merged;
}
