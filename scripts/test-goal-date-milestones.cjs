const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const exportsObject = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/planning/goalDateMilestones.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports:exportsObject,require:()=>({localDate:date=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`})});
test('milestones use calendar weeks and clamp month-end anniversaries without drifting',()=>{
 const result = exportsObject.goalDateMilestones(new Date(2027,0,31),3);
 assert.equal(result[0].date,'2027-02-14');
 assert.equal(result[1].date,'2027-02-28');
 assert.equal(result[2].date,'2027-03-31');
 assert.equal(result[3].date,'2027-04-30');
});
test('milestones cross years and retain leap day',()=>{
 const result = exportsObject.goalDateMilestones(new Date(2023,11,29),3);
 assert.equal(result[0].date,'2024-01-12');
 assert.equal(result[2].date,'2024-02-29');
 assert.equal(result[3].label,'3 months');
});
