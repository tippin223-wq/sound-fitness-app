const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');
const source = ts.transpileModule(fs.readFileSync('lib/planning/achievementEvidence.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const api = {};
vm.runInNewContext(source, { exports: api, require: id => id === '@/lib/routes'
  ? { ROUTES: { dashboard: { sessionHistory: '/history', achievements: '/achievements', goals: '/goals', myPlan: '/plan' } } } : {} });
const rows = api.lifetimeAchievementMilestones({ workouts: 4, trainingDays: 3, recoveryDays: 1 });
assert.equal(rows[0].statusLabel, '4 / 5');
assert.equal(rows[0].progress, 80);
assert.equal(rows[0].category, 'intensity');
assert.equal(rows.length, 21);
assert.ok(rows.findIndex(row => row.status === 'completed') > rows.findIndex(row => row.status === 'active'));
for (const category of ['consistency', 'intensity', 'recovery']) {
  const top = rows.filter(row => row.category === category).slice(0, 5);
  assert.equal(top.length, 5);
  assert.ok(top.every(row => row.category === category));
}
const more = api.lifetimeAchievementMilestones({ workouts: 25, trainingDays: 10, recoveryDays: 5 });
assert.equal(more.find(row => row.label === 'Workouts completed: 25').status, 'completed');
const invalid = api.lifetimeAchievementMilestones({ workouts: 4, trainingDays: 3, recoveryDays: 1, historyIssue: 'Review' });
assert.equal(invalid.find(row => row.category === 'intensity').progress, 0);
assert.equal(invalid.find(row => row.category === 'intensity').statusLabel, 'Review records');
console.log('PASS: lifetime counts, fractional progress, nearest unfinished first, top five per category, completed thresholds and invalid history');
