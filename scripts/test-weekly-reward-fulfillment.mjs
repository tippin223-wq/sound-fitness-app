import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { test } from 'node:test';

test('real spins atomically credit accounts, replay safely and recover receipts', async () => {
 const db = new PGlite();
 const alice='00000000-0000-4000-8000-000000000001', bob='00000000-0000-4000-8000-000000000002';
 try {
  await db.exec(`create role authenticated; create role anon; create schema auth;
   create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
   grant usage on schema public,auth to authenticated;
   create function public.test_now() returns timestamptz language sql stable as $$select '2026-11-23T08:00:00Z'::timestamptz$$;
   create function public.test_random() returns double precision language plpgsql as $$
    declare rolls jsonb; n double precision;
    begin rolls:=current_setting('test.rolls')::jsonb; n:=(rolls->>0)::double precision;
    perform set_config('test.rolls',(rolls-0)::text,false); return n; end $$;
   create table profiles(id uuid primary key); insert into profiles values ('${alice}'),('${bob}');
   create table workout_logs(id uuid primary key default gen_random_uuid(),profile_id uuid,status text,completed_at timestamptz);
   create table workout_set_logs(workout_log_id uuid,profile_id uuid,sets integer);`);
  for (const file of ['20261101090000_weekly_reward_spins.sql','20261101091000_weekly_reward_prizes_pending.sql','20261101160000_weekly_reward_fulfillment.sql']) {
   let sql=await readFile(new URL('../supabase/migrations/'+file,import.meta.url),'utf8');
   await db.exec(sql.replaceAll('now()','public.test_now()').replaceAll('random()','public.test_random()'));
  }
  for (const [owner,start,days] of [[alice,'2026-10-26',1],[alice,'2026-11-02',3],[alice,'2026-11-09',5],[alice,'2026-11-16',7],[bob,'2026-11-16',2]]) {
   for(let day=0;day<days;day++) {
    const date=new Date(start+'T17:00:00Z'); date.setUTCDate(date.getUTCDate()+day);
    const id=(await db.query("insert into workout_logs(profile_id,status,completed_at) values ($1,'completed',$2) returning id",[owner,date.toISOString()])).rows[0].id;
    await db.query('insert into workout_set_logs values ($1,$2,1)',[id,owner]);
   }
  }
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','${alice}',false);`);
  const status=async()=>(await db.query('select weekly_reward_spin_status() as data')).rows[0].data;
  const claim=async(week,rolls)=>{if(rolls) await db.query("select set_config('test.rolls',$1,false)",[JSON.stringify(rolls)]);return (await db.query('select claim_weekly_reward_spin($1::date) as data',[week])).rows[0].data;};
  const ack=async week=>db.query('select acknowledge_weekly_reward($1::date)',[week]);
  let state=await status(); assert.equal(state.availableSpins,4); assert.equal(state.rewardsReady,true);
  assert.deepEqual(state.balances,{coins:0,bolts:0,sapphire:0,topaz:0,ruby:0,emerald:0});
  await assert.rejects(claim('2026-11-23'),/No earned spin/);
  const first=await claim('2026-10-26',[0,0]);
  assert.equal(first.rewardId,'sound-points'); assert.equal(first.amount,'25 coins');
  assert.deepEqual(await claim('2026-10-26'),first);
  state=await status(); assert.equal(state.balances.coins,25); assert.deepEqual(state.pendingReveal,first);
  await assert.rejects(claim('2026-11-02'),/previous reward/);
  await ack(first.weekStart); await ack(first.weekStart);
  const second=await claim('2026-11-02',[.99,.55,.8]); // Rare ruby gem.
  assert.equal(second.rarity,'rare'); assert.equal(second.gemType,'ruby'); assert.deepEqual(second.credits,{ruby:1});
  await ack(second.weekStart);
  const third=await claim('2026-11-09',[.99,.99,.99]); // Legendary chest, emeralds.
  assert.equal(third.rewardId,'rare-crate'); assert.equal(third.rarity,'legendary');
  assert.deepEqual(third.credits,{coins:500,bolts:10,emerald:5}); await ack(third.weekStart);
  await db.exec(`reset role; create function reject_reward_credit() returns trigger language plpgsql as $$begin raise exception 'simulated credit failure'; end$$;
   create trigger reject_credit before insert on weekly_reward_credits for each row execute function reject_reward_credit();
   set role authenticated; select set_config('request.jwt.claim.sub','${alice}',false);`);
  await assert.rejects(claim('2026-11-16',[.2,.6]),/simulated credit failure/);
  assert.equal((await status()).availableSpins,1); // Claim and credit roll back together.
  assert.equal((await status()).balances.bolts,10);
  await db.exec('reset role; drop trigger reject_credit on weekly_reward_credits; set role authenticated;');
  const fourth=await claim('2026-11-16',[.2,.6]); // Uncommon bolts.
  assert.equal(fourth.rarity,'uncommon'); assert.deepEqual(fourth.credits,{bolts:2});
  state=await status(); assert.equal(state.availableSpins,0); assert.equal(state.balances.coins,525); assert.equal(state.balances.bolts,12);
  assert.equal(state.balances.ruby,1); assert.equal(state.balances.emerald,5);
  await assert.rejects(db.query("insert into weekly_reward_credits values ($1,'2026-11-16','coins',999)",[alice]),/permission denied/);
  await assert.rejects(db.query('update weekly_reward_credits set amount=999'),/permission denied/);
  await assert.rejects(db.query('delete from weekly_reward_spins'),/permission denied/);
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[bob]);
  assert.equal((await db.query('select * from weekly_reward_credits')).rows.length,0);
  assert.equal((await status()).balances.coins,0); assert.equal((await status()).pendingReveal,null);
  await ack(fourth.weekStart); // Cannot acknowledge Alice's receipt.
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[alice]);
  assert.deepEqual((await status()).pendingReveal,fourth);
  await db.exec('reset role; set role anon;');
  await assert.rejects(db.query('select weekly_reward_spin_status()'),/permission denied/);
  await assert.rejects(db.query("select claim_weekly_reward_spin('2026-11-16')"),/permission denied/);
  await assert.rejects(db.query("select acknowledge_weekly_reward('2026-11-16')"),/permission denied/);
 } finally {await db.close();}
});
