const fs = require('node:fs');
const assert = require('node:assert/strict');
const test = require('node:test');
const ts = require('typescript');
const owner = '11111111-1111-4111-8111-111111111111';
const other = '99999999-9999-4999-8999-999999999999';
const result = { id: '22222222-2222-4222-8222-222222222222', startedAt: 1000, completedAt: 5000,
  mode: 'Assessment', reps: 1, minKneeAngle: 90, maxKneeAngle: 170, reliableSamples: 20 };
function load(path, requireMock, storage) {
  const exports={}; new Function('exports','require','localStorage',ts.transpileModule(fs.readFileSync(path,'utf8'),{
    compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},
  }).outputText)(exports,requireMock,storage); return exports;
}
function fixture() {
  const store = new Map(), storage={getItem:key=>store.get(key)??null,setItem:(key,value)=>store.set(key,value)};
  const history = load('lib/angles/assessment.ts',()=>{},storage);
  let identity=owner, rows=[], calls=[], mfa=false, contextRole='training_user';
  const context=()=>({data:{id:identity,role:contextRole,enrollmentSource:'sound_fitness',accessPlan:'free'},error:null});
  const supabase={
    auth:{getUser:async()=>({data:{user:{id:identity,email:'fixture@example.invalid'}},error:null}),
      mfa:{getAuthenticatorAssuranceLevel:async()=>({data:{currentLevel:'aal1',nextLevel:mfa?'aal2':'aal1'},error:null}),
        listFactors:async()=>({data:{totp:[{id:'factor',status:'verified'}]},error:null})}},
    from:()=>({select:()=>({eq:()=>({order:()=>({range:async()=>({data:rows,error:null})})})})}),
    rpc:async(name,args)=>{if(name==='get_angles_account_context')return context();calls.push(args);return {data:{profile_id:owner,id:args.assessment.id,summary:args.assessment,deleted:false},error:null};},
  };
  const account=load('lib/angles/account.ts',name=>name==='./assessment'?history:{supabase},storage);
  return {storage,history,account,supabase,setRows:value=>{rows=value;},setOwner:value=>{identity=value;},setMFA:()=>{mfa=true;},setRole:value=>{contextRole=value;},context,calls};
}
test('cloud tombstones win over stale browser copies without re-upload',async()=>{
  const f=fixture();f.history.saveResult(f.storage,owner,result);f.history.saveResult(f.storage,null,result);
  f.setRows([{profile_id:owner,id:result.id,deleted:true,summary:null}]);
  assert.deepEqual(await f.account.syncHistory(owner),[]);assert.equal(f.calls.length,0);
  assert.equal(f.history.readHistory(f.storage,null).length,1);
});
test('unverified owner, MFA and foreign rows cannot expose or overwrite account history',async()=>{
  const f=fixture();f.history.saveResult(f.storage,owner,result);const before=f.storage.getItem(f.history.historyKey(owner));
  f.setOwner(other);await assert.rejects(f.account.syncHistory(owner),/Sign in/);f.setOwner(owner);
  f.setRows([{profile_id:other,id:result.id,deleted:false,summary:result}]);await assert.rejects(f.account.syncHistory(owner),/Invalid cloud/);
  assert.equal(f.storage.getItem(f.history.historyKey(owner)),before);
  f.setMFA();assert.equal((await f.account.verifiedAccount()).user,null);await assert.rejects(f.account.syncHistory(owner),/Sign in/);
});
test('cloud conflicts, malformed summaries and unconfirmed saves preserve browser originals',async()=>{
  const f=fixture();f.history.saveResult(f.storage,owner,result);const before=f.storage.getItem(f.history.historyKey(owner));
  f.setRows([{profile_id:owner,id:result.id,deleted:false,summary:{...result,reps:8}}]);await assert.rejects(f.account.syncHistory(owner),/Conflicting/);
  f.setRows([{profile_id:owner,id:result.id,deleted:false,summary:{...result,reliableSamples:0}}]);await assert.rejects(f.account.syncHistory(owner),/Invalid cloud summary/);
  f.setRows([]);f.supabase.rpc=async(name)=>name==='get_angles_account_context'?f.context():({data:{id:result.id,profile_id:other,deleted:false,summary:result},error:null});
  await assert.rejects(f.account.syncHistory(owner),/not confirmed/);assert.equal(f.storage.getItem(f.history.historyKey(owner)),before);
});
test('summaries saved during a network round trip survive the final merge',async()=>{
  const f=fixture();f.history.saveResult(f.storage,owner,result);
  const extra={...result,id:'33333333-3333-4333-8333-333333333333'};
  f.supabase.rpc=async(name,args)=>{if(name==='get_angles_account_context')return f.context();f.history.saveResult(f.storage,owner,extra);return {data:{id:result.id,profile_id:owner,deleted:false,summary:args.assessment},error:null};};
  const merged=await f.account.syncHistory(owner);assert.equal(merged.length,2);assert.ok(merged.some(row=>row.id===extra.id));
});
test('account switch during upload leaves local History unchanged',async()=>{
  const f=fixture();f.history.saveResult(f.storage,owner,result);const before=f.storage.getItem(f.history.historyKey(owner));
  f.supabase.rpc=async(name,args)=>{if(name==='get_angles_account_context')return f.context();f.setOwner(other);return {data:{id:result.id,profile_id:owner,deleted:false,summary:args.assessment},error:null};};
  await assert.rejects(f.account.syncHistory(owner),/Account changed/);assert.equal(f.storage.getItem(f.history.historyKey(owner)),before);
});

 test('account context accepts only verified owner and app roles, never signup metadata',async()=>{
 const f=fixture(); assert.equal((await f.account.verifiedAccount()).user.role,'training_user');
 f.setRole('coach');assert.equal((await f.account.verifiedAccount()).user.role,'coach');
 f.setRole('admin');await assert.rejects(f.account.verifiedAccount(),/could not be verified/);
 f.supabase.rpc=async()=>({data:{...f.context().data,id:other},error:null});
 await assert.rejects(f.account.verifiedAccount(),/could not be verified/);
 });
 test('Angles signup labels the product without requesting privileges or coaching',async()=>{
 const f=fixture();let request;f.supabase.auth.signUp=async value=>{request=value;return {error:null};};
 await assert.rejects(f.account.registerAnglesAccount('a@example.invalid','short','A'),/8 characters/);
 await f.account.registerAnglesAccount(' a@example.invalid ','longpassword',' A ');
 assert.deepEqual(request,{email:'a@example.invalid',password:'longpassword',options:{data:{full_name:'A',signup_product:'angles'}}});
 });
