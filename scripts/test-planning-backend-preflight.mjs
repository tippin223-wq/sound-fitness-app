import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkPlanningBackend } from './check-planning-backend.mjs';
const url = 'https://fixture.supabase.co';
const publicKey = 'public-key-must-never-appear-in-report';
const reply = (status, body) => ({ status, ok: status >= 200 && status < 300, json: async () => body });

test('backend preflight requests zero member rows, only readonly GETs, configured origin and no redirects', async () => {
  const calls = [];
  const report = await checkPlanningBackend({ url, publicKey, fetchImpl: async (target, options) => { calls.push({ target, options }); return reply(200, target.pathname.includes('/rpc/') ? 1 : []); } });
  assert.equal(calls.length, 10);
  for (const { target, options } of calls) { assert.equal(target.origin, url); assert.equal(options.method, 'GET'); assert.equal(options.redirect, 'error'); assert.equal(options.headers.apikey, publicKey); if (!target.pathname.includes('/rpc/')) assert.equal(target.searchParams.get('limit'), '0'); }
  assert.equal(report.publicSchemaChecksPassed, true); assert.equal(report.authenticatedFlowsVerified, false); assert.equal(report.mutationsPerformed, false); assert.equal(report.memberRecordsRequested, false); assert.equal(JSON.stringify(report).includes(publicKey), false);
});
test('backend preflight identifies unavailable tables/columns but does not claim hidden authenticated capability is absent', async () => {
  const report = await checkPlanningBackend({ url, publicKey, fetchImpl: async target => reply(target.pathname.includes('planning_documents') ? 404 : target.pathname.includes('/rpc/') ? 404 : 400, { code: target.pathname.includes('planning_documents') ? 'PGRST205' : target.pathname.includes('/rpc/') ? 'PGRST202' : '42703' }) });
  assert.equal(report.publicSchemaChecksPassed, false); assert.equal(report.results[0].outcome, 'schema_unavailable'); assert.equal(report.results[1].outcome, 'schema_unavailable'); assert.equal(report.results.at(-1).outcome, 'access_unverified'); assert.match(report.limitation, /not proof/);
});
test('backend preflight refuses administrative keys and unsafe endpoints before making any request', async () => {
  let calls = 0; const fetchImpl = async () => { calls++; return reply(200, []); };
  for (const endpoint of ['http://fixture.supabase.co', 'https://user:password@fixture.supabase.co', 'https://fixture.supabase.co?private=1', 'invalid']) await assert.rejects(checkPlanningBackend({ url: endpoint, publicKey, fetchImpl }));
  for (const key of ['sb_secret_hidden', ...['service_role', 'authenticated', 'postgres'].map(role => 'header.' + Buffer.from(JSON.stringify({ role })).toString('base64url') + '.signature')]) await assert.rejects(checkPlanningBackend({ url, publicKey: key, fetchImpl }), /Administrative credentials/);
  assert.equal(calls, 0);
});
test('backend preflight reports network and access uncertainty without leaking exception or response content', async () => {
  const report = await checkPlanningBackend({ url, publicKey, fetchImpl: async target => { if (target.pathname.includes('planning_documents')) throw Error(publicKey); return reply(403, { code: '42501', message: publicKey }); } });
  assert.equal(report.results[0].outcome, 'request_failed'); assert.equal(report.results[1].outcome, 'access_unverified'); assert.equal(report.publicSchemaChecksPassed, false); assert.equal(JSON.stringify(report).includes(publicKey), false);
});
test('backend preflight refuses unexpected rows or incompatible load-unit version as confirmation', async () => {
  const report = await checkPlanningBackend({ url, publicKey, fetchImpl: async target => reply(200, target.pathname.includes('/rpc/') ? 2 : [{ private: publicKey }]) });
  assert.equal(report.publicSchemaChecksPassed, false); assert.equal(report.results[0].outcome, 'unexpected_response'); assert.equal(report.results.at(-1).outcome, 'incompatible'); assert.equal(JSON.stringify(report).includes(publicKey), false);
});


test('backend preflight checks both variation columns and attributes missing schema to the staged metadata migration', async () => {
  const calls = [];
  const report = await checkPlanningBackend({ url, publicKey, fetchImpl: async target => {
    calls.push(target);
    return target.searchParams.get('select') === 'semantic_metadata' ? reply(400, { code: '42703', message: publicKey }) : reply(200, target.pathname.includes('/rpc/') ? 1 : []);
  } });
  const metadata = report.results.filter(result => result.name.includes('variation metadata'));
  assert.equal(metadata.length, 2); assert.ok(metadata.every(result => result.outcome === 'schema_unavailable' && result.migration === '20261013130000_workout_exercise_semantics.sql'));
  assert.equal(report.publicSchemaChecksPassed, false); assert.equal(report.mutationsPerformed, false); assert.equal(report.memberRecordsRequested, false);
  assert.deepEqual(calls.filter(target => target.searchParams.get('select') === 'semantic_metadata').map(target => target.pathname).sort(), ['/rest/v1/workout_set_logs', '/rest/v1/workout_template_exercises']);
  assert.equal(JSON.stringify(report).includes(publicKey), false);
});

test('backend preflight separates incompatible variation capability from unverified authenticated visibility', async () => {
  for (const hidden of [false, true]) {
    const report = await checkPlanningBackend({ url, publicKey, fetchImpl: async target => {
      if (target.pathname.endsWith('planning_workout_semantics_version')) return hidden ? reply(404, { code: 'PGRST202' }) : reply(200, 2);
      return reply(200, target.pathname.includes('/rpc/') ? 1 : []);
    } });
    assert.equal(report.publicSchemaChecksPassed, true); assert.equal(report.authenticatedFlowsVerified, false);
    assert.equal(report.results.find(result => result.name.startsWith('Variation capability')).outcome, hidden ? 'access_unverified' : 'incompatible');
    assert.equal(report.results.find(result => result.name.startsWith('Load-unit capability')).outcome, 'available'); assert.match(report.limitation, /unverified, not proof/);
  }
});
