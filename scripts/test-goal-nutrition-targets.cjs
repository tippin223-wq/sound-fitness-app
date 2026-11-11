const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(path, dependencies = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, 'utf8'), {compilerOptions: {module: ts.ModuleKind.CommonJS}}).outputText, {exports, require: name => dependencies[name] || {}});
  return exports;
}
const numbers = load('lib/planning/goalNumbers.ts');
test('nutrition targets accept optional blanks, zero carbs/fat, and reject malformed values', () => {
  const base = {targetWeeklySessions: '3', targetWeeklySets: '30'};
  assert.equal(numbers.validateGoalTargets({...base, targetCalories: '', targetCarbs: '0', targetFat: '0', targetFiber: '25'}), null);
  for (const bad of ['oops', '-1', 'Infinity']) assert.ok(numbers.validateGoalTargets({...base, targetCalories: bad}));
});
test('shared goals normalization preserves nutrition targets and existing goals', () => {
  const goals = load('lib/planning/goals.ts', {'./goalNumbers': numbers});
  const result = goals.normalizeGoals({planDirections: ['Strength'], targetCalories: 2400, targetCarbs: '250', targetFat: '70', targetFiber: '30', goalMilestones: 'Train consistently'});
  assert.equal(result.targetCalories, '2400');
  assert.equal(result.targetCarbs, '250');
  assert.equal(result.targetFat, '70');
  assert.equal(result.targetFiber, '30');
  assert.equal(result.goalMilestones, 'Train consistently');
});
