const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const source = ts.transpileModule(fs.readFileSync('app/api/admin/app-center/route.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;

function setup({ role = 'admin', mfa = false, configured = true, sourceError = false } = {}) {
  let stripeCalls = 0;
  const auth = { auth: { getUser: async () => ({ data: { user: { id: 'admin' } } }), mfa: { getAuthenticatorAssuranceLevel: async () => ({ data: { currentLevel: 'aal1', nextLevel: mfa ? 'aal2' : 'aal1' } }) } }, from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { role } }) }) }) }) };
  const db = { from(table) { return { select() { return {
    order() { return { limit: async () => sourceError ? { error: Error('offline'), data: null } : { data: table === 'planning_documents' ? [{ profile_id: 'app-user', updated_at: '2026-10-30' }] : [{ profile_id: 'app-user', created_at: '2026-10-29', access_plan: 'free', access_expires_at: null }] } }; },
    in: async () => ({ data: [{ id: 'app-user', full_name: 'App Member', email: 'app@example.test', role: 'member' }] }),
  }; } }; } };
  const stripe = {
    subscriptions: { list: async () => { stripeCalls++; return { has_more: false, data: [
      { status: 'active', items: { data: [{ price: { id: 'price_app' } }] } },
      { status: 'active', metadata: { planId: 'app-only' }, items: { data: [{ price: { id: 'price_in_home' } }] } },
      { status: 'past_due', items: { data: [{ price: { id: 'price_app' } }] } },
    ] }; } },
    checkout: { sessions: { list: async () => { stripeCalls++; return { has_more: false, data: [
      { status: 'complete', payment_status: 'paid', currency: 'usd', amount_total: 2900, line_items: { data: [{ price: { id: 'price_app' } }] } },
      { status: 'complete', payment_status: 'paid', currency: 'usd', amount_total: 138000, line_items: { data: [{ price: { id: 'price_in_home' } }] } },
      { status: 'complete', payment_status: 'paid', currency: 'usd', amount_total: 5000, line_items: { data: [{ price: { id: 'price_app' } }, { price: { id: 'other' } }] } },
      { status: 'open', payment_status: 'unpaid', line_items: { data: [{ price: { id: 'price_app' } }] } },
    ] }; } } },
  };
  const exports = {};
  const dependencies = {
    '@supabase/supabase-js': { createClient: (_url, key) => key === 'service' ? db : auth },
    'next/server': { NextResponse: { json: (body, options) => ({ body, status: options?.status ?? 200, headers: options?.headers }) } },
    '@/lib/appPlans': { APP_PLANS: [{ id: 'app-only', name: 'App Only' }], getPlanPriceId: () => configured ? 'price_app' : undefined },
    '@/lib/stripe': { getStripeClient: () => stripe },
  };
  new Function('exports', 'require', 'process', source)(exports, name => { if (!(name in dependencies)) throw Error(name); return dependencies[name]; }, { env: { NEXT_PUBLIC_SUPABASE_URL: 'https://example.test', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon', SUPABASE_SERVICE_ROLE_KEY: 'service' } });
  return { GET: exports.GET, stripeCalls: () => stripeCalls };
}

const request = () => new Request('http://localhost/api/admin/app-center', { headers: { Authorization: 'Bearer test-session' } });
test('anonymous, non-admin, and incomplete MFA cannot read app reporting', async () => {
  const anonymous = setup();
  assert.equal((await anonymous.GET(new Request('http://localhost/api/admin/app-center'))).status, 401);
  for (const options of [{ role: 'member' }, { mfa: true }]) {
    const api = setup(options);
    assert.equal((await api.GET(request())).status, 403);
    assert.equal(api.stripeCalls(), 0);
  }
});
test('billing matches exact configured app prices and excludes business and mixed carts', async () => {
  const result = await setup().GET(request());
  assert.equal(result.status, 200);
  assert.equal(result.headers['Cache-Control'], 'private, no-store');
  assert.deepEqual(result.body.billing.plans, [{ planId: 'app-only', active: 1, trialing: 0, pastDue: 1, canceled: 0, paidCheckouts: 1, checkoutTotals: { usd: 2900 } }]);
});
test('users are deduplicated by verified account id across app evidence sources', async () => {
  const { body } = await setup().GET(request());
  assert.equal(body.users.records.length, 1);
  assert.deepEqual(body.users.records[0].products, ['Sound Fitness', 'Angles']);
  assert.equal(body.users.records[0].access, 'Angles: free');
});
test('unavailable sources do not become confirmed zero totals', async () => {
  const api = setup({ configured: false, sourceError: true });
  const { body } = await api.GET(request());
  assert.equal(body.billing.plans.length, 0);
  assert.ok(body.billing.issues.length);
  assert.ok(body.users.issues.length);
  assert.equal(api.stripeCalls(), 0);
});
