const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const mod = { exports: {} };
new Function('exports', ts.transpileModule(fs.readFileSync('lib/weeklyRewardRarity.ts','utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(mod.exports);
const { WEEKLY_REWARDS, WEEKLY_RARITY_ODDS, weeklyRarityOdds, selectWeeklyTestReward } = mod.exports;
test('all unlocked reward grades have concrete quantities and details', () => {
  WEEKLY_REWARDS.forEach((reward,index) => {
    for(let tier=reward.minimum;tier<= (reward.maximum ?? 4);tier++) {
      const award=mod.exports.weeklyRewardAward(index,tier);
      assert.match(award.amount,/^[1-9]/);
      assert.ok(award.detail.length>20);
      assert.doesNotMatch(award.amount,/defined/i);
    }
    if(reward.minimum) assert.throws(()=>mod.exports.weeklyRewardAward(index,reward.minimum-1));
  });
  assert.equal(mod.exports.weeklyRewardAward(0,4).amount,'500 coins');
  assert.equal(mod.exports.weeklyRewardAward(3,2).amount,'100 coins + 3 bolts + 1 gem');
  assert.equal(mod.exports.weeklyRewardAward(7,1).amount,'1 streak shield');
  assert.throws(()=>mod.exports.weeklyRewardAward(7,2));
});
test('every day has valid odds, with monotonically improving chances at every rarity threshold', () => {
  assert.equal(WEEKLY_REWARDS.length,9);
  assert.deepEqual(weeklyRarityOdds(0),[0,0,0,0,0]);
  for (let day=1;day<=7;day++) {
    const odds = weeklyRarityOdds(day);
    for(let tier=day;tier<5;tier++) assert.equal(odds[tier],0,'locked tiers cannot be selected');
    assert.equal(odds.reduce((a,b)=>a+b,0),100);
    if(day>1) for(let tier=1;tier<5;tier++) assert.ok(odds.slice(tier).reduce((a,b)=>a+b,0) >= weeklyRarityOdds(day-1).slice(tier).reduce((a,b)=>a+b,0));
    let cursor=0;
    odds.forEach((chance,tier)=>{
      if(chance) for(const itemRoll of [0,.5,.999999]) {
        const selected=selectWeeklyTestReward(day,(cursor+chance/2)/100,itemRoll);
        assert.equal(selected.tier,tier);
        assert.ok(WEEKLY_REWARDS[selected.result].minimum<=tier);
        assert.ok(tier <= (WEEKLY_REWARDS[selected.result].maximum ?? 4));
      }
      cursor+=chance;
    });
  }
  assert.deepEqual(weeklyRarityOdds(8),WEEKLY_RARITY_ODDS[6]);
  assert.throws(()=>selectWeeklyTestReward(0,.5,.5));
});
