import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

test('challenge awards use saved evidence, credit once, and isolate accounts', async () => {
 const db=new PGlite();
 try {
  await db.exec(`create role anon; create role authenticated;
   create schema auth;
   create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
   create table profiles(id uuid primary key);
   insert into profiles values('00000000-0000-0000-0000-000000000001'),('00000000-0000-0000-0000-000000000002');
   create table workout_logs(id uuid primary key,profile_id uuid,status text,completed_at timestamptz);
   create table workout_set_logs(workout_log_id uuid,profile_id uuid,sets integer,reps integer,pattern text);
   create table planning_documents(profile_id uuid,payload jsonb);
   create table app_content_publications(bank text,source_key text,fields jsonb);
   create table weekly_reward_credits(profile_id uuid,asset text,amount integer);
   create function weekly_reward_spin_status() returns jsonb language sql as $$ select '{}'::jsonb $$;`);
  await db.exec(await readFile(new URL('../supabase/migrations/20261107190000_challenge_set_rewards.sql',import.meta.url),'utf8'));
  const balances=async()=> (await db.query('select member_reward_balances() b')).rows[0].b;
  await assert.rejects(balances,/Authentication required/);
  await db.exec(`set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001'`);
  assert.equal((await balances()).coins,0);
  await db.exec(`insert into workout_logs values('10000000-0000-0000-0000-000000000001',auth.uid(),'completed',now()-interval '1 day');`);
  assert.equal((await balances()).coins,0,'a workout without sets cannot earn a set reward');
  await db.exec(`insert into workout_set_logs values('10000000-0000-0000-0000-000000000001',auth.uid(),3,10,'squat');`);
  assert.deepEqual(await balances(),{coins:200,bolts:50,sapphire:4,topaz:0,ruby:0,emerald:0});
  assert.equal((await balances()).coins,200,'repeated requests are idempotent');
  assert.equal((await db.query('select weekly_reward_spin_status() b')).rows[0].b.balances.coins,200);
  await db.exec(`insert into weekly_reward_credits values(auth.uid(),'coins',17);`);
  assert.equal((await balances()).coins,217,'weekly prizes and challenge rewards share the wallet');
  await db.exec(`set request.jwt.claim.sub='00000000-0000-0000-0000-000000000002'`);
  assert.equal((await balances()).coins,0,'another member cannot inherit rewards');
  const rights=await db.query(`select has_table_privilege('authenticated','challenge_reward_claims','insert') allowed`);
  assert.equal(rights.rows[0].allowed,false,'members cannot insert their own claims');
 } finally { await db.close(); }
});
