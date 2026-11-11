const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const exportsObject = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/physicalReadiness.ts', 'utf8'), {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020}}).outputText, {exports: exportsObject});
const {physicalReadiness} = exportsObject;
test('the highest body-area pain drives readiness, independent of life factors', () => {
  const preferences = {areas: ['Neck', 'Left Forearms'], areaCareLevels: {Neck: 7, 'Left Forearms': 2}, sleep: 2, stress: 10};
  const before = JSON.stringify(preferences);
  assert.equal(physicalReadiness(preferences).score, 30);
  assert.equal(physicalReadiness({...preferences, sleep: 10, stress: 1}).score, 30);
  assert.equal(JSON.stringify(preferences), before);
});
test('unanswered or unrated areas never imply full readiness', () => {
  assert.equal(physicalReadiness(undefined).score, null);
  assert.equal(physicalReadiness({areas: [], movements: [], adjustments: []}).score, null);
  assert.equal(physicalReadiness({areas: ['Neck', 'Core'], areaCareLevels: {Neck: 7}}).score, null);
  assert.equal(physicalReadiness({areas: ['Neck'], areaCareLevels: {Neck: 99}}).score, null);
  assert.equal(physicalReadiness({noAreasOfConcern: true}).score, 100);
  assert.equal(physicalReadiness({areas: ['Neck'], areaCareLevels: {Neck: 10}}).score, 0);
});
