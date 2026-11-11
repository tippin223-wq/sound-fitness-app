const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, deps = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {compilerOptions: {module: ts.ModuleKind.CommonJS}}).outputText, {exports, require: name => deps[name] || {}});
  return exports;
}
const care = load('lib/trainingAreaCare.ts');
test('avatar pain colors follow the exact area and side without tinting the other arm', () => {
  const profile = {areas: ['Left Forearms', 'Neck'], areaCareLevels: {'Left Forearms': 9, Neck: 4}};
  assert.equal(care.avatarAreaPainLevel(profile, 'forearms', 'left forearm flexors'), 9);
  assert.equal(care.avatarAreaPainLevel(profile, 'forearms', 'right forearm flexors'), undefined);
  assert.equal(care.avatarAreaPainLevel(profile, 'neck', 'right neck'), 4);
  assert.equal(care.painLevelColor(9), '#f87171');
  assert.equal(care.painLevelColor(4), '#fbbf24');
});
test('an explicit no-concerns answer suppresses stale pain data', () => {
  const preferences = {noAreasOfConcern: true, areas: ['Neck'], areaCareLevels: {Neck: 10}};
  assert.equal(care.avatarAreaPainLevel(preferences, 'neck', 'left neck'), undefined);
  assert.equal(care.trainingAreaCareContext(preferences).length, 0);
});
test('precautions keep exact sided areas, ignore removed areas, and never invent missing scores', () => {
  const context = care.trainingAreaCareContext({areas: ['Left Forearms', 'Neck', 'Core'], areaCareLevels: {'Left Forearms': 10, Neck: 3, Core: 99, Chest: 8}});
  assert.match(context[0], /Left Forearms: 10\/10.*avoid/);
  assert.match(context[1], /3\/10.*light care/);
  assert.match(context[2], /confirm the care level/);
  assert.equal(context.length, 3);
});
test('plan recommendations and training-day notes carry the saved area precautions', () => {
  const numbers = load('lib/planning/goalNumbers.ts');
  const recommendation = load('lib/planning/recommendation.ts', {
    '../trainingAreaCare': care,
    './goalNumbers': numbers,
    './goals': {normalizeGoals: goals => goals},
    './dates': {validDateOnly: () => true},
  });
  const plan = recommendation.recommendPlan({trainingRegressions: {areas: ['Neck'], movements: [], adjustments: [], areaCareLevels: {Neck: 10}}}, {primaryGoal: 'Strength', targetWeeklySessions: '3'});
  assert.ok(plan.reasons.some(reason => /Neck: 10\/10.*avoid/.test(reason)));
  assert.ok(plan.days.filter(day => day.training).every(day => /Neck: 10\/10.*avoid/.test(day.notes)));
});
