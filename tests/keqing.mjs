import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read = path => readFileSync(new URL(path, import.meta.url), "utf8");
const status = { event: {} }, ui = { discardPile: { childNodes: [] } };
const lib = { skill: {}, card: { sha: { usable: 1 } } };
const get = {
  type(card, method, player) { assert.equal(method, null); return card.type; },
  color: card => card.color, position: card => card.pos, value: card => card.value || 1,
  autoViewAs: card => card, info: card => typeof card === "string" ? lib.skill[card] : lib.card[card.name],
};
const game = {
  checkMod(card, player, num, name) { assert.equal(name, "cardUsable"); return skills.fan_leili.mod.cardUsable(card, player) ?? num; },
  hasPlayer2: () => false,
};
const skills = new Function("game", "get", "ui", read("../character/skills/keqing.js")
  .replace(/^import .*;\r?\n/gm, "").replace("export default", "return"))(game, get, ui);
Object.assign(lib.skill, skills);
for (const [id, info] of Object.entries(skills)) for (const [key, sub] of Object.entries(info.subSkill || {})) lib.skill[id + "_" + key] = sub;
// Native 1.11.6 cardUsable body, including exhausted normal quota.
const source = read("../../../noname/library/index.js");
const start = source.indexOf("    cardUsable(card, player, event) {");
const end = source.indexOf("\n    /**", start);
const usable = new Function("game", "get", "_status", "return ({" + source.slice(start, end).trim().replace(/,$/, "") + "}).cardUsable")(game, get, status);
const chain = result => ({ set() { return this; }, forResult: async () => result });
const equip = { type: "equip", pos: "h", value: 3 }, ordinary = { type: "basic", pos: "h" };
const player = {
  cards: [equip, ordinary], used: new Set(), stat: { sha: 1 }, alive: true, logs: [],
  hasSkill(id) { return this.used.has(id); },
  getCards() { return this.cards; }, countCards(zone, filter) { return this.cards.filter(filter).length; },
  countUsed() { return this.stat.sha; }, getStat() { return this.stat; }, isIn() { return this.alive; },
  addTempSkill(id, expiry) { assert.deepEqual(expiry, { global: "phaseBefore" }); this.used.add(id); },
  chooseBool() { return chain({ bool: this.confirm }); },
  chooseButton() { return chain({ bool: true, links: [this.pick] }); },
  logSkill(id) { this.logs.push(id); }, async gain(card) { this.gained = card; card.pos = "h"; },
};
status.event = { player };
const converted = { ...skills.fan_leili.viewAs, cards: [equip] };
const uncertain = { ...skills.fan_leili.viewAs, suit: "unsure", cards: [] };
assert.equal(usable({ name: "sha" }, player), false);
assert.equal(usable(uncertain, player), true, "native button precheck permits exhausted normal quota");
assert.equal(usable(converted, player), true);
assert.equal(usable({ ...converted, cards: [ordinary] }, player), false);
assert.equal(usable({ ...converted, cards: [equip, ordinary] }, player), false);
assert.equal(usable({ name: "sha", cards: [equip] }, player), false, "unrelated conversion does not inherit exemption");
assert.equal(skills.fan_leili.filterCard(equip, player), true);
assert.equal(skills.fan_leili.filterCard(ordinary, player), false);
assert.equal(skills.fan_leili.viewAsFilter(player), true);
// No onuse/onrespond on cancel: resource and normal quota remain unchanged.
assert.equal(player.used.size, 0);
skills.fan_leili.onuse({}, player);
assert.equal(skills.fan_leili.viewAsFilter(player), false);
assert.equal(skills.fan_leili.filterCard(equip, player), false);
// Dispatch only recorder skills attached through the actual owned main group.
const trigger = { skill: "fan_leili", card: converted, cards: [equip], addCount: true };
player.stat.sha++;
const refund = lib.skill[skills.fan_leili.group];
assert.equal(refund.filter(trigger, player), true);
await refund.content({}, trigger, player);
assert.equal(trigger.addCount, false); assert.equal(player.stat.sha, 1);
assert.equal(usable({ name: "sha" }, player), false);
assert.equal(refund.filter({ ...trigger, addCount: true, skill: undefined }, player), false);
player.used.clear(); player.stat.sha = 0;
assert.equal(usable(converted, player), true);
skills.fan_leili.onrespond({}, player);
assert.equal(skills.fan_leili.viewAsFilter(player), false, "responding consumes same turn allowance");
player.used.clear(); assert.equal(skills.fan_leili.viewAsFilter(player), true, "next turn refreshes");
assert.equal(usable({ name: "sha" }, player), true, "free conversion preserves ordinary quota");
player.cards = [ordinary]; assert.equal(skills.fan_leili.viewAsFilter(player), false);
player.cards = [equip]; player.alive = true;
// Yuheng preserves legal targeting and all other targets, excludes only its owner.
assert.equal(skills.fan_yuheng.mod, undefined);
for (const name of ["shunshou", "guohe"]) {
  const other = {}, use = { targets: [player, other], excluded: new Set() };
  const event = { card: { name }, getParent: () => use };
  assert.equal(skills.fan_yuheng.filter(event), true);
  await skills.fan_yuheng.content({}, event, player);
  assert.equal(use.excluded.has(player), true); assert.equal(use.excluded.has(other), false);
  assert.deepEqual(use.targets, [player, other]);
  for (const team of ["friend", "enemy"]) assert.equal(skills.fan_yuheng.ai.effect.target({ name }, { team }), "zerotarget");
}
assert.equal(skills.fan_yuheng.filter({ card: { name: "sha" } }), false);
assert.equal(skills.fan_yuheng.ai.effect.target({ name: "tao" }), undefined);
// Sample is taken from actual discard pile, without moving unselected cards.
Array.prototype.randomGets = function (n) { return this.slice(0, n); };
const black = [1, 2, 3, 4].map(value => ({ color: "black", pos: "d", value }));
const red = { color: "red", pos: "d" };
ui.discardPile.childNodes = [...black, red];
player.confirm = false; await skills.fan_kejuan.content({}, {}, player); assert.equal(player.gained, undefined);
player.confirm = true; player.pick = black[1];
await skills.fan_kejuan.content({}, {}, player); assert.equal(player.gained, black[1]);
assert.equal(black[0].pos, "d"); assert.equal(black[2].pos, "d");
assert.deepEqual(ui.discardPile.childNodes, [...black, red]);
player.gained = undefined; player.pick = black[3];
await skills.fan_kejuan.content({}, {}, player); assert.equal(player.gained, undefined, "cannot gain outside sampled snapshot");
ui.discardPile.childNodes = [black[0]]; player.pick = black[0];
await skills.fan_kejuan.content({}, {}, player); assert.equal(player.gained, black[0], "fewer than three still works");
ui.discardPile.childNodes = [red]; assert.equal(skills.fan_kejuan.filter(), false);
console.log("PASS: Keqing native quota eligibility, shared use/respond allowance, mounted refund, cancellation, material isolation, Yuheng targeting/AI, discard sampling and stale selection (simulation; no live game).");
