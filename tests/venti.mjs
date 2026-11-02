import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

let players = [], top = [], selected = [], swap;
const lib = { filter: { cardDiscardable: card => !card.protected } };
const game = {
  trySkillAudio() {},
  hasPlayer: filter => players.some(filter),
  async cardsGotoOrdering(cards) { cards.forEach(card => card.pos = "o"); },
  swapSeat(a, b) { swap = [a, b]; },
};
const get = { cards: n => top.slice(0, n), position: card => card.pos, value: () => 1, attitude: () => 1,
  type2: card => card.type, cardPile2: filter => top.find(filter) };
const source = readFileSync(new URL("../character/skills/venti.js", import.meta.url), "utf8");
const { skills, count } = new Function("lib", "game", "get", source
  .replace(/^import .*;\r?\n/, "").replace("export function", "function")
  .replace("export default", "const skills =") + "\nreturn {skills, count:getYinyouCount};")(lib, game, get);
const choice = result => ({ set() { return this; }, async forResult() { return result; } });
function person(id, innate = []) {
  return {
    playerid: id, storage: {}, hp: 0, group: "wu", hand: [], alive: true,
    history: { sourceDamage: [], lose: [], useCard: [] }, owned: new Set(innate), additional: {},
    getHistory(key) { return this.history[key]; }, countCards(area, filter) { return filter ? this.hand.filter(filter).length : this.hand.length; },
    isIn() { return this.alive; }, hasZhuSkill: () => true,
    hasSkill(skill) { return this.owned.has(skill); }, logSkill() {}, awakenSkill() {},
    addSkill(skill) { this.owned.add(skill); },
    removeSkill(skill) { this.owned.delete(skill); skills[skill]?.onremove?.(this); },
    addAdditionalSkill(key, skill) { this.additional[key] = skill; },
    removeAdditionalSkill(key) { delete this.additional[key]; },
    chooseToDiscard() { return choice({ bool: true }); },
    chooseButton() { return choice({ bool: true, links: selected }); },
    chooseTarget() { return choice(this.selection || { bool: false }); },
    async gain(cards) { cards = Array.isArray(cards) ? cards : [cards]; this.hand.push(...cards); cards.forEach(card => card.pos = "h"); },
    async viewCards() {}, async recover(n) { this.hp += n; },
    async chooseCooperationFor(target, reason) { this.cooperation = { target, reason }; },
    checkCooperationStatus(target, reason) { return this.cooperation?.target === target && this.cooperation.reason === reason && this.success; },
  };
}
const venti = person("venti", ["fan_qingzhan"]), ally = person("ally", ["reluoying"]);
players = [venti, ally];
assert.equal(count(ally), 2, "no discard and tied minimum");
ally.history.sourceDamage.push({ num: 2 });
assert.equal(count(ally), 3);
ally.history.lose.push({ type: "discard", cards2: [{}] });
assert.equal(count(ally), 2);
ally.hand = [{}];
assert.equal(count(ally), 1);
ally.hand = []; ally.history.lose = [];
top = [{ pos: "c" }, { pos: "c" }, { pos: "c" }]; selected = [top[0]];
await skills.fan_yinyou.content({}, { player: ally }, venti);
assert.deepEqual(ally.hand, [top[0]]);
assert.deepEqual(venti.hand, top.slice(1));
// 支付代价会改变自己本回合的“未弃牌”及最少手牌条件，应在代价后读取。
venti.history.lose = [{ type: "discard", cards2: [{}] }];
venti.hand = []; top = [{ pos: "c" }];
await skills.fan_yinyou.content({}, { player: venti }, venti);
assert.deepEqual(venti.hand, top);

venti.selection = { bool: true, targets: [ally] };
await skills.fan_qingzhan.content({}, {}, venti);
assert(venti.owned.has("fan_qingzhan_result"), "actual activation attaches reward trigger");
assert.equal(skills.fan_qingzhan_result.trigger.global, "phaseAfter");
assert(!skills.fan_qingzhan_result.filter({ player: ally }, venti));
venti.success = true;
assert(skills.fan_qingzhan_result.filter({ player: ally }, venti));
await skills.fan_qingzhan_result.content({}, { player: ally }, venti);
assert.deepEqual(Object.values(ally.additional), ["reluoying"]);
assert.deepEqual(Object.values(venti.additional), ["fan_jiushi"]);
assert(!skills.fan_qingzhan_expire.filter({ name: "phaseJieshu", player: venti }, venti), "own end phase must retain rewards");
const outsider = person("outsider");
assert(!skills.fan_qingzhan_expire.filter({ name: "phaseJieshu", player: outsider }, venti));
assert(skills.fan_qingzhan_expire.filter({ name: "phaseJieshu", player: ally }, venti));
await skills.fan_qingzhan_expire.content({}, { name: "phaseJieshu", player: ally }, venti);
assert.deepEqual(ally.additional, {});
assert(ally.owned.has("reluoying"), "expiry retains innate Luoying");
// 不同对象的奖励分别到期；额外回合仍按对象实际进入结束阶段处理。
venti.cooperation.target = outsider;
await skills.fan_qingzhan_result.content({}, { player: ally }, venti);
await skills.fan_qingzhan_result.content({}, { player: outsider }, venti);
await skills.fan_qingzhan_expire.content({}, { name: "phaseJieshu", player: ally }, venti);
assert.equal(Object.keys(venti.additional).length, 1);
assert.equal(Object.keys(outsider.additional).length, 1);
await skills.fan_qingzhan_expire.content({}, { name: "die", player: venti }, venti);
assert.deepEqual(outsider.additional, {});
venti.owned.delete("fan_qingzhan");
await skills.fan_qingzhan_result.content({}, { player: ally }, venti);
assert.deepEqual(ally.additional, {}, "disabled/lost Qinggai grants no reward");

// 从真正获得的主技能展开分组，验证改写后的酒诗不依赖成章状态。
venti.owned.add("fan_qingzhan");
await skills.fan_qingzhan_result.content({}, { player: ally }, venti);
const reward = Object.values(venti.additional)[0];
const expanded = skills[reward].group.map(id => skills[id]);
assert.equal(expanded[0].inherit, "rejiushi1");
venti.isTurnedOver = () => true;
venti.turnOver = async () => {
  const gain = expanded.find(skill => skill.trigger?.player === "turnOverAfter");
  await gain.content({}, {}, venti);
};
top = [{ type: "basic", pos: "c" }, { type: "trick", pos: "c" }];
const hurt = expanded.find(skill => skill.trigger?.player === "damageEnd");
const damage = {};
assert(hurt.filter(damage, venti));
const oldHand = venti.hand.length;
await hurt.content({}, damage, venti);
assert.equal(venti.hand.length, oldHand + 1, "one trick per turnover, no duplicate damage reward");
assert.equal(venti.storage.chengzhang, undefined);
venti.history.useCard = [{ card: { name: "jiu" }, getParent(name) { return name ? damage : { name: "fan_jiushi_use" }; } }];
assert(!hurt.filter(damage, venti), "cannot turn back after self-saving wine during the same damage");
top = [];
await expanded.find(skill => skill.trigger?.player === "turnOverAfter").content({}, {}, venti);
assert.equal(venti.hand.length, oldHand + 1, "empty trick pool gains nothing");

ally.hp = -2;
venti.selection = { bool: true, targets: [venti] };
assert(skills.fan_songshi.filter({ player: ally }, venti));
await skills.fan_songshi.content({}, { player: ally }, venti);
assert.equal(ally.hp, 1);
assert.deepEqual(swap, [ally, venti]);
assert(!skills.fan_songshi.filter({ player: ally }, venti));
await skills.fan_songshi.content({}, { player: ally }, venti);
assert.equal(ally.hp, 1);
const second = person("second"); second.selection = { bool: false };
await skills.fan_songshi.content({}, { player: second }, second);
assert.equal(second.hp, 1, "lord can rescue himself; cancelling seat swap retains recovery");
assert(second.storage.fan_songshi_used);
console.log("Venti: Yinyou conditions/allocation, attached cooperation reward/expiry, original skill preservation, Songshi recovery/limit/cancel passed.");
