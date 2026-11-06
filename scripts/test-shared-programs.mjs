import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {test} from 'node:test';
const catalog=JSON.parse(await readFile(new URL('../lib/programs/catalog.v1.json',import.meta.url),'utf8'));
test('catalog budgets, all scheduled signals, fixed currency amounts and unique milestone identities',()=>{
  assert.equal(catalog.length,20);
  const cosmetics=new Set();
  for(const p of catalog){
    assert.equal(p.activities.reduce((s,a)=>s+a.points,0),p.totalLevels*100);
    assert.equal(p.rewards.length,p.totalLevels);
    assert.equal(new Set(p.activities.map(a=>a.id)).size,p.activities.length);
    for(const a of p.activities){assert.ok(a.signal.action);assert.ok(a.signal.evidence);assert.ok(a.week<=p.weeks);}
    for(const r of p.rewards){
      if(r.level%5===0){assert.equal(r.kind,'cosmetic');assert.ok(!cosmetics.has(r.asset));cosmetics.add(r.asset);}
      else assert.equal(r.amount,{coins:50,bolts:5,sapphire:1,topaz:1,ruby:1}[r.asset]);
    }
  }
});
test('database freezes versions, blocks unreviewed enrollment and denies client point writes',async()=>{
  const db=new PGlite();
  try{
    await db.exec(`create role anon;create role authenticated;create schema auth;
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema public,auth to authenticated,anon;
      create table profiles(id uuid primary key);insert into profiles values('00000000-0000-4000-8000-000000000001');`);
    await db.exec(await readFile(new URL('../supabase/migrations/20261104120000_shared_program_catalog.sql',import.meta.url),'utf8'));
    for(const p of catalog)await db.query('insert into fitness_program_versions(program_id,version,definition) values($1,$2,$3)',[p.id,p.version,JSON.stringify(p)]);
    await assert.rejects(db.query('update fitness_program_versions set definition=definition'),/immutable/);
    const invalid=structuredClone(catalog[0]);invalid.id='invalid';invalid.totalLevels++;
    await assert.rejects(db.query('insert into fitness_program_versions values($1,1,$2,now())',[invalid.id,JSON.stringify(invalid)]),/budget/);
    const premature=structuredClone(catalog[0]);premature.id='premature';premature.status='published';
    await assert.rejects(db.query('insert into fitness_program_versions values($1,1,$2,now())',[premature.id,JSON.stringify(premature)]),/assets/);
    await db.exec(`set role authenticated;select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);`);
    await assert.rejects(db.query("select enroll_fitness_program($1,1,current_date)",[catalog[0].id]),/not yet open/);
    await assert.rejects(db.query("insert into fitness_program_activity_credits values(gen_random_uuid(),'fake','fake','fake',100,now())"),/permission denied/);
    assert.equal((await db.query('select count(*)::integer as count from fitness_program_enrollments')).rows[0].count,0);
  }finally{await db.close();}
});
