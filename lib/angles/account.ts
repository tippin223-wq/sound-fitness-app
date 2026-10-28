import { supabase } from "@/lib/supabaseClient";
import { historyKey, isResult, readHistory, type Result } from "./assessment";

export type AnglesMember = {
  id: string;
  email: string;
  role: "coach" | "training_user";
  enrollmentSource: "angles" | "sound_fitness";
  accessPlan: "free" | "angles" | "sound_fitness";
};

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
  const { data: context, error: contextError } = await supabase.rpc("get_angles_account_context");
  if (contextError) throw contextError;
  if (context?.id !== data.user.id || !["coach", "training_user"].includes(context.role) ||
      !["angles", "sound_fitness"].includes(context.enrollmentSource) ||
      !["free", "angles", "sound_fitness"].includes(context.accessPlan)) {
    throw Error("Angles account could not be verified.");
  }
  return { user: { ...context, email: data.user.email ?? "Sound Fitness member" } as AnglesMember, factor: null };
}

/** Uses the shared identity provider, without creating a coaching enrollment. */
export async function registerAnglesAccount(email: string, password: string, fullName: string) {
  if (password.length < 8) throw Error("Use a password with at least 8 characters.");
  const { error } = await supabase.auth.signUp({ email: email.trim(), password,
    options: { data: { full_name: fullName.trim(), signup_product: "angles" } } });
  if (error) throw error;
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
