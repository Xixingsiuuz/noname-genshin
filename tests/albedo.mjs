import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const ui = { discardPile: { childNodes: [] }, selected: { buttons: [] } }, status = {};
const voices = [], gains = [];
const game = { trySkillAudio: id => voices.push(id) };
const lib = { filter: { cardDiscardable: card => !card.fixed } };
const get = { position: card => card.pos, suit: card => card.suit, value: card => card.value,
  translation: () => "目标", damageEffect: target => target.effect };
const skills = new Function("game", "get", "lib", "ui", "_status", read("character/skills/albedo.js")
  .replace(/^import .*;\r?\n/, "").replace("export default", "return"))(game, get, lib, ui, status);
const card = (suit, value = 3, pos = "d") => ({ suit, value, pos });
let accept = true, beforeAnswer = () => {};
// Reuse the local engine randomGet body, with controlled random draws.
const polyfill = read("../../noname/init/polyfill.js");
const begin = polyfill.indexOf('Object.defineProperty(Array.prototype, "randomGet",');
const end = polyfill.indexOf('Object.defineProperty(Array.prototype, "randomGets",', begin);
let randomValue = 0;
const controlledMath = Object.create(Math);
controlledMath.random = () => randomValue;
new Function("Math", polyfill.slice(begin, end))(controlledMath);
function choice(result) { return { set() { return this; }, async forResult() { beforeAnswer(); return result; } }; }
const owner = {
  hand: [], marks: new Set(), isIn: () => true, getCards: () => owner.hand,
  countDiscardableCards: () => owner.hand.filter(card => !card.fixed).length,
  hasSkill: id => owner.marks.has(id),
  addTempSkill(id, expiry) { assert.deepEqual(expiry, { global: "phaseBefore" }); owner.marks.add(id); },
  logSkill() {}, chooseBool() { return choice({ bool: accept }); },
  chooseButton() { throw new Error("显生不得打开选牌窗口"); },
  async gain(cards) { gains.push(cards); for (const item of cards) { item.pos = "h"; owner.hand.push(item); } },
};
status.event = { player: owner };
const xian = skills.fan_xiansheng, bai = skills.fan_baie;
assert.equal(xian.usable, 1); assert.equal(xian.enable, "phaseUse");
assert.equal(xian.locked, false); assert.equal(bai.locked, false);
const cost = card("heart", 1, "h"); owner.hand = [cost];
ui.discardPile.childNodes = [card("spade", 8), card("club", 5), card("none", 100)];
assert(xian.check(cost) > 0, "AI values newly missing suit and recoverable cost");
cost.fixed = true; assert(!xian.filterCard(cost, owner)); cost.fixed = false;
// Actual cost movement precedes content, matching native useSkill.
owner.hand = []; cost.pos = "d"; ui.discardPile.childNodes.push(cost);
await xian.content({}, {}, owner);
assert.equal(gains.at(-1).length, 3); assert(gains.at(-1).includes(cost));
owner.hand = [card("spade", 1, "h"), card("heart", 1, "h"), card("club", 1, "h"), card("diamond", 1, "h")];
const previous = gains.length; await xian.content({}, {}, owner); assert.equal(gains.length, previous);
// Both ends of each same-suit pool can be drawn; results are not chosen by value.
const low = card("heart", 1), high = card("heart", 9), diamond = card("diamond", 4);
owner.hand = []; ui.discardPile.childNodes = [low, high, diamond];
randomValue = 0;
await xian.content({}, {}, owner);
assert.deepEqual(gains.at(-1), [low, diamond]);
low.pos = high.pos = diamond.pos = "d"; owner.hand = []; randomValue = 0.999;
await xian.content({}, {}, owner);
assert.deepEqual(gains.at(-1), [high, diamond]);
// AI uses the mean of the random pool (1 + 9) / 2, rather than its best card.
low.pos = high.pos = "d"; owner.hand = [card("heart", 2, "h")];
ui.discardPile.childNodes = [low, high];
assert.equal(xian.check(owner.hand[0]), (1 + 9 + 2) / 3 - 2);
// A held suit and non-discard cards are excluded; an empty pile gives no cards.
owner.hand = [card("heart", 1, "h")];
ui.discardPile.childNodes = [low, high, card("club", 8, "s")];
const unchanged = gains.length;
await xian.content({}, {}, owner); assert.equal(gains.length, unchanged);
owner.hand = []; ui.discardPile.childNodes = [];
await xian.content({}, {}, owner); assert.equal(gains.length, unchanged);
randomValue = 0;
const target = { hp: 2, maxHp: 5, effect: -1, inGame: true, isIn() { return this.inGame; },
  async damage(n, source, flag) {
    assert.equal(n, 1); assert.equal(source, owner); assert.equal(flag, "nocard");
    assert(owner.hasSkill("fan_baie_used"));
    assert(!bai.filter({ num: 1, player: target }, owner), "nested damage cannot reenter");
    this.hits = (this.hits || 0) + 1;
  } };
const damage = { num: 1, player: target };
assert.equal(bai.trigger.global, "damageAfter");
assert(bai.filter(damage, owner)); target.hp = 3; assert(!bai.filter(damage, owner)); target.hp = 2;
assert(!bai.filter({ num: 0, player: target }, owner)); assert(!bai.filter({ num: 1, player: owner }, owner));
target.inGame = false; assert(!bai.filter(damage, owner)); target.inGame = true;
accept = false; const audioCount = voices.length; await bai.content({}, damage, owner);
assert(!owner.marks.size); assert.equal(voices.length, audioCount);
accept = true; beforeAnswer = () => { target.hp = 4; };
await bai.content({}, damage, owner); assert(!owner.marks.size); assert(!target.hits);
target.hp = 2; beforeAnswer = () => {};
await bai.content({}, damage, owner); assert.equal(target.hits, 1);
await bai.content({}, damage, owner); assert.equal(target.hits, 1);
// Native temp expiry at the next turn start restores eligibility.
owner.marks.clear(); assert(bai.filter(damage, owner));
target.effect = 2; let evaluated;
owner.chooseBool = () => ({ set(key, value) { if (key === "ai") evaluated = value(); return this; }, async forResult() { return { bool: false }; } });
await bai.content({}, damage, owner); assert.equal(evaluated, true);
target.effect = -2; await bai.content({}, damage, owner); assert.equal(evaluated, false);
for (const id of ["fan_xiansheng", "fan_baie"]) {
  assert.equal(skills[id].audio.length, 2);
  for (const audio of skills[id].audio) assert(existsSync(new URL("../" + audio.slice(7), import.meta.url)));
}
const content = read("../../noname/library/element/content.js");
const nativeDamage = content.slice(content.indexOf("  damage: ["), content.indexOf("  async recover("));
assert(nativeDamage.indexOf("player.dying(event)") < nativeDamage.indexOf('event.trigger("damageSource")'));
const nativeUse = content.slice(content.indexOf("  useSkill: ["));
assert(nativeUse.includes("player.discard(cards)")); assert(nativeUse.includes("Promise.all(waitings)"));
console.log("PASS: Albedo cost/discard/random suit acquisition without a dialog, unavailable cards, expected AI value, half HP, cancellation, revalidation, nested damage, per-turn limit and audio paths (simulation; no live game).");
