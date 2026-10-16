import nextEnv from '@next/env';
import { pathToFileURL } from 'node:url';

const probes = [
  { name: 'Planning document table', path: 'planning_documents?select=revision&limit=0', migration: '20261012090000_planning_documents.sql' },
  { name: 'Workout revision columns', path: 'workout_templates?select=revision,last_mutation_key&limit=0', migration: '20261012093000_atomic_workout_templates.sql' },
  { name: 'Recorded workout load unit', path: 'workout_set_logs?select=weight_unit&limit=0', migration: '20261012091000_planning_workout_completion.sql' },
  { name: 'Member message table (table only)', path: 'member_messages?select=id&limit=0', migration: '20261012092000_member_app_messages.sql' },
  { name: 'Workout template variation metadata', path: 'workout_template_exercises?select=semantic_metadata&limit=0', migration: '20261013130000_workout_exercise_semantics.sql' },
  { name: 'Recorded workout variation metadata', path: 'workout_set_logs?select=semantic_metadata&limit=0', migration: '20261013130000_workout_exercise_semantics.sql' },
  { name: 'Recorded workout template key', path: 'workout_logs?select=template_client_key&limit=0', migration: '20261013133000_workout_template_identity.sql' },
  { name: 'Load-unit capability (public visibility only)', path: 'rpc/planning_workout_load_unit_version', capability: true, migration: '20261012091000_planning_workout_completion.sql' },
  { name: 'Variation capability (public visibility only)', path: 'rpc/planning_workout_semantics_version', capability: true, migration: '20261013130000_workout_exercise_semantics.sql' },
  { name: 'Template identity capability (public visibility only)', path: 'rpc/planning_workout_template_identity_version', capability: true, migration: '20261013133000_workout_template_identity.sql' },
];

export async function checkPlanningBackend({ url, publicKey, fetchImpl = fetch }) {
  let endpoint;
  try { endpoint = new URL(url); } catch { throw new Error('Configure NEXT_PUBLIC_SUPABASE_URL with the app HTTPS endpoint.'); }
  if (endpoint.protocol !== 'https:' || endpoint.username || endpoint.password || endpoint.search || endpoint.hash || !publicKey || typeof publicKey !== 'string') throw new Error('A valid HTTPS endpoint and public browser key are required.');
  let role;
  try { role = JSON.parse(Buffer.from(publicKey.split('.')[1] || '', 'base64url').toString()).role; } catch { /* Publishable keys need not be JWTs. */ }
  if (publicKey.startsWith('sb_secret_') || role && role !== 'anon') throw new Error('Administrative credentials are not accepted. Use the public browser configuration.');
  const results = await Promise.all(probes.map(async probe => {
    const result = { name: probe.name, migration: probe.migration, capability: Boolean(probe.capability), status: null, code: null, outcome: 'request_failed' };
    try {
      const response = await fetchImpl(new URL('/rest/v1/' + probe.path, endpoint), {
        method: 'GET', headers: { apikey: publicKey, Authorization: 'Bearer ' + publicKey }, redirect: 'error', signal: AbortSignal.timeout(12000),
      });
      const body = await response.json().catch(() => null);
      result.status = response.status;
      result.code = body && !Array.isArray(body) && typeof body === 'object' && typeof body.code === 'string' ? body.code : null;
      if (response.ok) result.outcome = probe.capability ? body === 1 ? 'available' : 'incompatible' : Array.isArray(body) && body.length === 0 ? 'available' : 'unexpected_response';
      else if (['PGRST205', '42703'].includes(result.code)) result.outcome = 'schema_unavailable';
      else if (probe.capability && result.code === 'PGRST202' || response.status === 401 || response.status === 403) result.outcome = 'access_unverified';
      else result.outcome = 'unexpected_response';
    } catch { /* Keep network and credential-bearing error text out of the report. */ }
    return result;
  }));
  return {
    checkedAt: new Date().toISOString(), endpoint: endpoint.origin, publicSchemaChecksPassed: results.filter(result => !result.capability).every(result => result.outcome === 'available'),
    authenticatedFlowsVerified: false, mutationsPerformed: false, memberRecordsRequested: false, results,
    limitation: 'Public metadata checks cannot verify authenticated RPC visibility, ownership policies, identity mapping or end-to-end saves. A hidden capability is unverified, not proof that the function is missing.',
  };
}

async function main() {
  const flags = process.argv.slice(2);
  if (flags.some(flag => !['--development', '--json'].includes(flag))) throw new Error('Supported options: --development, --json.');
  nextEnv.loadEnvConfig(process.cwd(), flags.includes('--development'), { info() {}, error() {} });
  const report = await checkPlanningBackend({ url: process.env.NEXT_PUBLIC_SUPABASE_URL, publicKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY });
  if (flags.includes('--json')) console.log(JSON.stringify(report, null, 2));
  else {
    console.log('Read-only planning backend preflight · ' + report.endpoint);
    for (const result of report.results) console.log(`${result.name}: ${result.outcome} · ${result.status ?? 'no response'}${result.code ? ' / ' + result.code : ''}`);
    console.log(report.publicSchemaChecksPassed ? 'Public table/column checks passed; authenticated flows remain unverified.' : 'Public table/column checks did not pass. Review the listed migrations before activation.');
    console.log(report.limitation);
  }
  process.exitCode = report.results.some(result => ['schema_unavailable', 'incompatible'].includes(result.outcome)) ? 2 : report.publicSchemaChecksPassed ? 0 : 1;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(() => {
  console.error('Backend preflight could not run. Check the public app configuration and supported options; no credentials are printed.');
  process.exitCode = 1;
});
