const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const exportsObject = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/planning/goalBank.ts', 'utf8'), {compilerOptions: {module: ts.ModuleKind.CommonJS}}).outputText, {exports: exportsObject});
const {mergeGoalBank, completeBankGoal, validGoalBank} = exportsObject;
test('all targets form one goal, with legacy entries preserved and no goal created for an unfinished preface', () => {
  assert.equal(mergeGoalBank([], {goalTitle: 'My next goal'}, '2026-11-10').length, 0);
  const legacy = {id: 'old', key: 'targetProtein', title: 'Protein', target: '150', unit: 'g', createdAt: '2026-11-01', updatedAt: '2026-11-01'};
  const bank = mergeGoalBank([legacy], {planDirections: ['Strength'], goalTitle: 'Get stronger', targetProtein: '150', targetWeeklySessions: '3'}, '2026-11-10');
  assert.equal(bank.length, 1);
  assert.equal(bank[0].title, 'Get stronger');
  assert.equal(bank[0].snapshot.targetWeeklySessions, '3');
  assert.equal(bank[0].legacyEntries[0].id, 'old');
});
test('autosave updates an active goal instead of creating entries for keystrokes', () => {
  const bank = mergeGoalBank([], {planDirections: ['Strength'], targetProtein: '1'}, '2026-11-10T10:00:00Z');
  const updated = mergeGoalBank(bank, {planDirections: ['Strength'], targetProtein: '150'}, '2026-11-10T10:01:00Z');
  assert.equal(updated.length, 1);
  assert.equal(updated[0].id, bank[0].id);
  assert.equal(updated[0].snapshot.targetProtein, '150');
  assert.equal(bank[0].snapshot.targetProtein, '1');
});
test('completed goals retain their target and completion date without duplicate recreation', () => {
  const bank = mergeGoalBank([], {planDirections: ['Strength'], targetProtein: '150'}, '2026-11-10T10:00:00Z');
  const completed = completeBankGoal(bank, bank[0].id, '2026-11-11T10:00:00Z');
  assert.equal(mergeGoalBank(completed, {planDirections: ['Strength'], targetProtein: '150'}, '2026-11-12T10:00:00Z').length, 1);
  const changed = mergeGoalBank(completed, {planDirections: ['Strength'], targetProtein: '160'}, '2026-11-12T10:00:00Z');
  assert.equal(changed.length, 2);
  assert.equal(changed[0].snapshot.targetProtein, '150');
  assert.equal(changed[0].completedAt, '2026-11-11T10:00:00Z');
  assert.equal(changed[1].completedAt, undefined);
  assert.equal(validGoalBank(changed), true);
  assert.equal(validGoalBank([{title: 'broken'}]), false);
});
