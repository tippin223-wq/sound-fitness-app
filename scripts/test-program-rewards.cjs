const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const cache = new Map();
function load(file) {
  file = path.resolve(file);
  if (cache.has(file)) return cache.get(file).exports;
  const mod = { exports: {} }; cache.set(file, mod);
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  new Function('require', 'exports', 'module', source)(id => load(path.resolve(path.dirname(file), id + '.ts')), mod.exports, mod);
  return mod.exports;
}
const { PROGRAM_COSMETICS } = load('lib/rewards/programRewardCatalog.ts');
const { allocateProgramRewardTracks: allocate, programLevelBudget: budget } = load('lib/rewards/programRewardTracks.ts');
const examples = [2, 3, 4, 5, 6].map(days => ({ programId: `example-${days}-days`, title: `12-week / ${days} workouts per week`, totalLevels: budget(days * 12, 1200) }));
const neverDraw = () => { throw Error('A saved track must not reroll'); };

test('five illustrative schedules have one reward per level and 58 globally distinct milestone designs', () => {
  const tracks = allocate(examples, [], () => .5);
  assert.deepEqual(tracks.map(track => track.totalLevels), [36, 48, 60, 72, 84]);
  const cosmetics = tracks.flatMap(track => track.rewards.filter(reward => reward.award.kind === 'cosmetic'));
  assert.equal(cosmetics.length, 58);
  assert.equal(new Set(cosmetics.map(reward => reward.award.cosmeticId)).size, 58);
  assert.equal(new Set(tracks.flatMap(track => track.rewards.map(reward => reward.id))).size, 300);
  for (const track of tracks) {
    assert.equal(track.rewards.length, track.totalLevels);
    for (const reward of track.rewards) assert.equal(reward.award.kind, reward.level % 5 === 0 ? 'cosmetic' : 'currency');
  }
  assert.equal(new Set(PROGRAM_COSMETICS.map(item => item.design)).size, PROGRAM_COSMETICS.length);
  assert.equal(new Set(PROGRAM_COSMETICS.map(item => item.name)).size, PROGRAM_COSMETICS.length);
});

test('adding a program, changing input order, and reopening preserve every saved reward', () => {
  const saved = allocate(examples.slice(0, 2), [], () => .81);
  assert.deepEqual(allocate([...examples.slice(0, 2)].reverse(), saved, neverDraw), saved);
  const expanded = allocate(examples, saved, () => .99);
  assert.deepEqual(expanded.slice(0, 2), saved);
  expanded[0].rewards[0].award.amount = 999;
  assert.equal(saved[0].rewards[0].award.amount, 1, 'returned tracks cannot mutate saved input');
});

test('random draws select only fixed currency amounts at all pool boundaries', () => {
  const expected = [[0, 'coins', 50], [.599999, 'coins', 50], [.6, 'bolts', 5], [.8, 'sapphire', 1], [.9, 'topaz', 1], [.97, 'ruby', 1], [.999999, 'ruby', 1]];
  for (const [roll, asset, amount] of expected) {
    const [track] = allocate([{ programId: 'boundary', title: 'Boundary', totalLevels: 1 }], [], () => roll);
    assert.deepEqual(track.rewards[0].award, { kind: 'currency', asset, amount });
  }
  for (const roll of [-1, 1, NaN, Infinity]) assert.throws(() => allocate(examples.slice(0, 1), [], () => roll));
});

test('catalog exhaustion fails before drawing or reusing an item', () => {
  assert.throws(() => allocate([{ programId: 'too-long', title: 'Long', totalLevels: 305 }], [], neverDraw), /more distinct/);
});

test('altered or duplicate saved tracks cannot silently replace a reward', () => {
  const saved = allocate(examples.slice(0, 1), [], () => .2);
  assert.throws(() => allocate([{ ...examples[0], totalLevels: 40 }], saved, neverDraw), /fixed/);
  assert.throws(() => allocate([examples[0], examples[0]], saved, neverDraw), /more than once/);
  assert.throws(() => allocate([], [saved[0], saved[0]], neverDraw), /review/);
  for (const mutate of [
    track => { track.rewards[0].award.amount = 999; },
    track => { track.rewards[9].award.cosmeticId = track.rewards[4].award.cosmeticId; },
    track => { track.rewards.pop(); },
    track => { track.rewards[0].id = 'wrong'; },
  ]) {
    const bad = structuredClone(saved); mutate(bad[0]);
    assert.throws(() => allocate([], bad, neverDraw));
  }
});

test('budgets reject unreachable fractional endpoints and malformed schedules', () => {
  assert.equal(budget(48, 1200), 60);
  for (const [workouts, supporting] of [[0, 0], [-1, 0], [1.5, 0], [1, -25], [1, 25], [1, NaN], [1001, 0]]) assert.throws(() => budget(workouts, supporting));
  for (const totalLevels of [0, -1, 1.5, 1001, NaN]) assert.throws(() => allocate([{ programId: 'invalid', title: 'Invalid', totalLevels }], [], neverDraw));
});
