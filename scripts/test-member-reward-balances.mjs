import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {test} from 'node:test';
test('wallet reads actual account credits independently of spin eligibility, including verified zero',async()=>{
  const db=new PGlite();
  const alice='00000000-0000-4000-8000-000000000001',bob='00000000-0000-4000-8000-000000000002';
  try{
    await db.exec(`create role authenticated;create role anon;create schema auth;
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema public,auth to authenticated,anon;
      create table weekly_reward_credits(profile_id uuid,asset text,amount bigint);
      insert into weekly_reward_credits values('${alice}','coins',25),('${alice}','coins',50),('${alice}','sapphire',3),('${bob}','coins',900);
      create function weekly_reward_eligibility() returns jsonb language plpgsql as $$begin raise exception 'Spin status failed';end$$;`);
    await db.exec(await readFile(new URL('../supabase/migrations/20261104140000_member_reward_balances.sql',import.meta.url),'utf8'));
    await db.exec(`set role anon;`);
    await assert.rejects(db.query('select member_reward_balances()'),/permission denied/);
    await db.exec(`set role authenticated;`);
    await assert.rejects(db.query('select member_reward_balances()'),/Authentication required/);
    await db.query("select set_config('request.jwt.claim.sub',$1,false)",[alice]);
    const read=async()=>(await db.query('select member_reward_balances() as balances')).rows[0].balances;
    assert.deepEqual(await read(),{coins:75,bolts:0,sapphire:3,topaz:0,ruby:0,emerald:0});
    await db.query("select set_config('request.jwt.claim.sub',$1,false)",[bob]);
    assert.equal((await read()).coins,900);
    await db.query("select set_config('request.jwt.claim.sub',$1,false)",['00000000-0000-4000-8000-000000000003']);
    assert.deepEqual(await read(),{coins:0,bolts:0,sapphire:0,topaz:0,ruby:0,emerald:0});
    await assert.rejects(db.query("insert into weekly_reward_credits values($1,'coins',100000)",[alice]),/permission denied/);
  }finally{await db.close();}
});
