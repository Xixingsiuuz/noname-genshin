import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read = path => readFileSync(new URL(path, import.meta.url), "utf8");
const records = [], actors = [], pile = [];
let owner;
const get = {
  player: () => owner, color: card => card.color, name: card => card.name,
  value: card => card.value ?? 3, position: card => card.pos,
  attitude: (a, b) => a.team === b.team ? 5 : -5,
  effect: (victim, card, user, viewer) => victim.team === viewer.team ? -6 : 6,
  info: () => ({}), itemtype: () => undefined,
};
const lib = { skill: {}, filter: {
  cardEnabled: (card, player) => !player.disabled,
  cardUsable: (card, player) => !player.exhausted,
  targetInRange: () => true,
  targetEnabled: (card, user, target) => !target.immune,
} };
const game = {
  addVideo() {}, broadcastAll() {},
  filterPlayer: (filter = () => true) => actors.filter(filter),
  async cardsGotoOrdering(cards) { cards.forEach(card => card.pos = "o"); },
  async cardsGotoPile(cards, insert) { assert.equal(insert, "insert"); for (const card of cards) { card.pos = "c"; pile.unshift(card); } },
};
// Reuse native method bodies rather than weakening API contracts in a stub.
const nativeGame = read("../../../noname/game/index.js");
const start = nativeGame.indexOf("  hasPlayer(");
const end = nativeGame.indexOf("\n  /**", start);
game.hasPlayer = new Function("game", "return ({" + nativeGame.slice(start, end).trim() + "}).hasPlayer")(game);
game.players = actors;
assert.throws(() => { actors.push({ isOut: () => false }); try { game.hasPlayer(); } finally { actors.pop(); } }, /func is not a function/);
const playerSource = read("../../../noname/library/element/player.js");
const canStart = playerSource.indexOf("  canUse(card,");
const canEnd = playerSource.indexOf("\n  /**", canStart);
const canUse = new Function("get", "lib", "_status", "return ({" + playerSource.slice(canStart, canEnd).trim() + "}).canUse")(get, lib, { event: { getParent: () => null } });
const extraSource = read("../../../card/extra.js");
const jiuStart = extraSource.indexOf("      async content(", extraSource.indexOf("    jiu: {"));
const jiuEnd = extraSource.indexOf("\n      ai:", jiuStart);
const nativeWine = new Function("game", "lib", "ui", "_status", "return ({" + extraSource.slice(jiuStart, jiuEnd).trim() + "}).content")(game, lib, {}, {});
const skills = new Function("game", "get", "lib", read("../character/skills/diluc.js")
  .replace(/^import .*;\r?\n/gm, "").replace("export default", "return"))(game, get, lib);
Object.assign(lib.skill, skills);
for (const [id, info] of Object.entries(skills)) for (const [key, sub] of Object.entries(info.subSkill || {})) lib.skill[id + "_" + key] = sub;
const chain = (result, choices) => ({ set(key, value) { if (choices) choices[key] = value; return this; }, async forResult() { return result; } });
function actor(team) {
  return {
    team, hp: 4, alive: true, dying: false, hand: [], equip: [], expansion: [], storage: {}, owned: ["fan_chenxi"], temporary: new Set(),
    isIn() { return this.alive; }, isOut() { return !this.alive; }, isDying() { return this.dying; }, canUse,
    hasSkill(id) { return this.temporary.has(id) || this.owned.includes(id); },
    getExpansions(id) { return id === "fan_chenxi" ? this.expansion : []; },
    getCards(zone, filter = () => true) { return [...(zone.includes("h") ? this.hand : []), ...(zone.includes("e") ? this.equip : [])].filter(filter); },
    countCards(zone, filter) { return this.getCards(zone, filter).length; },
    hasUseTarget(card) { return !this.exhausted && actors.some(target => target !== this && this.canUse(card, target)); },
    mayHaveSha() { return this.virtualShas ?? this.hand.filter(card => card.name === "sha").length; },
    chooseBool() { return chain({ bool: this.confirm ?? true }); },
    chooseButton() { this.options = {}; return chain(this.selection ?? { bool: true, links: this.expansion.slice(0, 1) }, this.options); },
    addTempSkill(id, expiry) { assert.deepEqual(expiry, { global: "phaseBefore" }); this.temporary.add(id); records.push("consume"); },
    logSkill(id) { records.push(id); },
    async viewCards(title, cards) { this.viewed = cards; },
    async gain(cards) { records.push("gain"); cards.forEach(card => { card.pos = "h"; this.hand.push(card); }); },
    async addToExpansion({ cards, source, gaintag }) {
      assert.equal(source, this); assert.deepEqual(gaintag, ["fan_chenxi"]);
      cards.forEach(card => { this.hand = this.hand.filter(c => c !== card); this.equip = this.equip.filter(c => c !== card); card.pos = "x"; this.expansion.push(card); });
    },
    async loseToDiscardpile(cards) {
      records.push("discard"); this.expansion = this.expansion.filter(card => !cards.includes(card)); cards.forEach(card => card.pos = "d");
      await this.onDiscard?.();
    },
    async recover() { this.hp = Math.min(4, this.hp + 1); },
    async useCard(card, target) {
      assert.equal(target, this); assert.equal(card.name, "jiu"); records.push("use");
      await nativeWine({ target, targets: [target], cards: [], card, getParent: () => ({}) }, null, this);
      await this.onUse?.();
    },
    async draw() { records.push("draw"); this.drawn = (this.drawn || 0) + 1; },
  };
}
owner = actor(0); const ally = actor(0), enemy = actor(1); actors.push(owner, ally, enemy);
const red = { color: "red", name: "shan", pos: "h" }, black = { color: "black", pos: "h" };
const main = skills.fan_chenxi, drink = lib.skill.fan_chenxi_drink;
assert.equal(main.locked, false); assert.equal(drink.locked, false);
owner.hand = [red, black]; owner.equip = [{ color: "red", name: "equip", pos: "e" }];
assert.equal(main.filter({}, owner), true); assert.equal(main.filterCard(black, owner), false);
assert.deepEqual(main.selectCard(), [1, 3]);
await main.content({ cards: [red, owner.equip[0]] }, {}, owner); assert.equal(owner.expansion.length, 2);
assert.deepEqual(main.selectCard(), [1, 1]);
const extra = { color: "red" }; owner.hand.push(extra);
await main.content({ cards: [extra, black] }, {}, owner); assert.equal(owner.expansion.length, 2, "reject whole invalid payment");
await main.content({ cards: [extra] }, {}, owner); assert.equal(owner.expansion.length, 3);
assert.equal(main.filter({}, owner), false);
assert.equal(drink.filter({ name: "phaseUse", player: owner }, owner), false);
const phase = { name: "phaseUse", player: ally };
async function dispatch(event) {
  for (const id of owner.owned.flatMap(id => [id, lib.skill[id].group].filter(Boolean))) {
    const info = lib.skill[id];
    if (!info.trigger?.global?.includes(event.name === "phaseUse" ? "phaseUseBegin" : event.name)) continue;
    if (info.filter(event, owner)) await info.content({}, event, owner);
  }
}
owner.selection = { bool: false }; await dispatch(phase); assert.equal(owner.temporary.size, 0);
delete owner.selection;
owner.onDiscard = async () => { assert.equal(drink.filter(phase, owner), false, "nested event blocked before cost resolves"); };
records.length = 0; await dispatch(phase);
assert.deepEqual(records, ["consume", "fan_chenxi", "discard", "use", "draw"]);
assert.equal(ally.storage.jiu, 1); assert.equal(owner.expansion.length, 2);
owner.hp = 0; owner.dying = true;
assert.equal(drink.filter({ name: "dying", player: owner }, owner), false, "phase benefit and rescue share one turn limit");
await dispatch({ name: "dying", player: owner }); assert.equal(owner.hp, 0);
assert.equal(drink.filter({ name: "dying", player: owner }, owner), false, "same turn's phaseAfter rescue also remains blocked");
owner.temporary.clear(); // Native next phaseBefore expiry; storage/phaseUse quota is independent.
await dispatch({ name: "dying", player: owner }); assert.equal(owner.hp, 1, "self rescue"); assert.equal(owner.drawn, 2);
owner.temporary.clear(); ally.hp = -2; ally.dying = true;
await dispatch({ name: "dying", player: ally }); assert.equal(ally.hp, -1, "one wine only recovers one HP");
assert.equal(owner.expansion.length, 0);
owner.dying = false; owner.hp = 4; ally.dying = false; ally.hp = 4;
owner.expansion = [{ color: "red" }]; owner.temporary.clear();
enemy.disabled = true; assert.equal(drink.filter({ name: "dying", player: enemy }, owner), false); enemy.disabled = false;
enemy.immune = true; assert.equal(drink.filter({ name: "dying", player: enemy }, owner), false); enemy.immune = false;
enemy.alive = false; assert.equal(drink.filter({ name: "dying", player: enemy }, owner), false); enemy.alive = true;
// AI evaluates the latest hands, friendly fire, rescue, reserve, and material value.
owner.expansion.push({ color: "red" }); ally.hand = [{ name: "sha" }];
owner.selection = { bool: false }; await drink.content({}, phase, owner);
assert.ok(owner.options.ai({ link: red }) > 0, "help ally's attacks");
enemy.hand = [{ name: "sha" }]; await drink.content({}, { name: "phaseUse", player: enemy }, owner);
assert.equal(owner.options.ai({ link: red }), 0, "avoid enemy damaging allies");
enemy.hp = 0; enemy.dying = true; await drink.content({}, { name: "dying", player: enemy }, owner);
assert.equal(owner.options.ai({ link: red }), 0, "do not rescue enemy just for a draw");
ally.hp = 0; ally.dying = true; await drink.content({}, { name: "dying", player: ally }, owner);
assert.ok(owner.options.ai({ link: red }) > 0);
owner.hand = [{ name: "tao", color: "red", value: 9 }, { name: "sha", color: "red" }, red]; owner.hp = 1;
assert.equal(main.check(owner.hand[0]), 0); assert.equal(main.check(owner.hand[1]), 0); assert.ok(main.check(red) > 0);
// Revalidate selection, source presence, full cost, and departure after payment.
owner.selection = { bool: true, links: [black] }; const count = owner.expansion.length;
await drink.content({}, phase, owner); assert.equal(owner.expansion.length, count);
delete owner.selection; owner.onDiscard = async () => { ally.alive = false; };
records.length = 0; await drink.content({}, phase, owner); assert.equal(records.includes("use"), false); assert.ok(records.includes("draw")); ally.alive = true;
// 逆焰: only sha use/respond; private viewing; obtain all red cards; leave the rest in original order.
const niyan = skills.fan_niyan;
assert.equal(niyan.filter({ card: { name: "sha" } }), true); assert.equal(niyan.filter({ card: { name: "shan" } }), false);
assert.deepEqual(niyan.trigger.player, ["useCardAfter", "respondAfter"]);
let top = [black, red, { color: "black" }]; get.cards = n => { assert.equal(n, 3); return top; };
owner.confirm = true; await niyan.content({}, {}, owner);
assert.deepEqual(owner.viewed, top); assert.deepEqual(pile, [black, top[2]]); assert.ok(owner.hand.includes(red));
pile.length = 0; top = Array.from({ length: 3 }, () => ({ color: "black" })); await niyan.content({}, {}, owner); assert.deepEqual(pile, top);
pile.length = 0; top = Array.from({ length: 3 }, () => ({ color: "red" })); await niyan.content({}, {}, owner); assert.equal(pile.length, 0);
owner.confirm = false; get.cards = () => { throw Error("cancelled skill must not touch deck"); }; await niyan.content({}, {}, owner);
owner.confirm = true; top = [black, red]; get.cards = () => top; owner.viewCards = async () => { throw Error("view failed"); };
pile.length = 0; await assert.rejects(niyan.content({}, {}, owner)); assert.deepEqual(pile, top, "exception returns cards in original order");
main.onremove(owner, "fan_chenxi");
console.log("PASS: Diluc triggers expanded from owned skill; wine cap/cost/turn limit/nesting/rescue/AI; niyan ordering/cancellation/exception; native canUse and hasPlayer API contracts. Simulation, not a live game.");
