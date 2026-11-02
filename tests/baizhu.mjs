import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const source = readFileSync(new URL('../character/skills/baizhu.js', import.meta.url), 'utf8');
let top = [], movedResult, moveOptions, returned, selectedPhase, judgeNumber = 7, judgeCount = 0;
const lib = { skill: { a: {}, b: {}, extra: {} } };
const get = { cards: () => top, number: c => c.number, suit: c => c.suit, position: c => c.pos, value: c => c.value || 0, attitude: () => 1 };
const game = {
  hasPlayer: filter => [doctor, otherDoctor].some(filter),
  filterPlayer: filter => [doctor, otherDoctor].filter(p => p.isIn() && filter(p)),
  async cardsGotoOrdering(cards) { cards.forEach(c => c.pos = 'o'); },
  async cardsGotoPile(cards) { returned = cards.slice().reverse(); cards.forEach(c => c.pos = 'c'); },
  updateRoundNumber() {},
};
const ui = { ordering: {}, selected: { cards: [], targets: [] } };
const status = { event: { getParent: () => selectedPhase } };
const skills = new Function('lib','game','ui','get','_status', source.replace(/^import .*;\r?\n/, '').replace('export default', 'return'))(lib,game,ui,get,status);
function person(owned = []) {
  return { storage: {}, hand: [], hp: 0, maxHp: 3, owned,
    isIn: () => true, hasSkill(s) { return this.owned.includes(s); },
    getCards(area, filter) { return filter ? this.hand.filter(filter) : this.hand.slice(); },
    countCards() { return this.hand.length; },
    gain(cards) { const promise = Promise.resolve().then(() => { this.hand.push(...cards); cards.forEach(c => { c.pos = 'h'; c.tags = [...tags]; }); }); const tags = []; promise.gaintag = { add: t => tags.push(t) }; return promise; },
    async recover(n = 1) { this.hp = Math.min(this.maxHp, this.hp + n); },
    async lose(cards) { this.hand = this.hand.filter(c => !cards.includes(c)); cards.forEach(c => c.pos = 'o'); },
    chooseToMove() { moveOptions = {}; return { set(k,v) { moveOptions[k] = v; return this; }, async forResult() { return movedResult; } }; },
    judge(options) { judgeCount++; assert.equal(options.judge({number:7}),1); assert.equal(options.judge({number:6}),-1); return { async forResult() { return {number:judgeNumber}; } }; },
    awakenSkill() {}, getOriginalSkills: () => ['a','b'],
    clearSkills() { this.owned = []; }, addSkill(s) { this.owned.push(s); }, async addSkills(s) { this.addSkill(s); },
  };
}
const card = (suit, tags = []) => ({ suit, tags, pos: 'h', hasGaintag(t) { return this.tags.includes(t); } });
const doctor = person(['fan_wenbu']), otherDoctor = person(['fan_wenbu']), visitor = person();
const gift = card('heart'); visitor.hand = [gift]; selectedPhase = {};
assert(skills.fan_wenbu.global === 'fan_wenbu_give');
assert(skills.fan_wenbu_give.filter({},visitor));
await skills.fan_wenbu_give.content({ target: doctor, cards: [gift], getParent: () => selectedPhase },{},visitor);
assert(gift.hasGaintag('fan_wenbu_gift')); assert.equal(visitor.hp,1);
assert(!skills.fan_wenbu_give.filterTarget(null,visitor,doctor));
assert(skills.fan_wenbu_give.filterTarget(null,visitor,otherDoctor));
selectedPhase = {}; assert(skills.fan_wenbu_give.filterTarget(null,visitor,doctor));
ui.selected.cards = [gift]; ui.selected.targets = [doctor]; assert(skills.fan_wenbu_give.filterOk());
ui.selected.cards = []; assert(!skills.fan_wenbu_give.filterOk());
ui.selected.cards = [gift]; ui.selected.targets = []; assert(!skills.fan_wenbu_give.filterOk());
const reward = card('heart'), remain = card('spade'); top = [reward, remain];
movedResult = { bool:true, moved:[[gift,remain],[reward]] };
await skills.fan_tongxuan.content({}, {}, doctor);
assert.deepEqual(returned,[gift,remain]); assert(reward.hasGaintag('fan_tongxuan_free'));
assert(skills.fan_tongxuan.mod.ignoredHandcard(reward));
assert.equal(skills.fan_tongxuan.mod.cardDiscardable(reward,doctor,'phaseDiscard'),false);
assert.equal(skills.fan_tongxuan.mod.cardDiscardable(reward,doctor,'other'),undefined);
assert(!moveOptions.filterMove({link:reward},0,[[reward,remain],[gift]]));
assert(moveOptions.filterMove({link:reward},{link:gift},[[reward,remain],[gift]]));
assert(!moveOptions.filterMove({link:reward},{link:remain},[[gift,remain],[reward]]));
assert(moveOptions.filterMove({link:reward},{link:gift},[[gift,remain],[reward]]));
assert(!moveOptions.filterMove({link:reward},{link:remain},[[reward,remain],[]]));
top = [card('club'),card('spade')]; movedResult = {bool:false};
await skills.fan_tongxuan.content({}, {}, doctor); assert.deepEqual(returned,top);
const patient = person(['a','b','extra']);
assert(skills.fan_shiqi.filter({player:patient},doctor));
await skills.fan_shiqi.content({}, {player:patient},doctor);
assert.equal(patient.hp,3); assert.deepEqual(patient.owned,['fan_shiqi_return']);
patient.hp = 0; assert(!skills.fan_shiqi.filter({player:patient},doctor));
assert(!skills.fan_shiqi_return.filter({player:doctor},patient));
Array.prototype.randomGet ||= function() { return this[0]; };
// 仅从目标实际持有技能派发其自己的准备阶段。
async function dispatchPrepare(owner, target) {
  for (const id of target.owned.slice()) {
    const skill = skills[id];
    if (skill?.trigger?.player === 'phaseZhunbeiBegin' && owner === target && skill.filter({player:owner},target)) {
      await skill.content({}, {player:owner},target);
    }
  }
}
await dispatchPrepare(doctor,patient); assert.equal(judgeCount,0);
judgeNumber = 6;
await dispatchPrepare(patient,patient); assert.equal(judgeCount,1); assert.deepEqual(patient.owned,['fan_shiqi_return']);
judgeNumber = 7;
await dispatchPrepare(patient,patient); assert(patient.owned.includes('a')); assert(!patient.owned.includes('b'));
await dispatchPrepare(patient,patient); assert(patient.owned.includes('b')); assert(!patient.owned.includes('extra'));
const completedCount = judgeCount;
await dispatchPrepare(patient,patient); assert.equal(judgeCount,completedCount+1); assert.equal(patient.owned.length,3);
const pending = person(['a','extra']);
await skills.fan_shiqi.content({}, {player:pending},otherDoctor);
otherDoctor.owned = []; // 白术失去技能不影响目标后续自行判定。
await dispatchPrepare(pending,pending); assert(pending.owned.includes('a'));
await dispatchPrepare(pending,pending); assert(pending.owned.includes('b'));
console.log('Baizhu: own preparation judgment, non-seven, seven, no duplicate skills and independent restoration passed (simulation).');
const crossSuitGift = card('heart',['fan_wenbu_gift']), crossSuitTop = card('spade');
doctor.hand = [crossSuitGift]; top = [crossSuitTop];
movedResult = {bool:true,moved:[[crossSuitGift],[crossSuitTop]]};
await skills.fan_tongxuan.content({}, {},doctor);
assert.deepEqual(returned,[crossSuitGift]);
assert(doctor.hand.includes(crossSuitTop)); assert(!doctor.hand.includes(crossSuitGift));
assert(crossSuitTop.hasGaintag('fan_tongxuan_free'));
crossSuitGift.value = 1; crossSuitTop.value = 9;
assert.deepEqual(moveOptions.processAI([['top',[crossSuitTop]],['gifts',[crossSuitGift]]]), [[crossSuitGift],[crossSuitTop]]);
// 取消花色限制后仍拒绝不属于问卜的手牌。
const ordinary = card('club'), untouched = card('diamond');
doctor.hand = [ordinary]; top = [untouched];
movedResult = {bool:true,moved:[[ordinary],[untouched]]};
await skills.fan_tongxuan.content({}, {},doctor);
assert.deepEqual(returned,[untouched]); assert(doctor.hand.includes(ordinary));
console.log('Baizhu: cross-suit exchange, AI, hand limit tag and non-gift rejection passed (simulation).');

// 复现连续交换漏洞：A换到下栏后，不允许再换到B的槽位。
const a = card('spade'), b = card('club'), h = card('heart',['fan_wenbu_gift']);
top = [a,b]; doctor.hand = [h]; movedResult = {bool:false};
await skills.fan_tongxuan.content({}, {},doctor);
assert(moveOptions.filterMove({link:a},{link:h},[[a,b],[h]]));
assert(!moveOptions.filterMove({link:a},{link:b},[[h,b],[a]]));
assert(!moveOptions.filterMove({link:b},{link:a},[[h,b],[a]]));
assert(moveOptions.filterMove({link:a},{link:h},[[h,b],[a]]));
assert(moveOptions.filterMove({link:h},{link:a},[[h,b],[a]]));
assert(!moveOptions.filterOk([[h,a],[b]]));
assert(moveOptions.filterOk([[h,b],[a]]));
assert(!moveOptions.filterOk([[h,h],[a]]));
// 最终结算也拒绝绕过界面的移位输入，并保持原牌序和手牌。
movedResult = {bool:true,moved:[[h,a],[b]]};
await skills.fan_tongxuan.content({}, {},doctor);
assert.deepEqual(returned,[a,b]); assert.deepEqual(doctor.hand,[h]);
// AI不能把此前换出的原顶牌填入后续槽位。
a.value=4; b.value=9; h.value=1;
const ai = moveOptions.processAI([['top',[a,b]],['gifts',[h]]]);
assert.deepEqual(ai,[[h,b],[a]]);
console.log('Baizhu: chained slot migration blocked in both directions; undo, final validation and AI passed.');

otherDoctor.owned = ["fan_wenbu"];
const choice = {player:visitor, getParent:()=>selectedPhase, set(k,v) {this[k]=v;return this;} };
selectedPhase = {fan_wenbu_visits:[otherDoctor]};
skills.fan_wenbu_give.onChooseToUse(choice);
Object.assign(status.event,choice);
assert.equal(choice.fan_wenbu_target,doctor);
assert.equal(skills.fan_wenbu_give.selectTarget(),-1);
assert(choice.manualConfirm && choice.fanPairedConfirm);
assert(skills.fan_wenbu_give.filterTarget(null,visitor,doctor));
// 已绑定目标离场，不可转移给另一名白术。
doctor.isIn=()=>false;
assert(!skills.fan_wenbu_give.filterTarget(null,visitor,doctor));
selectedPhase.fan_wenbu_visits=[];
assert(!skills.fan_wenbu_give.filterTarget(null,visitor,otherDoctor));
doctor.isIn=()=>true;
// 确有多个对象时保留手选，不能将一张牌同时交给两人。
skills.fan_wenbu_give.onChooseToUse(choice); Object.assign(status.event,choice);
assert.equal(choice.fan_wenbu_target,null);
assert.equal(skills.fan_wenbu_give.selectTarget(),1);
console.log('Baizhu: unique recipient auto-selection, manual confirmation, invalid target and multiple recipients passed.');
