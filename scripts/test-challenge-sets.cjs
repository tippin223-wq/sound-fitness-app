const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
const exports_={};
new Function('exports',ts.transpileModule(fs.readFileSync('lib/planning/challengeSets.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(exports_);
const {challengeSets,currentChallengeSet}=exports_;
const metrics=(tasks)=>Object.fromEntries(tasks.map(c=>[c.metric,{value:c.target,source:'Saved activity'}]));
test('nine categories have ten sets of three with strictly increasing targets',()=>{
  assert.equal(Object.keys(challengeSets).length,9);
  for(const sets of Object.values(challengeSets)) {
    assert.equal(sets.length,10);assert.ok(sets.every(set=>set.challenges.length===3));
    assert.equal(new Set(sets.flatMap(set=>set.challenges.map(c=>c.label))).size,30);
    for(let i=1;i<10;i++)for(let slot=0;slot<3;slot++)assert.ok(sets[i].challenges[slot].target>sets[i-1].challenges[slot].target);
  }
});
test('all three measured targets must be met before advancing',()=>{
  const tasks=challengeSets.strength[0].challenges,values=metrics(tasks);values[tasks[2].metric].value--;
  assert.equal(currentChallengeSet('strength',values).index,0);
  values[tasks[2].metric].value++;assert.equal(currentChallengeSet('strength',values).index,1);
  assert.equal(currentChallengeSet('cardio',values).index,0);
});
test('missing tracking and review states never complete challenges',()=>{
  const tasks=challengeSets.strength[0].challenges,values=metrics(tasks);
  values[tasks[2].metric].issue='Review records';assert.equal(currentChallengeSet('strength',values).index,0);
  assert.equal(currentChallengeSet('cardio',{}).challenges.length,3);
  assert.ok(currentChallengeSet('cardio',{}).challenges.every(c=>c.value===null&&!c.complete));
});
test('final milestones finish at set ten without wrapping',()=>{
  const current=currentChallengeSet('nutrition',metrics(challengeSets.nutrition[9].challenges));
  assert.equal(current.finished,true);assert.equal(current.index,9);assert.equal(current.completed,30);assert.equal(current.challenges.length,3);
});