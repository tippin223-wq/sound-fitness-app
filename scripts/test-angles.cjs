const fs = require('node:fs');
const assert = require('node:assert/strict');
const test = require('node:test');
const ts = require('typescript');
const api = {};
new Function('exports', ts.transpileModule(fs.readFileSync('lib/angles/assessment.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText)(api);
const { kneeAngle, SquatCounter, analyzePose, readHistory, saveResult, historyKey } = api;
const owner = '11111111-1111-4111-8111-111111111111';
const result = { id: '22222222-2222-4222-8222-222222222222', startedAt: 1000, completedAt: 5000,
  mode: 'Assessment', reps: 1, minKneeAngle: 90, maxKneeAngle: 170, reliableSamples: 20 };
class MemoryStorage { values = new Map(); getItem(key) { return this.values.get(key) ?? null; } setItem(key, value) { this.values.set(key, value); } }

test('angles respect image aspect ratio and reject degenerate joints', () => {
  assert.ok(Math.abs(kneeAngle({x:1,y:1},{x:0,y:0},{x:1,y:0},2,1) - 26.565) < .001);
  assert.equal(kneeAngle({x:0,y:0},{x:0,y:0},{x:1,y:0},2,1), null);
  assert.equal(kneeAngle({x:1,y:1},{x:0,y:0},{x:1,y:0},0,1), null);
});
test('counter requires sustained standing, depth, then standing', () => {
  const counter = new SquatCounter();
  for (const [angle,time] of [[90,100],[90,350],[170,400],[170,650],[90,700],[90,950],[170,1000]]) counter.update(angle,true,time);
  assert.equal(counter.reps,0); counter.update(170,true,1250); assert.equal(counter.reps,1);
});
test('tracking gaps, non-monotonic frames and interruptions discard partial reps', () => {
  for (const interruption of ['gap','backwards','pause','unreliable']) {
    const counter = new SquatCounter();
    for (const [angle,time] of [[170,100],[170,350],[90,400],[90,650]]) counter.update(angle,true,time);
    if (interruption === 'pause') counter.invalidate();
    else counter.update(interruption==='unreliable'?null:170, interruption!=='unreliable', interruption==='gap'?2000:600);
    counter.update(170,true,2100); counter.update(170,true,2350);
    assert.equal(counter.reps,0, interruption);
  }
});
test('visibility and framing gate both knees before counting', () => {
  const points = Array.from({length:33},()=>({x:.5,y:.5,visibility:1,presence:1}));
  for (const [hip,knee,ankle] of [[23,25,27],[24,26,28]]) {
    points[hip]={x:.4,y:.2,visibility:1,presence:1}; points[knee]={x:.5,y:.5,visibility:1,presence:1}; points[ankle]={x:.4,y:.8,visibility:1,presence:1};
  }
  assert.equal(analyzePose(points,640,480).reliable,true);
  points[11].visibility=.2; assert.equal(analyzePose(points,640,480).reliable,false);
  points[11].visibility=1; points[28].x=1.2; assert.equal(analyzePose(points,640,480).reliable,false);
});
test('saved results are idempotent and guest/account History remains separate', () => {
  const store=new MemoryStorage(); saveResult(store,null,result); saveResult(store,null,result);
  assert.equal(readHistory(store,null).length,1); assert.deepEqual(readHistory(store,owner),[]);
  saveResult(store,owner,result); assert.equal(readHistory(store,owner).length,1);
  assert.throws(()=>saveResult(store,owner,{...result,reps:3}),/different result/);
  result.reps=7; assert.equal(readHistory(store,owner)[0].reps,1); result.reps=1;
});
test('corrupt History, invalid summaries and storage failures preserve originals', () => {
  const store=new MemoryStorage(); store.setItem(historyKey(null),'broken original');
  assert.throws(()=>saveResult(store,null,result)); assert.equal(store.getItem(historyKey(null)),'broken original');
  const healthy=new MemoryStorage(); saveResult(healthy,null,result); const before=healthy.getItem(historyKey(null));
  assert.throws(()=>saveResult(healthy,null,{...result,id:'bad'})); assert.equal(healthy.getItem(historyKey(null)),before);
  assert.throws(()=>saveResult({getItem:()=>before,setItem:()=>{throw Error('quota')}},null,{...result,id:'33333333-3333-4333-8333-333333333333'}),/quota/);
  assert.equal(saveResult({getItem:()=>before,setItem:()=>{throw Error('should not write')}},null,Object.fromEntries(Object.entries(result).reverse())).length,1);
});
