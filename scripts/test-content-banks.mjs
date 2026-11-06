import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {test} from 'node:test';
test('content drafts enforce admin ownership, MFA and optimistic revisions',async()=>{
 const db=new PGlite();
 try {
  await db.exec(`create role authenticated; create role anon; create schema auth;
   create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
   create function auth.jwt() returns jsonb language sql stable as $$select '{}'::jsonb$$;
   create table auth.mfa_factors(user_id uuid,status text);
   create table profiles(id uuid,role text);
   insert into profiles values('00000000-0000-4000-8000-000000000001','admin');
   grant usage on schema public,auth to authenticated,anon; grant select on profiles to authenticated;`);
  await db.exec(await readFile(new URL('../supabase/migrations/20261104150000_app_content_banks.sql',import.meta.url),'utf8'));
  await db.exec('set role authenticated');
  const save="select * from save_app_content_draft($1,'chyron',$2,'summary','{}', $3)";
  await assert.rejects(db.query(save,[null,'Hello',0]),/Admin access/);
  await db.exec("select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false)");
  const entry=(await db.query(save,[null,'Hello',0])).rows[0];
  assert.equal(entry.revision,1);
  await db.query(save,[entry.id,'Updated',1]);
  await assert.rejects(db.query(save,[entry.id,'Stale',1]),/draft changed/);
  await assert.rejects(db.query("insert into app_content_drafts(bank,title) values('chyron','Bypass')"),/permission denied/);
  await db.exec("reset role; insert into auth.mfa_factors values('00000000-0000-4000-8000-000000000001','verified'); set role authenticated");
  await assert.rejects(db.query(save,[null,'MFA',0]),/account verification/);
  await db.exec("select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',false)");
  assert.equal((await db.query('select * from app_content_drafts')).rows.length,0);
 } finally { await db.close(); }
});
