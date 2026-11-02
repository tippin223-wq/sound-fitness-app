const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
const source=fs.readFileSync('components/dashboard/WeeklyRewardSpin.tsx','utf8');
const ast=ts.createSourceFile('spin.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
let declaration;
function visit(n){if(ts.isVariableDeclaration(n)&&n.name.getText(ast)==='refresh')declaration=n.getText(ast);ts.forEachChild(n,visit);}visit(ast);
function harness(getSession){
 const statuses=[],errors=[],published=[],calls=[];
 const env={exports:{},useCallback:fn=>fn,generation:{current:1},pending:{current:false},
  supabase:{auth:{getSession,getUser:()=>{throw Error('Redundant user lookup');}},rpc:async(name)=>{calls.push(name);return {data:{availableSpins:0,weekStart:null,currentDays:0,balances:{coins:0,bolts:0,sapphire:0,topaz:0,ruby:0,emerald:0}},error:null};}},
  setStatus:x=>statuses.push(x),setError:x=>errors.push(x),publishWeeklyRewards:(...x)=>published.push(x),setRequestWeek:()=>{},setPrize:()=>{},setRevealed:()=>{}};
 const code=ts.transpileModule('const '+declaration+';exports.refresh=refresh;',{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 new Function(...Object.keys(env),code)(...Object.values(env));
 return {env,statuses,errors,published,calls,refresh:env.exports.refresh};
}
test('weekly rewards use the dashboard session and server-confirmed balances',async()=>{
 const h=harness(async()=>({data:{session:{user:{id:'member'}}},error:null}));
 await h.refresh();assert.deepEqual(h.calls,['weekly_reward_spin_status']);assert.equal(h.published[0][0],'member');assert.equal(h.statuses[0].availableSpins,0);assert.equal(h.errors.at(-1),'');
});
test('missing preview session stays quiet without inventing spin eligibility',async()=>{
 const h=harness(async()=>({data:{session:null},error:null}));await h.refresh();
 assert.equal(h.calls.length,0);assert.equal(h.statuses.at(-1),null);assert.equal(h.errors.length,0);assert.deepEqual(h.published,[[null,null]]);
});
test('a late session response cannot populate another account rewards',async()=>{
 let resolve;const h=harness(()=>new Promise(r=>{resolve=r;}));const pending=h.refresh();
 h.env.generation.current++;resolve({data:{session:{user:{id:'old-member'}}},error:null});await pending;
 assert.equal(h.calls.length,0);assert.equal(h.statuses.length,0);assert.equal(h.published.length,0);
});
