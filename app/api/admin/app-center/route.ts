import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { APP_PLANS, getPlanPriceId } from "@/lib/appPlans";
import { getStripeClient } from "@/lib/stripe";
import type { AppAdminBilling, AppAdminSnapshot, AppAdminUser } from "@/lib/appAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  const token = request.headers.get("authorization")?.match(/^Bearer (\S+)$/i)?.[1];
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!token || !url || !anon) return NextResponse.json({ error: "Admin sign-in required." }, { status: 401, headers });
  const auth = createClient(url, anon, { auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: { user }, error } = await auth.auth.getUser(token);
  if (error || !user) return NextResponse.json({ error: "Admin session could not be verified." }, { status: 401, headers });
  const { data: profile, error: roleError } = await auth.from("profiles").select("role").eq("id", user.id).single();
  if (roleError || profile?.role !== "admin") return NextResponse.json({ error: "Admin access required." }, { status: 403, headers });
  const assurance = await auth.auth.mfa.getAuthenticatorAssuranceLevel(token);
  if (assurance.error || (assurance.data.nextLevel === "aal2" && assurance.data.currentLevel !== "aal2")) {
    return NextResponse.json({ error: "Complete account verification before opening app administration." }, { status: 403, headers });
  }

  const snapshot: AppAdminSnapshot = {
    checkedAt: new Date().toISOString(),
    users: { records: [], issues: [], partial: false },
    billing: { plans: [], issues: [], partial: false },
  };

  await Promise.all([loadUsers(), loadBilling()]);
  return NextResponse.json(snapshot, { headers });

  async function loadUsers() {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!key) { snapshot.users.issues.push("App account reporting is not connected."); return; }
    const db = createClient(url!, key, { auth: { persistSession: false } });
    // Only enrollment/activity identifiers are read; no personal training payloads.
    const [planning, angles] = await Promise.all([
      db.from("planning_documents").select("profile_id,updated_at").order("profile_id").limit(501),
      db.from("angles_accounts").select("profile_id,created_at,access_plan,access_expires_at").order("profile_id").limit(501),
    ]);
    const accounts = new Map<string, { products: Set<string>; last: string | null; access: string }>();
    const add = (id: string, product: string, time: string | null, access: string) => {
      const record = accounts.get(id) ?? { products: new Set<string>(), last: null, access: "Not verified" };
      record.products.add(product);
      if (time && (!record.last || Date.parse(time) > Date.parse(record.last))) record.last = time;
      if (product === "Angles") record.access = access;
      accounts.set(id, record);
    };
    if (planning.error) snapshot.users.issues.push("Training account activity could not be loaded.");
    else {
      snapshot.users.partial ||= planning.data.length > 500;
      planning.data.slice(0, 500).forEach(r => add(r.profile_id, "Sound Fitness", r.updated_at, "Not verified"));
    }
    if (angles.error) snapshot.users.issues.push("Angles enrollment could not be loaded.");
    else {
      snapshot.users.partial ||= angles.data.length > 500;
      angles.data.slice(0, 500).forEach(r => add(r.profile_id, "Angles", r.created_at,
        r.access_expires_at && Date.parse(r.access_expires_at) <= Date.now() ? "Angles grant expired" : `Angles: ${r.access_plan}`));
    }
    const ids = Array.from(accounts.keys());
    for (let offset = 0; offset < ids.length; offset += 100) {
      const result = await db.from("profiles").select("id,full_name,email,role").in("id", ids.slice(offset, offset + 100));
      if (result.error) { snapshot.users.issues.push("Some app account profiles could not be loaded."); snapshot.users.partial = true; continue; }
      result.data.forEach(p => {
        const record = accounts.get(p.id)!;
        const row: AppAdminUser = { id: p.id, name: p.full_name || "Unnamed account", email: p.email || "Not recorded", role: p.role || "Unknown", products: Array.from(record.products), lastActivity: record.last, access: record.access };
        snapshot.users.records.push(row);
      });
    }
  }

  async function loadBilling() {
    const configured = APP_PLANS.map(p => [getPlanPriceId(p.id), p.id] as const).filter(([price]) => Boolean(price));
    const prices = new Map(configured.filter(([price]) => configured.filter(([other]) => other === price).length === 1));
    if (prices.size !== configured.length) snapshot.billing.issues.push("Some app plans share an ambiguous billing price and are excluded.");
    if (!prices.size) { snapshot.billing.issues.push("Unambiguous app billing price connections are not configured."); return; }
    const plans = new Map<string, AppAdminBilling>(APP_PLANS.map(p => [p.id, { planId: p.id, active: 0, trialing: 0, pastDue: 0, canceled: 0, paidCheckouts: 0, checkoutTotals: {} }]));
    for (const plan of APP_PLANS) if (!getPlanPriceId(plan.id)) snapshot.billing.issues.push(`${plan.name} billing is not connected.`);
    try {
      const stripe = getStripeClient();
      let cursor: string | undefined;
      for (let page = 0; page < 10; page++) {
        const result = await stripe.subscriptions.list({ limit: 100, status: "all", ...(cursor ? { starting_after: cursor } : {}) });
        for (const subscription of result.data) {
          // Never infer product ownership from a name, email, or amount.
          if (subscription.items.has_more) { snapshot.billing.partial = true; continue; }
          const matches = new Set(subscription.items.data.map(item => prices.get(item.price.id)).filter(Boolean));
          for (const id of matches) {
            const plan = plans.get(id!)!;
            if (subscription.status === "active") plan.active++;
            if (subscription.status === "trialing") plan.trialing++;
            if (subscription.status === "past_due" || subscription.status === "unpaid") plan.pastDue++;
            if (subscription.status === "canceled") plan.canceled++;
          }
        }
        if (!result.has_more) break;
        if (page === 9) snapshot.billing.partial = true;
        cursor = result.data.at(-1)?.id;
      }
      cursor = undefined;
      for (let page = 0; page < 10; page++) {
        const result = await stripe.checkout.sessions.list({ limit: 100, expand: ["data.line_items"], ...(cursor ? { starting_after: cursor } : {}) });
        for (const session of result.data) {
          if (session.status !== "complete" || session.payment_status !== "paid") continue;
          const lines = session.line_items;
          if (!lines || lines.has_more) { snapshot.billing.partial = true; continue; }
          // Count only a single known app plan; mixed business carts are excluded.
          if (lines.data.length !== 1 || !lines.data[0].price) continue;
          const planId = prices.get(lines.data[0].price.id);
          if (!planId) continue;
          const plan = plans.get(planId)!;
          plan.paidCheckouts++;
          if (session.currency && session.amount_total !== null) plan.checkoutTotals[session.currency] = (plan.checkoutTotals[session.currency] ?? 0) + session.amount_total;
        }
        if (!result.has_more) break;
        if (page === 9) snapshot.billing.partial = true;
        cursor = result.data.at(-1)?.id;
      }
      const connectedPlans = new Set(prices.values());
      snapshot.billing.plans = Array.from(plans.values()).filter(p => connectedPlans.has(p.planId as typeof APP_PLANS[number]["id"]));
    } catch {
      snapshot.billing.issues.push("App billing could not be verified. Retry to load current figures.");
      snapshot.billing.plans = [];
    }
  }
}
