const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
function load(file, imports = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports, require: name => { if (!(name in imports)) throw Error(name); return imports[name]; } });
  return exports;
}
const dates = load('lib/planning/dates.ts');
const schema = load('lib/planning/supportSignalValidation.ts', { './dates': dates });
test('support records reject invalid scores, dates, duplicate ids, and malformed history', () => {
  const row = { id: 'one', kind: 'sleep', date: '2026-11-03', value: 7, notes: '', recordedAt: '2026-11-03T12:00:00Z' };
  assert.equal(schema.validSupportHistory([row]), true);
  for (const patch of [{ value: 11 }, { value: 0 }, { value: 1.5 }, { date: '2026-02-30' }, { recordedAt: 'bad' }, { kind: 'unknown' }]) assert.equal(schema.validSupportHistory([{ ...row, ...patch }]), false);
  assert.equal(schema.validSupportHistory([row, row]), false);
  assert.equal(schema.validSupportHistory(null), false);
  assert.equal(schema.validSupportHistory([{ ...row, kind: 'core', value: 0 }]), true);
});

test('blood pressure requires a paired reading and retries compare both values', () => {
  const row = { id:'bp', kind:'bloodPressure', date:'2026-11-09', value:120, diastolic:80, notes:'', recordedAt:'2026-11-09T12:00:00Z' };
  assert.equal(schema.validSupportHistory([row]), true);
  for (const patch of [{diastolic:undefined}, {diastolic:120}, {diastolic:0}, {value:NaN}, {diastolic:80.5}]) assert.equal(schema.validSupportHistory([{...row,...patch}]), false);
  let values = {}, writes=0;
  const store = {planningOwner:()=> 'member', planningAccountGeneration:()=>1, planningStatus:'Ready', planningSnapshot:()=>values, writePlanning:(key,value)=>{values[key]=value;writes++;}};
  const api=load('lib/planning/supportSignalRecords.ts', {'./dates':dates,'./store':store,'./supportSignalValidation':schema});
  const {recordedAt,...input}=row;
  api.saveSupportRecord(input,'member',1,new Date(recordedAt));
  api.saveSupportRecord(input,'member',1,new Date(recordedAt));
  assert.equal(writes,1);
  assert.throws(()=>api.saveSupportRecord({...input,diastolic:81},'member',1,new Date(recordedAt)), /changed/);
});
test('saves are account guarded, retry safe, and preserve damaged records', () => {
  let values = {}, writes = 0, account = 'member', generation = 1;
  const store = { planningOwner: () => account, planningAccountGeneration: () => generation, planningSnapshot: () => values, planningStatus: 'Ready', writePlanning: (key, value) => { values[key] = value; writes++; } };
  const api = load('lib/planning/supportSignalRecords.ts', { './dates': dates, './store': store, './supportSignalValidation': schema });
  const input = { id: 'one', kind: 'stress', date: '2026-11-03', value: 4, notes: ' daily ' }, now = new Date('2026-11-03T20:00:00Z');
  api.saveSupportRecord(input, account, generation, now);
  api.saveSupportRecord(input, account, generation, now);
  assert.equal(writes, 1);
  assert.throws(() => api.saveSupportRecord({ ...input, value: 5 }, account, generation, now), /changed/);
  account = 'other'; assert.throws(() => api.saveSupportRecord(input, 'member', generation, now), /account/);
  account = 'member'; generation++; assert.throws(() => api.saveSupportRecord(input, account, 1, now), /account/);
  store.planningStatus = 'Sync conflict'; assert.throws(() => api.saveSupportRecord(input, account, generation, now), /conflict/);
  store.planningStatus = 'Ready'; values[schema.SUPPORT_RECORDS_KEY] = { original: 'preserved' };
  assert.throws(() => api.saveSupportRecord(input, account, generation, now), /review/);
  assert.equal(writes, 1);
});
test('meter evidence uses actual daily records, keeps zero sets, and excludes future records', () => {
  const health = { latestCheckIn: null, nutritionIssue: '', checkInDays: [{ date: '2026-11-03', sleep: 8, core: 0 }, { date: '2026-11-04', sleep: 2 }] };
  const evidence = load('lib/planning/bodyCommandEvidence.ts', { './mealValidation': load('lib/planning/mealValidation.ts', { './dates': dates }), './nutritionSummary': { nutritionDay: () => ({ mealCount: 0, nutrients: {calories: {value:null}, protein: {value:null}, carbs: {value:null}, fat: {value:null}} }) }, './dashboardHealthEvidence': { readDashboardHealthEvidence: () => health }, './store': { planningKeys: { meals: 'meals', profile: 'profile' }, planningSnapshot: () => ({}) }, './dates': dates, './supportSignalValidation': schema });
  const base = { date: '2026-11-03', notes: '', recordedAt: '2026-11-03T12:00:00Z' };
  const rows = [{ ...base, id: 'sleep', kind: 'sleep', value: 8 }, { ...base, id: 'core', kind: 'core', value: 0 }, { ...base, id: 'later', date: '2026-11-04', kind: 'sleep', value: 2 }];
  const actual = evidence.readBodyCommandEvidence(new Date('2026-11-03T20:00:00Z'), { [schema.SUPPORT_RECORDS_KEY]: rows });
  assert.equal(actual.sleep.value, '8/10'); assert.equal(actual.core.value, '0 sets'); assert.equal(actual.core.recorded, true); assert.equal(actual.fatigue.recorded, false);
  assert.equal(actual.readiness.value, '80/100');
  health.checkInDays[0].stress = 4;
  assert.equal(evidence.readBodyCommandEvidence(new Date('2026-11-03T20:00:00Z'), { [schema.SUPPORT_RECORDS_KEY]: rows }).readiness.value, '70/100');
  health.checkInDays = [];
  assert.equal(evidence.readBodyCommandEvidence(new Date('2026-11-03T20:00:00Z'), {}).readiness.recorded, false);
  const pressure = {...base, id:'bp', kind:'bloodPressure',value:120,diastolic:80};
  const future = {...pressure,id:'future',date:'2026-11-04',value:130};
  const withPressure=evidence.readBodyCommandEvidence(new Date('2026-11-03T20:00:00Z'), {[schema.SUPPORT_RECORDS_KEY]:[pressure,future]});
  assert.equal(withPressure.bloodPressure.value,'120/80');
});

test('caffeine validates milligrams and totals only recorded intake for today', () => {
  const base={kind:'caffeine',date:'2026-11-03',notes:'',recordedAt:'2026-11-03T12:00:00Z'};
  assert.equal(schema.validSupportHistory([{...base,id:'zero',value:0}]),true);
  for(const value of [-1,1.5,NaN,Infinity,10001]) assert.equal(schema.validSupportHistory([{...base,id:'bad',value}]),false);
  const evidence=load('lib/planning/bodyCommandEvidence.ts',{'./mealValidation':{validMealHistory:()=>true},'./nutritionSummary':{nutritionDay:()=>({mealCount:0,nutrients:{protein:{value:null},carbs:{value:null},fat:{value:null}}})},'./dashboardHealthEvidence':{readDashboardHealthEvidence:()=>({latestCheckIn:null,nutritionIssue:'',checkInDays:[]})},'./store':{planningKeys:{meals:'meals',profile:'profile'},planningSnapshot:()=>({})},'./dates':dates,'./supportSignalValidation':schema});
  const now=new Date('2026-11-03T20:00:00Z');
  const rows=[{...base,id:'coffee',value:100},{...base,id:'tea',value:30},{...base,id:'yesterday',date:'2026-11-02',value:80},{...base,id:'future',recordedAt:'2026-11-03T23:00:00Z',value:70}];
  assert.equal(evidence.readBodyCommandEvidence(now,{[schema.SUPPORT_RECORDS_KEY]:rows}).caffeine.value,'130 mg');
  assert.equal(evidence.readBodyCommandEvidence(now,{}).caffeine.recorded,false);
  assert.equal(evidence.readBodyCommandEvidence(now,{[schema.SUPPORT_RECORDS_KEY]:[{...base,id:'zero',value:0}]}).caffeine.value,'0 mg');
});
