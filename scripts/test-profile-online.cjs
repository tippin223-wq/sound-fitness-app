const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const Module=require('node:module');const ts=require('typescript');
const website=process.env.SOUND_FITNESS_WEBSITE_ROOT || path.resolve(__dirname, '../../01_Business/Sound Fitness/Website/SoundFitness-EasyWP');
const websitePresent=fs.existsSync(path.join(website,'src/lib/shared-member-identity.ts'));
const load=(file,stubs)=>{const m=new Module(file,module);m.filename=file;m.paths=module.paths;m.require=n=>n in stubs?stubs[n]:require(n);m._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,file);return m.exports};
const sanitise=load(path.resolve('lib/server/profilePhotoImage.ts'),{}).sanitiseImage;
const uid='11111111-1111-4111-8111-111111111111';
const originalFetch=global.fetch;process.env.NEXT_PUBLIC_SUPABASE_URL='https://test.invalid';process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY='test-anon';process.env.SUPABASE_SERVICE_ROLE_KEY='test-service';
test('shared website identity refresh only changes display fields, preserving account privileges and expiry',{skip:!websitePresent},async()=>{
  global.fetch=async()=>Response.json({id:uid,user_metadata:{full_name:'New name',avatar_url:'https://test.invalid/storage/v1/object/public/avatars/'+uid+'/avatar.webp',role:'admin',exp:9999999999}});
  const {withSharedMemberIdentity}=load(path.join(website,'src/lib/shared-member-identity.ts'),{'server-only':{},react:{cache:f=>f},'./client-auth-core':{isStorableAvatarUrl:v=>typeof v==='string'&&v.startsWith('https://test.invalid/storage/v1/object/public/avatars/')}});
  const session={supabaseUserId:uid,name:'Old name',role:'member',exp:42,email:'member@example.test'};
  const result=await withSharedMemberIdentity(session);assert.equal(result.name,'New name');assert.equal(result.role,'member');assert.equal(result.exp,42);assert.equal(result.email,session.email);
  global.fetch=async()=>Response.json({id:'different-member',user_metadata:{full_name:'Wrong'}});assert.deepEqual(await withSharedMemberIdentity(session),session);
  global.fetch=originalFetch;
});
test('app photo uploader refuses unauthenticated requests and oversized streaming bodies before forwarding',async()=>{
  const route=load(path.resolve('app/api/profile/photo/route.ts'),{'@supabase/supabase-js':{createClient:()=>({auth:{getUser:async()=>({data:{user:{id:uid}},error:null})}})},'@/lib/server/profilePhotoImage':{sanitiseImage:sanitise}});
  const denied=await route.POST(new Request('https://app.invalid/api/profile/photo',{method:'POST',body:'x'}));assert.equal(denied.status,401);
  let calls=0;global.fetch=async()=>{calls++;throw new Error('Should not forward');};
  const large=await route.POST(new Request('https://app.invalid/api/profile/photo',{method:'POST',headers:{Authorization:'Bearer test'},body:new Uint8Array(524289)}));assert.equal(large.status,413);assert.equal(calls,0);
  const invalid=await route.POST(new Request('https://app.invalid/api/profile/photo',{method:'POST',headers:{Authorization:'Bearer test'},body:'not an image'}));assert.equal(invalid.status,415);assert.equal(calls,0);global.fetch=originalFetch;
});
test('website photo uploader binds writes to verified bearer identity and denies expired tokens',{skip:!websitePresent},async()=>{
 let written=null;const route=load(path.join(website,'src/app/api/app/profile-photo/route.ts'),{'@/lib/member-avatar':{AVATAR_MAX_BYTES:524288,writeMemberAvatar:async(id,bytes)=>{written=id;return {status:'ok',url:'https://test.invalid/photo'}}}});
 global.fetch=async()=>new Response('',{status:401});let response=await route.POST(new Request('https://web.invalid/api/app/profile-photo',{method:'POST',headers:{Authorization:'Bearer expired'},body:'image'}));assert.equal(response.status,401);assert.equal(written,null);
 global.fetch=async()=>Response.json({id:uid});response=await route.POST(new Request('https://web.invalid/api/app/profile-photo?userId=attacker',{method:'POST',headers:{Authorization:'Bearer valid'},body:'image'}));assert.equal(response.status,200);assert.equal(written,uid);global.fetch=originalFetch;
});
