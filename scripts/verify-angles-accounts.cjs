// Explicit live database verification. Fixtures and trial schema always roll back.
// --apply installs ONLY this additive migration after the trial passes.
const fs = require('node:fs');
const { pathToFileURL } = require('node:url');
const { randomUUID } = require('node:crypto');
const assert = require('node:assert/strict');
function arg(name) { return process.argv[process.argv.indexOf(name) + 1]; }
async function main() {
  for (const name of ['--env-file', '--postgres-module', '--ca']) {
    if (!process.argv.includes(name)) throw Error(`Required: ${name}`);
  }
  const env = Object.fromEntries(fs.readFileSync(arg('--env-file'), 'utf8').split(/\r?\n/)
    .filter(line => /^\w+=/.test(line)).map(line => {
      const i = line.indexOf('='); return [line.slice(0, i), line.slice(i + 1).replace(/^['"]|['"]$/g, '')];
    }));
  const { default: postgres } = await import(pathToFileURL(arg('--postgres-module')).href);
  const db = postgres(env.DATABASE_URL, { max: 1,
    ssl: { ca: fs.readFileSync(arg('--ca'), 'utf8'), rejectUnauthorized: true } });
  const migration = fs.readFileSync('supabase/migrations/20261027090000_angles_account_context.sql', 'utf8');
  const trial = migration.replace(/^begin;$/m, '').replace(/^commit;$/m, '');
  try {
    const installed = (await db`select to_regclass('public.angles_accounts') is not null as installed`)[0].installed;
    const rolledBack = new Error('verified rollback');
    try {
      await db.begin(async tx => {
        if (!installed) await tx.unsafe(trial);
        const first = randomUUID(), second = randomUUID();
        await tx`insert into auth.users(id,email,raw_user_meta_data) values
          (${first},${`angles-test-${first}@example.invalid`},${tx.json({ signup_product: 'angles', role: 'coach', access_plan: 'angles' })}),
          (${second},${`angles-test-${second}@example.invalid`},'{}'::jsonb)`;
        async function login(id) {
          await tx.unsafe('reset role');
          await tx`select set_config('request.jwt.claims', ${JSON.stringify({ sub: id, role: 'authenticated', aal: 'aal1' })}, true)`;
          await tx.unsafe('set local role authenticated');
        }
        async function context() { return (await tx`select public.get_angles_account_context() as value`)[0].value; }
        await login(first);
        assert.deepEqual(await context(), { id: first, role: 'training_user', enrollmentSource: 'angles', accessPlan: 'free' });
        assert.deepEqual(await context(), await context());
        assert.equal((await tx`select count(*)::int as n from public.angles_accounts`)[0].n, 1);
        for (const statement of [
          "update public.angles_accounts set access_plan='angles'",
          "delete from public.angles_accounts",
          "insert into public.angles_accounts(profile_id,enrollment_source) values (auth.uid(),'angles')",
          "update public.profiles set role='coach' where id=auth.uid()",
        ]) {
          await assert.rejects(tx.savepoint(async sp => sp.unsafe(statement)), /permission denied/);
        }
        await login(second);
        assert.deepEqual(await context(), { id: second, role: 'training_user', enrollmentSource: 'sound_fitness', accessPlan: 'free' });
        assert.equal((await tx`select count(*)::int as n from public.angles_accounts where profile_id=${first}`)[0].n, 0);
        await tx.unsafe('reset role');
        await tx`update public.profiles set role='coach' where id=${second}`;
        await login(second); assert.equal((await context()).role, 'coach');
        await tx.unsafe('reset role');
        await tx`update public.profiles set role='admin' where id=${second}`;
        await tx`update public.angles_accounts set access_plan='angles',access_expires_at=now()-interval '1 second' where profile_id=${second}`;
        await login(second);
        assert.equal((await context()).role, 'training_user');
        assert.equal((await context()).accessPlan, 'free');
        await tx.unsafe('reset role');
        await tx`update public.angles_accounts set access_expires_at=now()+interval '1 day' where profile_id=${second}`;
        await login(second); assert.equal((await context()).accessPlan, 'angles');
        // An enrollment label remains stable even if editable metadata changes.
        await tx.unsafe('reset role');
        await tx`update auth.users set raw_user_meta_data='{}'::jsonb where id=${first}`;
        await login(first); assert.equal((await context()).enrollmentSource, 'angles');
        await tx.unsafe('reset role');
        await tx`insert into auth.mfa_factors(id,user_id,factor_type,status,created_at,updated_at)
          values (${randomUUID()},${first},'totp','verified',now(),now())`;
        await login(first);
        await assert.rejects(tx.savepoint(async sp => sp`select public.get_angles_account_context()`), /verification required/);
        assert.equal((await tx`select count(*)::int as n from public.angles_accounts`)[0].n, 0);
        await tx`select set_config('request.jwt.claims', ${JSON.stringify({ sub: first, role: 'authenticated', aal: 'aal2' })}, true)`;
        assert.equal((await context()).id, first);
        await tx`select set_config('request.jwt.claims','{}',true)`;
        await assert.rejects(tx.savepoint(async sp => sp`select public.get_angles_account_context()`), /verification required/);
        await tx.unsafe('reset role'); await tx.unsafe('set local role anon');
        await assert.rejects(tx.savepoint(async sp => sp`select public.get_angles_account_context()`), /permission denied/);
        throw rolledBack;
      });
    } catch (error) { if (error !== rolledBack) throw error; }
    console.log('PASS: shared identity, role mapping, signup escalation, enrollment isolation, expiry, MFA, anonymous denial; all fixtures rolled back.');
    if (process.argv.includes('--apply') && !installed) {
      await db.unsafe(migration);
      console.log('Installed Angles account-context migration. No existing profiles, billing or coaching relationships changed.');
    } else console.log(installed ? 'Migration already installed.' : 'Trial only; schema rolled back.');
  } finally { await db.end(); }
}
main().catch(error => { console.error(error.message.replace(/postgres(ql)?:\/\/\S+/g, '[redacted]')); process.exitCode = 1; });
