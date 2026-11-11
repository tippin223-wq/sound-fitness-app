const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const exportsObject = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/profileFasting.ts', 'utf8'), {compilerOptions: {module: ts.ModuleKind.CommonJS}}).outputText, {exports: exportsObject});
const {readFastingPeriods, updateFastingPeriods} = exportsObject;
test('existing fasting answers become an editable card without losing schedule details', () => {
  const value = {fastingStatus: 'Sometimes', fastingStart: '20:00', fastingEnd: '10:00', fastingNotes: 'Occasional', dietPreferences: ['Vegetarian']};
  const periods = readFastingPeriods(value);
  assert.equal(periods.length, 1);
  assert.equal(periods[0].kind, 'Occasional');
  assert.equal(periods[0].start, '20:00');
  const updated = updateFastingPeriods(value, [...periods, {id: 'new', kind: 'Regular', start: '', end: '', notes: ''}]);
  assert.equal(updated.fastingPeriods.length, 2);
  assert.equal(updated.fastingPeriods[0].notes, 'Occasional');
  assert.deepEqual(updated.dietPreferences, ['Vegetarian']);
  assert.equal(value.fastingPeriods, undefined);
});
test('removing a period differs from an explicit no-fasting answer and never restores cleared cards', () => {
  const value = {fastingStatus: 'Yes', fastingStart: '20:00'};
  const removed = updateFastingPeriods(value, []);
  assert.equal(removed.fastingStatus, undefined);
  assert.equal(readFastingPeriods(removed).length, 0);
  const none = updateFastingPeriods(value, [], true);
  assert.equal(none.fastingStatus, 'No');
  assert.equal(readFastingPeriods(none).length, 0);
});
