import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const source = readFileSync(new URL("../character/skills/navia.js", import.meta.url), "utf8");
const get = {
  position: card => card.position,
  suit: card => card.suit,
  info: card => ({ notarget: card.name === "wuzhong" }),
  translation: card => card.name,
  tag: (card, tag) => tag === "damage" && card.name === "sha",
};
const lib = { filter: { selectTarget: card => card.name === "wuzhong" ? [-1, -1] : [1, 1] } };
const spoken = [];
const game = { trySkillAudio(id, player, direct) { assert.equal(direct, true); spoken.push(id); } };
const skills = new Function("lib", "get", "game", source.replace(/^import .*;\r?\n/, "").replace("export default", "return"))(lib, get, game);
const card = { name: "sha", position: "d", suit: "heart" };
const otherCard = { name: "shan", position: "d" };
let won = false, cancelled = 0, armor = 0, lord = true;
let comparisonCancelled = false;
const sourcePlayer = { isIn: () => true };
const target = { group: "qun", isIn: () => true, async changeHujia(n) { armor += n; } };
const player = {
  isIn: () => true,
  storage: {}, canCompare: target => target === sourcePlayer,
  chooseToCompare: () => ({
    pushHandler(type, fn) { assert.equal(type, "onChooseToCompare"); this.handler = fn; },
    async forResult() {
      const current = { result: { bool: won, cancelled: comparisonCancelled, num1: won ? 13 : 1, num2: 10 } };
      this.handler({ result: {} }, { state: "end" });
      this.handler(current, { state: "begin" });
      this.handler(current, { state: "end" });
      this.handler(current, { state: "end" });
      return current.result;
    },
  }),
  hasZhuSkill: () => lord, logSkill() {},
  hasUseTarget: () => true,
  addSkill() {}, removeSkill() {},
};
const damage = { num: 1, source: sourcePlayer, player: target, cancel() { cancelled++; } };
assert.equal(skills.fan_cijue.filter(damage, player), true);
assert.equal(skills.fan_cijue.filter({ ...damage, source: null }, player), false);
assert.equal(skills.fan_cijue.filter({ ...damage, source: player }, player), false);
await skills.fan_cijue.content({}, damage, player);
assert.equal(cancelled, 0);
assert.deepEqual(spoken.splice(0), ["fan_cijue_start"]);
won = true;
await skills.fan_cijue.content({}, damage, player);
assert.equal(cancelled, 1); assert.equal(armor, 1);
assert.deepEqual(spoken.splice(0), ["fan_cijue_start", "fan_cijue_win"]);
lord = false;
await skills.fan_cijue.content({}, damage, player);
assert.equal(cancelled, 2); assert.equal(armor, 1);
spoken.length = 0;
await skills.fan_cijue.content({}, { ...damage, source: null }, player);
assert.deepEqual(spoken, []);
comparisonCancelled = true;
await skills.fan_cijue.content({}, damage, player);
assert.deepEqual(spoken.splice(0), ["fan_cijue_start"]);
assert.equal(cancelled, 2);
comparisonCancelled = false;
const number = skills.fan_cijue.subSkill.number;
for (const first of [true, false]) {
  const evt = { player: first ? player : sourcePlayer, card1: card, card2: card, num1: 1, num2: 2 };
  assert.ok(number.filter(evt, player));
  await number.content({}, evt, player);
  assert.equal(first ? evt.num1 : evt.num2, 13);
}
const crystal = skills.fan_xianjing;
const discard = { name: "lose", type: "discard", getl: () => ({ cards2: [card] }) };
assert.ok(crystal.filter(discard, player));
assert.equal(crystal.filter({ ...discard, getlx: false }, player), false);
assert.ok(crystal.filter({ ...discard, name: "loseAsync" }, player));
assert.equal(crystal.filter({ ...discard, type: "use" }, player), false);
const compare = { name: "chooseToCompare", lose_list: [[sourcePlayer, [otherCard]], [player, [card]]] };
const entered = { name: "cardsDiscard", cards: [card, otherCard], getParent: () => ({ name: "orderingDiscard", relatedEvent: compare }) };
assert.ok(crystal.filter(entered, player));
card.position = "h";
assert.equal(crystal.filter(entered, player), false);
card.position = "d";
assert.equal(crystal.filter({ ...entered, getParent: () => ({ name: "orderingDiscard", relatedEvent: { name: "useCard" } }) }, player), false);
let uses = 0, dialogs = 0, selection = { bool: true, links: [card] };
let afterSelection = () => {};
player.getUseValue = () => 5;
player.chooseCardButton = (prompt, cards) => {
  dialogs++;
  assert.match(prompt, /霰晶/);
  assert.deepEqual(cards, [card]);
  return {
    set(key, value) {
      if (key === "filterButton") {
        assert.ok(value({ link: card }));
        card.position = "h";
        assert.equal(value({ link: card }), false);
        card.position = "d";
      }
      return this;
    },
    async forResult() { afterSelection(); return selection; },
  };
};
player.chooseUseTarget = async options => {
  uses++;
  assert.equal(options.card, card);
  assert.deepEqual(options.cards, [card]);
  assert.equal(options.addCount, true);
  assert.equal(options.forced, card.name === "wuzhong");
  assert.deepEqual(options.logSkill, ["fan_xianjing"]);
  assert.equal(options.prompt2, false);
  assert.deepEqual(spoken, []);
  options.oncard(card, player);
  options.oncard(card, player);
  assert.deepEqual(spoken.splice(0), [card.name === "sha" ? "fan_xianjing_damage" : "fan_xianjing_other"]);
};
// 手选目标保留取消；固定目标不多一次使用确认。
await crystal.content({}, entered, player);
assert.equal(dialogs, 1); assert.equal(uses, 1);
card.name = "wuzhong";
await crystal.content({}, entered, player);
assert.equal(uses, 2);
selection = { bool: false };
await crystal.content({}, entered, player);
assert.equal(uses, 2);
selection = { bool: true, links: [card] };
afterSelection = () => { card.position = "h"; };
await crystal.content({}, entered, player);
assert.equal(uses, 2);
card.position = "d";
afterSelection = () => {};
selection = { bool: true, links: [otherCard] };
await crystal.content({}, entered, player);
assert.equal(uses, 2);
assert.deepEqual(spoken, []);
// 选牌完成但目标界面取消时，原生流程不调用 oncard，不能提前播音。
selection = { bool: true, links: [card] };
player.chooseUseTarget = async options => {
  assert.equal(typeof options.oncard, "function");
  assert.equal(options.forced, false);
  return { bool: false };
};
card.name = "sha";
await crystal.content({}, entered, player);
assert.deepEqual(spoken, []);
console.log("navia: damage, lord armor, comparison, discard ownership, direct card selection and cancellation checks passed");
