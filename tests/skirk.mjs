import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

// 隔离技能逻辑检查，不替代游戏引擎中的完整对局验证。
const source = readFileSync(new URL("../character/skills/skirk.js", import.meta.url), "utf8")
  .replace(/^import .*;\r?\n/, "").replace("export default", "globalThis.skills =");
const status = {};
const context = {
  _status: status,
  lib: {
    filter: { cardEnabled: () => true },
    skill: { fengyin: { skillBlocker: skill => skill === "ordinary" } },
  },
  game: { checkMod: () => "unchanged" },
  get: {},
};
vm.runInNewContext(source, context);
const skills = context.skills;
const ancestor = (parent, predicate) => {
  while (parent) {
    if (typeof predicate === "function" ? predicate(parent) : parent.name === predicate) return parent;
    parent = parent.parent;
  }
};
const evt = (name, parent, cards = []) => ({
  name, parent, cards,
  getParent(predicate) { return ancestor(this.parent, predicate); },
  getg() { return cards; },
});
const player = {
  storage: {}, history: [], hand: [],
  getHistory(type, filter) { return this.history.filter(filter); },
  getCards() { return this.hand; },
  hasUseTarget() { return false; },
};
const phase = evt("phaseDraw");
const first = evt("gain", phase, [{}]);
player.history.push(first);
assert.equal(skills.fan_jianliu.filter(first, player), true);
await skills.fan_jianliu.content({}, first, player);
assert.equal(skills.fan_jianliu.filter(first, player), false, "同一获牌事件不能重复触发");
const second = evt("gain", phase, [{}]);
player.history.push(second);
assert.equal(skills.fan_jianliu.filter(second, player), false, "没有可用牌也消耗首次机会");
const otherPhase = evt("phaseUse");
const nextGain = evt("gain", otherPhase, [{}]);
player.history.push(nextGain);
assert.equal(skills.fan_jianliu.filter(nextGain, player), true, "换阶段后重新获得机会");
const asyncPhase = evt("phaseDiscard");
const asyncGain = evt("loseAsync", asyncPhase, [{}]);
player.history.push(evt("gain", asyncGain, asyncGain.cards));
assert.equal(skills.fan_jianliu.filter(asyncGain, player), true, "支持异步获牌");
assert.equal(skills.fan_jianliu.filter(evt("gain", undefined, [{}]), player), false, "游戏初始发牌不属于阶段");
player.storage.fan_xingmie = true;
status.currentPhase = {};
assert.equal(skills.fan_jianliu.filter(nextGain, player), false, "极灭后回合外不能发动");
status.currentPhase = player;
assert.equal(skills.fan_jianliu.filter(nextGain, player), true);

const usePhase = evt("phaseUse");
const material = { name: "sha", nature: "fire" };
const useGain = evt("gain", usePhase, [material]);
const attacker = {
  ...player, storage: {}, history: [useGain], hand: [material],
  hasUseTarget(card, distance, checkCount) {
    assert.equal(card.name, "sha");
    assert.equal(card.nature, undefined, "属性杀素材转换为普通杀");
    assert.equal(distance, false);
    assert.equal(checkCount, true, "选牌时检查使用次数");
    return true;
  },
  chooseToUse(params) {
    assert.equal(params.addCount, false, "剑流不占用正常出杀额度");
    assert.equal(params.fan_jianliu_cards[0], material);
    assert.equal(params.norestore, true, "取消时不退回额外选择界面");
    status.event = params;
    const backup = skills.fan_jianliu.subSkill.backup;
    assert.equal(backup.position, "h");
    assert.equal(backup.selectCard, 1);
    assert.equal(backup.viewAs.name, "sha");
    assert.equal(backup.viewAs.nature, undefined);
    assert.equal(backup.filterCard(material, this), true);
    assert.equal(backup.filterCard({}, this), false, "仅本次获牌可转化");
    assert.equal(skills.fan_jianliu.mod.targetInRange(backup.viewAs), true);
    assert.equal(skills.fan_jianliu.mod.cardUsable(backup.viewAs), Infinity, "正常次数耗尽仍可使用剑流杀");
    assert.equal(skills.fan_jianliu.mod.cardUsable({ name: "sha" }), undefined, "普通杀仍遵守正常次数");
    calls.push("sword");
    return {
      backup(skill) { assert.equal(skill, "fan_jianliu_backup"); },
      then(resolve) { resolve({ bool: true }); },
    };
  },
};

const calls = [];
await skills.fan_jianliu.content({}, useGain, attacker);
assert.equal(calls.pop(), "sword");
await skills.fan_xingmie.content({}, {}, {
  storage: {},
  awakenSkill() { calls.push("awaken"); },
  syncStorage() {},
  addSkill(skill) { calls.push(skill); },
  async draw(num) { assert.equal(num, 2); calls.push("draw"); },
});
assert.deepEqual(calls, ["awaken", "fan_xingmie_buff", "draw"], "先加伤后摸牌");
const damage = { card: { name: "sha" }, num: 1 };
assert.equal(skills.fan_xingmie_buff.filter(damage), true);
await skills.fan_xingmie_buff.content({}, damage);
assert.equal(damage.num, 2);
assert.equal(skills.fan_xingmie_buff.filter({ card: { name: "juedou" } }), false);

let expansions = [];
const target = {
  isIn: () => true,
  countCards: () => 2,
  getCards: () => [{}, {}],
  addSkill() {},
  addTempSkill(skill, expiry) {
    assert.equal(skill, "fan_guiji_silenced");
    assert.equal(expiry.global, "phaseAfter", "封印于当前回合结束时到期");
    calls.push("silence");
  },
  getExpansions: () => expansions,
  async addToExpansion(params) {
    assert.equal(params.visible, false);
    assert.equal(params.animate, "giveAuto");
    expansions.push(...params.cards);
  },
  async gain(cards) { assert.equal(cards.length, 4); expansions = []; },
  removeSkill() { calls.push("release"); },
};
const use = evt("useCard", undefined);
const designated = Object.assign(evt("useCardToPlayered", use), { target, card: { name: "sha" } });
const missed = Object.assign(evt("sha", use), { target });
const capture = skills.fan_guiji.subSkill.capture;
assert.equal(skills.fan_guiji.filter(designated, player), true);
assert.equal(skills.fan_guiji.filter({ ...designated, card: { name: "juedou" } }, player), false);
assert.equal(skills.fan_guiji.filter({ ...designated, target: { ...target, countCards: () => 0 } }, player), true,
  "空手牌目标也能被封印");
assert.ok(!capture.filter(missed, player), "未发动封印不能扣牌");
await skills.fan_guiji.content({}, designated);
assert.equal(calls.pop(), "silence");
assert.equal(expansions.length, 0, "指定目标时只封印，不立即扣牌");
assert.equal(capture.filter(missed, player), true, "同一张杀被闪抵消后可扣牌");
const otherUse = evt("useCard");
assert.ok(!capture.filter(Object.assign(evt("sha", otherUse), { target }), player), "不影响另一张杀");
assert.ok(!capture.filter({ ...missed, target: { ...target } }, player), "不影响未封印的其他目标");
assert.equal(capture.filter({ ...missed, target: { ...target, countCards: () => 0 } }, player), false);
status.currentPhase = {};
assert.equal(skills.fan_guiji.filter(designated, player), false);
assert.equal(capture.filter(missed, player), false, "星灭后的扣牌也不能在回合外发动");
status.currentPhase = player;
await capture.content({}, missed);
await capture.content({}, missed);
assert.equal(expansions.length, 4, "多次扣置累积");
assert.equal(skills.fan_guiji_sealed.filter({ num: 0 }, target), false);
assert.equal(skills.fan_guiji_sealed.filter({ num: 1 }, target), true);
assert.equal(skills.fan_guiji_sealed.filter({ num: 1 }, { ...target, isIn: () => false }), false);
await skills.fan_guiji_sealed.content({}, {}, target);
assert.equal(expansions.length, 0);
assert.equal(calls.at(-1), "release");
const blockerCalls = [];
const blockedTarget = {
  addSkillBlocker(skill) { blockerCalls.push(["add", skill]); },
  removeSkillBlocker(skill) { blockerCalls.push(["remove", skill]); },
};
skills.fan_guiji_silenced.init(blockedTarget, "fan_guiji_silenced");
assert.equal(skills.fan_guiji_silenced.skillBlocker("ordinary", blockedTarget), true);
assert.equal(skills.fan_guiji_silenced.skillBlocker("locked", blockedTarget), false);
skills.fan_guiji_silenced.onremove(blockedTarget, "fan_guiji_silenced");
assert.deepEqual(blockerCalls, [["add", "fan_guiji_silenced"], ["remove", "fan_guiji_silenced"]]);
console.log("丝柯克：首次获牌、指定目标封印、同牌同目标闪避扣牌、封印到期清理、扣置累积返还及星灭顺序检查通过。");
