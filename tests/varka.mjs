import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const ui = { selected: { cards: [], targets: [] } };
const get = {
  autoViewAs: (card, cards) => ({ ...card, cards, initID() {} }),
  subtype: card => card.subtype || lib.card[card.name]?.subtype || (card.name?.startsWith("fan_xijuan_weapon_") ? "equip1" : undefined),
  type: card => card.type || lib.card[card.name]?.type,
  name: card => card.name, translation: value => ({ wuzhong: "无中生有", wuxie: "无懈可击", juedou: "决斗", jiedao: "借刀杀人" }[value] || value.name || value),
  position: card => card.zone, value: () => 3, effect: () => 1, attitude: () => 0,
};
const lib = { card: { jiedao: { filterAddedTarget: (card, source, target, borrower) => target !== borrower && target.isIn() } },
  translate: {}, element: { content: { equipCard() {} } } };
const game = { phaseNumber: 0, finishCard() {}, checkMod: card => card.disabled ? false : "unchanged" };
const status = {};
const source = readFileSync(new URL("../character/skills/varka.js", import.meta.url), "utf8");
const skills = new Function("lib", "game", "get", "ui", "_status",
  source.replace(/^import .*;\r?\n/, "").replace("export default", "return"))(lib, game, get, ui, status);
const promptResult = result => ({ set() { return this; }, forResult: async () => result });
const target = { isIn: () => true }, other = { isIn: () => true };
const material = { name: "wuzhong", type: "trick", zone: "h" };
let equipped = [], hand = [material], uses = [], gained = [], slots = 0;
const player = {
  storage: {}, isIn: () => true, hasZhuSkill: () => true, logSkill() {},
  getEquipRange: cards => Math.max(1, ...cards.map(card => card.range || 1)),
  getVCards: (zone, filter) => equipped.filter(filter), getCards: zone => zone === "h" ? hand : equipped.map(card => card.wrapper || card),
  hasCard: (filter, zone) => player.getCards(zone).some(filter),
  canEquip: () => true, canUse: (card, who) => who.isIn() && !who.protected,
  async equip(card) { assert.equal(typeof card.initID, "function"); equipped.push(card); hand = hand.filter(c => !card.cards.includes(c)); },
  async expandEquip(n) { slots += n; },
  chooseBool: () => promptResult({ bool: true }),
  chooseTarget: () => promptResult({ bool: true, targets: [other] }),
  async useCard(card, targets) { uses.push([card.name, targets]); },
  async gain(cards) { gained = cards; },
};
const slot = skills.fan_shuofeng.subSkill.slot;
assert.equal(slot.silent, true); // arrangeTrigger 对静默技能直接结算，不询问顺序。
assert.equal(slot.firstDo, true);
assert(slot.filter({ name: "phase" }, player));
await slot.content({}, null, player);
assert.equal(slots, 1);
assert(!slot.filter({ name: "enterGame" }, player));

assert(skills.fan_xijuan.filterCard(material, player));
await skills.fan_xijuan.content({ cards: [material] }, null, player);
const weapon = equipped[0];
assert.equal(material.name, "wuzhong"); // 实体不改名，武器离场后仍为锦囊。
assert.equal(weapon.cards[0], material);
assert.equal(lib.card[weapon.name].distance.attackFrom, -3);
assert.equal(lib.card[weapon.name].subtype, "equip1");
assert(!skills.fan_xijuan.filterCard({ name: "lebu", type: "delay" }, player));
assert(!skills.fan_xijuan.filterCard({ ...material, disabled: true }, player));

const second = { name: "blade", subtype: "equip1", cards: [{ name: "blade" }] };
equipped.push(second);
const sha = { name: "sha", storage: { fan_shuofeng: true } };
const count = () => { const range = [1, 1]; skills.fan_shuofeng.mod.selectTarget(sha, player, range); return range[1]; };
assert.equal(count(), 3);
ui.selected.cards = [material];
assert.equal(count(), 2); // 两把消耗一把，最多两目标。
ui.selected.cards = [];
const wrapper = { name: weapon.name, cardSymbol: Symbol("weapon") };
wrapper.isViewAsCard = true;
wrapper[wrapper.cardSymbol] = weapon;
weapon.wrapper = wrapper;
ui.selected.cards = [wrapper];
assert.equal(count(), 2); // 原生虚拟装备的界面代理牌也须扣除。
weapon.range = 4;
second.range = 2;
status.event = { skill: "fan_shuofeng" };
assert.equal(skills.fan_shuofeng.mod.attackRangeBase(player), 2);
ui.selected.cards = [];
assert(!skills.fan_shuofeng.filterOk());
ui.selected.cards = [wrapper];
assert(skills.fan_shuofeng.filterOk());
ui.selected.cards = [];

await skills.fan_xijuan_effect.content({}, { card: sha, target }, player);
assert.deepEqual(uses, [["wuzhong", player]]);
equipped = [{ name: "fan_xijuan_weapon_wuxie" }];
assert(!skills.fan_xijuan_effect.filter({ card: sha, target }, player));
equipped = [{ name: "fan_xijuan_weapon_jiedao" }];
await skills.fan_xijuan_effect.content({}, { card: sha, target }, player);
assert.deepEqual(uses.at(-1), ["jiedao", [target, other]]);
equipped = [{ name: "fan_xijuan_weapon_juedou" }, { name: "fan_xijuan_weapon_juedou" }];
uses = [];
await skills.fan_xijuan_effect.content({}, { card: sha, target }, player);
assert.equal(uses.length, 2); // 两把同名锦囊武器各自发动。
target.protected = true;
assert(!skills.fan_xijuan_effect.filter({ card: sha, target }, player));
delete target.protected;

const cards = [{ name: "sha", zone: "d" }, { name: "shan", zone: "d" }, { name: "tao", zone: "h" }];
const used = { name: "useCard", player: { group: "wu" }, card: { name: "nanman", type: "trick" }, cards };
const discarded = (use = used, moved = cards) => ({ name: "cardsDiscard", cards: moved,
  getParent: () => ({ name: "orderingDiscard", relatedEvent: use }) });
assert.equal(skills.fan_kaige.trigger.global, "cardsDiscardAfter");
assert(skills.fan_kaige.filter(discarded(), player));
await skills.fan_kaige.content({}, discarded(), player);
assert.deepEqual(gained, cards.slice(0, 2));
assert(!skills.fan_kaige.filter(discarded({ ...used, card: { type: "delay" } }), player));
assert(!skills.fan_kaige.filter(discarded({ ...used, card: { type: "basic" } }), player));
assert(!skills.fan_kaige.filter(discarded({ ...used, cards: [] }), player));
assert(!skills.fan_kaige.filter(discarded({ ...used, player }), player));
assert(!skills.fan_kaige.filter(discarded({ ...used, player: { group: "wei" } }), player));
assert(!skills.fan_kaige.filter(discarded({ ...used, name: "respond" }), player));
assert(!skills.fan_kaige.filter({ cards, getParent: () => ({ name: "lose" }) }, player));
const unrelated = { name: "tao", zone: "d" };
await skills.fan_kaige.content({}, discarded(used, [...cards, unrelated]), player);
assert.deepEqual(gained, cards.slice(0, 2));
cards[0].zone = "o";
cards[1].zone = "o";
assert(!skills.fan_kaige.filter(discarded(), player));
cards[0].zone = "d";
cards[1].zone = "d";
assert(skills.fan_kaige.filter(discarded(), player));
assert.equal(skills.fan_kaige.round, 1);
console.log("Varka: slot, conversion, remaining weapons, trick effects and physical-card recovery passed");
