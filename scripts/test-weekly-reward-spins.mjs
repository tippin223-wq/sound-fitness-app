import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { test } from 'node:test';

test('weekly spins accumulate, count days, enforce close, persist prizes and isolate accounts', async () => {
  const db = new PGlite();
  const alice = '00000000-0000-4000-8000-000000000001';
  const bob = '00000000-0000-4000-8000-000000000002';
  try {
    await db.exec(`create role authenticated; create role anon; create schema auth;
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema public,auth to authenticated;
      create function public.test_now() returns timestamptz language sql stable as $$select current_setting('test.clock')::timestamptz$$;
      -- Only randomness and the wall clock are deterministic in this harness.
      create function public.test_uuid() returns uuid language sql as $$select (lpad(to_hex(current_setting('test.roll')::integer),8,'0') || '-0000-4000-8000-000000000000')::uuid$$;
      create table profiles(id uuid primary key);
      insert into profiles values ('${alice}'),('${bob}');
      create table workout_logs(id uuid primary key default gen_random_uuid(),profile_id uuid,status text,completed_at timestamptz);
      create table workout_set_logs(workout_log_id uuid,profile_id uuid,sets integer);
      select set_config('test.clock','2026-11-16T08:00:00Z',false);
      select set_config('test.roll','9999',false);`);
    const source = await readFile(new URL('../supabase/migrations/20261101090000_weekly_reward_spins.sql', import.meta.url),'utf8');
    await db.exec(source.replaceAll('now()', 'public.test_now()').replaceAll('pg_catalog.gen_random_uuid()', 'public.test_uuid()'));
    const workout = async (owner, date, sets = 1, status = 'completed') => {
      const id = (await db.query('insert into workout_logs(profile_id,status,completed_at) values ($1,$2,$3) returning id',[owner,status,date])).rows[0].id;
      if (sets) await db.query('insert into workout_set_logs values ($1,$2,$3)',[id,owner,sets]);
    };
    await workout(alice,'2026-10-27T17:00:00Z');
    await workout(alice,'2026-10-27T18:00:00Z'); // Same day is not a second day.
    await workout(alice,'2026-11-02T07:59:59Z'); // Sunday Pacific (DST boundary).
    await workout(alice,'2026-11-02T08:00:00Z'); // Monday Pacific.
    await workout(alice,'2026-11-10T17:00:00Z',0); // No recorded sets.
    await workout(alice,'2026-11-11T17:00:00Z',1,'started');
    await workout(alice,'2026-11-16T08:00:00Z'); // Current week, cannot claim yet.
    await workout(alice,'2026-11-17T08:00:00Z'); // Future record, excluded.
    await workout(bob,'2026-11-10T17:00:00Z');
    for (let day = 16; day <= 22; day++) await workout(bob,`2026-11-${day}T17:00:00Z`);
    await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','${alice}',false);`);
    const status = async () => (await db.query('select weekly_reward_spin_status() as data')).rows[0].data;
    const claim = async week => (await db.query('select claim_weekly_reward_spin($1::date) as data',[week])).rows[0].data;
    let state = await status();
    assert.equal(state.availableSpins,2); assert.equal(state.daysTrained,2); assert.equal(state.currentDays,1);
    assert.equal(state.weekStart,'2026-10-26');
    await assert.rejects(claim('2026-11-16'),/No earned spin/);
    await assert.rejects(claim(null),/No earned spin/);
    const first = await claim('2026-10-26');
    assert.equal(first.amount,25); assert.equal(first.currency,'points');
    assert.deepEqual(await claim('2026-10-26'),first); // Retry cannot reroll.
    state = await status(); assert.equal(state.availableSpins,1); assert.equal(state.daysTrained,1);
    assert.equal(state.balances.points,25);
    await db.query("select set_config('test.roll','0',false)");
    const second = await claim('2026-11-02'); assert.equal(second.tier,'emerald');
    state = await status(); assert.equal(state.availableSpins,0); assert.equal(state.balances.emeralds,1);
    await assert.rejects(db.query("insert into weekly_reward_spins(profile_id,week_start,days_trained,tier,currency,amount) values ($1,'2026-11-09',7,'emerald','emeralds',999)",[alice]),/permission denied/);
    await assert.rejects(db.query('delete from weekly_reward_spins'),/permission denied/);
    await db.query("select set_config('request.jwt.claim.sub',$1,false)",[bob]);
    assert.equal((await db.query('select * from weekly_reward_spins')).rows.length,0);
    state = await status(); assert.equal(state.availableSpins,1); assert.equal(state.balances.points,0);
    await assert.rejects(claim('2026-10-26'),/No earned spin/);
    await db.query("select set_config('test.clock','2026-11-23T07:59:59Z',false)");
    assert.equal((await status()).availableSpins,1); // Sunday night is still open.
    await db.query("select set_config('test.clock','2026-11-23T08:00:00Z',false)");
    assert.equal((await status()).availableSpins,2); // Monday unlocks without a cron job.
    await db.query("select set_config('test.roll','500',false)");
    assert.equal((await claim('2026-11-09')).tier,'rare'); // One-day week.
    assert.equal((await status()).daysTrained,7);
    assert.equal((await claim('2026-11-16')).tier,'epic'); // Same roll improves with more days.
    assert.equal((await status()).availableSpins,0);
    await db.exec('reset role;');
    await db.exec(await readFile(new URL('../supabase/migrations/20261101091000_weekly_reward_prizes_pending.sql', import.meta.url),'utf8'));
    await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','${alice}',false);`);
    const saved = await status();
    await assert.rejects(claim(saved.weekStart),/Rewards are being configured/);
    assert.deepEqual(await status(),saved); // Pending catalog cannot consume earned spins.
    await db.exec('reset role; set role anon;');
    await assert.rejects(db.query('select weekly_reward_spin_status()'),/permission denied/);
    await assert.rejects(db.query("select claim_weekly_reward_spin('2026-10-26')"),/permission denied/);
  } finally { await db.close(); }
});
