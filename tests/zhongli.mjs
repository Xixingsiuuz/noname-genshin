import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const source = readFileSync(new URL('../character/skills/zhongli.js', import.meta.url), 'utf8');
const spoken = [];
const game = { players: [], trySkillAudio(id, player, direct) { assert.equal(direct, true); spoken.push(id); }, countPlayer(fn) { return this.players.filter(p => p.isIn() && fn(p)).length; },
  hasPlayer(fn) { return this.players.some(p => p.isIn() && fn(p)); } };
const { skills, refreshQianyan } = new Function('game', 'get', source.replace(/^import .*;\r?\n/, '')
  .replaceAll('export const ', 'const ').replaceAll('export function ', 'function ')
  .replace('export default', 'const skills =') + '; return {skills, refreshQianyan};')(game, {name: card => card.name});
const log = [];
function person(armor = 1, owned = []) {
  return { hujia: armor, owned, storage: {}, additionalSkills: {}, stat: {}, hand: 4, alive: true, hp: 4, group: 'shu',
    getStat() { return this.stat; },
    rescueCards: [], getCards() { return this.rescueCards; },
    canSaveCard(card, target) { assert.equal(target, this); return !card.disabled; },
    isIn() { return this.alive; }, hasSkill(s) { return this.owned.includes(s); },
    hasZhuSkill() { return this.lord; }, countCards() { return this.hand; }, countDiscardableCards() { return this.discardable || 0; },
    addAdditionalSkill(key, value) { this.additionalSkills[key] = value; },
    removeAdditionalSkill(key) { delete this.additionalSkills[key]; },
    async changeHujia(n, type, limit) {
      if (limit === true) limit = 5;
      if (typeof limit === 'number' && this.hujia + n > limit) n = Math.max(0, limit - this.hujia);
      this.hujia = Math.max(0, this.hujia + n); log.push(['armor', this, n]);
    },
    async loseHp(n) { this.hp -= n; log.push(['hp', n]); if (this.hp <= 0) this.alive = false; },
    async draw(n) { this.hand += n; log.push(['draw', n]); },
    async chooseToDiscard(area, n, forced) { assert.equal(area, 'h'); assert.equal(forced, true); this.hand -= n; },
    discardPlayerCard(target, area, forced) { assert.equal(area, 'hej'); assert(forced); return { forResult: async () => ({bool: !!target.discardable}) }; },
  };
}
const owner = person(1, ['fan_dixin', 'fan_qianyan', 'fan_xianyou']), a = person(), b = person(), c = person();
game.players = [owner, a, b, c];
// 由实际持有主技能展开分组派发，不直接假定子技能已挂载。
async function dispatch(name, event = {}) {
  for (const player of [...game.players]) {
    const ids = player.owned.flatMap(id => [id, ...[skills[id]?.group || []].flat()]);
    for (const id of ids) {
      const skill = skills[id];
      const matches = key => [skill?.trigger?.[key] || []].flat().includes(name);
      if (!(matches('global') || (matches('player') && event.player === player))) continue;
      if (!skill.filter || skill.filter(event, player)) await skill.content({}, event, player);
    }
  }
}
await dispatch('phaseBefore');
assert(a.additionalSkills.fan_qianyan.includes('weijing'));
assert.equal(skills.fan_qianyan_handlimit.mod.maxHandcard(a, 4), 5);
owner.hand = 1; await dispatch('loseAfter', {player: owner}); assert.equal(owner.hand, 4);
owner.hand = 7; await dispatch('gainAfter', {player: owner}); assert.equal(owner.hand, 4);
c.hujia = 0; owner.hand = 2; await dispatch('changeHujiaAfter'); assert.equal(owner.hand, 2);
await dispatch('damageAfter', {player: owner}); assert.equal(owner.hujia, 2);
// 伤害消耗最后护甲后，不满足千岩的实时前置条件。
owner.hujia = 0; await dispatch('damageAfter', {player: owner}); assert.equal(owner.hujia, 0);
await dispatch('changeHujiaAfter'); assert(!a.additionalSkills.fan_qianyan);
assert.equal(skills.fan_qianyan_handlimit.mod.maxHandcard(a, 4), undefined);
owner.hujia = 1; b.hujia = 0; await dispatch('changeHujiaAfter');
a.owned.push('weijing', 'weijing_used');
a.hujia = 0; await dispatch('changeHujiaAfter'); assert(a.owned.includes('weijing')); assert(a.owned.includes('weijing_used'));
a.hujia = 1; await dispatch('changeHujiaAfter'); assert(a.additionalSkills.fan_qianyan); assert(a.owned.includes('weijing_used'));
owner.alive = false; await dispatch('dieAfter', {player: owner}); assert(!a.additionalSkills.fan_qianyan);
owner.alive = true; await dispatch('reviveAfter'); assert(a.additionalSkills.fan_qianyan);
skills.fan_qianyan.onremove(owner); assert(!a.additionalSkills.fan_qianyan);
const second = person(1, ['fan_qianyan']); game.players.push(second); refreshQianyan(owner);
assert(a.additionalSkills.fan_qianyan); game.players.pop();
// 两项共用两次，可重复同一项；模拟原生发动时写入的次数及下一阶段清零。
assert.equal(skills.fan_dixin_give.usable, 2); assert.equal(skills.fan_dixin_remove.usable, 2);
for (const sequence of [['give', 'give'], ['remove', 'remove'], ['give', 'remove'], ['remove', 'give']]) {
  owner.stat = {}; a.hujia = 5;
  for (const option of sequence) {
    assert(skills.fan_dixin_give.filter({}, owner));
    assert(skills.fan_dixin_remove.filter({}, owner));
    const id = `fan_dixin_${option}`;
    owner.stat[id] = (owner.stat[id] || 0) + 1;
  }
  assert(!skills.fan_dixin_give.filter({}, owner));
  assert(!skills.fan_dixin_remove.filter({}, owner));
}
owner.stat = {};
assert(skills.fan_dixin_give.filter({}, owner));
assert(skills.fan_dixin_remove.filter({}, owner));
// 授甲先失体力，再分别加甲；自己可被选中。
log.length = 0; const before = owner.hujia;
await skills.fan_dixin_give.content({target: owner}, {}, owner);
assert.equal(owner.hujia, before + 2); assert.deepEqual(log[0], ['hp', 1]);
a.hujia = 5; await skills.fan_dixin_remove.content({target:a}); assert.equal(a.hujia, 0);
// 自选连续加甲、双方已满甲，以及千岩补甲均不能突破5点。
owner.hujia = 4; owner.hp = 4;
await skills.fan_dixin_give.content({target: owner}, {}, owner); assert.equal(owner.hujia, 5);
owner.hp = 4; a.hujia = 5;
await skills.fan_dixin_give.content({target: a}, {}, owner);
assert.equal(owner.hujia, 5); assert.equal(a.hujia, 5);
b.hujia = 1; await dispatch('damageAfter', {player: owner}); assert.equal(owner.hujia, 5);
owner.hujia = 4; await dispatch('damageAfter', {player: owner}); assert.equal(owner.hujia, 5);
owner.lord = false; a.discardable = 1; assert(!skills.fan_xianyou.filter({}, owner));
owner.lord = true; assert(skills.fan_xianyou.filter({}, owner));
assert(!skills.fan_xianyou.filterTarget(null, owner, owner));
a.group = 'wei'; assert(!skills.fan_xianyou.filterTarget(null, owner, a)); a.group = 'shu';
owner.hand = 4; await skills.fan_xianyou.content({target:a}, {}, owner); assert.equal(owner.hand, 6);
a.discardable = 0; await skills.fan_xianyou.content({target:a}, {}, owner); assert.equal(owner.hand, 6);
assert.deepEqual(skills.fan_qianyan.derivation, ['weijing']);
assert.equal(skills.fan_qianyan.locked, true); assert.equal(skills.fan_xianyou.locked, false);
// AI不能把授甲收益当作抵消致死失体力；每次发动均按当前状态重评。
const giveAI = skills.fan_dixin_give.ai;
for (const hp of [0, 1]) {
  owner.hp = hp;
  for (const armor of [0, 4, 5]) {
    owner.hujia = armor; a.hujia = 0;
    assert.equal(giveAI.order(null, owner), 0);
    assert(giveAI.result.player(owner) < -50);
    assert.equal(giveAI.result.target(owner, owner), 0);
    assert.equal(giveAI.result.target(owner, a), 0);
  }
}
owner.hp = 2; owner.hujia = 0;
assert(giveAI.order(null, owner) > 0);
assert(giveAI.result.player(owner) + giveAI.result.target(owner, owner) > 0);
owner.hp = 1; owner.hujia = 2;
for (const name of ['jiu','tao']) {
  owner.rescueCards = [{name},{name}];
  assert(giveAI.order(null,owner) > 0);
  assert(giveAI.result.player(owner)+giveAI.result.target(owner,owner) > 0);
  owner.rescueCards = [{name,disabled:true}];
  assert.equal(giveAI.order(null,owner),0);
}
owner.rescueCards = [{name:'sha'}]; assert.equal(giveAI.order(null,owner),0);
owner.rescueCards = []; assert.equal(giveAI.order(null,owner),0);
owner.rescueCards = [{name:'jiu'}]; owner.hujia=5;
assert(giveAI.result.player(owner)+giveAI.result.target(owner,owner)<0);
owner.rescueCards = []; owner.hp=2;
owner.hujia = 5; a.hujia = 5;
assert(giveAI.result.player(owner) + giveAI.result.target(owner, a) < 0);
owner.hp = 4; owner.hujia = 0; a.hujia = 0;
assert(giveAI.result.target(owner, a) > 0);
// 刷新/手牌调整保持静音；只有实际补甲或闲游成功弃牌才手动播音。
spoken.length = 0;
a.hujia = 1; b.hujia = 1;
owner.hujia = 5; await dispatch('damageAfter', {player: owner}); assert.deepEqual(spoken, []);
owner.hujia = 4; await dispatch('damageAfter', {player: owner}); assert.deepEqual(spoken, ['fan_qianyan_armor']);
await dispatch('changeHujiaAfter'); assert.equal(spoken.length, 1);
a.discardable = 0; await skills.fan_xianyou.content({target: a}, {}, owner); assert.equal(spoken.length, 1);
a.discardable = 1; await skills.fan_xianyou.content({target: a}, {}, owner);
assert.deepEqual(spoken, ['fan_qianyan_armor', 'fan_xianyou']);
assert.equal(skills.fan_qianyan_armor.logAudio(), false);
assert.equal(skills.fan_xianyou.logAudio(), false);
console.log('钟离：技能结算、AI及分支语音时机模拟通过（未对局实测）');
